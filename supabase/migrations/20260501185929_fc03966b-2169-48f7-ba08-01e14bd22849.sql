CREATE OR REPLACE FUNCTION public.link_orphan_profile_to_current_user()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new uuid := auth.uid();
  _email text;
  _orphan_user_ids uuid[];
  _old uuid;
BEGIN
  IF _new IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT lower(email) INTO _email FROM auth.users WHERE id = _new;
  IF _email IS NULL OR _email = '' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_email');
  END IF;

  IF EXISTS (SELECT 1 FROM public.freelancer_profiles WHERE user_id = _new) THEN
    RETURN jsonb_build_object('success', true, 'reason', 'already_linked');
  END IF;

  SELECT array_agg(p.user_id)
  INTO _orphan_user_ids
  FROM public.freelancer_profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE u.id IS NULL
    AND lower(coalesce(p.email,'')) = _email;

  IF _orphan_user_ids IS NULL OR array_length(_orphan_user_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_orphan_match');
  END IF;

  IF array_length(_orphan_user_ids, 1) > 1 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'ambiguous');
  END IF;

  _old := _orphan_user_ids[1];

  UPDATE public.freelancer_profiles      SET user_id = _new WHERE user_id = _old;
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

  RETURN jsonb_build_object('success', true, 'old_user_id', _old, 'new_user_id', _new);
END;
$$;

REVOKE ALL ON FUNCTION public.link_orphan_profile_to_current_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.link_orphan_profile_to_current_user() FROM anon;
GRANT EXECUTE ON FUNCTION public.link_orphan_profile_to_current_user() TO authenticated;

DO $$
DECLARE
  _old uuid := '2e576ed6-dbf7-4239-adaa-2bd6bfe6b848';
  _new uuid := '753ec85d-3af0-42d0-9a21-69a6f6cfb996';
BEGIN
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
END $$;