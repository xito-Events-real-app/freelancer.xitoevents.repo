
CREATE TABLE public.market_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.market_applications(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.market_posts(id) ON DELETE CASCADE,
  assigned_user_id uuid NOT NULL,
  assigned_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.market_assignments ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view assignments
CREATE POLICY "Authenticated can view assignments"
ON public.market_assignments
FOR SELECT
TO authenticated
USING (true);

-- Only the poster (assigned_by) can create assignments
CREATE POLICY "Poster can insert assignments"
ON public.market_assignments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = assigned_by);

-- Only the assigned freelancer can update status
CREATE POLICY "Assigned user can update assignment"
ON public.market_assignments
FOR UPDATE
TO authenticated
USING (auth.uid() = assigned_user_id);

-- Enable realtime for assignments
ALTER PUBLICATION supabase_realtime ADD TABLE public.market_assignments;
