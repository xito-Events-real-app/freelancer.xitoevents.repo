import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import "@/styles/xito-admin.css";
import { AdminHub } from "@/components/admin/AdminHub";
import { SuperAdminModule } from "@/components/admin/SuperAdminModule";
import { VenuesModule } from "@/components/admin/venues/VenuesModule";

type View = "hub" | "super" | "venues";

export default function Admin() {
  const { user, loading } = useAuth();
  const { isAdmin, isLoading } = useIsAdmin();
  const [view, setView] = useState<View>("hub");

  useEffect(() => {
    if (!loading && !isLoading && user && !isAdmin) toast.error("Admin access only");
  }, [loading, isLoading, user, isAdmin]);

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  if (view === "super")  return <SuperAdminModule onExit={() => setView("hub")} />;
  if (view === "venues") return <VenuesModule onExit={() => setView("hub")} />;
  return <AdminHub onOpen={setView} />;
}
