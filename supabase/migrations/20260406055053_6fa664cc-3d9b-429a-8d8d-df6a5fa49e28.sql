
-- Create freelancer_profiles table
CREATE TABLE public.freelancer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  contact_number TEXT NOT NULL DEFAULT '',
  whatsapp_number TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  profile_photo_url TEXT DEFAULT '',
  instagram TEXT DEFAULT '',
  facebook TEXT DEFAULT '',
  city TEXT DEFAULT '',
  area TEXT DEFAULT '',
  google_map_link TEXT DEFAULT '',
  pathao_landmark TEXT DEFAULT '',
  main_job TEXT DEFAULT '',
  photographer TEXT DEFAULT 'NO',
  videographer TEXT DEFAULT 'NO',
  photo_editor TEXT DEFAULT 'NO',
  video_editor TEXT DEFAULT 'NO',
  hybrid_shooter TEXT DEFAULT 'NO',
  hybrid_editor TEXT DEFAULT 'NO',
  drone_operator TEXT DEFAULT 'NO',
  fpv_operator TEXT DEFAULT 'NO',
  iphone_shooter TEXT DEFAULT 'NO',
  camera_body TEXT DEFAULT '',
  lenses TEXT DEFAULT '',
  drone_model TEXT DEFAULT '',
  editing_setup TEXT DEFAULT '',
  available_for_travel BOOLEAN DEFAULT true,
  preferred_event_types TEXT DEFAULT '',
  rate_per_day TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  bank_account_number TEXT DEFAULT '',
  bank_account_holder TEXT DEFAULT '',
  portfolio_links TEXT[] DEFAULT '{}',
  bio TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.freelancer_profiles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view profiles (for discovery)
CREATE POLICY "Anyone authenticated can view profiles"
  ON public.freelancer_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.freelancer_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.freelancer_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_freelancer_profiles_updated_at
  BEFORE UPDATE ON public.freelancer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos', 'profile-photos', true);

CREATE POLICY "Profile photos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos');

CREATE POLICY "Users can upload their own profile photo"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own profile photo"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
