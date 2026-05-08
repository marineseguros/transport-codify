## Diagnóstico

A URL publicada já está correta em aba anônima, então o deploy atual está funcionando. O problema está restrito ao perfil comum do navegador, que ainda mantém algum estado antigo: Service Worker, Cache Storage, cache HTTP do bundle, ou uma aba controlada por um Service Worker antigo.

O ponto frágil atual é que `index.html` apenas desregistra Service Workers e apaga caches, mas não força uma navegação limpa quando detecta esse estado. Isso pode deixar a aba comum exibindo o bundle antigo até uma navegação realmente nova.

## Plano de correção

1. **Reforçar a limpeza no `index.html`**
   - Antes do React iniciar, detectar se existe `navigator.serviceWorker.controller`, registros ativos ou caches antigos.
   - Desregistrar todos os Service Workers.
   - Apagar todas as entradas de `Cache Storage`.
   - Forçar uma única recarga com parâmetro de controle, por exemplo `?sw-cleanup=<timestamp>`.
   - Usar uma trava em `sessionStorage` para impedir loop infinito.

2. **Manter os kill-switches em `/sw.js`, `/service-worker.js` e `/registerSW.js`**
   - Eles continuam necessários para navegadores que ainda estão presos no Service Worker antigo.
   - Ajustar apenas se necessário para garantir que a navegação aconteça antes do `unregister` finalizar.

3. **Adicionar marcador temporário de versão visível somente no modal afetado**
   - Manter/remover o badge `v2 · 9col` conforme sua preferência.
   - Ele ajuda a confirmar se o navegador comum saiu do bundle antigo.

4. **Validação esperada após publicar**
   - Aba anônima: continua correta.
   - Aba comum: ao abrir a URL, deve recarregar uma vez com `sw-cleanup` e depois exibir a versão atualizada.
   - Depois da limpeza, acessos futuros não devem depender de cache antigo.

## Resultado esperado

A correção não altera os dados nem o layout funcional do dashboard. Ela atua somente na camada de carregamento da aplicação para tirar definitivamente os usuários do bundle antigo que ficou preso no navegador comum.