
-- ============================================================
-- 1. user_suspensions
-- ============================================================
CREATE TABLE public.user_suspensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  suspended_by uuid NOT NULL,
  reason text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_suspensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all suspensions"
ON public.user_suspensions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert suspensions"
ON public.user_suspensions FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update suspensions"
ON public.user_suspensions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete suspensions"
ON public.user_suspensions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own suspension"
ON public.user_suspensions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER trg_user_suspensions_updated_at
BEFORE UPDATE ON public.user_suspensions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. is_suspended helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_suspended(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_suspensions
    WHERE user_id = _user_id AND active = true
  )
$$;

-- ============================================================
-- 3. Block suspended users from writes (read-only mode)
-- ============================================================

-- feed_posts
DROP POLICY IF EXISTS "Users can insert own feed posts" ON public.feed_posts;
CREATE POLICY "Users can insert own feed posts"
ON public.feed_posts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

DROP POLICY IF EXISTS "Users can update own feed posts" ON public.feed_posts;
CREATE POLICY "Users can update own feed posts"
ON public.feed_posts FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

-- feed_comments
DROP POLICY IF EXISTS "Users can insert own feed comments" ON public.feed_comments;
CREATE POLICY "Users can insert own feed comments"
ON public.feed_comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

-- feed_likes
DROP POLICY IF EXISTS "Users can insert own feed likes" ON public.feed_likes;
CREATE POLICY "Users can insert own feed likes"
ON public.feed_likes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

-- feed_comment_likes
DROP POLICY IF EXISTS "Users can insert own comment likes" ON public.feed_comment_likes;
CREATE POLICY "Users can insert own comment likes"
ON public.feed_comment_likes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

-- market_posts
DROP POLICY IF EXISTS "Users can insert own posts" ON public.market_posts;
CREATE POLICY "Users can insert own posts"
ON public.market_posts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

DROP POLICY IF EXISTS "Users can update own posts" ON public.market_posts;
CREATE POLICY "Users can update own posts"
ON public.market_posts FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

-- market_applications
DROP POLICY IF EXISTS "Users can insert own applications" ON public.market_applications;
CREATE POLICY "Users can insert own applications"
ON public.market_applications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

-- market_comments
DROP POLICY IF EXISTS "Users can insert own comments" ON public.market_comments;
CREATE POLICY "Users can insert own comments"
ON public.market_comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

-- messages
DROP POLICY IF EXISTS "Mutual followers can send messages" ON public.messages;
CREATE POLICY "Mutual followers can send messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_conversation_member(conversation_id, auth.uid())
  AND (SELECT public.are_mutual_followers(c.user1_id, c.user2_id)
       FROM public.conversations c WHERE c.id = conversation_id)
  AND NOT public.is_suspended(auth.uid())
);

-- group_messages
DROP POLICY IF EXISTS "Users can send group messages" ON public.group_messages;
CREATE POLICY "Users can send group messages"
ON public.group_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

-- bookings
DROP POLICY IF EXISTS "Users can insert own bookings" ON public.bookings;
CREATE POLICY "Users can insert own bookings"
ON public.bookings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
CREATE POLICY "Users can update own bookings"
ON public.bookings FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

-- booking_details
DROP POLICY IF EXISTS "Users can insert own booking details" ON public.booking_details;
CREATE POLICY "Users can insert own booking details"
ON public.booking_details FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

DROP POLICY IF EXISTS "Users can update own booking details" ON public.booking_details;
CREATE POLICY "Users can update own booking details"
ON public.booking_details FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

-- agency_clients
DROP POLICY IF EXISTS "Users can insert own clients" ON public.agency_clients;
CREATE POLICY "Users can insert own clients"
ON public.agency_clients FOR INSERT
WITH CHECK (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

DROP POLICY IF EXISTS "Users can update own clients" ON public.agency_clients;
CREATE POLICY "Users can update own clients"
ON public.agency_clients FOR UPDATE
USING (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

-- agency_client_events
DROP POLICY IF EXISTS "Users can insert own client events" ON public.agency_client_events;
CREATE POLICY "Users can insert own client events"
ON public.agency_client_events FOR INSERT
WITH CHECK (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

DROP POLICY IF EXISTS "Users can update own client events" ON public.agency_client_events;
CREATE POLICY "Users can update own client events"
ON public.agency_client_events FOR UPDATE
USING (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

-- ============================================================
-- 4. Admin moderation deletes
-- ============================================================
CREATE POLICY "Admins can delete any feed post"
ON public.feed_posts FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any feed comment"
ON public.feed_comments FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any market post"
ON public.market_posts FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any market application"
ON public.market_applications FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any market comment"
ON public.market_comments FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 5. feature_flags
-- ============================================================
CREATE TABLE public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  description text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read flags"
ON public.feature_flags FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Anon can read flags"
ON public.feature_flags FOR SELECT TO anon
USING (true);

CREATE POLICY "Admins can insert flags"
ON public.feature_flags FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update flags"
ON public.feature_flags FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete flags"
ON public.feature_flags FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_feature_flags_updated_at
BEFORE UPDATE ON public.feature_flags
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('marketplace_enabled',  true, 'Show the Marketplace / job board section.'),
  ('feed_enabled',         true, 'Show the Social Feed section.'),
  ('chat_enabled',         true, 'Allow 1:1 and group chat.'),
  ('broadcasts_enabled',   true, 'Show admin broadcast popups to users.'),
  ('agency_suite_enabled', true, 'Allow agencies to access the Business Suite.'),
  ('registration_enabled', true, 'Allow new users to complete registration.')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 6. reports (table only)
-- ============================================================
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit reports"
ON public.reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports"
ON public.reports FOR SELECT TO authenticated
USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
ON public.reports FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reports"
ON public.reports FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete reports"
ON public.reports FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 7. admin_list_users RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_list_users(_search text DEFAULT '', _limit int DEFAULT 100)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  account_type text,
  profile_photo_url text,
  contact_number text,
  is_admin boolean,
  is_suspended boolean,
  suspension_reason text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.email::text,
    COALESCE(p.full_name, '')::text AS full_name,
    COALESCE(p.account_type, 'solo_creative')::text AS account_type,
    COALESCE(p.profile_photo_url, '')::text AS profile_photo_url,
    COALESCE(p.contact_number, '')::text AS contact_number,
    public.has_role(u.id, 'admin') AS is_admin,
    EXISTS (SELECT 1 FROM public.user_suspensions s WHERE s.user_id = u.id AND s.active = true) AS is_suspended,
    (SELECT s.reason FROM public.user_suspensions s WHERE s.user_id = u.id AND s.active = true LIMIT 1) AS suspension_reason,
    u.created_at
  FROM auth.users u
  LEFT JOIN public.freelancer_profiles p ON p.user_id = u.id
  WHERE
    _search = ''
    OR u.email ILIKE '%' || _search || '%'
    OR COALESCE(p.full_name, '') ILIKE '%' || _search || '%'
    OR COALESCE(p.contact_number, '') ILIKE '%' || _search || '%'
    OR COALESCE(p.business_name, '') ILIKE '%' || _search || '%'
  ORDER BY u.created_at DESC
  LIMIT GREATEST(_limit, 1);
END;
$$;

-- ============================================================
-- 8. admin_platform_stats RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_platform_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT jsonb_build_object(
    'total_users',         (SELECT count(*) FROM auth.users),
    'total_profiles',      (SELECT count(*) FROM public.freelancer_profiles),
    'total_agencies',      (SELECT count(*) FROM public.freelancer_profiles WHERE account_type = 'agency'),
    'total_solo',          (SELECT count(*) FROM public.freelancer_profiles WHERE account_type = 'solo_creative'),
    'signups_last_7d',     (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '7 days'),
    'signups_last_30d',    (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '30 days'),
    'total_bookings',      (SELECT count(*) FROM public.bookings),
    'total_feed_posts',    (SELECT count(*) FROM public.feed_posts),
    'total_market_posts',  (SELECT count(*) FROM public.market_posts),
    'total_messages',      (SELECT count(*) FROM public.messages),
    'total_group_messages',(SELECT count(*) FROM public.group_messages),
    'active_broadcasts',   (SELECT count(*) FROM public.broadcasts WHERE active = true),
    'suspended_users',     (SELECT count(*) FROM public.user_suspensions WHERE active = true),
    'admin_count',         (SELECT count(*) FROM public.user_roles WHERE role = 'admin')
  ) INTO _result;

  RETURN _result;
END;
$$;

-- ============================================================
-- 9. admin_signups_by_day RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_signups_by_day(_days int DEFAULT 30)
RETURNS TABLE (day date, signups bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  RETURN QUERY
  WITH series AS (
    SELECT generate_series(
      (current_date - (_days - 1))::date,
      current_date,
      '1 day'::interval
    )::date AS day
  )
  SELECT
    s.day,
    COALESCE(count(u.id), 0)::bigint AS signups
  FROM series s
  LEFT JOIN auth.users u ON u.created_at::date = s.day
  GROUP BY s.day
  ORDER BY s.day;
END;
$$;

-- ============================================================
-- 10. admin role management RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_set_role(_target_user uuid, _make_admin boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF _target_user = auth.uid() THEN
    RAISE EXCEPTION 'Cannot change your own admin role';
  END IF;

  IF _make_admin THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_target_user, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles
    WHERE user_id = _target_user AND role = 'admin';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_suspension(_target_user uuid, _suspend boolean, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF _target_user = auth.uid() THEN
    RAISE EXCEPTION 'Cannot suspend yourself';
  END IF;

  IF _suspend THEN
    INSERT INTO public.user_suspensions (user_id, suspended_by, reason, active)
    VALUES (_target_user, auth.uid(), _reason, true)
    ON CONFLICT (user_id) DO UPDATE
    SET active = true,
        reason = COALESCE(EXCLUDED.reason, public.user_suspensions.reason),
        suspended_by = auth.uid(),
        updated_at = now();
  ELSE
    UPDATE public.user_suspensions
    SET active = false, updated_at = now()
    WHERE user_id = _target_user;
  END IF;
END;
$$;
