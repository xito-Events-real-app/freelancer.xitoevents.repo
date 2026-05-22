ALTER TABLE public.agency_client_payments
ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'partial';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'agency_client_payments_payment_type_check'
  ) THEN
    ALTER TABLE public.agency_client_payments
    ADD CONSTRAINT agency_client_payments_payment_type_check
    CHECK (payment_type IN ('advance', 'partial', 'final'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_agency_client_finance(
  _client_id uuid,
  _pin text,
  _package_amount integer,
  _payment_amount integer DEFAULT NULL,
  _payment_date date DEFAULT CURRENT_DATE,
  _payment_date_bs text DEFAULT NULL,
  _payment_note text DEFAULT NULL,
  _payment_type text DEFAULT 'partial'
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
  _clean_type text;
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

  _clean_type := COALESCE(NULLIF(trim(_payment_type), ''), 'partial');
  IF _clean_type NOT IN ('advance', 'partial', 'final') THEN
    RAISE EXCEPTION 'Invalid payment type';
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
    INSERT INTO public.agency_client_payments (user_id, client_id, amount, payment_date, payment_date_bs, note, payment_type)
    VALUES (_uid, _client_id, _payment_amount, COALESCE(_payment_date, CURRENT_DATE), _payment_date_bs, _clean_note, _clean_type);
  END IF;

  RETURN jsonb_build_object('success', true, 'advanceAmount', _new_advance, 'packageAmount', _package_amount);
END;
$$;