// Kill-switch oficial (caminho alternativo). Mesmo comportamento de /sw.js.
self.addEventListener("install", (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (e) =>
  e.waitUntil(
    (async () => {
      try {
        await self.clients.claim();
      } catch {}
      try {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      } catch {}
      try {
        const clients = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        await Promise.all(
          clients.map((c) => {
            try {
              const url = new URL(c.url);
              if (url.searchParams.has("sw-cleanup")) return;
              url.searchParams.set("sw-cleanup", Date.now().toString());
              return c.navigate(url.toString());
            } catch {
              return undefined;
            }
          })
        );
      } catch {}
      try {
        await self.registration.unregister();
      } catch {}
    })()
  )
);
self.addEventListener("fetch", () => {});
