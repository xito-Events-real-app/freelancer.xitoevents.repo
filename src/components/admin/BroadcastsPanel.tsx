import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Megaphone, Trash2, Send, Eye } from "lucide-react";

export default function BroadcastsPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const { data: broadcasts = [], isLoading } = useQuery({
    queryKey: ["admin-broadcasts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broadcasts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: viewCounts = {} } = useQuery({
    queryKey: ["admin-broadcast-views", broadcasts.map((b: any) => b.id).join(",")],
    enabled: broadcasts.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("broadcast_dismissals")
        .select("broadcast_id");
      const counts: Record<string, number> = {};
      (data ?? []).forEach((d: any) => {
        counts[d.broadcast_id] = (counts[d.broadcast_id] ?? 0) + 1;
      });
      return counts;
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not signed in");
      const { error } = await supabase.from("broadcasts").insert({
        title: title.trim(),
        message: message.trim(),
        created_by: user.id,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Broadcast sent to all users");
      setTitle("");
      setMessage("");
      setExpiresAt("");
      qc.invalidateQueries({ queryKey: ["admin-broadcasts"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to send"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("broadcasts")
        .update({ active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-broadcasts"] }),
  });

  const deleteBroadcast = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("broadcasts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Broadcast deleted");
      qc.invalidateQueries({ queryKey: ["admin-broadcasts"] });
    },
  });

  const handleSend = () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }
    sendMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" /> Send a Broadcast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bc-title">Title</Label>
            <Input
              id="bc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. New feature available!"
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bc-message">Message</Label>
            <Textarea
              id="bc-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your announcement here..."
              rows={5}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bc-expires">Expires at (optional)</Label>
            <Input
              id="bc-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={sendMutation.isPending}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {sendMutation.isPending ? "Sending..." : "Send to all users"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Broadcast History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : broadcasts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No broadcasts yet.</p>
          ) : (
            <div className="space-y-3">
              {broadcasts.map((b: any) => (
                <div
                  key={b.id}
                  className="border rounded-lg p-4 space-y-2 bg-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold">{b.title}</h4>
                        {b.active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {b.expires_at &&
                          new Date(b.expires_at).getTime() < Date.now() && (
                            <Badge variant="outline">Expired</Badge>
                          )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                        {b.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>
                          {new Date(b.created_at).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {viewCounts[b.id] ?? 0} dismissed
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={b.active}
                        onCheckedChange={(v) =>
                          toggleActive.mutate({ id: b.id, active: v })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Delete this broadcast?"))
                            deleteBroadcast.mutate(b.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
