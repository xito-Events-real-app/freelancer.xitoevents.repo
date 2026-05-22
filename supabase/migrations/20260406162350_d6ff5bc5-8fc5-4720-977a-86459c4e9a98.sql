
ALTER TABLE public.freelancer_profiles
ADD COLUMN hide_booking_dates boolean NOT NULL DEFAULT false,
ADD COLUMN hide_email boolean NOT NULL DEFAULT false;
