
CREATE TABLE public.crew_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid NOT NULL REFERENCES public.agency_client_events(id) ON DELETE CASCADE,
  role text NOT NULL,
  assigned_freelancer text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (event_id, role)
);

ALTER TABLE public.crew_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own crew assignments"
ON public.crew_assignments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own crew assignments"
ON public.crew_assignments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crew assignments"
ON public.crew_assignments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own crew assignments"
ON public.crew_assignments FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_crew_assignments_updated_at
BEFORE UPDATE ON public.crew_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
