import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type VenueBooking = {
  event_id: string;
  client_id: string;
  company_name: string;
  bride_name: string;
  groom_name: string;
  event_name: string;
  event_date_ad: string | null;
  start_time: string;
  end_time: string;
};

export function useVenueBookings(venueId: string | null) {
  return useQuery({
    queryKey: ["xito-venue-bookings", venueId],
    enabled: !!venueId,
    queryFn: async (): Promise<VenueBooking[]> => {
      const { data, error } = await (supabase as any).rpc("admin_list_venue_bookings", {
        p_venue_id: venueId,
      });
      if (error) throw error;
      return (data ?? []) as VenueBooking[];
    },
  });
}
