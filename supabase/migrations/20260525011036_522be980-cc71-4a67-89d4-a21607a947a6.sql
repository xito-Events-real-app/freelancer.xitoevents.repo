-- Replace bookings BEFORE INSERT trigger with a permissive version that
-- authorizes via can_access_company() directly, removing the GUC dependency
-- that caused "Active agency context not set" for non-owner staff inserts
-- performed in a single request.

CREATE OR REPLACE FUNCTION public.enforce_bookings_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Owner shortcut: user saving their own booking row
  IF auth.uid() IS NOT NULL AND NEW.user_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  -- Staff/agency access shortcut: caller has clients-section access on the target company
  IF public.can_access_company(NEW.user_id, 'clients') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not authorized to create booking for this company';
END;
$$;

DROP TRIGGER IF EXISTS enforce_active_agency_bookings ON public.bookings;
CREATE TRIGGER enforce_bookings_access
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bookings_access();
