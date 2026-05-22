CREATE OR REPLACE FUNCTION public.portal_read_bundle(p_client uuid, p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    ) ORDER BY p.payment_date DESC) FROM public.agency_client_payments p WHERE p.client_id = p_client), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;