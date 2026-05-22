import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Heart, MessageCircle, UserCheck, UserX, Briefcase } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  useFeedNotifications,
  useUnreadFeedNotificationCount,
  useMarkFeedNotificationsRead,
  useRealtimeFeedNotifications,
} from '@/hooks/useFeedNotifications';
import {
  usePendingFollowRequests,
  usePendingFollowCount,
  useAcceptFollow,
  useRejectFollow,
} from '@/hooks/useFollow';
import {
  useMyStaffInvitations,
  useRespondStaffInvitation,
  useRealtimeStaffInvitations,
} from '@/hooks/useAgencyStaff';
import { normalizeMediaUrl } from '@/lib/mediaUrl';
import { cn } from '@/lib/utils';

export default function FeedNotificationBell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: notifications = [] } = useFeedNotifications();
  const unreadCount = useUnreadFeedNotificationCount();
  const { data: pendingCount = 0 } = usePendingFollowCount();
  const markRead = useMarkFeedNotificationsRead();
  const [open, setOpen] = useState(false);
  useRealtimeFeedNotifications();

  const { data: followRequests = [] } = usePendingFollowRequests();
  const accept = useAcceptFollow();
  const reject = useRejectFollow();

  const { data: staffInvitations = [] } = useMyStaffInvitations();
  const respondStaff = useRespondStaffInvitation();
  useRealtimeStaffInvitations();

  const totalBadge = unreadCount + pendingCount + staffInvitations.length;

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && unreadCount > 0) {
      markRead.mutate();
    }
  };

  const handleNotificationClick = (postId: string) => {
    setOpen(false);
    navigate(`/post/${postId}`);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalBadge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {totalBadge > 9 ? '9+' : totalBadge}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0 max-h-[480px] overflow-y-auto" align="end">
        <div className="p-3.5 border-b border-border">
          <h3 className="font-bold text-base">Notifications</h3>
        </div>

        {/* Staff Invitations Section */}
        {staffInvitations.length > 0 && (
          <div className="border-b border-border">
            <div className="px-3.5 pt-3 pb-2 flex items-center gap-2">
              <Briefcase className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Staff Invitations</p>
            </div>
            {staffInvitations.map((inv: any) => (
              <div key={inv.id} className="flex items-center gap-3 px-3.5 py-3 hover:bg-muted/50 transition-colors">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={inv.agencyProfile?.profile_photo_url || ''} />
                  <AvatarFallback className="text-xs">
                    {inv.agencyProfile?.full_name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">
                    <span className="font-semibold">
                      {inv.agencyProfile?.business_name || inv.agencyProfile?.full_name || 'A company'}
                    </span>{' '}
                    invited you as staff
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    className="h-8 px-3 rounded-lg text-xs font-semibold"
                    onClick={() => respondStaff.mutate({ id: inv.id, status: 'accepted' })}
                    disabled={respondStaff.isPending}
                  >
                    <UserCheck className="h-3.5 w-3.5 mr-1" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 rounded-lg text-xs font-semibold"
                    onClick={() => respondStaff.mutate({ id: inv.id, status: 'rejected' })}
                    disabled={respondStaff.isPending}
                  >
                    <UserX className="h-3.5 w-3.5 mr-1" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Follow Requests Section */}
        {followRequests.length > 0 && (
          <div className="border-b border-border">
            <div className="px-3.5 pt-3 pb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Follow Requests</p>
              <button
                onClick={() => { setOpen(false); navigate('/follow-requests'); }}
                className="text-xs text-primary font-semibold hover:underline"
              >
                See all
              </button>
            </div>
            {followRequests.slice(0, 3).map((req) => (
              <div key={req.id} className="flex items-center gap-3 px-3.5 py-3 hover:bg-muted/50 transition-colors">
                <Avatar
                  className="h-10 w-10 shrink-0 cursor-pointer"
                  onClick={() => { setOpen(false); req.profile && navigate(`/freelancer/${req.profile.id}`); }}
                >
                  <AvatarImage src={req.profile?.profile_photo_url || ''} />
                  <AvatarFallback className="text-xs">{req.profile?.display_name?.[0] ?? '?'}</AvatarFallback>
                </Avatar>
                <p
                  className="text-sm font-medium flex-1 min-w-0 truncate cursor-pointer hover:underline"
                  onClick={() => { setOpen(false); req.profile && navigate(`/freelancer/${req.profile.id}`); }}
                >
                  {req.profile?.display_name ?? 'Unknown'}
                </p>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => accept.mutate(req.follower_id)}
                    disabled={accept.isPending || reject.isPending}
                  >
                    <UserCheck className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => reject.mutate(req.follower_id)}
                    disabled={accept.isPending || reject.isPending}
                  >
                    <UserX className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Post Notifications */}
        {notifications.length === 0 && followRequests.length === 0 && staffInvitations.length === 0 ? (
          <p className="text-sm text-muted-foreground p-5 text-center">No notifications yet</p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n.post_id)}
              className={cn(
                'flex items-start gap-3 px-3.5 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 transition-colors',
                !n.read && 'bg-primary/5'
              )}
            >
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={normalizeMediaUrl(n.from_user_photo) || ''} />
                <AvatarFallback className="text-xs">{n.from_user_name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">
                  <span className="font-semibold">{n.from_user_name}</span>{' '}
                  {n.type === 'like' ? 'liked your post' : 'commented on your post'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </div>
              {n.type === 'like' ? (
                <Heart className="h-4 w-4 text-destructive shrink-0 mt-1" />
              ) : (
                <MessageCircle className="h-4 w-4 text-primary shrink-0 mt-1" />
              )}
            </div>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}
