ALTER TABLE public.agency_clients
  ADD COLUMN IF NOT EXISTS profile_photo_url text,
  ADD COLUMN IF NOT EXISTS rating            int,
  ADD COLUMN IF NOT EXISTS client_slug       text;

CREATE UNIQUE INDEX IF NOT EXISTS agency_clients_slug_uidx
  ON public.agency_clients(client_slug)
  WHERE client_slug IS NOT NULL;


CREATE TABLE IF NOT EXISTS public.agency_client_family_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL,
  name          text NOT NULL,
  role          text NOT NULL,
  side          text NOT NULL CHECK (side IN ('bride','groom')),
  photo_url     text,
  display_order int  NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_client_family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company access: select family"
  ON public.agency_client_family_members FOR SELECT
  USING (can_access_company(user_id, 'clients'));

CREATE POLICY "Company access: insert family"
  ON public.agency_client_family_members FOR INSERT
  WITH CHECK (can_access_company(user_id, 'clients') AND NOT is_suspended(auth.uid()));

CREATE POLICY "Company access: update family"
  ON public.agency_client_family_members FOR UPDATE
  USING (can_access_company(user_id, 'clients'))
  WITH CHECK (can_access_company(user_id, 'clients') AND NOT is_suspended(auth.uid()));

CREATE POLICY "Company access: delete family"
  ON public.agency_client_family_members FOR DELETE
  USING (can_access_company(user_id, 'clients'));

CREATE INDEX IF NOT EXISTS idx_family_client ON public.agency_client_family_members(client_id);


CREATE TABLE IF NOT EXISTS public.agency_reference_share_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  token       text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(16),'hex'),
  created_by  uuid,
  expires_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_reference_share_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company access: select ref tokens"
  ON public.agency_reference_share_tokens FOR SELECT
  USING (can_access_company(user_id, 'clients'));

CREATE POLICY "Company access: insert ref tokens"
  ON public.agency_reference_share_tokens FOR INSERT
  WITH CHECK (can_access_company(user_id, 'clients') AND NOT is_suspended(auth.uid()));

CREATE POLICY "Company access: delete ref tokens"
  ON public.agency_reference_share_tokens FOR DELETE
  USING (can_access_company(user_id, 'clients'));

CREATE POLICY "Anon read ref tokens by token"
  ON public.agency_reference_share_tokens FOR SELECT
  TO anon
  USING (token IS NOT NULL);


CREATE TABLE IF NOT EXISTS public.agency_client_activity_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  action_text text NOT NULL,
  created_by  uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_client_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company access: select activity"
  ON public.agency_client_activity_log FOR SELECT
  USING (can_access_company(user_id, 'clients'));

CREATE POLICY "Company access: insert activity"
  ON public.agency_client_activity_log FOR INSERT
  WITH CHECK (can_access_company(user_id, 'clients') AND NOT is_suspended(auth.uid()));

CREATE POLICY "Company access: delete activity"
  ON public.agency_client_activity_log FOR DELETE
  USING (can_access_company(user_id, 'clients'));

CREATE INDEX IF NOT EXISTS idx_activity_client_created
  ON public.agency_client_activity_log(client_id, created_at DESC);


CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_family_touch ON public.agency_client_family_members;
CREATE TRIGGER trg_family_touch BEFORE UPDATE ON public.agency_client_family_members
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();