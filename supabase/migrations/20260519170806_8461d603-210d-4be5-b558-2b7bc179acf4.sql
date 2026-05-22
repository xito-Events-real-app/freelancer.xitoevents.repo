DROP FUNCTION IF EXISTS public.portal_search_venues(uuid, text, text, integer);

CREATE OR REPLACE FUNCTION public.portal_search_venues(p_client uuid, p_token text, p_q text, p_limit integer DEFAULT 8)
 RETURNS TABLE(id uuid, venue_name text, venue_type text, city text, area text, avatar_url text, cover_url text, lat double precision, lng double precision, google_map text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE q text;
BEGIN
  IF NOT public.portal_verify(p_client, p_token) THEN RAISE EXCEPTION 'invalid_token'; END IF;
  q := COALESCE(trim(p_q), '');
  IF length(q) < 1 THEN RETURN; END IF;

  RETURN QUERY
    SELECT v.id, v.venue_name, v.venue_type, v.city, v.area,
           v.avatar_url, v.cover_url, v.lat, v.lng, v.google_map
    FROM public.xito_venues v
    WHERE v.deleted_at IS NULL
      AND (
        v.venue_name ILIKE '%' || q || '%'
        OR v.area ILIKE '%' || q || '%'
        OR v.city ILIKE '%' || q || '%'
      )
    ORDER BY
      (lower(v.venue_name) = lower(q)) DESC,
      (v.venue_name ILIKE q || '%') DESC,
      (v.venue_name ILIKE '%' || q || '%') DESC,
      v.venue_name ASC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 8), 25));
END $function$;