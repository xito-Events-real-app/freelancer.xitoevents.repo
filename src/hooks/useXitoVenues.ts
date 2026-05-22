import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { triggerCleanupWorker } from "@/lib/venueMediaUpload";

export type Venue = {
  id: string;
  venue_name: string;
  venue_type: string;
  city: string;
  area: string;
  location_briefing: string;
  rating: number;
  company_whatsapp: string;
  company_phone: string;
  gmail: string;
  owner1_name: string;
  owner1_contact: string;
  owner1_whatsapp: string;
  owner2_name: string;
  owner2_contact: string;
  owner2_whatsapp: string;
  google_map: string;
  website: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  cover_r2_key: string;
  cover_url: string;
  avatar_r2_key: string;
  avatar_url: string;
  lat: number | null;
  lng: number | null;
  bookings_count: number;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type VenuePhoto = {
  id: string;
  venue_id: string;
  r2_key: string;
  public_url: string;
  position: number;
  uploaded_at: string;
};

export function useXitoVenues() {
  return useQuery({
    queryKey: ["xito-venues"],
    queryFn: async (): Promise<Venue[]> => {
      const { data, error } = await supabase
        .from("xito_venues")
        .select("*")
        .order("venue_name");
      if (error) throw error;
      return (data ?? []) as Venue[];
    },
  });
}

export function useVenuePhotos(venueId: string | null) {
  return useQuery({
    queryKey: ["xito-venue-photos", venueId],
    enabled: !!venueId,
    queryFn: async (): Promise<VenuePhoto[]> => {
      const { data, error } = await supabase
        .from("xito_venue_photos")
        .select("*")
        .eq("venue_id", venueId!)
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });
}

const EMPTY: Partial<Venue> = {
  venue_name: "",
  city: "",
  area: "",
  location_briefing: "",
  rating: 0,
  company_whatsapp: "",
  company_phone: "",
  gmail: "",
  owner1_name: "",
  owner1_contact: "",
  owner1_whatsapp: "",
  owner2_name: "",
  owner2_contact: "",
  owner2_whatsapp: "",
  google_map: "",
  website: "",
  instagram: "",
  facebook: "",
  tiktok: "",
  youtube: "",
  cover_r2_key: "",
  cover_url: "",
  avatar_r2_key: "",
  avatar_url: "",
};

export function useUpsertVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Venue> & { id?: string; venue_type: string; venue_name: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = { ...EMPTY, ...input };
      if (!input.id) {
        // Client-side UUID so photos can use it before insert returns
        payload.id = (input as any).id ?? crypto.randomUUID();
        payload.created_by = user?.id ?? null;
      }
      const { data, error } = await supabase
        .from("xito_venues")
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as Venue;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["xito-venues"] });
    },
  });
}

export function useSoftDeleteVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("xito_venues")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["xito-venues"] });
      triggerCleanupWorker();
    },
  });
}

export function useDeleteVenuePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; venueId: string }) => {
      const { error } = await supabase.from("xito_venue_photos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["xito-venue-photos", vars.venueId] });
      triggerCleanupWorker();
    },
  });
}
