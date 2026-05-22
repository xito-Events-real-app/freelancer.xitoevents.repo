
-- Track views
CREATE TABLE public.market_post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE public.market_post_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view post views" ON public.market_post_views FOR SELECT USING (true);
CREATE POLICY "Auth can insert views" ON public.market_post_views FOR INSERT TO authenticated WITH CHECK (true);

-- Track likes
CREATE TABLE public.market_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE public.market_post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view post likes" ON public.market_post_likes FOR SELECT USING (true);
CREATE POLICY "Auth can like posts" ON public.market_post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth can unlike posts" ON public.market_post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
