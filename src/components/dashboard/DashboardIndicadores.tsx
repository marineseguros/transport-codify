import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, TrendingDown, Minus, ExternalLink, BarChart3, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, getDaysInMonth, getDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';
import { logger } from '@/lib/logger';
import { IndicadoresDetailModal } from './IndicadoresDetailModal';
import type { Cotacao as DashboardCotacao } from '@/hooks/useSupabaseData';

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
  quantidade: number;
  tipo_meta?: {id: string;descricao: string;};
  produtor?: {id: string;nome: string;};
}

interface DashboardIndicadoresProps {
  produtorFilter?: string[];
  filteredCotacoes?: DashboardCotacao[];
  allCotacoes?: DashboardCotacao[];
  dateFilter?: string;
  anoEspecifico?: string;
  dateRange?: { from?: Date; to?: Date };
}

const normalizeLabel = (value?: string | null) =>
(value || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

// Helper to get branch group (same logic as Dashboard)
const getBranchGroup = (ramo: {descricao?: string;ramo_agrupado?: string | null;} | undefined | null): string => {
  if (!ramo) return 'Outros';
  if (ramo.ramo_agrupado) return ramo.ramo_agrupado;
  const ramoUpper = (ramo.descricao || '').toUpperCase();
  if (ramoUpper.includes('RCTR-C') || ramoUpper.includes('RC-DC')) return 'RCTR-C + RC-DC';
  return ramo.descricao || 'Outros';
};

const getStatusColor = (pct: number) => {
  if (pct >= 100) return 'text-success';
  if (pct >= 70) return 'text-warning';
  return 'text-destructive';
};

const getProgressColor = (pct: number) => {
  if (pct >= 100) return '[&>div]:bg-success';
  if (pct >= 70) return '[&>div]:bg-warning';
  return '[&>div]:bg-destructive';
};

const getBarColor = (pct: number) => {
  if (pct >= 100) return 'hsl(156, 72%, 40%)';
  if (pct >= 70) return 'hsl(35, 95%, 55%)';
  return 'hsl(0, 84%, 60%)';
};

const StatusIcon = ({ pct }: {pct: number;}) => {
  if (pct >= 100) return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
  if (pct >= 70) return <AlertTriangle className="h-3.5 w-3.5 text-warning" />;
  return <XCircle className="h-3.5 w-3.5 text-destructive" />;
};

export const DashboardIndicadores = ({ produtorFilter, filteredCotacoes, allCotacoes, dateFilter, anoEspecifico, dateRange }: DashboardIndicadoresProps) => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(false);

  const isMetaType = (descricao: string | undefined, target: string) =>
  normalizeLabel(descricao) === normalizeLabel(target);

  // Calculate date range based on the dashboard date filter
  const { filterStart, filterEnd, metaMonthPrefixes } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (dateFilter) {
      case 'hoje':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '7dias':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30dias':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90dias':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'mes_atual':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'mes_anterior':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'ano_atual':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case 'ano_anterior':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31);
        break;
      case 'ano_especifico': {
        const year = parseInt(anoEspecifico || '') || now.getFullYear();
        start = new Date(year, 0, 1);
        end = new Date(year, 11, 31);
        break;
      }
      case 'personalizado':
      case 'personalizado_comparacao':
        if (dateRange?.from) {
          start = dateRange.from;
          end = dateRange.to || dateRange.from;
        } else {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    // Build list of YYYY-MM prefixes covered by the filter range (for metas matching)
    const prefixes: string[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cursor <= endMonth) {
      prefixes.push(format(cursor, 'yyyy-MM'));
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return { filterStart: start, filterEnd: end, metaMonthPrefixes: prefixes };
  }, [dateFilter, dateRange, anoEspecifico]);

  const analysisDate = useMemo(() => {
    const timestamps: number[] = [];
    produtos.forEach((p) => {const t = new Date(p.data_registro).getTime();if (!Number.isNaN(t)) timestamps.push(t);});
    if (timestamps.length) return new Date(Math.max(...timestamps));
    metas.forEach((m) => {const t = new Date(m.mes).getTime();if (!Number.isNaN(t)) timestamps.push(t);});
    if (timestamps.length) return new Date(Math.max(...timestamps));
    if (filteredCotacoes?.length) {
      filteredCotacoes.forEach((c) => {const t = new Date(c.data_cotacao).getTime();if (!Number.isNaN(t)) timestamps.push(t);});
    }
    return timestamps.length ? new Date(Math.max(...timestamps)) : new Date();
  }, [produtos, metas, filteredCotacoes]);

  const currentMonthStr = format(analysisDate, 'yyyy-MM');

  // Filter produtos by the dashboard date range (not just a single month)
  const filteredProdutos = useMemo(() =>
    produtos.filter((p) => {
      const d = new Date(p.data_registro);
      return d >= filterStart && d <= filterEnd;
    }),
    [produtos, filterStart, filterEnd]);

  // Cotação Realizada: Clientes Únicos (distinct CPF/CNPJ + branch group) from filteredCotacoes
  const cotacaoRealizado = useMemo(() => {
    if (!filteredCotacoes?.length) return 0;
    const uniqueKeys = new Set<string>();
    filteredCotacoes.forEach((c) => {
      const branchGroup = getBranchGroup(c.ramo);
      const key = `${c.cpf_cnpj}_${branchGroup}`;
      uniqueKeys.add(key);
    });
    return uniqueKeys.size;
  }, [filteredCotacoes]);

  // Fechamento Realizado: distinct closings (CPF/CNPJ + branch group) from filteredCotacoes
  const fechamentoRealizado = useMemo(() => {
    if (!filteredCotacoes?.length) return 0;
    const closedCotacoes = filteredCotacoes.filter((c) =>
    c.status === 'Negócio fechado' || c.status === 'Fechamento congênere'
    );
    const uniqueKeys = new Set<string>();
    let avulsoCount = 0;
    closedCotacoes.forEach((c) => {
      if (c.ramo?.segmento === 'Avulso') {
        avulsoCount++;
      } else {
        const branchGroup = getBranchGroup(c.ramo);
        const key = `${c.cpf_cnpj}_${branchGroup}`;
        uniqueKeys.add(key);
      }
    });
    return uniqueKeys.size + avulsoCount;
  }, [filteredCotacoes]);

  const chartData = useMemo(() => {
    const filteredProds = produtorFilter?.length ?
    filteredProdutos.filter((p) => produtorFilter.includes(p.consultor)) :
    filteredProdutos;

    const getMetaTotal = (target: string) =>
    metas.filter((m) =>
    metaMonthPrefixes.some((prefix) => m.mes.startsWith(prefix)) &&
    isMetaType(m.tipo_meta?.descricao, target) && (
    !produtorFilter?.length || m.produtor && produtorFilter.includes(m.produtor.nome))
    ).reduce((s, m) => s + m.quantidade, 0);

    return [
    { categoria: 'Coleta', Meta: getMetaTotal('Coleta'), Realizado: filteredProds.filter((p) => p.tipo === 'Coleta').length },
    { categoria: 'Cotação', Meta: getMetaTotal('Cotação'), Realizado: cotacaoRealizado },
    { categoria: 'Vídeo', Meta: getMetaTotal('Vídeo'), Realizado: filteredProds.filter((p) => p.tipo === 'Visita/Video' && normalizeLabel(p.subtipo) === 'video').length },
    { categoria: 'Visita', Meta: getMetaTotal('Visita'), Realizado: filteredProds.filter((p) => p.tipo === 'Visita/Video' && normalizeLabel(p.subtipo) === 'visita').length },
    { categoria: 'Indicação', Meta: getMetaTotal('Indicação'), Realizado: filteredProds.filter((p) => p.tipo === 'Indicação').length },
    { categoria: 'Fechamento', Meta: getMetaTotal('Fechamento'), Realizado: fechamentoRealizado }];

  }, [filteredProdutos, cotacaoRealizado, fechamentoRealizado, metas, produtorFilter, metaMonthPrefixes]);

  const totals = useMemo(() => {
    const totalMeta = chartData.reduce((s, i) => s + i.Meta, 0);
    const totalRealizado = chartData.reduce((s, i) => s + i.Realizado, 0);
    const pct = totalMeta > 0 ? totalRealizado / totalMeta * 100 : 0;
    return { totalMeta, totalRealizado, pct };
  }, [chartData]);

  // Projection
  const projection = useMemo(() => {
    const today = getDate(analysisDate);
    const daysInMonth = getDaysInMonth(analysisDate);
    if (today === 0 || totals.totalRealizado === 0) return 0;
    return Math.round(totals.totalRealizado / today * daysInMonth);
  }, [analysisDate, totals.totalRealizado]);

  // Categorias atingidas / parciais / críticas
  const statusCounts = useMemo(() => {
    let atingido = 0,parcial = 0,critico = 0;
    chartData.forEach((item) => {
      const pct = item.Meta > 0 ? item.Realizado / item.Meta * 100 : 0;
      if (pct >= 100) atingido++;else
      if (pct >= 70) parcial++;else
      critico++;
    });
    return { atingido, parcial, critico };
  }, [chartData]);

  // Per-produtor data for detail modal
  const allProdutorNames = useMemo(() => {
    const names = new Set<string>();
    metas.filter((m) => m.produtor?.nome).forEach((m) => names.add(m.produtor!.nome));
    produtos.forEach((p) => names.add(p.consultor));
    return Array.from(names).sort();
  }, [metas, produtos]);

  const produtorData = useMemo(() => {
    const produtorNames = new Set<string>();
    metas.filter((m) => m.mes.startsWith(currentMonthStr) && m.produtor?.nome).
    forEach((m) => produtorNames.add(m.produtor!.nome));
    currentMonthProdutos.forEach((p) => produtorNames.add(p.consultor));

    return Array.from(produtorNames).map((nome) => {
      const prodMetas = metas.filter((m) =>
      m.mes.startsWith(currentMonthStr) && m.produtor?.nome === nome
      );
      const meta = prodMetas.reduce((s, m) => s + m.quantidade, 0);
      const prods = currentMonthProdutos.filter((p) => p.consultor === nome);
      const realizado = prods.length;
      const pct = meta > 0 ? realizado / meta * 100 : 0;
      return { nome, meta, realizado, pct };
    }).filter((p) => p.meta > 0 || p.realizado > 0);
  }, [metas, currentMonthProdutos, currentMonthStr]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const meta = payload.find((p: any) => p.dataKey === 'Meta')?.value || 0;
    const realizado = payload.find((p: any) => p.dataKey === 'Realizado')?.value || 0;
    const pct = meta > 0 ? (realizado / meta * 100).toFixed(1) : '0.0';
    return (
      <div className="rounded-lg border bg-popover p-3 shadow-lg text-sm space-y-1">
        <p className="font-semibold text-popover-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-muted-foreground/50" />
          <span className="text-muted-foreground">Meta:</span>
          <span className="font-semibold">{meta}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-primary" />
          <span className="text-muted-foreground">Realizado:</span>
          <span className="font-semibold text-primary">{realizado}</span>
        </div>
        <div className="pt-1 border-t">
          <span className={`font-semibold ${getStatusColor(Number(pct))}`}>{pct}% atingido</span>
        </div>
      </div>);

  };

  // Custom bar label
  const renderBarLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (!value) return null;
    return (
      <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill="hsl(var(--foreground))">
        {value}
      </text>);

  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5 text-primary" />
            Meta x Realizado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>);

  }

  return (
    <>
      <Card className="overflow-hidden">
        {/* Header */}
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted/30">
                <Target className="h-4.5 w-4.5 text-foreground" />
              </div>
              <div>
                <span>Meta x Realizado</span>
                <p className="text-[11px] font-normal text-muted-foreground">
                  Dados do período selecionado • Clique em "Ver mais" para visão completa
                </p>
              </div>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => setShowDetail(true)}>
                Ver mais
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          {/* KPI Strip */}
          <div className="flex items-center justify-center gap-6 py-1">
            <div className="text-center">
              <p className="text-lg font-bold">{totals.totalMeta}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Meta</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{totals.totalRealizado}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Realizado</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className={`text-lg font-bold ${getStatusColor(totals.pct)}`}>{totals.pct.toFixed(0)}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Atingimento</p>
            </div>
          </div>

          {/* Chart */}
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 20, right: 10, left: -10, bottom: 5 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis
                dataKey="categoria"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false} />
              
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false} />
              
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                iconType="square"
                iconSize={10} />
              
              <Bar dataKey="Meta" fill="hsl(var(--muted-foreground) / 0.35)" radius={[4, 4, 0, 0]} label={renderBarLabel} />
              <Bar dataKey="Realizado" radius={[4, 4, 0, 0]} label={renderBarLabel}>
                {chartData.map((entry, index) => {
                  const pct = entry.Meta > 0 ? entry.Realizado / entry.Meta * 100 : 0;
                  return <Cell key={index} fill={getBarColor(pct)} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Activity breakdown mini-cards */}
          


















          

          {/* Status summary */}
          <div className="flex items-center gap-3 text-xs pt-2 border-t">
            <span className="flex items-center gap-1 text-success">
              <CheckCircle2 className="h-3.5 w-3.5" /> {statusCounts.atingido} atingido
            </span>
            <span className="flex items-center gap-1 text-warning">
              <AlertTriangle className="h-3.5 w-3.5" /> {statusCounts.parcial} parcial
            </span>
            <span className="flex items-center gap-1 text-destructive">
              <XCircle className="h-3.5 w-3.5" /> {statusCounts.critico} crítico
            </span>
          </div>
        </CardContent>
      </Card>

      <IndicadoresDetailModal
        open={showDetail}
        onOpenChange={setShowDetail}
        chartData={chartData}
        produtorData={produtorData}
        allMetas={metas}
        allProdutos={produtos}
        allCotacoes={allCotacoes || []}
        produtorNames={allProdutorNames}
        currentProdutorFilter={produtorFilter}
        dateFilter={dateFilter}
        anoEspecifico={anoEspecifico}
        dateRangeProp={dateRange} />
      
    </>);

};