import { ReactNode } from "react";
import { SVG } from "@/components/admin/venues/venueTokens";
import { useAuth } from "@/contexts/AuthContext";

interface AdminShellProps {
  brand: { title: string; sub: string }; // sidebar brand text
  sidebar?: ReactNode;
  toolbar?: ReactNode;
  topbarExtras?: ReactNode;
  onBack?: () => void;
  children: ReactNode;
}

export function AdminShell({ brand, sidebar, toolbar, topbarExtras, onBack, children }: AdminShellProps) {
  const { user } = useAuth();
  const initial = (user?.email?.[0] || "?").toUpperCase();
  return (
    <div className="xito-admin">
      <div className="xa-topbar">
        {onBack && (
          <button className="xa-back-pill" onClick={onBack}>
            <i className="ti ti-arrow-left" /> Back
          </button>
        )}
        <div className="xa-logo">
          <span className="xa-logo-mark" dangerouslySetInnerHTML={{ __html: SVG.building }} />
          XITO <span className="xa-logo-accent">ADMIN</span>
        </div>
        <div className="xa-topbar-r">
          {topbarExtras}
          <div className="xa-avatar-bubble" title={user?.email ?? ""}>{initial}</div>
        </div>
      </div>
      <div className="xa-shell">
        {sidebar && (
          <aside className="xa-sidebar">
            <div className="xa-sb-brand">
              <div className="xa-sb-brand-top">
                <div className="xa-sb-brand-name">
                  <span className="xa-sb-brand-icon" dangerouslySetInnerHTML={{ __html: SVG.building }} />
                  <div>
                    <div className="xa-sb-brand-title">{brand.title}</div>
                    <div className="xa-sb-brand-sub">{brand.sub}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="xa-sb-list">{sidebar}</div>
          </aside>
        )}
        <div className="xa-main-area">
          {toolbar}
          <div className="xa-content">{children}</div>
        </div>
      </div>
    </div>
  );
}
