import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/contexts/ActiveCompanyContext';
import { withActiveAgency } from '@/lib/withActiveAgency';
import { keyForAgency } from '@/lib/queryKeys';

export interface StaffInvitation {
  id: string;
  agency_user_id: string;
  invited_user_id: string;
  status: string;
  created_at: string;
  profile?: {
    full_name: string;
    profile_photo_url: string | null;
    main_job: string | null;
  };
}

export function useSearchFreelancers(query: string) {
  return useQuery({
    queryKey: ['search-freelancers', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const { data, error } = await supabase
        .from('freelancer_profiles')
        .select('user_id, full_name, profile_photo_url, main_job')
        .ilike('full_name', `%${query}%`)
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: query.length >= 2,
  });
}

export function useAgencyStaffInvitations() {
  const { activeAgencyId, switching } = useActiveCompany();
  return useQuery({
    queryKey: keyForAgency('agency-staff-invitations', activeAgencyId),
    queryFn: async () => {
      if (!activeAgencyId) return [];
      const { data, error } = await (supabase
        .from('agency_staff_invitations')
        .select('*')
        .eq('agency_user_id', activeAgencyId) as any)
        .eq('type', 'staff');
      if (error) throw error;

      const userIds = (data || []).map((d: any) => d.invited_user_id);
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('freelancer_profiles')
        .select('user_id, full_name, profile_photo_url, main_job')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      return (data as any[]).map((inv: any) => ({
        ...inv,
        profile: profileMap.get(inv.invited_user_id) || null,
      })) as StaffInvitation[];
    },
    enabled: !!activeAgencyId && !switching,
  });
}

export function useMyStaffInvitations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-staff-invitations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('agency_staff_invitations')
        .select('*')
        .eq('invited_user_id', user.id)
        .eq('status', 'pending');
      if (error) throw error;

      const agencyIds = data.map((d: any) => d.agency_user_id);
      if (agencyIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('freelancer_profiles')
        .select('user_id, full_name, profile_photo_url, business_name')
        .in('user_id', agencyIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      return data.map((inv: any) => ({
        ...inv,
        agencyProfile: profileMap.get(inv.agency_user_id) || null,
      }));
    },
    enabled: !!user,
  });
}

export function useSendStaffInvitation() {
  const qc = useQueryClient();
  const { activeAgencyId } = useActiveCompany();
  return useMutation({
    mutationFn: async (invitedUserId: string) => {
      if (!activeAgencyId) throw new Error('No active company');
      return withActiveAgency(activeAgencyId, async () => {
        const { error } = await supabase
          .from('agency_staff_invitations')
          .insert({ agency_user_id: activeAgencyId, invited_user_id: invitedUserId, type: 'staff' } as any);
        if (error) throw error;
      });
    },
    onMutate: async (invitedUserId: string) => {
      const key = keyForAgency('agency-staff-invitations', activeAgencyId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old: any[] = []) => [
        ...old,
        { id: `temp-${Date.now()}`, agency_user_id: activeAgencyId, invited_user_id: invitedUserId, status: 'pending', type: 'staff', created_at: new Date().toISOString(), profile: null },
      ]);
      return { prev, key };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(context.key, context.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['agency-staff-invitations'] });
    },
  });
}

export function useAgencyFreelancerInvitations() {
  const { activeAgencyId, switching } = useActiveCompany();
  return useQuery({
    queryKey: keyForAgency('agency-freelancer-invitations', activeAgencyId),
    queryFn: async () => {
      if (!activeAgencyId) return [];
      const { data, error } = await (supabase
        .from('agency_staff_invitations')
        .select('*')
        .eq('agency_user_id', activeAgencyId) as any)
        .eq('type', 'freelancer');
      if (error) throw error;

      const userIds = (data || []).map((d: any) => d.invited_user_id);
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('freelancer_profiles')
        .select('user_id, full_name, profile_photo_url, main_job')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      return (data || []).map((inv: any) => ({
        ...inv,
        profile: profileMap.get(inv.invited_user_id) || null,
      })) as StaffInvitation[];
    },
    enabled: !!activeAgencyId && !switching,
  });
}

export function useSendFreelancerInvitation() {
  const qc = useQueryClient();
  const { activeAgencyId } = useActiveCompany();
  return useMutation({
    mutationFn: async (invitedUserId: string) => {
      if (!activeAgencyId) throw new Error('No active company');
      return withActiveAgency(activeAgencyId, async () => {
        const { error } = await supabase
          .from('agency_staff_invitations')
          .insert({ agency_user_id: activeAgencyId, invited_user_id: invitedUserId, type: 'freelancer' } as any);
        if (error) throw error;
      });
    },
    onMutate: async (invitedUserId: string) => {
      const key = keyForAgency('agency-freelancer-invitations', activeAgencyId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old: any[] = []) => [
        ...old,
        { id: `temp-${Date.now()}`, agency_user_id: activeAgencyId, invited_user_id: invitedUserId, status: 'pending', type: 'freelancer', created_at: new Date().toISOString(), profile: null },
      ]);
      return { prev, key };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(context.key, context.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['agency-freelancer-invitations'] });
    },
  });
}

export function useRespondStaffInvitation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'accepted' | 'rejected' }) => {
      const { error } = await supabase
        .from('agency_staff_invitations')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['my-staff-invitations', user?.id] });
      const prev = qc.getQueryData(['my-staff-invitations', user?.id]);
      qc.setQueryData(['my-staff-invitations', user?.id], (old: any[] = []) =>
        old.filter((inv: any) => inv.id !== id)
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(['my-staff-invitations', user?.id], context.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['agency-staff-invitations'] });
      qc.invalidateQueries({ queryKey: ['my-staff-invitations'] });
      qc.invalidateQueries({ queryKey: ['agency-freelancer-invitations'] });
      qc.invalidateQueries({ queryKey: ['accepted-staff-profiles'] });
      qc.invalidateQueries({ queryKey: ['accepted-staff-names'] });
    },
  });
}

export function useRemoveStaffInvitation() {
  const qc = useQueryClient();
  const { activeAgencyId } = useActiveCompany();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!activeAgencyId) throw new Error('No active company');
      return withActiveAgency(activeAgencyId, async () => {
        const { error } = await supabase
          .from('agency_staff_invitations')
          .delete()
          .eq('id', id);
        if (error) throw error;
      });
    },
    onMutate: async (id: string) => {
      const staffKey = keyForAgency('agency-staff-invitations', activeAgencyId);
      const freelancerKey = keyForAgency('agency-freelancer-invitations', activeAgencyId);
      await qc.cancelQueries({ queryKey: staffKey });
      await qc.cancelQueries({ queryKey: freelancerKey });
      const prevStaff = qc.getQueryData(staffKey);
      const prevFreelancer = qc.getQueryData(freelancerKey);
      qc.setQueryData(staffKey, (old: any[] = []) => old.filter((inv: any) => inv.id !== id));
      qc.setQueryData(freelancerKey, (old: any[] = []) => old.filter((inv: any) => inv.id !== id));
      return { prevStaff, prevFreelancer, staffKey, freelancerKey };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevStaff) qc.setQueryData(context.staffKey, context.prevStaff);
      if (context?.prevFreelancer) qc.setQueryData(context.freelancerKey, context.prevFreelancer);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['agency-staff-invitations'] });
      qc.invalidateQueries({ queryKey: ['agency-freelancer-invitations'] });
      qc.invalidateQueries({ queryKey: ['accepted-staff-profiles'] });
    },
  });
}

export function useAcceptedStaffNames() {
  const { activeAgencyId, switching } = useActiveCompany();
  return useQuery({
    queryKey: keyForAgency('accepted-staff-names', activeAgencyId),
    queryFn: async () => {
      if (!activeAgencyId) return [];
      const { data, error } = await (supabase
        .from('agency_staff_invitations')
        .select('invited_user_id')
        .eq('agency_user_id', activeAgencyId)
        .eq('status', 'accepted') as any)
        .eq('type', 'staff');
      if (error) throw error;
      if (!data.length) return [];

      const ids = data.map((d: any) => d.invited_user_id);
      const { data: profiles } = await supabase
        .from('freelancer_profiles')
        .select('full_name')
        .in('user_id', ids);

      return (profiles || []).map(p => p.full_name);
    },
    enabled: !!activeAgencyId && !switching,
  });
}

export interface AcceptedStaffProfile {
  invitation_id: string;
  user_id: string;
  full_name: string;
  main_job: string | null;
  photographer: string | null;
  videographer: string | null;
  drone_operator: string | null;
  hybrid_shooter: string | null;
  photo_editor: string | null;
  video_editor: string | null;
  profile_photo_url: string | null;
  gadget: string;
}

export function useAcceptedStaffProfiles() {
  const { activeAgencyId, switching } = useActiveCompany();
  return useQuery({
    queryKey: keyForAgency('accepted-staff-profiles', activeAgencyId),
    queryFn: async () => {
      if (!activeAgencyId) return [];
      const { data, error } = await (supabase
        .from('agency_staff_invitations')
        .select('id, invited_user_id, gadget')
        .eq('agency_user_id', activeAgencyId)
        .eq('status', 'accepted') as any)
        .eq('type', 'freelancer');
      if (error) throw error;
      if (!data.length) return [];

      const ids = data.map((d: any) => d.invited_user_id);
      const { data: profiles } = await supabase
        .from('freelancer_profiles')
        .select('user_id, full_name, main_job, photographer, videographer, drone_operator, hybrid_shooter, photo_editor, video_editor, profile_photo_url')
        .in('user_id', ids);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      return data.map((inv: any) => {
        const p = profileMap.get(inv.invited_user_id);
        return {
          invitation_id: inv.id,
          user_id: inv.invited_user_id,
          full_name: p?.full_name || 'Unknown',
          main_job: p?.main_job || null,
          photographer: p?.photographer || 'NO',
          videographer: p?.videographer || 'NO',
          drone_operator: p?.drone_operator || 'NO',
          hybrid_shooter: p?.hybrid_shooter || 'NO',
          photo_editor: p?.photo_editor || 'NO',
          video_editor: p?.video_editor || 'NO',
          profile_photo_url: p?.profile_photo_url || null,
          gadget: inv.gadget || '',
        } as AcceptedStaffProfile;
      });
    },
    enabled: !!activeAgencyId && !switching,
  });
}

export function useUpdateStaffGadget() {
  const qc = useQueryClient();
  const { activeAgencyId } = useActiveCompany();
  return useMutation({
    mutationFn: async ({ id, gadget }: { id: string; gadget: string }) => {
      if (!activeAgencyId) throw new Error('No active company');
      return withActiveAgency(activeAgencyId, async () => {
        const { error } = await supabase
          .from('agency_staff_invitations')
          .update({ gadget } as any)
          .eq('id', id);
        if (error) throw error;
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accepted-staff-profiles'] });
    },
  });
}

export function useRealtimeStaffInvitations() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeAgencyId } = useActiveCompany();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`staff-inv-${user.id}-${activeAgencyId ?? 'none'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agency_staff_invitations', filter: `invited_user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ['my-staff-invitations'] });
        }
      );

    if (activeAgencyId) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agency_staff_invitations', filter: `agency_user_id=eq.${activeAgencyId}` },
        () => {
          qc.invalidateQueries({ queryKey: ['agency-staff-invitations'] });
          qc.invalidateQueries({ queryKey: ['agency-freelancer-invitations'] });
          qc.invalidateQueries({ queryKey: ['accepted-staff-profiles'] });
          qc.invalidateQueries({ queryKey: ['accepted-staff-names'] });
        }
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeAgencyId, qc]);
}
