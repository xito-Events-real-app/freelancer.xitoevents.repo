-- 1. Role enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. broadcasts table
CREATE TABLE IF NOT EXISTS public.broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz
);

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view broadcasts" ON public.broadcasts;
CREATE POLICY "Authenticated can view broadcasts"
  ON public.broadcasts FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert broadcasts" ON public.broadcasts;
CREATE POLICY "Admins can insert broadcasts"
  ON public.broadcasts FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update broadcasts" ON public.broadcasts;
CREATE POLICY "Admins can update broadcasts"
  ON public.broadcasts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete broadcasts" ON public.broadcasts;
CREATE POLICY "Admins can delete broadcasts"
  ON public.broadcasts FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. broadcast_dismissals table
CREATE TABLE IF NOT EXISTS public.broadcast_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (broadcast_id, user_id)
);

ALTER TABLE public.broadcast_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own dismissals" ON public.broadcast_dismissals;
CREATE POLICY "Users can view own dismissals"
  ON public.broadcast_dismissals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all dismissals" ON public.broadcast_dismissals;
CREATE POLICY "Admins can view all dismissals"
  ON public.broadcast_dismissals FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can insert own dismissals" ON public.broadcast_dismissals;
CREATE POLICY "Users can insert own dismissals"
  ON public.broadcast_dismissals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 6. Seed first super admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = 'xitoevents@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 7. Enable realtime for broadcasts
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcasts;