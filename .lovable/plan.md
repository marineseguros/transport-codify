## Diagnóstico

A versão publicada atual está correta na rede: o HTML publicado aponta para `/assets/index-G0jfiziz.js`, e esse bundle contém `Prêmio`, `Status`, `Detalhamento` e `v2 · 9col`. A URL anônima funcionar confirma isso.

A causa mais provável do navegador comum continuar antigo é uma aba controlada por um Service Worker legado que está servindo o app antigo antes do novo `index.html` conseguir executar a limpeza. O ajuste anterior ajuda quando o HTML novo é carregado, mas não resolve 100% quando o SW antigo intercepta a navegação e entrega HTML/bundle antigos.

## Plano de correção

1. **Reforçar os kill-switches de Service Worker**
   - Atualizar `/sw.js`, `/service-worker.js` e `/registerSW.js` para executar limpeza de forma mais agressiva.
   - Além de limpar caches e desregistrar SWs, enviar mensagem para todas as abas controladas e navegar cada cliente para a URL atual com `?sw-cleanup=<timestamp>`.
   - Usar guarda anti-loop por query param e `sessionStorage`/`localStorage` quando disponível.

2. **Adicionar limpeza pós-carregamento no React**
   - Criar um pequeno utilitário no app que roda assim que o bundle novo monta.
   - Ele revalida se ainda há registrations/caches e limpa novamente.
   - Isso cobre o caso em que o HTML novo carregou, mas ainda restou registro/cache do SW antigo.

3. **Remover o ponto PWA que pode reacender o problema**
   - Remover o link de `manifest.json` do `index.html` por enquanto, já que ele retorna 404 na publicação e não é necessário para o sistema.
   - Manter os arquivos kill-switch publicados nos caminhos antigos para neutralizar navegadores já afetados.

4. **Manter marcador temporário de versão**
   - Manter `v2 · 9col` no popup até confirmarmos no navegador comum.
   - Depois da confirmação, removeremos esse badge em uma limpeza final.

## Validação esperada após publicar

- Na aba comum, a primeira visita pode recarregar uma vez com `sw-cleanup` na URL.
- Depois disso, o modal deve mostrar 9 colunas, incluindo `Status` e `Prêmio`, e o badge `v2 · 9col`.
- Se ainda aparecer a tabela antiga, a causa deixa de ser código publicado e passa a ser armazenamento local do navegador; aí o próximo passo é instrução manual de limpar Site Data apenas para `marineseguros.lovable.app`.