# Correção definitiva: publicações não refletem para usuários

## Causa raiz (nova hipótese, diferente das anteriores)

1. Versões antigas do app foram publicadas com `vite-plugin-pwa`, que registrou um Service Worker (`/sw.js`) nos navegadores dos usuários.
2. Esse SW antigo cacheia `index.html` e os assets hasheados (`index-BGX-fDRP.js`, etc.). Toda vez que o usuário abre a página, o SW serve o HTML antigo do cache — que carrega os JS antigos. O proxy do Lovable serve HTML com `no-cache`, mas o SW intercepta a requisição antes dela chegar à rede.
3. Quando publicamos uma nova versão, o navegador busca o novo `/sw.js` em background, vê que mudou, instala o novo (nosso kill-switch), e o ativa. **Porém**, o kill-switch atual só faz `caches.delete(...)` e `unregister()` — ele **não recarrega as abas abertas**. A aba que o usuário está vendo já recebeu o HTML antigo e continua exibindo a versão antiga.
4. Em prática: o usuário recarrega a página (F5), mas a requisição passa pelo SW antigo (ainda controlando o documento até a próxima navegação top-level), serve o HTML cacheado de novo, e o ciclo se repete. O kill-switch limpa caches mas o documento controlado nunca é forçado a sair desse estado.

A documentação oficial do Lovable mostra o padrão correto: o kill-switch precisa fazer `clients.claim()` + `client.navigate(url + ?sw-cleanup=timestamp)` antes de `unregister()`. O query param `sw-cleanup` quebra naturalmente qualquer risco de loop, porque após o reload o SW já não existe mais.

## Mudanças

### 1. `public/sw.js` (e `public/service-worker.js`) — kill-switch oficial

Reescrever exatamente conforme a doc do Lovable:

```js
self.addEventListener("install", (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  await self.clients.claim();
  const names = await caches.keys();
  await Promise.all(names.map((n) => caches.delete(n)));
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  await Promise.all(clients.map((c) => {
    const url = new URL(c.url);
    if (url.searchParams.has("sw-cleanup")) return; // já limpou, não recarrega de novo
    url.searchParams.set("sw-cleanup", Date.now().toString());
    return c.navigate(url.toString());
  }));
  await self.registration.unregister();
})()));
self.addEventListener("fetch", () => {}); // no-op, deixa rede passar
```

A guarda `if (url.searchParams.has("sw-cleanup")) return` impede qualquer possibilidade de loop (que foi o medo da última iteração). Após o reload com `?sw-cleanup=...`, o SW já se desregistrou e não há quem intercepte — a página vem direto da rede do Lovable.

### 2. `public/registerSW.js` — também forçar reload

O HTML antigo carrega `/registerSW.js` (do vite-plugin-pwa). O hijack atual só limpa caches sem recarregar. Adicionar reload com guarda:

```js
(function () {
  if (!('serviceWorker' in navigator)) return;
  Promise.all([
    navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.map(r => r.unregister()))),
    (window.caches && caches.keys) ? caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))) : Promise.resolve(),
  ]).then(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('sw-cleanup')) return;
    url.searchParams.set('sw-cleanup', Date.now().toString());
    window.location.replace(url.toString());
  }).catch(() => {});
})();
```

### 3. `index.html` — manter como está

O script atual (apenas `unregister` + `caches.delete`, sem `register`) está correto e segue a regra do Lovable de não registrar SW em previews/iframes. Não mexer.

### 4. `vite.config.ts` — manter sem `vite-plugin-pwa`

Já está correto.

## Por que isso resolve agora (e não nas tentativas anteriores)

| Tentativa | Por que falhou |
|---|---|
| Adicionar `<meta http-equiv>` cache-busting | HTML não estava em cache HTTP — estava em cache do SW |
| Remover vite-plugin-pwa | SW antigo continua nos dispositivos |
| Kill-switch sem `client.navigate` | Limpa caches mas não tira a aba do controle do SW antigo na sessão atual |
| Esta correção | `client.navigate` força a aba a fazer top-level navigation, e como o SW se desregistrou, a próxima requisição vai pela rede |

## Ciclo de recuperação para o usuário final

1. Usuário abre o app → SW antigo serve HTML cacheado (versão antiga).
2. Em paralelo, navegador busca `/sw.js` novo, instala, ativa.
3. Na ativação: caches limpos, aba recarregada com `?sw-cleanup=<ts>`, SW desregistrado.
4. Reload busca HTML direto da rede (Lovable serve `no-cache`) → versão nova carrega.
5. Visitas futuras: sem SW, sempre versão fresca.

Tudo isso acontece em uma única visita, sem ação manual do usuário.
