## Objetivo
Adicionar as colunas **Realizado** e **Realizado Acumulado** na tabela "Análise Mensal de Prêmio - {ano}", alimentadas por uma planilha Excel importada pelo usuário e persistida no Supabase.

> Observação: hoje já existem as colunas "Expectativa" e "Expec. Acum." (calculadas a partir das cotações fechadas). Elas continuam existindo. As novas colunas Realizado/Realizado Acum. virão **exclusivamente** dos dados importados da planilha.

## Mapeamento planilha → aplicação
| Planilha | Aplicação | Uso |
|---|---|---|
| Seg. | Seguradora | guardado (referência) |
| Ramo | Ramo | chave de agregação (match por descrição/ramo agrupado) |
| CPF/CNPJ | CNPJ | guardado (referência) |
| Início de Vig. | — | define o **mês** do realizado |
| Pr. Líquido | Valor | valor somado no mês |
| Produtor / Prod. Indireto 1/2/3 | Produtor Cotador | chave de agregação (match por nome) |

Demais colunas da planilha são ignoradas.

## Regras de negócio
1. **Mês** = mês de `Início de Vig.` (ano = ano selecionado no dashboard).
2. **Agregação** = soma de `Pr. Líquido` por (mês + Produtor Cotador + Ramo).
3. Cada linha da planilha que tiver **mais de um produtor** (Produtor + Prod. Indireto 1/2/3) gera uma linha de realizado para **cada** produtor preenchido, com o **valor cheio** (sem rateio) — assim a soma filtrada por qualquer produtor envolvido reflete o realizado dele. *Confirmar se preferem rateio igualitário em vez de valor cheio.*
4. **Realizado Acumulado** do mês N = soma do Realizado de Jan até N (do ano e dos filtros vigentes).
5. Filtros existentes do dashboard (Produtor) também filtram o Realizado.

## Estrutura de dados (Supabase)

Nova tabela `realizado_premio_importacoes` (cabeçalho do upload, para histórico/auditoria):
- ano, arquivo_nome, linhas_processadas, total_valor, importado_por, importado_em.

Nova tabela `realizado_premio` (linha a linha já normalizado):
- importacao_id (FK), ano, mes (1-12), seguradora_nome, ramo_nome, ramo_agrupado, cnpj, valor_premio, produtor_nome, produtor_id (resolvido por nome quando possível), tipo_produtor ('Cotador' | 'Indireto 1' | 'Indireto 2' | 'Indireto 3'), inicio_vigencia.

RLS: leitura para `authenticated`; inserção apenas via importação (papéis admin/gerente/CEO).

**Reimportação:** ao importar um arquivo para o mesmo ano, o usuário escolhe **Substituir** (apaga linhas existentes daquele ano e reinsere) ou **Adicionar**. *Confirmar preferência — default: Substituir.*

## UI

1. **Botão "Importar Realizado (.xlsx)"** no card "Análise Mensal de Prêmio", ao lado do botão "Ver Escadinha".
2. Modal de importação:
   - Drop/seleção do arquivo .xlsx (parser `xlsx`/SheetJS).
   - Detecta automaticamente as colunas pelos cabeçalhos exatos: `Seg.`, `Ramo`, `CPF/CNPJ`, `Início de Vig.`, `Pr. Líquido`, `Produtor`, `Prod. Indireto`, `Prod. Indireto 2`, `Prod. Indireto 3`.
   - Pré-visualização: nº de linhas, total por mês, produtores/ramos não encontrados (warnings, ainda assim importa).
   - Botão "Importar" → grava no Supabase via Edge Function (`import-realizado-premio`) com service role para validar e inserir em lote.
3. **Tabela "Análise Mensal de Prêmio"** ganha 2 colunas novas:
   - `Realizado` (após `%`)
   - `Realizado Acum.` (após `% Acum.`)
   - Linha de totais inclui soma do Realizado anual.
   - Indicador discreto da data da última importação no header do card.

## Arquivos a alterar/criar

- `supabase/migrations/...` — criar `realizado_premio_importacoes`, `realizado_premio`, GRANTs, RLS, índices `(ano, mes)`, `(ano, produtor_id)`.
- `supabase/functions/import-realizado-premio/index.ts` — recebe JSON com linhas parseadas, valida, insere em lote.
- `src/components/dashboard/ImportRealizadoModal.tsx` — novo modal de upload + preview.
- `src/components/dashboard/MetasPremioComparison.tsx` — buscar `realizado_premio` filtrado por ano/produtor, calcular `realizadoMensal`/`realizadoAcumulado`, renderizar 2 novas colunas, botão de import.
- `package.json` — adicionar `xlsx`.

## Pontos a confirmar antes de implementar
1. **Múltiplos produtores na mesma linha** — valor cheio para cada um (default proposto) ou rateio?
2. **Reimportação no mesmo ano** — Substituir tudo do ano (default proposto) ou Adicionar?
3. **Permissão de import** — apenas Administrador/Gerente/CEO (default proposto) ou todos os usuários?
