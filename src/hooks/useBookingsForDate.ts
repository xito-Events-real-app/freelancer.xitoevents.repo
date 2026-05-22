import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BookedFreelancer {
  user_id: string;
  profile_id: string;
  full_name: string;
  profile_photo_url: string | null;
  main_job: string | null;
  event_name: string;
}

export interface AvailableFreelancer {
  user_id: string;
  profile_id: string;
  full_name: string;
  profile_photo_url: string | null;
  main_job: string | null;
}

export function useBookingsForDate(adDate: string | null) {
  return useQuery({
    queryKey: ['bookings-for-date', adDate],
    queryFn: async () => {
      if (!adDate) return { booked: [] as BookedFreelancer[], available: [] as AvailableFreelancer[] };

      // Get all bookings for this date
      const { data: bookings, error: bErr } = await supabase
        .from('bookings')
        .select('user_id, event_name')
        .eq('booking_date', adDate);
      if (bErr) throw bErr;

      const bookedUserIds = new Set((bookings || []).map(b => b.user_id));

      // Get all freelancer profiles
      const { data: profiles, error: pErr } = await supabase
        .from('freelancer_profiles')
        .select('id, user_id, full_name, profile_photo_url, main_job');
      if (pErr) throw pErr;

      const booked: BookedFreelancer[] = [];
      const available: AvailableFreelancer[] = [];

      for (const p of profiles || []) {
        if (bookedUserIds.has(p.user_id)) {
          const booking = bookings!.find(b => b.user_id === p.user_id);
          booked.push({
            user_id: p.user_id,
            profile_id: p.id,
            full_name: p.full_name,
            profile_photo_url: p.profile_photo_url,
            main_job: p.main_job,
            event_name: booking?.event_name || 'Booked',
          });
        } else {
          available.push({
            user_id: p.user_id,
            profile_id: p.id,
            full_name: p.full_name,
            profile_photo_url: p.profile_photo_url,
            main_job: p.main_job,
          });
        }
      }

      return { booked, available };
    },
    enabled: !!adDate,
    staleTime: 60_000,
  });
}
