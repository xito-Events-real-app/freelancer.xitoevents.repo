
CREATE POLICY "Company access: select clients (finance)"
  ON public.agency_clients FOR SELECT
  USING (public.can_access_company(user_id, 'finance'));

CREATE POLICY "Company access: select client events (finance)"
  ON public.agency_client_events FOR SELECT
  USING (public.can_access_company(user_id, 'finance'));
