

## Problem Analysis

The KPIs for Coleta, Indicacao, Visita, and Video show zeros for both **metas** and **realizado** due to two bugs:

### Bug 1: Metas date comparison mismatch
The `metas.mes` column is a `date` type, so Supabase returns values like `"2026-03-01"`. The code compares with `currentMonthStr = format(currentMonth, 'yyyy-MM')` = `"2026-03"`. These never match, so all meta values are 0.

**Fix**: Compare using `m.mes.startsWith(currentMonthStr)` instead of `m.mes === currentMonthStr` (affects lines 168, 206).

### Bug 2: Produtos tipo mapping mismatch
The Produtos page stores types as `'Coleta'`, `'Indicação'`, and `'Visita/Video'` (with subtipo `'Visita'` or `'Video'`). The current code correctly handles Visita/Video with subtipo checks on lines 160-161, but the `tipo` value in the DB might use `'Visita/Vídeo'` (with accent) or a different string. Need to verify the exact filter matches the stored values. The Produtos page uses `filterTipo` with values from the data itself, suggesting these types are correct.

Also, on line 193-194 in the producer ranking, the same Visita/Video subtipo logic is used -- this should be consistent.

### Plan

**Edit `src/components/dashboard/DashboardIndicadores.tsx`:**

1. **Fix metas date matching** (lines 168, 206): Change `m.mes === currentMonthStr` to `m.mes.startsWith(currentMonthStr)` so `"2026-03-01".startsWith("2026-03")` returns true.

2. **Add debug logging** temporarily to verify produto tipos match expectations, then remove once confirmed working.

This is a single-file fix in `DashboardIndicadores.tsx` -- two line changes that fix the metas query filter so metas and realizado numbers populate correctly.

