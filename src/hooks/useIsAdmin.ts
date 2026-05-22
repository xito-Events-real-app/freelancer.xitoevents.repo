import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useIsAdmin() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: ["is-admin", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId!)
          .eq("role", "admin")
          .maybeSingle();
        if (error) {
          console.warn("[useIsAdmin] Query failed, assuming not admin:", error.message);
          return false;
        }
        return !!data;
      } catch {
        return false;
      }
    },
  });

  return { isAdmin: !!query.data, isLoading: query.isLoading, isError: query.isError };
}
