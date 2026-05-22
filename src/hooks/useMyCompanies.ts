import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { StaffRole } from './useStaffPermissions';

export interface MyCompany {
  agency_user_id: string;
  business_name: string | null;
  full_name: string | null;
  profile_photo_url: string | null;
  roles: StaffRole[];
}

/** Returns companies where the current user is an accepted staff member, with assigned roles. */
export function useMyCompanies() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-companies', user?.id],
    queryFn: async () => {
      if (!user) return [] as MyCompany[];
      try {
        const { data, error } = await supabase.rpc('staff_company_roles' as any, { _staff: user.id });
        if (error) {
          console.warn('[useMyCompanies] RPC failed, returning empty:', error.message);
          return [] as MyCompany[];
        }
        return ((data as any[]) || []) as MyCompany[];
      } catch {
        return [] as MyCompany[];
      }
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}
