// Kill-switch (caminho alternativo). Apenas limpa caches e desregistra.
self.addEventListener("install", (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (e) =>
  e.waitUntil(
    (async () => {
      try {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      } catch {}
      await self.registration.unregister();
    })()
  )
);
self.addEventListener("fetch", () => {});
