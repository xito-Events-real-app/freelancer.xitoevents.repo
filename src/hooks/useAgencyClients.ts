import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/contexts/ActiveCompanyContext';
import { withActiveAgency } from '@/lib/withActiveAgency';
import { keyForAgency } from '@/lib/queryKeys';

export type AgencyClient = {
  id: string;
  user_id: string;
  client_name: string;
  contact_number: string | null;
  whatsapp_number: string | null;
  email: string | null;
  event_name: string | null;
  event_date_bs: string | null;
  event_date_ad: string | null;
  event_city: string | null;
  event_area: string | null;
  package_amount: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  source: string | null;
  handler: string | null;
  event_location_type: string | null;
  event_from_city: string | null;
  event_to_city: string | null;
  advance_amount: number;
  description: string | null;
};

const invalidateAll = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['agency-clients'] });
  qc.invalidateQueries({ queryKey: ['agency-client-events'] });
  qc.invalidateQueries({ queryKey: ['all-agency-events'] });
  qc.invalidateQueries({ queryKey: ['crew-assignments'] });
  qc.invalidateQueries({ queryKey: ['agency-finance'] });
  qc.invalidateQueries({ queryKey: ['agency-client-payments'] });
};

export function useAgencyClients() {
  const { activeAgencyId, switching } = useActiveCompany();
  return useQuery({
    queryKey: keyForAgency('agency-clients', activeAgencyId),
    queryFn: async () => {
      if (!activeAgencyId) return [];
      const { data, error } = await supabase
        .from('agency_clients')
        .select('*')
        .eq('user_id', activeAgencyId)
        .order('event_date_ad', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as AgencyClient[];
    },
    enabled: !!activeAgencyId && !switching,
  });
}

export function useAddAgencyClient() {
  const qc = useQueryClient();
  const { activeAgencyId } = useActiveCompany();
  return useMutation({
    mutationFn: async (client: Omit<AgencyClient, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!activeAgencyId) throw new Error('No active company');
      return withActiveAgency(activeAgencyId, async () => {
        const { data, error } = await supabase
          .from('agency_clients')
          .insert({ ...client, user_id: activeAgencyId })
          .select()
          .single();
        if (error) throw error;
        return data;
      });
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export type AgencyClientPatch = Partial<Omit<AgencyClient, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export function useUpdateAgencyClient() {
  const qc = useQueryClient();
  const { activeAgencyId } = useActiveCompany();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: AgencyClientPatch }) => {
      if (!activeAgencyId) throw new Error('No active company');
      return withActiveAgency(activeAgencyId, async () => {
        const { data, error } = await supabase
          .from('agency_clients')
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      });
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteAgencyClient() {
  const qc = useQueryClient();
  const { activeAgencyId } = useActiveCompany();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!activeAgencyId) throw new Error('No active company');
      return withActiveAgency(activeAgencyId, async () => {
        // Get sub-event ids for crew_assignments cleanup
        const { data: subEvents } = await supabase
          .from('agency_client_events')
          .select('id')
          .eq('client_id', id);
        const subEventIds = (subEvents ?? []).map((e: { id: string }) => e.id);

        // Cleanup dependents (RLS scoped via active agency)
        if (subEventIds.length > 0) {
          await supabase.from('crew_assignments').delete().in('event_id', subEventIds);
        }
        await supabase.from('agency_client_events').delete().eq('client_id', id);
        await supabase.from('agency_client_payments').delete().eq('client_id', id);

        const { error } = await supabase.from('agency_clients').delete().eq('id', id);
        if (error) throw error;
      });
    },
    onSuccess: () => invalidateAll(qc),
  });
}
