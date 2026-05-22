import { useEffect, useRef, createRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Share2, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LinkifiedText } from '@/components/LinkifiedText';
import { useAuth } from '@/contexts/AuthContext';
import { useUserFeedPosts } from '@/hooks/useUserFeedPosts';
import { useToggleLike, useDeletePost } from '@/hooks/useFeed';
import { normalizeMediaUrl } from '@/lib/mediaUrl';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { SITE_URL } from '@/lib/constants';
import { toast } from 'sonner';

export default function UserPostsFeed() {
  const { userId, postId } = useParams<{ userId: string; postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: allPosts = [], isLoading } = useUserFeedPosts(userId);
  const toggleLike = useToggleLike();
  const deletePost = useDeletePost();

  // Only image posts
  const posts = allPosts.filter((p) => !!p.image_url);

  const refs = useRef<Record<string, React.RefObject<HTMLDivElement>>>({});
  posts.forEach((p) => {
    if (!refs.current[p.id]) refs.current[p.id] = createRef<HTMLDivElement>();
  });

  useEffect(() => {
    if (postId && refs.current[postId]?.current) {
      refs.current[postId].current.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }, [postId, posts.length]);

  const handleShare = async (post: (typeof posts)[0]) => {
    const url = `${SITE_URL}/post/${post.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: `Post by ${post.author_name}`, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="max-w-lg lg:max-w-3xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-bold text-foreground text-sm">Posts</h1>
        </div>
      </div>

      <div className="max-w-lg lg:max-w-3xl mx-auto divide-y divide-border">
        {posts.map((post) => {
          const imageUrl = normalizeMediaUrl(post.image_url);
          return (
            <div key={post.id} ref={refs.current[post.id]} className="py-3 px-4">
              {/* Header */}
              <div className="flex items-center gap-3 mb-2">
                <Avatar
                  className="h-9 w-9 cursor-pointer"
                  onClick={() => post.author_profile_id && navigate(`/freelancer/${post.author_profile_id}`)}
                >
                  <AvatarImage src={post.author_photo || ''} />
                  <AvatarFallback className="text-xs">{post.author_name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{post.author_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </p>
                </div>
                {user?.id === post.user_id && (
                  <button
                    onClick={async () => {
                      await deletePost.mutateAsync({ postId: post.id, imagePath: post.image_path });
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Content */}
              {post.content && <div className="mb-2"><LinkifiedText text={post.content} className="text-sm text-foreground" /></div>}

              {/* Image */}
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Post"
                  className="rounded-lg w-full object-contain mb-2"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )}

              {/* Actions */}
              <div className="flex items-center gap-4 text-sm pt-1">
                <button
                  onClick={() => {
                    if (!user) return;
                    toggleLike.mutate({ postId: post.id, liked: post.liked_by_me });
                  }}
                  className={cn(
                    'flex items-center gap-1.5 transition-colors',
                    post.liked_by_me ? 'text-destructive' : 'text-muted-foreground hover:text-destructive'
                  )}
                >
                  <Heart className={cn('h-5 w-5', post.liked_by_me && 'fill-current')} />
                  <span>{post.likes_count}</span>
                </button>
                <button
                  onClick={() => navigate(`/post/${post.id}`)}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>{post.comments_count}</span>
                </button>
                <button
                  onClick={() => handleShare(post)}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors ml-auto"
                >
                  <Share2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
