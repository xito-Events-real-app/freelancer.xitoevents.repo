import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const FALLBACK = "Xito Events";

/**
 * Returns the company / agency display name for the currently logged-in user.
 * Source priority: business_name → full_name → "Xito Events".
 */
export function useCompanyName() {
  const [name, setName] = useState<string>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      const { data } = await supabase
        .from("freelancer_profiles")
        .select("business_name, full_name")
        .eq("user_id", uid)
        .maybeSingle();
      if (cancelled) return;
      const resolved =
        (data?.business_name && data.business_name.trim()) ||
        (data?.full_name && data.full_name.trim()) ||
        FALLBACK;
      setName(resolved);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return name;
}
