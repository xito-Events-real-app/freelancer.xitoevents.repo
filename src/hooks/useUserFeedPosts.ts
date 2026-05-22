import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { FeedPost } from '@/hooks/useFeed';

export function useUserFeedPosts(userId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-feed-posts', userId],
    queryFn: async (): Promise<FeedPost[]> => {
      if (!userId) return [];

      const { data: posts, error } = await supabase
        .from('feed_posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!posts?.length) return [];

      const { data: profiles } = await supabase
        .from('freelancer_profiles')
        .select('id, user_id, full_name, profile_photo_url, main_job, account_type, business_name')
        .eq('user_id', userId);

      const profile = profiles?.[0];

      let myLikes = new Set<string>();
      if (user) {
        const { data: likes } = await supabase
          .from('feed_likes')
          .select('post_id')
          .eq('user_id', user.id);
        myLikes = new Set((likes || []).map((l) => l.post_id));
      }

      return posts.map((post) => ({
        ...post,
        author_name: (profile?.account_type === 'agency' && profile?.business_name) ? profile.business_name : (profile?.full_name || 'Unknown'),
        author_photo: profile?.profile_photo_url || null,
        author_profile_id: profile?.id || null,
        author_main_job: profile?.main_job || null,
        author_account_type: profile?.account_type || 'solo_creative',
        liked_by_me: myLikes.has(post.id),
        liked_by_names: [] as string[],
        first_comment: null,
        iFollow: 'none' as const,
      }));
    },
    enabled: !!userId,
  });
}
