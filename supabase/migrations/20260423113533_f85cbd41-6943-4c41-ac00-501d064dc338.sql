CREATE POLICY "No direct finance session access"
ON public.agency_finance_sessions
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);