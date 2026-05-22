import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/contexts/ActiveCompanyContext';
import { withActiveAgency } from '@/lib/withActiveAgency';
import { keyForAgency } from '@/lib/queryKeys';

export type AgencyClientEvent = {
  id: string;
  client_id: string;
  user_id: string;
  event_date_bs: string | null;
  event_date_ad: string | null;
  event_name: string | null;
  required_crew: string | null;
  created_at: string;
};

export function useAgencyClientEvents(clientId?: string) {
  const { activeAgencyId, switching } = useActiveCompany();
  return useQuery({
    queryKey: keyForAgency('agency-client-events', activeAgencyId, clientId ?? null),
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('agency_client_events')
        .select('*')
        .eq('client_id', clientId)
        .order('event_date_ad', { ascending: true });
      if (error) throw error;
      return (data ?? []) as AgencyClientEvent[];
    },
    enabled: !!clientId && !!activeAgencyId && !switching,
  });
}

function invalidateEvents(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['agency-client-events'] });
  qc.invalidateQueries({ queryKey: ['all-agency-events'] });
  qc.invalidateQueries({ queryKey: ['agency-clients'] });
}

export function useAddAgencyClientEvents() {
  const qc = useQueryClient();
  const { activeAgencyId } = useActiveCompany();
  return useMutation({
    mutationFn: async (events: { client_id: string; event_date_bs: string; event_date_ad: string; event_name: string }[]) => {
      if (!activeAgencyId) throw new Error('No active company');
      const rows = events.map(e => ({ ...e, user_id: activeAgencyId }));
      return withActiveAgency(activeAgencyId, async () => {
        const { error } = await supabase.from('agency_client_events').insert(rows);
        if (error) throw error;
      });
    },
    onSuccess: () => invalidateEvents(qc),
  });
}

export function useDeleteAgencyClientEvent() {
  const qc = useQueryClient();
  const { activeAgencyId } = useActiveCompany();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!activeAgencyId) throw new Error('No active company');
      return withActiveAgency(activeAgencyId, async () => {
        // Cleanup any crew assignments tied to this event
        await supabase.from('crew_assignments').delete().eq('event_id', id);
        const { error } = await supabase.from('agency_client_events').delete().eq('id', id);
        if (error) throw error;
      });
    },
    onSuccess: () => {
      invalidateEvents(qc);
      qc.invalidateQueries({ queryKey: ['crew-assignments'] });
    },
  });
}
