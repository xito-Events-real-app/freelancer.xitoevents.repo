import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveCompany } from '@/contexts/ActiveCompanyContext';
import { withActiveAgency } from '@/lib/withActiveAgency';
import { keyForAgency } from '@/lib/queryKeys';
import { useCallback, useRef, useEffect } from 'react';

export interface BookingDetail {
  id: string;
  booking_id: string;
  user_id: string;
  role_category: string | null;
  sub_role: string | null;
  is_own_event: boolean;
  event_owner_name: string | null;
  event_owner_whatsapp: string | null;
  event_owner_user_id: string | null;
  event_name: string | null;
  venue_name: string | null;
  venue_type: string | null;
  venue_city: string | null;
  venue_area: string | null;
  venue_map: string | null;
  event_start_time: string | null;
  event_end_time: string | null;
  bride_full_name: string | null;
  bride_contact: string | null;
  bride_whatsapp: string | null;
  bride_instagram: string | null;
  bride_home_city: string | null;
  bride_home_area: string | null;
  groom_full_name: string | null;
  groom_contact: string | null;
  groom_whatsapp: string | null;
  groom_instagram: string | null;
  groom_home_city: string | null;
  groom_home_area: string | null;
  form_token: string | null;
  created_at: string;
  updated_at: string;
}

export function useBookingDetail(bookingId: string | null) {
  const { activeAgencyId } = useActiveCompany();
  return useQuery({
    queryKey: keyForAgency('booking-detail', activeAgencyId, bookingId ?? null),
    queryFn: async () => {
      if (!bookingId || !activeAgencyId) return null;
      const { data, error } = await supabase
        .from('booking_details')
        .select('*')
        .eq('booking_id', bookingId)
        .maybeSingle();
      if (error) throw error;
      return data as BookingDetail | null;
    },
    enabled: !!bookingId && !!activeAgencyId,
  });
}

export function useBookingDetailByToken(token: string | null) {
  return useQuery({
    queryKey: ['booking-detail-token', token],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await supabase
        .from('booking_details')
        .select('*')
        .eq('form_token', token)
        .maybeSingle();
      if (error) throw error;
      return data as BookingDetail | null;
    },
    enabled: !!token,
  });
}

export function useUpsertBookingDetail() {
  const { activeAgencyId } = useActiveCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, updates }: { bookingId: string; updates: Partial<BookingDetail> }) => {
      if (!activeAgencyId) throw new Error('No active company');

      return withActiveAgency(activeAgencyId, async () => {
        const { data: existing } = await supabase
          .from('booking_details')
          .select('id')
          .eq('booking_id', bookingId)
          .maybeSingle();

        if (existing) {
          const { data, error } = await supabase
            .from('booking_details')
            .update(updates)
            .eq('id', existing.id)
            .select()
            .single();
          if (error) throw error;
          return data;
        }
        const { data, error } = await supabase
          .from('booking_details')
          .insert({ booking_id: bookingId, user_id: activeAgencyId, ...updates })
          .select()
          .single();
        if (error) throw error;
        return data;
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['booking-detail'] });
      queryClient.invalidateQueries({ queryKey: ['booking-detail', activeAgencyId, data.booking_id] });
    },
  });
}

export function useUpdateBookingDetailByToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ token, updates }: { token: string; updates: Partial<BookingDetail> }) => {
      const { data, error } = await supabase
        .from('booking_details')
        .update(updates)
        .eq('form_token', token)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['booking-detail-token', variables.token] });
    },
  });
}

// Debounced auto-save hook
export function useAutoSave(
  save: (updates: Partial<BookingDetail>) => void,
  delay = 1000
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Partial<BookingDetail>>({});

  const debouncedSave = useCallback((updates: Partial<BookingDetail>) => {
    pendingRef.current = { ...pendingRef.current, ...updates };
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      save(pendingRef.current);
      pendingRef.current = {};
    }, delay);
  }, [save, delay]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return debouncedSave;
}

export function useSearchFreelancers(query: string) {
  return useQuery({
    queryKey: ['search-freelancers', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const { data, error } = await supabase
        .from('freelancer_profiles')
        .select('user_id, full_name, whatsapp_number, contact_number, profile_photo_url')
        .or(`full_name.ilike.%${query}%,whatsapp_number.ilike.%${query}%,contact_number.ilike.%${query}%`)
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: query.length >= 2,
  });
}
