import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FreelancerBooking {
  id: string;
  user_id: string;
  booking_date: string;
  event_name: string;
}

// Fetch all bookings for a specific freelancer (by user_id)
export function useFreelancerBookings(userId: string | undefined) {
  return useQuery({
    queryKey: ['freelancer-bookings', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return (data || []) as FreelancerBooking[];
    },
    enabled: !!userId,
  });
}

// Fetch user_ids that are booked on specific dates
export function useBookedFreelancersOnDates(adDates: string[]) {
  return useQuery({
    queryKey: ['booked-freelancers-on-dates', adDates],
    queryFn: async () => {
      if (!adDates.length) return new Set<string>();
      const { data, error } = await supabase
        .from('bookings')
        .select('user_id')
        .in('booking_date', adDates);
      if (error) throw error;
      return new Set((data || []).map(b => b.user_id));
    },
    enabled: adDates.length > 0,
  });
}

// Fetch booking counts for all freelancers for given months (returns map of user_id -> count)
export function useFreelancerBookingCounts(userIds: string[], adDateRanges: { start: string; end: string }[]) {
  return useQuery({
    queryKey: ['freelancer-booking-counts', userIds, adDateRanges],
    queryFn: async () => {
      if (!userIds.length || !adDateRanges.length) return {};
      
      const minDate = adDateRanges.reduce((min, r) => r.start < min ? r.start : min, adDateRanges[0].start);
      const maxDate = adDateRanges.reduce((max, r) => r.end > max ? r.end : max, adDateRanges[0].end);
      
      const { data, error } = await supabase
        .from('bookings')
        .select('user_id, booking_date')
        .in('user_id', userIds)
        .gte('booking_date', minDate)
        .lte('booking_date', maxDate);
      
      if (error) throw error;

      const result: Record<string, { thisMonth: number; nextMonth: number }> = {};
      userIds.forEach(uid => { result[uid] = { thisMonth: 0, nextMonth: 0 }; });

      (data || []).forEach(b => {
        if (!result[b.user_id]) result[b.user_id] = { thisMonth: 0, nextMonth: 0 };
        if (adDateRanges[0] && b.booking_date >= adDateRanges[0].start && b.booking_date <= adDateRanges[0].end) {
          result[b.user_id].thisMonth++;
        }
        if (adDateRanges[1] && b.booking_date >= adDateRanges[1].start && b.booking_date <= adDateRanges[1].end) {
          result[b.user_id].nextMonth++;
        }
      });

      return result;
    },
    enabled: userIds.length > 0 && adDateRanges.length > 0,
  });
}
