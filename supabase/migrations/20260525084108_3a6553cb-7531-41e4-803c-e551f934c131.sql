
ALTER TABLE public.client_portal_references ADD COLUMN IF NOT EXISTS image_url text;

DROP FUNCTION IF EXISTS public.portal_delete_reference(uuid, text, uuid);

CREATE OR REPLACE FUNCTION public.portal_delete_reference(p_client uuid, p_token text, p_ref_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_image text;
BEGIN
  IF NOT public.portal_verify(p_client, p_token) THEN RAISE EXCEPTION 'invalid_token'; END IF;
  DELETE FROM public.client_portal_references
    WHERE id = p_ref_id AND client_id = p_client
    RETURNING image_url INTO v_image;
  RETURN v_image;
END $function$;

CREATE OR REPLACE FUNCTION public.portal_create_reference_photo(p_client uuid, p_token text, p_event_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT public.portal_verify(p_client, p_token) THEN RAISE EXCEPTION 'invalid_token'; END IF;
  INSERT INTO public.client_portal_references (client_id, event_name, entry_type)
  VALUES (p_client, COALESCE(p_event_name,''), 'photo')
  RETURNING id INTO v_id;
  RETURN v_id;
END $function$;

CREATE OR REPLACE FUNCTION public.portal_set_reference_image(p_client uuid, p_token text, p_ref_id uuid, p_url text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.portal_verify(p_client, p_token) THEN RAISE EXCEPTION 'invalid_token'; END IF;
  UPDATE public.client_portal_references
    SET image_url = p_url
    WHERE id = p_ref_id AND client_id = p_client;
END $function$;
