import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFreelancerById } from '@/hooks/useProfile';
import { maskName } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
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

  // If viewing own profile via freelancer link, redirect concept handled by same layout
  const rawName = (profile.account_type === 'agency' && profile.business_name) ? profile.business_name : profile.full_name;
  const displayName = isGuest ? maskName(rawName) : rawName;

  return (
    <ProfileLayout
      profile={profile}
      isOwnProfile={isOwnProfile}
      isGuest={isGuest}
      displayName={displayName}
    />
  );
}
