-- Allow owners to delete their own client payments (defense in depth; the RPC also enforces this)
CREATE POLICY "Users can delete own client payments"
ON public.agency_client_payments
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.agency_clients c
    WHERE c.id = agency_client_payments.client_id AND c.user_id = auth.uid()
  )
);

-- Secure delete RPC: requires PIN re-confirmation every call
CREATE OR REPLACE FUNCTION public.delete_agency_client_payment(_pin text, _payment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _verify jsonb;
  _payment public.agency_client_payments%ROWTYPE;
  _client public.agency_clients%ROWTYPE;
  _existing_ledger_total integer;
  _legacy_gap integer;
  _new_advance integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _payment_id IS NULL THEN
    RAISE EXCEPTION 'Payment id is required';
  END IF;

  -- Always re-verify PIN; deletes are destructive
  _verify := public.verify_agency_finance_pin(_pin);
  IF COALESCE((_verify->>'success')::boolean, false) IS NOT TRUE THEN
    RETURN _verify;
  END IF;

  SELECT * INTO _payment
  FROM public.agency_client_payments
  WHERE id = _payment_id AND user_id = _uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  SELECT * INTO _client
  FROM public.agency_clients
  WHERE id = _payment.client_id AND user_id = _uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  -- Compute legacy opening-balance gap BEFORE deletion (preserves untracked old advance)
  SELECT COALESCE(SUM(amount), 0)::integer INTO _existing_ledger_total
  FROM public.agency_client_payments
  WHERE user_id = _uid AND client_id = _payment.client_id;

  _legacy_gap := GREATEST(_client.advance_amount - _existing_ledger_total, 0);

  DELETE FROM public.agency_client_payments
  WHERE id = _payment_id AND user_id = _uid;

  SELECT (_legacy_gap + COALESCE(SUM(amount), 0))::integer INTO _new_advance
  FROM public.agency_client_payments
  WHERE user_id = _uid AND client_id = _payment.client_id;

  UPDATE public.agency_clients
  SET advance_amount = _new_advance,
      updated_at = now()
  WHERE id = _payment.client_id AND user_id = _uid;

  RETURN jsonb_build_object('success', true, 'advanceAmount', _new_advance);
END;
$function$;