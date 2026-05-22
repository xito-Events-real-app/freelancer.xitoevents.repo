import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDisplayName, getDisplayInitial } from '@/lib/utils';
import { useMyProfile, useUpsertProfile } from '@/hooks/useProfile';
import { usePendingFollowCount, useRealtimeFollows } from '@/hooks/useFollow';
import { useViewMode } from '@/contexts/ViewModeContext';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ShieldCheck, Eye, EyeOff, Mail, Calendar, UserPlus, LogOut, User, Pencil, Monitor, Smartphone, MonitorSmartphone, Share2, Shield } from 'lucide-react';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { toast } from 'sonner';

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useMyProfile();
  const upsert = useUpsertProfile();
  const { data: pendingCount = 0 } = usePendingFollowCount();
  const { viewMode, setViewMode } = useViewMode();
  useRealtimeFollows();
  const { isAdmin } = useIsAdmin();

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    navigate('/register');
    return null;
  }

  const handleToggle = async (field: 'hide_booking_dates' | 'hide_email', value: boolean) => {
    try {
      await upsert.mutateAsync({ [field]: value });
      toast.success('Privacy setting updated');
    } catch {
      toast.error('Failed to update setting');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="max-w-lg lg:max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-foreground">Settings</h1>
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg lg:max-w-3xl mx-auto space-y-6">
        {/* Profile card */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14">
              <AvatarImage src={profile.profile_photo_url || ''} />
              <AvatarFallback className="text-lg">{getDisplayInitial(profile)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{getDisplayName(profile)}</p>
              {profile.main_job && <p className="text-xs text-muted-foreground">{profile.main_job}</p>}
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-lg"
              onClick={() => navigate('/profile')}
            >
              <User className="w-4 h-4 mr-1" /> View Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-lg"
              onClick={() => navigate('/edit-profile')}
            >
              <Pencil className="w-4 h-4 mr-1" /> Edit Profile
            </Button>
          </div>
        </div>

        {/* Follow requests */}
        <button
          onClick={() => navigate('/follow-requests')}
          className="w-full bg-card rounded-2xl border border-border p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <UserPlus className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-foreground">Follow Requests</p>
            <p className="text-xs text-muted-foreground">Review pending requests</p>
          </div>
          {pendingCount > 0 && (
            <span className="w-6 h-6 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </button>

        {/* Invite Friends */}
        <button
          onClick={async () => {
            const text = `🎬 Calling all Photographers & Videographers across Nepal!\n\nJoin Xito Crew — the app built for us. Whether you're in Kathmandu, Pokhara, or anywhere in Nepal:\n\n📸 Showcase your portfolio & get discovered\n📅 Manage your bookings & availability\n🤝 Find freelancers for your next project\n💬 Connect directly with clients & creators\n🛒 Buy/sell gear and post opportunities\n\nStop missing out on work. Join the crew today!\n👉 https://freelancer.xitoevents.com`;
            try {
              if (navigator.share) {
                await navigator.share({ title: 'Join Xito Crew', text });
              } else {
                await navigator.clipboard.writeText(text);
                toast.success('Invite message copied! Share it with your friends');
              }
            } catch (e: any) {
              if (e?.name !== 'AbortError') {
                await navigator.clipboard.writeText(text);
                toast.success('Invite message copied! Share it with your friends');
              }
            }
          }}
          className="w-full bg-primary text-primary-foreground rounded-2xl p-4 flex items-center gap-3 hover:bg-primary/90 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
            <Share2 className="w-4 h-4" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold">Invite Friends</p>
            <p className="text-xs opacity-80">Share Xito Crew with photographers & videographers</p>
          </div>
        </button>

        {/* Privacy section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Privacy Controls</h2>
          </div>
          <p className="text-xs text-muted-foreground px-1">
            Control what other freelancers and clients can see on your profile.
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border divide-y divide-border">
          {/* Hide booking dates */}
          <div className="flex items-center justify-between p-4 gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                {profile.hide_booking_dates ? <EyeOff className="w-4 h-4 text-primary" /> : <Calendar className="w-4 h-4 text-primary" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Hide Booking Dates</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Others won't see your calendar, but you'll still appear in date-based searches.
                </p>
              </div>
            </div>
            <Switch
              checked={!!profile.hide_booking_dates}
              onCheckedChange={(val) => handleToggle('hide_booking_dates', val)}
              disabled={upsert.isPending}
            />
          </div>

          {/* Hide email */}
          <div className="flex items-center justify-between p-4 gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                {profile.hide_email ? <EyeOff className="w-4 h-4 text-primary" /> : <Mail className="w-4 h-4 text-primary" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Hide Email Address</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your email won't be visible on your public profile.
                </p>
              </div>
            </div>
            <Switch
              checked={!!profile.hide_email}
              onCheckedChange={(val) => handleToggle('hide_email', val)}
              disabled={upsert.isPending}
            />
          </div>
        </div>

        {/* Display Mode */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Monitor className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Display Mode</h2>
          </div>
          <p className="text-xs text-muted-foreground px-1">
            Choose how the app layout should appear.
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4">
          <RadioGroup
            value={viewMode}
            onValueChange={(val) => setViewMode(val as 'auto' | 'mobile' | 'desktop')}
            className="space-y-3"
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem value="auto" id="mode-auto" />
              <Label htmlFor="mode-auto" className="flex items-center gap-2 cursor-pointer flex-1">
                <MonitorSmartphone className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold">Auto Detect</p>
                  <p className="text-xs text-muted-foreground">Desktop on large screens, mobile on small</p>
                </div>
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <RadioGroupItem value="mobile" id="mode-mobile" />
              <Label htmlFor="mode-mobile" className="flex items-center gap-2 cursor-pointer flex-1">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold">Mobile</p>
                  <p className="text-xs text-muted-foreground">Always use mobile layout</p>
                </div>
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <RadioGroupItem value="desktop" id="mode-desktop" />
              <Label htmlFor="mode-desktop" className="flex items-center gap-2 cursor-pointer flex-1">
                <Monitor className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold">Desktop</p>
                  <p className="text-xs text-muted-foreground">Always use sidebar layout</p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Admin panel link (admins only) */}
        {isAdmin && (
          <Button
            variant="outline"
            className="w-full rounded-xl h-11 border-primary/40 text-primary hover:bg-primary/10"
            onClick={() => navigate('/admin')}
          >
            <Shield className="w-4 h-4 mr-2" /> Super Admin Panel
          </Button>
        )}

        {/* Sign out */}
        <Button
          variant="outline"
          className="w-full rounded-xl h-11 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>
    </div>
  );
}
