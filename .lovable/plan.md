## Causa raiz identificada

A página publicada atual está correta: o HTML publicado aponta para o bundle novo e contém a limpeza de Service Worker. O problema persiste só no navegador comum porque ele ainda está sendo controlado por um Service Worker antigo já instalado no perfil do usuário.

O ajuste anterior limpa registros/caches quando o HTML novo ou o bundle novo executam, mas isso não resolve o caso mais crítico: se a aba comum ainda recebe o HTML/bundle antigo pelo Service Worker antigo, o código novo nunca roda. Além disso, o `registerSW.js` atual só executa limpeza quando o HTML antigo o carrega, mas não força explicitamente o navegador a buscar/instalar o kill-switch de `/sw.js`.

## Plano de correção definitiva

1. **Transformar `/registerSW.js` em um desinstalador ativo**
   - Em vez de apenas desregistrar os SWs existentes, ele vai primeiro registrar/atualizar explicitamente `/sw.js` com `updateViaCache: 'none'`.
   - Isso força o navegador comum, mesmo preso no HTML antigo, a baixar o kill-switch atual no mesmo escopo (`/`).
   - Depois disso, ele limpa caches, desregistra registros restantes e recarrega a aba uma única vez com guarda anti-loop.

2. **Reforçar `/sw.js` e `/service-worker.js`**
   - Remover a condição que evita navegar quando já existe `sw-cleanup`, porque ela pode impedir a saída de abas presas.
   - Usar uma flag simples em `sessionStorage/localStorage` no lado da página para evitar loop, não no Service Worker.
   - Manter a ordem correta: `skipWaiting` → `clients.claim()` → limpar caches → navegar clientes → `unregister()`.

3. **Adicionar um fallback de versão visível no app novo**
   - Manter temporariamente o badge `v2 · 9col` no modal para confirmar que o bundle correto foi carregado.
   - Assim diferenciamos claramente: se o badge aparecer, é ajuste de layout; se não aparecer, é SW/cache ainda segurando bundle antigo.

4. **Validar o publicado por HTTP**
   - Conferir que `/registerSW.js`, `/sw.js`, `/service-worker.js` e o HTML publicado contêm a nova versão.
   - Isso confirma que o problema restante, se houver, não é código publicado incorreto, mas estado preso no perfil do navegador.

## Resultado esperado

Na página comum, ao abrir o fluxo `Performance dos Indicadores (Meta x Realizado)` → `Ver mais` → detalhes mensais de `Cotação`, a aba deve recarregar uma vez e passar a exibir o mesmo layout da aba anônima: 9 colunas com `Status` e `Prêmio`.