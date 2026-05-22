import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, AlertTriangle, Lock } from 'lucide-react';
import { ALL_ROLES, type StaffRole } from '@/hooks/useStaffPermissions';
import { useRevokeFinanceAccess } from '@/hooks/useAgencyFinance';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast as sonner } from 'sonner';

interface Props {
  agencyUserId: string;
  staffUserId: string;
  staffName?: string | null;
}

/** Per-role one-liner of capabilities, surfacing destructive abilities so owners grant intentionally. */
const ROLE_CAPABILITIES: Record<StaffRole, string> = {
  admin: 'Full access to every section. Cannot remove other staff members.',
  finance: 'View, add, edit and delete payments (PIN-gated). Manage finance banks.',
  event_management: 'View & edit clients, bookings, crew assignments — including delete.',
  my_freelancers: 'View and manage the freelancer directory.',
  add_client: 'Create new clients and view the client list.',
  file_management: 'Upload, edit, and delete files & storage devices.',
  settings: 'View and change company settings.',
};

export default function StaffRolesCard({ agencyUserId, staffUserId, staffName }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isOwner = user?.id === agencyUserId;
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const revokeFinance = useRevokeFinanceAccess();

  const { data: assigned = [], isLoading } = useQuery({
    queryKey: ['staff-roles-assigned', agencyUserId, staffUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_staff_roles' as any)
        .select('role')
        .eq('agency_user_id', agencyUserId)
        .eq('staff_user_id', staffUserId);
      if (error) throw error;
      return ((data as any[]) || []).map(r => r.role as StaffRole);
    },
  });

  const [selected, setSelected] = useState<Set<StaffRole>>(new Set());
  useEffect(() => { setSelected(new Set(assigned)); }, [assigned]);

  const dirty = (() => {
    if (selected.size !== assigned.length) return true;
    for (const r of assigned) if (!selected.has(r)) return true;
    return false;
  })();

  const save = useMutation({
    mutationFn: async () => {
      const { error: delErr } = await supabase
        .from('agency_staff_roles' as any)
        .delete()
        .eq('agency_user_id', agencyUserId)
        .eq('staff_user_id', staffUserId);
      if (delErr) throw delErr;
      if (selected.size > 0) {
        const rows = Array.from(selected).map(role => ({
          agency_user_id: agencyUserId,
          staff_user_id: staffUserId,
          role,
          granted_by: user?.id,
        }));
        const { error: insErr } = await supabase
          .from('agency_staff_roles' as any)
          .insert(rows as any);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-roles-assigned', agencyUserId, staffUserId] });
      qc.invalidateQueries({ queryKey: ['staff-roles', agencyUserId] });
      qc.invalidateQueries({ queryKey: ['my-companies'] });
      sonner.success('Roles updated successfully');
    },
    onError: (e: any) => sonner.error(e?.message || 'Failed to save roles'),
  });

  const toggle = (r: StaffRole) => {
    if (!isOwner) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r); else next.add(r);
      return next;
    });
  };

  const handleRevokeFinance = () => {
    revokeFinance.mutate(staffUserId, {
      onSuccess: () => {
        sonner.success('Finance access revoked');
        setConfirmRevoke(false);
      },
      onError: (e: any) => sonner.error(e?.message || 'Failed to revoke finance access'),
    });
  };

  const hasFinance = assigned.includes('finance');

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Access & Roles</h3>
            <p className="text-xs text-muted-foreground">Choose what this staff member can access.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {ALL_ROLES.map(({ role, label }) => (
              <label
                key={role}
                className={`flex items-start gap-3 p-3 rounded-xl border border-border ${isOwner ? 'cursor-pointer hover:bg-muted' : 'opacity-80'}`}
              >
                <Checkbox
                  checked={selected.has(role)}
                  onCheckedChange={() => toggle(role)}
                  disabled={!isOwner}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{ROLE_CAPABILITIES[role]}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        {selected.has('admin') && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Admin can access everything except removing staff.</span>
          </div>
        )}

        {isOwner ? (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {hasFinance ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/40 hover:bg-destructive/10"
                onClick={() => setConfirmRevoke(true)}
                disabled={revokeFinance.isPending}
              >
                <Lock className="h-3.5 w-3.5 mr-1.5" />
                Revoke finance access
              </Button>
            ) : <span />}
            <Button
              onClick={() => save.mutate()}
              disabled={!dirty || save.isPending}
            >
              {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Roles
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">Only the company owner can change roles.</p>
        )}
      </CardContent>

      <AlertDialog open={confirmRevoke} onOpenChange={setConfirmRevoke}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove finance access for {staffName || 'this staff member'}?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes their finance role and signs them out of finance immediately.
              To re-grant access later you'll need to re-enable the finance role for this person.
              The company finance PIN is unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeFinance.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleRevokeFinance(); }}
              disabled={revokeFinance.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeFinance.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Revoke finance access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
