import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

// Types
export interface MarketPost {
  id: string;
  user_id: string;
  event_name: string;
  freelancer_type: string | null;
  default_city: string | null;
  default_area: string | null;
  default_min_camera: string | null;
  total_price: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketPostDate {
  id: string;
  post_id: string;
  event_date: string;
  timings: string | null;
  city: string | null;
  area: string | null;
  min_camera: string | null;
  freelancer_type: string | null;
  created_at: string;
}

export interface MarketApplication {
  id: string;
  post_id: string;
  user_id: string;
  message: string | null;
  created_at: string;
}

export interface MarketComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface MarketNotification {
  id: string;
  user_id: string;
  post_id: string | null;
  type: string;
  from_user_id: string | null;
  read: boolean;
  created_at: string;
}

export interface MarketAssignment {
  id: string;
  application_id: string;
  post_id: string;
  assigned_user_id: string;
  assigned_by: string;
  status: string;
  created_at: string;
}

// Fetch all posts with their dates
export function useMarketPosts() {
  return useQuery({
    queryKey: ['market-posts'],
    staleTime: 120_000,
    queryFn: async () => {
      const { data: posts, error } = await supabase
        .from('market_posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const postIds = (posts || []).map(p => p.id);
      if (postIds.length === 0) return [];

      const { data: dates, error: dErr } = await supabase
        .from('market_post_dates')
        .select('*')
        .in('post_id', postIds)
        .order('event_date', { ascending: true });
      if (dErr) throw dErr;

      const userIds = [...new Set((posts || []).map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('freelancer_profiles')
        .select('user_id, full_name, id, account_type, business_name')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, {
        ...p,
        display_name: (p.account_type === 'agency' && p.business_name) ? p.business_name : p.full_name,
      }]));
      const dateMap = new Map<string, MarketPostDate[]>();
      (dates || []).forEach(d => {
        if (!dateMap.has(d.post_id)) dateMap.set(d.post_id, []);
        dateMap.get(d.post_id)!.push(d as MarketPostDate);
      });

      return (posts || []).map(p => ({
        ...p,
        dates: dateMap.get(p.id) || [],
        poster_name: profileMap.get(p.user_id)?.display_name || 'Unknown',
        poster_profile_id: profileMap.get(p.user_id)?.id || null,
      })) as (MarketPost & { dates: MarketPostDate[]; poster_name: string; poster_profile_id: string | null })[];
    },
  });
}

// Fetch single post with dates, applications, comments, assignments
export function useMarketPost(postId: string | undefined) {
  return useQuery({
    queryKey: ['market-post', postId],
    queryFn: async () => {
      if (!postId) return null;

      const [postRes, datesRes, appsRes, commentsRes, assignRes] = await Promise.all([
        supabase.from('market_posts').select('*').eq('id', postId).single(),
        supabase.from('market_post_dates').select('*').eq('post_id', postId).order('event_date', { ascending: true }),
        supabase.from('market_applications').select('*').eq('post_id', postId).order('created_at', { ascending: false }),
        supabase.from('market_comments').select('*').eq('post_id', postId).order('created_at', { ascending: true }),
        supabase.from('market_assignments').select('*').eq('post_id', postId),
      ]);

      if (postRes.error) throw postRes.error;

      // Get profile info for poster, applicants, commenters, assigned users
      const allUserIds = new Set<string>();
      allUserIds.add(postRes.data.user_id);
      (appsRes.data || []).forEach(a => allUserIds.add(a.user_id));
      (commentsRes.data || []).forEach(c => allUserIds.add(c.user_id));
      (assignRes.data || []).forEach(a => { allUserIds.add(a.assigned_user_id); allUserIds.add(a.assigned_by); });

      const { data: profiles } = await supabase
        .from('freelancer_profiles')
        .select('user_id, full_name, id, profile_photo_url, whatsapp_number, contact_number, account_type, business_name')
        .in('user_id', [...allUserIds]);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, {
        ...p,
        display_name: (p.account_type === 'agency' && p.business_name) ? p.business_name : p.full_name,
      }]));

      return {
        post: postRes.data as MarketPost,
        dates: (datesRes.data || []) as MarketPostDate[],
        applications: (appsRes.data || []).map(a => ({
          ...a,
          applicant_name: profileMap.get(a.user_id)?.display_name || 'Unknown',
          applicant_profile_id: profileMap.get(a.user_id)?.id || null,
        })),
        comments: (commentsRes.data || []).map(c => ({
          ...c,
          commenter_name: profileMap.get(c.user_id)?.display_name || 'Unknown',
          commenter_profile_id: profileMap.get(c.user_id)?.id || null,
          commenter_photo: profileMap.get(c.user_id)?.profile_photo_url || null,
        })),
        assignments: (assignRes.data || []).map(a => ({
          ...a,
          assigned_user_name: profileMap.get(a.assigned_user_id)?.display_name || 'Unknown',
          assigned_user_profile_id: profileMap.get(a.assigned_user_id)?.id || null,
        })) as (MarketAssignment & { assigned_user_name: string; assigned_user_profile_id: string | null })[],
        poster_name: profileMap.get(postRes.data.user_id)?.display_name || 'Unknown',
        poster_profile_id: profileMap.get(postRes.data.user_id)?.id || null,
        poster_whatsapp: profileMap.get(postRes.data.user_id)?.whatsapp_number || '',
        poster_contact: profileMap.get(postRes.data.user_id)?.contact_number || '',
      };
    },
    enabled: !!postId,
  });
}

// Create post with dates
export function useCreateMarketPost() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      event_name: string;
      freelancer_type: string;
      default_city: string;
      default_area: string;
      default_min_camera: string;
      total_price: string;
      dates: { event_date: string; timings: string; city: string; area: string; min_camera: string; freelancer_type: string }[];
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: post, error } = await supabase
        .from('market_posts')
        .insert({
          user_id: user.id,
          event_name: input.event_name,
          freelancer_type: input.freelancer_type,
          default_city: input.default_city,
          default_area: input.default_area,
          default_min_camera: input.default_min_camera,
          total_price: input.total_price,
        })
        .select()
        .single();
      if (error) throw error;

      if (input.dates.length > 0) {
        const { error: dErr } = await supabase
          .from('market_post_dates')
          .insert(input.dates.map(d => ({ ...d, post_id: post.id })));
        if (dErr) throw dErr;
      }

      return post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-posts'] });
    },
  });
}

// Update post
export function useUpdateMarketPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      event_name: string;
      freelancer_type: string;
      default_city: string;
      default_area: string;
      default_min_camera: string;
      total_price: string;
      dates: { event_date: string; timings: string; city: string; area: string; min_camera: string; freelancer_type: string }[];
    }) => {
      const { error } = await supabase
        .from('market_posts')
        .update({
          event_name: input.event_name,
          freelancer_type: input.freelancer_type,
          default_city: input.default_city,
          default_area: input.default_area,
          default_min_camera: input.default_min_camera,
          total_price: input.total_price,
        })
        .eq('id', input.id);
      if (error) throw error;

      await supabase.from('market_post_dates').delete().eq('post_id', input.id);
      if (input.dates.length > 0) {
        const { error: dErr } = await supabase
          .from('market_post_dates')
          .insert(input.dates.map(d => ({ ...d, post_id: input.id })));
        if (dErr) throw dErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-posts'] });
      queryClient.invalidateQueries({ queryKey: ['market-post'] });
    },
  });
}

// Delete post
export function useDeleteMarketPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from('market_posts').delete().eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-posts'] });
    },
  });
}

// Apply to post
export function useApplyToPost() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ postId, message, postOwnerId }: { postId: string; message: string; postOwnerId: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('market_applications')
        .insert({ post_id: postId, user_id: user.id, message });
      if (error) throw error;

      await supabase.from('market_notifications').insert({
        user_id: postOwnerId,
        post_id: postId,
        type: 'application',
        from_user_id: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-post'] });
    },
  });
}

// Add comment
export function useAddMarketComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ postId, content, postOwnerId }: { postId: string; content: string; postOwnerId: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('market_comments')
        .insert({ post_id: postId, user_id: user.id, content });
      if (error) throw error;

      if (postOwnerId !== user.id) {
        await supabase.from('market_notifications').insert({
          user_id: postOwnerId,
          post_id: postId,
          type: 'comment',
          from_user_id: user.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-post'] });
    },
  });
}

// Assign freelancer to a post
export function useAssignFreelancer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ applicationId, postId, freelancerUserId }: {
      applicationId: string;
      postId: string;
      freelancerUserId: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('market_assignments')
        .insert({
          application_id: applicationId,
          post_id: postId,
          assigned_user_id: freelancerUserId,
          assigned_by: user.id,
        });
      if (error) throw error;

      // Notify the freelancer
      await supabase.from('market_notifications').insert({
        user_id: freelancerUserId,
        post_id: postId,
        type: 'assignment',
        from_user_id: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-post'] });
    },
  });
}

// Respond to assignment (accept/decline)
export function useRespondToAssignment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ assignmentId, status, postId, posterId, postEventName, posterName, posterWhatsapp, posterContact, postDates }: {
      assignmentId: string;
      status: 'accepted' | 'declined';
      postId: string;
      posterId: string;
      postEventName: string;
      posterName: string;
      posterWhatsapp: string;
      posterContact: string;
      postDates: { event_date: string }[];
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('market_assignments')
        .update({ status })
        .eq('id', assignmentId);
      if (error) throw error;

      if (status === 'accepted') {
        // Create bookings for each date
        const bookingRows = postDates.map(d => ({
          user_id: user.id,
          booking_date: d.event_date,
          event_name: `${postEventName} | by ${posterName} | WA: ${posterWhatsapp} | Ph: ${posterContact}`,
        }));
        await supabase.from('bookings').insert(bookingRows);

        // Notify poster
        await supabase.from('market_notifications').insert({
          user_id: posterId,
          post_id: postId,
          type: 'assignment_accepted',
          from_user_id: user.id,
        });
      }

      // Notify poster about decline too
      if (status === 'declined') {
        await supabase.from('market_notifications').insert({
          user_id: posterId,
          post_id: postId,
          type: 'assignment_declined',
          from_user_id: user.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-post'] });
      queryClient.invalidateQueries({ queryKey: ['market-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

// ---- Views & Likes ----

// Fetch view counts + like counts + comment counts for all posts (batch)
export function useMarketPostStats(postIds: string[]) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['market-post-stats', postIds.join(','), user?.id],
    queryFn: async () => {
      if (postIds.length === 0) return {};

      const [viewsRes, likesRes, commentsRes, myLikesRes] = await Promise.all([
        supabase.from('market_post_views').select('post_id').in('post_id', postIds),
        supabase.from('market_post_likes').select('post_id').in('post_id', postIds),
        supabase.from('market_comments').select('post_id').in('post_id', postIds),
        user
          ? supabase.from('market_post_likes').select('post_id').in('post_id', postIds).eq('user_id', user.id)
          : Promise.resolve({ data: [] }),
      ]);

      const stats: Record<string, { views: number; likes: number; comments: number; liked: boolean }> = {};
      postIds.forEach(id => { stats[id] = { views: 0, likes: 0, comments: 0, liked: false }; });

      (viewsRes.data || []).forEach(v => { if (stats[v.post_id]) stats[v.post_id].views++; });
      (likesRes.data || []).forEach(l => { if (stats[l.post_id]) stats[l.post_id].likes++; });
      (commentsRes.data || []).forEach(c => { if (stats[c.post_id]) stats[c.post_id].comments++; });
      const myLikes = new Set((myLikesRes.data || []).map(l => l.post_id));
      postIds.forEach(id => { if (myLikes.has(id)) stats[id].liked = true; });

      return stats;
    },
    enabled: postIds.length > 0,
  });
}

// Record a view when opening detail
export function useRecordView() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!user) return;
      await supabase.from('market_post_views').upsert(
        { post_id: postId, user_id: user.id },
        { onConflict: 'post_id,user_id' }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-post-stats'] });
    },
  });
}

// Toggle like on a market post
export function useToggleMarketLike() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      if (liked) {
        await supabase.from('market_post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      } else {
        await supabase.from('market_post_likes').insert({ post_id: postId, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-post-stats'] });
    },
  });
}

// Notifications
export function useMarketNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['market-notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('market_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;

      const fromIds = [...new Set((data || []).filter(n => n.from_user_id).map(n => n.from_user_id!))];
      const { data: profiles } = fromIds.length > 0
        ? await supabase.from('freelancer_profiles').select('user_id, full_name, account_type, business_name').in('user_id', fromIds)
        : { data: [] };

      const nameMap = new Map((profiles || []).map(p => [p.user_id, (p.account_type === 'agency' && p.business_name) ? p.business_name : p.full_name]));

      return (data || []).map(n => ({
        ...n,
        from_name: n.from_user_id ? nameMap.get(n.from_user_id) || 'Someone' : 'Someone',
      })) as (MarketNotification & { from_name: string })[];
    },
    enabled: !!user,
  });
}

export function useSubscribeToMarketNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`market-notifications-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'market_notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['market-notifications', user.id] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
}

export function useUnreadNotificationCount() {
  const { data: notifications } = useMarketNotifications();
  return (notifications || []).filter(n => !n.read).length;
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from('market_notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-notifications'] });
    },
  });
}
