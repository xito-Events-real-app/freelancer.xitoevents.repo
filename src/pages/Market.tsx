import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { maskName } from '@/lib/utils';
import {
  useMarketPosts,
  useMarketPost,
  useCreateMarketPost,
  useUpdateMarketPost,
  useDeleteMarketPost,
  useApplyToPost,
  useMarketNotifications,
  useMarkNotificationsRead,
  useAssignFreelancer,
  useRespondToAssignment,
  useMarketPostStats,
  useRecordView,
  useToggleMarketLike,
} from '@/hooks/useMarket';
import MarketPostForm from '@/components/MarketPostForm';
import MarketComments from '@/components/MarketComments';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Plus, ArrowLeft, MapPin, CalendarDays, Clock, Camera, Briefcase,
  Trash2, Pencil, Bell, Send, ChevronRight, UserCheck, Check, X,
  DollarSign, MessageSquare, Users, Eye, Heart,
} from 'lucide-react';
import { adToBS, formatBSDate } from '@/lib/nepaliCalendar';
import { toast } from 'sonner';

function toBSDisplay(adDateStr: string): string {
  try {
    return formatBSDate(adToBS(new Date(adDateStr + 'T00:00:00')));
  } catch {
    return adDateStr;
  }
}

function toBSShort(adDateStr: string): string {
  try {
    const bs = adToBS(new Date(adDateStr + 'T00:00:00'));
    const months = ["Bai", "Jes", "Ash", "Shr", "Bhd", "Asw", "Kar", "Mng", "Pou", "Mgh", "Fal", "Cha"];
    return `${bs.day} ${months[bs.month - 1]}`;
  } catch {
    return adDateStr;
  }
}

const freelancerTypeColors: Record<string, string> = {
  Photographer: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Videographer: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Photo Editor': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Video Editor': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Drone Operator': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  default: 'bg-primary/10 text-primary border-primary/20',
};

function TypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  const cls = freelancerTypeColors[type] || freelancerTypeColors.default;
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{type}</span>;
}

type View = 'list' | 'create' | 'edit' | 'detail' | 'notifications';

export default function Market() {
  const [view, setView] = useState<View>('list');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [applyMessage, setApplyMessage] = useState('');
  const [showApplyBox, setShowApplyBox] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: posts, isLoading } = useMarketPosts();
  const { data: postDetail } = useMarketPost(selectedPostId || undefined);
  const createPost = useCreateMarketPost();
  const updatePost = useUpdateMarketPost();
  const deletePost = useDeleteMarketPost();
  const applyToPost = useApplyToPost();
  const assignFreelancer = useAssignFreelancer();
  const respondToAssignment = useRespondToAssignment();
  const { data: notifications } = useMarketNotifications();
  const markRead = useMarkNotificationsRead();
  const unreadCount = (notifications || []).filter(n => !n.read).length;

  const postIds = (posts || []).map(p => p.id);
  const { data: stats } = useMarketPostStats(postIds);
  const recordView = useRecordView();
  const toggleLike = useToggleMarketLike();

  const openDetail = (postId: string) => {
    setSelectedPostId(postId);
    setView('detail');
    setShowApplyBox(false);
    setApplyMessage('');
    recordView.mutate(postId);
  };

  const handleLikeToggle = (e: React.MouseEvent, postId: string, liked: boolean) => {
    e.stopPropagation();
    if (!user) { toast.error('Please log in to like'); return; }
    toggleLike.mutate({ postId, liked });
  };

  const handleCreate = (data: any) => {
    createPost.mutate(data, {
      onSuccess: () => { toast.success('Job posted!'); setView('list'); },
      onError: () => toast.error('Failed to post'),
    });
  };

  const handleUpdate = (data: any) => {
    if (!selectedPostId) return;
    updatePost.mutate({ ...data, id: selectedPostId }, {
      onSuccess: () => { toast.success('Post updated!'); setView('detail'); },
      onError: () => toast.error('Failed to update'),
    });
  };

  const handleDelete = () => {
    if (!selectedPostId) return;
    if (!confirm('Delete this post?')) return;
    deletePost.mutate(selectedPostId, {
      onSuccess: () => { toast.success('Deleted'); setView('list'); setSelectedPostId(null); },
    });
  };

  const handleApply = () => {
    if (!selectedPostId || !postDetail) return;
    applyToPost.mutate({
      postId: selectedPostId,
      message: applyMessage,
      postOwnerId: postDetail.post.user_id,
    }, {
      onSuccess: () => { toast.success('Application sent!'); setShowApplyBox(false); setApplyMessage(''); },
      onError: () => toast.error('Failed to apply'),
    });
  };

  const handleAssign = (applicationId: string, freelancerUserId: string) => {
    if (!selectedPostId) return;
    assignFreelancer.mutate({
      applicationId,
      postId: selectedPostId,
      freelancerUserId,
    }, {
      onSuccess: () => toast.success('Freelancer assigned! Waiting for acceptance.'),
      onError: () => toast.error('Failed to assign'),
    });
  };

  const handleRespondAssignment = (assignmentId: string, status: 'accepted' | 'declined') => {
    if (!postDetail) return;
    respondToAssignment.mutate({
      assignmentId,
      status,
      postId: postDetail.post.id,
      posterId: postDetail.post.user_id,
      postEventName: postDetail.post.event_name,
      posterName: postDetail.poster_name,
      posterWhatsapp: postDetail.poster_whatsapp,
      posterContact: postDetail.poster_contact,
      postDates: postDetail.dates.map(d => ({ event_date: d.event_date })),
    }, {
      onSuccess: () => toast.success(status === 'accepted' ? 'Assignment accepted! Dates added to your calendar.' : 'Assignment declined.'),
      onError: () => toast.error('Failed to respond'),
    });
  };

  const openNotifications = () => {
    setView('notifications');
    markRead.mutate();
  };

  const notificationText = (type: string) => {
    switch (type) {
      case 'application': return 'applied to your post';
      case 'comment': return 'commented on your post';
      case 'assignment': return 'assigned you to a job';
      case 'assignment_accepted': return 'accepted your assignment';
      case 'assignment_declined': return 'declined your assignment';
      default: return 'interacted with your post';
    }
  };

  // ---- NOTIFICATIONS VIEW ----
  if (view === 'notifications') {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b border-border px-4 py-3">
          <div className="max-w-lg lg:max-w-3xl mx-auto flex items-center gap-3">
            <button onClick={() => setView('list')} className="p-1 rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
            <h1 className="font-bold text-foreground text-lg">Notifications</h1>
          </div>
        </div>
        <div className="px-4 py-4 max-w-lg lg:max-w-3xl mx-auto space-y-2">
          {(!notifications || notifications.length === 0) ? (
            <div className="text-center py-20">
              <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No notifications yet</p>
            </div>
          ) : notifications.map(n => (
            <button
              key={n.id}
              onClick={() => n.post_id && openDetail(n.post_id)}
              className={`w-full text-left p-4 rounded-2xl border transition-all hover:shadow-md ${n.read ? 'bg-card border-border' : 'bg-primary/5 border-primary/20 shadow-sm'}`}
            >
              <p className="text-sm text-foreground">
                <span className="font-semibold">{n.from_name}</span>{' '}
                {notificationText(n.type)}
              </p>
              <span className="text-[10px] text-muted-foreground mt-1 block">{new Date(n.created_at).toLocaleString()}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---- CREATE VIEW ----
  if (view === 'create') {
    return <MarketPostForm onSubmit={handleCreate} onCancel={() => setView('list')} submitting={createPost.isPending} />;
  }

  // ---- EDIT VIEW ----
  if (view === 'edit' && postDetail) {
    return (
      <MarketPostForm
        initialData={{
          event_name: postDetail.post.event_name,
          freelancer_type: postDetail.post.freelancer_type || '',
          default_city: postDetail.post.default_city || '',
          default_area: postDetail.post.default_area || '',
          default_min_camera: postDetail.post.default_min_camera || '',
          total_price: postDetail.post.total_price || '',
          dates: postDetail.dates.map(d => ({
            event_date: d.event_date,
            timings: d.timings || '',
            city: d.city || '',
            area: d.area || '',
            min_camera: d.min_camera || '',
            freelancer_type: d.freelancer_type || '',
          })),
        }}
        onSubmit={handleUpdate}
        onCancel={() => setView('detail')}
        submitting={updatePost.isPending}
      />
    );
  }

  // ---- DETAIL VIEW ----
  if (view === 'detail' && postDetail) {
    const isOwner = user?.id === postDetail.post.user_id;
    const isGuest = !user;
    const hasApplied = postDetail.applications.some(a => a.user_id === user?.id);
    const myAssignment = postDetail.assignments.find(a => a.assigned_user_id === user?.id);

    return (
      <div className="min-h-screen bg-background pb-20">
        {/* Header with gradient */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-primary/10 via-card to-card backdrop-blur-lg border-b border-border px-4 py-3">
          <div className="max-w-lg lg:max-w-3xl mx-auto flex items-center gap-3">
            <button onClick={() => { setView('list'); setSelectedPostId(null); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="font-bold text-foreground truncate text-lg">{postDetail.post.event_name}</h1>
            {isOwner && !isGuest && (
              <div className="ml-auto flex gap-1">
                <button onClick={() => setView('edit')} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-4 h-4" /></button>
                <button onClick={handleDelete} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-5 max-w-lg lg:max-w-3xl mx-auto space-y-5">
          {/* Poster */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Posted by</span>
              <button
                onClick={() => !isGuest && postDetail.poster_profile_id && navigate(`/freelancer/${postDetail.poster_profile_id}`)}
                className={`block text-sm font-semibold ${isGuest ? 'text-foreground' : 'text-primary hover:underline'}`}
              >
                {isGuest ? maskName(postDetail.poster_name) : postDetail.poster_name}
              </button>
            </div>
          </div>

          {/* Views & Likes bar */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Eye className="w-4 h-4" /> {stats?.[postDetail.post.id]?.views || 0} views
            </span>
            <button
              onClick={(e) => handleLikeToggle(e, postDetail.post.id, stats?.[postDetail.post.id]?.liked || false)}
              className={`inline-flex items-center gap-1.5 transition-colors ${stats?.[postDetail.post.id]?.liked ? 'text-red-500' : 'hover:text-red-400'}`}
            >
              <Heart className={`w-4 h-4 ${stats?.[postDetail.post.id]?.liked ? 'fill-red-500' : ''}`} />
              {stats?.[postDetail.post.id]?.likes || 0} likes
            </button>
            <span className="inline-flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" /> {stats?.[postDetail.post.id]?.comments || 0} comments
            </span>
          </div>

          <div className="bg-gradient-to-br from-card to-card/80 rounded-2xl border border-border p-5 space-y-3 shadow-sm">
            {postDetail.post.freelancer_type && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Requirement</span>
                  <div className="mt-0.5"><TypeBadge type={postDetail.post.freelancer_type} /></div>
                </div>
              </div>
            )}
            {(postDetail.post.default_city || postDetail.post.default_area) && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Location</span>
                  <p className="text-sm font-medium text-foreground">{[postDetail.post.default_city, postDetail.post.default_area].filter(Boolean).join(', ')}</p>
                </div>
              </div>
            )}
            {postDetail.post.default_min_camera && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Camera className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Min Camera</span>
                  <p className="text-sm font-medium text-foreground">{postDetail.post.default_min_camera}</p>
                </div>
              </div>
            )}
            {postDetail.post.total_price && (
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Budget</span>
                  <p className="text-lg font-bold text-emerald-500">NPR {postDetail.post.total_price}</p>
                </div>
              </div>
            )}
          </div>

          {/* Event Dates */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" /> Event Dates
            </h3>
            {postDetail.dates.map(d => (
              <div key={d.id} className="bg-card rounded-2xl border border-border p-4 space-y-2 hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-sm font-semibold text-foreground">{toBSDisplay(d.event_date)}</span>
                </div>
                <div className="pl-4 space-y-1">
                  {d.timings && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{d.timings}</span>
                    </div>
                  )}
                  {(d.city || d.area) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{[d.city, d.area].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {d.min_camera && (
                    <div className="flex items-center gap-2">
                      <Camera className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{d.min_camera}</span>
                    </div>
                  )}
                  {d.freelancer_type && d.freelancer_type !== postDetail.post.freelancer_type && (
                    <TypeBadge type={d.freelancer_type} />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Assignment response for assigned freelancer */}
          {myAssignment && myAssignment.status === 'pending' && (
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl border border-primary/20 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">You've been assigned!</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {postDetail.poster_name} wants you for this job. Accept to add dates to your calendar.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleRespondAssignment(myAssignment.id, 'accepted')}
                  disabled={respondToAssignment.isPending}
                  className="flex-1 rounded-xl bg-accent hover:bg-accent/90"
                >
                  <Check className="w-4 h-4 mr-1" /> Accept
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRespondAssignment(myAssignment.id, 'declined')}
                  disabled={respondToAssignment.isPending}
                  className="flex-1 rounded-xl"
                >
                  <X className="w-4 h-4 mr-1" /> Decline
                </Button>
              </div>
            </div>
          )}

          {myAssignment && myAssignment.status === 'accepted' && (
            <Badge className="rounded-full bg-accent/10 text-accent border-accent/20 px-3 py-1.5">
              <Check className="w-3 h-3 mr-1" /> Assignment Accepted — Dates in Calendar
            </Badge>
          )}

          {myAssignment && myAssignment.status === 'declined' && (
            <Badge variant="destructive" className="rounded-full px-3 py-1.5">
              <X className="w-3 h-3 mr-1" /> Assignment Declined
            </Badge>
          )}

          {/* Apply */}
          {!isOwner && !myAssignment && (
            <div className="space-y-2">
              {isGuest ? (
                <Button onClick={() => navigate('/auth')} className="w-full rounded-xl h-12 text-base font-semibold shadow-md">
                  Sign up to apply for this job
                </Button>
              ) : hasApplied ? (
                <Badge className="rounded-full bg-accent/10 text-accent border-accent/20 px-3 py-1.5">Already Applied</Badge>
              ) : showApplyBox ? (
                <div className="bg-card rounded-2xl border border-border p-4 space-y-3 shadow-sm">
                  <Input
                    value={applyMessage}
                    onChange={e => setApplyMessage(e.target.value)}
                    placeholder="Add a message (optional)"
                    className="rounded-xl"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleApply} disabled={applyToPost.isPending} className="flex-1 rounded-xl">
                      <Send className="w-4 h-4 mr-2" /> {applyToPost.isPending ? 'Sending...' : 'Send Application'}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowApplyBox(false)} className="rounded-xl">Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setShowApplyBox(true)} className="w-full rounded-xl h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all">
                  Apply for this Job
                </Button>
              )}
            </div>
          )}

          {/* Applications (owner only) */}
          {isOwner && !isGuest && postDetail.applications.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" /> Applications ({postDetail.applications.length})
              </h3>
              {postDetail.applications.map(a => {
                const assignmentForApp = postDetail.assignments.find(as => as.application_id === a.id);
                return (
                  <div key={a.id} className="bg-card rounded-2xl border border-border p-4 space-y-2 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => a.applicant_profile_id && navigate(`/freelancer/${a.applicant_profile_id}`)}
                          className="text-sm font-semibold text-primary hover:underline"
                        >
                          {a.applicant_name}
                        </button>
                        {a.message && <p className="text-xs text-muted-foreground mt-0.5">{a.message}</p>}
                      </div>
                      {!assignmentForApp ? (
                        <Button
                          size="sm"
                          onClick={() => handleAssign(a.id, a.user_id)}
                          disabled={assignFreelancer.isPending}
                          className="rounded-xl text-xs"
                        >
                          <UserCheck className="w-3 h-3 mr-1" /> Assign
                        </Button>
                      ) : (
                        <Badge
                          className={`rounded-full text-[10px] ${
                            assignmentForApp.status === 'accepted' ? 'bg-accent/10 text-accent border-accent/20' :
                            assignmentForApp.status === 'declined' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                            'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                          }`}
                        >
                          {assignmentForApp.status === 'accepted' ? 'Accepted' :
                           assignmentForApp.status === 'declined' ? 'Declined' : 'Pending'}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Comments */}
          <MarketComments postId={postDetail.post.id} postOwnerId={postDetail.post.user_id} comments={postDetail.comments} />
        </div>
      </div>
    );
  }

  // ---- LIST VIEW ----
  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 bg-gradient-to-r from-primary/5 via-card to-card border-b border-border">
        <div className="max-w-xl lg:max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Market</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Find & post freelance jobs</p>
          </div>
          {user && (
            <button onClick={openNotifications} className="relative p-2.5 rounded-xl hover:bg-muted transition-colors">
              <Bell className="w-5 h-5 text-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 max-w-xl lg:max-w-4xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : (!posts || posts.length === 0) ? (
          <div className="text-center py-20">
            <Briefcase className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No job posts yet</p>
            <p className="text-sm text-muted-foreground mt-1">Be the first to post!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {posts.map(p => {
              const s = stats?.[p.id] || { views: 0, likes: 0, comments: 0, liked: false };
              return (
                <button
                  key={p.id}
                  onClick={() => openDetail(p.id)}
                  className="w-full bg-card rounded-2xl border border-border p-4 text-left transition-all hover:shadow-lg hover:border-primary/20 active:scale-[0.98] group"
                >
                  {/* Top row: event name + type */}
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors flex-1">{p.event_name}</h3>
                    {p.freelancer_type && <TypeBadge type={p.freelancer_type} />}
                  </div>

                  {/* Dates - full display */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {p.dates.map((d, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[11px] bg-primary/5 text-primary rounded-full px-2 py-0.5 font-medium">
                        <CalendarDays className="w-3 h-3" />
                        {toBSDisplay(d.event_date)}
                      </span>
                    ))}
                  </div>

                  {/* Location, Camera, Price row */}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                    {(p.default_city || p.default_area) && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {[p.default_city, p.default_area].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {p.default_min_camera && (
                      <span className="inline-flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        {p.default_min_camera}
                      </span>
                    )}
                    {p.total_price && (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-500">
                        <DollarSign className="w-3 h-3" />
                        NPR {p.total_price}
                      </span>
                    )}
                  </div>

                  {/* Bottom: stats + poster */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> {s.views}
                      </span>
                      <button
                        onClick={(e) => handleLikeToggle(e, p.id, s.liked)}
                        className={`inline-flex items-center gap-1 transition-colors ${s.liked ? 'text-red-500' : 'hover:text-red-400'}`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${s.liked ? 'fill-red-500' : ''}`} /> {s.likes}
                      </button>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" /> {s.comments}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                      {!user ? maskName(p.poster_name) : p.poster_name}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB — only for logged in users */}
      {user && (
        <button
          onClick={() => setView('create')}
          className="fixed bottom-6 right-4 sm:right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:bg-primary/90 transition-all hover:scale-105 z-40"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
