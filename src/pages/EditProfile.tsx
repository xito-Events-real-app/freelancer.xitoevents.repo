import { useMyProfile } from '@/hooks/useProfile';
import { SKILLS, SkillKey } from '@/lib/constants';
import Registration from './Registration';

export default function EditProfile() {
  const { data: profile, isLoading } = useMyProfile();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const skills: Record<SkillKey, boolean> = {
    photographer: profile.photographer === 'YES',
    videographer: profile.videographer === 'YES',
    photo_editor: profile.photo_editor === 'YES',
    video_editor: profile.video_editor === 'YES',
    drone_operator: profile.drone_operator === 'YES',
    fpv_operator: profile.fpv_operator === 'YES',
    iphone_shooter: profile.iphone_shooter === 'YES',
  };

  return (
    <Registration
      editMode
      initialData={{
        account_type: (profile as any).account_type || 'solo_creative',
        business_name: (profile as any).business_name || '',
        full_name: profile.full_name,
        whatsapp_number: profile.whatsapp_number,
        contact_number: profile.contact_number,
        email: profile.email || '',
        profile_photo_url: profile.profile_photo_url || '',
        instagram: profile.instagram || '',
        facebook: profile.facebook || '',
        youtube: profile.youtube || '',
        tiktok: profile.tiktok || '',
        city: profile.city || '',
        area: profile.area || '',
        google_map_link: profile.google_map_link || '',
        pathao_landmark: profile.pathao_landmark || '',
        skills,
        main_job_override: profile.main_job || '',
        camera_body: profile.camera_body || '',
        lenses: profile.lenses || '',
        drone_model: profile.drone_model || '',
        editing_setup: profile.editing_setup || '',
        available_for_travel: profile.available_for_travel ?? true,
        preferred_event_types: profile.preferred_event_types?.split(', ').filter(Boolean) || [],
        rate_per_day: profile.rate_per_day || '',
        bank_name: profile.bank_name || '',
        bank_account_number: profile.bank_account_number || '',
        bank_account_holder: profile.bank_account_holder || '',
        portfolio_links: profile.portfolio_links?.length ? profile.portfolio_links : [''],
        bio: profile.bio || '',
      }}
    />
  );
}
