import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Users, Megaphone, Loader2, ChevronRight, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAgencySettings, useUpdateAgencySettings } from '@/hooks/useAgencySettings';
import {
  useAgencyStaffInvitations,
  useRealtimeStaffInvitations,
} from '@/hooks/useAgencyStaff';
import { useToast } from '@/hooks/use-toast';
import { getStoredFinanceSession } from '@/hooks/useAgencyFinance';
import FinancePinGate from '@/components/company/FinancePinGate';
import AddStaffDialog from '@/components/company/AddStaffDialog';

/* ── Sources Tag Manager ── */
function SourcesManager({ items, onUpdate }: { items: string[]; onUpdate: (items: string[]) => void }) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    const val = input.trim().toUpperCase();
    if (!val || items.includes(val)) return;
    onUpdate([...items, val]);
    setInput('');
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Megaphone className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-bold text-foreground">Lead Sources</h3>
        </div>
        <div className="flex gap-2 mb-4">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Add source..."
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
          />
          <Button onClick={handleAdd} size="sm" className="shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.map(item => (
            <Badge key={item} variant="secondary" className="gap-1 py-1">
              {item}
              <button onClick={() => onUpdate(items.filter(i => i !== item))} className="hover:text-destructive transition-colors">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">No sources yet</p>}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Duration helper ── */
function memberDuration(iso: string) {
  const from = new Date(iso);
  const now = new Date();
  let months = (now.getFullYear() - from.getFullYear()) * 12 + (now.getMonth() - from.getMonth());
  if (now.getDate() < from.getDate()) months--;
  if (months < 1) return '<1mo';
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m}mo`;
  if (m === 0) return `${y}y`;
  return `${y}y ${m}mo`;
}

/* ── Staff Manager ── */
function StaffManager() {
  const navigate = useNavigate();
  const { data: invitations = [], isLoading } = useAgencyStaffInvitations();
  useRealtimeStaffInvitations();

  const [pinGateOpen, setPinGateOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const handleAddClick = () => {
    if (getStoredFinanceSession()?.token) setAddOpen(true);
    else setPinGateOpen(true);
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-bold text-foreground">Company Staff</h3>
          </div>
          <Button size="sm" onClick={handleAddClick}>
            <UserPlus className="h-4 w-4 mr-1" /> Add Staff
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No staff added yet</p>
            <p className="text-xs text-muted-foreground mt-1">Tap "Add Staff" to invite members</p>
          </div>
        ) : (
          <div className="space-y-2">
            {invitations.map(inv => (
              <button
                key={inv.id}
                onClick={() => navigate(`/company/settings/staff/${inv.id}`)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted transition-colors text-left"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={inv.profile?.profile_photo_url || ''} />
                  <AvatarFallback>{inv.profile?.full_name?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {inv.profile?.full_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {inv.profile?.main_job || 'Staff'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {inv.status === 'accepted' ? (
                    <Badge variant="secondary" className="text-[10px] font-medium">
                      {memberDuration(inv.created_at)}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {inv.status}
                    </Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}

        <AddStaffDialog open={addOpen} onOpenChange={setAddOpen} />

        <Dialog open={pinGateOpen} onOpenChange={setPinGateOpen}>
          <DialogContent className="max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-none">
            <FinancePinGate
              onUnlocked={() => {
                setPinGateOpen(false);
                setAddOpen(true);
              }}
              title="Verify Finance PIN"
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

/* ── Main Page ── */
export default function CompanySettings() {
  const { data: settings, isLoading } = useAgencySettings();
  const updateSettings = useUpdateAgencySettings();
  const { toast } = useToast();

  const handleUpdateSources = async (values: string[]) => {
    try {
      await updateSettings.mutateAsync({ sources: values });
    } catch {
      toast({ title: 'Failed to update settings', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-6 py-4">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your company staff and lead sources</p>
      </div>
      <div className="px-4 md:px-6 py-6 max-w-3xl mx-auto space-y-6">
        <StaffManager />
        <SourcesManager
          items={settings?.sources ?? []}
          onUpdate={vals => handleUpdateSources(vals)}
        />
      </div>
    </div>
  );
}
