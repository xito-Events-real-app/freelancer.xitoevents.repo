import { AdminShell } from "@/components/admin/AdminShell";
import { SVG } from "@/components/admin/venues/venueTokens";

interface AdminHubProps {
  onOpen: (section: "super" | "venues") => void;
}

export function AdminHub({ onOpen }: AdminHubProps) {
  return (
    <AdminShell brand={{ title: "XITO ADMIN", sub: "Control Center" }}>
      <div className="xa-hub">
        <h1 className="sg">Welcome back</h1>
        <p>Select a module to manage.</p>
        <div className="xa-hub-grid">
          <button className="xa-hub-card" onClick={() => onOpen("super")}>
            <div className="xa-hub-card-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h2 className="sg">Super Admin</h2>
            <p className="xa-hub-card-desc">
              Broadcasts, users, moderation, analytics, feature flags, and Lagan dates.
            </p>
            <div className="xa-hub-card-meta">
              <span>Platform controls</span>
              <span>→</span>
            </div>
          </button>

          <button className="xa-hub-card" onClick={() => onOpen("venues")}>
            <div className="xa-hub-card-icon" dangerouslySetInnerHTML={{ __html: SVG.building.replace('width="17"','width="28"').replace('height="17"','height="28"') }} />
            <h2 className="sg">Xito Venues</h2>
            <p className="xa-hub-card-desc">
              Manage the venue directory — hotels, resorts, banquets and more. Profiles, photos and contacts.
            </p>
            <div className="xa-hub-card-meta">
              <span>Venue directory</span>
              <span>→</span>
            </div>
          </button>
        </div>
      </div>
    </AdminShell>
  );
}
