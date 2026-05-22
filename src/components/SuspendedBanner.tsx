import { useIsSuspended } from "@/hooks/useIsSuspended";
import { AlertTriangle } from "lucide-react";

export default function SuspendedBanner() {
  const { isSuspended, reason } = useIsSuspended();
  if (!isSuspended) return null;

  return (
    <div className="sticky top-0 z-50 bg-destructive text-destructive-foreground px-4 py-2 text-sm flex items-center gap-2 justify-center text-center">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span>
        Your account is in <strong>read-only mode</strong>
        {reason ? ` — ${reason}` : ""}. Contact support if you think this is a mistake.
      </span>
    </div>
  );
}
