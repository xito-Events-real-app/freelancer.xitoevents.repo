import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMyProfile } from '@/hooks/useProfile';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProfileLayout from '@/components/ProfileLayout';

export default function Profile() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useMyProfile();
  const navigate = useNavigate();

  // Guest view
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center pb-20 px-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <UserPlus className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Join the Community</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Sign up to create your profile, contact freelancers, and find work opportunities.
            </p>
          </div>
          <Button onClick={() => navigate('/auth')} className="w-full h-12 rounded-xl text-base font-semibold">
            Sign Up / Log In
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <ProfileLayout
      profile={profile}
      isOwnProfile={true}
      isGuest={false}
      displayName={(profile.account_type === 'agency' && profile.business_name) ? profile.business_name : profile.full_name}
    />
  );
}
