// Kill-switch: caso algum HTML antigo ainda registre este caminho, apenas
// limpa caches e se desregistra. NÃO navega clientes (evita loop de reload).
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
