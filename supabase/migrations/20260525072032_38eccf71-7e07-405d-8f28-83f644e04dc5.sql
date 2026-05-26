
-- 1) freelancer_profiles.agency_slug
ALTER TABLE public.freelancer_profiles
  ADD COLUMN IF NOT EXISTS agency_slug text;

CREATE UNIQUE INDEX IF NOT EXISTS freelancer_profiles_agency_slug_key
  ON public.freelancer_profiles (agency_slug)
  WHERE agency_slug IS NOT NULL;

CREATE OR REPLACE FUNCTION public._slugify(p_in text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT trim(both '-' from regexp_replace(
    lower(coalesce(p_in,'')),
    '[^a-z0-9]+', '-', 'g'
  ))
$$;

CREATE OR REPLACE FUNCTION public._ensure_agency_slug()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  base text;
  candidate text;
  i int := 0;
BEGIN
  IF NEW.agency_slug IS NOT NULL AND length(NEW.agency_slug) > 0 THEN
    RETURN NEW;
  END IF;
  base := public._slugify(NEW.business_name);
  IF base IS NULL OR length(base) = 0 THEN
    base := 'agency-' || substr(replace(NEW.user_id::text, '-', ''), 1, 8);
  END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.freelancer_profiles WHERE agency_slug = candidate AND user_id <> NEW.user_id) LOOP
    i := i + 1;
    candidate := base || '-' || i::text;
  END LOOP;
  NEW.agency_slug := candidate;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ensure_agency_slug ON public.freelancer_profiles;
CREATE TRIGGER trg_ensure_agency_slug
  BEFORE INSERT OR UPDATE OF business_name, agency_slug ON public.freelancer_profiles
  FOR EACH ROW EXECUTE FUNCTION public._ensure_agency_slug();

-- Backfill existing rows
UPDATE public.freelancer_profiles
SET business_name = business_name
WHERE agency_slug IS NULL;

-- 2) agency_clients.couple_photo_url
ALTER TABLE public.agency_clients
  ADD COLUMN IF NOT EXISTS couple_photo_url text;

-- 3) agency_client_family_members.pending + role check
ALTER TABLE public.agency_client_family_members
  ADD COLUMN IF NOT EXISTS pending boolean NOT NULL DEFAULT false;

ALTER TABLE public.agency_client_family_members
  DROP CONSTRAINT IF EXISTS agency_client_family_members_role_check;
ALTER TABLE public.agency_client_family_members
  ADD CONSTRAINT agency_client_family_members_role_check
  CHECK (role IN ('MOTHER','FATHER','BROTHER','SISTER','FRIEND','COUSIN','UNCLE','AUNT','GRANDMOTHER','GRANDFATHER','OTHER'));

ALTER TABLE public.agency_client_family_members
  DROP CONSTRAINT IF EXISTS agency_client_family_members_side_check;
ALTER TABLE public.agency_client_family_members
  ADD CONSTRAINT agency_client_family_members_side_check
  CHECK (side IN ('BRIDE','GROOM'));

-- 4) portal_verify_token
CREATE OR REPLACE FUNCTION public.portal_verify_token(p_client uuid, p_token text)
RETURNS TABLE(user_id uuid, agency_slug text, client_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.portal_verify(p_client, p_token) THEN
    RAISE EXCEPTION 'invalid_token';
  END IF;
  RETURN QUERY
  SELECT c.user_id, fp.agency_slug, c.id
  FROM public.agency_clients c
  LEFT JOIN public.freelancer_profiles fp ON fp.user_id = c.user_id
  WHERE c.id = p_client;
END $$;

-- 5) portal_set_couple_photo
CREATE OR REPLACE FUNCTION public.portal_set_couple_photo(p_client uuid, p_token text, p_url text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.portal_verify(p_client, p_token) THEN RAISE EXCEPTION 'invalid_token'; END IF;
  UPDATE public.agency_clients SET couple_photo_url = p_url, updated_at = now() WHERE id = p_client;
END $$;

-- 6) portal_add_family_member (with lazy orphan cleanup)
CREATE OR REPLACE FUNCTION public.portal_add_family_member(
  p_client uuid, p_token text,
  p_side text, p_role text, p_name text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid;
  v_id uuid;
  v_count int;
BEGIN
  IF NOT public.portal_verify(p_client, p_token) THEN RAISE EXCEPTION 'invalid_token'; END IF;

  -- Lazy cleanup: drop this client's stale pending rows older than 10 minutes
  DELETE FROM public.agency_client_family_members
    WHERE client_id = p_client AND pending = true AND created_at < now() - interval '10 minutes';

  SELECT count(*) INTO v_count FROM public.agency_client_family_members WHERE client_id = p_client;
  IF v_count >= 20 THEN RAISE EXCEPTION 'family_cap_reached'; END IF;

  SELECT user_id INTO v_owner FROM public.agency_clients WHERE id = p_client;

  INSERT INTO public.agency_client_family_members (client_id, user_id, side, role, name, pending)
  VALUES (p_client, v_owner, upper(p_side), upper(p_role), p_name, true)
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

-- 7) portal_set_family_member_photo
CREATE OR REPLACE FUNCTION public.portal_set_family_member_photo(
  p_client uuid, p_token text, p_member_id uuid, p_url text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.portal_verify(p_client, p_token) THEN RAISE EXCEPTION 'invalid_token'; END IF;
  UPDATE public.agency_client_family_members
    SET photo_url = p_url, pending = false, updated_at = now()
    WHERE id = p_member_id AND client_id = p_client;
  IF NOT FOUND THEN RAISE EXCEPTION 'member_not_found'; END IF;
END $$;

-- 8) portal_update_family_member  (side/role/name only)
CREATE OR REPLACE FUNCTION public.portal_update_family_member(
  p_client uuid, p_token text, p_member_id uuid,
  p_side text, p_role text, p_name text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.portal_verify(p_client, p_token) THEN RAISE EXCEPTION 'invalid_token'; END IF;
  UPDATE public.agency_client_family_members
    SET side = upper(p_side), role = upper(p_role), name = p_name, updated_at = now()
    WHERE id = p_member_id AND client_id = p_client;
  IF NOT FOUND THEN RAISE EXCEPTION 'member_not_found'; END IF;
END $$;

-- 9) portal_delete_family_member
CREATE OR REPLACE FUNCTION public.portal_delete_family_member(
  p_client uuid, p_token text, p_member_id uuid
)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_url text;
BEGIN
  IF NOT public.portal_verify(p_client, p_token) THEN RAISE EXCEPTION 'invalid_token'; END IF;
  SELECT photo_url INTO v_url FROM public.agency_client_family_members
    WHERE id = p_member_id AND client_id = p_client;
  DELETE FROM public.agency_client_family_members
    WHERE id = p_member_id AND client_id = p_client;
  RETURN v_url;
END $$;

-- 10) Extend portal_read_bundle to include couple_photo_url + family list (non-pending)
CREATE OR REPLACE FUNCTION public.portal_read_bundle(p_client uuid, p_token text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
DECLARE v_owner uuid;
BEGIN
  IF NOT public.portal_verify(p_client, p_token) THEN
    RAISE EXCEPTION 'invalid_token';
  END IF;

  SELECT user_id INTO v_owner FROM public.agency_clients WHERE id = p_client;

  SELECT jsonb_build_object(
    'client', (
      SELECT to_jsonb(c) - 'portal_token' - 'user_id'
      FROM public.agency_clients c WHERE c.id = p_client
    ),
    'company', (
      SELECT jsonb_build_object(
        'business_name', COALESCE(NULLIF(fp.business_name, ''), fp.full_name),
        'full_name', fp.full_name,
        'profile_photo_url', fp.profile_photo_url,
        'whatsapp_number', fp.whatsapp_number,
        'contact_number', fp.contact_number,
        'contact_person_2_name', fp.contact_person_2_name,
        'contact_person_2_number', fp.contact_person_2_number,
        'contact_person_2_whatsapp', fp.contact_person_2_whatsapp,
        'contact_person_3_name', fp.contact_person_3_name,
        'contact_person_3_number', fp.contact_person_3_number,
        'contact_person_3_whatsapp', fp.contact_person_3_whatsapp
      )
      FROM public.freelancer_profiles fp WHERE fp.user_id = v_owner
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
    ) ORDER BY p.payment_date DESC) FROM public.agency_client_payments p WHERE p.client_id = p_client), '[]'::jsonb),
    'couple_photo_url', (SELECT couple_photo_url FROM public.agency_clients WHERE id = p_client),
    'family_members', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', m.id, 'side', m.side, 'role', m.role, 'name', m.name,
        'photo_url', m.photo_url, 'created_at', m.created_at
      ) ORDER BY m.created_at ASC)
      FROM public.agency_client_family_members m
      WHERE m.client_id = p_client AND m.pending = false
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END $$;

-- Grants
GRANT EXECUTE ON FUNCTION public.portal_verify_token(uuid,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_set_couple_photo(uuid,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_add_family_member(uuid,text,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_set_family_member_photo(uuid,text,uuid,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_update_family_member(uuid,text,uuid,text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_delete_family_member(uuid,text,uuid) TO anon, authenticated;
