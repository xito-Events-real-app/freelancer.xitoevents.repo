
DROP POLICY "Auth can insert views" ON public.market_post_views;
CREATE POLICY "Auth can insert own views" ON public.market_post_views FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
