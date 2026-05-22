import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Phone, MessageCircle, Instagram, Facebook, Youtube, ExternalLink, Trash2, User, Building2, Loader2 } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useRemoveStaffInvitation, type StaffInvitation } from '@/hooks/useAgencyStaff';
import { toast } from 'sonner';

interface Props {
  invitation: StaffInvitation | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRequestRemove: (invitation: StaffInvitation) => void;
}

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

export default function StaffDetailSheet({ invitation, open, onOpenChange, onRequestRemove }: Props) {
  const navigate = useNavigate();
  const userId = invitation?.invited_user_id;

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
    enabled: !!userId && open,
  });

  if (!invitation) return null;

  const since = invitation.created_at;
  const sinceLabel = new Date(since).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  const duration = formatDuration(since);
  const phone = profile?.contact_number || '';
  const wa = profile?.whatsapp_number || '';

  const socials: { url: string; icon: any; label: string }[] = [];
  if (profile?.instagram) socials.push({ url: profile.instagram, icon: Instagram, label: 'Instagram' });
  if (profile?.facebook) socials.push({ url: profile.facebook, icon: Facebook, label: 'Facebook' });
  if (profile?.youtube) socials.push({ url: profile.youtube, icon: Youtube, label: 'YouTube' });
  if (profile?.tiktok) socials.push({ url: profile.tiktok, icon: ExternalLink, label: 'TikTok' });

  const ensureUrl = (u: string) => (u.startsWith('http') ? u : `https://${u}`);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-y-auto bg-background">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Header */}
            <div className="px-6 pt-10 pb-6 flex flex-col items-center text-center border-b border-border">
              <Avatar className="h-24 w-24 mb-3 ring-4 ring-primary/10">
                <AvatarImage src={profile?.profile_photo_url || ''} />
                <AvatarFallback className="text-2xl">{profile?.full_name?.[0] || '?'}</AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold text-foreground">{profile?.full_name || 'Unknown'}</h2>
              {profile?.main_job && <p className="text-sm text-muted-foreground">{profile.main_job}</p>}
              <Badge variant="secondary" className="mt-3">
                Member since {sinceLabel} · {duration}
              </Badge>
              {invitation.status !== 'accepted' && (
                <Badge variant="outline" className="mt-2 capitalize">{invitation.status}</Badge>
              )}
            </div>

            <div className="p-6 space-y-6">
              {/* Contact */}
              {(phone || wa) && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Contact</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {phone && (
                      <a href={`tel:${phone}`} className="flex items-center gap-2 p-3 rounded-xl border border-border hover:bg-muted transition">
                        <Phone className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium truncate">{phone}</span>
                      </a>
                    )}
                    {wa && (
                      <a
                        href={`https://wa.me/${wa.replace(/[^\d]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 p-3 rounded-xl border border-border hover:bg-muted transition"
                      >
                        <MessageCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium truncate">WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Socials */}
              {socials.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Social Media</h3>
                  <div className="flex gap-2 flex-wrap">
                    {socials.map(s => (
                      <a
                        key={s.label}
                        href={ensureUrl(s.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border hover:bg-muted transition"
                      >
                        <s.icon className="h-4 w-4" />
                        <span className="text-sm">{s.label}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Associated companies (current company only — RLS scoped) */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Associated Companies</h3>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-border">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">This Company</p>
                    <p className="text-xs text-muted-foreground">Joined {sinceLabel}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/freelancer/${userId}`);
                  }}
                >
                  <User className="h-4 w-4 mr-2" /> View Full Profile
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onRequestRemove(invitation)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Remove from Company
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
