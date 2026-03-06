import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Target, TrendingUp, TrendingDown, Trophy, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, getDaysInMonth, getDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';
import { logger } from '@/lib/logger';

interface Produto {
  id: string;
  segurado: string;
  consultor: string;
  data_registro: string;
  tipo: string;
  subtipo?: string | null;
}

interface Meta {
  id: string;
  produtor_id: string;
  mes: string;
  tipo_meta_id: string;
  quantidade: number;
  tipo_meta?: { id: string; descricao: string };
  produtor?: { id: string; nome: string };
}

interface Cotacao {
  id: string;
  status: string;
  data_cotacao: string;
  data_fechamento: string | null;
  valor_premio: number | null;
  produtor_origem_id: string | null;
  produtor_cotador_id: string | null;
}

interface DashboardIndicadoresProps {
  produtorFilter?: string[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const DashboardIndicadores = ({ produtorFilter }: DashboardIndicadoresProps) => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [loading, setLoading] = useState(true);

  const normalizeLabel = (value?: string | null) =>
    (value || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

  const isSubtipo = (subtipo: string | null | undefined, expected: 'visita' | 'video') =>
    normalizeLabel(subtipo) === expected;

  const isMetaType = (descricao: string | undefined, target: string) => {
    const n = normalizeLabel(descricao);
    const t = normalizeLabel(target);
    return n === t;
  };

  const analysisDate = useMemo(() => {
    const timestamps: number[] = [];
    produtos.forEach(p => { const t = new Date(p.data_registro).getTime(); if (!Number.isNaN(t)) timestamps.push(t); });
    if (timestamps.length) return new Date(Math.max(...timestamps));
    metas.forEach(m => { const t = new Date(m.mes).getTime(); if (!Number.isNaN(t)) timestamps.push(t); });
    if (timestamps.length) return new Date(Math.max(...timestamps));
    cotacoes.forEach(c => { const t = new Date(c.data_cotacao).getTime(); if (!Number.isNaN(t)) timestamps.push(t); });
    return timestamps.length ? new Date(Math.max(...timestamps)) : new Date();
  }, [produtos, metas, cotacoes]);

  const currentMonthStr = format(analysisDate, 'yyyy-MM');
  const startCurrent = startOfMonth(analysisDate);
  const endCurrent = endOfMonth(analysisDate);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [prodRes, metasRes, cotRes] = await Promise.all([
          supabase.from('produtos').select('id, segurado, consultor, data_registro, tipo, subtipo').order('data_registro', { ascending: false }),
          supabase.from('metas').select('*, tipo_meta:tipos_meta(id, descricao), produtor:produtores(id, nome)').order('mes', { ascending: false }),
          supabase.from('cotacoes').select('id, status, data_cotacao, data_fechamento, valor_premio, produtor_origem_id, produtor_cotador_id').order('data_cotacao', { ascending: false }),
        ]);
        if (prodRes.error) throw prodRes.error;
        if (metasRes.error) throw metasRes.error;
        if (cotRes.error) throw cotRes.error;
        setProdutos(prodRes.data || []);
        setMetas(metasRes.data || []);
        setCotacoes(cotRes.data || []);
      } catch (error: any) {
        logger.error('Error fetching indicadores data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const currentMonthProdutos = useMemo(() =>
    produtos.filter(p => { const d = new Date(p.data_registro); return d >= startCurrent && d <= endCurrent; }),
    [produtos, startCurrent, endCurrent]);

  const currentMonthCotacoes = useMemo(() =>
    cotacoes.filter(c => { const d = new Date(c.data_cotacao); return d >= startCurrent && d <= endCurrent; }),
    [cotacoes, startCurrent, endCurrent]);

  const currentMonthFechamentos = useMemo(() =>
    cotacoes.filter(c => {
      if (!c.data_fechamento) return false;
      const d = new Date(c.data_fechamento);
      return d >= startCurrent && d <= endCurrent && ['Negócio fechado', 'Fechamento congênere'].includes(c.status);
    }), [cotacoes, startCurrent, endCurrent]);

  const kpiData = useMemo(() => {
    const filteredProds = produtorFilter?.length
      ? currentMonthProdutos.filter(p => produtorFilter.includes(p.consultor))
      : currentMonthProdutos;

    const getMetaTotal = (target: string) =>
      metas.filter(m =>
        m.mes.startsWith(currentMonthStr) &&
        isMetaType(m.tipo_meta?.descricao, target) &&
        (!produtorFilter?.length || (m.produtor && produtorFilter.includes(m.produtor.nome)))
      ).reduce((s, m) => s + m.quantidade, 0);

    const items = [
      {
        label: 'Coleta',
        realizado: filteredProds.filter(p => p.tipo === 'Coleta').length,
        meta: getMetaTotal('Coleta'),
        icon: '📋',
      },
      {
        label: 'Indicação',
        realizado: filteredProds.filter(p => p.tipo === 'Indicação').length,
        meta: getMetaTotal('Indicação'),
        icon: '🤝',
      },
      {
        label: 'Visita',
        realizado: filteredProds.filter(p => p.tipo === 'Visita/Video' && isSubtipo(p.subtipo, 'visita')).length,
        meta: getMetaTotal('Visita'),
        icon: '🏢',
      },
      {
        label: 'Vídeo',
        realizado: filteredProds.filter(p => p.tipo === 'Visita/Video' && isSubtipo(p.subtipo, 'video')).length,
        meta: getMetaTotal('Vídeo'),
        icon: '🎥',
      },
      {
        label: 'Cotação',
        realizado: currentMonthCotacoes.length,
        meta: getMetaTotal('Cotação'),
        icon: '📄',
      },
      {
        label: 'Fechamento',
        realizado: currentMonthFechamentos.length,
        meta: getMetaTotal('Fechamento'),
        icon: '✅',
      },
    ];

    return items.map(item => ({
      ...item,
      pct: item.meta > 0 ? (item.realizado / item.meta) * 100 : 0,
      falta: Math.max(0, item.meta - item.realizado),
    }));
  }, [currentMonthProdutos, currentMonthCotacoes, currentMonthFechamentos, metas, produtorFilter, currentMonthStr]);

  const totals = useMemo(() => {
    const totalMeta = kpiData.reduce((s, i) => s + i.meta, 0);
    const totalRealizado = kpiData.reduce((s, i) => s + i.realizado, 0);
    const pct = totalMeta > 0 ? (totalRealizado / totalMeta) * 100 : 0;
    const premioFechado = currentMonthFechamentos.reduce((s, c) => s + (c.valor_premio || 0), 0);
    const conversion = currentMonthCotacoes.length > 0
      ? (currentMonthFechamentos.length / currentMonthCotacoes.length) * 100 : 0;

    // Projeção: com base no ritmo atual do mês
    const daysInMonth = getDaysInMonth(analysisDate);
    const currentDay = getDate(analysisDate);
    const projectedRealizado = currentDay > 0 ? Math.round((totalRealizado / currentDay) * daysInMonth) : 0;
    const projectedPct = totalMeta > 0 ? (projectedRealizado / totalMeta) * 100 : 0;

    // Items atingidos vs pendentes
    const atingidos = kpiData.filter(i => i.meta > 0 && i.pct >= 100).length;
    const pendentes = kpiData.filter(i => i.meta > 0 && i.pct < 100).length;
    const semMeta = kpiData.filter(i => i.meta === 0).length;

    return {
      totalMeta, totalRealizado, pct, premioFechado, conversion,
      projectedRealizado, projectedPct,
      atingidos, pendentes, semMeta,
    };
  }, [kpiData, currentMonthFechamentos, currentMonthCotacoes, analysisDate]);

  const getStatusColor = (pct: number) => {
    if (pct >= 100) return 'text-emerald-600 dark:text-emerald-400';
    if (pct >= 70) return 'text-amber-500';
    return 'text-destructive';
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 100) return 'bg-emerald-500';
    if (pct >= 70) return 'bg-amber-500';
    return 'bg-destructive';
  };

  const getStatusIcon = (pct: number) => {
    if (pct >= 100) return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    if (pct >= 70) return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
    return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
  };

  const chartData = kpiData.map(item => ({
    categoria: item.label,
    Meta: item.meta,
    Realizado: item.realizado,
    pct: item.pct,
  }));

  const monthLabel = format(analysisDate, "MMMM 'de' yyyy", { locale: ptBR });

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-4 border-b">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Meta x Realizado</h3>
              <p className="text-xs text-muted-foreground capitalize">{monthLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs font-bold px-3 py-1 ${
                totals.pct >= 100
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : totals.pct >= 70
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-600'
                  : 'border-destructive/50 bg-destructive/10 text-destructive'
              }`}
            >
              {totals.pct >= 100 ? <Trophy className="h-3 w-3 mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
              {totals.pct.toFixed(0)}% Atingido
            </Badge>
          </div>
        </div>
      </div>

      <CardContent className="p-5 space-y-5">
        {/* Summary KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-card p-3.5 space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium">Total Meta</p>
            <p className="text-2xl font-bold tabular-nums">{totals.totalMeta}</p>
          </div>
          <div className="rounded-xl border bg-card p-3.5 space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium">Realizado</p>
            <p className="text-2xl font-bold text-primary tabular-nums">{totals.totalRealizado}</p>
          </div>
          <div className="rounded-xl border bg-card p-3.5 space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium">Prêmio Fechado</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatCurrency(totals.premioFechado)}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-3.5 space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium">Conversão</p>
            <p className={`text-2xl font-bold tabular-nums ${
              totals.conversion >= 30 ? 'text-emerald-600 dark:text-emerald-400' :
              totals.conversion >= 15 ? 'text-amber-500' : 'text-destructive'
            }`}>
              {totals.conversion.toFixed(0)}%
            </p>
            <p className="text-[10px] text-muted-foreground">
              {currentMonthFechamentos.length}/{currentMonthCotacoes.length} cotações
            </p>
          </div>
        </div>

        {/* Progress bar geral */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Progresso Geral</span>
            <span className={`font-bold ${getStatusColor(totals.pct)}`}>{totals.totalRealizado} / {totals.totalMeta}</span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(totals.pct)}`}
              style={{ width: `${Math.min(totals.pct, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {totals.atingidos} atingidas
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" /> {totals.pendentes} pendentes
              </span>
              {totals.semMeta > 0 && <span>{totals.semMeta} sem meta</span>}
            </div>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Projeção: {totals.projectedRealizado} ({totals.projectedPct.toFixed(0)}%)
            </span>
          </div>
        </div>

        <Separator />

        {/* Chart */}
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
              <XAxis
                dataKey="categoria"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.75rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  padding: '10px 14px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: 4 }}
                formatter={(value: number, name: string) => [value, name]}
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Bar dataKey="Meta" fill="hsl(var(--muted-foreground))" opacity={0.35} radius={[6, 6, 0, 0]} maxBarSize={40} />
              <Bar dataKey="Realizado" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={
                      entry.Meta === 0
                        ? 'hsl(var(--primary))'
                        : entry.pct >= 100
                        ? 'hsl(142, 71%, 45%)'
                        : entry.pct >= 70
                        ? 'hsl(38, 92%, 50%)'
                        : 'hsl(var(--destructive))'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <Separator />

        {/* Detail breakdown per activity */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Detalhamento por Atividade</h4>
          <div className="grid gap-2">
            {kpiData.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-lg border bg-card/50 px-3.5 py-2.5 hover:bg-accent/30 transition-colors"
              >
                <span className="text-base flex-shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold">{item.label}</span>
                    <div className="flex items-center gap-2">
                      {item.meta > 0 && getStatusIcon(item.pct)}
                      <span className={`text-xs font-bold tabular-nums ${item.meta > 0 ? getStatusColor(item.pct) : 'text-foreground'}`}>
                        {item.realizado}{item.meta > 0 ? `/${item.meta}` : ''}
                      </span>
                      {item.meta > 0 && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold px-1.5 py-0 ${
                            item.pct >= 100
                              ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                              : item.pct >= 70
                              ? 'border-amber-500/40 text-amber-600'
                              : 'border-destructive/40 text-destructive'
                          }`}
                        >
                          {item.pct.toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  {item.meta > 0 && (
                    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(item.pct)}`}
                        style={{ width: `${Math.min(item.pct, 100)}%` }}
                      />
                    </div>
                  )}
                  {item.meta > 0 && item.falta > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Faltam <span className="font-semibold">{item.falta}</span> para a meta
                    </p>
                  )}
                  {item.meta > 0 && item.pct >= 100 && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                      ✓ Meta atingida! (+{item.realizado - item.meta} extra)
                    </p>
                  )}
                  {item.meta === 0 && (
                    <p className="text-[10px] text-muted-foreground">Sem meta definida</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
