
-- Staff roles per company
CREATE TABLE IF NOT EXISTS public.agency_staff_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_user_id uuid NOT NULL,
  staff_user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('admin','finance','event_management','my_freelancers','add_client','file_management','settings')),
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agency_user_id, staff_user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_agency_staff_roles_staff ON public.agency_staff_roles(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_agency_staff_roles_agency ON public.agency_staff_roles(agency_user_id);

ALTER TABLE public.agency_staff_roles ENABLE ROW LEVEL SECURITY;

-- Security definer helper to check admin role without recursion
CREATE OR REPLACE FUNCTION public.has_company_role(_agency uuid, _staff uuid, _role text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_staff_roles
    WHERE agency_user_id = _agency AND staff_user_id = _staff AND role = _role
  );
$$;

-- RLS policies
CREATE POLICY "Owner manages roles"
ON public.agency_staff_roles FOR ALL
TO authenticated
USING (auth.uid() = agency_user_id)
WITH CHECK (auth.uid() = agency_user_id);

CREATE POLICY "Staff sees own roles"
ON public.agency_staff_roles FOR SELECT
TO authenticated
USING (auth.uid() = staff_user_id);

CREATE POLICY "Admin staff sees company roles"
ON public.agency_staff_roles FOR SELECT
TO authenticated
USING (public.has_company_role(agency_user_id, auth.uid(), 'admin'));

-- Trigger: only allow assigning roles to accepted staff invitations
CREATE OR REPLACE FUNCTION public.validate_agency_staff_role()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.agency_staff_invitations
    WHERE agency_user_id = NEW.agency_user_id
      AND invited_user_id = NEW.staff_user_id
      AND status = 'accepted'
      AND type = 'staff'
  ) THEN
    RAISE EXCEPTION 'Staff member must have an accepted staff invitation for this company';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_agency_staff_role
BEFORE INSERT ON public.agency_staff_roles
FOR EACH ROW EXECUTE FUNCTION public.validate_agency_staff_role();

-- Cascade cleanup: when a staff invitation is deleted/rejected, drop their roles
CREATE OR REPLACE FUNCTION public.cleanup_agency_staff_roles()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.agency_staff_roles
    WHERE agency_user_id = OLD.agency_user_id AND staff_user_id = OLD.invited_user_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND NEW.status <> 'accepted' AND OLD.status = 'accepted' THEN
    DELETE FROM public.agency_staff_roles
    WHERE agency_user_id = NEW.agency_user_id AND staff_user_id = NEW.invited_user_id;
    RETURN NEW;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_cleanup_agency_staff_roles_del
AFTER DELETE ON public.agency_staff_invitations
FOR EACH ROW EXECUTE FUNCTION public.cleanup_agency_staff_roles();

CREATE TRIGGER trg_cleanup_agency_staff_roles_upd
AFTER UPDATE ON public.agency_staff_invitations
FOR EACH ROW EXECUTE FUNCTION public.cleanup_agency_staff_roles();

-- Get all (company, role) pairs for a staff user, with company info
CREATE OR REPLACE FUNCTION public.staff_company_roles(_staff uuid)
RETURNS TABLE(
  agency_user_id uuid,
  business_name text,
  full_name text,
  profile_photo_url text,
  roles text[]
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    inv.agency_user_id,
    fp.business_name,
    fp.full_name,
    fp.profile_photo_url,
    COALESCE(
      (SELECT array_agg(DISTINCT r.role) FROM public.agency_staff_roles r
        WHERE r.agency_user_id = inv.agency_user_id AND r.staff_user_id = _staff),
      ARRAY[]::text[]
    ) AS roles
  FROM public.agency_staff_invitations inv
  JOIN public.freelancer_profiles fp ON fp.user_id = inv.agency_user_id
  WHERE inv.invited_user_id = _staff
    AND inv.status = 'accepted'
    AND inv.type = 'staff'
  GROUP BY inv.agency_user_id, fp.business_name, fp.full_name, fp.profile_photo_url;
$$;
