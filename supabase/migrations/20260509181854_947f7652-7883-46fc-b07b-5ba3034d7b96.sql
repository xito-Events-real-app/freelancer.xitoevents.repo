-- Patch finance RPCs to set the active-agency GUC so the BEFORE-INSERT/UPDATE/DELETE
-- trigger on agency-owned tables permits writes performed by non-owner staff
-- (e.g. Finance Manager) inside SECURITY DEFINER RPCs.
--
-- Without this, auth.uid() inside the RPC is the staff member, NEW.user_id is
-- the company owner, and the trigger raises "Active agency context not set".

CREATE OR REPLACE FUNCTION public.add_agency_finance_bank(_agency_user_id uuid, _bank_name text, _account_holder_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _bank public.agency_finance_banks%ROWTYPE;
  _clean_bank text := upper(trim(COALESCE(_bank_name, '')));
  _clean_holder text := upper(trim(COALESCE(_account_holder_name, '')));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.can_access_company(_agency_user_id, 'finance') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  PERFORM set_config('app.active_agency', _agency_user_id::text, true);

  IF char_length(_clean_bank) < 2 OR char_length(_clean_bank) > 100 THEN
    RAISE EXCEPTION 'Bank name must be 2 to 100 characters';
  END IF;
  IF char_length(_clean_holder) < 2 OR char_length(_clean_holder) > 100 THEN
    RAISE EXCEPTION 'Account holder name must be 2 to 100 characters';
  END IF;

  INSERT INTO public.agency_finance_banks (user_id, bank_name, account_holder_name)
  VALUES (_agency_user_id, _clean_bank, _clean_holder)
  RETURNING * INTO _bank;

  RETURN to_jsonb(_bank);
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_agency_client_payment(_agency_user_id uuid, _pin text, _payment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _verify jsonb;
  _payment public.agency_client_payments%ROWTYPE;
  _client public.agency_clients%ROWTYPE;
  _existing_ledger_total integer;
  _legacy_gap integer;
  _new_advance integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.can_access_company(_agency_user_id, 'finance') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  PERFORM set_config('app.active_agency', _agency_user_id::text, true);
  IF _payment_id IS NULL THEN RAISE EXCEPTION 'Payment id is required'; END IF;

  _verify := public.verify_agency_finance_pin(_pin, _agency_user_id);
  IF COALESCE((_verify->>'success')::boolean, false) IS NOT TRUE THEN RETURN _verify; END IF;

  SELECT * INTO _payment FROM public.agency_client_payments
  WHERE id = _payment_id AND user_id = _agency_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;

  SELECT * INTO _client FROM public.agency_clients
  WHERE id = _payment.client_id AND user_id = _agency_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Client not found'; END IF;

  SELECT COALESCE(SUM(amount), 0)::integer INTO _existing_ledger_total
  FROM public.agency_client_payments
  WHERE user_id = _agency_user_id AND client_id = _payment.client_id;

  _legacy_gap := GREATEST(_client.advance_amount - _existing_ledger_total, 0);

  DELETE FROM public.agency_client_payments WHERE id = _payment_id AND user_id = _agency_user_id;

  SELECT (_legacy_gap + COALESCE(SUM(amount), 0))::integer INTO _new_advance
  FROM public.agency_client_payments
  WHERE user_id = _agency_user_id AND client_id = _payment.client_id;

  UPDATE public.agency_clients
  SET advance_amount = _new_advance, updated_at = now()
  WHERE id = _payment.client_id AND user_id = _agency_user_id;

  RETURN jsonb_build_object('success', true, 'advanceAmount', _new_advance);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_agency_client_finance_add_payment(_agency_user_id uuid, _session_token text, _client_id uuid, _amount integer, _payment_type text DEFAULT 'partial'::text, _payment_date date DEFAULT CURRENT_DATE, _payment_date_bs text DEFAULT NULL::text, _payment_note text DEFAULT NULL::text, _bank_id uuid DEFAULT NULL::uuid, _is_opening_balance boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _client public.agency_clients%ROWTYPE;
  _bank_owner uuid;
  _clean_note text;
  _clean_type text;
  _new_advance integer;
  _existing_ledger_total integer;
  _legacy_gap integer;
  _payment public.agency_client_payments%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.can_access_company(_agency_user_id, 'finance') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  PERFORM set_config('app.active_agency', _agency_user_id::text, true);

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

  SELECT * INTO _client FROM public.agency_clients
  WHERE id = _client_id AND user_id = _agency_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Client not found'; END IF;

  SELECT COALESCE(SUM(amount), 0)::integer INTO _existing_ledger_total
  FROM public.agency_client_payments
  WHERE user_id = _agency_user_id AND client_id = _client_id;

  _legacy_gap := CASE
    WHEN COALESCE(_is_opening_balance, false) THEN 0
    ELSE GREATEST(_client.advance_amount - _existing_ledger_total, 0)
  END;

  IF _bank_id IS NOT NULL THEN
    SELECT user_id INTO _bank_owner FROM public.agency_finance_banks WHERE id = _bank_id;
    IF _bank_owner IS DISTINCT FROM _agency_user_id THEN
      RAISE EXCEPTION 'Bank not found';
    END IF;
  END IF;

  INSERT INTO public.agency_client_payments (user_id, client_id, amount, payment_date, payment_date_bs, note, payment_type, bank_id, is_opening_balance)
  VALUES (_agency_user_id, _client_id, _amount, COALESCE(_payment_date, CURRENT_DATE), _payment_date_bs, _clean_note, _clean_type, _bank_id, COALESCE(_is_opening_balance, false))
  RETURNING * INTO _payment;

  SELECT (_legacy_gap + COALESCE(SUM(amount), 0))::integer INTO _new_advance
  FROM public.agency_client_payments
  WHERE user_id = _agency_user_id AND client_id = _client_id;

  UPDATE public.agency_clients
  SET advance_amount = _new_advance, updated_at = now()
  WHERE id = _client_id AND user_id = _agency_user_id;

  RETURN jsonb_build_object('success', true, 'advanceAmount', _new_advance, 'payment', to_jsonb(_payment));
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_agency_client_finance_edit_payments(_agency_user_id uuid, _session_token text, _client_id uuid, _package_amount integer, _payments jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
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
  _existing_ledger_total integer;
  _legacy_gap integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.can_access_company(_agency_user_id, 'finance') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  PERFORM set_config('app.active_agency', _agency_user_id::text, true);

  IF public.verify_agency_finance_session(_session_token) IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'message', 'Finance session expired. Enter PIN again.');
  END IF;

  IF _package_amount IS NULL OR _package_amount < 0 THEN
    RAISE EXCEPTION 'Package amount must be zero or greater';
  END IF;

  SELECT * INTO _client FROM public.agency_clients
  WHERE id = _client_id AND user_id = _agency_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Client not found'; END IF;

  SELECT COALESCE(SUM(amount), 0)::integer INTO _existing_ledger_total
  FROM public.agency_client_payments
  WHERE user_id = _agency_user_id AND client_id = _client_id;

  _legacy_gap := GREATEST(_client.advance_amount - _existing_ledger_total, 0);

  IF jsonb_typeof(_payments) <> 'array' THEN RAISE EXCEPTION 'Payments must be an array'; END IF;

  FOR _payment_item IN SELECT * FROM jsonb_array_elements(_payments) LOOP
    _payment_id := (_payment_item->>'id')::uuid;
    _amount := (_payment_item->>'amount')::integer;
    _payment_type := COALESCE(NULLIF(trim(_payment_item->>'payment_type'), ''), 'partial');
    _payment_date := COALESCE((_payment_item->>'payment_date')::date, CURRENT_DATE);
    _note := NULLIF(trim(COALESCE(_payment_item->>'note', '')), '');
    _bank_id := NULLIF(_payment_item->>'bank_id', '')::uuid;

    IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Payment amount must be greater than zero'; END IF;
    IF _payment_type NOT IN ('advance', 'partial', 'final') THEN RAISE EXCEPTION 'Invalid payment type'; END IF;
    IF _note IS NOT NULL AND char_length(_note) > 500 THEN RAISE EXCEPTION 'Payment note is too long'; END IF;

    IF _bank_id IS NOT NULL THEN
      SELECT user_id INTO _bank_owner FROM public.agency_finance_banks WHERE id = _bank_id;
      IF _bank_owner IS DISTINCT FROM _agency_user_id THEN RAISE EXCEPTION 'Bank not found'; END IF;
    END IF;

    UPDATE public.agency_client_payments
    SET amount = _amount,
        payment_type = _payment_type,
        payment_date = _payment_date,
        payment_date_bs = NULLIF(_payment_item->>'payment_date_bs', ''),
        note = _note,
        bank_id = _bank_id,
        updated_at = now()
    WHERE id = _payment_id AND client_id = _client_id AND user_id = _agency_user_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  END LOOP;

  SELECT (_legacy_gap + COALESCE(SUM(amount), 0))::integer INTO _new_advance
  FROM public.agency_client_payments
  WHERE user_id = _agency_user_id AND client_id = _client_id;

  UPDATE public.agency_clients
  SET package_amount = _package_amount, advance_amount = _new_advance, updated_at = now()
  WHERE id = _client_id AND user_id = _agency_user_id;

  RETURN jsonb_build_object('success', true, 'advanceAmount', _new_advance, 'packageAmount', _package_amount);
END;
$function$;