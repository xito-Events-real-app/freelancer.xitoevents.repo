import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Trash2, ImagePlus, Send, Loader2, Share2, Reply, UserCheck, UserX, Clock, CalendarPlus } from 'lucide-react';
import DateBookingsDialog from '@/components/DateBookingsDialog';
import { LinkifiedText } from '@/components/LinkifiedText';
import { nepaliMonthsEnglish, getCurrentBSDate } from '@/lib/nepaliCalendar';
import { normalizeMediaUrl } from '@/lib/mediaUrl';
import { triggerBookingPopup } from '@/lib/bookingPopupTrigger';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useMyProfile } from '@/hooks/useProfile';
import {
  useFeedPosts,
  useCreatePost,
  useDeletePost,
  useToggleLike,
  useFeedComments,
  useAddComment,
  useDeleteComment,
  useToggleCommentLike,
  usePostLikers,
  useCommentLikers,
  type FeedPost,
  type FeedComment,
} from '@/hooks/useFeed';
import { useRealtimeFeed } from '@/hooks/useRealtimeFeed';
import {
  usePendingFollowRequests,
  useAcceptFollow,
  useRejectFollow,
  useRealtimeFollows,
} from '@/hooks/useFollow';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

function deduplicateFeed(posts: FeedPost[]): FeedPost[] {
  const kept: FeedPost[] = [];
  const excess: FeedPost[] = [];
  let lastUserId: string | null = null;
  let consecutive = 0;

  for (const post of posts) {
    if (post.user_id === lastUserId) {
      consecutive++;
    } else {
      lastUserId = post.user_id;
      consecutive = 1;
    }
    if (consecutive <= 1) kept.push(post);
    else excess.push(post);
  }
  return [...kept, ...excess];
}
import ImageLightbox from '@/components/ImageLightbox';
import ImageCropper from '@/components/ImageCropper';
import LikersDialog from '@/components/LikersDialog';
import FeedNotificationBell from '@/components/FeedNotificationBell';
import LaganStickyWidget from '@/components/LaganStickyWidget';
import { SITE_URL } from '@/lib/constants';
import { toast } from 'sonner';

function CreatePostCard() {
  const { user } = useAuth();
  const { data: profile } = useMyProfile();
  const createPost = useCreatePost();
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const [cropAspect, setCropAspect] = useState(4 / 5);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setCropAspect(img.naturalWidth >= img.naturalHeight ? 16 / 9 : 4 / 5);
      setCropperSrc(objectUrl);
    };
    img.src = objectUrl;
  };

  const handleCropComplete = (croppedFile: File) => {
    setImageFile(croppedFile);
    setPreview(URL.createObjectURL(croppedFile));
    setCropperSrc(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!content.trim() && !imageFile) return;
    await createPost.mutateAsync({ content: content.trim(), imageFile: imageFile || undefined });
    setContent('');
    setImageFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={profile?.profile_photo_url || ''} />
            <AvatarFallback>{profile?.full_name?.[0] || '?'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[60px] resize-none"
            />
            {preview && (
              <div className="relative">
                <img src={preview} alt="Preview" className="rounded-lg max-h-60 object-cover w-full" />
                <button
                  onClick={() => { setImageFile(null); setPreview(null); }}
                  className="absolute top-2 right-2 bg-background/80 rounded-full p-1"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            )}
            <div className="flex items-center justify-between">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                <ImagePlus className="h-5 w-5 mr-1" /> Photo
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={createPost.isPending || (!content.trim() && !imageFile)}
              >
                {createPost.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      {cropperSrc && (
        <ImageCropper
          open={!!cropperSrc}
          imageSrc={cropperSrc}
          aspect={cropAspect}
          onComplete={handleCropComplete}
          onCancel={() => { setCropperSrc(null); if (fileRef.current) fileRef.current.value = ''; }}
        />
      )}
    </Card>
  );
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
          {/* Actions row */}
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

      {/* Reply input */}
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

      {/* Nested replies */}
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

function CommentSection({ postId }: { postId: string }) {
  const { user } = useAuth();
  const { data: comments = [], isLoading } = useFeedComments(postId);
  const addComment = useAddComment();
  const [text, setText] = useState('');

  const handleSubmit = async () => {
    if (!text.trim()) return;
    await addComment.mutateAsync({ postId, content: text.trim() });
    setText('');
  };

  // Separate top-level comments and replies
  const topLevel = comments.filter((c) => !c.parent_id);
  const replies = comments.filter((c) => c.parent_id);

  return (
    <div className="border-t border-border pt-3 mt-3 space-y-3">
      {isLoading && <p className="text-xs text-muted-foreground">Loading...</p>}
      {topLevel.map((c) => (
        <SingleComment key={c.id} comment={c} postId={postId} replies={replies} />
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
  );
}

function LikesDisplay({ post }: { post: FeedPost }) {
  const [showLikers, setShowLikers] = useState(false);
  const { data: likers = [], isLoading } = usePostLikers(post.id, showLikers);

  if (post.likes_count === 0) return null;

  const names = post.liked_by_names || [];
  let text = '';

  if (names.length === 1 && post.likes_count === 1) {
    text = names[0];
  } else if (names.length === 1 && post.likes_count > 1) {
    text = `${names[0]} and ${post.likes_count - 1} other${post.likes_count - 1 > 1 ? 's' : ''}`;
  } else if (names.length === 2 && post.likes_count === 2) {
    text = `${names[0]} and ${names[1]}`;
  } else if (names.length >= 2) {
    const others = post.likes_count - names.length;
    if (others > 0) {
      text = `${names[0]}, ${names[1]} and ${others} other${others > 1 ? 's' : ''}`;
    } else {
      text = `${names[0]} and ${names[1]}`;
    }
  }

  return (
    <>
      <button
        onClick={() => setShowLikers(true)}
        className="text-xs text-muted-foreground mb-1 hover:underline text-left"
      >
        <Heart className="h-3 w-3 fill-destructive text-destructive inline mr-1" />
        Liked by <span className="font-semibold text-foreground">{text}</span>
      </button>
      <LikersDialog
        open={showLikers}
        onOpenChange={setShowLikers}
        likers={likers}
        isLoading={isLoading}
      />
    </>
  );
}

// InlineFollowButton moved to shared component
import InlineFollowButton from '@/components/InlineFollowButton';

function PendingFollowBanner() {
  const navigate = useNavigate();
  const { data: requests = [] } = usePendingFollowRequests();
  const accept = useAcceptFollow();
  const reject = useRejectFollow();

  if (requests.length === 0) return null;

  const shown = requests.slice(0, 3);

  return (
    <Card className="mb-4">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">Follow Requests</p>
          {requests.length > 3 && (
            <button onClick={() => navigate('/follow-requests')} className="text-xs text-primary font-semibold hover:underline">
              See all
            </button>
          )}
        </div>
        <div className="space-y-2.5">
          {shown.map((req) => (
            <div key={req.id} className="flex items-center gap-2.5">
              <Avatar
                className="h-9 w-9 cursor-pointer shrink-0"
                onClick={() => req.profile && navigate(`/freelancer/${req.profile.id}`)}
              >
                <AvatarImage src={req.profile?.profile_photo_url || ''} />
                <AvatarFallback className="text-[10px]">{req.profile?.display_name?.[0] ?? '?'}</AvatarFallback>
              </Avatar>
              <p
                className="text-sm font-medium flex-1 min-w-0 truncate cursor-pointer hover:underline"
                onClick={() => req.profile && navigate(`/freelancer/${req.profile.id}`)}
              >
                {req.profile?.display_name ?? 'Unknown'}
              </p>
              <div className="flex gap-1.5 shrink-0">
                <Button
                  size="sm"
                  className="h-7 px-3 text-xs rounded-lg"
                  onClick={() => accept.mutate(req.follower_id)}
                  disabled={accept.isPending || reject.isPending}
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-3 text-xs rounded-lg"
                  onClick={() => reject.mutate(req.follower_id)}
                  disabled={accept.isPending || reject.isPending}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Regex to match BS month+day patterns in booking posts
const BS_DATE_REGEX = new RegExp(
  `(${nepaliMonthsEnglish.join('|')})\\s+(\\d{1,2})`,
  'g'
);

function BookingPostContent({ content, onDateClick }: { content: string; onDateClick: (y: number, m: number, d: number) => void }) {
  // Parse content, replacing date mentions with clickable chips
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(BS_DATE_REGEX.source, 'g');

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={lastIndex}>{content.slice(lastIndex, match.index)}</span>);
    }
    const monthName = match[1];
    const day = parseInt(match[2], 10);
    const monthIdx = nepaliMonthsEnglish.indexOf(monthName) + 1;
    // Use current BS year; if month is before current month, it's likely next year
    const currentBS = getCurrentBSDate();
    const guessYear = monthIdx < currentBS.month ? currentBS.year + 1 : currentBS.year;

    parts.push(
      <button
        key={match.index}
        onClick={(e) => { e.stopPropagation(); onDateClick(guessYear, monthIdx, day); }}
        className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25 text-xs font-semibold transition-colors"
      >
        <CalendarPlus className="h-3 w-3" />
        {monthName} {day}
      </button>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(<span key={lastIndex}>{content.slice(lastIndex)}</span>);
  }

  return <p className="text-sm whitespace-pre-wrap">{parts}</p>;
}

function PostCard({ post }: { post: FeedPost }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const deletePost = useDeletePost();
  const toggleLike = useToggleLike();
  const [showComments, setShowComments] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [dateDialog, setDateDialog] = useState<{ year: number; month: number; day: number } | null>(null);

  const imageUrl = normalizeMediaUrl(post.image_url);
  const isBookingPost = post.content?.startsWith('📅') ?? false;
  const handleProfileClick = () => {
    if (post.author_profile_id) {
      navigate(`/freelancer/${post.author_profile_id}`);
    }
  };

  const handleShare = async () => {
    const url = `${SITE_URL}/post/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Post by ${post.author_name}`, url });
      } catch {
        // user cancelled share
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  return (
    <>
      <Card id={`post-${post.id}`} className="mb-4 overflow-hidden">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            {isBookingPost ? (
              <div className="relative" onClick={handleProfileClick}>
                <Avatar className="h-14 w-14 cursor-pointer ring-2 ring-violet-500/40">
                  <AvatarImage src={post.author_photo || ''} />
                  <AvatarFallback className="text-lg">{post.author_name[0]}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1 shadow-md">
                  <CalendarPlus className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
            ) : (
              <Avatar className="h-10 w-10 cursor-pointer" onClick={handleProfileClick}>
                <AvatarImage src={post.author_photo || ''} />
                <AvatarFallback>{post.author_name[0]}</AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-semibold text-sm cursor-pointer hover:underline" onClick={handleProfileClick}>
                  {post.author_name}
                </p>
                {post.author_main_job && (
                  <span className="text-xs text-muted-foreground">
                    · {post.author_account_type === 'agency'
                      ? `Agency / Studio (${post.author_main_job})`
                      : post.author_main_job}
                  </span>
                )}
                <InlineFollowButton targetUserId={post.user_id} preloadedStatus={post.iFollow} />
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
            {user?.id === post.user_id && (
              <button
                onClick={() => deletePost.mutate({ postId: post.id, imagePath: post.image_path })}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Content */}
          {post.content && (
            <>
              {post.content.startsWith('📅') ? (
                <div className="mb-3 rounded-xl bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-emerald-500/10 border border-violet-500/20 p-3">
                  <BookingPostContent content={post.content} onDateClick={(y, m, d) => setDateDialog({ year: y, month: m, day: d })} />
                  <button
                    onClick={() => triggerBookingPopup()}
                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    Add your dates
                  </button>
                </div>
              ) : (
                <div className="mb-3"><LinkifiedText text={post.content} className="text-sm" /></div>
              )}
            </>
          )}

          {/* Image */}
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Post"
              className="rounded-lg w-full object-contain mb-3 cursor-pointer"
              style={{ aspectRatio: 'auto' }}
              loading="lazy"
              onClick={() => setLightboxUrl(imageUrl)}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}

          {/* Likes display */}
          <LikesDisplay post={post} />

          {/* Actions */}
          <div className="flex items-center gap-4 text-sm border-t border-border pt-2">
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

            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              <span>Comment</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Share2 className="h-5 w-5" />
              <span>Share</span>
            </button>
          </div>

          {/* Preview comment (when comments section is collapsed) */}
          {!showComments && post.first_comment && (
            <div className="mt-3 space-y-1">
              {post.comments_count > 1 && (
                <button
                  onClick={() => setShowComments(true)}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  View all {post.comments_count} comments
                </button>
              )}
              <div className="flex gap-2 items-start">
                <Avatar
                  className="h-6 w-6 shrink-0 cursor-pointer"
                  onClick={() => post.first_comment?.author_profile_id && navigate(`/freelancer/${post.first_comment.author_profile_id}`)}
                >
                  <AvatarImage src={post.first_comment.author_photo || ''} />
                  <AvatarFallback className="text-[9px]">{post.first_comment.author_name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm">
                    <span
                      className="font-semibold cursor-pointer hover:underline mr-1"
                      onClick={() => post.first_comment?.author_profile_id && navigate(`/freelancer/${post.first_comment.author_profile_id}`)}
                    >
                      {post.first_comment.author_name}
                    </span>
                    <LinkifiedText as="span" text={post.first_comment.content} className="text-sm" showPreview={false} />
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(post.first_comment.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {showComments && <CommentSection postId={post.id} />}
        </CardContent>
      </Card>

      {lightboxUrl && (
        <ImageLightbox src={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
      {dateDialog && (
        <DateBookingsDialog
          open={!!dateDialog}
          onOpenChange={(o) => !o && setDateDialog(null)}
          bsYear={dateDialog.year}
          bsMonth={dateDialog.month}
          bsDay={dateDialog.day}
        />
      )}
    </>
  );
}

export default function Dashboard() {
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFeedPosts();
  const posts = useMemo<FeedPost[]>(
    () => (data?.pages ? data.pages.flat() : []),
    [data]
  );
  const reorderedPosts = useMemo(() => deduplicateFeed(posts), [posts]);
  useRealtimeFeed();
  useRealtimeFollows();

  // Infinite-scroll sentinel
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '600px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="max-w-xl lg:max-w-2xl xl:max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <LaganStickyWidget />
        <div className="flex items-center justify-between mb-4 mt-2 sm:mt-3">
          <h1 className="text-xl sm:text-2xl font-bold">Home</h1>
          <FeedNotificationBell />
        </div>

        <CreatePostCard />
        <PendingFollowBanner />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : reorderedPosts.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No posts yet. Be the first to share!</p>
        ) : (
          <>
            {reorderedPosts.map((post) => <PostCard key={post.id} post={post} />)}
            <div ref={sentinelRef} className="h-10" />
            {isFetchingNextPage && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
