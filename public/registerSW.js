// Hijack para HTML antigo (vite-plugin-pwa) que carregava /registerSW.js.
// Primeiro força o navegador a baixar o kill-switch atual em /sw.js usando
// updateViaCache: "none". Depois remove registros/caches restantes e faz
// uma única recarga controlada por localStorage/sessionStorage.
(function () {
  var RELOAD_KEY = "__marine_sw_cleanup_reload_v3__";

  function alreadyReloaded() {
    try {
      var url = new URL(window.location.href);
      return (
        url.searchParams.has("sw-cleanup") ||
        sessionStorage.getItem(RELOAD_KEY) === "1" ||
        localStorage.getItem(RELOAD_KEY) === "1"
      );
    } catch (e) {
      return true;
    }
  }

  function markReloaded() {
    try { sessionStorage.setItem(RELOAD_KEY, "1"); } catch (e) {}
    try { localStorage.setItem(RELOAD_KEY, "1"); } catch (e) {}
  }

  function reloadOnce() {
    try {
      if (alreadyReloaded()) return;
      markReloaded();
      var url = new URL(window.location.href);
      url.searchParams.set("sw-cleanup", Date.now().toString());
      window.location.replace(url.toString());
    } catch (e) {}
  }

  function clearCaches() {
    return window.caches && caches.keys
      ? caches.keys().then(function (ks) {
          return Promise.all(ks.map(function (k) { return caches.delete(k); }));
        }).catch(function () {})
      : Promise.resolve();
  }

  function unregisterAll() {
    return navigator.serviceWorker
      .getRegistrations()
      .then(function (rs) {
        return Promise.all(rs.map(function (r) { return r.unregister(); }));
      })
      .catch(function () {});
  }

  if (!("serviceWorker" in navigator)) {
    clearCaches().then(reloadOnce).catch(function () {});
    return;
  }

  navigator.serviceWorker
    .register("/sw.js", { scope: "/", updateViaCache: "none" })
    .then(function (registration) {
      return registration.update().catch(function () {}).then(function () { return registration; });
    })
    .then(function () {
      return Promise.all([clearCaches(), unregisterAll()]);
    })
    .then(reloadOnce)
    .catch(function () {
      Promise.all([clearCaches(), unregisterAll()]).then(reloadOnce).catch(function () {});
    });
})();
