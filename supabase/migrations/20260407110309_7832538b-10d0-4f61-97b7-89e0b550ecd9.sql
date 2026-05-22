
-- feed_posts
CREATE TABLE public.feed_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT,
  image_url TEXT,
  image_path TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can view feed posts" ON public.feed_posts FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can view feed posts" ON public.feed_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own feed posts" ON public.feed_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own feed posts" ON public.feed_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own feed posts" ON public.feed_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_feed_posts_updated_at BEFORE UPDATE ON public.feed_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- feed_likes
CREATE TABLE public.feed_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can view feed likes" ON public.feed_likes FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can view feed likes" ON public.feed_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own feed likes" ON public.feed_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own feed likes" ON public.feed_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- feed_comments
CREATE TABLE public.feed_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can view feed comments" ON public.feed_comments FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can view feed comments" ON public.feed_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own feed comments" ON public.feed_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own feed comments" ON public.feed_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Triggers for auto-incrementing counts
CREATE OR REPLACE FUNCTION public.update_feed_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER feed_likes_count_trigger
AFTER INSERT OR DELETE ON public.feed_likes
FOR EACH ROW EXECUTE FUNCTION public.update_feed_likes_count();

CREATE OR REPLACE FUNCTION public.update_feed_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER feed_comments_count_trigger
AFTER INSERT OR DELETE ON public.feed_comments
FOR EACH ROW EXECUTE FUNCTION public.update_feed_comments_count();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_comments;
