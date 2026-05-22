CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS xito_venues_name_trgm_idx
  ON public.xito_venues USING gin (lower(venue_name) gin_trgm_ops)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS xito_venues_area_trgm_idx
  ON public.xito_venues USING gin (lower(area) gin_trgm_ops)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS xito_venues_city_trgm_idx
  ON public.xito_venues USING gin (lower(city) gin_trgm_ops)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.portal_search_venues(p_client uuid, p_token text, p_q text, p_limit integer DEFAULT 8)
 RETURNS TABLE(id uuid, venue_name text, venue_type text, city text, area text, avatar_url text, cover_url text, lat double precision, lng double precision, google_map text)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE q text;
BEGIN
  IF NOT public.portal_verify(p_client, p_token) THEN RAISE EXCEPTION 'invalid_token'; END IF;
  q := COALESCE(trim(p_q), '');

  IF length(q) = 0 THEN
    RETURN QUERY
      SELECT v.id, v.venue_name, v.venue_type, v.city, v.area,
             v.avatar_url, v.cover_url, v.lat, v.lng, v.google_map
      FROM public.xito_venues v
      WHERE v.deleted_at IS NULL
      ORDER BY v.created_at DESC
      LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 8), 50));
    RETURN;
  END IF;

  RETURN QUERY
    SELECT v.id, v.venue_name, v.venue_type, v.city, v.area,
           v.avatar_url, v.cover_url, v.lat, v.lng, v.google_map
    FROM public.xito_venues v
    WHERE v.deleted_at IS NULL
      AND (
        lower(v.venue_name) ILIKE lower('%' || q || '%')
        OR lower(v.area) ILIKE lower('%' || q || '%')
        OR lower(v.city) ILIKE lower('%' || q || '%')
      )
    ORDER BY
      (lower(v.venue_name) = lower(q)) DESC,
      (lower(v.venue_name) ILIKE lower(q) || '%') DESC,
      (lower(v.venue_name) ILIKE '%' || lower(q) || '%') DESC,
      v.venue_name ASC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 8), 50));
END $function$;