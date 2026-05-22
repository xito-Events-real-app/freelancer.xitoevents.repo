-- Add new columns to agency_clients
ALTER TABLE public.agency_clients
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS handler text,
  ADD COLUMN IF NOT EXISTS event_location_type text,
  ADD COLUMN IF NOT EXISTS event_from_city text,
  ADD COLUMN IF NOT EXISTS event_to_city text,
  ADD COLUMN IF NOT EXISTS advance_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description text;

-- Create agency_client_events table
CREATE TABLE public.agency_client_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  event_date_bs text,
  event_date_ad date,
  event_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_client_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own client events"
  ON public.agency_client_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own client events"
  ON public.agency_client_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own client events"
  ON public.agency_client_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own client events"
  ON public.agency_client_events FOR DELETE
  USING (auth.uid() = user_id);

-- Create agency_settings table
CREATE TABLE public.agency_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  handlers text[] NOT NULL DEFAULT '{}',
  sources text[] NOT NULL DEFAULT ARRAY['INSTAGRAM','FACEBOOK','WHATSAPP','OLD CLIENT','REFERENCE','WEBSITE','OTHER'],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON public.agency_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.agency_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.agency_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON public.agency_settings FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_agency_settings_updated_at
  BEFORE UPDATE ON public.agency_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();