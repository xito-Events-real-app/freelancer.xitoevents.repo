-- Ensure files_management has all fields required by the Files workflow
ALTER TABLE public.files_management
  ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS registered_date_time_ad text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS registered_date_bs text DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS event_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS event_year text DEFAULT '',
  ADD COLUMN IF NOT EXISTS event_month text DEFAULT '',
  ADD COLUMN IF NOT EXISTS event_day text DEFAULT '',
  ADD COLUMN IF NOT EXISTS event_date_ad text DEFAULT '',
  ADD COLUMN IF NOT EXISTS freelancer_type text DEFAULT '',
  ADD COLUMN IF NOT EXISTS freelancer_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS storage_type text DEFAULT '',
  ADD COLUMN IF NOT EXISTS storage_device_id uuid,
  ADD COLUMN IF NOT EXISTS year_event_folder text DEFAULT '',
  ADD COLUMN IF NOT EXISTS category text DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_folder_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS event_folder_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS side text DEFAULT '',
  ADD COLUMN IF NOT EXISTS card_label text DEFAULT '',
  ADD COLUMN IF NOT EXISTS size_gb numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS number_of_items integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS format_type text DEFAULT '',
  ADD COLUMN IF NOT EXISTS who_copied text DEFAULT '',
  ADD COLUMN IF NOT EXISTS reconfirmation boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirmed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS double_backup boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS double_backup_path text DEFAULT '',
  ADD COLUMN IF NOT EXISTS triple_backup boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS triple_backup_path text DEFAULT '',
  ADD COLUMN IF NOT EXISTS drive_upload boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS drive_upload_path text DEFAULT '',
  ADD COLUMN IF NOT EXISTS deleted_or_not boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS final_generated_path text DEFAULT '',
  ADD COLUMN IF NOT EXISTS backup_1_device_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS backup_1_recorded_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS backup_2_path text DEFAULT '',
  ADD COLUMN IF NOT EXISTS backup_2_device_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS backup_2_recorded_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS backup_3_path text DEFAULT '',
  ADD COLUMN IF NOT EXISTS backup_3_device_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS backup_3_recorded_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS drive_link text DEFAULT '',
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '',
  ADD COLUMN IF NOT EXISTS backup_history text DEFAULT '',
  ADD COLUMN IF NOT EXISTS synced_to_sheet boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Ensure storage_devices has all fields required by the Storage and Path Builder workflow
ALTER TABLE public.storage_devices
  ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS device_type text NOT NULL DEFAULT 'HARD_DRIVE',
  ADD COLUMN IF NOT EXISTS device_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pc_drive_letter text,
  ADD COLUMN IF NOT EXISTS cloud_type text DEFAULT '',
  ADD COLUMN IF NOT EXISTS total_storage_gb numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS used_storage_gb numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_storage_gb numeric,
  ADD COLUMN IF NOT EXISTS health_percent integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS safety_status text NOT NULL DEFAULT 'SAFE',
  ADD COLUMN IF NOT EXISTS speed_rating integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS purchase_date_ad text DEFAULT '',
  ADD COLUMN IF NOT EXISTS purchase_date_bs text DEFAULT '',
  ADD COLUMN IF NOT EXISTS expiry_date_ad text DEFAULT '',
  ADD COLUMN IF NOT EXISTS price_npr numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchased_from text DEFAULT '',
  ADD COLUMN IF NOT EXISTS synced_to_sheet boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Keep updated_at current
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_files_management_updated_at ON public.files_management;
CREATE TRIGGER update_files_management_updated_at
BEFORE UPDATE ON public.files_management
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_storage_devices_updated_at ON public.storage_devices;
CREATE TRIGGER update_storage_devices_updated_at
BEFORE UPDATE ON public.storage_devices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Recalculate storage usage when file rows change
CREATE OR REPLACE FUNCTION public.update_storage_device_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _device_ids uuid[];
  _did uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.storage_device_id IS NOT NULL THEN
      _device_ids := ARRAY[NEW.storage_device_id];
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    _device_ids := ARRAY(
      SELECT DISTINCT d FROM unnest(ARRAY[OLD.storage_device_id, NEW.storage_device_id]) AS d
      WHERE d IS NOT NULL
    );
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.storage_device_id IS NOT NULL THEN
      _device_ids := ARRAY[OLD.storage_device_id];
    END IF;
  END IF;

  IF _device_ids IS NULL OR array_length(_device_ids, 1) IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  FOREACH _did IN ARRAY _device_ids
  LOOP
    UPDATE public.storage_devices d
    SET used_storage_gb = COALESCE((
      SELECT SUM(size_gb)
      FROM public.files_management f
      WHERE f.storage_device_id = d.id
        AND f.deleted_or_not = false
    ), 0),
    updated_at = now()
    WHERE d.id = _did;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS update_storage_device_usage_on_files ON public.files_management;
CREATE TRIGGER update_storage_device_usage_on_files
AFTER INSERT OR UPDATE OR DELETE ON public.files_management
FOR EACH ROW
EXECUTE FUNCTION public.update_storage_device_usage();

-- Lock down access to each user's own file rows and devices
ALTER TABLE public.files_management ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own file rows" ON public.files_management;
DROP POLICY IF EXISTS "Users can insert own file rows" ON public.files_management;
DROP POLICY IF EXISTS "Users can update own file rows" ON public.files_management;
DROP POLICY IF EXISTS "Users can delete own file rows" ON public.files_management;
CREATE POLICY "Users can view own file rows" ON public.files_management FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own file rows" ON public.files_management FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own file rows" ON public.files_management FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own file rows" ON public.files_management FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own storage devices" ON public.storage_devices;
DROP POLICY IF EXISTS "Users can insert own storage devices" ON public.storage_devices;
DROP POLICY IF EXISTS "Users can update own storage devices" ON public.storage_devices;
DROP POLICY IF EXISTS "Users can delete own storage devices" ON public.storage_devices;
CREATE POLICY "Users can view own storage devices" ON public.storage_devices FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own storage devices" ON public.storage_devices FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own storage devices" ON public.storage_devices FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own storage devices" ON public.storage_devices FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enable realtime for live file and device updates
ALTER TABLE public.files_management REPLICA IDENTITY FULL;
ALTER TABLE public.storage_devices REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'files_management'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.files_management;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'storage_devices'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.storage_devices;
  END IF;
END $$;