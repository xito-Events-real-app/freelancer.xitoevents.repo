
-- Create bookings table for freelancers to mark dates with events
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  booking_date DATE NOT NULL,
  event_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, booking_date)
);

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Users can view their own bookings
CREATE POLICY "Users can view own bookings"
ON public.bookings FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert own bookings
CREATE POLICY "Users can insert own bookings"
ON public.bookings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update own bookings
CREATE POLICY "Users can update own bookings"
ON public.bookings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete own bookings
CREATE POLICY "Users can delete own bookings"
ON public.bookings FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE TRIGGER update_bookings_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
