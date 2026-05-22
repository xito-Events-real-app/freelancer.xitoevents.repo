
ALTER TABLE public.freelancer_profiles
  ADD COLUMN account_type text NOT NULL DEFAULT 'solo_creative',
  ADD COLUMN business_name text DEFAULT '';
