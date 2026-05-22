CREATE POLICY "Company access: select clients (files)"
  ON public.agency_clients FOR SELECT
  USING (public.can_access_company(user_id, 'files'));

CREATE POLICY "Company access: select client events (files)"
  ON public.agency_client_events FOR SELECT
  USING (public.can_access_company(user_id, 'files'));

CREATE POLICY "Company access: select crew assignments (files)"
  ON public.crew_assignments FOR SELECT
  USING (public.can_access_company(user_id, 'files'));

CREATE POLICY "Company access: select settings (clients)"
  ON public.agency_settings FOR SELECT
  USING (public.can_access_company(user_id, 'clients'));

CREATE POLICY "Company access: select settings (finance)"
  ON public.agency_settings FOR SELECT
  USING (public.can_access_company(user_id, 'finance'));