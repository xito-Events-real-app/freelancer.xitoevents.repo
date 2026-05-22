import { useState } from 'react';
import { Loader2, Plus, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  useAgencyStaffInvitations,
  useSearchFreelancers,
  useSendStaffInvitation,
} from '@/hooks/useAgencyStaff';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function AddStaffDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const { data: results = [], isLoading: searching } = useSearchFreelancers(query);
  const { data: invitations = [] } = useAgencyStaffInvitations();
  const sendInvite = useSendStaffInvitation();

  const invitedIds = new Set(invitations.map(i => i.invited_user_id));
  const filteredResults = results.filter(r => r.user_id !== user?.id && !invitedIds.has(r.user_id));

  const handleInvite = async (userId: string) => {
    try {
      await sendInvite.mutateAsync(userId);
      toast.success('Staff invitation sent');
      setQuery('');
      onOpenChange(false);
    } catch {
      toast.error('Failed to send invitation');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Staff Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search freelancers by name..."
              className="pl-9"
            />
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1">
            {searching && (
              <div className="p-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching...
              </div>
            )}
            {!searching && query.length >= 2 && filteredResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No freelancers found</p>
            )}
            {filteredResults.map(r => (
              <button
                key={r.user_id}
                onClick={() => handleInvite(r.user_id)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted text-left transition-colors"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={r.profile_photo_url || ''} />
                  <AvatarFallback>{r.full_name?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.full_name}</p>
                  {r.main_job && <p className="text-xs text-muted-foreground truncate">{r.main_job}</p>}
                </div>
                <Plus className="h-4 w-4 text-primary shrink-0" />
              </button>
            ))}
            {query.length < 2 && (
              <p className="text-sm text-muted-foreground text-center py-6">Type at least 2 characters to search</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
