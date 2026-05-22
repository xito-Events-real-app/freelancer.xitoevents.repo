import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import BroadcastsPanel from "@/components/admin/BroadcastsPanel";
import UsersPanel from "@/components/admin/UsersPanel";
import ModerationPanel from "@/components/admin/ModerationPanel";
import AnalyticsPanel from "@/components/admin/AnalyticsPanel";
import FeatureFlagsPanel from "@/components/admin/FeatureFlagsPanel";
import LaganDatesPanel from "@/components/admin/LaganDatesPanel";

type Key = "broadcasts" | "users" | "moderation" | "analytics" | "flags" | "lagan";

const SECTIONS: { key: Key; label: string; icon: string; col: string; bg: string; node: React.ComponentType }[] = [
  { key: "broadcasts", label: "Broadcasts",    icon: "ti-broadcast",      col: "#7c3aed", bg: "#ede9fe", node: BroadcastsPanel },
  { key: "users",      label: "Users",         icon: "ti-users",          col: "#0369a1", bg: "#e0f2fe", node: UsersPanel },
  { key: "moderation", label: "Moderation",    icon: "ti-shield-x",       col: "#be185d", bg: "#fce7f3", node: ModerationPanel },
  { key: "analytics",  label: "Analytics",     icon: "ti-chart-bar",      col: "#15803d", bg: "#dcfce7", node: AnalyticsPanel },
  { key: "flags",      label: "Feature Flags", icon: "ti-toggle-right",   col: "#b45309", bg: "#fef3c7", node: FeatureFlagsPanel },
  { key: "lagan",      label: "Lagan Dates",   icon: "ti-sparkles",       col: "#0f766e", bg: "#ccfbf1", node: LaganDatesPanel },
];

export function SuperAdminModule({ onExit }: { onExit: () => void }) {
  const [active, setActive] = useState<Key>("broadcasts");
  const ActiveNode = SECTIONS.find(s => s.key === active)!.node;

  const sidebar = SECTIONS.map(s => (
    <button key={s.key} className={`xa-type-btn ${active === s.key ? "active" : ""}`} onClick={() => setActive(s.key)}>
      <span className="lbl">
        <span className="xa-type-ic" style={{ background: s.bg, color: s.col }}><i className={`ti ${s.icon}`} /></span>
        <span className="xa-type-name">{s.label}</span>
      </span>
    </button>
  ));

  return (
    <AdminShell brand={{ title: "SUPER ADMIN", sub: "Platform Controls" }} sidebar={<>{sidebar}</>} onBack={onExit}>
      <div className="xa-panel-wrap">
        <ActiveNode />
      </div>
    </AdminShell>
  );
}
