
DO $$
DECLARE
  _new uuid := '224bfa15-0e4d-4251-9464-5e56287d3305';
  _old uuid := '3086d455-2a67-4bbf-aeba-43d7a1286823';
  _orphan public.freelancer_profiles%ROWTYPE;
BEGIN
  SELECT * INTO _orphan FROM public.freelancer_profiles WHERE user_id = _old;
  IF FOUND THEN
    UPDATE public.freelancer_profiles SET
      profile_photo_url = CASE WHEN coalesce(profile_photo_url,'')='' THEN _orphan.profile_photo_url ELSE profile_photo_url END,
      instagram         = CASE WHEN coalesce(instagram,'')='' OR instagram = 'Niraj Jairu' THEN _orphan.instagram ELSE instagram END,
      facebook          = CASE WHEN coalesce(facebook,'')='' THEN _orphan.facebook ELSE facebook END,
      youtube           = CASE WHEN coalesce(youtube,'')='' THEN _orphan.youtube ELSE youtube END,
      tiktok            = CASE WHEN coalesce(tiktok,'')='' THEN _orphan.tiktok ELSE tiktok END,
      city              = CASE WHEN coalesce(city,'')='' THEN _orphan.city ELSE city END,
      area              = CASE WHEN coalesce(area,'')='' THEN _orphan.area ELSE area END,
      google_map_link   = CASE WHEN coalesce(google_map_link,'')='' THEN _orphan.google_map_link ELSE google_map_link END,
      pathao_landmark   = CASE WHEN coalesce(pathao_landmark,'')='' THEN _orphan.pathao_landmark ELSE pathao_landmark END,
      main_job          = CASE WHEN coalesce(main_job,'')='' THEN _orphan.main_job ELSE main_job END,
      camera_body       = CASE WHEN coalesce(camera_body,'')='' THEN _orphan.camera_body ELSE camera_body END,
      lenses            = CASE WHEN coalesce(lenses,'')='' THEN _orphan.lenses ELSE lenses END,
      drone_model       = CASE WHEN coalesce(drone_model,'')='' THEN _orphan.drone_model ELSE drone_model END,
      editing_setup     = CASE WHEN coalesce(editing_setup,'')='' THEN _orphan.editing_setup ELSE editing_setup END,
      rate_per_day      = CASE WHEN coalesce(rate_per_day,'')='' THEN _orphan.rate_per_day ELSE rate_per_day END,
      bank_name         = CASE WHEN coalesce(bank_name,'')='' THEN _orphan.bank_name ELSE bank_name END,
      bank_account_number = CASE WHEN coalesce(bank_account_number,'')='' THEN _orphan.bank_account_number ELSE bank_account_number END,
      bank_account_holder = CASE WHEN coalesce(bank_account_holder,'')='' THEN _orphan.bank_account_holder ELSE bank_account_holder END,
      bio               = CASE WHEN coalesce(bio,'')='' THEN _orphan.bio ELSE bio END,
      portfolio_links   = CASE WHEN portfolio_links IS NULL OR array_length(portfolio_links,1) IS NULL THEN _orphan.portfolio_links ELSE portfolio_links END,
      business_name     = CASE WHEN coalesce(business_name,'')='' THEN _orphan.business_name ELSE business_name END,
      updated_at        = now()
    WHERE user_id = _new;
  END IF;

  -- Reassign related rows
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

  DELETE FROM public.freelancer_profiles WHERE user_id = _old;
END $$;
