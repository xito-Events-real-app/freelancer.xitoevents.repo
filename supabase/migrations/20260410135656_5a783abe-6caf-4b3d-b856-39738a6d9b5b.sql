
CREATE TABLE public.agency_staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_user_id uuid NOT NULL,
  invited_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_user_id, invited_user_id)
);

ALTER TABLE public.agency_staff_invitations ENABLE ROW LEVEL SECURITY;

-- Agency owner can view their invitations
CREATE POLICY "Agency owner can view own invitations"
ON public.agency_staff_invitations FOR SELECT
TO authenticated
USING (auth.uid() = agency_user_id);

-- Invited user can view invitations sent to them
CREATE POLICY "Invited user can view own invitations"
ON public.agency_staff_invitations FOR SELECT
TO authenticated
USING (auth.uid() = invited_user_id);

-- Agency owner can create invitations
CREATE POLICY "Agency owner can insert invitations"
ON public.agency_staff_invitations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = agency_user_id);

-- Invited user can update (accept/reject)
CREATE POLICY "Invited user can update invitation status"
ON public.agency_staff_invitations FOR UPDATE
TO authenticated
USING (auth.uid() = invited_user_id);

-- Agency owner can delete invitations
CREATE POLICY "Agency owner can delete invitations"
ON public.agency_staff_invitations FOR DELETE
TO authenticated
USING (auth.uid() = agency_user_id);

-- Timestamp trigger
CREATE TRIGGER update_staff_invitations_updated_at
BEFORE UPDATE ON public.agency_staff_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
