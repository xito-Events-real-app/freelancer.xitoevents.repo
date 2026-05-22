
-- Restore standard PostgREST grants that were missing on tables imported from
-- the previous Supabase project. Without these, RLS policies never get a
-- chance to run and every query returns "permission denied".

-- Tables authenticated users need full CRUD on (RLS still enforces row scope).
DO $$
DECLARE
  t text;
  authed_tables text[] := ARRAY[
    'agency_clients',
    'agency_client_events',
    'agency_client_payments',
    'agency_finance_banks',
    'agency_finance_pins',
    'agency_finance_sessions',
    'agency_settings',
    'agency_staff_invitations',
    'booking_details',
    'bookings',
    'broadcasts',
    'broadcast_dismissals',
    'conversations',
    'crew_assignments',
    'feature_flags',
    'feed_comments',
    'feed_comment_likes',
    'feed_likes',
    'feed_notifications',
    'feed_posts',
    'files_management',
    'follows',
    'freelancer_profiles',
    'global_lagan_dates',
    'group_messages',
    'lagan_dates',
    'market_applications',
    'market_assignments',
    'market_comments',
    'market_notifications',
    'market_post_dates',
    'market_post_likes',
    'market_post_views',
    'market_posts',
    'messages',
    'reports',
    'storage_devices',
    'user_roles',
    'user_suspensions'
  ];
BEGIN
  FOREACH t IN ARRAY authed_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    END IF;
  END LOOP;
END $$;

-- Tables anonymous visitors should be able to read (RLS still applies).
DO $$
DECLARE
  t text;
  anon_read_tables text[] := ARRAY[
    'bookings',
    'broadcasts',
    'feature_flags',
    'feed_comments',
    'feed_comment_likes',
    'feed_likes',
    'feed_posts',
    'follows',
    'freelancer_profiles',
    'global_lagan_dates',
    'market_applications',
    'market_assignments',
    'market_comments',
    'market_post_dates',
    'market_post_likes',
    'market_post_views',
    'market_posts'
  ];
BEGIN
  FOREACH t IN ARRAY anon_read_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
    END IF;
  END LOOP;
END $$;

-- service_role needs full access for edge functions / admin RPCs.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Sequences — needed for inserts that use serial/identity keys.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Make sure future tables get the same treatment.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;
