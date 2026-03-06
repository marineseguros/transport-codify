

## Problem Analysis

Two bugs in the `IndicadoresDetailModal`:

### Bug 1: Realized values all zero
The modal receives `filteredCotacoes` (already date-filtered by Dashboard) and then applies **additional date filtering** via `computeRealized` using `currentMonthStr` inferred from metas/produtos. This double-filtering causes mismatches — the cotacoes are already restricted to the dashboard period, but the modal re-filters them by a potentially different month range.

**Root cause chain:**
- Dashboard passes `filteredCotacoes` (date-filtered) to `DashboardIndicadores`
- `DashboardIndicadores` forwards them as `allCotacoes` to the modal
- Modal infers `currentMonthStr` from latest month in metas/produtos
- `computeRealized` filters `allCotacoes` again by `start/end` of that month → data already filtered → zero matches

### Bug 2: Monthly expansion shows all months, not just the filtered year
`availableMonths` is built from ALL metas and produtos without restricting to the dashboard's selected year/period.

---

## Plan

### Changes to `DashboardIndicadores.tsx`
1. Add new props: `allCotacoes` (unfiltered quotes) and `dateRange` (`{ start: Date; end: Date }`) from the Dashboard
2. Keep using `filteredCotacoes` for the card's own KPIs (unchanged)
3. Pass `allCotacoes` (unfiltered) + `dateRange` to the modal so it can compute per-month breakdowns independently

### Changes to `Dashboard.tsx`
1. Pass `allQuotes` as a new `allCotacoes` prop to `DashboardIndicadores`
2. Compute and pass the current filter's `dateRange` (`{ start, end }`) so the modal knows the active period

### Changes to `IndicadoresDetailModal.tsx`
1. Add `dateRange: { start: Date; end: Date }` prop
2. Derive `currentMonthStr` from `dateRange.start` instead of inferring from data
3. `computeRealized` uses the **unfiltered** `allCotacoes` with proper per-month date filtering — this ensures each month's row computes correctly
4. Filter `availableMonths` to only show months within the year of `dateRange.start` (e.g., if filtering 2026, only show Jan-Dec 2026)
5. The main category row uses `dateRange.start/end` for its computation, matching the Dashboard's period

### Technical details for Cotação and Fechamento realized
- **Cotação**: filter unfiltered cotacoes by `data_cotacao` within month range, then count distinct `cpf_cnpj + branchGroup` — same "Clientes Únicos" logic
- **Fechamento**: filter by `data_fechamento` within month range for closed statuses, count distinct keys + avulso individually
- **Produtor filter**: maintain mixed attribution (Cotador for Em cotação, Origem for Fechados) per dashboard rules

