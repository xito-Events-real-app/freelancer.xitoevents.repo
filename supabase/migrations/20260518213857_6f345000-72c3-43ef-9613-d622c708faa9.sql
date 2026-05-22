BEGIN;

-- =====================================================
-- 1. Venue types (FK target, supports rename cascade)
-- =====================================================
CREATE TABLE public.xito_venue_types (
  name text PRIMARY KEY,
  position int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.xito_venue_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read venue types"
  ON public.xito_venue_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage venue types"
  ON public.xito_venue_types FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.xito_venue_types (name, position) VALUES
  ('BANQUET', 1), ('HOTEL', 2), ('RESORT', 3), ('RESTAURANT', 4),
  ('CHURCH', 5),  ('TEMPLE', 6), ('GUMBA', 7), ('MOSQUE', 8),
  ('PARK', 9),    ('COURT', 10), ('GURUDWAR', 11), ('HILL', 12);

-- =====================================================
-- 2. Deletion queue (must exist before triggers reference it)
-- =====================================================
CREATE TABLE public.r2_deletion_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL,
  r2_key text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  last_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_r2_queue_pending ON public.r2_deletion_queue (created_at) WHERE attempts < 5;

ALTER TABLE public.r2_deletion_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage r2 deletion queue"
  ON public.r2_deletion_queue FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE VIEW public.r2_deletion_failed
  WITH (security_invoker = true) AS
  SELECT * FROM public.r2_deletion_queue WHERE attempts >= 5;

CREATE TABLE public.r2_janitor_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  bucket text NOT NULL,
  r2_keys_scanned int NOT NULL DEFAULT 0,
  orphans_enqueued int NOT NULL DEFAULT 0,
  error text
);
ALTER TABLE public.r2_janitor_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read janitor runs"
  ON public.r2_janitor_runs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 3. Venues
-- =====================================================
CREATE TABLE public.xito_venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_name text NOT NULL,
  venue_type text NOT NULL REFERENCES public.xito_venue_types(name) ON UPDATE CASCADE ON DELETE RESTRICT,
  city text DEFAULT '',
  area text DEFAULT '',
  location_briefing text DEFAULT '',
  rating int NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),

  company_whatsapp text DEFAULT '',
  company_phone text DEFAULT '',
  gmail text DEFAULT '',

  owner1_name text DEFAULT '',
  owner1_contact text DEFAULT '',
  owner1_whatsapp text DEFAULT '',
  owner2_name text DEFAULT '',
  owner2_contact text DEFAULT '',
  owner2_whatsapp text DEFAULT '',

  google_map text DEFAULT '' CHECK (google_map = '' OR google_map ~* '^https://'),
  website   text DEFAULT '' CHECK (website   = '' OR website   ~* '^https://'),
  instagram text DEFAULT '' CHECK (instagram = '' OR instagram ~* '^https://'),
  facebook  text DEFAULT '' CHECK (facebook  = '' OR facebook  ~* '^https://'),
  tiktok    text DEFAULT '' CHECK (tiktok    = '' OR tiktok    ~* '^https://'),
  youtube   text DEFAULT '' CHECK (youtube   = '' OR youtube   ~* '^https://'),

  cover_r2_key text DEFAULT '',
  cover_url    text DEFAULT '',
  avatar_r2_key text DEFAULT '',
  avatar_url    text DEFAULT '',

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_xv_type ON public.xito_venues (venue_type);
CREATE INDEX idx_xv_name ON public.xito_venues (venue_name);
CREATE INDEX idx_xv_city ON public.xito_venues (city);
CREATE INDEX idx_xv_created_by ON public.xito_venues (created_by);
CREATE INDEX idx_xv_not_deleted ON public.xito_venues (id) WHERE deleted_at IS NULL;

ALTER TABLE public.xito_venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage venues"
  ON public.xito_venues FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER xv_set_updated_at BEFORE UPDATE ON public.xito_venues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 4. Photos
-- =====================================================
CREATE TABLE public.xito_venue_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.xito_venues(id) ON DELETE CASCADE,
  r2_key text NOT NULL,
  public_url text NOT NULL,
  position int NOT NULL DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.xito_venue_photos
  ADD CONSTRAINT xvp_position_unique UNIQUE (venue_id, position) DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX idx_xvp_venue ON public.xito_venue_photos (venue_id, position);

ALTER TABLE public.xito_venue_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage venue photos"
  ON public.xito_venue_photos FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Prevent inserting photos for soft-deleted venues
CREATE OR REPLACE FUNCTION public.xvp_block_soft_deleted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.xito_venues WHERE id = NEW.venue_id AND deleted_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Cannot add photos to a deleted venue';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER xvp_block_soft_deleted_trg BEFORE INSERT ON public.xito_venue_photos
  FOR EACH ROW EXECUTE FUNCTION public.xvp_block_soft_deleted();

-- =====================================================
-- 5. Orphan-cleanup triggers
-- =====================================================
CREATE OR REPLACE FUNCTION public.xvp_enqueue_r2_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.r2_key <> '' THEN
    INSERT INTO public.r2_deletion_queue (bucket, r2_key)
      VALUES ('venue-xitoevents', OLD.r2_key);
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER xvp_enqueue_r2_delete_trg AFTER DELETE ON public.xito_venue_photos
  FOR EACH ROW EXECUTE FUNCTION public.xvp_enqueue_r2_delete();

CREATE OR REPLACE FUNCTION public.xv_enqueue_image_swap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.cover_r2_key IS DISTINCT FROM NEW.cover_r2_key AND OLD.cover_r2_key <> '' THEN
      INSERT INTO public.r2_deletion_queue (bucket, r2_key)
        VALUES ('venue-xitoevents', OLD.cover_r2_key);
    END IF;
    IF OLD.avatar_r2_key IS DISTINCT FROM NEW.avatar_r2_key AND OLD.avatar_r2_key <> '' THEN
      INSERT INTO public.r2_deletion_queue (bucket, r2_key)
        VALUES ('venue-xitoevents', OLD.avatar_r2_key);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.cover_r2_key <> '' THEN
      INSERT INTO public.r2_deletion_queue (bucket, r2_key) VALUES ('venue-xitoevents', OLD.cover_r2_key);
    END IF;
    IF OLD.avatar_r2_key <> '' THEN
      INSERT INTO public.r2_deletion_queue (bucket, r2_key) VALUES ('venue-xitoevents', OLD.avatar_r2_key);
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER xv_image_swap_trg AFTER UPDATE OF cover_r2_key, avatar_r2_key ON public.xito_venues
  FOR EACH ROW EXECUTE FUNCTION public.xv_enqueue_image_swap();
CREATE TRIGGER xv_image_delete_trg AFTER DELETE ON public.xito_venues
  FOR EACH ROW EXECUTE FUNCTION public.xv_enqueue_image_swap();

COMMIT;