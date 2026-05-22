-- =========================================================================
-- Recovery function: links any orphan migrated profile to the currently
-- logged-in Supabase auth user when the email matches EXACTLY.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.link_orphan_profile_to_current_user()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _new uuid := auth.uid();
  _email text;
  _new_profile_id uuid;
  _orphan_user_ids uuid[];
  _old uuid;
  _orphan_profile public.freelancer_profiles%ROWTYPE;
BEGIN
  IF _new IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT lower(email) INTO _email FROM auth.users WHERE id = _new;
  IF _email IS NULL OR _email = '' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_email');
  END IF;

  SELECT id INTO _new_profile_id
  FROM public.freelancer_profiles
  WHERE user_id = _new
  LIMIT 1;

  -- Find orphan profiles (user_id not in auth.users) with EXACT same email.
  -- Never match by name, business name, or phone.
  SELECT array_agg(DISTINCT p.user_id)
  INTO _orphan_user_ids
  FROM public.freelancer_profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE u.id IS NULL
    AND p.user_id <> _new
    AND lower(coalesce(p.email,'')) = _email;

  IF _orphan_user_ids IS NULL OR array_length(_orphan_user_ids, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'reason', CASE WHEN _new_profile_id IS NULL THEN 'no_orphan_match' ELSE 'already_linked_no_orphan_match' END
    );
  END IF;

  IF array_length(_orphan_user_ids, 1) > 1 THEN
    -- Safety: refuse to merge when multiple orphan profiles share the same
    -- email. An admin must resolve manually.
    RETURN jsonb_build_object('success', false, 'reason', 'ambiguous');
  END IF;

  _old := _orphan_user_ids[1];

  IF _new_profile_id IS NULL THEN
    -- No real profile yet → just reassign the orphan profile to this user.
    UPDATE public.freelancer_profiles SET user_id = _new WHERE user_id = _old;
  ELSE
    -- A real (likely empty) profile already exists. Backfill any blank
    -- fields on the real profile from the orphan, then delete the orphan.
    SELECT * INTO _orphan_profile
    FROM public.freelancer_profiles
    WHERE user_id = _old
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.freelancer_profiles SET
        full_name                 = CASE WHEN coalesce(full_name,'')='' THEN coalesce(_orphan_profile.full_name, full_name) ELSE full_name END,
        contact_number            = CASE WHEN coalesce(contact_number,'')='' THEN coalesce(_orphan_profile.contact_number, contact_number) ELSE contact_number END,
        whatsapp_number           = CASE WHEN coalesce(whatsapp_number,'')='' THEN coalesce(_orphan_profile.whatsapp_number, whatsapp_number) ELSE whatsapp_number END,
        email                     = CASE WHEN coalesce(email,'')='' THEN coalesce(_orphan_profile.email, email) ELSE email END,
        profile_photo_url         = CASE WHEN coalesce(profile_photo_url,'')='' THEN _orphan_profile.profile_photo_url ELSE profile_photo_url END,
        instagram                 = CASE WHEN coalesce(instagram,'')='' THEN _orphan_profile.instagram ELSE instagram END,
        facebook                  = CASE WHEN coalesce(facebook,'')='' THEN _orphan_profile.facebook ELSE facebook END,
        youtube                   = CASE WHEN coalesce(youtube,'')='' THEN _orphan_profile.youtube ELSE youtube END,
        tiktok                    = CASE WHEN coalesce(tiktok,'')='' THEN _orphan_profile.tiktok ELSE tiktok END,
        city                      = CASE WHEN coalesce(city,'')='' THEN _orphan_profile.city ELSE city END,
        area                      = CASE WHEN coalesce(area,'')='' THEN _orphan_profile.area ELSE area END,
        google_map_link           = CASE WHEN coalesce(google_map_link,'')='' THEN _orphan_profile.google_map_link ELSE google_map_link END,
        pathao_landmark           = CASE WHEN coalesce(pathao_landmark,'')='' THEN _orphan_profile.pathao_landmark ELSE pathao_landmark END,
        main_job                  = CASE WHEN coalesce(main_job,'')='' THEN _orphan_profile.main_job ELSE main_job END,
        photographer              = CASE WHEN coalesce(photographer,'NO')='NO' THEN coalesce(_orphan_profile.photographer, photographer) ELSE photographer END,
        videographer              = CASE WHEN coalesce(videographer,'NO')='NO' THEN coalesce(_orphan_profile.videographer, videographer) ELSE videographer END,
        photo_editor              = CASE WHEN coalesce(photo_editor,'NO')='NO' THEN coalesce(_orphan_profile.photo_editor, photo_editor) ELSE photo_editor END,
        video_editor              = CASE WHEN coalesce(video_editor,'NO')='NO' THEN coalesce(_orphan_profile.video_editor, video_editor) ELSE video_editor END,
        hybrid_shooter            = CASE WHEN coalesce(hybrid_shooter,'NO')='NO' THEN coalesce(_orphan_profile.hybrid_shooter, hybrid_shooter) ELSE hybrid_shooter END,
        hybrid_editor             = CASE WHEN coalesce(hybrid_editor,'NO')='NO' THEN coalesce(_orphan_profile.hybrid_editor, hybrid_editor) ELSE hybrid_editor END,
        drone_operator            = CASE WHEN coalesce(drone_operator,'NO')='NO' THEN coalesce(_orphan_profile.drone_operator, drone_operator) ELSE drone_operator END,
        fpv_operator              = CASE WHEN coalesce(fpv_operator,'NO')='NO' THEN coalesce(_orphan_profile.fpv_operator, fpv_operator) ELSE fpv_operator END,
        iphone_shooter            = CASE WHEN coalesce(iphone_shooter,'NO')='NO' THEN coalesce(_orphan_profile.iphone_shooter, iphone_shooter) ELSE iphone_shooter END,
        camera_body               = CASE WHEN coalesce(camera_body,'')='' THEN _orphan_profile.camera_body ELSE camera_body END,
        lenses                    = CASE WHEN coalesce(lenses,'')='' THEN _orphan_profile.lenses ELSE lenses END,
        drone_model               = CASE WHEN coalesce(drone_model,'')='' THEN _orphan_profile.drone_model ELSE drone_model END,
        editing_setup             = CASE WHEN coalesce(editing_setup,'')='' THEN _orphan_profile.editing_setup ELSE editing_setup END,
        preferred_event_types     = CASE WHEN coalesce(preferred_event_types,'')='' THEN _orphan_profile.preferred_event_types ELSE preferred_event_types END,
        rate_per_day              = CASE WHEN coalesce(rate_per_day,'')='' THEN _orphan_profile.rate_per_day ELSE rate_per_day END,
        bank_name                 = CASE WHEN coalesce(bank_name,'')='' THEN _orphan_profile.bank_name ELSE bank_name END,
        bank_account_number       = CASE WHEN coalesce(bank_account_number,'')='' THEN _orphan_profile.bank_account_number ELSE bank_account_number END,
        bank_account_holder       = CASE WHEN coalesce(bank_account_holder,'')='' THEN _orphan_profile.bank_account_holder ELSE bank_account_holder END,
        bio                       = CASE WHEN coalesce(bio,'')='' THEN _orphan_profile.bio ELSE bio END,
        portfolio_links           = CASE WHEN portfolio_links IS NULL OR array_length(portfolio_links, 1) IS NULL THEN _orphan_profile.portfolio_links ELSE portfolio_links END,
        account_type              = CASE WHEN coalesce(account_type,'solo_creative')='solo_creative' THEN coalesce(_orphan_profile.account_type, account_type) ELSE account_type END,
        business_name             = CASE WHEN coalesce(business_name,'')='' THEN _orphan_profile.business_name ELSE business_name END,
        contact_person_2_name     = CASE WHEN coalesce(contact_person_2_name,'')='' THEN _orphan_profile.contact_person_2_name ELSE contact_person_2_name END,
        contact_person_2_number   = CASE WHEN coalesce(contact_person_2_number,'')='' THEN _orphan_profile.contact_person_2_number ELSE contact_person_2_number END,
        contact_person_2_whatsapp = CASE WHEN coalesce(contact_person_2_whatsapp,'')='' THEN _orphan_profile.contact_person_2_whatsapp ELSE contact_person_2_whatsapp END,
        contact_person_3_name     = CASE WHEN coalesce(contact_person_3_name,'')='' THEN _orphan_profile.contact_person_3_name ELSE contact_person_3_name END,
        contact_person_3_number   = CASE WHEN coalesce(contact_person_3_number,'')='' THEN _orphan_profile.contact_person_3_number ELSE contact_person_3_number END,
        contact_person_3_whatsapp = CASE WHEN coalesce(contact_person_3_whatsapp,'')='' THEN _orphan_profile.contact_person_3_whatsapp ELSE contact_person_3_whatsapp END,
        updated_at                = now()
      WHERE user_id = _new;
    END IF;

    DELETE FROM public.freelancer_profiles WHERE user_id = _old;
  END IF;

  -- Reassign all related data from the old migrated user_id to the real user.
  UPDATE public.agency_clients           SET user_id = _new WHERE user_id = _old;
  UPDATE public.agency_client_payments   SET user_id = _new WHERE user_id = _old;
  UPDATE public.agency_client_events     SET user_id = _new WHERE user_id = _old;
  UPDATE public.agency_settings          SET user_id = _new WHERE user_id = _old;
  UPDATE public.agency_finance_banks     SET user_id = _new WHERE user_id = _old;
  UPDATE public.agency_finance_pins      SET user_id = _new WHERE user_id = _old;
  UPDATE public.crew_assignments         SET user_id = _new WHERE user_id = _old;
  UPDATE public.bookings                 SET user_id = _new WHERE user_id = _old;
  UPDATE public.booking_details          SET user_id = _new WHERE user_id = _old;
  UPDATE public.booking_details          SET event_owner_user_id = _new WHERE event_owner_user_id = _old;
  UPDATE public.lagan_dates              SET user_id = _new WHERE user_id = _old;
  UPDATE public.files_management         SET user_id = _new WHERE user_id = _old;
  UPDATE public.storage_devices          SET user_id = _new WHERE user_id = _old;
  UPDATE public.feed_posts               SET user_id = _new WHERE user_id = _old;
  UPDATE public.feed_likes               SET user_id = _new WHERE user_id = _old;
  UPDATE public.feed_comments            SET user_id = _new WHERE user_id = _old;
  UPDATE public.feed_comment_likes       SET user_id = _new WHERE user_id = _old;
  UPDATE public.feed_notifications       SET user_id = _new WHERE user_id = _old;
  UPDATE public.feed_notifications       SET from_user_id = _new WHERE from_user_id = _old;
  UPDATE public.market_posts             SET user_id = _new WHERE user_id = _old;
  UPDATE public.market_applications      SET user_id = _new WHERE user_id = _old;
  UPDATE public.market_assignments       SET assigned_user_id = _new WHERE assigned_user_id = _old;
  UPDATE public.market_assignments       SET assigned_by = _new WHERE assigned_by = _old;
  UPDATE public.market_comments          SET user_id = _new WHERE user_id = _old;
  UPDATE public.market_notifications     SET user_id = _new WHERE user_id = _old;
  UPDATE public.market_notifications     SET from_user_id = _new WHERE from_user_id = _old;
  UPDATE public.group_messages           SET user_id = _new WHERE user_id = _old;
  UPDATE public.follows                  SET follower_id = _new WHERE follower_id = _old;
  UPDATE public.follows                  SET following_id = _new WHERE following_id = _old;
  UPDATE public.broadcast_dismissals     SET user_id = _new WHERE user_id = _old;
  UPDATE public.agency_staff_invitations SET agency_user_id = _new WHERE agency_user_id = _old;
  UPDATE public.agency_staff_invitations SET invited_user_id = _new WHERE invited_user_id = _old;

  RETURN jsonb_build_object(
    'success', true,
    'reason', 'merged_orphan_data',
    'old_user_id', _old,
    'new_user_id', _new,
    'kept_existing_profile', _new_profile_id IS NOT NULL
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.link_orphan_profile_to_current_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.link_orphan_profile_to_current_user() FROM anon;
GRANT EXECUTE ON FUNCTION public.link_orphan_profile_to_current_user() TO authenticated;

-- =========================================================================
-- Admin-only equivalent: lets an admin trigger the same exact-email merge
-- for a specific Supabase auth user without that user needing to log in.
-- Same strict rule: only matches by exact email.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.admin_link_orphan_to_user(_target_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _email text;
  _new_profile_id uuid;
  _orphan_user_ids uuid[];
  _old uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  IF _target_user IS NULL THEN
    RAISE EXCEPTION 'Target user is required';
  END IF;

  SELECT lower(email) INTO _email FROM auth.users WHERE id = _target_user;
  IF _email IS NULL OR _email = '' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'target_has_no_email');
  END IF;

  SELECT id INTO _new_profile_id
  FROM public.freelancer_profiles
  WHERE user_id = _target_user
  LIMIT 1;

  SELECT array_agg(DISTINCT p.user_id)
  INTO _orphan_user_ids
  FROM public.freelancer_profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE u.id IS NULL
    AND p.user_id <> _target_user
    AND lower(coalesce(p.email,'')) = _email;

  IF _orphan_user_ids IS NULL OR array_length(_orphan_user_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_orphan_match');
  END IF;

  IF array_length(_orphan_user_ids, 1) > 1 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'ambiguous');
  END IF;

  _old := _orphan_user_ids[1];

  IF _new_profile_id IS NULL THEN
    UPDATE public.freelancer_profiles SET user_id = _target_user WHERE user_id = _old;
  ELSE
    DELETE FROM public.freelancer_profiles WHERE user_id = _old;
  END IF;

  UPDATE public.agency_clients           SET user_id = _target_user WHERE user_id = _old;
  UPDATE public.agency_client_payments   SET user_id = _target_user WHERE user_id = _old;
  UPDATE public.agency_client_events     SET user_id = _target_user WHERE user_id = _old;
  UPDATE public.agency_settings          SET user_id = _target_user WHERE user_id = _old;
  UPDATE public.agency_finance_banks     SET user_id = _target_user WHERE user_id = _old;
  UPDATE public.agency_finance_pins      SET user_id = _target_user WHERE user_id = _old;
  UPDATE public.crew_assignments         SET user_id = _target_user WHERE user_id = _old;
  UPDATE public.bookings                 SET user_id = _target_user WHERE user_id = _old;
  UPDATE public.booking_details          SET user_id = _target_user WHERE user_id = _old;
  UPDATE public.booking_details          SET event_owner_user_id = _target_user WHERE event_owner_user_id = _old;
  UPDATE public.lagan_dates              SET user_id = _target_user WHERE user_id = _old;
  UPDATE public.files_management         SET user_id = _target_user WHERE user_id = _old;
  UPDATE public.storage_devices          SET user_id = _target_user WHERE user_id = _old;
  UPDATE public.feed_posts               SET user_id = _target_user WHERE user_id = _old;
  UPDATE public.feed_likes               SET user_id = _target_user WHERE user_id = _old;
  UPDATE public.feed_comments            SET user_id = _target_user WHERE user_id = _old;
  UPDATE public.feed_comment_likes       SET user_id = _target_user WHERE user_id = _old;
  UPDATE public.feed_notifications       SET user_id = _target_user WHERE user_id = _old;
  UPDATE public.feed_notifications       SET from_user_id = _target_user WHERE from_user_id = _old;
  UPDATE public.market_posts             SET user_id = _target_user WHERE user_id = _old;
  UPDATE public.market_applications      SET user_id = _target_user WHERE user_id = _old;
  UPDATE public.market_assignments       SET assigned_user_id = _target_user WHERE assigned_user_id = _old;
  UPDATE public.market_assignments       SET assigned_by = _target_user WHERE assigned_by = _old;
  UPDATE public.market_comments          SET user_id = _target_user WHERE user_id = _old;
  UPDATE public.market_notifications     SET user_id = _target_user WHERE user_id = _old;
  UPDATE public.market_notifications     SET from_user_id = _target_user WHERE from_user_id = _old;
  UPDATE public.group_messages           SET user_id = _target_user WHERE user_id = _old;
  UPDATE public.follows                  SET follower_id = _target_user WHERE follower_id = _old;
  UPDATE public.follows                  SET following_id = _target_user WHERE following_id = _old;
  UPDATE public.broadcast_dismissals     SET user_id = _target_user WHERE user_id = _old;
  UPDATE public.agency_staff_invitations SET agency_user_id = _target_user WHERE agency_user_id = _old;
  UPDATE public.agency_staff_invitations SET invited_user_id = _target_user WHERE invited_user_id = _old;

  RETURN jsonb_build_object('success', true, 'old_user_id', _old, 'new_user_id', _target_user);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_link_orphan_to_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_link_orphan_to_user(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_link_orphan_to_user(uuid) TO authenticated;