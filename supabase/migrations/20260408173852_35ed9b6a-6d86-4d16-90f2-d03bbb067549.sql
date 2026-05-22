
-- 1. follows table FIRST
CREATE TABLE public.follows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id != following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view follows"
  ON public.follows FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can send follow requests"
  ON public.follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Recipients can accept or reject"
  ON public.follows FOR UPDATE TO authenticated
  USING (auth.uid() = following_id);

CREATE POLICY "Followers can cancel or unfollow"
  ON public.follows FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);

-- 2. are_mutual_followers function (after follows table exists)
CREATE OR REPLACE FUNCTION public.are_mutual_followers(user1 uuid, user2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM follows WHERE follower_id = user1 AND following_id = user2 AND status = 'accepted'
  ) AND EXISTS (
    SELECT 1 FROM follows WHERE follower_id = user2 AND following_id = user1 AND status = 'accepted'
  );
$$;

-- 3. enforce conversation ordering trigger function
CREATE OR REPLACE FUNCTION public.enforce_conversation_order()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  tmp uuid;
BEGIN
  IF NEW.user1_id > NEW.user2_id THEN
    tmp := NEW.user1_id;
    NEW.user1_id := NEW.user2_id;
    NEW.user2_id := tmp;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. conversations table
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id uuid NOT NULL,
  user2_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user1_id, user2_id)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_conversation_order
  BEFORE INSERT ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_conversation_order();

CREATE POLICY "Participants can view conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() IN (user1_id, user2_id));

CREATE POLICY "Mutual followers can create conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IN (user1_id, user2_id)
    AND public.are_mutual_followers(user1_id, user2_id)
  );

-- 5. messages table
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_conversation_member(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversations
    WHERE id = _conversation_id
    AND (_user_id = user1_id OR _user_id = user2_id)
  );
$$;

CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Mutual followers can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND public.is_conversation_member(conversation_id, auth.uid())
    AND (
      SELECT public.are_mutual_followers(c.user1_id, c.user2_id)
      FROM conversations c WHERE c.id = conversation_id
    )
  );

CREATE POLICY "Recipients can mark messages read"
  ON public.messages FOR UPDATE TO authenticated
  USING (
    public.is_conversation_member(conversation_id, auth.uid())
    AND auth.uid() != sender_id
  );

-- 6. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
