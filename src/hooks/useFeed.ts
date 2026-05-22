import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { compressImage } from '@/lib/imageCompressor';
import { toast } from 'sonner';

export const FEED_PAGE_SIZE = 15;

export type FollowStatus = 'none' | 'pending' | 'accepted' | 'rejected';

export interface FeedPost {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  image_path: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author_name: string;
  author_photo: string | null;
  author_profile_id: string | null;
  author_main_job: string | null;
  author_account_type: string;
  liked_by_me: boolean;
  liked_by_names: string[];
  first_comment: FeedComment | null;
  iFollow: FollowStatus;
}

export interface FeedComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  likes_count: number;
  author_name: string;
  author_photo: string | null;
  author_profile_id: string | null;
  liked_by_me: boolean;
}

export function useFeedPosts() {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ['feed-posts', 'infinite-v1'],
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    initialPageParam: 0,
    getNextPageParam: (lastPage: FeedPost[], allPages) => {
      if (!lastPage || lastPage.length < FEED_PAGE_SIZE) return undefined;
      return allPages.length;
    },
    queryFn: async ({ pageParam = 0 }): Promise<FeedPost[]> => {
      const from = (pageParam as number) * FEED_PAGE_SIZE;
      const to = from + FEED_PAGE_SIZE - 1;

      const { data: posts, error } = await supabase
        .from('feed_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      if (!posts?.length) return [];

      const postIds = posts.map((p) => p.id);
      const userIds = [...new Set(posts.map((p) => p.user_id))];

      // Cap subqueries: only enough rows to render previews (latest comment + first 3 likers)
      const LIKES_CAP = posts.length * 5; // covers first 3 likers per post comfortably
      const COMMENTS_CAP = posts.length * 3; // covers first comment per post comfortably

      const [
        { data: profiles },
        myLikesResult,
        { data: allLikes },
        { data: latestComments },
        followStatusResult,
      ] = await Promise.all([
        supabase
          .from('freelancer_profiles')
          .select('id, user_id, full_name, profile_photo_url, main_job, account_type, business_name')
          .in('user_id', userIds),
        user
          ? supabase
              .from('feed_likes')
              .select('post_id')
              .eq('user_id', user.id)
              .in('post_id', postIds)
          : Promise.resolve({ data: [] as { post_id: string }[] }),
        supabase
          .from('feed_likes')
          .select('post_id, user_id')
          .in('post_id', postIds)
          .order('created_at', { ascending: false })
          .limit(LIKES_CAP),
        supabase
          .from('feed_comments')
          .select('*')
          .in('post_id', postIds)
          .order('created_at', { ascending: false })
          .limit(COMMENTS_CAP),
        user
          ? supabase
              .from('follows')
              .select('following_id, status')
              .eq('follower_id', user.id)
              .in('following_id', userIds)
          : Promise.resolve({ data: [] as { following_id: string; status: string }[] }),
      ]);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      const myLikes = new Set(
        ((myLikesResult as any)?.data || []).map((l: any) => l.post_id)
      );

      const followMap = new Map<string, FollowStatus>();
      for (const f of ((followStatusResult as any)?.data || []) as { following_id: string; status: string }[]) {
        followMap.set(f.following_id, f.status as FollowStatus);
      }

      // Group likes by post, take first 3 user_ids per post
      const likerUserIdsByPost = new Map<string, string[]>();
      const allLikerUserIds = new Set<string>();
      for (const like of allLikes || []) {
        const existing = likerUserIdsByPost.get(like.post_id) || [];
        if (existing.length < 3) {
          existing.push(like.user_id);
          likerUserIdsByPost.set(like.post_id, existing);
          allLikerUserIds.add(like.user_id);
        }
      }

      // Pick first (latest) comment per post
      const firstCommentByPost = new Map<string, any>();
      for (const c of latestComments || []) {
        if (!firstCommentByPost.has(c.post_id)) {
          firstCommentByPost.set(c.post_id, c);
        }
      }

      // Merge all extra user IDs (likers + commenters) into ONE profile fetch
      const commenterUserIds = [...firstCommentByPost.values()].map((c) => c.user_id);
      const extraIds = new Set<string>();
      for (const id of allLikerUserIds) if (!profileMap.has(id)) extraIds.add(id);
      for (const id of commenterUserIds) if (!profileMap.has(id)) extraIds.add(id);

      let extraProfileMap = new Map<string, any>();
      if (extraIds.size > 0) {
        const { data: extraProfiles } = await supabase
          .from('freelancer_profiles')
          .select('id, user_id, full_name, profile_photo_url, account_type, business_name')
          .in('user_id', [...extraIds]);
        extraProfileMap = new Map((extraProfiles || []).map((p) => [p.user_id, p]));
      }
      const lookupProfile = (uid: string) => profileMap.get(uid) || extraProfileMap.get(uid);
      const displayName = (p: any) =>
        (p?.account_type === 'agency' && p?.business_name) ? p.business_name : (p?.full_name || 'Unknown');

      return posts.map((post) => {
        const profile = profileMap.get(post.user_id);
        const likerIds = likerUserIdsByPost.get(post.id) || [];
        const likedByNames = likerIds.map((uid) => displayName(lookupProfile(uid)));

        const rawComment = firstCommentByPost.get(post.id);
        let firstComment: FeedComment | null = null;
        if (rawComment) {
          const cp = lookupProfile(rawComment.user_id);
          firstComment = {
            ...rawComment,
            author_name: displayName(cp),
            author_photo: cp?.profile_photo_url || null,
            author_profile_id: cp?.id || null,
            liked_by_me: false,
          };
        }

        return {
          ...post,
          author_name: displayName(profile),
          author_photo: profile?.profile_photo_url || null,
          author_profile_id: profile?.id || null,
          author_main_job: profile?.main_job || null,
          author_account_type: profile?.account_type || 'solo_creative',
          liked_by_me: myLikes.has(post.id),
          liked_by_names: likedByNames,
          first_comment: firstComment,
          iFollow: followMap.get(post.user_id) || 'none',
        };
      });
    },
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { upload } = useMediaUpload();

  return useMutation({
    mutationFn: async ({ content, imageFile }: { content: string; imageFile?: File }) => {
      if (!user) throw new Error('Must be logged in');

      let image_url: string | null = null;
      let image_path: string | null = null;

      if (imageFile) {
        const compressed = await compressImage(imageFile);
        const result = await upload(compressed, 'posts');
        if (!result) throw new Error('Image upload failed');
        image_url = result.url;
        image_path = result.path;
      }

      const { error } = await supabase.from('feed_posts').insert({
        user_id: user.id,
        content: content || null,
        image_url,
        image_path,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed-posts', 'infinite-v1'] });
      toast.success('Post created!');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create post'),
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  const { deleteFile } = useMediaUpload();

  return useMutation({
    mutationFn: async ({ postId, imagePath }: { postId: string; imagePath?: string | null }) => {
      if (imagePath) {
        await deleteFile(imagePath);
      }
      const { error } = await supabase.from('feed_posts').delete().eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed-posts', 'infinite-v1'] });
      toast.success('Post deleted');
    },
    onError: () => toast.error('Failed to delete post'),
  });
}

export function useToggleLike() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (!user) throw new Error('Must be logged in');

      if (liked) {
        const { error } = await supabase
          .from('feed_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('feed_likes')
          .insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
      }
    },
    onMutate: async ({ postId, liked }) => {
      await qc.cancelQueries({ queryKey: ['feed-posts', 'infinite-v1'] });
      const previous = qc.getQueryData(['feed-posts', 'infinite-v1']);
      qc.setQueryData(['feed-posts', 'infinite-v1'], (old: any) => {
        if (!old) return old;
        // Infinite query shape: { pages: FeedPost[][], pageParams: ... }
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((page: FeedPost[]) =>
              page.map((p) =>
                p.id === postId
                  ? { ...p, liked_by_me: !liked, likes_count: liked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1 }
                  : p
              )
            ),
          };
        }
        return old;
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['feed-posts', 'infinite-v1'], context.previous);
    },
  });
}

export function useFeedComments(postId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['feed-comments', postId],
    queryFn: async (): Promise<FeedComment[]> => {
      const { data: comments, error } = await supabase
        .from('feed_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!comments?.length) return [];

      const userIds = [...new Set(comments.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from('freelancer_profiles')
        .select('id, user_id, full_name, profile_photo_url, account_type, business_name')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      // Fetch user's comment likes
      let myCommentLikes = new Set<string>();
      if (user) {
        const commentIds = comments.map((c) => c.id);
        const { data: likes } = await supabase
          .from('feed_comment_likes')
          .select('comment_id')
          .eq('user_id', user.id)
          .in('comment_id', commentIds);
        myCommentLikes = new Set((likes || []).map((l) => l.comment_id));
      }

      return comments.map((c) => {
        const profile = profileMap.get(c.user_id);
        return {
          ...c,
          author_name: (profile?.account_type === 'agency' && profile?.business_name) ? profile.business_name : (profile?.full_name || 'Unknown'),
          author_photo: profile?.profile_photo_url || null,
          author_profile_id: profile?.id || null,
          liked_by_me: myCommentLikes.has(c.id),
        };
      });
    },
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ postId, content, parentId }: { postId: string; content: string; parentId?: string }) => {
      if (!user) throw new Error('Must be logged in');
      const { error } = await supabase
        .from('feed_comments')
        .insert({ post_id: postId, user_id: user.id, content, parent_id: parentId || null });
      if (error) throw error;
    },
    onMutate: async ({ postId, content, parentId }) => {
      await qc.cancelQueries({ queryKey: ['feed-comments', postId] });
      await qc.cancelQueries({ queryKey: ['feed-posts', 'infinite-v1'] });

      const prevComments = qc.getQueryData<FeedComment[]>(['feed-comments', postId]);
      const prevPosts = qc.getQueryData(['feed-posts', 'infinite-v1']);

      const tempComment: FeedComment = {
        id: `temp-${Date.now()}`,
        post_id: postId,
        user_id: user!.id,
        content,
        created_at: new Date().toISOString(),
        parent_id: parentId || null,
        likes_count: 0,
        author_name: 'You',
        author_photo: null,
        author_profile_id: null,
        liked_by_me: false,
      };
      qc.setQueryData<FeedComment[]>(['feed-comments', postId], (old) => [...(old || []), tempComment]);
      qc.setQueryData(['feed-posts', 'infinite-v1'], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: FeedPost[]) =>
            page.map((p) => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p)
          ),
        };
      });

      return { prevComments, prevPosts, postId };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevComments) qc.setQueryData(['feed-comments', context.postId], context.prevComments);
      if (context?.prevPosts) qc.setQueryData(['feed-posts', 'infinite-v1'], context.prevPosts);
      toast.error('Failed to add comment');
    },
    onSettled: (_, __, vars) => {
      qc.invalidateQueries({ queryKey: ['feed-comments', vars.postId] });
      qc.invalidateQueries({ queryKey: ['feed-posts', 'infinite-v1'] });
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, postId }: { commentId: string; postId: string }) => {
      const { error } = await supabase.from('feed_comments').delete().eq('id', commentId);
      if (error) throw error;
      return postId;
    },
    onSuccess: (postId) => {
      qc.invalidateQueries({ queryKey: ['feed-comments', postId] });
      qc.invalidateQueries({ queryKey: ['feed-posts', 'infinite-v1'] });
      toast.success('Comment deleted');
    },
    onError: () => toast.error('Failed to delete comment'),
  });
}

export function useToggleCommentLike() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ commentId, postId, liked }: { commentId: string; postId: string; liked: boolean }) => {
      if (!user) throw new Error('Must be logged in');
      if (liked) {
        const { error } = await supabase
          .from('feed_comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('feed_comment_likes')
          .insert({ comment_id: commentId, user_id: user.id });
        if (error) throw error;
      }
    },
    onMutate: async ({ commentId, postId, liked }) => {
      await qc.cancelQueries({ queryKey: ['feed-comments', postId] });
      const previous = qc.getQueryData<FeedComment[]>(['feed-comments', postId]);
      qc.setQueryData<FeedComment[]>(['feed-comments', postId], (old) =>
        (old || []).map((c) =>
          c.id === commentId
            ? { ...c, liked_by_me: !liked, likes_count: liked ? Math.max(0, c.likes_count - 1) : c.likes_count + 1 }
            : c
        )
      );
      return { previous, postId };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['feed-comments', context.postId], context.previous);
    },
  });
}

export interface PostLiker {
  user_id: string;
  full_name: string;
  profile_photo_url: string | null;
  profile_id: string | null;
}

export function usePostLikers(postId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['post-likers', postId],
    queryFn: async (): Promise<PostLiker[]> => {
      const { data: likes, error } = await supabase
        .from('feed_likes')
        .select('user_id')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!likes?.length) return [];

      const userIds = likes.map((l) => l.user_id);
      const { data: profiles } = await supabase
        .from('freelancer_profiles')
        .select('id, user_id, full_name, profile_photo_url, account_type, business_name')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      return likes.map((l) => {
        const p = profileMap.get(l.user_id);
        return {
          user_id: l.user_id,
          full_name: p ? ((p.account_type === 'agency' && p.business_name) ? p.business_name : p.full_name) : 'Unknown',
          profile_photo_url: p?.profile_photo_url || null,
          profile_id: p?.id || null,
        };
      });
    },
    enabled,
  });
}

export function useCommentLikers(commentId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['comment-likers', commentId],
    queryFn: async (): Promise<PostLiker[]> => {
      const { data: likes, error } = await supabase
        .from('feed_comment_likes')
        .select('user_id')
        .eq('comment_id', commentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!likes?.length) return [];

      const userIds = likes.map((l) => l.user_id);
      const { data: profiles } = await supabase
        .from('freelancer_profiles')
        .select('id, user_id, full_name, profile_photo_url, account_type, business_name')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      return likes.map((l) => {
        const p = profileMap.get(l.user_id);
        return {
          user_id: l.user_id,
          full_name: p ? ((p.account_type === 'agency' && p.business_name) ? p.business_name : p.full_name) : 'Unknown',
          profile_photo_url: p?.profile_photo_url || null,
          profile_id: p?.id || null,
        };
      });
    },
    enabled,
  });
}
