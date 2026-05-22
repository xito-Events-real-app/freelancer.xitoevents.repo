-- Restore base schema access required for Supabase API roles.
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Public/readable data used by the home feed.
GRANT SELECT ON TABLE public.feed_posts TO anon, authenticated;
GRANT SELECT ON TABLE public.feed_likes TO anon, authenticated;
GRANT SELECT ON TABLE public.feed_comments TO anon, authenticated;
GRANT SELECT ON TABLE public.feed_comment_likes TO anon, authenticated;
GRANT SELECT ON TABLE public.freelancer_profiles TO anon, authenticated;
GRANT SELECT ON TABLE public.global_lagan_dates TO anon, authenticated;
GRANT SELECT ON TABLE public.feature_flags TO anon, authenticated;

-- Authenticated-only relationship data used for follow status in the feed.
GRANT SELECT ON TABLE public.follows TO authenticated;

-- Authenticated feed actions, still restricted by existing RLS policies.
GRANT INSERT, UPDATE, DELETE ON TABLE public.feed_posts TO authenticated;
GRANT INSERT, DELETE ON TABLE public.feed_likes TO authenticated;
GRANT INSERT, DELETE ON TABLE public.feed_comments TO authenticated;
GRANT INSERT, DELETE ON TABLE public.feed_comment_likes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.follows TO authenticated;
GRANT UPDATE ON TABLE public.freelancer_profiles TO authenticated;

-- Notifications created/read by feed interactions, still restricted by existing RLS policies.
GRANT SELECT, INSERT, UPDATE ON TABLE public.feed_notifications TO authenticated;