
-- Create booking_details table
CREATE TABLE public.booking_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role_category TEXT,
  sub_role TEXT,
  is_own_event BOOLEAN NOT NULL DEFAULT true,
  event_owner_name TEXT,
  event_owner_whatsapp TEXT,
  event_owner_user_id UUID,
  event_name TEXT,
  venue_name TEXT,
  venue_type TEXT,
  venue_city TEXT,
  venue_area TEXT,
  venue_map TEXT,
  event_start_time TEXT,
  event_end_time TEXT,
  bride_full_name TEXT,
  bride_contact TEXT,
  bride_whatsapp TEXT,
  bride_instagram TEXT,
  bride_home_city TEXT,
  bride_home_area TEXT,
  groom_full_name TEXT,
  groom_contact TEXT,
  groom_whatsapp TEXT,
  groom_instagram TEXT,
  groom_home_city TEXT,
  groom_home_area TEXT,
  form_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_details ENABLE ROW LEVEL SECURITY;

-- Owner policies
CREATE POLICY "Users can view own booking details"
  ON public.booking_details FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own booking details"
  ON public.booking_details FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own booking details"
  ON public.booking_details FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own booking details"
  ON public.booking_details FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Public form token access (anon can view and update by token)
CREATE POLICY "Anyone can view by form token"
  ON public.booking_details FOR SELECT
  TO anon
  USING (form_token IS NOT NULL);

CREATE POLICY "Anyone can update by form token"
  ON public.booking_details FOR UPDATE
  TO anon
  USING (form_token IS NOT NULL);

-- Timestamp trigger
CREATE TRIGGER update_booking_details_updated_at
  BEFORE UPDATE ON public.booking_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
