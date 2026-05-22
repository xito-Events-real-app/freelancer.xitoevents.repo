-- Add Google Maps link columns for bride/groom home address and update upsert RPC

ALTER TABLE public.client_contact_details
  ADD COLUMN IF NOT EXISTS bride_home_maps_link text DEFAULT '',
  ADD COLUMN IF NOT EXISTS groom_home_maps_link text DEFAULT '';

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
    bride_home_address, bride_home_lat, bride_home_lng, bride_home_place_id, bride_home_maps_link,
    groom_full_name, groom_contact_number, groom_whatsapp_number,
    groom_backup_number, groom_backup_relation, groom_backup_number2, groom_backup_relation2,
    groom_instagram, groom_home_city, groom_home_area, groom_home_landmark,
    groom_home_address, groom_home_lat, groom_home_lng, groom_home_place_id, groom_home_maps_link
  ) VALUES (
    p_client,
    COALESCE(p_data->>'bride_full_name',''), COALESCE(p_data->>'bride_contact_number',''), COALESCE(p_data->>'bride_whatsapp_number',''),
    COALESCE(p_data->>'bride_backup_number',''), COALESCE(p_data->>'bride_backup_relation',''), COALESCE(p_data->>'bride_backup_number2',''), COALESCE(p_data->>'bride_backup_relation2',''),
    COALESCE(p_data->>'bride_instagram',''), COALESCE(p_data->>'bride_home_city',''), COALESCE(p_data->>'bride_home_area',''), COALESCE(p_data->>'bride_home_landmark',''),
    COALESCE(p_data->>'bride_home_address',''), NULLIF(p_data->>'bride_home_lat','')::double precision, NULLIF(p_data->>'bride_home_lng','')::double precision, COALESCE(p_data->>'bride_home_place_id',''), COALESCE(p_data->>'bride_home_maps_link',''),
    COALESCE(p_data->>'groom_full_name',''), COALESCE(p_data->>'groom_contact_number',''), COALESCE(p_data->>'groom_whatsapp_number',''),
    COALESCE(p_data->>'groom_backup_number',''), COALESCE(p_data->>'groom_backup_relation',''), COALESCE(p_data->>'groom_backup_number2',''), COALESCE(p_data->>'groom_backup_relation2',''),
    COALESCE(p_data->>'groom_instagram',''), COALESCE(p_data->>'groom_home_city',''), COALESCE(p_data->>'groom_home_area',''), COALESCE(p_data->>'groom_home_landmark',''),
    COALESCE(p_data->>'groom_home_address',''), NULLIF(p_data->>'groom_home_lat','')::double precision, NULLIF(p_data->>'groom_home_lng','')::double precision, COALESCE(p_data->>'groom_home_place_id',''), COALESCE(p_data->>'groom_home_maps_link','')
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
    bride_home_maps_link = EXCLUDED.bride_home_maps_link,
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
    groom_home_maps_link = EXCLUDED.groom_home_maps_link,
    updated_at = now()
  RETURNING * INTO row_out;
  RETURN row_out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_upsert_contact(uuid, text, jsonb) TO anon, authenticated;