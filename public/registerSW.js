// Hijack para HTML antigo (vite-plugin-pwa) que carregava /registerSW.js.
// Desregistra SWs, limpa caches e força UM reload (com guarda anti-loop)
// para que a página seja reentregue pela rede sem o SW antigo no caminho.
(function () {
  if (!("serviceWorker" in navigator)) return;
  var unregAll = navigator.serviceWorker
    .getRegistrations()
    .then(function (rs) {
      return Promise.all(rs.map(function (r) { return r.unregister(); }));
    })
    .catch(function () {});
  var clearCaches =
    window.caches && caches.keys
      ? caches
          .keys()
          .then(function (ks) {
            return Promise.all(ks.map(function (k) { return caches.delete(k); }));
          })
          .catch(function () {})
      : Promise.resolve();
  Promise.all([unregAll, clearCaches])
    .then(function () {
      try {
        var url = new URL(window.location.href);
        if (url.searchParams.has("sw-cleanup")) return;
        url.searchParams.set("sw-cleanup", Date.now().toString());
        window.location.replace(url.toString());
      } catch (e) {}
    })
    .catch(function () {});
})();
