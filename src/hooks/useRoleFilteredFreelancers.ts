import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CREW_COLUMNS } from '@/lib/crew-columns';

interface FreelancerProfile {
  full_name: string;
  whatsapp_number: string;
  photographer: string | null;
  videographer: string | null;
  photo_editor: string | null;
  video_editor: string | null;
  iphone_shooter: string | null;
  drone_operator: string | null;
  fpv_operator: string | null;
}

export function useRoleFilteredFreelancers() {
  const { data: profiles = [] } = useQuery({
    queryKey: ['all-freelancer-profiles-for-crew'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('freelancer_profiles')
        .select('full_name, whatsapp_number, photographer, videographer, photo_editor, video_editor, iphone_shooter, drone_operator, fpv_operator');
      if (error) throw error;
      return (data ?? []) as FreelancerProfile[];
    },
  });

  const registeredNames = new Set(profiles.map(p => p.full_name.toUpperCase()));

  function getByRole(columnKey: string): string[] {
    const col = CREW_COLUMNS.find(c => c.key === columnKey);
    if (!col) return [];
    if (col.profileField === null) {
      // Assistant — everyone
      return profiles.map(p => p.full_name);
    }
    return profiles
      .filter(p => {
        const val = (p as any)[col.profileField!];
        return val && val.toUpperCase() === 'YES';
      })
      .map(p => p.full_name);
  }

  function isRegistered(name: string): boolean {
    return registeredNames.has(name.toUpperCase());
  }

  function getWhatsApp(name: string): string | null {
    const p = profiles.find(pr => pr.full_name.toUpperCase() === name.toUpperCase());
    return p?.whatsapp_number || null;
  }

  return { getByRole, isRegistered, getWhatsApp, profiles };
}
