import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/contexts/ActiveCompanyContext';
import { withActiveAgency } from '@/lib/withActiveAgency';
import { keyForAgency } from '@/lib/queryKeys';

export interface CrewAssignment {
  id: string;
  user_id: string;
  event_id: string;
  role: string;
  assigned_freelancer: string | null;
}

export function useCrewAssignments(eventIds: string[]) {
  const { activeAgencyId, switching } = useActiveCompany();
  return useQuery({
    queryKey: keyForAgency('crew-assignments', activeAgencyId, eventIds),
    queryFn: async () => {
      if (!activeAgencyId || eventIds.length === 0) return [];
      const { data, error } = await supabase
        .from('crew_assignments')
        .select('*')
        .eq('user_id', activeAgencyId)
        .in('event_id', eventIds);
      if (error) throw error;
      return (data ?? []) as CrewAssignment[];
    },
    enabled: !!activeAgencyId && !switching && eventIds.length > 0,
  });
}

export function useUpsertCrewAssignment() {
  const qc = useQueryClient();
  const { activeAgencyId } = useActiveCompany();
  return useMutation({
    mutationFn: async ({ eventId, role, freelancer }: { eventId: string; role: string; freelancer: string | null }) => {
      if (!activeAgencyId) throw new Error('No active company');
      const { data, error } = await supabase.rpc('upsert_crew_assignment_scoped' as any, {
        _agency_user_id: activeAgencyId,
        _event_id: eventId,
        _role: role,
        _assigned_freelancer: freelancer,
      });
      if (error) throw error;
      return data;
    },
    onMutate: async ({ eventId, role, freelancer }) => {
      if (!activeAgencyId) return;
      await qc.cancelQueries({ queryKey: ['crew-assignments'] });
      const queries = qc.getQueriesData<CrewAssignment[]>({ queryKey: ['crew-assignments', activeAgencyId] });
      const snapshots = queries.map(([key, data]) => ({ key, data }));
      for (const { key, data } of snapshots) {
        if (!data) continue;
        let updated: CrewAssignment[];
        if (!freelancer) {
          updated = data.filter(a => !(a.event_id === eventId && a.role === role));
        } else {
          const idx = data.findIndex(a => a.event_id === eventId && a.role === role);
          if (idx >= 0) {
            updated = [...data];
            updated[idx] = { ...updated[idx], assigned_freelancer: freelancer };
          } else {
            updated = [...data, {
              id: `temp-${Date.now()}`,
              user_id: activeAgencyId,
              event_id: eventId,
              role,
              assigned_freelancer: freelancer,
            }];
          }
        }
        qc.setQueryData(key, updated);
      }
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      if (context?.snapshots) {
        for (const { key, data } of context.snapshots) {
          qc.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['crew-assignments'] });
    },
  });
}
