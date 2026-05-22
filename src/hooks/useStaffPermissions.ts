import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMyProfile } from '@/hooks/useProfile';

export type StaffRole =
  | 'admin'
  | 'finance'
  | 'event_management'
  | 'my_freelancers'
  | 'add_client'
  | 'file_management'
  | 'settings';

export const ALL_ROLES: { role: StaffRole; label: string; description: string }[] = [
  { role: 'admin',            label: 'Admin',            description: 'Full access. Cannot remove staff members.' },
  { role: 'finance',          label: 'Finance',          description: 'Finance Manager access (PIN protected).' },
  { role: 'event_management', label: 'Event Management', description: 'Event planning and calendar.' },
  { role: 'my_freelancers',   label: 'My Freelancers',   description: 'Freelancer directory and management.' },
  { role: 'add_client',       label: 'Add Client',       description: 'Client creation and CRM access.' },
  { role: 'file_management',  label: 'File Management',  description: 'Upload, view, and manage files.' },
  { role: 'settings',         label: 'Settings',         description: 'Company settings access.' },
];

/** Sections used by the company suite — keep in sync with CompanySuiteShell */
export type SectionKey =
  | 'dashboard'
  | 'event_management'
  | 'all_clients'
  | 'my_freelancers'
  | 'add_client'
  | 'booked'
  | 'finance'
  | 'file_management'
  | 'settings';

const ROLE_TO_SECTIONS: Record<StaffRole, SectionKey[]> = {
  admin:            ['dashboard','event_management','all_clients','my_freelancers','add_client','booked','finance','file_management','settings'],
  finance:          ['finance'],
  event_management: ['event_management','all_clients','booked'],
  my_freelancers:   ['my_freelancers'],
  add_client:       ['add_client'],
  file_management:  ['file_management'],
  settings:         ['settings'],
};

export function rolesToSections(roles: StaffRole[]): Set<SectionKey> {
  const set = new Set<SectionKey>(['dashboard']);
  for (const r of roles) ROLE_TO_SECTIONS[r]?.forEach(s => set.add(s));
  return set;
}

export function useStaffPermissions(agencyUserId: string | null | undefined) {
  const { user } = useAuth();
  const { data: profile } = useMyProfile();

  const isOwner = !!user && !!agencyUserId && user.id === agencyUserId
    && profile?.account_type === 'agency';

  const query = useQuery({
    queryKey: ['staff-roles', agencyUserId, user?.id],
    queryFn: async () => {
      if (!user || !agencyUserId || isOwner) return [] as StaffRole[];
      const { data, error } = await supabase
        .from('agency_staff_roles' as any)
        .select('role')
        .eq('agency_user_id', agencyUserId)
        .eq('staff_user_id', user.id);
      if (error) throw error;
      return ((data as any[]) || []).map(r => r.role as StaffRole);
    },
    enabled: !!user && !!agencyUserId && !isOwner,
    staleTime: 30_000,
  });

  const roles = query.data ?? [];
  const allowedSections = isOwner
    ? new Set<SectionKey>(['dashboard','event_management','all_clients','my_freelancers','add_client','booked','finance','file_management','settings'])
    : rolesToSections(roles);

  return {
    isOwner,
    roles,
    hasRole: (r: StaffRole) => isOwner || roles.includes(r),
    allowedSections,
    canSee: (s: SectionKey) => isOwner || allowedSections.has(s),
    loading: !isOwner && query.isLoading,
  };
}
