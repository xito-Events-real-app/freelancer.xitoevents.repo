import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FeatureFlag = {
  key: string;
  enabled: boolean;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
};

export function useFeatureFlags() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["feature-flags"],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .order("key");
      if (error) throw error;
      return (data ?? []) as FeatureFlag[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`feature-flags-realtime-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feature_flags" },
        () => qc.invalidateQueries({ queryKey: ["feature-flags"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return query;
}

/** Returns true unless the flag explicitly exists and is disabled. */
export function useFeatureFlag(key: string) {
  const { data = [] } = useFeatureFlags();
  const flag = data.find((f) => f.key === key);
  if (!flag) return true;
  return flag.enabled;
}
