import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/contexts/ActiveCompanyContext';
import { keyForAgency } from '@/lib/queryKeys';

export interface AgencyEventWithClient {
  id: string;
  client_id: string;
  event_date_bs: string | null;
  event_date_ad: string | null;
  event_name: string | null;
  client_name: string;
  contact_number: string | null;
  whatsapp_number: string | null;
  event_city: string | null;
  required_crew: string | null;
}

export function useAllAgencyEvents() {
  const { activeAgencyId, switching } = useActiveCompany();
  return useQuery({
    queryKey: keyForAgency('all-agency-events', activeAgencyId),
    queryFn: async () => {
      if (!activeAgencyId) return [];

      const { data: events, error: eErr } = await supabase
        .from('agency_client_events')
        .select('*')
        .eq('user_id', activeAgencyId)
        .order('event_date_ad', { ascending: true });
      if (eErr) throw eErr;

      if (!events || events.length === 0) return [];

      const clientIds = [...new Set(events.map(e => e.client_id))];

      const { data: clients, error: cErr } = await supabase
        .from('agency_clients')
        .select('id, client_name, contact_number, whatsapp_number, event_city')
        .in('id', clientIds);
      if (cErr) throw cErr;

      const clientMap = new Map((clients || []).map(c => [c.id, c]));

      return events.map(e => {
        const client = clientMap.get(e.client_id);
        return {
          id: e.id,
          client_id: e.client_id,
          event_date_bs: e.event_date_bs,
          event_date_ad: e.event_date_ad,
          event_name: e.event_name,
          client_name: client?.client_name || 'Unknown',
          contact_number: client?.contact_number || null,
          whatsapp_number: client?.whatsapp_number || null,
          event_city: client?.event_city || null,
          required_crew: (e as any).required_crew || null,
        } as AgencyEventWithClient;
      });
    },
    enabled: !!activeAgencyId && !switching,
  });
}
