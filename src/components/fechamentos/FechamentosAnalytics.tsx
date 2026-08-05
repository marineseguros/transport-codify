import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, LineChart, Line, PieChart, Pie, Cell
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, CheckCircle, DollarSign, Users, Clock,
  Target, Award, Building2, Layers, AlertTriangle, Lightbulb, Repeat, Activity
} from "lucide-react";
import { parseISO, differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface AnalyticsRecord {
  key: string;
  segurado: string;
  cpf_cnpj: string;
  status: string;
  ramo_descricao: string;
  data_cotacao: string;
  data_fechamento: string | null;
  unidade_descricao: string;
  produtor_origem: string;
  produtor_negociador: string;
  produtor_cotador: string;
  seguradora: string;
  valor_premio: number;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const formatCurrencyFull = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const isFechado = (r: AnalyticsRecord) =>
  r.status === "Negócio fechado" || r.status === "Fechamento congênere";

const pct = (part: number, total: number) => (total > 0 ? (part / total) * 100 : 0);

const variation = (curr: number, prev: number) => {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
};

function daysToClose(r: AnalyticsRecord): number | null {
  if (!r.data_fechamento || !r.data_cotacao) return null;
  try {
    const d = differenceInCalendarDays(parseISO(r.data_fechamento), parseISO(r.data_cotacao));
    return d >= 0 ? d : null;
  } catch {
    return null;
  }
}

interface Agg {
  nome: string;
  fechamentos: number;
  premio: number;
  totalOportunidades: number;
  ticket: number;
  conversao: number;
  participacao: number;
  premioAnterior: number;
  variacao: number;
  tempoMedio: number | null;
}

function aggregate(
  current: AnalyticsRecord[],
  previous: AnalyticsRecord[],
  getKey: (r: AnalyticsRecord) => string,
  getLabel?: (r: AnalyticsRecord) => string
): Agg[] {
  const map = new Map<string, { label: string; fechamentos: number; premio: number; total: number; dias: number[] }>();

  current.forEach(r => {
    const k = getKey(r);
    if (!k) return;
    if (!map.has(k)) map.set(k, { label: getLabel ? getLabel(r) : k, fechamentos: 0, premio: 0, total: 0, dias: [] });
    const e = map.get(k)!;
    e.total += 1;
    if (isFechado(r)) {
      e.fechamentos += 1;
      e.premio += r.valor_premio || 0;
      const d = daysToClose(r);
      if (d !== null) e.dias.push(d);
    }
  });

  const prevMap = new Map<string, number>();
  previous.filter(isFechado).forEach(r => {
    const k = getKey(r);
    if (!k) return;
    prevMap.set(k, (prevMap.get(k) || 0) + (r.valor_premio || 0));
  });

  const totalPremio = Array.from(map.values()).reduce((s, e) => s + e.premio, 0);

  return Array.from(map.entries())
    .map(([k, e]) => {
      const premioAnterior = prevMap.get(k) || 0;
      return {
        nome: e.label,
        fechamentos: e.fechamentos,
        premio: e.premio,
        totalOportunidades: e.total,
        ticket: e.fechamentos > 0 ? e.premio / e.fechamentos : 0,
        conversao: pct(e.fechamentos, e.total),
        participacao: pct(e.premio, totalPremio),
        premioAnterior,
        variacao: variation(e.premio, premioAnterior),
        tempoMedio: e.dias.length > 0 ? e.dias.reduce((a, b) => a + b, 0) / e.dias.length : null,
      };
    })
    .sort((a, b) => b.premio - a.premio || b.fechamentos - a.fechamentos);
}

function DeltaBadge({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const neutral = Math.abs(value) < 0.05;
  const Icon = neutral ? Minus : value > 0 ? TrendingUp : TrendingDown;
  const cls = neutral
    ? "text-muted-foreground bg-muted"
    : value > 0
      ? "text-success bg-success/10"
      : "text-destructive bg-destructive/10";
  return (
    <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>
      <Icon className="h-3 w-3" />
      {neutral ? "estável" : `${value > 0 ? "+" : ""}${value.toFixed(1)}${suffix}`}
    </span>
  );
}

function KpiCard({
  title, value, sub, icon: Icon, delta, tone = "text-muted-foreground",
}: { title: string; value: string; sub?: string; icon: typeof CheckCircle; delta?: number; tone?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <p className="text-xl font-bold leading-tight mt-0.5">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{sub}</p>}
          </div>
          <div className={`rounded-lg p-2 bg-muted shrink-0 ${tone}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        {delta !== undefined && (
          <div className="mt-2">
            <DeltaBadge value={delta} />
            <span className="text-[10px] text-muted-foreground ml-1.5">vs período anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RankingTable({
  title, icon: Icon, data, labelHead, showConversao = false, limit = 10,
}: { title: string; icon: typeof Award; data: Agg[]; labelHead: string; showConversao?: boolean; limit?: number }) {
  const rows = data.slice(0, limit);
  const max = rows[0]?.premio || 1;
  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="h-4 w-4" /> {title}
          <Badge variant="secondary" className="text-[10px]">{data.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Sem dados no período</p>
        ) : (
          <div className="space-y-2.5">
            <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
              <span className="col-span-5">{labelHead}</span>
              <span className="col-span-2 text-right">Qtd</span>
              <span className="col-span-3 text-right">Prêmio</span>
              <span className="col-span-2 text-right">{showConversao ? "Conv." : "Part."}</span>
            </div>
            {rows.map((r, i) => (
              <div key={r.nome} className="space-y-1">
                <div className="grid grid-cols-12 gap-2 items-center text-xs">
                  <span className="col-span-5 flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] text-muted-foreground w-4 shrink-0">{i + 1}º</span>
                    <span className="truncate font-medium">{r.nome}</span>
                  </span>
                  <span className="col-span-2 text-right tabular-nums">{r.fechamentos}</span>
                  <span className="col-span-3 text-right tabular-nums font-medium">{formatCurrency(r.premio)}</span>
                  <span className="col-span-2 text-right tabular-nums text-muted-foreground">
                    {(showConversao ? r.conversao : r.participacao).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={pct(r.premio, max)} className="h-1 flex-1" />
                  <DeltaBadge value={r.variacao} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const PIE_COLORS = ["hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(var(--primary))"];

export function FechamentosAnalytics({
  current, previous, periodLabel, previousLabel,
}: { current: AnalyticsRecord[]; previous: AnalyticsRecord[]; periodLabel: string; previousLabel: string }) {

  const stats = useMemo(() => {
    const build = (records: AnalyticsRecord[]) => {
      const fechados = records.filter(isFechado);
      const premio = fechados.reduce((s, r) => s + (r.valor_premio || 0), 0);
      const dias = fechados.map(daysToClose).filter((d): d is number => d !== null);
      return {
        total: records.length,
        fechamentos: fechados.length,
        premio,
        ticket: fechados.length > 0 ? premio / fechados.length : 0,
        conversao: pct(fechados.length, records.length),
        tempoMedio: dias.length > 0 ? dias.reduce((a, b) => a + b, 0) / dias.length : 0,
        clientes: new Set(fechados.map(r => r.cpf_cnpj)).size,
        emCotacao: records.filter(r => r.status === "Em cotação").length,
        declinados: records.filter(r => r.status === "Declinado").length,
      };
    };
    return { curr: build(current), prev: build(previous) };
  }, [current, previous]);

  const produtores = useMemo(
    () => aggregate(current, previous, r => r.produtor_origem || "Sem produtor"),
    [current, previous]
  );
  const seguradoras = useMemo(
    () => aggregate(current, previous, r => (r.seguradora || "Sem seguradora").split(", ")[0]),
    [current, previous]
  );
  const clientes = useMemo(
    () => aggregate(current, previous, r => r.cpf_cnpj, r => r.segurado),
    [current, previous]
  );
  const ramos = useMemo(
    () => aggregate(current, previous, r => r.ramo_descricao || "Sem ramo"),
    [current, previous]
  );

  // Evolução temporal (por mês de fechamento)
  const evolucao = useMemo(() => {
    const map = new Map<string, { mes: string; label: string; fechamentos: number; premio: number; cotacoes: number }>();
    const touch = (iso: string) => {
      const mes = iso.slice(0, 7);
      if (!map.has(mes)) {
        let label = mes;
        try { label = format(parseISO(`${mes}-01`), "MMM/yy", { locale: ptBR }); } catch { /* noop */ }
        map.set(mes, { mes, label, fechamentos: 0, premio: 0, cotacoes: 0 });
      }
      return map.get(mes)!;
    };
    current.forEach(r => {
      if (r.data_cotacao) touch(r.data_cotacao).cotacoes += 1;
      if (isFechado(r) && r.data_fechamento) {
        const e = touch(r.data_fechamento);
        e.fechamentos += 1;
        e.premio += r.valor_premio || 0;
      }
    });
    return Array.from(map.values()).sort((a, b) => a.mes.localeCompare(b.mes));
  }, [current]);

  const statusData = useMemo(() => ([
    { name: "Fechados", value: stats.curr.fechamentos },
    { name: "Em Cotação", value: stats.curr.emCotacao },
    { name: "Declinados", value: stats.curr.declinados },
  ].filter(d => d.value > 0)), [stats]);

  // Recorrência de clientes
  const recorrentes = useMemo(() => {
    const map = new Map<string, { nome: string; qtd: number; premio: number }>();
    current.filter(isFechado).forEach(r => {
      if (!map.has(r.cpf_cnpj)) map.set(r.cpf_cnpj, { nome: r.segurado, qtd: 0, premio: 0 });
      const e = map.get(r.cpf_cnpj)!;
      e.qtd += 1;
      e.premio += r.valor_premio || 0;
    });
    return Array.from(map.values()).filter(e => e.qtd > 1).sort((a, b) => b.qtd - a.qtd || b.premio - a.premio);
  }, [current]);

  // Maiores crescimentos e quedas (produtores + ramos + seguradoras com base comparável)
  const movimentos = useMemo(() => {
    const pool = [
      ...produtores.map(p => ({ ...p, tipo: "Produtor" })),
      ...seguradoras.map(p => ({ ...p, tipo: "Seguradora" })),
      ...ramos.map(p => ({ ...p, tipo: "Ramo" })),
    ].filter(p => p.premio > 0 || p.premioAnterior > 0);

    const altas = [...pool].filter(p => p.premio > p.premioAnterior).sort((a, b) => (b.premio - b.premioAnterior) - (a.premio - a.premioAnterior)).slice(0, 5);
    const quedas = [...pool].filter(p => p.premio < p.premioAnterior).sort((a, b) => (a.premio - a.premioAnterior) - (b.premio - b.premioAnterior)).slice(0, 5);
    return { altas, quedas };
  }, [produtores, seguradoras, ramos]);

  // Insights automáticos
  const insights = useMemo(() => {
    const out: { tipo: "positivo" | "alerta" | "info"; texto: string }[] = [];
    const c = stats.curr, p = stats.prev;

    const varPremio = variation(c.premio, p.premio);
    if (p.premio > 0 && Math.abs(varPremio) >= 5) {
      out.push({
        tipo: varPremio > 0 ? "positivo" : "alerta",
        texto: `Prêmio fechado ${varPremio > 0 ? "cresceu" : "caiu"} ${Math.abs(varPremio).toFixed(1)}% em relação ao período anterior (${formatCurrencyFull(c.premio)} vs ${formatCurrencyFull(p.premio)}).`,
      });
    }

    const varQtd = variation(c.fechamentos, p.fechamentos);
    if (p.fechamentos > 0 && Math.abs(varQtd) >= 10) {
      out.push({
        tipo: varQtd > 0 ? "positivo" : "alerta",
        texto: `Quantidade de fechamentos ${varQtd > 0 ? "subiu" : "recuou"} ${Math.abs(varQtd).toFixed(1)}% (${c.fechamentos} vs ${p.fechamentos}).`,
      });
    }

    if (p.conversao > 0) {
      const diff = c.conversao - p.conversao;
      if (Math.abs(diff) >= 3) {
        out.push({
          tipo: diff > 0 ? "positivo" : "alerta",
          texto: `Taxa de conversão ${diff > 0 ? "melhorou" : "piorou"} ${Math.abs(diff).toFixed(1)} p.p. (${c.conversao.toFixed(1)}% vs ${p.conversao.toFixed(1)}%).`,
        });
      }
    }

    if (p.ticket > 0) {
      const diffT = variation(c.ticket, p.ticket);
      if (Math.abs(diffT) >= 10) {
        out.push({
          tipo: diffT > 0 ? "positivo" : "alerta",
          texto: `Ticket médio ${diffT > 0 ? "aumentou" : "reduziu"} ${Math.abs(diffT).toFixed(1)}%, agora em ${formatCurrencyFull(c.ticket)}.`,
        });
      }
    }

    if (p.tempoMedio > 0 && c.tempoMedio > 0) {
      const diffD = c.tempoMedio - p.tempoMedio;
      if (Math.abs(diffD) >= 2) {
        out.push({
          tipo: diffD < 0 ? "positivo" : "alerta",
          texto: `Ciclo de fechamento ${diffD < 0 ? "encurtou" : "alongou"} ${Math.abs(diffD).toFixed(0)} dias (média de ${c.tempoMedio.toFixed(0)} dias entre cotação e fechamento).`,
        });
      }
    }

    const topProd = produtores[0];
    if (topProd && topProd.premio > 0) {
      out.push({
        tipo: "info",
        texto: `${topProd.nome} lidera com ${formatCurrencyFull(topProd.premio)} (${topProd.participacao.toFixed(1)}% do prêmio) em ${topProd.fechamentos} fechamentos.`,
      });
      if (topProd.participacao >= 40) {
        out.push({
          tipo: "alerta",
          texto: `Concentração alta: ${topProd.nome} responde por ${topProd.participacao.toFixed(1)}% do prêmio fechado — risco de dependência comercial.`,
        });
      }
    }

    const melhorConv = [...seguradoras].filter(s => s.totalOportunidades >= 3).sort((a, b) => b.conversao - a.conversao)[0];
    if (melhorConv) {
      out.push({
        tipo: "info",
        texto: `${melhorConv.nome} é a seguradora com maior taxa de conversão: ${melhorConv.conversao.toFixed(1)}% em ${melhorConv.totalOportunidades} oportunidades.`,
      });
    }

    const ramoPotencial = [...ramos].filter(r => r.totalOportunidades >= 3).sort((a, b) => (b.ticket * b.conversao) - (a.ticket * a.conversao))[0];
    if (ramoPotencial) {
      out.push({
        tipo: "info",
        texto: `Ramo com maior potencial: ${ramoPotencial.nome} — ticket de ${formatCurrencyFull(ramoPotencial.ticket)} e conversão de ${ramoPotencial.conversao.toFixed(1)}%.`,
      });
    }

    if (recorrentes.length > 0) {
      out.push({
        tipo: "positivo",
        texto: `${recorrentes.length} cliente(s) recorrente(s) no período, liderados por ${recorrentes[0].nome} com ${recorrentes[0].qtd} fechamentos.`,
      });
    }

    if (movimentos.quedas.length > 0) {
      const q = movimentos.quedas[0];
      out.push({
        tipo: "alerta",
        texto: `Maior queda: ${q.tipo} ${q.nome} perdeu ${formatCurrencyFull(q.premioAnterior - q.premio)} em prêmio frente ao período anterior.`,
      });
    }

    if (c.declinados > c.fechamentos && c.total > 0) {
      out.push({
        tipo: "alerta",
        texto: `Declinados (${c.declinados}) superam os fechamentos (${c.fechamentos}) no período — revisar precificação e follow-up.`,
      });
    }

    if (out.length === 0) {
      out.push({ tipo: "info", texto: "Sem variações relevantes identificadas no período selecionado." });
    }
    return out;
  }, [stats, produtores, seguradoras, ramos, recorrentes, movimentos]);

  const c = stats.curr, p = stats.prev;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard title="Fechamentos" value={String(c.fechamentos)} sub={`${p.fechamentos} no período anterior`} icon={CheckCircle} tone="text-success" delta={variation(c.fechamentos, p.fechamentos)} />
        <KpiCard title="Prêmio Total" value={formatCurrency(c.premio)} sub={`Anterior: ${formatCurrency(p.premio)}`} icon={DollarSign} tone="text-primary" delta={variation(c.premio, p.premio)} />
        <KpiCard title="Ticket Médio" value={formatCurrency(c.ticket)} sub={`Anterior: ${formatCurrency(p.ticket)}`} icon={Target} tone="text-primary" delta={variation(c.ticket, p.ticket)} />
        <KpiCard title="Conversão" value={`${c.conversao.toFixed(1)}%`} sub={`${c.fechamentos} de ${c.total} oportunidades`} icon={TrendingUp} tone="text-success" delta={c.conversao - p.conversao} />
        <KpiCard title="Ciclo Médio" value={`${c.tempoMedio.toFixed(0)} dias`} sub="Entre cotação e fechamento" icon={Clock} tone="text-warning" delta={variation(c.tempoMedio, p.tempoMedio)} />
        <KpiCard title="Clientes" value={String(c.clientes)} sub={`${recorrentes.length} recorrentes`} icon={Users} tone="text-muted-foreground" delta={variation(c.clientes, p.clientes)} />
      </div>

      {/* Comparativo período atual x anterior */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" /> Comparativo: {periodLabel} vs {previousLabel}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 overflow-x-auto">
          <table className="w-full text-xs min-w-[520px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="text-left font-medium py-1">Indicador</th>
                <th className="text-right font-medium py-1">{periodLabel}</th>
                <th className="text-right font-medium py-1">{previousLabel}</th>
                <th className="text-right font-medium py-1">Variação</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Fechamentos", cur: String(c.fechamentos), prv: String(p.fechamentos), delta: variation(c.fechamentos, p.fechamentos) },
                { label: "Prêmio fechado", cur: formatCurrencyFull(c.premio), prv: formatCurrencyFull(p.premio), delta: variation(c.premio, p.premio) },
                { label: "Ticket médio", cur: formatCurrencyFull(c.ticket), prv: formatCurrencyFull(p.ticket), delta: variation(c.ticket, p.ticket) },
                { label: "Taxa de conversão", cur: `${c.conversao.toFixed(1)}%`, prv: `${p.conversao.toFixed(1)}%`, delta: c.conversao - p.conversao },
                { label: "Ciclo médio (dias)", cur: c.tempoMedio.toFixed(0), prv: p.tempoMedio.toFixed(0), delta: variation(c.tempoMedio, p.tempoMedio) },
                { label: "Oportunidades", cur: String(c.total), prv: String(p.total), delta: variation(c.total, p.total) },
                { label: "Declinados", cur: String(c.declinados), prv: String(p.declinados), delta: variation(c.declinados, p.declinados) },
              ].map(row => (
                <tr key={row.label} className="border-t">
                  <td className="py-1.5">{row.label}</td>
                  <td className="py-1.5 text-right font-medium tabular-nums">{row.cur}</td>
                  <td className="py-1.5 text-right tabular-nums text-muted-foreground">{row.prv}</td>
                  <td className="py-1.5 text-right"><DeltaBadge value={row.delta} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Evolução temporal + distribuição */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Evolução de Fechamentos e Prêmio
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4 pt-0">
            {evolucao.length === 0 ? (
              <p className="text-xs text-muted-foreground py-10 text-center">Sem dados no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={evolucao}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatCurrency(Number(v))} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(value, name) => [name === "Prêmio" ? formatCurrencyFull(Number(value)) : value, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="fechamentos" name="Fechamentos" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="cotacoes" name="Cotações" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.4} />
                  <Line yAxisId="right" type="monotone" dataKey="premio" name="Prêmio" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4" /> Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4 pt-0">
            {statusData.length === 0 ? (
              <p className="text-xs text-muted-foreground py-10 text-center">Sem dados no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 11 }}>
                    {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tendência de ticket médio */}
      {evolucao.length > 1 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" /> Tendência do Ticket Médio
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4 pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={evolucao.map(e => ({ ...e, ticket: e.fechamentos > 0 ? e.premio / e.fechamentos : 0 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatCurrency(Number(v))} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => formatCurrencyFull(Number(v))}
                />
                <Line type="monotone" dataKey="ticket" name="Ticket médio" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Rankings */}
      <div className="grid gap-3 lg:grid-cols-2">
        <RankingTable title="Ranking de Produtores" icon={Award} data={produtores} labelHead="Produtor" />
        <RankingTable title="Ranking de Seguradoras" icon={Building2} data={seguradoras} labelHead="Seguradora" showConversao />
        <RankingTable title="Ranking de Clientes" icon={Users} data={clientes} labelHead="Cliente" />
        <RankingTable title="Ranking por Ramo" icon={Layers} data={ramos} labelHead="Ramo" />
      </div>

      {/* Eficiência comercial por produtor */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" /> Eficiência Comercial por Produtor
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 overflow-x-auto">
          <table className="w-full text-xs min-w-[620px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="text-left font-medium py-1">Produtor</th>
                <th className="text-right font-medium py-1">Oport.</th>
                <th className="text-right font-medium py-1">Fechados</th>
                <th className="text-right font-medium py-1">Conversão</th>
                <th className="text-right font-medium py-1">Valor médio</th>
                <th className="text-right font-medium py-1">Ciclo</th>
                <th className="text-right font-medium py-1">Part.</th>
              </tr>
            </thead>
            <tbody>
              {produtores.length === 0 ? (
                <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">Sem dados no período</td></tr>
              ) : produtores.map(pr => (
                <tr key={pr.nome} className="border-t">
                  <td className="py-1.5 font-medium truncate max-w-[180px]">{pr.nome}</td>
                  <td className="py-1.5 text-right tabular-nums">{pr.totalOportunidades}</td>
                  <td className="py-1.5 text-right tabular-nums">{pr.fechamentos}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    <span className={pr.conversao >= 50 ? "text-success" : pr.conversao < 20 ? "text-destructive" : ""}>
                      {pr.conversao.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{formatCurrency(pr.ticket)}</td>
                  <td className="py-1.5 text-right tabular-nums">{pr.tempoMedio !== null ? `${pr.tempoMedio.toFixed(0)}d` : "—"}</td>
                  <td className="py-1.5 text-right tabular-nums text-muted-foreground">{pr.participacao.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Crescimentos e quedas */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2 text-success">
              <TrendingUp className="h-4 w-4" /> Maiores Crescimentos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-2">
            {movimentos.altas.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Nenhum crescimento identificado</p>
            ) : movimentos.altas.map(m => (
              <div key={`${m.tipo}-${m.nome}`} className="flex items-center justify-between gap-2 text-xs border-b pb-1.5 last:border-0">
                <span className="min-w-0 truncate">
                  <Badge variant="outline" className="text-[9px] mr-1.5">{m.tipo}</Badge>
                  {m.nome}
                </span>
                <span className="shrink-0 flex items-center gap-2">
                  <span className="text-success font-medium tabular-nums">+{formatCurrency(m.premio - m.premioAnterior)}</span>
                  <DeltaBadge value={m.variacao} />
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <TrendingDown className="h-4 w-4" /> Maiores Quedas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-2">
            {movimentos.quedas.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma queda identificada</p>
            ) : movimentos.quedas.map(m => (
              <div key={`${m.tipo}-${m.nome}`} className="flex items-center justify-between gap-2 text-xs border-b pb-1.5 last:border-0">
                <span className="min-w-0 truncate">
                  <Badge variant="outline" className="text-[9px] mr-1.5">{m.tipo}</Badge>
                  {m.nome}
                </span>
                <span className="shrink-0 flex items-center gap-2">
                  <span className="text-destructive font-medium tabular-nums">-{formatCurrency(m.premioAnterior - m.premio)}</span>
                  <DeltaBadge value={m.variacao} />
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Clientes recorrentes */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Repeat className="h-4 w-4" /> Clientes Mais Recorrentes
            <Badge variant="secondary" className="text-[10px]">{recorrentes.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {recorrentes.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Nenhum cliente com mais de um fechamento no período</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {recorrentes.slice(0, 12).map(r => (
                <div key={r.nome} className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-xs">
                  <span className="truncate font-medium">{r.nome}</span>
                  <span className="shrink-0 flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">{r.qtd}x</Badge>
                    <span className="tabular-nums text-muted-foreground">{formatCurrency(r.premio)}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights automáticos */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4" /> Insights e Alertas Automáticos
            <Badge variant="secondary" className="text-[10px]">{insights.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 space-y-2">
          {insights.map((ins, i) => {
            const Icon = ins.tipo === "alerta" ? AlertTriangle : ins.tipo === "positivo" ? TrendingUp : Lightbulb;
            const cls = ins.tipo === "alerta"
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : ins.tipo === "positivo"
                ? "border-success/30 bg-success/5 text-success"
                : "border-border bg-muted/40 text-foreground";
            return (
              <div key={i} className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${cls}`}>
                <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{ins.texto}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

export default FechamentosAnalytics;
