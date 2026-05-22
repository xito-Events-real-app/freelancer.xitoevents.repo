import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Heart, MessageCircle, Trash2, Send, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeMediaUrl } from '@/lib/mediaUrl';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useFeedComments,
  useAddComment,
  useDeleteComment,
  useToggleLike,
  useDeletePost,
  useToggleCommentLike,
  usePostLikers,
  useCommentLikers,
  type FeedComment,
} from '@/hooks/useFeed';
import { useState } from 'react';
import ImageLightbox from '@/components/ImageLightbox';
import { LinkifiedText } from '@/components/LinkifiedText';
import LikersDialog from '@/components/LikersDialog';
import { SITE_URL } from '@/lib/constants';
import { toast } from 'sonner';

function useSinglePost(postId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['feed-post', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feed_posts')
        .select('*')
        .eq('id', postId)
        .single();
      if (error) throw error;

      const { data: profile } = await supabase
        .from('freelancer_profiles')
        .select('full_name, profile_photo_url, id, account_type, business_name')
        .eq('user_id', data.user_id)
        .maybeSingle();

      let likedByMe = false;
      if (user) {
        const { data: like } = await supabase
          .from('feed_likes')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .maybeSingle();
        likedByMe = !!like;
      }

      return {
        ...data,
        author_name: (profile?.account_type === 'agency' && profile?.business_name) ? profile.business_name : (profile?.full_name || 'Unknown'),
        author_photo: profile?.profile_photo_url || null,
        author_profile_id: profile?.id || null,
        liked_by_me: likedByMe,
      };
    },
  });
}

function SingleComment({
  comment,
  postId,
  replies,
  depth = 0,
}: {
  comment: FeedComment;
  postId: string;
  replies: FeedComment[];
  depth?: number;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const deleteComment = useDeleteComment();
  const toggleCommentLike = useToggleCommentLike();
  const addComment = useAddComment();
  const [replyText, setReplyText] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [showCommentLikers, setShowCommentLikers] = useState(false);
  const { data: commentLikers = [], isLoading: likersLoading } = useCommentLikers(comment.id, showCommentLikers);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    await addComment.mutateAsync({ postId, content: replyText.trim(), parentId: comment.id });
    setReplyText('');
    setShowReplyInput(false);
  };

  const childReplies = replies.filter((r) => r.parent_id === comment.id);

  return (
    <div className={cn(depth > 0 && 'ml-8')}>
      <div className="flex gap-2 items-start">
        <Avatar
          className="h-7 w-7 shrink-0 cursor-pointer"
          onClick={() => comment.author_profile_id && navigate(`/freelancer/${comment.author_profile_id}`)}
        >
          <AvatarImage src={comment.author_photo || ''} />
          <AvatarFallback className="text-[10px]">{comment.author_name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="bg-muted rounded-lg px-3 py-2">
            <p
              className="text-xs font-semibold cursor-pointer hover:underline"
              onClick={() => comment.author_profile_id && navigate(`/freelancer/${comment.author_profile_id}`)}
            >
              {comment.author_name}
            </p>
            <LinkifiedText text={comment.content} className="text-sm" showPreview={false} />
          </div>
          <div className="flex items-center gap-3 mt-0.5 px-1">
            <span className="text-[11px] text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
            {user && (
              <button
                onClick={() => toggleCommentLike.mutate({ commentId: comment.id, postId, liked: comment.liked_by_me })}
                className={cn(
                  'text-[11px] font-semibold transition-colors',
                  comment.liked_by_me ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Like
              </button>
            )}
            {comment.likes_count > 0 && (
              <button
                onClick={() => setShowCommentLikers(true)}
                className="text-[11px] text-muted-foreground hover:underline flex items-center gap-0.5"
              >
                <Heart className="h-3 w-3 fill-destructive text-destructive" />
                {comment.likes_count}
              </button>
            )}
            {user && depth === 0 && (
              <button
                onClick={() => setShowReplyInput(!showReplyInput)}
                className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Reply
              </button>
            )}
            {user?.id === comment.user_id && (
              <button
                onClick={() => deleteComment.mutate({ commentId: comment.id, postId })}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {showReplyInput && user && (
        <div className="flex gap-2 ml-9 mt-1">
          <Input
            placeholder={`Reply to ${comment.author_name}...`}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleReply()}
            className="h-7 text-xs"
          />
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleReply} disabled={addComment.isPending}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {childReplies.length > 0 && (
        <div className="mt-1 space-y-2">
          {childReplies.map((reply) => (
            <SingleComment key={reply.id} comment={reply} postId={postId} replies={[]} depth={depth + 1} />
          ))}
        </div>
      )}

      {showCommentLikers && (
        <LikersDialog
          open={showCommentLikers}
          onOpenChange={setShowCommentLikers}
          likers={commentLikers}
          isLoading={likersLoading}
          title="Comment liked by"
        />
      )}
    </div>
  );
}

export default function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: post, isLoading } = useSinglePost(postId!);
  const { data: comments = [], isLoading: commentsLoading } = useFeedComments(postId!);
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();
  const toggleLike = useToggleLike();
  const deletePost = useDeletePost();
  const [text, setText] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showPostLikers, setShowPostLikers] = useState(false);
  const { data: postLikers = [], isLoading: postLikersLoading } = usePostLikers(postId!, showPostLikers);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    await addComment.mutateAsync({ postId: postId!, content: text.trim() });
    setText('');
  };

  const handleShare = async () => {
    const url = `${SITE_URL}/post/${postId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Post by ${post?.author_name || 'someone'}`, url });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Post not found</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
        </Button>
      </div>
    );
  }

  const imageUrl = normalizeMediaUrl(post.image_url);
  const topLevel = comments.filter((c) => !c.parent_id);
  const replies = comments.filter((c) => c.parent_id);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg lg:max-w-3xl mx-auto px-4 py-4">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <Card className="overflow-hidden">
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <Avatar
                className="h-10 w-10 cursor-pointer"
                onClick={() => post.author_profile_id && navigate(`/freelancer/${post.author_profile_id}`)}
              >
                <AvatarImage src={post.author_photo || ''} />
                <AvatarFallback>{post.author_name[0]}</AvatarFallback>
              </Avatar>
              <div
                className="flex-1 cursor-pointer"
                onClick={() => post.author_profile_id && navigate(`/freelancer/${post.author_profile_id}`)}
              >
                <p className="font-semibold text-sm">{post.author_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </p>
              </div>
              {user?.id === post.user_id && (
                <button
                  onClick={async () => {
                    await deletePost.mutateAsync({ postId: post.id, imagePath: post.image_path });
                    navigate('/');
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Content */}
            {post.content && <div className="mb-3"><LinkifiedText text={post.content} className="text-sm" /></div>}

            {/* Image */}
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Post"
                className="rounded-lg w-full object-contain mb-3 cursor-pointer"
                loading="lazy"
                onClick={() => setLightboxUrl(imageUrl)}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}

            {/* Likes count - clickable */}
            {post.likes_count > 0 && (
              <button
                onClick={() => setShowPostLikers(true)}
                className="text-xs text-muted-foreground mb-1 hover:underline flex items-center gap-1"
              >
                <Heart className="h-3 w-3 fill-destructive text-destructive" />
                {post.likes_count} {post.likes_count === 1 ? 'like' : 'likes'}
              </button>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 text-sm border-t border-border pt-2 mb-4">
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
                <span>Like</span>
              </button>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MessageCircle className="h-5 w-5" />
                <span>{post.comments_count}</span>
              </div>
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors ml-auto"
              >
                <Share2 className="h-5 w-5" />
                <span>Share</span>
              </button>
            </div>

            {/* Guest signup CTA */}
            {!user && (
              <div className="bg-muted rounded-lg p-4 mb-4 text-center">
                <p className="text-sm font-medium mb-2">Sign up to like, comment, and share your work</p>
                <Button size="sm" onClick={() => navigate('/auth')}>
                  Sign Up / Log In
                </Button>
              </div>
            )}

            {/* Comments */}
            <div className="border-t border-border pt-3 space-y-3">
              {commentsLoading && <p className="text-xs text-muted-foreground">Loading...</p>}
              {topLevel.map((c) => (
                <SingleComment key={c.id} comment={c} postId={postId!} replies={replies} />
              ))}

              {user && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Write a comment..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
                    className="h-8 text-sm"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleSubmit} disabled={addComment.isPending}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {lightboxUrl && (
        <ImageLightbox src={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}

      <LikersDialog
        open={showPostLikers}
        onOpenChange={setShowPostLikers}
        likers={postLikers}
        isLoading={postLikersLoading}
      />
    </div>
  );
}
