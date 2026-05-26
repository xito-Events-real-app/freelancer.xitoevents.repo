import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/contexts/ActiveCompanyContext';
import {
  loadVideoEditRows, loadPhotoEditRows,
  ensureAllVideoEditRows, ensureAllPhotoEditRows,
  ensureVideoEditRowsForClient, ensurePhotoEditRowsForClient,
} from '@/lib/edit-tracker-api';

export function useVideoEditTracker() {
  const { activeAgencyId, switching } = useActiveCompany();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['video-edit-tracker', activeAgencyId],
    queryFn: async () => {
      if (!activeAgencyId) return [];
      await ensureAllVideoEditRows(activeAgencyId);
      return loadVideoEditRows(activeAgencyId);
    },
    enabled: !!activeAgencyId && !switching,
    staleTime: 15_000,
  });

  // Realtime
  useEffect(() => {
    if (!activeAgencyId) return;
    const ch1 = supabase.channel(`vet-${activeAgencyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'video_edit_tracker' }, () => {
        qc.invalidateQueries({ queryKey: ['video-edit-tracker', activeAgencyId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_deliverables' }, async (payload: any) => {
        const cid = (payload.new as any)?.client_id || (payload.old as any)?.client_id;
        if (cid) await ensureVideoEditRowsForClient(cid).catch(() => {});
        qc.invalidateQueries({ queryKey: ['video-edit-tracker', activeAgencyId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch1); };
  }, [activeAgencyId, qc]);

  return q;
}

export function usePhotoEditTracker() {
  const { activeAgencyId, switching } = useActiveCompany();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['photo-edit-tracker', activeAgencyId],
    queryFn: async () => {
      if (!activeAgencyId) return [];
      await ensureAllPhotoEditRows(activeAgencyId);
      return loadPhotoEditRows(activeAgencyId);
    },
    enabled: !!activeAgencyId && !switching,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!activeAgencyId) return;
    const ch = supabase.channel(`pet-${activeAgencyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'photo_edit_tracker' }, () => {
        qc.invalidateQueries({ queryKey: ['photo-edit-tracker', activeAgencyId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_deliverables' }, async (payload: any) => {
        const cid = (payload.new as any)?.client_id || (payload.old as any)?.client_id;
        if (cid) await ensurePhotoEditRowsForClient(cid).catch(() => {});
        qc.invalidateQueries({ queryKey: ['photo-edit-tracker', activeAgencyId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crew_assignments' }, async (payload: any) => {
        const evId = (payload.new as any)?.event_id || (payload.old as any)?.event_id;
        if (!evId) return;
        const { data: ev } = await supabase.from('agency_client_events').select('client_id').eq('id', evId).maybeSingle();
        if (ev?.client_id) await ensurePhotoEditRowsForClient(ev.client_id).catch(() => {});
        qc.invalidateQueries({ queryKey: ['photo-edit-tracker', activeAgencyId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeAgencyId, qc]);

  return q;
}
