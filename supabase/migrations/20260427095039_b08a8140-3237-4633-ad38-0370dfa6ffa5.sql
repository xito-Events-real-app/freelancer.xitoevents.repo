-- ============================================================
-- File Management module: storage_devices + files_management
-- ============================================================

-- 1) storage_devices ------------------------------------------------
CREATE TABLE public.storage_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  device_type text NOT NULL DEFAULT 'HARD_DRIVE',
  device_name text NOT NULL DEFAULT '',
  pc_drive_letter text,
  total_storage_gb numeric NOT NULL DEFAULT 0,
  used_storage_gb numeric NOT NULL DEFAULT 0,
  remaining_storage_gb numeric GENERATED ALWAYS AS (total_storage_gb - used_storage_gb) STORED,
  health_percent integer NOT NULL DEFAULT 100,
  safety_status text NOT NULL DEFAULT 'SAFE',
  speed_rating integer NOT NULL DEFAULT 3,
  purchase_date_ad text DEFAULT '',
  purchase_date_bs text DEFAULT '',
  price_npr numeric DEFAULT 0,
  purchased_from text DEFAULT '',
  cloud_type text DEFAULT '',
  expiry_date_ad text DEFAULT '',
  synced_to_sheet boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_storage_devices_user ON public.storage_devices(user_id);

ALTER TABLE public.storage_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own storage devices"
  ON public.storage_devices FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own storage devices"
  ON public.storage_devices FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own storage devices"
  ON public.storage_devices FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own storage devices"
  ON public.storage_devices FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_storage_devices_updated_at
  BEFORE UPDATE ON public.storage_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) files_management ----------------------------------------------
CREATE TABLE public.files_management (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  registered_date_time_ad text NOT NULL DEFAULT '',
  registered_date_bs text DEFAULT '',
  client_name text DEFAULT '',
  event_name text DEFAULT '',
  event_year text DEFAULT '',
  event_month text DEFAULT '',
  event_day text DEFAULT '',
  event_date_ad text DEFAULT '',
  freelancer_type text DEFAULT '',
  freelancer_name text DEFAULT '',
  storage_type text DEFAULT '',
  storage_device_id uuid REFERENCES public.storage_devices(id) ON DELETE SET NULL,
  year_event_folder text DEFAULT '',
  category text DEFAULT '',
  client_folder_name text DEFAULT '',
  event_folder_name text DEFAULT '',
  side text DEFAULT '',
  card_label text DEFAULT '',
  size_gb numeric DEFAULT 0,
  number_of_items integer DEFAULT 0,
  format_type text DEFAULT '',
  who_copied text DEFAULT '',
  reconfirmation boolean DEFAULT false,
  double_backup boolean DEFAULT false,
  double_backup_path text DEFAULT '',
  triple_backup boolean DEFAULT false,
  triple_backup_path text DEFAULT '',
  drive_upload boolean DEFAULT false,
  drive_upload_path text DEFAULT '',
  deleted_or_not boolean DEFAULT false,
  final_generated_path text DEFAULT '',
  backup_1_device_name text DEFAULT '',
  backup_2_path text DEFAULT '',
  backup_2_device_name text DEFAULT '',
  backup_3_path text DEFAULT '',
  backup_3_device_name text DEFAULT '',
  drive_link text DEFAULT '',
  notes text DEFAULT '',
  confirmed boolean DEFAULT false,
  backup_1_recorded_at timestamptz,
  backup_2_recorded_at timestamptz,
  backup_3_recorded_at timestamptz,
  backup_history text DEFAULT '',
  synced_to_sheet boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_files_management_user ON public.files_management(user_id);
CREATE INDEX idx_files_management_user_active ON public.files_management(user_id, deleted_or_not);
CREATE INDEX idx_files_management_user_month ON public.files_management(user_id, event_year, event_month);
CREATE INDEX idx_files_management_storage_device ON public.files_management(storage_device_id);
CREATE INDEX idx_files_management_registered_dt ON public.files_management(user_id, registered_date_time_ad);

ALTER TABLE public.files_management ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own file rows"
  ON public.files_management FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own file rows"
  ON public.files_management FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own file rows"
  ON public.files_management FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own file rows"
  ON public.files_management FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_files_management_updated_at
  BEFORE UPDATE ON public.files_management
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Auto-recalc storage device used_storage_gb --------------------
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

CREATE TRIGGER trg_files_management_recalc_usage
  AFTER INSERT OR DELETE ON public.files_management
  FOR EACH ROW EXECUTE FUNCTION public.update_storage_device_usage();

CREATE TRIGGER trg_files_management_recalc_usage_update
  AFTER UPDATE OF size_gb, storage_device_id, deleted_or_not ON public.files_management
  FOR EACH ROW EXECUTE FUNCTION public.update_storage_device_usage();

-- 4) Realtime ------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.storage_devices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.files_management;
