import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompany } from '@/contexts/ActiveCompanyContext';
import { withActiveAgency } from '@/lib/withActiveAgency';
import { keyForAgency } from '@/lib/queryKeys';
import { adToBS, nepaliMonthsEnglish } from '@/lib/nepaliCalendar';

export interface Booking {
  id: string;
  user_id: string;
  booking_date: string;
  event_name: string;
}

async function createBookingFeedPost(authorId: string, displayName: string | null | undefined, adDates: string[]) {
  const name = displayName || 'Someone';
  const bsLabels = adDates.map(adStr => {
    const [y, m, d] = adStr.split('-').map(Number);
    const bs = adToBS(new Date(y, m - 1, d));
    return `${nepaliMonthsEnglish[bs.month - 1]} ${bs.day}`;
  });
  const datesText = bsLabels.join(', ');
  const content = `📅 ${name} has marked ${datesText} as booked\n\n🎯 Add your dates too!`;
  const { error } = await supabase.from('feed_posts').insert({
    user_id: authorId,
    content,
  });
  if (error) console.error('Failed to create booking feed post:', error);
}

export function useBookings(_year: number, _month: number) {
  const { activeAgencyId, switching } = useActiveCompany();
  return useQuery({
    queryKey: keyForAgency('bookings', activeAgencyId),
    queryFn: async () => {
      if (!activeAgencyId) return [];
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', activeAgencyId);
      if (error) throw error;
      return (data || []) as Booking[];
    },
    enabled: !!activeAgencyId && !switching,
    staleTime: 120_000,
  });
}

export function useAddBooking() {
  const { user } = useAuth();
  const { activeAgencyId } = useActiveCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ booking_date, event_name }: { booking_date: string; event_name: string }) => {
      if (!activeAgencyId) throw new Error('No active company');
      const data = await withActiveAgency(activeAgencyId, async () => {
        const { data, error } = await supabase
          .from('bookings')
          .insert({ user_id: activeAgencyId, booking_date, event_name })
          .select()
          .single();
        if (error) throw error;
        return data;
      });
      // Feed post is authored by the actor (not the company) so the actor's profile shows up
      const { data: profile } = await supabase
        .from('freelancer_profiles')
        .select('full_name')
        .eq('user_id', user?.id ?? '')
        .single();
      await createBookingFeedPost(user!.id, profile?.full_name, [data.booking_date]);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
    },
  });
}

export function useAddMultipleBookings() {
  const { user } = useAuth();
  const { activeAgencyId } = useActiveCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookings }: { bookings: { date: string; event_name: string }[] }) => {
      if (!activeAgencyId) throw new Error('No active company');
      const rows = bookings.map(b => ({ user_id: activeAgencyId, booking_date: b.date, event_name: b.event_name }));
      const data = await withActiveAgency(activeAgencyId, async () => {
        const { data, error } = await supabase.from('bookings').insert(rows).select();
        if (error) throw error;
        return data;
      });
      if (data && data.length > 0) {
        const { data: profile } = await supabase
          .from('freelancer_profiles')
          .select('full_name')
          .eq('user_id', user?.id ?? '')
          .single();
        const adDates = data.map((b: any) => b.booking_date);
        await createBookingFeedPost(user!.id, profile?.full_name, adDates);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();
  const { activeAgencyId } = useActiveCompany();
  return useMutation({
    mutationFn: async ({ bookingId, event_name }: { bookingId: string; event_name: string }) => {
      if (!activeAgencyId) throw new Error('No active company');
      return withActiveAgency(activeAgencyId, async () => {
        const { data, error } = await supabase
          .from('bookings')
          .update({ event_name })
          .eq('id', bookingId)
          .select()
          .single();
        if (error) throw error;
        return data;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();
  const { activeAgencyId } = useActiveCompany();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      if (!activeAgencyId) throw new Error('No active company');
      return withActiveAgency(activeAgencyId, async () => {
        const { error } = await supabase
          .from('bookings')
          .delete()
          .eq('id', bookingId);
        if (error) throw error;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
