
-- Add parent_id for threaded replies and likes_count to feed_comments
ALTER TABLE public.feed_comments
  ADD COLUMN parent_id uuid REFERENCES public.feed_comments(id) ON DELETE CASCADE,
  ADD COLUMN likes_count integer NOT NULL DEFAULT 0;

-- Create feed_comment_likes table
CREATE TABLE public.feed_comment_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL REFERENCES public.feed_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.feed_comment_likes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anon can view comment likes"
  ON public.feed_comment_likes FOR SELECT TO anon USING (true);

CREATE POLICY "Authenticated can view comment likes"
  ON public.feed_comment_likes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own comment likes"
  ON public.feed_comment_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comment likes"
  ON public.feed_comment_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Trigger to update likes_count on feed_comments
CREATE OR REPLACE FUNCTION public.update_comment_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_comment_likes_count
AFTER INSERT OR DELETE ON public.feed_comment_likes
FOR EACH ROW EXECUTE FUNCTION public.update_comment_likes_count();
