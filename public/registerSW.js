// Hijack: o HTML antigo (servido pelo SW desatualizado) carrega este arquivo.
// Aqui desregistramos TODOS os service workers, limpamos caches e recarregamos
// a página para que o navegador busque o index.html novo da rede.
(function () {
  if (!('serviceWorker' in navigator)) return;
  var KEY = '__sw_killed_v1';
  Promise.all([
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      return Promise.all(regs.map(function (r) { return r.unregister(); }));
    }),
    (typeof caches !== 'undefined' ? caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return caches.delete(k); }));
    }) : Promise.resolve())
  ]).then(function () {
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, '1');
    var url = new URL(window.location.href);
    url.searchParams.set('sw-cleanup', Date.now().toString());
    window.location.replace(url.toString());
  });
})();
