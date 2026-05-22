import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FeedNotification {
  id: string;
  user_id: string;
  from_user_id: string;
  post_id: string;
  type: string;
  read: boolean;
  created_at: string;
  from_user_name: string;
  from_user_photo: string | null;
}

export function useFeedNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['feed-notifications'],
    enabled: !!user,
    queryFn: async (): Promise<FeedNotification[]> => {
      const { data, error } = await supabase
        .from('feed_notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!data?.length) return [];

      const userIds = [...new Set(data.map((n) => n.from_user_id))];
      const { data: profiles } = await supabase
        .from('freelancer_profiles')
        .select('user_id, full_name, profile_photo_url, account_type, business_name')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      return data.map((n) => {
        const profile = profileMap.get(n.from_user_id);
        const displayName = (profile?.account_type === 'agency' && profile?.business_name) ? profile.business_name : (profile?.full_name || 'Someone');
        return {
          ...n,
          from_user_name: displayName,
          from_user_photo: profile?.profile_photo_url || null,
        };
      });
    },
  });
}

export function useUnreadFeedNotificationCount() {
  const { data } = useFeedNotifications();
  return (data || []).filter((n) => !n.read).length;
}

export function useMarkFeedNotificationsRead() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from('feed_notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed-notifications'] }),
  });
}

export function useRealtimeFeedNotifications() {
  const qc = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`feed-notif-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feed_notifications', filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ['feed-notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);
}
