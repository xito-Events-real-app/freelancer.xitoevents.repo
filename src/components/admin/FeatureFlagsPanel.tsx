import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlags } from "@/hooks/useFeatureFlag";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function FeatureFlagsPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: flags = [], isLoading } = useFeatureFlags();

  const toggle = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("feature_flags")
        .update({ enabled, updated_by: user?.id, updated_at: new Date().toISOString() })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(`${vars.key} ${vars.enabled ? "enabled" : "disabled"}`);
      qc.invalidateQueries({ queryKey: ["feature-flags"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Flags</CardTitle>
        <p className="text-sm text-muted-foreground">
          Toggle features on or off globally. Admin accounts always bypass these flags.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="space-y-3">
            {flags.map((f) => (
              <div
                key={f.key}
                className="flex items-center justify-between gap-4 p-3 border rounded-lg bg-card"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm font-semibold">{f.key}</div>
                  {f.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {f.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Updated {new Date(f.updated_at).toLocaleString()}
                  </p>
                </div>
                <Switch
                  checked={f.enabled}
                  onCheckedChange={(v) => toggle.mutate({ key: f.key, enabled: v })}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
