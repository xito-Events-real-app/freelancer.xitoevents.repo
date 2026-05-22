import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Megaphone } from "lucide-react";

interface Broadcast {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

export default function BroadcastPopup() {
  const { user } = useAuth();
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [open, setOpen] = useState(false);

  const fetchPending = async () => {
    if (!user?.id) return;
    // Fetch active, non-expired broadcasts
    const { data: broadcasts } = await supabase
      .from("broadcasts")
      .select("id, title, message, created_at, expires_at, active")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!broadcasts?.length) return;

    const now = Date.now();
    const valid = broadcasts.filter(
      (b: any) => !b.expires_at || new Date(b.expires_at).getTime() > now,
    );
    if (!valid.length) return;

    const { data: dismissals } = await supabase
      .from("broadcast_dismissals")
      .select("broadcast_id")
      .eq("user_id", user.id)
      .in(
        "broadcast_id",
        valid.map((b: any) => b.id),
      );

    const dismissedIds = new Set((dismissals ?? []).map((d: any) => d.broadcast_id));
    const next = valid.find((b: any) => !dismissedIds.has(b.id));
    if (next) {
      setBroadcast(next as Broadcast);
      setOpen(true);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchPending();

    const channel = supabase
      .channel("broadcasts-popup")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "broadcasts" },
        () => fetchPending(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleDismiss = async () => {
    if (!broadcast || !user?.id) return;
    await supabase.from("broadcast_dismissals").insert({
      broadcast_id: broadcast.id,
      user_id: user.id,
    });
    setOpen(false);
    setBroadcast(null);
  };

  if (!broadcast) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleDismiss()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-xl">{broadcast.title}</DialogTitle>
          </div>
          <DialogDescription className="whitespace-pre-wrap text-base text-foreground/90 leading-relaxed pt-2">
            {broadcast.message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleDismiss} className="w-full">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
