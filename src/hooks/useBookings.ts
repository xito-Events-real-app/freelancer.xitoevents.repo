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

/**
 * Resolve the booking owner id: active company when present, otherwise the
 * authenticated user (standalone freelancers). DB owner-shortcut RLS allows
 * writes when user_id = auth.uid(), so freelancers can bypass the GUC path.
 */
function useBookingOwnerId(): string | null {
  const { user } = useAuth();
  const { activeAgencyId } = useActiveCompany();
  return activeAgencyId ?? user?.id ?? null;
}

export function useBookings(_year: number, _month: number) {
  const { user } = useAuth();
  const { activeAgencyId, switching } = useActiveCompany();
  const ownerId = activeAgencyId ?? user?.id ?? null;
  return useQuery({
    queryKey: keyForAgency('bookings', ownerId),
    queryFn: async () => {
      if (!ownerId) return [];
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', ownerId);
      if (error) throw error;
      return (data || []) as Booking[];
    },
    enabled: !!ownerId && !switching,
    staleTime: 120_000,
  });
}

export function useAddBooking() {
  const { user } = useAuth();
  const { activeAgencyId } = useActiveCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ booking_date, event_name }: { booking_date: string; event_name: string }) => {
      const ownerId = activeAgencyId ?? user?.id;
      if (!ownerId) throw new Error('Not signed in');
      const doInsert = async () => {
        const { data, error } = await supabase
          .from('bookings')
          .insert({ user_id: ownerId, booking_date, event_name })
          .select()
          .single();
        if (error) throw error;
        return data;
      };
      const data = activeAgencyId
        ? await withActiveAgency(activeAgencyId, doInsert)
        : await doInsert();
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
      const ownerId = activeAgencyId ?? user?.id;
      if (!ownerId) throw new Error('Not signed in');
      const rows = bookings.map(b => ({ user_id: ownerId, booking_date: b.date, event_name: b.event_name }));
      const doInsert = async () => {
        const { data, error } = await supabase.from('bookings').insert(rows).select();
        if (error) throw error;
        return data;
      };
      const data = activeAgencyId
        ? await withActiveAgency(activeAgencyId, doInsert)
        : await doInsert();
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
  const { user } = useAuth();
  const { activeAgencyId } = useActiveCompany();
  return useMutation({
    mutationFn: async ({ bookingId, event_name }: { bookingId: string; event_name: string }) => {
      const ownerId = activeAgencyId ?? user?.id;
      if (!ownerId) throw new Error('Not signed in');
      const doUpdate = async () => {
        const { data, error } = await supabase
          .from('bookings')
          .update({ event_name })
          .eq('id', bookingId)
          .select()
          .single();
        if (error) throw error;
        return data;
      };
      return activeAgencyId ? withActiveAgency(activeAgencyId, doUpdate) : doUpdate();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeAgencyId } = useActiveCompany();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const ownerId = activeAgencyId ?? user?.id;
      if (!ownerId) throw new Error('Not signed in');
      const doDelete = async () => {
        const { error } = await supabase
          .from('bookings')
          .delete()
          .eq('id', bookingId);
        if (error) throw error;
      };
      return activeAgencyId ? withActiveAgency(activeAgencyId, doDelete) : doDelete();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
