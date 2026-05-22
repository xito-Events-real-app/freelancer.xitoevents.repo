
-- 1) xito_venues columns
ALTER TABLE public.xito_venues
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS bookings_count integer NOT NULL DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'xito_venues_lat_range') THEN
    ALTER TABLE public.xito_venues ADD CONSTRAINT xito_venues_lat_range CHECK (lat IS NULL OR (lat BETWEEN -90 AND 90));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'xito_venues_lng_range') THEN
    ALTER TABLE public.xito_venues ADD CONSTRAINT xito_venues_lng_range CHECK (lng IS NULL OR (lng BETWEEN -180 AND 180));
  END IF;
END $$;

-- 2) client_event_locations: xito link + snapshots
ALTER TABLE public.client_event_locations
  ADD COLUMN IF NOT EXISTS xito_venue_id uuid REFERENCES public.xito_venues(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS venue_type text,
  ADD COLUMN IF NOT EXISTS venue_area text,
  ADD COLUMN IF NOT EXISTS venue_city text,
  ADD COLUMN IF NOT EXISTS venue_google_map text;

CREATE INDEX IF NOT EXISTS idx_client_event_locations_xito_venue
  ON public.client_event_locations(xito_venue_id) WHERE xito_venue_id IS NOT NULL;

-- 3) Backfill bookings_count
UPDATE public.xito_venues v SET bookings_count =
  COALESCE((SELECT count(*) FROM public.client_event_locations WHERE xito_venue_id = v.id), 0);

-- 4) Recompute trigger
CREATE OR REPLACE FUNCTION public.xito_venues_recompute_bookings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ids uuid[];
BEGIN
  ids := ARRAY[]::uuid[];
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.xito_venue_id IS NOT NULL THEN
    ids := ids || NEW.xito_venue_id;
  END IF;
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.xito_venue_id IS NOT NULL THEN
    ids := ids || OLD.xito_venue_id;
  END IF;
  IF array_length(ids, 1) IS NOT NULL THEN
    UPDATE public.xito_venues v SET bookings_count =
      COALESCE((SELECT count(*) FROM public.client_event_locations WHERE xito_venue_id = v.id), 0)
    WHERE v.id = ANY(ids);
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_xito_venues_recompute_ins ON public.client_event_locations;
DROP TRIGGER IF EXISTS trg_xito_venues_recompute_upd ON public.client_event_locations;
DROP TRIGGER IF EXISTS trg_xito_venues_recompute_del ON public.client_event_locations;

CREATE TRIGGER trg_xito_venues_recompute_ins
AFTER INSERT ON public.client_event_locations
FOR EACH ROW EXECUTE FUNCTION public.xito_venues_recompute_bookings();

CREATE TRIGGER trg_xito_venues_recompute_upd
AFTER UPDATE OF xito_venue_id ON public.client_event_locations
FOR EACH ROW EXECUTE FUNCTION public.xito_venues_recompute_bookings();

CREATE TRIGGER trg_xito_venues_recompute_del
AFTER DELETE ON public.client_event_locations
FOR EACH ROW EXECUTE FUNCTION public.xito_venues_recompute_bookings();

-- 5) portal_search_venues
CREATE OR REPLACE FUNCTION public.portal_search_venues(
  p_client uuid, p_token text, p_q text, p_limit integer DEFAULT 8
)
RETURNS TABLE (
  id uuid, venue_name text, venue_type text, city text, area text,
  avatar_url text, cover_url text, lat double precision, lng double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE q text;
BEGIN
  IF NOT public.portal_verify(p_client, p_token) THEN RAISE EXCEPTION 'invalid_token'; END IF;
  q := COALESCE(trim(p_q), '');
  IF length(q) < 1 THEN RETURN; END IF;

  RETURN QUERY
    SELECT v.id, v.venue_name, v.venue_type, v.city, v.area,
           v.avatar_url, v.cover_url, v.lat, v.lng
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
END $$;

GRANT EXECUTE ON FUNCTION public.portal_search_venues(uuid, text, text, integer) TO anon, authenticated;

-- 6) Update portal_upsert_event_location to persist xito link + snapshots
CREATE OR REPLACE FUNCTION public.portal_upsert_event_location(
  p_client uuid, p_token text, p_event_id uuid, p_data jsonb
)
RETURNS public.client_event_locations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE row_out public.client_event_locations;
BEGIN
  IF NOT public.portal_verify(p_client, p_token) THEN RAISE EXCEPTION 'invalid_token'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.agency_client_events WHERE id = p_event_id AND client_id = p_client) THEN
    RAISE EXCEPTION 'invalid_event';
  END IF;

  INSERT INTO public.client_event_locations AS t (
    client_id, event_id,
    venue_name, venue_address, venue_lat, venue_lng, venue_place_id,
    parlour_name, parlour_address, parlour_lat, parlour_lng, parlour_place_id,
    start_time, end_time, guest_count,
    xito_venue_id, venue_type, venue_area, venue_city, venue_google_map
  ) VALUES (
    p_client, p_event_id,
    COALESCE(p_data->>'venue_name',''), COALESCE(p_data->>'venue_address',''),
    NULLIF(p_data->>'venue_lat','')::double precision, NULLIF(p_data->>'venue_lng','')::double precision, COALESCE(p_data->>'venue_place_id',''),
    COALESCE(p_data->>'parlour_name',''), COALESCE(p_data->>'parlour_address',''),
    NULLIF(p_data->>'parlour_lat','')::double precision, NULLIF(p_data->>'parlour_lng','')::double precision, COALESCE(p_data->>'parlour_place_id',''),
    COALESCE(p_data->>'start_time',''), COALESCE(p_data->>'end_time',''),
    NULLIF(p_data->>'guest_count','')::integer,
    NULLIF(p_data->>'xito_venue_id','')::uuid,
    NULLIF(p_data->>'venue_type',''), NULLIF(p_data->>'venue_area',''),
    NULLIF(p_data->>'venue_city',''), NULLIF(p_data->>'venue_google_map','')
  )
  ON CONFLICT (event_id) DO UPDATE SET
    venue_name = EXCLUDED.venue_name, venue_address = EXCLUDED.venue_address,
    venue_lat = EXCLUDED.venue_lat, venue_lng = EXCLUDED.venue_lng, venue_place_id = EXCLUDED.venue_place_id,
    parlour_name = EXCLUDED.parlour_name, parlour_address = EXCLUDED.parlour_address,
    parlour_lat = EXCLUDED.parlour_lat, parlour_lng = EXCLUDED.parlour_lng, parlour_place_id = EXCLUDED.parlour_place_id,
    start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, guest_count = EXCLUDED.guest_count,
    xito_venue_id = EXCLUDED.xito_venue_id,
    venue_type = EXCLUDED.venue_type, venue_area = EXCLUDED.venue_area,
    venue_city = EXCLUDED.venue_city, venue_google_map = EXCLUDED.venue_google_map,
    updated_at = now()
  RETURNING * INTO row_out;
  RETURN row_out;
END $$;

GRANT EXECUTE ON FUNCTION public.portal_upsert_event_location(uuid, text, uuid, jsonb) TO anon, authenticated;

-- 7) Admin RPC for venue bookings
CREATE OR REPLACE FUNCTION public.admin_list_venue_bookings(p_venue_id uuid)
RETURNS TABLE (
  event_id uuid,
  client_id uuid,
  company_name text,
  bride_name text,
  groom_name text,
  event_name text,
  event_date_ad date,
  start_time text,
  end_time text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT
      ev.id AS event_id,
      ac.id AS client_id,
      COALESCE(NULLIF(fp.business_name,''), NULLIF(fp.full_name,''), 'Unknown') AS company_name,
      COALESCE(ccd.bride_full_name, '') AS bride_name,
      COALESCE(ccd.groom_full_name, '') AS groom_name,
      ev.event_name,
      ev.event_date_ad,
      COALESCE(loc.start_time, '') AS start_time,
      COALESCE(loc.end_time, '') AS end_time
    FROM public.client_event_locations loc
    JOIN public.agency_client_events ev ON ev.id = loc.event_id
    JOIN public.agency_clients ac ON ac.id = loc.client_id
    LEFT JOIN public.client_contact_details ccd ON ccd.client_id = ac.id
    LEFT JOIN public.freelancer_profiles fp ON fp.user_id = ac.user_id
    WHERE loc.xito_venue_id = p_venue_id
    ORDER BY ev.event_date_ad DESC NULLS LAST;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_list_venue_bookings(uuid) TO authenticated;
