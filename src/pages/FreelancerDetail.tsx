import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/AuthContext';
import { useFreelancerById } from '@/hooks/useProfile';
import { maskName } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import ProfileLayout from '@/components/ProfileLayout';

export default function FreelancerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile, isLoading } = useFreelancerById(id);
  const isGuest = !user;
  const isOwnProfile = !!(user && profile && user.id === profile.user_id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Freelancer not found</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const rawName = (profile.account_type === 'agency' && profile.business_name) ? profile.business_name : profile.full_name;
  const displayName = isGuest ? maskName(rawName) : rawName;
  const skill = (profile as any).primary_skill || (profile as any).skill || 'Wedding Creative';
  const city = (profile as any).city || 'Nepal';
  const url = `https://photography.xitoevents.com/freelancer/${id}`;
  const title = `${displayName} — ${skill} in ${city} | Xito`;
  const description = `View ${displayName}'s portfolio on Xito. ${skill} based in ${city}. Browse work, check availability and get in touch.`;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="profile" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          "url": url,
          "mainEntity": {
            "@type": "Person",
            "name": displayName,
            "jobTitle": skill,
            "address": { "@type": "PostalAddress", "addressLocality": city, "addressCountry": "NP" }
          }
        })}</script>
      </Helmet>
      <ProfileLayout
        profile={profile}
        isOwnProfile={isOwnProfile}
        isGuest={isGuest}
        displayName={displayName}
      />
    </>
  );
}
