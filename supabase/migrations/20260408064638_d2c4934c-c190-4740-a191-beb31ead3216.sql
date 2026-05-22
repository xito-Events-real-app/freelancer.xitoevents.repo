
CREATE TABLE public.feed_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  from_user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  type text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.feed_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feed notifications"
  ON public.feed_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert feed notifications"
  ON public.feed_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own feed notifications"
  ON public.feed_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_feed_notifications_user ON public.feed_notifications(user_id, read);

-- Trigger: notify post owner on new like
CREATE OR REPLACE FUNCTION public.notify_on_feed_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO feed_notifications (user_id, from_user_id, post_id, type)
  SELECT fp.user_id, NEW.user_id, NEW.post_id, 'like'
  FROM feed_posts fp
  WHERE fp.id = NEW.post_id AND fp.user_id != NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_feed_like_notify
AFTER INSERT ON public.feed_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_feed_like();

-- Trigger: notify post owner on new comment
CREATE OR REPLACE FUNCTION public.notify_on_feed_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO feed_notifications (user_id, from_user_id, post_id, type)
  SELECT fp.user_id, NEW.user_id, NEW.post_id, 'comment'
  FROM feed_posts fp
  WHERE fp.id = NEW.post_id AND fp.user_id != NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_feed_comment_notify
AFTER INSERT ON public.feed_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_feed_comment();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_notifications;
