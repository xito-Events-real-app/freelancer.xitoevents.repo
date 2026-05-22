
-- Create lagan_dates table
CREATE TABLE public.lagan_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bs_year integer NOT NULL,
  bs_month integer NOT NULL,
  bs_day integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, bs_year, bs_month, bs_day)
);

ALTER TABLE public.lagan_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lagan dates" ON public.lagan_dates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lagan dates" ON public.lagan_dates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own lagan dates" ON public.lagan_dates FOR DELETE USING (auth.uid() = user_id);

-- Add required_crew column to agency_client_events
ALTER TABLE public.agency_client_events ADD COLUMN required_crew text DEFAULT NULL;
