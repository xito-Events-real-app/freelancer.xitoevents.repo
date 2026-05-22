import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sticky banner that shows when the browser reports offline.
 * Briefly flashes a "Back online" confirmation when connection returns.
 * Data already in React Query cache (persisted to localStorage) remains
 * available — the banner just tells the user fresh fetches won't work
 * until the connection comes back.
 */
export default function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [justReturned, setJustReturned] = useState(false);

  useEffect(() => {
    const onUp = () => {
      setOnline(true);
      setJustReturned(true);
      const t = setTimeout(() => setJustReturned(false), 2500);
      return () => clearTimeout(t);
    };
    const onDown = () => setOnline(false);
    window.addEventListener("online", onUp);
    window.addEventListener("offline", onDown);
    return () => {
      window.removeEventListener("online", onUp);
      window.removeEventListener("offline", onDown);
    };
  }, []);

  if (online && !justReturned) return null;

  return (
    <div
      className={cn(
        "fixed top-0 inset-x-0 z-[100] text-center text-xs font-semibold py-2 px-4 shadow-md transition-colors",
        online
          ? "bg-emerald-600 text-white"
          : "bg-amber-500 text-amber-950"
      )}
      role="status"
      aria-live="polite"
    >
      <div className="inline-flex items-center gap-2">
        {online ? (
          <>
            <Wifi className="h-3.5 w-3.5" />
            Back online — syncing latest data
          </>
        ) : (
          <>
            <WifiOff className="h-3.5 w-3.5" />
            You're offline. Showing cached data — changes will sync when you're back.
          </>
        )}
      </div>
    </div>
  );
}
