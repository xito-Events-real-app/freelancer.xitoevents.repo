import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import type { PostLiker } from '@/hooks/useFeed';

interface LikersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  likers: PostLiker[];
  isLoading: boolean;
  title?: string;
}

export default function LikersDialog({ open, onOpenChange, likers, isLoading, title = 'Liked by' }: LikersDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : likers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No likes yet</p>
          ) : (
            likers.map((liker) => (
              <div
                key={liker.user_id}
                className="flex items-center gap-3 cursor-pointer hover:bg-muted rounded-lg p-2 -mx-2 transition-colors"
                onClick={() => {
                  if (liker.profile_id) {
                    navigate(`/freelancer/${liker.profile_id}`);
                    onOpenChange(false);
                  }
                }}
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={liker.profile_photo_url || ''} />
                  <AvatarFallback>{liker.full_name[0]}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{liker.full_name}</span>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
