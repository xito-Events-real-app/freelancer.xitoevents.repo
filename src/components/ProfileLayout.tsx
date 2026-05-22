import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useViewMode } from '@/contexts/ViewModeContext';
import { differenceInDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Settings, Edit, MapPin, UserPlus, UserCheck, Clock, MessageSquare, Phone, Camera, Video, Film, ExternalLink, Grid3X3, Briefcase, CalendarDays, EyeOff } from 'lucide-react';
import { SKILLS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { normalizeMediaUrl } from '@/lib/mediaUrl';
import { useUserFeedPosts } from '@/hooks/useUserFeedPosts';
import { useUserMarketPosts } from '@/hooks/useUserMarketPosts';
import { useFollowCounts, useFollowStatus, useSendFollowRequest, useCancelFollow, useAreMutualFollowers } from '@/hooks/useFollow';
import { useGetOrCreateConversation } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import FreelancerCalendar from '@/components/FreelancerCalendar';
import ImageLightbox from '@/components/ImageLightbox';
import { LinkifiedText } from '@/components/LinkifiedText';
import type { FreelancerProfile } from '@/hooks/useProfile';
import { formatDistanceToNow } from 'date-fns';
import MyCompaniesSection from '@/components/MyCompaniesSection';

interface ProfileLayoutProps {
  profile: FreelancerProfile;
  isOwnProfile: boolean;
  isGuest: boolean;
  displayName: string;
}

export default function ProfileLayout({ profile, isOwnProfile, isGuest, displayName }: ProfileLayoutProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { effectiveMode } = useViewMode();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const openExternal = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const { data: userPosts = [], isLoading: postsLoading } = useUserFeedPosts(profile.user_id);
  const { data: userJobs = [], isLoading: jobsLoading } = useUserMarketPosts(profile.user_id);
  const { data: followCounts } = useFollowCounts(profile.user_id);
  const { data: followStatus } = useFollowStatus(profile.user_id);
  const sendFollow = useSendFollowRequest();
  const cancelFollow = useCancelFollow();
  const isMutual = useAreMutualFollowers(profile.user_id);
  const getOrCreateConvo = useGetOrCreateConversation();

  const skills = SKILLS.filter(s => profile[s.key] === 'YES');
  const memberDays = profile.created_at ? differenceInDays(new Date(), new Date(profile.created_at)) : 0;
  const imagePosts = userPosts.filter(p => !!p.image_url);
  const statusPosts = userPosts.filter(p => !p.image_url);
  const whatsappLink = profile.whatsapp_number
    ? `https://wa.me/${profile.whatsapp_number.replace(/[^0-9]/g, '')}`
    : null;

  const handleFollowAction = () => {
    if (!user) { toast({ title: 'Sign in to follow' }); navigate('/auth'); return; }
    if (followStatus?.iFollow === 'none' || followStatus?.iFollow === 'rejected') {
      sendFollow.mutate(profile.user_id);
    } else {
      cancelFollow.mutate(profile.user_id);
    }
  };

  const handleMessage = async () => {
    try {
      const convoId = await getOrCreateConvo.mutateAsync(profile.user_id);
      navigate(`/chat/${convoId}`);
    } catch {
      toast({ title: 'Could not start conversation', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="max-w-lg lg:max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="font-bold text-foreground truncate">{displayName}</h1>
          {isOwnProfile && (
            <button onClick={() => navigate('/settings')} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <Settings className="w-5 h-5 text-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-5 max-w-lg lg:max-w-3xl mx-auto space-y-4">
        {/* Avatar + Stats row */}
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 shrink-0 rounded-full bg-muted overflow-hidden border-2 border-border">
            {isGuest ? (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground bg-gradient-to-br from-primary/20 to-accent/20">?</div>
            ) : profile.profile_photo_url ? (
              <img src={profile.profile_photo_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">{displayName.charAt(0)}</div>
            )}
          </div>

          <div className="flex-1 flex justify-around text-center">
            <div>
              <p className="text-lg font-bold text-foreground">{userPosts.length}</p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{followCounts?.followers ?? 0}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{followCounts?.following ?? 0}</p>
              <p className="text-xs text-muted-foreground">Following</p>
            </div>
          </div>
        </div>

        {/* Name + Bio + Details */}
        <div className="space-y-1.5">
          <h2 className="text-sm font-bold text-foreground">{displayName}</h2>
          {profile.main_job && (
            <p className="text-sm text-primary font-semibold">{profile.main_job}</p>
          )}
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {skills.map(s => (
                <Badge key={s.key} variant="secondary" className="rounded-full text-[10px] px-2 py-0.5">{s.label}</Badge>
              ))}
            </div>
          )}
          {profile.city && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {profile.city}{profile.area ? `, ${profile.area}` : ''}
            </p>
          )}
          {/* Social Links */}
          <div className="flex items-center gap-3 pt-0.5">
            {profile.instagram ? (() => {
              const igUrl = profile.instagram!.startsWith('http') ? profile.instagram! : `https://instagram.com/${profile.instagram!.replace(/^@/, '')}`;
              return (
                <a
                  href={igUrl}
                  onClick={(e) => openExternal(e, igUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <defs>
                      <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#FEDA75"/>
                        <stop offset="25%" stopColor="#FA7E1E"/>
                        <stop offset="50%" stopColor="#D62976"/>
                        <stop offset="75%" stopColor="#962FBF"/>
                        <stop offset="100%" stopColor="#4F5BD5"/>
                      </linearGradient>
                    </defs>
                    <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig-grad)" strokeWidth="2" fill="none"/>
                    <circle cx="12" cy="12" r="5" stroke="url(#ig-grad)" strokeWidth="2" fill="none"/>
                    <circle cx="17.5" cy="6.5" r="1.5" fill="url(#ig-grad)"/>
                  </svg>
                  <span>Instagram</span>
                </a>
              );
            })() : isOwnProfile ? (
              <button
                onClick={() => navigate('/edit-profile')}
                className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor"/>
                </svg>
                <span>Add Instagram</span>
              </button>
            ) : null}
            {profile.facebook ? (() => {
              const fbUrl = profile.facebook!.startsWith('http') ? profile.facebook! : `https://facebook.com/${profile.facebook}`;
              return (
                <a
                  href={fbUrl}
                  onClick={(e) => openExternal(e, fbUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M24 12C24 5.373 18.627 0 12 0S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.875V12h3.328l-.532 3.47h-2.796v8.385C19.612 22.954 24 17.99 24 12z" fill="#1877F2"/>
                  </svg>
                  <span>Facebook</span>
                </a>
              );
            })() : isOwnProfile ? (
              <button
                onClick={() => navigate('/edit-profile')}
                className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M24 12C24 5.373 18.627 0 12 0S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.875V12h3.328l-.532 3.47h-2.796v8.385C19.612 22.954 24 17.99 24 12z" fill="currentColor"/>
                </svg>
                <span>Add Facebook</span>
              </button>
            ) : null}
            {profile.youtube ? (() => {
              const ytUrl = profile.youtube!.startsWith('http') ? profile.youtube! : `https://youtube.com/${profile.youtube}`;
              return (
                <a
                  href={ytUrl}
                  onClick={(e) => openExternal(e, ytUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FF0000"/>
                  </svg>
                  <span>YouTube</span>
                </a>
              );
            })() : isOwnProfile ? (
              <button
                onClick={() => navigate('/edit-profile')}
                className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="currentColor"/>
                </svg>
                <span>Add YouTube</span>
              </button>
            ) : null}
            {profile.tiktok ? (() => {
              const ttUrl = profile.tiktok!.startsWith('http') ? profile.tiktok! : `https://tiktok.com/@${profile.tiktok!.replace(/^@/, '')}`;
              return (
                <a
                  href={ttUrl}
                  onClick={(e) => openExternal(e, ttUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.77 1.52V6.84a4.84 4.84 0 01-1-.15z" fill="#000000"/>
                  </svg>
                  <span>TikTok</span>
                </a>
              );
            })() : isOwnProfile ? (
              <button
                onClick={() => navigate('/edit-profile')}
                className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.77 1.52V6.84a4.84 4.84 0 01-1-.15z" fill="currentColor"/>
                </svg>
                <span>Add TikTok</span>
              </button>
            ) : null}
          </div>
          {profile.bio && (
            <p className="text-sm text-foreground leading-relaxed">{profile.bio}</p>
          )}
          {profile.portfolio_links && profile.portfolio_links.filter(l => l && l.trim()).length > 0 && (
            <div className="space-y-1 pt-0.5">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> Portfolio
              </p>
              <div className="flex flex-col gap-1">
                {profile.portfolio_links.filter(l => l && l.trim()).map((link, i) => {
                  const href = link.startsWith('http') ? link : `https://${link}`;
                  return (
                    <a
                      key={i}
                      href={href}
                      onClick={(e) => openExternal(e, href)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline truncate"
                    >
                      {link}
                    </a>
                  );
                })}
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" /> Member for {memberDays} day{memberDays !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Action buttons */}
        {isOwnProfile ? (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-9 rounded-lg text-sm" onClick={() => navigate('/edit-profile')}>
              <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit Profile
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                className={cn(
                  'flex-1 h-9 rounded-lg text-sm',
                  followStatus?.iFollow === 'accepted' && 'bg-muted text-foreground hover:bg-muted/80',
                  followStatus?.iFollow === 'pending' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                )}
                variant={followStatus?.iFollow === 'none' || followStatus?.iFollow === 'rejected' ? 'default' : 'outline'}
                onClick={handleFollowAction}
                disabled={sendFollow.isPending || cancelFollow.isPending}
              >
                {followStatus?.iFollow === 'accepted' ? (
                  <><UserCheck className="w-3.5 h-3.5 mr-1" /> Following</>
                ) : followStatus?.iFollow === 'pending' ? (
                  <><Clock className="w-3.5 h-3.5 mr-1" /> Requested</>
                ) : (
                  <><UserPlus className="w-3.5 h-3.5 mr-1" /> Follow</>
                )}
              </Button>
              {isMutual && (
                <Button variant="outline" className="flex-1 h-9 rounded-lg text-sm" onClick={handleMessage} disabled={getOrCreateConvo.isPending}>
                  <MessageSquare className="w-3.5 h-3.5 mr-1" /> Message
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {(whatsappLink || isGuest) && (
                <Button
                  className="flex-1 h-9 rounded-lg text-sm bg-accent hover:bg-accent/90"
                  onClick={isGuest ? () => { toast({ title: `Sign up to contact ${displayName}` }); navigate('/auth'); } : undefined}
                  asChild={!isGuest}
                >
                  {isGuest ? <><Phone className="w-3.5 h-3.5 mr-1" /> WhatsApp</> : (
                    <a href={whatsappLink!} target="_blank" rel="noopener noreferrer"><Phone className="w-3.5 h-3.5 mr-1" /> WhatsApp</a>
                  )}
                </Button>
              )}
              {(profile.contact_number || isGuest) && (
                <Button
                  variant="outline"
                  className="flex-1 h-9 rounded-lg text-sm"
                  onClick={isGuest ? () => { toast({ title: `Sign up to contact ${displayName}` }); navigate('/auth'); } : undefined}
                  asChild={!isGuest}
                >
                  {isGuest ? <><Phone className="w-3.5 h-3.5 mr-1" /> Call</> : (
                    <a href={`tel:${profile.contact_number}`}><Phone className="w-3.5 h-3.5 mr-1" /> Call</a>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* My Companies — visible on own profile only */}
        {isOwnProfile && (
          <div className="pt-2">
            <MyCompaniesSection />
          </div>
        )}

        {/* Tabs: Posts / Bookings / Status / Jobs */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-11 bg-transparent border-b border-border rounded-none p-0">
            <TabsTrigger value="posts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 text-xs sm:text-sm">
              <Grid3X3 className="w-4 h-4" /> Posts
            </TabsTrigger>
            <TabsTrigger value="bookings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 text-xs sm:text-sm">
              <CalendarDays className="w-4 h-4" /> Bookings
            </TabsTrigger>
            <TabsTrigger value="status" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 text-xs sm:text-sm">
              <MessageSquare className="w-4 h-4" /> Status
            </TabsTrigger>
            <TabsTrigger value="jobs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 text-xs sm:text-sm">
              <Briefcase className="w-4 h-4" /> Jobs
            </TabsTrigger>
          </TabsList>

          {/* Posts Grid (image posts only) */}
          <TabsContent value="posts" className="mt-1">
            {postsLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : imagePosts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Grid3X3 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No photo posts yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {imagePosts.map((post) => {
                  const imageUrl = normalizeMediaUrl(post.image_url);
                  return (
                    <button
                      key={post.id}
                      onClick={() => navigate(`/profile-posts/${profile.user_id}/${post.id}`)}
                      className="aspect-square bg-muted relative overflow-hidden group"
                    >
                      {imageUrl && (
                        <img src={imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="text-white text-xs font-semibold">❤ {post.likes_count}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Bookings */}
          <TabsContent value="bookings" className="mt-2">
            {profile.hide_booking_dates && !isOwnProfile ? (
              <div className="text-center py-12 text-muted-foreground">
                <EyeOff className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{profile.full_name.split(' ')[0]} has hidden their booking dates</p>
              </div>
            ) : (
              <div className="[&_.aspect-square]:!text-xs">
                <FreelancerCalendar userId={profile.user_id} userName={displayName} />
              </div>
            )}
          </TabsContent>

          {/* Status (text-only posts as feed) */}
          <TabsContent value="status" className="mt-2">
            {postsLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : statusPosts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No status updates yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {statusPosts.map((post) => (
                  <div key={post.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={post.author_photo || ''} />
                        <AvatarFallback className="text-xs">{post.author_name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{post.author_name}</p>
                        <p className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</p>
                      </div>
                    </div>
                    <LinkifiedText text={post.content || ''} className="text-sm text-foreground" />
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">❤ {post.likes_count}</span>
                      <span className="flex items-center gap-1">💬 {post.comments_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Jobs list */}
          <TabsContent value="jobs" className="mt-2">
            {jobsLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : userJobs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No job posts yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {userJobs.map((job) => (
                  <div key={job.id} className="bg-card border border-border rounded-xl p-3 space-y-1">
                    <p className="text-sm font-semibold text-foreground">{job.event_name}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {job.default_city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.default_city}</span>}
                      {job.freelancer_type && <Badge variant="secondary" className="text-[10px] rounded-full px-1.5 py-0">{job.freelancer_type}</Badge>}
                      {job.total_price && <span className="text-primary font-semibold">Rs. {job.total_price}</span>}
                    </div>
                    {(job as any).market_post_dates?.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {(job as any).market_post_dates.length} date{(job as any).market_post_dates.length > 1 ? 's' : ''}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

      </div>

      {lightboxUrl && <ImageLightbox src={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
}
