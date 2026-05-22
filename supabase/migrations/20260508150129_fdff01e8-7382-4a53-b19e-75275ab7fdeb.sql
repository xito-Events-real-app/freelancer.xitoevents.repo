
-- =====================================================================
-- Phase 2 RBAC: real cross-company data access
-- Foundation: can_access_company() + active-agency GUC + trigger guard
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. can_access_company helper (array + single-section overload)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_access_company(_agency uuid, _sections text[])
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _required_roles text[] := ARRAY[]::text[];
  _s text;
BEGIN
  IF _uid IS NULL OR _agency IS NULL OR _sections IS NULL OR array_length(_sections, 1) IS NULL THEN
    RETURN false;
  END IF;

  -- Owner shortcut
  IF _uid = _agency THEN
    RETURN true;
  END IF;

  -- Admin staff shortcut
  IF EXISTS (
    SELECT 1 FROM public.agency_staff_roles
    WHERE agency_user_id = _agency AND staff_user_id = _uid AND role = 'admin'
  ) THEN
    RETURN true;
  END IF;

  -- Section -> role mapping (mirrors useStaffPermissions.ts)
  FOREACH _s IN ARRAY _sections LOOP
    IF _s = 'clients' THEN
      _required_roles := _required_roles || ARRAY['event_management','add_client'];
    ELSIF _s = 'finance' THEN
      _required_roles := _required_roles || ARRAY['finance'];
    ELSIF _s = 'freelancers' THEN
      _required_roles := _required_roles || ARRAY['my_freelancers'];
    ELSIF _s = 'files' THEN
      _required_roles := _required_roles || ARRAY['file_management'];
    ELSIF _s = 'settings' THEN
      _required_roles := _required_roles || ARRAY['settings'];
    END IF;
  END LOOP;

  IF array_length(_required_roles, 1) IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.agency_staff_roles
    WHERE agency_user_id = _agency
      AND staff_user_id = _uid
      AND role = ANY(_required_roles)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_company(_agency uuid, _section text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_access_company(_agency, ARRAY[_section]);
$$;

-- ---------------------------------------------------------------------
-- 2. set_active_agency GUC RPC
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_active_agency(_agency uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _agency IS NULL THEN
    RAISE EXCEPTION 'Agency id required';
  END IF;
  IF NOT public.can_access_company(_agency, ARRAY['clients','finance','freelancers','files','settings']) THEN
    RAISE EXCEPTION 'Access denied for company';
  END IF;
  PERFORM set_config('app.active_agency', _agency::text, true);
END;
$$;

-- ---------------------------------------------------------------------
-- 3. enforce_active_agency BEFORE INSERT trigger
--    Trigger arg #1 = section name to validate against
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_active_agency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _section text := TG_ARGV[0];
  _guc text;
  _agency uuid;
BEGIN
  -- Owner short-circuit
  IF auth.uid() IS NOT NULL AND NEW.user_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  _guc := current_setting('app.active_agency', true);
  IF _guc IS NULL OR _guc = '' THEN
    RAISE EXCEPTION 'Active agency context not set';
  END IF;

  BEGIN
    _agency := _guc::uuid;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Active agency context invalid';
  END;

  NEW.user_id := _agency;

  IF NOT public.can_access_company(_agency, _section) THEN
    RAISE EXCEPTION 'Access denied for section %', _section;
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------
-- 4. Audit log
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agency_staff_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_user_id uuid NOT NULL,
  actor_user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  row_id uuid,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_audit_agency_created
  ON public.agency_staff_audit_log(agency_user_id, created_at DESC);

ALTER TABLE public.agency_staff_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can view audit log" ON public.agency_staff_audit_log;
CREATE POLICY "Owner can view audit log"
ON public.agency_staff_audit_log FOR SELECT
USING (auth.uid() = agency_user_id);

-- No INSERT/UPDATE/DELETE policies → only SECURITY DEFINER triggers can write.

CREATE OR REPLACE FUNCTION public.write_agency_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row record := COALESCE(NEW, OLD);
  _actor uuid := auth.uid();
  _agency uuid := _row.user_id;
BEGIN
  -- Skip when owner is the actor (no need to audit own actions)
  IF _actor IS NULL OR _actor = _agency THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO public.agency_staff_audit_log (agency_user_id, actor_user_id, action, table_name, row_id, payload)
  VALUES (
    _agency,
    _actor,
    TG_OP,
    TG_TABLE_NAME,
    _row.id,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ---------------------------------------------------------------------
-- 5. agency_staff_roles tightening
--    Existing policies: "Owner manages roles" (ALL using auth.uid()=agency_user_id)
--    + Staff/Admin SELECT. These are already correct — owner-only mutate,
--    admin staff SELECT-only. Reaffirm explicitly.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Owner manages roles" ON public.agency_staff_roles;
CREATE POLICY "Owner inserts roles"
ON public.agency_staff_roles FOR INSERT
WITH CHECK (auth.uid() = agency_user_id);
CREATE POLICY "Owner updates roles"
ON public.agency_staff_roles FOR UPDATE
USING (auth.uid() = agency_user_id) WITH CHECK (auth.uid() = agency_user_id);
CREATE POLICY "Owner deletes roles"
ON public.agency_staff_roles FOR DELETE
USING (auth.uid() = agency_user_id);
-- Owner SELECT: covered by existing "Admin staff sees company roles" + add owner select
DROP POLICY IF EXISTS "Owner views roles" ON public.agency_staff_roles;
CREATE POLICY "Owner views roles"
ON public.agency_staff_roles FOR SELECT
USING (auth.uid() = agency_user_id);

-- ---------------------------------------------------------------------
-- 6. Per-table RLS rewrite + INSERT trigger attach
--    Macro pattern: drop owner-only policies, create can_access_company
--    versions, attach BEFORE INSERT enforce_active_agency trigger.
--    Public/anon/token policies are LEFT UNTOUCHED.
-- ---------------------------------------------------------------------

-- agency_clients (section: clients)
DROP POLICY IF EXISTS "Users can view own clients" ON public.agency_clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON public.agency_clients;
DROP POLICY IF EXISTS "Users can update own clients" ON public.agency_clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON public.agency_clients;
CREATE POLICY "Company access: select clients" ON public.agency_clients FOR SELECT
  USING (public.can_access_company(user_id, 'clients'));
CREATE POLICY "Company access: insert clients" ON public.agency_clients FOR INSERT
  WITH CHECK (public.can_access_company(user_id, 'clients') AND NOT public.is_suspended(auth.uid()));
CREATE POLICY "Company access: update clients" ON public.agency_clients FOR UPDATE
  USING (public.can_access_company(user_id, 'clients'))
  WITH CHECK (public.can_access_company(user_id, 'clients') AND NOT public.is_suspended(auth.uid()));
CREATE POLICY "Company access: delete clients" ON public.agency_clients FOR DELETE
  USING (public.can_access_company(user_id, 'clients'));
DROP TRIGGER IF EXISTS enforce_active_agency_agency_clients ON public.agency_clients;
CREATE TRIGGER enforce_active_agency_agency_clients
  BEFORE INSERT ON public.agency_clients
  FOR EACH ROW EXECUTE FUNCTION public.enforce_active_agency('clients');

-- agency_client_payments (dual SELECT: finance OR clients; mutations: finance)
DROP POLICY IF EXISTS "Users can view own client payments" ON public.agency_client_payments;
DROP POLICY IF EXISTS "Users can insert own client payments" ON public.agency_client_payments;
DROP POLICY IF EXISTS "Users can update own client payments" ON public.agency_client_payments;
DROP POLICY IF EXISTS "Users can delete own client payments" ON public.agency_client_payments;
CREATE POLICY "Company access: select payments (finance)" ON public.agency_client_payments FOR SELECT
  USING (public.can_access_company(user_id, 'finance'));
CREATE POLICY "Company access: select payments (clients)" ON public.agency_client_payments FOR SELECT
  USING (public.can_access_company(user_id, 'clients'));
CREATE POLICY "Company access: insert payments" ON public.agency_client_payments FOR INSERT
  WITH CHECK (public.can_access_company(user_id, 'finance'));
CREATE POLICY "Company access: update payments" ON public.agency_client_payments FOR UPDATE
  USING (public.can_access_company(user_id, 'finance'))
  WITH CHECK (public.can_access_company(user_id, 'finance'));
CREATE POLICY "Company access: delete payments" ON public.agency_client_payments FOR DELETE
  USING (public.can_access_company(user_id, 'finance'));
DROP TRIGGER IF EXISTS enforce_active_agency_agency_client_payments ON public.agency_client_payments;
CREATE TRIGGER enforce_active_agency_agency_client_payments
  BEFORE INSERT ON public.agency_client_payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_active_agency('finance');

-- agency_client_events
DROP POLICY IF EXISTS "Users can view own client events" ON public.agency_client_events;
DROP POLICY IF EXISTS "Users can insert own client events" ON public.agency_client_events;
DROP POLICY IF EXISTS "Users can update own client events" ON public.agency_client_events;
DROP POLICY IF EXISTS "Users can delete own client events" ON public.agency_client_events;
CREATE POLICY "Company access: select client events" ON public.agency_client_events FOR SELECT
  USING (public.can_access_company(user_id, 'clients'));
CREATE POLICY "Company access: insert client events" ON public.agency_client_events FOR INSERT
  WITH CHECK (public.can_access_company(user_id, 'clients') AND NOT public.is_suspended(auth.uid()));
CREATE POLICY "Company access: update client events" ON public.agency_client_events FOR UPDATE
  USING (public.can_access_company(user_id, 'clients'))
  WITH CHECK (public.can_access_company(user_id, 'clients') AND NOT public.is_suspended(auth.uid()));
CREATE POLICY "Company access: delete client events" ON public.agency_client_events FOR DELETE
  USING (public.can_access_company(user_id, 'clients'));
DROP TRIGGER IF EXISTS enforce_active_agency_agency_client_events ON public.agency_client_events;
CREATE TRIGGER enforce_active_agency_agency_client_events
  BEFORE INSERT ON public.agency_client_events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_active_agency('clients');

-- agency_settings
DROP POLICY IF EXISTS "Users can view own settings" ON public.agency_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.agency_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.agency_settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON public.agency_settings;
CREATE POLICY "Company access: select settings" ON public.agency_settings FOR SELECT
  USING (public.can_access_company(user_id, 'settings'));
CREATE POLICY "Company access: insert settings" ON public.agency_settings FOR INSERT
  WITH CHECK (public.can_access_company(user_id, 'settings'));
CREATE POLICY "Company access: update settings" ON public.agency_settings FOR UPDATE
  USING (public.can_access_company(user_id, 'settings'))
  WITH CHECK (public.can_access_company(user_id, 'settings'));
CREATE POLICY "Company access: delete settings" ON public.agency_settings FOR DELETE
  USING (public.can_access_company(user_id, 'settings'));
DROP TRIGGER IF EXISTS enforce_active_agency_agency_settings ON public.agency_settings;
CREATE TRIGGER enforce_active_agency_agency_settings
  BEFORE INSERT ON public.agency_settings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_active_agency('settings');

-- agency_finance_banks
DROP POLICY IF EXISTS "Users can view own finance banks" ON public.agency_finance_banks;
DROP POLICY IF EXISTS "Users can insert own finance banks" ON public.agency_finance_banks;
DROP POLICY IF EXISTS "Users can update own finance banks" ON public.agency_finance_banks;
DROP POLICY IF EXISTS "Users can delete own finance banks" ON public.agency_finance_banks;
CREATE POLICY "Company access: select finance banks" ON public.agency_finance_banks FOR SELECT
  USING (public.can_access_company(user_id, 'finance'));
CREATE POLICY "Company access: insert finance banks" ON public.agency_finance_banks FOR INSERT
  WITH CHECK (public.can_access_company(user_id, 'finance'));
CREATE POLICY "Company access: update finance banks" ON public.agency_finance_banks FOR UPDATE
  USING (public.can_access_company(user_id, 'finance'))
  WITH CHECK (public.can_access_company(user_id, 'finance'));
CREATE POLICY "Company access: delete finance banks" ON public.agency_finance_banks FOR DELETE
  USING (public.can_access_company(user_id, 'finance'));
DROP TRIGGER IF EXISTS enforce_active_agency_agency_finance_banks ON public.agency_finance_banks;
CREATE TRIGGER enforce_active_agency_agency_finance_banks
  BEFORE INSERT ON public.agency_finance_banks
  FOR EACH ROW EXECUTE FUNCTION public.enforce_active_agency('finance');

-- bookings (KEEP existing public/anon SELECT policies, only rewrite owner mutations)
DROP POLICY IF EXISTS "Users can insert own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can delete own bookings" ON public.bookings;
CREATE POLICY "Company access: insert bookings" ON public.bookings FOR INSERT
  WITH CHECK (public.can_access_company(user_id, 'clients'));
CREATE POLICY "Company access: update bookings" ON public.bookings FOR UPDATE
  USING (public.can_access_company(user_id, 'clients'))
  WITH CHECK (public.can_access_company(user_id, 'clients'));
CREATE POLICY "Company access: delete bookings" ON public.bookings FOR DELETE
  USING (public.can_access_company(user_id, 'clients'));
DROP TRIGGER IF EXISTS enforce_active_agency_bookings ON public.bookings;
CREATE TRIGGER enforce_active_agency_bookings
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_active_agency('clients');

-- booking_details (KEEP form-token policies, rewrite owner mutations & owner SELECT)
DROP POLICY IF EXISTS "Users can view own booking details" ON public.booking_details;
DROP POLICY IF EXISTS "Users can insert own booking details" ON public.booking_details;
DROP POLICY IF EXISTS "Users can update own booking details" ON public.booking_details;
DROP POLICY IF EXISTS "Users can delete own booking details" ON public.booking_details;
CREATE POLICY "Company access: select booking details" ON public.booking_details FOR SELECT
  USING (public.can_access_company(user_id, 'clients'));
CREATE POLICY "Company access: insert booking details" ON public.booking_details FOR INSERT
  WITH CHECK (public.can_access_company(user_id, 'clients'));
CREATE POLICY "Company access: update booking details" ON public.booking_details FOR UPDATE
  USING (public.can_access_company(user_id, 'clients'))
  WITH CHECK (public.can_access_company(user_id, 'clients'));
CREATE POLICY "Company access: delete booking details" ON public.booking_details FOR DELETE
  USING (public.can_access_company(user_id, 'clients'));
DROP TRIGGER IF EXISTS enforce_active_agency_booking_details ON public.booking_details;
CREATE TRIGGER enforce_active_agency_booking_details
  BEFORE INSERT ON public.booking_details
  FOR EACH ROW EXECUTE FUNCTION public.enforce_active_agency('clients');

-- crew_assignments
DROP POLICY IF EXISTS "Users can view own crew assignments" ON public.crew_assignments;
DROP POLICY IF EXISTS "Users can insert own crew assignments" ON public.crew_assignments;
DROP POLICY IF EXISTS "Users can update own crew assignments" ON public.crew_assignments;
DROP POLICY IF EXISTS "Users can delete own crew assignments" ON public.crew_assignments;
CREATE POLICY "Company access: select crew assignments" ON public.crew_assignments FOR SELECT
  USING (public.can_access_company(user_id, 'clients'));
CREATE POLICY "Company access: insert crew assignments" ON public.crew_assignments FOR INSERT
  WITH CHECK (public.can_access_company(user_id, 'clients'));
CREATE POLICY "Company access: update crew assignments" ON public.crew_assignments FOR UPDATE
  USING (public.can_access_company(user_id, 'clients'))
  WITH CHECK (public.can_access_company(user_id, 'clients'));
CREATE POLICY "Company access: delete crew assignments" ON public.crew_assignments FOR DELETE
  USING (public.can_access_company(user_id, 'clients'));
DROP TRIGGER IF EXISTS enforce_active_agency_crew_assignments ON public.crew_assignments;
CREATE TRIGGER enforce_active_agency_crew_assignments
  BEFORE INSERT ON public.crew_assignments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_active_agency('clients');

-- lagan_dates (clients section — used by event mgmt)
DROP POLICY IF EXISTS "Users can view own lagan dates" ON public.lagan_dates;
DROP POLICY IF EXISTS "Users can insert own lagan dates" ON public.lagan_dates;
DROP POLICY IF EXISTS "Users can delete own lagan dates" ON public.lagan_dates;
CREATE POLICY "Company access: select lagan dates" ON public.lagan_dates FOR SELECT
  USING (public.can_access_company(user_id, 'clients'));
CREATE POLICY "Company access: insert lagan dates" ON public.lagan_dates FOR INSERT
  WITH CHECK (public.can_access_company(user_id, 'clients'));
CREATE POLICY "Company access: delete lagan dates" ON public.lagan_dates FOR DELETE
  USING (public.can_access_company(user_id, 'clients'));
DROP TRIGGER IF EXISTS enforce_active_agency_lagan_dates ON public.lagan_dates;
CREATE TRIGGER enforce_active_agency_lagan_dates
  BEFORE INSERT ON public.lagan_dates
  FOR EACH ROW EXECUTE FUNCTION public.enforce_active_agency('clients');

-- files_management
DROP POLICY IF EXISTS "Users can view own files" ON public.files_management;
DROP POLICY IF EXISTS "Users can insert own files" ON public.files_management;
DROP POLICY IF EXISTS "Users can update own files" ON public.files_management;
DROP POLICY IF EXISTS "Users can delete own files" ON public.files_management;
CREATE POLICY "Company access: select files" ON public.files_management FOR SELECT
  USING (public.can_access_company(user_id, 'files'));
CREATE POLICY "Company access: insert files" ON public.files_management FOR INSERT
  WITH CHECK (public.can_access_company(user_id, 'files'));
CREATE POLICY "Company access: update files" ON public.files_management FOR UPDATE
  USING (public.can_access_company(user_id, 'files'))
  WITH CHECK (public.can_access_company(user_id, 'files'));
CREATE POLICY "Company access: delete files" ON public.files_management FOR DELETE
  USING (public.can_access_company(user_id, 'files'));
DROP TRIGGER IF EXISTS enforce_active_agency_files_management ON public.files_management;
CREATE TRIGGER enforce_active_agency_files_management
  BEFORE INSERT ON public.files_management
  FOR EACH ROW EXECUTE FUNCTION public.enforce_active_agency('files');

-- storage_devices
DROP POLICY IF EXISTS "Users can view own storage devices" ON public.storage_devices;
DROP POLICY IF EXISTS "Users can insert own storage devices" ON public.storage_devices;
DROP POLICY IF EXISTS "Users can update own storage devices" ON public.storage_devices;
DROP POLICY IF EXISTS "Users can delete own storage devices" ON public.storage_devices;
CREATE POLICY "Company access: select storage devices" ON public.storage_devices FOR SELECT
  USING (public.can_access_company(user_id, 'files'));
CREATE POLICY "Company access: insert storage devices" ON public.storage_devices FOR INSERT
  WITH CHECK (public.can_access_company(user_id, 'files'));
CREATE POLICY "Company access: update storage devices" ON public.storage_devices FOR UPDATE
  USING (public.can_access_company(user_id, 'files'))
  WITH CHECK (public.can_access_company(user_id, 'files'));
CREATE POLICY "Company access: delete storage devices" ON public.storage_devices FOR DELETE
  USING (public.can_access_company(user_id, 'files'));
DROP TRIGGER IF EXISTS enforce_active_agency_storage_devices ON public.storage_devices;
CREATE TRIGGER enforce_active_agency_storage_devices
  BEFORE INSERT ON public.storage_devices
  FOR EACH ROW EXECUTE FUNCTION public.enforce_active_agency('files');

-- ---------------------------------------------------------------------
-- 7. Audit triggers on high-value tables
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS audit_agency_clients ON public.agency_clients;
CREATE TRIGGER audit_agency_clients
  AFTER INSERT OR UPDATE OR DELETE ON public.agency_clients
  FOR EACH ROW EXECUTE FUNCTION public.write_agency_audit();

DROP TRIGGER IF EXISTS audit_agency_client_payments ON public.agency_client_payments;
CREATE TRIGGER audit_agency_client_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.agency_client_payments
  FOR EACH ROW EXECUTE FUNCTION public.write_agency_audit();

DROP TRIGGER IF EXISTS audit_agency_finance_banks ON public.agency_finance_banks;
CREATE TRIGGER audit_agency_finance_banks
  AFTER INSERT OR UPDATE OR DELETE ON public.agency_finance_banks
  FOR EACH ROW EXECUTE FUNCTION public.write_agency_audit();

DROP TRIGGER IF EXISTS audit_crew_assignments ON public.crew_assignments;
CREATE TRIGGER audit_crew_assignments
  AFTER INSERT OR UPDATE OR DELETE ON public.crew_assignments
  FOR EACH ROW EXECUTE FUNCTION public.write_agency_audit();

DROP TRIGGER IF EXISTS audit_bookings ON public.bookings;
CREATE TRIGGER audit_bookings
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.write_agency_audit();

DROP TRIGGER IF EXISTS audit_booking_details ON public.booking_details;
CREATE TRIGGER audit_booking_details
  AFTER INSERT OR UPDATE OR DELETE ON public.booking_details
  FOR EACH ROW EXECUTE FUNCTION public.write_agency_audit();
-- Phase 3 note: future bulk-import flows should bypass this per-row trigger
-- and write a single summary audit row instead.

-- ---------------------------------------------------------------------
-- 8. Finance RPCs: add required _agency_user_id; authorize via can_access_company
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.add_agency_finance_bank(
  _agency_user_id uuid,
  _bank_name text,
  _account_holder_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bank public.agency_finance_banks%ROWTYPE;
  _clean_bank text := upper(trim(COALESCE(_bank_name, '')));
  _clean_holder text := upper(trim(COALESCE(_account_holder_name, '')));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.can_access_company(_agency_user_id, 'finance') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
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
$$;

CREATE OR REPLACE FUNCTION public.update_agency_client_finance_add_payment(
  _agency_user_id uuid,
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
$$;

CREATE OR REPLACE FUNCTION public.update_agency_client_finance_edit_payments(
  _agency_user_id uuid,
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
$$;

CREATE OR REPLACE FUNCTION public.delete_agency_client_payment(
  _agency_user_id uuid,
  _pin text,
  _payment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  IF _payment_id IS NULL THEN RAISE EXCEPTION 'Payment id is required'; END IF;

  -- PIN verification (PIN is owned by company owner; staff use the same PIN)
  _verify := public.verify_agency_finance_pin(_pin);
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
$$;

-- ---------------------------------------------------------------------
-- 9. revoke_finance_access (owner-only, with self-revoke guard)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_finance_access(_staff uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _staff IS NULL THEN RAISE EXCEPTION 'Staff id required'; END IF;
  IF _staff = _uid THEN
    RAISE EXCEPTION 'Cannot revoke your own finance access through this RPC';
  END IF;

  -- Delete the staff's active finance session for this owner's scope
  DELETE FROM public.agency_finance_sessions WHERE user_id = _staff;

  -- Remove the finance role for this owner+staff pair
  DELETE FROM public.agency_staff_roles
  WHERE agency_user_id = _uid AND staff_user_id = _staff AND role = 'finance';

  RETURN jsonb_build_object('success', true);
END;
$$;
