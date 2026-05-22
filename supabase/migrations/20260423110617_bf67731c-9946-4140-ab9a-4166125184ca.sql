CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.agency_finance_pins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  pin_hash text NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_finance_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own finance pin status" ON public.agency_finance_pins;
CREATE POLICY "Users can view own finance pin status"
ON public.agency_finance_pins
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.agency_client_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  client_id uuid NOT NULL,
  amount integer NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_date_bs text,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT agency_client_payments_amount_positive CHECK (amount > 0),
  CONSTRAINT agency_client_payments_note_length CHECK (note IS NULL OR char_length(note) <= 500)
);

ALTER TABLE public.agency_client_payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_agency_client_payments_user_client ON public.agency_client_payments(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_agency_client_payments_created_at ON public.agency_client_payments(created_at DESC);

DROP POLICY IF EXISTS "Users can view own client payments" ON public.agency_client_payments;
CREATE POLICY "Users can view own client payments"
ON public.agency_client_payments
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.agency_clients c
    WHERE c.id = agency_client_payments.client_id
      AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert own client payments" ON public.agency_client_payments;
CREATE POLICY "Users can insert own client payments"
ON public.agency_client_payments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.agency_clients c
    WHERE c.id = agency_client_payments.client_id
      AND c.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.has_agency_finance_pin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_finance_pins
    WHERE user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.set_agency_finance_pin(_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _pin IS NULL OR _pin !~ '^[0-9]{6}$' THEN
    RAISE EXCEPTION 'PIN must be exactly 6 digits';
  END IF;

  IF EXISTS (SELECT 1 FROM public.agency_finance_pins WHERE user_id = _uid) THEN
    RAISE EXCEPTION 'Finance PIN already exists';
  END IF;

  INSERT INTO public.agency_finance_pins (user_id, pin_hash)
  VALUES (_uid, crypt(_pin, gen_salt('bf', 12)));

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_agency_finance_pin(_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _record public.agency_finance_pins%ROWTYPE;
  _new_attempts integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _pin IS NULL OR _pin !~ '^[0-9]{6}$' THEN
    RAISE EXCEPTION 'PIN must be exactly 6 digits';
  END IF;

  SELECT * INTO _record
  FROM public.agency_finance_pins
  WHERE user_id = _uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'needsSetup', true, 'message', 'Finance PIN has not been set');
  END IF;

  IF _record.locked_until IS NOT NULL AND _record.locked_until > now() THEN
    RETURN jsonb_build_object('success', false, 'locked', true, 'lockedUntil', _record.locked_until, 'message', 'Finance editing is temporarily locked');
  END IF;

  IF _record.pin_hash = crypt(_pin, _record.pin_hash) THEN
    UPDATE public.agency_finance_pins
    SET failed_attempts = 0,
        locked_until = NULL,
        updated_at = now()
    WHERE user_id = _uid;

    RETURN jsonb_build_object('success', true);
  END IF;

  _new_attempts := _record.failed_attempts + 1;

  UPDATE public.agency_finance_pins
  SET failed_attempts = _new_attempts,
      locked_until = CASE WHEN _new_attempts >= 5 THEN now() + interval '15 minutes' ELSE NULL END,
      updated_at = now()
  WHERE user_id = _uid;

  RETURN jsonb_build_object(
    'success', false,
    'locked', _new_attempts >= 5,
    'attemptsRemaining', GREATEST(5 - _new_attempts, 0),
    'message', CASE WHEN _new_attempts >= 5 THEN 'Too many wrong attempts. Try again later.' ELSE 'Wrong PIN' END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_agency_client_finance(
  _client_id uuid,
  _pin text,
  _package_amount integer,
  _payment_amount integer DEFAULT NULL,
  _payment_date date DEFAULT CURRENT_DATE,
  _payment_date_bs text DEFAULT NULL,
  _payment_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _verify jsonb;
  _client public.agency_clients%ROWTYPE;
  _clean_note text;
  _new_advance integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _package_amount IS NULL OR _package_amount < 0 THEN
    RAISE EXCEPTION 'Package amount must be zero or greater';
  END IF;

  IF _payment_amount IS NOT NULL AND _payment_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  _clean_note := NULLIF(trim(COALESCE(_payment_note, '')), '');
  IF _clean_note IS NOT NULL AND char_length(_clean_note) > 500 THEN
    RAISE EXCEPTION 'Payment note is too long';
  END IF;

  _verify := public.verify_agency_finance_pin(_pin);
  IF COALESCE((_verify->>'success')::boolean, false) IS NOT TRUE THEN
    RETURN _verify;
  END IF;

  SELECT * INTO _client
  FROM public.agency_clients
  WHERE id = _client_id AND user_id = _uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  _new_advance := _client.advance_amount + COALESCE(_payment_amount, 0);

  UPDATE public.agency_clients
  SET package_amount = _package_amount,
      advance_amount = _new_advance,
      updated_at = now()
  WHERE id = _client_id AND user_id = _uid;

  IF _payment_amount IS NOT NULL THEN
    INSERT INTO public.agency_client_payments (user_id, client_id, amount, payment_date, payment_date_bs, note)
    VALUES (_uid, _client_id, _payment_amount, COALESCE(_payment_date, CURRENT_DATE), _payment_date_bs, _clean_note);
  END IF;

  RETURN jsonb_build_object('success', true, 'advanceAmount', _new_advance, 'packageAmount', _package_amount);
END;
$$;

DROP TRIGGER IF EXISTS update_agency_finance_pins_updated_at ON public.agency_finance_pins;
CREATE TRIGGER update_agency_finance_pins_updated_at
BEFORE UPDATE ON public.agency_finance_pins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();