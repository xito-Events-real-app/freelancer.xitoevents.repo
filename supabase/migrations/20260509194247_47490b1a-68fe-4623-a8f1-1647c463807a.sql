CREATE OR REPLACE FUNCTION public.upsert_crew_assignment_scoped(
  _agency_user_id uuid,
  _event_id uuid,
  _role text,
  _assigned_freelancer text
)
RETURNS public.crew_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.crew_assignments;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _agency_user_id IS NULL OR _event_id IS NULL OR nullif(trim(_role), '') IS NULL THEN
    RAISE EXCEPTION 'Agency, event, and role are required';
  END IF;

  IF NOT public.can_access_company(_agency_user_id, 'clients') THEN
    RAISE EXCEPTION 'Access denied for event management';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.agency_client_events
    WHERE id = _event_id
      AND user_id = _agency_user_id
  ) THEN
    RAISE EXCEPTION 'Event does not belong to active company';
  END IF;

  PERFORM set_config('app.active_agency', _agency_user_id::text, true);

  IF nullif(trim(_assigned_freelancer), '') IS NULL THEN
    DELETE FROM public.crew_assignments
    WHERE user_id = _agency_user_id
      AND event_id = _event_id
      AND role = _role;
    RETURN NULL;
  END IF;

  INSERT INTO public.crew_assignments (user_id, event_id, role, assigned_freelancer)
  VALUES (_agency_user_id, _event_id, _role, trim(_assigned_freelancer))
  ON CONFLICT (event_id, role)
  DO UPDATE SET
    user_id = EXCLUDED.user_id,
    assigned_freelancer = EXCLUDED.assigned_freelancer,
    updated_at = now()
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_crew_assignment_scoped(uuid, uuid, text, text) TO authenticated;