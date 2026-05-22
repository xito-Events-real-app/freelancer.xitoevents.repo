import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Camera, Video, Plane, UserPlus, Search, Clock, Check, X, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMyProfile } from '@/hooks/useProfile';
import {
  useSearchFreelancers,
  useAgencyFreelancerInvitations,
  useSendFreelancerInvitation,
  useRemoveStaffInvitation,
  useAcceptedStaffProfiles,
  useRealtimeStaffInvitations,
} from '@/hooks/useAgencyStaff';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

/* ───── Dashboard Tab ───── */
function DashboardTab() {
  const { user } = useAuth();
  const { data: profile } = useMyProfile();
  const { data: staff = [] } = useAcceptedStaffProfiles();
  const { data: invitations = [] } = useAgencyFreelancerInvitations();
  const sendInvite = useSendFreelancerInvitation();
  const removeInvite = useRemoveStaffInvitation();
  useRealtimeStaffInvitations();
  const [searchQ, setSearchQ] = useState('');
  const { data: searchResults = [] } = useSearchFreelancers(searchQ);
  const [dialogOpen, setDialogOpen] = useState(false);

  const pendingInvitations = invitations.filter(i => i.status === 'pending');
  const acceptedInvitations = invitations.filter(i => i.status === 'accepted');

  const stats = useMemo(() => {
    const counts = { photographers: 0, videographers: 0, droneOps: 0, assistants: 0 };
    staff.forEach(s => {
      if (s.photographer === 'YES') counts.photographers++;
      if (s.videographer === 'YES') counts.videographers++;
      if (s.drone_operator === 'YES') counts.droneOps++;
      if (s.main_job?.toLowerCase().includes('assistant')) counts.assistants++;
    });
    return counts;
  }, [staff]);

  const alreadyInvitedIds = new Set(invitations.map(i => i.invited_user_id));


  const handleInvite = async (userId: string) => {
    try {
      await sendInvite.mutateAsync(userId);
      toast.success('Invitation sent!');
    } catch {
      toast.error('Failed to send invitation');
    }
  };

  const companyName = profile?.business_name || profile?.full_name || 'Company';

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.photographers}</p>
            <p className="text-xs text-muted-foreground">Photographers</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.videographers}</p>
            <p className="text-xs text-muted-foreground">Videographers</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Plane className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.droneOps}</p>
            <p className="text-xs text-muted-foreground">Drone Operators</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.assistants}</p>
            <p className="text-xs text-muted-foreground">Assistants</p>
          </div>
        </Card>
      </div>

      {/* Add Freelancer */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Team Management</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <UserPlus className="w-4 h-4" /> Add Freelancer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Invite Freelancer to {companyName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Once invited, freelancers will receive a casual notification to join your crew. Accepting makes it easy to assign them to events.
              </p>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {searchResults.map(fr => {
                  const already = alreadyInvitedIds.has(fr.user_id) || fr.user_id === user?.id;
                  return (
                    <div key={fr.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={fr.profile_photo_url || ''} />
                        <AvatarFallback>{fr.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{fr.full_name}</p>
                        <p className="text-xs text-muted-foreground">{fr.main_job || 'Freelancer'}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={already ? 'outline' : 'default'}
                        disabled={already || sendInvite.isPending}
                        onClick={() => handleInvite(fr.user_id)}
                      >
                        {already ? 'Invited' : 'Invite'}
                      </Button>
                    </div>
                  );
                })}
                {searchQ.length >= 2 && searchResults.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No freelancers found</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4" /> Pending Invitations ({pendingInvitations.length})
          </h3>
          <div className="space-y-2">
            {pendingInvitations.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={inv.profile?.profile_photo_url || ''} />
                  <AvatarFallback>{inv.profile?.full_name?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{inv.profile?.full_name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{inv.profile?.main_job || ''}</p>
                </div>
                <Badge variant="secondary" className="text-xs">Pending</Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-destructive"
                  onClick={() => removeInvite.mutate(inv.id)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Accepted Staff Summary */}
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600" /> Active Team Members ({acceptedInvitations.length})
        </h3>
        {acceptedInvitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No team members yet. Invite freelancers to build your crew!</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {acceptedInvitations.map(inv => (
              <div key={inv.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                <Avatar className="w-7 h-7">
                  <AvatarImage src={inv.profile?.profile_photo_url || ''} />
                  <AvatarFallback>{inv.profile?.full_name?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{inv.profile?.full_name}</p>
                  <p className="text-[10px] text-muted-foreground">{inv.profile?.main_job}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ───── Main Page ───── */
export default function CompanyMyFreelancers() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6">
        <h1 className="text-xl font-bold mb-4">My Freelancers</h1>
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="list" onClick={() => navigate('/company/my-freelancers/list')}>
              Freelancer List
            </TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard">
            <DashboardTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
