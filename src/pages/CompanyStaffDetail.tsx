import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Phone, MessageCircle, Instagram, Facebook, Youtube, ExternalLink,
  Trash2, User, Building2, Loader2, MapPin, Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import {
  useAgencyStaffInvitations,
  useRemoveStaffInvitation,
  type StaffInvitation,
} from '@/hooks/useAgencyStaff';
import { getStoredFinanceSession } from '@/hooks/useAgencyFinance';
import FinancePinGate from '@/components/company/FinancePinGate';
import StaffRolesCard from '@/components/company/StaffRolesCard';
import { useActiveCompany } from '@/contexts/ActiveCompanyContext';
import { toast as sonner } from 'sonner';
import { useState } from 'react';

function formatDuration(fromIso: string) {
  const from = new Date(fromIso);
  const now = new Date();
  let months = (now.getFullYear() - from.getFullYear()) * 12 + (now.getMonth() - from.getMonth());
  if (now.getDate() < from.getDate()) months--;
  if (months < 1) return 'Less than a month';
  const years = Math.floor(months / 12);
  const m = months % 12;
  if (years === 0) return `${m}mo`;
  if (m === 0) return `${years}y`;
  return `${years}y ${m}mo`;
}

export default function CompanyStaffDetail() {
  const { invitationId } = useParams<{ invitationId: string }>();
  const navigate = useNavigate();
  const { data: invitations = [] } = useAgencyStaffInvitations();
  const invitation: StaffInvitation | undefined = invitations.find(i => i.id === invitationId);
  const userId = invitation?.invited_user_id;
  const { activeAgencyId, isOwner } = useActiveCompany();

  const removeInvite = useRemoveStaffInvitation();
  const [pinOpen, setPinOpen] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['staff-detail-profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('freelancer_profiles')
        .select('user_id, full_name, profile_photo_url, main_job, contact_number, whatsapp_number, instagram, facebook, tiktok, youtube, business_name, city, area')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Associated companies — all agencies this user is accepted into
  const { data: associated = [] } = useQuery({
    queryKey: ['staff-associated-companies', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('agency_staff_invitations')
        .select('id, agency_user_id, created_at, status')
        .eq('invited_user_id', userId)
        .eq('status', 'accepted');
      if (error) throw error;
      const ids = (data || []).map(d => d.agency_user_id);
      if (!ids.length) return [];
      const { data: profiles } = await supabase
        .from('freelancer_profiles')
        .select('user_id, full_name, business_name, profile_photo_url')
        .in('user_id', ids);
      const map = new Map((profiles || []).map(p => [p.user_id, p]));
      // Dedupe by agency — same user can be invited as both staff & freelancer
      const seen = new Map<string, { id: string; since: string; agency_user_id: string; name: string; photo: string | null }>();
      for (const d of data || []) {
        const existing = seen.get(d.agency_user_id);
        const since = d.created_at;
        if (existing && new Date(existing.since) <= new Date(since)) continue;
        seen.set(d.agency_user_id, {
          id: d.id,
          since,
          agency_user_id: d.agency_user_id,
          name: map.get(d.agency_user_id)?.business_name || map.get(d.agency_user_id)?.full_name || 'Unknown company',
          photo: map.get(d.agency_user_id)?.profile_photo_url || null,
        });
      }
      return Array.from(seen.values());
    },
    enabled: !!userId,
  });

  const doRemove = async () => {
    if (!invitation) return;
    try {
      await removeInvite.mutateAsync(invitation.id);
      sonner.success('Staff member removed');
      navigate(-1);
    } catch {
      sonner.error('Failed to remove');
    }
  };

  const handleRemoveClick = () => {
    if (getStoredFinanceSession()?.token) doRemove();
    else setPinOpen(true);
  };

  if (isLoading || !invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const since = invitation.created_at;
  const sinceLabel = new Date(since).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  const duration = formatDuration(since);
  const phone = profile?.contact_number || '';
  const wa = profile?.whatsapp_number || '';

  const socials: { url: string; icon: any; label: string; color: string }[] = [];
  if (profile?.instagram) socials.push({ url: profile.instagram, icon: Instagram, label: 'Instagram', color: 'text-pink-600' });
  if (profile?.facebook) socials.push({ url: profile.facebook, icon: Facebook, label: 'Facebook', color: 'text-blue-600' });
  if (profile?.youtube) socials.push({ url: profile.youtube, icon: Youtube, label: 'YouTube', color: 'text-red-600' });
  if (profile?.tiktok) socials.push({ url: profile.tiktok, icon: ExternalLink, label: 'TikTok', color: 'text-foreground' });

  const ensureUrl = (u: string) => (u.startsWith('http') ? u : `https://${u}`);
  const location = [profile?.area, profile?.city].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <nav className="flex items-center gap-1 text-xs text-muted-foreground">
                <button
                  onClick={() => navigate('/company/settings')}
                  className="hover:text-foreground transition-colors"
                >
                  Company Settings
                </button>
                <span>/</span>
                <span className="text-foreground font-medium">Staff</span>
                <span>/</span>
                <span className="text-foreground font-medium truncate">
                  {profile?.full_name || 'Details'}
                </span>
              </nav>
              <h1 className="text-lg font-bold text-foreground truncate">
                {profile?.full_name || 'Staff Details'}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
        <div className="grid md:grid-cols-[320px_1fr] gap-6">
          {/* Left column: square photo + identity */}
          <div className="space-y-4">
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-muted border border-border">
              {profile?.profile_photo_url ? (
                <img
                  src={profile.profile_photo_url}
                  alt={profile.full_name || 'Staff'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="h-20 w-20 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <h2 className="text-2xl font-bold text-foreground leading-tight">
                {profile?.full_name || 'Unknown'}
              </h2>
              {profile?.main_job && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>{profile.main_job}</span>
                </div>
              )}
              {location && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{location}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="secondary">Member since {sinceLabel} · {duration}</Badge>
                {invitation.status !== 'accepted' && (
                  <Badge variant="outline" className="capitalize">{invitation.status}</Badge>
                )}
              </div>
            </div>
            <Button
              asChild
              variant="outline"
              className="w-full h-11 rounded-xl"
            >
              <a href={`/freelancer/${userId}`} target="_blank" rel="noreferrer">
                <User className="h-4 w-4 mr-2" /> View Full Profile
              </a>
            </Button>
          </div>

          {/* Right column: details */}
          <div className="space-y-5">
            {/* Contact */}
            {(phone || wa) && (
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Contact</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {phone && (
                      <a href={`tel:${phone}`} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted transition">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Phone className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="text-sm font-semibold truncate">{phone}</p>
                        </div>
                      </a>
                    )}
                    {wa && (
                      <a
                        href={`https://wa.me/${wa.replace(/[^\d]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted transition"
                      >
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <MessageCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">WhatsApp</p>
                          <p className="text-sm font-semibold truncate">{wa}</p>
                        </div>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Socials */}
            {socials.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Social Media</h3>
                  <div className="flex flex-wrap gap-2">
                    {socials.map(s => (
                      <a
                        key={s.label}
                        href={ensureUrl(s.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition"
                      >
                        <s.icon className={`h-4 w-4 ${s.color}`} />
                        <span className="text-sm font-medium">{s.label}</span>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Associated Companies */}
            <Card>
              <CardContent className="p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Associated Companies
                </h3>
                {associated.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No associations</p>
                ) : (
                  <div className="space-y-2">
                    {associated.map(a => (
                      <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                          {a.photo ? (
                            <img src={a.photo} alt={a.name} className="w-full h-full object-cover" />
                          ) : (
                            <Building2 className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{a.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Joined {new Date(a.since).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Roles & Access */}
            {activeAgencyId && userId && (
              <StaffRolesCard agencyUserId={activeAgencyId} staffUserId={userId} staffName={profile?.full_name} />
            )}

            {/* Danger zone — owner only */}
            {isOwner && (
              <Card className="border-destructive/30">
                <CardContent className="p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-destructive mb-1">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Removing this staff member revokes their access to the company.
                  </p>
                  <Button
                    variant="outline"
                    className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={handleRemoveClick}
                    disabled={removeInvite.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {removeInvite.isPending ? 'Removing…' : 'Remove from Company'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-none">
          <FinancePinGate
            onUnlocked={() => {
              setPinOpen(false);
              doRemove();
            }}
            title="Verify Finance PIN"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
