import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/contexts/ActiveCompanyContext';
import { withActiveAgency } from '@/lib/withActiveAgency';
import { keyForAgency } from '@/lib/queryKeys';
import { DEFAULT_SOURCES } from '@/lib/company-form-data';

export type AgencySettings = {
  id: string;
  user_id: string;
  handlers: string[];
  sources: string[];
  created_at: string;
  updated_at: string;
};

export function useAgencySettings() {
  const { activeAgencyId, switching, isOwner } = useActiveCompany();
  return useQuery({
    queryKey: keyForAgency('agency-settings', activeAgencyId),
    queryFn: async () => {
      if (!activeAgencyId) return null;
      const { data, error } = await supabase
        .from('agency_settings')
        .select('*')
        .eq('user_id', activeAgencyId)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // Auto-create defaults — only the owner can do this
        if (!isOwner) return null;
        return await withActiveAgency(activeAgencyId, async () => {
          const { data: created, error: createErr } = await supabase
            .from('agency_settings')
            .insert({ user_id: activeAgencyId, handlers: [], sources: DEFAULT_SOURCES })
            .select()
            .single();
          if (createErr) throw createErr;
          return created as AgencySettings;
        });
      }
      return data as AgencySettings;
    },
    enabled: !!activeAgencyId && !switching,
  });
}

export function useUpdateAgencySettings() {
  const qc = useQueryClient();
  const { activeAgencyId } = useActiveCompany();
  return useMutation({
    mutationFn: async (updates: { handlers?: string[]; sources?: string[] }) => {
      if (!activeAgencyId) throw new Error('No active company');
      return withActiveAgency(activeAgencyId, async () => {
        const { error } = await supabase
          .from('agency_settings')
          .update(updates)
          .eq('user_id', activeAgencyId);
        if (error) throw error;
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agency-settings'] }),
  });
}
