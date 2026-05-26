-- 1. Extend client_deliverables
ALTER TABLE public.client_deliverables
  ADD COLUMN IF NOT EXISTS photographer_toggles text NOT NULL DEFAULT '';

-- Backfill nulls just in case
UPDATE public.client_deliverables SET photographer_notes = '' WHERE photographer_notes IS NULL;
UPDATE public.client_deliverables SET item_names = '' WHERE item_names IS NULL;
UPDATE public.client_deliverables SET album_name = '' WHERE album_name IS NULL;
UPDATE public.client_deliverables SET event_name = '' WHERE event_name IS NULL;

-- Unique constraint for upsert onConflict
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_deliverables_unique_combo'
  ) THEN
    ALTER TABLE public.client_deliverables
      ADD CONSTRAINT client_deliverables_unique_combo
      UNIQUE (client_id, event_name, section, deliverable_type);
  END IF;
END $$;

-- 2. album_types
CREATE TABLE IF NOT EXISTS public.album_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, type_name)
);
ALTER TABLE public.album_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company access: select album_types" ON public.album_types;
DROP POLICY IF EXISTS "Company access: insert album_types" ON public.album_types;
DROP POLICY IF EXISTS "Company access: update album_types" ON public.album_types;
DROP POLICY IF EXISTS "Company access: delete album_types" ON public.album_types;

CREATE POLICY "Company access: select album_types" ON public.album_types FOR SELECT
  USING (can_access_company(user_id, 'clients'::text));
CREATE POLICY "Company access: insert album_types" ON public.album_types FOR INSERT
  WITH CHECK (can_access_company(user_id, 'clients'::text) AND (NOT is_suspended(auth.uid())));
CREATE POLICY "Company access: update album_types" ON public.album_types FOR UPDATE
  USING (can_access_company(user_id, 'clients'::text))
  WITH CHECK (can_access_company(user_id, 'clients'::text));
CREATE POLICY "Company access: delete album_types" ON public.album_types FOR DELETE
  USING (can_access_company(user_id, 'clients'::text));

-- 3. video_edit_tracker
CREATE TABLE IF NOT EXISTS public.video_edit_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  event_name text NOT NULL DEFAULT '',
  sub_event_name text NOT NULL DEFAULT '',
  edit_type text NOT NULL DEFAULT '',
  video_edit_status text NOT NULL DEFAULT 'QUEUE',
  urgency text NOT NULL DEFAULT '',
  editor text NOT NULL DEFAULT '',
  colorist text NOT NULL DEFAULT '',
  company_notes text NOT NULL DEFAULT '',
  client_demand text NOT NULL DEFAULT '',
  reference text NOT NULL DEFAULT '',
  songs text NOT NULL DEFAULT '',
  youtube_link text NOT NULL DEFAULT '',
  stage_history text NOT NULL DEFAULT '',
  force_split boolean NOT NULL DEFAULT false,
  is_playing boolean NOT NULL DEFAULT false,
  playing_since timestamptz,
  edit_started_at timestamptz,
  deadline timestamptz,
  deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, event_name, sub_event_name, edit_type)
);
ALTER TABLE public.video_edit_tracker ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency staff full access" ON public.video_edit_tracker;
CREATE POLICY "agency staff full access" ON public.video_edit_tracker
  FOR ALL TO authenticated
  USING (client_belongs_to_my_agency(client_id))
  WITH CHECK (client_belongs_to_my_agency(client_id));

-- 4. photo_edit_tracker
CREATE TABLE IF NOT EXISTS public.photo_edit_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  event_name text NOT NULL DEFAULT '',
  edit_type text NOT NULL DEFAULT '',
  photographer_name text NOT NULL DEFAULT '',
  photographer_role text NOT NULL DEFAULT '',
  photographer_side text NOT NULL DEFAULT '',
  photo_edit_status text NOT NULL DEFAULT 'QUEUE',
  urgency text NOT NULL DEFAULT '',
  editor text NOT NULL DEFAULT '',
  company_notes text NOT NULL DEFAULT '',
  client_demand text NOT NULL DEFAULT '',
  reference text NOT NULL DEFAULT '',
  stage_history text NOT NULL DEFAULT '',
  is_playing boolean NOT NULL DEFAULT false,
  playing_since timestamptz,
  edit_started_at timestamptz,
  deadline timestamptz,
  deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, event_name, edit_type, photographer_role, photographer_name)
);
ALTER TABLE public.photo_edit_tracker ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency staff full access" ON public.photo_edit_tracker;
CREATE POLICY "agency staff full access" ON public.photo_edit_tracker
  FOR ALL TO authenticated
  USING (client_belongs_to_my_agency(client_id))
  WITH CHECK (client_belongs_to_my_agency(client_id));

-- 5. updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_video_edit_tracker_updated_at ON public.video_edit_tracker;
CREATE TRIGGER trg_video_edit_tracker_updated_at
  BEFORE UPDATE ON public.video_edit_tracker
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_photo_edit_tracker_updated_at ON public.photo_edit_tracker;
CREATE TRIGGER trg_photo_edit_tracker_updated_at
  BEFORE UPDATE ON public.photo_edit_tracker
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 6. Realtime
ALTER TABLE public.client_deliverables REPLICA IDENTITY FULL;
ALTER TABLE public.video_edit_tracker  REPLICA IDENTITY FULL;
ALTER TABLE public.photo_edit_tracker  REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.client_deliverables; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.video_edit_tracker;  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.photo_edit_tracker;  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;