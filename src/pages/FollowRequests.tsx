import { useNavigate } from 'react-router-dom';
import { usePendingFollowRequests, useAcceptFollow, useRejectFollow, useRealtimeFollows } from '@/hooks/useFollow';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserCheck, UserX, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function FollowRequests() {
  const navigate = useNavigate();
  const { data: requests = [], isLoading } = usePendingFollowRequests();
  const accept = useAcceptFollow();
  const reject = useRejectFollow();
  useRealtimeFollows();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="max-w-lg lg:max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-foreground">Follow Requests</h1>
        </div>
      </div>

      <div className="px-4 py-4 max-w-lg lg:max-w-3xl mx-auto space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No pending requests</p>
        ) : (
          requests.map((req) => (
            <div key={req.id} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
              <Avatar
                className="h-12 w-12 cursor-pointer"
                onClick={() => req.profile && navigate(`/freelancer/${req.profile.id}`)}
              >
                <AvatarImage src={req.profile?.profile_photo_url || ''} />
                <AvatarFallback>{req.profile?.display_name?.[0] ?? '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold truncate cursor-pointer hover:underline"
                  onClick={() => req.profile && navigate(`/freelancer/${req.profile.id}`)}
                >
                  {req.profile?.display_name ?? 'Unknown'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-8 rounded-lg"
                  onClick={() => accept.mutate(req.follower_id)}
                  disabled={accept.isPending || reject.isPending}
                >
                  <UserCheck className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg"
                  onClick={() => reject.mutate(req.follower_id)}
                  disabled={accept.isPending || reject.isPending}
                >
                  <UserX className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
