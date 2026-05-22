CREATE TABLE IF NOT EXISTS public.agency_finance_banks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  bank_name text NOT NULL,
  account_holder_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT agency_finance_banks_bank_name_len CHECK (char_length(trim(bank_name)) BETWEEN 2 AND 100),
  CONSTRAINT agency_finance_banks_holder_len CHECK (char_length(trim(account_holder_name)) BETWEEN 2 AND 100)
);

ALTER TABLE public.agency_finance_banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own finance banks"
ON public.agency_finance_banks
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finance banks"
ON public.agency_finance_banks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finance banks"
ON public.agency_finance_banks
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own finance banks"
ON public.agency_finance_banks
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_agency_finance_banks_updated_at ON public.agency_finance_banks;
CREATE TRIGGER update_agency_finance_banks_updated_at
BEFORE UPDATE ON public.agency_finance_banks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.agency_finance_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_finance_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_agency_finance_sessions_user_expires
ON public.agency_finance_sessions (user_id, expires_at);

ALTER TABLE public.agency_client_payments
ADD COLUMN IF NOT EXISTS bank_id uuid NULL,
ADD COLUMN IF NOT EXISTS is_opening_balance boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agency_client_payments_bank_id_fkey'
  ) THEN
    ALTER TABLE public.agency_client_payments
    ADD CONSTRAINT agency_client_payments_bank_id_fkey
    FOREIGN KEY (bank_id) REFERENCES public.agency_finance_banks(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agency_client_payments_amount_positive_check'
  ) THEN
    ALTER TABLE public.agency_client_payments
    ADD CONSTRAINT agency_client_payments_amount_positive_check CHECK (amount > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agency_client_payments_note_len_check'
  ) THEN
    ALTER TABLE public.agency_client_payments
    ADD CONSTRAINT agency_client_payments_note_len_check CHECK (note IS NULL OR char_length(note) <= 500);
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_agency_client_payments_updated_at ON public.agency_client_payments;
CREATE TRIGGER update_agency_client_payments_updated_at
BEFORE UPDATE ON public.agency_client_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Users can update own client payments"
ON public.agency_client_payments
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.agency_clients c
    WHERE c.id = agency_client_payments.client_id AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.agency_clients c
    WHERE c.id = agency_client_payments.client_id AND c.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.verify_agency_finance_session(_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR _token IS NULL OR char_length(_token) < 20 THEN
    RETURN false;
  END IF;

  DELETE FROM public.agency_finance_sessions
  WHERE expires_at <= now();

  RETURN EXISTS (
    SELECT 1
    FROM public.agency_finance_sessions
    WHERE user_id = _uid
      AND expires_at > now()
      AND token_hash = extensions.crypt(_token, token_hash)
  );
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
  _token text;
  _expires_at timestamp with time zone := now() + interval '10 minutes';
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

  IF _record.pin_hash = extensions.crypt(_pin, _record.pin_hash) THEN
    _token := encode(extensions.gen_random_bytes(32), 'hex');

    DELETE FROM public.agency_finance_sessions
    WHERE user_id = _uid OR expires_at <= now();

    INSERT INTO public.agency_finance_sessions (user_id, token_hash, expires_at)
    VALUES (_uid, extensions.crypt(_token, extensions.gen_salt('bf'::text, 12)), _expires_at);

    UPDATE public.agency_finance_pins
    SET failed_attempts = 0,
        locked_until = NULL,
        updated_at = now()
    WHERE user_id = _uid;

    RETURN jsonb_build_object('success', true, 'sessionToken', _token, 'expiresAt', _expires_at);
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

CREATE OR REPLACE FUNCTION public.set_agency_finance_pin(_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _token text;
  _expires_at timestamp with time zone := now() + interval '10 minutes';
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
  VALUES (_uid, extensions.crypt(_pin, extensions.gen_salt('bf'::text, 12)));

  _token := encode(extensions.gen_random_bytes(32), 'hex');
  INSERT INTO public.agency_finance_sessions (user_id, token_hash, expires_at)
  VALUES (_uid, extensions.crypt(_token, extensions.gen_salt('bf'::text, 12)), _expires_at);

  RETURN jsonb_build_object('success', true, 'sessionToken', _token, 'expiresAt', _expires_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.add_agency_finance_bank(_bank_name text, _account_holder_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _bank public.agency_finance_banks%ROWTYPE;
  _clean_bank text := upper(trim(COALESCE(_bank_name, '')));
  _clean_holder text := upper(trim(COALESCE(_account_holder_name, '')));
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF char_length(_clean_bank) < 2 OR char_length(_clean_bank) > 100 THEN
    RAISE EXCEPTION 'Bank name must be 2 to 100 characters';
  END IF;

  IF char_length(_clean_holder) < 2 OR char_length(_clean_holder) > 100 THEN
    RAISE EXCEPTION 'Account holder name must be 2 to 100 characters';
  END IF;

  INSERT INTO public.agency_finance_banks (user_id, bank_name, account_holder_name)
  VALUES (_uid, _clean_bank, _clean_holder)
  RETURNING * INTO _bank;

  RETURN to_jsonb(_bank);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_agency_client_finance_add_payment(
  _session_token text,
  _client_id uuid,
  _amount integer,
  _payment_type text DEFAULT 'partial',
  _payment_date date DEFAULT CURRENT_DATE,
  _payment_date_bs text DEFAULT NULL,
  _payment_note text DEFAULT NULL,
  _bank_id uuid DEFAULT NULL,
  _is_opening_balance boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _client public.agency_clients%ROWTYPE;
  _bank_owner uuid;
  _clean_note text;
  _clean_type text;
  _new_advance integer;
  _payment public.agency_client_payments%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF public.verify_agency_finance_session(_session_token) IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'message', 'Finance session expired. Enter PIN again.');
  END IF;

  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  _clean_type := COALESCE(NULLIF(trim(_payment_type), ''), 'partial');
  IF _clean_type NOT IN ('advance', 'partial', 'final') THEN
    RAISE EXCEPTION 'Invalid payment type';
  END IF;

  _clean_note := NULLIF(trim(COALESCE(_payment_note, '')), '');
  IF _clean_note IS NOT NULL AND char_length(_clean_note) > 500 THEN
    RAISE EXCEPTION 'Payment note is too long';
  END IF;

  SELECT * INTO _client
  FROM public.agency_clients
  WHERE id = _client_id AND user_id = _uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  IF _bank_id IS NOT NULL THEN
    SELECT user_id INTO _bank_owner FROM public.agency_finance_banks WHERE id = _bank_id;
    IF _bank_owner IS DISTINCT FROM _uid THEN
      RAISE EXCEPTION 'Bank not found';
    END IF;
  END IF;

  INSERT INTO public.agency_client_payments (user_id, client_id, amount, payment_date, payment_date_bs, note, payment_type, bank_id, is_opening_balance)
  VALUES (_uid, _client_id, _amount, COALESCE(_payment_date, CURRENT_DATE), _payment_date_bs, _clean_note, _clean_type, _bank_id, COALESCE(_is_opening_balance, false))
  RETURNING * INTO _payment;

  SELECT COALESCE(SUM(amount), 0)::integer INTO _new_advance
  FROM public.agency_client_payments
  WHERE user_id = _uid AND client_id = _client_id;

  UPDATE public.agency_clients
  SET advance_amount = _new_advance,
      updated_at = now()
  WHERE id = _client_id AND user_id = _uid;

  RETURN jsonb_build_object('success', true, 'advanceAmount', _new_advance, 'payment', to_jsonb(_payment));
END;
$$;

CREATE OR REPLACE FUNCTION public.update_agency_client_finance_edit_payments(
  _session_token text,
  _client_id uuid,
  _package_amount integer,
  _payments jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _client public.agency_clients%ROWTYPE;
  _payment_item jsonb;
  _payment_id uuid;
  _bank_id uuid;
  _bank_owner uuid;
  _amount integer;
  _payment_date date;
  _payment_type text;
  _note text;
  _new_advance integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF public.verify_agency_finance_session(_session_token) IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'message', 'Finance session expired. Enter PIN again.');
  END IF;

  IF _package_amount IS NULL OR _package_amount < 0 THEN
    RAISE EXCEPTION 'Package amount must be zero or greater';
  END IF;

  SELECT * INTO _client
  FROM public.agency_clients
  WHERE id = _client_id AND user_id = _uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  IF jsonb_typeof(_payments) <> 'array' THEN
    RAISE EXCEPTION 'Payments must be an array';
  END IF;

  FOR _payment_item IN SELECT * FROM jsonb_array_elements(_payments)
  LOOP
    _payment_id := (_payment_item->>'id')::uuid;
    _amount := (_payment_item->>'amount')::integer;
    _payment_type := COALESCE(NULLIF(trim(_payment_item->>'payment_type'), ''), 'partial');
    _payment_date := COALESCE((_payment_item->>'payment_date')::date, CURRENT_DATE);
    _note := NULLIF(trim(COALESCE(_payment_item->>'note', '')), '');
    _bank_id := NULLIF(_payment_item->>'bank_id', '')::uuid;

    IF _amount IS NULL OR _amount <= 0 THEN
      RAISE EXCEPTION 'Payment amount must be greater than zero';
    END IF;

    IF _payment_type NOT IN ('advance', 'partial', 'final') THEN
      RAISE EXCEPTION 'Invalid payment type';
    END IF;

    IF _note IS NOT NULL AND char_length(_note) > 500 THEN
      RAISE EXCEPTION 'Payment note is too long';
    END IF;

    IF _bank_id IS NOT NULL THEN
      SELECT user_id INTO _bank_owner FROM public.agency_finance_banks WHERE id = _bank_id;
      IF _bank_owner IS DISTINCT FROM _uid THEN
        RAISE EXCEPTION 'Bank not found';
      END IF;
    END IF;

    UPDATE public.agency_client_payments
    SET amount = _amount,
        payment_type = _payment_type,
        payment_date = _payment_date,
        payment_date_bs = NULLIF(_payment_item->>'payment_date_bs', ''),
        note = _note,
        bank_id = _bank_id,
        updated_at = now()
    WHERE id = _payment_id AND client_id = _client_id AND user_id = _uid;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Payment not found';
    END IF;
  END LOOP;

  SELECT COALESCE(SUM(amount), 0)::integer INTO _new_advance
  FROM public.agency_client_payments
  WHERE user_id = _uid AND client_id = _client_id;

  UPDATE public.agency_clients
  SET package_amount = _package_amount,
      advance_amount = _new_advance,
      updated_at = now()
  WHERE id = _client_id AND user_id = _uid;

  RETURN jsonb_build_object('success', true, 'advanceAmount', _new_advance, 'packageAmount', _package_amount);
END;
$$;