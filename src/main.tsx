import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ── Aggressive cache + service worker cleanup ──────────────────────────────
// We previously shipped vite-plugin-pwa which installed a service worker that
// cached HTML/assets. Devices that registered it kept serving stale builds
// even after hard reloads. We now ship a static kill-switch SW at /sw.js and
// /service-worker.js that wipes caches and unregisters itself. As an extra
// belt-and-suspenders measure, on every app boot we also unregister any
// remaining SW and clear Cache Storage from the page side.
(function purgeStaleCaches() {
  if (typeof window === "undefined") return;
  try {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => regs.forEach((r) => { try { r.unregister(); } catch (_) {} }))
        .catch(() => {});
    }
    if (typeof caches !== "undefined" && caches?.keys) {
      caches.keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k).catch(() => false))))
        .catch(() => {});
    }
  } catch (_) { /* ignore */ }
})();

createRoot(document.getElementById("root")!).render(<App />);
