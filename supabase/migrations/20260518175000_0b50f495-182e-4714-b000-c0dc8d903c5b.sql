
-- =====================================================================
-- 1. Add portal_token + portal_enabled to agency_clients
-- =====================================================================
ALTER TABLE public.agency_clients
  ADD COLUMN IF NOT EXISTS portal_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS portal_enabled boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.gen_portal_token()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public, extensions
AS $$
  SELECT encode(extensions.gen_random_bytes(24), 'base64')
$$;

CREATE OR REPLACE FUNCTION public.set_portal_token_default()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.portal_token IS NULL THEN
    NEW.portal_token := public.gen_portal_token();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agency_clients_portal_token ON public.agency_clients;
CREATE TRIGGER trg_agency_clients_portal_token
BEFORE INSERT ON public.agency_clients
FOR EACH ROW EXECUTE FUNCTION public.set_portal_token_default();

-- Backfill existing rows
UPDATE public.agency_clients
  SET portal_token = public.gen_portal_token()
  WHERE portal_token IS NULL;

-- =====================================================================
-- 2. YouTube id extractor (used by generated column)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.extract_youtube_id(url text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  m text[];
BEGIN
  IF url IS NULL OR url = '' THEN RETURN NULL; END IF;
  -- youtu.be/<id>
  m := regexp_matches(url, 'youtu\.be/([A-Za-z0-9_-]{11})', 'i');
  IF m IS NOT NULL THEN RETURN m[1]; END IF;
  -- youtube.com/watch?v=<id>
  m := regexp_matches(url, '[?&]v=([A-Za-z0-9_-]{11})', 'i');
  IF m IS NOT NULL THEN RETURN m[1]; END IF;
  -- youtube.com/embed/<id>
  m := regexp_matches(url, '/embed/([A-Za-z0-9_-]{11})', 'i');
  IF m IS NOT NULL THEN RETURN m[1]; END IF;
  -- youtube.com/shorts/<id>
  m := regexp_matches(url, '/shorts/([A-Za-z0-9_-]{11})', 'i');
  IF m IS NOT NULL THEN RETURN m[1]; END IF;
  RETURN NULL;
END;
$$;

-- =====================================================================
-- 3. New portal-owned tables
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.client_contact_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  bride_full_name text DEFAULT '',
  bride_contact_number text DEFAULT '',
  bride_whatsapp_number text DEFAULT '',
  bride_backup_number text DEFAULT '',
  bride_backup_relation text DEFAULT '',
  bride_backup_number2 text DEFAULT '',
  bride_backup_relation2 text DEFAULT '',
  bride_instagram text DEFAULT '',
  bride_home_city text DEFAULT '',
  bride_home_area text DEFAULT '',
  bride_home_landmark text DEFAULT '',
  bride_home_address text DEFAULT '',
  bride_home_lat double precision,
  bride_home_lng double precision,
  bride_home_place_id text DEFAULT '',
  groom_full_name text DEFAULT '',
  groom_contact_number text DEFAULT '',
  groom_whatsapp_number text DEFAULT '',
  groom_backup_number text DEFAULT '',
  groom_backup_relation text DEFAULT '',
  groom_backup_number2 text DEFAULT '',
  groom_backup_relation2 text DEFAULT '',
  groom_instagram text DEFAULT '',
  groom_home_city text DEFAULT '',
  groom_home_area text DEFAULT '',
  groom_home_landmark text DEFAULT '',
  groom_home_address text DEFAULT '',
  groom_home_lat double precision,
  groom_home_lng double precision,
  groom_home_place_id text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_event_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.agency_client_events(id) ON DELETE CASCADE,
  venue_name text DEFAULT '',
  venue_address text DEFAULT '',
  venue_lat double precision,
  venue_lng double precision,
  venue_place_id text DEFAULT '',
  parlour_name text DEFAULT '',
  parlour_address text DEFAULT '',
  parlour_lat double precision,
  parlour_lng double precision,
  parlour_place_id text DEFAULT '',
  start_time text DEFAULT '',
  end_time text DEFAULT '',
  guest_count integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id)
);
CREATE INDEX IF NOT EXISTS idx_cel_client ON public.client_event_locations(client_id);

CREATE TABLE IF NOT EXISTS public.client_portal_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  event_name text DEFAULT '',
  entry_type text NOT NULL DEFAULT 'link',
  platform text DEFAULT '',
  link_url text DEFAULT '',
  link_title text DEFAULT '',
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cpr_client ON public.client_portal_references(client_id);

CREATE TABLE IF NOT EXISTS public.client_album_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  album_type text NOT NULL,
  album_name text DEFAULT '',
  photo_key text NOT NULL,
  photo_url text DEFAULT '',
  selected_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, album_type, photo_key)
);
CREATE INDEX IF NOT EXISTS idx_cas_client ON public.client_album_selections(client_id);

CREATE TABLE IF NOT EXISTS public.client_favourite_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  photo_key text NOT NULL,
  photo_url text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, photo_key)
);
CREATE INDEX IF NOT EXISTS idx_cfp_client ON public.client_favourite_photos(client_id);

CREATE TABLE IF NOT EXISTS public.portal_hidden_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, video_id)
);

CREATE TABLE IF NOT EXISTS public.album_selection_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  bride_name text DEFAULT '',
  groom_name text DEFAULT '',
  album_details jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_date text DEFAULT '',
  custom_text text DEFAULT '',
  handled boolean NOT NULL DEFAULT false,
  handled_response text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ass_client ON public.album_selection_submissions(client_id);

CREATE TABLE IF NOT EXISTS public.client_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  event_name text DEFAULT '',
  section text NOT NULL,
  deliverable_type text NOT NULL,
  album_name text DEFAULT '',
  item_names text DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  enabled boolean NOT NULL DEFAULT false,
  photographer_notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cd_client_section ON public.client_deliverables(client_id, section);

CREATE TABLE IF NOT EXISTS public.edited_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  event_name text DEFAULT '',
  side_folder text DEFAULT '',
  photographer_name text DEFAULT '',
  file_name text DEFAULT '',
  file_type text NOT NULL DEFAULT 'photo',
  storage_type text NOT NULL DEFAULT 'supabase',
  file_path text DEFAULT '',
  storage_path text DEFAULT '',
  file_size_bytes bigint NOT NULL DEFAULT 0,
  mime_type text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ef_client_type ON public.edited_files(client_id, file_type);

CREATE TABLE IF NOT EXISTS public.edited_files_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  link_type text DEFAULT '',
  link_url text DEFAULT '',
  link_title text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_youtube_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  event_name text DEFAULT '',
  title text DEFAULT '',
  url text NOT NULL,
  video_id text GENERATED ALWAYS AS (public.extract_youtube_id(url)) STORED,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cyv_client ON public.client_youtube_videos(client_id);

-- =====================================================================
-- 4. updated_at triggers
-- =====================================================================
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'client_contact_details','client_event_locations','client_deliverables','edited_files'
  ])
  LOOP
    EXECUTE format($f$
      DROP TRIGGER IF EXISTS trg_%I_touch ON public.%I;
      CREATE TRIGGER trg_%I_touch
      BEFORE UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    $f$, t, t, t, t);
  END LOOP;
END $$;

-- =====================================================================
-- 5. Owner can_access helper using existing client → agency mapping
-- =====================================================================
CREATE OR REPLACE FUNCTION public.client_belongs_to_my_agency(_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_clients ac
    WHERE ac.id = _client_id
      AND public.can_access_company(ac.user_id, 'clients')
  )
$$;

-- =====================================================================
-- 6. RLS: enable, deny anon, allow authenticated agency staff
-- =====================================================================
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'client_contact_details','client_event_locations','client_portal_references',
    'client_album_selections','client_favourite_photos','portal_hidden_videos',
    'album_selection_submissions','client_deliverables','edited_files',
    'edited_files_links','client_youtube_videos'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "agency staff full access" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "agency staff full access" ON public.%I FOR ALL TO authenticated USING (public.client_belongs_to_my_agency(client_id)) WITH CHECK (public.client_belongs_to_my_agency(client_id))',
      t
    );
  END LOOP;
END $$;

-- Anon is NOT granted any policy on these tables.
-- All portal access goes through SECURITY DEFINER RPCs below.

-- =====================================================================
-- 7. Token-verification helper
-- =====================================================================
CREATE OR REPLACE FUNCTION public.portal_verify(_client uuid, _token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_clients
    WHERE id = _client
      AND portal_enabled = true
      AND portal_token = _token
  )
$$;

-- =====================================================================
-- 8. Portal RPCs (anon-callable, all SECURITY DEFINER, all verify token first)
-- =====================================================================

-- 8a. Read everything the portal needs in one round-trip
CREATE OR REPLACE FUNCTION public.portal_read_bundle(p_client uuid, p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.portal_verify(p_client, p_token) THEN
    RAISE EXCEPTION 'invalid_token';
  END IF;

  SELECT jsonb_build_object(
    'client', (
      SELECT to_jsonb(c) - 'portal_token' - 'user_id'
      FROM public.agency_clients c WHERE c.id = p_client
    ),
    'events', COALESCE((
      SELECT jsonb_agg(to_jsonb(e) ORDER BY e.event_date_ad NULLS LAST)
      FROM public.agency_client_events e WHERE e.client_id = p_client
    ), '[]'::jsonb),
    'crew', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'event_id', ca.event_id, 'role', ca.role, 'assigned_freelancer', ca.assigned_freelancer
      ))
      FROM public.crew_assignments ca
      WHERE ca.event_id IN (SELECT id FROM public.agency_client_events WHERE client_id = p_client)
    ), '[]'::jsonb),
    'contact', (SELECT to_jsonb(cd) FROM public.client_contact_details cd WHERE cd.client_id = p_client),
    'event_locations', COALESCE((SELECT jsonb_agg(to_jsonb(el)) FROM public.client_event_locations el WHERE el.client_id = p_client), '[]'::jsonb),
    'references', COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC) FROM public.client_portal_references r WHERE r.client_id = p_client), '[]'::jsonb),
    'favourites', COALESCE((SELECT jsonb_agg(to_jsonb(f)) FROM public.client_favourite_photos f WHERE f.client_id = p_client), '[]'::jsonb),
    'album_selections', COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM public.client_album_selections a WHERE a.client_id = p_client), '[]'::jsonb),
    'hidden_videos', COALESCE((SELECT jsonb_agg(to_jsonb(h)) FROM public.portal_hidden_videos h WHERE h.client_id = p_client), '[]'::jsonb),
    'deliverables', COALESCE((SELECT jsonb_agg(to_jsonb(d)) FROM public.client_deliverables d WHERE d.client_id = p_client AND d.enabled = true), '[]'::jsonb),
    'photos', COALESCE((SELECT jsonb_agg(to_jsonb(f)) FROM public.edited_files f WHERE f.client_id = p_client AND f.file_type = 'photo'), '[]'::jsonb),
    'videos_external', COALESCE((SELECT jsonb_agg(to_jsonb(f)) FROM public.edited_files_links f WHERE f.client_id = p_client AND f.link_type = 'youtube'), '[]'::jsonb),
    'youtube_videos', COALESCE((SELECT jsonb_agg(to_jsonb(v) ORDER BY v.position) FROM public.client_youtube_videos v WHERE v.client_id = p_client AND v.video_id IS NOT NULL), '[]'::jsonb),
    'payments', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', p.id, 'amount', p.amount, 'payment_date', p.payment_date,
      'payment_date_bs', p.payment_date_bs, 'payment_type', p.payment_type, 'note', p.note
    ) ORDER BY p.payment_date DESC) FROM public.agency_client_payments p WHERE p.client_id = p_client), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

-- 8b. Contact details upsert
CREATE OR REPLACE FUNCTION public.portal_upsert_contact(p_client uuid, p_token text, p_data jsonb)
RETURNS public.client_contact_details
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE row_out public.client_contact_details;
BEGIN
  IF NOT public.portal_verify(p_client, p_token) THEN RAISE EXCEPTION 'invalid_token'; END IF;

  INSERT INTO public.client_contact_details AS t (
    client_id,
    bride_full_name, bride_contact_number, bride_whatsapp_number,
    bride_backup_number, bride_backup_relation, bride_backup_number2, bride_backup_relation2,
    bride_instagram, bride_home_city, bride_home_area, bride_home_landmark,
    bride_home_address, bride_home_lat, bride_home_lng, bride_home_place_id,
    groom_full_name, groom_contact_number, groom_whatsapp_number,
    groom_backup_number, groom_backup_relation, groom_backup_number2, groom_backup_relation2,
    groom_instagram, groom_home_city, groom_home_area, groom_home_landmark,
    groom_home_address, groom_home_lat, groom_home_lng, groom_home_place_id
  ) VALUES (
    p_client,
    COALESCE(p_data->>'bride_full_name',''), COALESCE(p_data->>'bride_contact_number',''), COALESCE(p_data->>'bride_whatsapp_number',''),
    COALESCE(p_data->>'bride_backup_number',''), COALESCE(p_data->>'bride_backup_relation',''), COALESCE(p_data->>'bride_backup_number2',''), COALESCE(p_data->>'bride_backup_relation2',''),
    COALESCE(p_data->>'bride_instagram',''), COALESCE(p_data->>'bride_home_city',''), COALESCE(p_data->>'bride_home_area',''), COALESCE(p_data->>'bride_home_landmark',''),
    COALESCE(p_data->>'bride_home_address',''), NULLIF(p_data->>'bride_home_lat','')::double precision, NULLIF(p_data->>'bride_home_lng','')::double precision, COALESCE(p_data->>'bride_home_place_id',''),
    COALESCE(p_data->>'groom_full_name',''), COALESCE(p_data->>'groom_contact_number',''), COALESCE(p_data->>'groom_whatsapp_number',''),
    COALESCE(p_data->>'groom_backup_number',''), COALESCE(p_data->>'groom_backup_relation',''), COALESCE(p_data->>'groom_backup_number2',''), COALESCE(p_data->>'groom_backup_relation2',''),
    COALESCE(p_data->>'groom_instagram',''), COALESCE(p_data->>'groom_home_city',''), COALESCE(p_data->>'groom_home_area',''), COALESCE(p_data->>'groom_home_landmark',''),
    COALESCE(p_data->>'groom_home_address',''), NULLIF(p_data->>'groom_home_lat','')::double precision, NULLIF(p_data->>'groom_home_lng','')::double precision, COALESCE(p_data->>'groom_home_place_id','')
  )
  ON CONFLICT (client_id) DO UPDATE SET
    bride_full_name = EXCLUDED.bride_full_name,
    bride_contact_number = EXCLUDED.bride_contact_number,
    bride_whatsapp_number = EXCLUDED.bride_whatsapp_number,
    bride_backup_number = EXCLUDED.bride_backup_number,
    bride_backup_relation = EXCLUDED.bride_backup_relation,
    bride_backup_number2 = EXCLUDED.bride_backup_number2,
    bride_backup_relation2 = EXCLUDED.bride_backup_relation2,
    bride_instagram = EXCLUDED.bride_instagram,
    bride_home_city = EXCLUDED.bride_home_city,
    bride_home_area = EXCLUDED.bride_home_area,
    bride_home_landmark = EXCLUDED.bride_home_landmark,
    bride_home_address = EXCLUDED.bride_home_address,
    bride_home_lat = EXCLUDED.bride_home_lat,
    bride_home_lng = EXCLUDED.bride_home_lng,
    bride_home_place_id = EXCLUDED.bride_home_place_id,
    groom_full_name = EXCLUDED.groom_full_name,
    groom_contact_number = EXCLUDED.groom_contact_number,
    groom_whatsapp_number = EXCLUDED.groom_whatsapp_number,
    groom_backup_number = EXCLUDED.groom_backup_number,
    groom_backup_relation = EXCLUDED.groom_backup_relation,
    groom_backup_number2 = EXCLUDED.groom_backup_number2,
    groom_backup_relation2 = EXCLUDED.groom_backup_relation2,
    groom_instagram = EXCLUDED.groom_instagram,
    groom_home_city = EXCLUDED.groom_home_city,
    groom_home_area = EXCLUDED.groom_home_area,
    groom_home_landmark = EXCLUDED.groom_home_landmark,
    groom_home_address = EXCLUDED.groom_home_address,
    groom_home_lat = EXCLUDED.groom_home_lat,
    groom_home_lng = EXCLUDED.groom_home_lng,
    groom_home_place_id = EXCLUDED.groom_home_place_id,
    updated_at = now()
  RETURNING * INTO row_out;
  RETURN row_out;
END;
$$;

-- 8c. Event location upsert
CREATE OR REPLACE FUNCTION public.portal_upsert_event_location(p_client uuid, p_token text, p_event_id uuid, p_data jsonb)
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
    start_time, end_time, guest_count
  ) VALUES (
    p_client, p_event_id,
    COALESCE(p_data->>'venue_name',''), COALESCE(p_data->>'venue_address',''),
    NULLIF(p_data->>'venue_lat','')::double precision, NULLIF(p_data->>'venue_lng','')::double precision, COALESCE(p_data->>'venue_place_id',''),
    COALESCE(p_data->>'parlour_name',''), COALESCE(p_data->>'parlour_address',''),
    NULLIF(p_data->>'parlour_lat','')::double precision, NULLIF(p_data->>'parlour_lng','')::double precision, COALESCE(p_data->>'parlour_place_id',''),
    COALESCE(p_data->>'start_time',''), COALESCE(p_data->>'end_time',''),
    NULLIF(p_data->>'guest_count','')::integer
  )
  ON CONFLICT (event_id) DO UPDATE SET
    venue_name = EXCLUDED.venue_name, venue_address = EXCLUDED.venue_address,
    venue_lat = EXCLUDED.venue_lat, venue_lng = EXCLUDED.venue_lng, venue_place_id = EXCLUDED.venue_place_id,
    parlour_name = EXCLUDED.parlour_name, parlour_address = EXCLUDED.parlour_address,
    parlour_lat = EXCLUDED.parlour_lat, parlour_lng = EXCLUDED.parlour_lng, parlour_place_id = EXCLUDED.parlour_place_id,
    start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, guest_count = EXCLUDED.guest_count,
    updated_at = now()
  RETURNING * INTO row_out;
  RETURN row_out;
END;
$$;

-- 8d. References add / delete
CREATE OR REPLACE FUNCTION public.portal_add_reference(p_client uuid, p_token text, p_data jsonb)
RETURNS public.client_portal_references
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE row_out public.client_portal_references;
BEGIN
  IF NOT public.portal_verify(p_client, p_token) THEN RAISE EXCEPTION 'invalid_token'; END IF;
  INSERT INTO public.client_portal_references (client_id, event_name, entry_type, platform, link_url, link_title, description)
  VALUES (p_client,
    COALESCE(p_data->>'event_name',''),
    COALESCE(p_data->>'entry_type','link'),
    COALESCE(p_data->>'platform',''),
    COALESCE(p_data->>'link_url',''),
    COALESCE(p_data->>'link_title',''),
    COALESCE(p_data->>'description',''))
  RETURNING * INTO row_out;
  RETURN row_out;
END $$;

CREATE OR REPLACE FUNCTION public.portal_delete_reference(p_client uuid, p_token text, p_ref_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.portal_verify(p_client, p_token) THEN RAISE EXCEPTION 'invalid_token'; END IF;
  DELETE FROM public.client_portal_references WHERE id = p_ref_id AND client_id = p_client;
END $$;

-- 8e. Favourites toggle
CREATE OR REPLACE FUNCTION public.portal_toggle_favourite(p_client uuid, p_token text, p_photo_key text, p_photo_url text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE existed boolean;
BEGIN
  IF NOT public.portal_verify(p_client, p_token) THEN RAISE EXCEPTION 'invalid_token'; END IF;
  DELETE FROM public.client_favourite_photos
    WHERE client_id = p_client AND photo_key = p_photo_key
    RETURNING true INTO existed;
  IF existed IS NULL THEN
    INSERT INTO public.client_favourite_photos (client_id, photo_key, photo_url)
    VALUES (p_client, p_photo_key, COALESCE(p_photo_url,''));
    RETURN true;
  END IF;
  RETURN false;
END $$;

-- 8f. Album selection set/unset
CREATE OR REPLACE FUNCTION public.portal_set_album_selection(
  p_client uuid, p_token text, p_album_type text, p_album_name text,
  p_photo_key text, p_photo_url text, p_selected boolean
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.portal_verify(p_client, p_token) THEN RAISE EXCEPTION 'invalid_token'; END IF;
  IF p_selected THEN
    INSERT INTO public.client_album_selections (client_id, album_type, album_name, photo_key, photo_url)
    VALUES (p_client, p_album_type, COALESCE(p_album_name,''), p_photo_key, COALESCE(p_photo_url,''))
    ON CONFLICT (client_id, album_type, photo_key) DO NOTHING;
  ELSE
    DELETE FROM public.client_album_selections
      WHERE client_id = p_client AND album_type = p_album_type AND photo_key = p_photo_key;
  END IF;
END $$;

-- 8g. Album submit
CREATE OR REPLACE FUNCTION public.portal_submit_album(p_client uuid, p_token text, p_payload jsonb)
RETURNS public.album_selection_submissions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE row_out public.album_selection_submissions;
BEGIN
  IF NOT public.portal_verify(p_client, p_token) THEN RAISE EXCEPTION 'invalid_token'; END IF;
  INSERT INTO public.album_selection_submissions
    (client_id, bride_name, groom_name, album_details, selected_date, custom_text)
  VALUES (p_client,
    COALESCE(p_payload->>'bride_name',''),
    COALESCE(p_payload->>'groom_name',''),
    COALESCE(p_payload->'album_details', '[]'::jsonb),
    COALESCE(p_payload->>'selected_date',''),
    COALESCE(p_payload->>'custom_text',''))
  RETURNING * INTO row_out;
  RETURN row_out;
END $$;

-- 8h. Hide / unhide video
CREATE OR REPLACE FUNCTION public.portal_hide_video(p_client uuid, p_token text, p_video_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.portal_verify(p_client, p_token) THEN RAISE EXCEPTION 'invalid_token'; END IF;
  INSERT INTO public.portal_hidden_videos (client_id, video_id) VALUES (p_client, p_video_id)
  ON CONFLICT (client_id, video_id) DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.portal_unhide_video(p_client uuid, p_token text, p_video_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.portal_verify(p_client, p_token) THEN RAISE EXCEPTION 'invalid_token'; END IF;
  DELETE FROM public.portal_hidden_videos WHERE client_id = p_client AND video_id = p_video_id;
END $$;

-- =====================================================================
-- 9. Owner-side token management RPCs (authenticated only)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.portal_regenerate_token(p_client uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_tok text;
BEGIN
  IF NOT public.client_belongs_to_my_agency(p_client) THEN RAISE EXCEPTION 'forbidden'; END IF;
  new_tok := public.gen_portal_token();
  UPDATE public.agency_clients SET portal_token = new_tok, updated_at = now() WHERE id = p_client;
  RETURN new_tok;
END $$;

CREATE OR REPLACE FUNCTION public.portal_set_enabled(p_client uuid, p_enabled boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.client_belongs_to_my_agency(p_client) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.agency_clients SET portal_enabled = p_enabled, updated_at = now() WHERE id = p_client;
END $$;

-- =====================================================================
-- 10. Grants
-- =====================================================================
GRANT EXECUTE ON FUNCTION public.portal_read_bundle(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_upsert_contact(uuid, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_upsert_event_location(uuid, text, uuid, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_add_reference(uuid, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_delete_reference(uuid, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_toggle_favourite(uuid, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_set_album_selection(uuid, text, text, text, text, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_submit_album(uuid, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_hide_video(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_unhide_video(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_regenerate_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_set_enabled(uuid, boolean) TO authenticated;
