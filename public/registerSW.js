// Hijack para HTML antigo (vite-plugin-pwa) que carregava /registerSW.js.
// Apenas desregistra SWs e limpa caches. NÃO recarrega a página para evitar
// loops de reload.
(function () {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.getRegistrations().then(function (regs) {
    regs.forEach(function (r) { r.unregister(); });
  }).catch(function () {});
  if (window.caches && caches.keys) {
    caches.keys().then(function (keys) {
      keys.forEach(function (k) { caches.delete(k); });
    }).catch(function () {});
  }
})();
