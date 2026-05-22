import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

export type FollowStatus = 'none' | 'pending' | 'accepted' | 'rejected';

export function useFollowStatus(targetUserId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['follow-status', user?.id, targetUserId],
    queryFn: async () => {
      if (!user || !targetUserId || user.id === targetUserId) return { iFollow: 'none' as FollowStatus, theyFollow: 'none' as FollowStatus };
      const [{ data: outgoing }, { data: incoming }] = await Promise.all([
        supabase.from('follows').select('status').eq('follower_id', user.id).eq('following_id', targetUserId).maybeSingle(),
        supabase.from('follows').select('status').eq('follower_id', targetUserId).eq('following_id', user.id).maybeSingle(),
      ]);
      return {
        iFollow: (outgoing?.status ?? 'none') as FollowStatus,
        theyFollow: (incoming?.status ?? 'none') as FollowStatus,
      };
    },
    enabled: !!user && !!targetUserId && user.id !== targetUserId,
  });
}

export function useAreMutualFollowers(targetUserId: string | undefined) {
  const { data } = useFollowStatus(targetUserId);
  return data?.iFollow === 'accepted' && data?.theyFollow === 'accepted';
}

export function useSendFollowRequest() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      // The table has UNIQUE(follower_id, following_id), so any leftover row
      // (rejected/pending/accepted) makes a fresh insert fail. The follower
      // is allowed to DELETE their own row, so we clear-then-insert to make
      // "Follow" idempotent and survive prior rejections.
      const { data: existing } = await supabase
        .from('follows')
        .select('id, status')
        .eq('follower_id', user!.id)
        .eq('following_id', targetUserId)
        .maybeSingle();

      if (existing && (existing.status === 'pending' || existing.status === 'accepted')) {
        return; // already following / requested — no-op
      }

      if (existing) {
        const { error: delErr } = await supabase
          .from('follows')
          .delete()
          .eq('id', existing.id);
        if (delErr) throw delErr;
      }

      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user!.id, following_id: targetUserId });
      if (error) throw error;
    },
    onSuccess: (_, targetUserId) => {
      qc.invalidateQueries({ queryKey: ['follow-status', user?.id, targetUserId] });
      qc.invalidateQueries({ queryKey: ['follow-counts'] });
      toast.success('Follow request sent');
    },
    onError: () => toast.error('Failed to send follow request'),
  });
}

export function useCancelFollow() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const { error } = await supabase.from('follows').delete().eq('follower_id', user!.id).eq('following_id', targetUserId);
      if (error) throw error;
    },
    onSuccess: (_, targetUserId) => {
      qc.invalidateQueries({ queryKey: ['follow-status', user?.id, targetUserId] });
      qc.invalidateQueries({ queryKey: ['follow-counts'] });
      toast.success('Unfollowed');
    },
    onError: () => toast.error('Failed to unfollow'),
  });
}

export function useAcceptFollow() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (followerId: string) => {
      const { error } = await supabase.from('follows').update({ status: 'accepted' }).eq('follower_id', followerId).eq('following_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['follow-requests'] });
      qc.invalidateQueries({ queryKey: ['follow-status'] });
      qc.invalidateQueries({ queryKey: ['follow-counts'] });
      qc.invalidateQueries({ queryKey: ['pending-follow-count'] });
      toast.success('Follow request accepted');
    },
    onError: () => toast.error('Failed to accept'),
  });
}

export function useRejectFollow() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (followerId: string) => {
      const { error } = await supabase.from('follows').update({ status: 'rejected' }).eq('follower_id', followerId).eq('following_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['follow-requests'] });
      qc.invalidateQueries({ queryKey: ['follow-counts'] });
      qc.invalidateQueries({ queryKey: ['pending-follow-count'] });
      toast.success('Follow request rejected');
    },
    onError: () => toast.error('Failed to reject'),
  });
}

export function usePendingFollowRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['follow-requests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follows')
        .select('id, follower_id, created_at')
        .eq('following_id', user!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const followerIds = data.map(f => f.follower_id);
      const { data: profiles } = await supabase
        .from('freelancer_profiles')
        .select('id, user_id, full_name, profile_photo_url, account_type, business_name')
        .in('user_id', followerIds);

      const profileMap = new Map((profiles ?? []).map(p => [p.user_id, {
        ...p,
        display_name: (p.account_type === 'agency' && p.business_name) ? p.business_name : p.full_name,
      }]));
      return data.map(f => ({
        ...f,
        profile: profileMap.get(f.follower_id) ?? null,
      }));
    },
    enabled: !!user,
  });
}

export function usePendingFollowCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['pending-follow-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', user!.id)
        .eq('status', 'pending');
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
  });
}

export function useFollowCounts(userId: string | undefined) {
  return useQuery({
    queryKey: ['follow-counts', userId],
    queryFn: async () => {
      const [{ count: followers }, { count: following }] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId!).eq('status', 'accepted'),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId!).eq('status', 'accepted'),
      ]);
      return { followers: followers ?? 0, following: following ?? 0 };
    },
    enabled: !!userId,
  });
}

export function useRealtimeFollows() {
  const { user } = useAuth();
  const qc = useQueryClient();
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('follows-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, (payload: any) => {
        const row = payload.new || payload.old;
        // Only invalidate if this change involves the current user
        if (row?.follower_id === user.id || row?.following_id === user.id) {
          qc.invalidateQueries({ queryKey: ['follow-requests'] });
          qc.invalidateQueries({ queryKey: ['follow-status'] });
          qc.invalidateQueries({ queryKey: ['follow-counts'] });
          qc.invalidateQueries({ queryKey: ['pending-follow-count'] });
          qc.invalidateQueries({ queryKey: ['feed-posts'] });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);
}
