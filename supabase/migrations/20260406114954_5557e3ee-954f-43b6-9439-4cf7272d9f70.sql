
-- 1. market_posts
CREATE TABLE public.market_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  event_name text NOT NULL,
  freelancer_type text,
  default_city text,
  default_area text,
  default_min_camera text,
  total_price text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.market_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view all posts" ON public.market_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own posts" ON public.market_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.market_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.market_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_market_posts_updated_at BEFORE UPDATE ON public.market_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. market_post_dates
CREATE TABLE public.market_post_dates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.market_posts(id) ON DELETE CASCADE,
  event_date date NOT NULL,
  timings text,
  city text,
  area text,
  min_camera text,
  freelancer_type text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.market_post_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view post dates" ON public.market_post_dates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Post owner can insert dates" ON public.market_post_dates FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.market_posts WHERE id = post_id AND user_id = auth.uid())
);
CREATE POLICY "Post owner can update dates" ON public.market_post_dates FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.market_posts WHERE id = post_id AND user_id = auth.uid())
);
CREATE POLICY "Post owner can delete dates" ON public.market_post_dates FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.market_posts WHERE id = post_id AND user_id = auth.uid())
);

-- 3. market_applications
CREATE TABLE public.market_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.market_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.market_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view applications" ON public.market_applications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own applications" ON public.market_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 4. market_comments
CREATE TABLE public.market_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.market_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.market_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view comments" ON public.market_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own comments" ON public.market_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 5. market_notifications
CREATE TABLE public.market_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  post_id uuid REFERENCES public.market_posts(id) ON DELETE CASCADE,
  type text NOT NULL,
  from_user_id uuid,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.market_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.market_notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.market_notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authenticated can insert notifications" ON public.market_notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.market_notifications;
