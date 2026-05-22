// Kill-switch service worker. Replaces any previously-shipped SW.
// On activate: claims clients, deletes all caches, force-reloads open tabs
// onto a fresh HTML, then unregisters itself.
self.addEventListener("install", (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener("fetch", () => { /* passthrough */ });
self.addEventListener("activate", (e) =>
  e.waitUntil((async () => {
    try { await self.clients.claim(); } catch (_) {}
    try {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    } catch (_) {}
    try {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      await Promise.all(clients.map((c) => {
        try {
          const url = new URL(c.url);
          url.searchParams.set("sw-cleanup", Date.now().toString());
          return c.navigate(url.toString());
        } catch (_) { return Promise.resolve(); }
      }));
    } catch (_) {}
    try { await self.registration.unregister(); } catch (_) {}
  })())
);
