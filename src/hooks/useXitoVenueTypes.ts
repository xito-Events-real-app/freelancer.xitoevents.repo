import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type VenueType = { name: string; position: number };

export function useXitoVenueTypes() {
  return useQuery({
    queryKey: ["xito-venue-types"],
    queryFn: async (): Promise<VenueType[]> => {
      const { data, error } = await supabase
        .from("xito_venue_types")
        .select("name, position")
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRenameVenueType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      const { error } = await supabase
        .from("xito_venue_types")
        .update({ name: newName.toUpperCase().trim() })
        .eq("name", oldName);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["xito-venue-types"] });
      qc.invalidateQueries({ queryKey: ["xito-venues"] });
    },
  });
}
