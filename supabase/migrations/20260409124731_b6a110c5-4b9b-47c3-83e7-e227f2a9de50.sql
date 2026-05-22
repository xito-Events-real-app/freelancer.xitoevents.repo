
ALTER TABLE public.freelancer_profiles
  ADD COLUMN contact_person_2_name text DEFAULT '',
  ADD COLUMN contact_person_2_number text DEFAULT '',
  ADD COLUMN contact_person_2_whatsapp text DEFAULT '',
  ADD COLUMN contact_person_3_name text DEFAULT '',
  ADD COLUMN contact_person_3_number text DEFAULT '',
  ADD COLUMN contact_person_3_whatsapp text DEFAULT '';
