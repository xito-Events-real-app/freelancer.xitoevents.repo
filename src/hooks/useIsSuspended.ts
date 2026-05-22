import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useIsSuspended() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: ["is-suspended", userId],
    enabled: !!userId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_suspensions")
        .select("active, reason")
        .eq("user_id", userId!)
        .eq("active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return {
    isSuspended: !!query.data?.active,
    reason: query.data?.reason ?? null,
    isLoading: query.isLoading,
  };
}
