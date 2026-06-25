## Objetivo

Ajustar o modal **Importar Realizado de Prêmio - 2026** para refletir as regras confirmadas e tornar mais claro que os dados importados são **independentes** de tudo o que já existe na plataforma.

## Regras confirmadas

1. A importação grava **apenas** em `realizado_premio` e `realizado_premio_importacoes`. Nenhuma outra tabela (`cotacoes`, `metas_premio`, `clientes`, `produtores`, etc.) é tocada.
2. Os dados da planilha são a **fonte da verdade do Realizado**, separados do realizado calculado a partir de cotações fechadas.
3. A tabela "Análise Mensal de Prêmio" exibirá duas visões:
   - **Expectativa** → `metas_premio`
   - **Realizado** → `realizado_premio` (planilha)

## Mudanças no modal `ImportRealizadoModal.tsx`

1. **Tornar "Substituir" o padrão fixo** (sempre selecionado) — conforme escolha do usuário.
2. **Remover a opção "Adicionar"** do modal para evitar duplicidade acidental em reimportações.
3. **Adicionar nota informativa** logo abaixo do título:
   > "Esta importação afeta apenas os dados de Realizado (planilha). Nenhum valor de cotações, metas ou outras áreas da plataforma é alterado."
4. **Mensagem contextual de primeira importação**: se `linhas_processadas` do ano = 0, exibir badge "Primeira importação do ano — nenhum dado anterior será substituído". Caso contrário, exibir "Última importação: {data} — {N} linhas serão substituídas".

## Mudanças na edge function `import-realizado-premio`

- Fixar `modo = 'substituir'` no servidor (ignorar campo do payload), já que o modal não enviará mais a opção.
- Manter o registro em `realizado_premio_importacoes` para histórico.

## O que NÃO muda

- Schema do banco (tabelas já isoladas).
- Tabela "Análise Mensal de Prêmio" e suas colunas Realizado/Realizado Acumulado.
- Lógica de agregação por mês + Produtor Cotador + Ramo.

## Resposta direta às suas perguntas

- **Está configurado desta forma?** Sim. As tabelas são totalmente isoladas e a primeira importação entrará "crua".
- **Vai substituir algum valor já feito?** **Não.** "Substituir" apaga apenas registros anteriores de `realizado_premio` do ano selecionado. Como não há nenhum, a primeira importação é puramente um insert. Cotações, metas e demais dados da plataforma permanecem intactos.

## Arquivos alterados

- `src/components/dashboard/ImportRealizadoModal.tsx`
- `supabase/functions/import-realizado-premio/index.ts`
