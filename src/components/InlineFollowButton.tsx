import { useAuth } from '@/contexts/AuthContext';
import { useFollowStatus, useSendFollowRequest, useCancelFollow } from '@/hooks/useFollow';
import type { FollowStatus } from '@/hooks/useFeed';
import { Button } from '@/components/ui/button';

interface Props {
  targetUserId: string;
  variant?: 'text' | 'button';
  /** Pre-fetched follow status from feed query to avoid N+1 requests */
  preloadedStatus?: FollowStatus;
}

export default function InlineFollowButton({ targetUserId, variant = 'text', preloadedStatus }: Props) {
  const { user } = useAuth();
  // Only fetch individually if no preloaded status was provided
  const { data: fetchedStatus } = useFollowStatus(preloadedStatus != null ? undefined : targetUserId);
  const sendFollow = useSendFollowRequest();
  const cancelFollow = useCancelFollow();

  if (!user || user.id === targetUserId) return null;

  const iFollow = preloadedStatus ?? fetchedStatus?.iFollow ?? null;
  if (iFollow === null) return null;

  if (variant === 'button') {
    if (iFollow === 'accepted') {
      return (
        <Button size="sm" variant="secondary" className="h-7 px-3 text-xs rounded-lg" onClick={(e) => { e.stopPropagation(); cancelFollow.mutate(targetUserId); }}>
          Following
        </Button>
      );
    }
    if (iFollow === 'pending') {
      return (
        <Button size="sm" variant="outline" className="h-7 px-3 text-xs rounded-lg" onClick={(e) => { e.stopPropagation(); cancelFollow.mutate(targetUserId); }}>
          Requested
        </Button>
      );
    }
    return (
      <Button size="sm" className="h-7 px-3 text-xs rounded-lg" onClick={(e) => { e.stopPropagation(); sendFollow.mutate(targetUserId); }}>
        Follow
      </Button>
    );
  }

  // text variant
  if (iFollow === 'accepted') {
    return <span className="text-xs text-muted-foreground">· Following</span>;
  }
  if (iFollow === 'pending') {
    return (
      <button onClick={(e) => { e.stopPropagation(); cancelFollow.mutate(targetUserId); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
        · Requested
      </button>
    );
  }
  return (
    <button onClick={(e) => { e.stopPropagation(); sendFollow.mutate(targetUserId); }} className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
      · Follow
    </button>
  );
}
