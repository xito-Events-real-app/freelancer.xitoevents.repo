import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type FreelancerProfile = {
  id: string;
  user_id: string;
  full_name: string;
  contact_number: string;
  whatsapp_number: string;
  email: string | null;
  profile_photo_url: string | null;
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
  tiktok: string | null;
  city: string | null;
  area: string | null;
  google_map_link: string | null;
  pathao_landmark: string | null;
  main_job: string | null;
  photographer: string | null;
  videographer: string | null;
  photo_editor: string | null;
  video_editor: string | null;
  hybrid_shooter: string | null;
  hybrid_editor: string | null;
  drone_operator: string | null;
  fpv_operator: string | null;
  iphone_shooter: string | null;
  camera_body: string | null;
  lenses: string | null;
  drone_model: string | null;
  editing_setup: string | null;
  available_for_travel: boolean | null;
  preferred_event_types: string | null;
  rate_per_day: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  portfolio_links: string[] | null;
  bio: string | null;
  hide_booking_dates: boolean;
  hide_email: boolean;
  account_type: string;
  business_name: string | null;
  contact_person_2_name: string | null;
  contact_person_2_number: string | null;
  contact_person_2_whatsapp: string | null;
  contact_person_3_name: string | null;
  contact_person_3_number: string | null;
  contact_person_3_whatsapp: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export function useMyProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // 1) Always try to merge any orphan imported data (matched by verified
      // email on auth.users) into THIS auth user. Safe to call every time:
      // - if no orphan match → no-op
      // - if a profile already exists for this user → orphan profile is
      //   removed and only the related agency/booking/files data is moved
      // - if no profile exists yet → orphan profile is reassigned to this user
      try {
        await supabase.rpc('link_orphan_profile_to_current_user' as any);
      } catch {
        // ignore — function may not exist yet, or nothing to merge
      }

      const { data, error } = await supabase
        .from('freelancer_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) {
        console.warn('[useMyProfile] Query failed:', error.message);
        throw error;
      }
      return (data ?? null) as FreelancerProfile | null;
    },
    enabled: !!user,
    staleTime: 300_000,
  });
}

export function useUpsertProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (profile: Partial<FreelancerProfile>) => {
      if (!user) throw new Error('Not authenticated');

      const existing = await supabase
        .from('freelancer_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing.data) {
        const { error } = await supabase
          .from('freelancer_profiles')
          .update(profile)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('freelancer_profiles')
          .insert({ ...profile, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      queryClient.invalidateQueries({ queryKey: ['freelancers'] });
    },
  });
}

export function useFreelancers(filters?: { skill?: string; city?: string; search?: string }) {
  return useQuery({
    queryKey: ['freelancers', filters],
    queryFn: async () => {
      let query = supabase
        .from('freelancer_profiles')
        .select('*')
        .order('created_at', { ascending: false }) as any;

      if (filters?.city) {
        query = query.eq('city', filters.city);
      }
      if (filters?.skill) {
        query = query.eq(filters.skill, 'YES');
      }
      if (filters?.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,business_name.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as FreelancerProfile[];
    },
    staleTime: 120_000,
  });
}

export function useFreelancerById(id: string | undefined) {
  return useQuery({
    queryKey: ['freelancer', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('freelancer_profiles')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as FreelancerProfile;
    },
    enabled: !!id,
    staleTime: 120_000,
  });
}
