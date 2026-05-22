CREATE OR REPLACE FUNCTION public.portal_backfill_venue_coords(p_client uuid, p_token text, p_venue_id uuid, p_lat double precision, p_lng double precision)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.portal_verify(p_client, p_token) THEN RAISE EXCEPTION 'invalid_token'; END IF;
  IF p_lat IS NULL OR p_lng IS NULL THEN RETURN false; END IF;
  IF p_lat < -90 OR p_lat > 90 OR p_lng < -180 OR p_lng > 180 THEN RETURN false; END IF;

  UPDATE public.xito_venues
     SET lat = p_lat, lng = p_lng, updated_at = now()
   WHERE id = p_venue_id
     AND deleted_at IS NULL
     AND lat IS NULL
     AND lng IS NULL;

  RETURN FOUND;
END $function$;