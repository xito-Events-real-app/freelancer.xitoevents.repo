
-- Create group_messages table for public group chat
CREATE TABLE public.group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT,
  image_url TEXT,
  image_path TEXT,
  reply_to_id UUID REFERENCES public.group_messages(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read all messages
CREATE POLICY "Authenticated can view group messages"
ON public.group_messages FOR SELECT
TO authenticated
USING (true);

-- Users can insert their own messages
CREATE POLICY "Users can send group messages"
ON public.group_messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete own group messages"
ON public.group_messages FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
