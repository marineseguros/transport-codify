import { useState, useMemo, Fragment } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, TrendingDown, Minus, ChevronRight, ChevronDown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { format, startOfMonth, endOfMonth, parseISO, parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MultiSelect } from '@/components/ui/multi-select';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import type { Cotacao as DashboardCotacao, Produtor, Seguradora, Ramo, Unidade } from '@/hooks/useSupabaseData';
import { CategoriaDetailPopup } from './CategoriaDetailPopup';

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
  tipo_meta?: { id: string; descricao: string };
  produtor?: { id: string; nome: string };
}

interface ChartItem {
  categoria: string;
  Meta: number;
  Realizado: number;
}

interface ProdutorPerformance {
  nome: string;
  meta: number;
  realizado: number;
  pct: number;
}

interface MonthlyRow {
  monthLabel: string;
  monthKey: string;
  meta: number;
  realizado: number;
  pct: number;
}

interface IndicadoresDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chartData: ChartItem[];
  produtorData: ProdutorPerformance[];
  allMetas: Meta[];
  allProdutos: Produto[];
  allCotacoes?: DashboardCotacao[];
  produtorNames: string[];
  currentProdutorFilter?: string[];
  dateFilter?: string;
  anoEspecifico?: string;
  dateRangeProp?: { from?: Date; to?: Date };
  produtores: Produtor[];
  seguradoras: Seguradora[];
  ramos: Ramo[];
  unidades: Unidade[];
  currentSeguradoraFilter?: string[];
  currentRamoFilter?: string[];
  currentSegmentoFilter?: string[];
  currentRegraFilter?: string[];
  currentUnidadeFilter?: string[];
}

const normalizeLabel = (value?: string | null) =>
  (value || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

const isMetaType = (descricao: string | undefined, target: string) =>
  normalizeLabel(descricao) === normalizeLabel(target);

const getBranchGroup = (ramo: { descricao?: string; ramo_agrupado?: string | null } | undefined | null): string => {
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

const getStatusBg = (pct: number) => {
  if (pct >= 100) return 'bg-success/10 text-success border-success/20';
  if (pct >= 70) return 'bg-warning/10 text-warning border-warning/20';
  return 'bg-destructive/10 text-destructive border-destructive/20';
};

const getProgressColor = (pct: number) => {
  if (pct >= 100) return '[&>div]:bg-success';
  if (pct >= 70) return '[&>div]:bg-warning';
  return '[&>div]:bg-destructive';
};

const TrendIcon = ({ pct }: { pct: number }) => {
  if (pct >= 100) return <TrendingUp className="h-3.5 w-3.5 text-success" />;
  if (pct >= 70) return <Minus className="h-3.5 w-3.5 text-warning" />;
  return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
};

const CATEGORIES = ['Coleta', 'Cotação', 'Vídeo', 'Visita', 'Indicação', 'Fechamento'];

const computeRealized = (
  cat: string,
  prods: Produto[],
  cotacoes: DashboardCotacao[],
  start: Date,
  end: Date,
  prodFilter?: string[],
  ramoFilter?: string[],
  segmentoFilter?: string[],
) => {
  const matchesRamoSegmento = (c: DashboardCotacao) => {
    if (ramoFilter?.length && !(ramoFilter.includes(c.ramo?.descricao || ''))) return false;
    if (segmentoFilter?.length && !(segmentoFilter.includes(c.ramo?.segmento || ''))) return false;
    return true;
  };

  if (cat === 'Cotação') {
    const monthCotacoes = cotacoes.filter((c) => {
      const d = new Date(c.data_cotacao);
      if (d < start || d > end) return false;
      if (!prodFilter?.length) { /* ok */ } else if (!prodFilter.includes(c.produtor_cotador?.nome || '')) return false;
      if (!matchesRamoSegmento(c)) return false;
      return true;
    });
    const keys = new Set<string>();
    monthCotacoes.forEach((c) => keys.add(`${c.cpf_cnpj}_${getBranchGroup(c.ramo)}`));
    return keys.size;
  }
  if (cat === 'Fechamento') {
    const closed = cotacoes.filter((c) => {
      if (c.status !== 'Negócio fechado' && c.status !== 'Fechamento congênere') return false;
      if (!c.data_fechamento) return false;
      const d = new Date(c.data_fechamento);
      if (d < start || d > end) return false;
      if (!prodFilter?.length) { /* ok */ } else if (!prodFilter.includes(c.produtor_origem?.nome || '')) return false;
      if (!matchesRamoSegmento(c)) return false;
      return true;
    });
    const keys = new Set<string>();
    let avulso = 0;
    closed.forEach((c) => {
      if (c.ramo?.segmento === 'Avulso') avulso++;
      else keys.add(`${c.cpf_cnpj}_${getBranchGroup(c.ramo)}`);
    });
    return keys.size + avulso;
  }
  const monthProds = prods.filter((p) => {
    const d = new Date(p.data_registro);
    return d >= start && d <= end && (!prodFilter?.length || prodFilter.includes(p.consultor));
  });
  if (cat === 'Coleta') return monthProds.filter((p) => p.tipo === 'Coleta').length;
  if (cat === 'Vídeo') return monthProds.filter((p) => p.tipo === 'Visita/Video' && normalizeLabel(p.subtipo) === 'video').length;
  if (cat === 'Visita') return monthProds.filter((p) => p.tipo === 'Visita/Video' && normalizeLabel(p.subtipo) === 'visita').length;
  if (cat === 'Indicação') return monthProds.filter((p) => p.tipo === 'Indicação').length;
  return 0;
};

export const IndicadoresDetailModal = ({
  open,
  onOpenChange,
  chartData,
  produtorData,
  allMetas,
  allProdutos,
  allCotacoes,
  produtorNames,
  currentProdutorFilter,
  dateFilter,
  anoEspecifico,
  dateRangeProp,
  produtores,
  seguradoras,
  ramos,
  unidades,
  currentSeguradoraFilter,
  currentRamoFilter,
  currentSegmentoFilter,
  currentRegraFilter,
  currentUnidadeFilter,
}: IndicadoresDetailModalProps) => {
  const [filterCategoria, setFilterCategoria] = useState<string>('todas');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterProdutor, setFilterProdutor] = useState<string>('todos');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [detailCategoria, setDetailCategoria] = useState<string | null>(null);
  const [detailMonth, setDetailMonth] = useState<string | null>(null);
  const [localPeriodo, setLocalPeriodo] = useState<string>('dashboard');
  const [localDateFrom, setLocalDateFrom] = useState<string>('');
  const [localDateTo, setLocalDateTo] = useState<string>('');

  // Dashboard-mirrored filters (local state, initialized from dashboard)
  const [localProdutorFilter, setLocalProdutorFilter] = useState<string[]>(currentProdutorFilter || []);
  const [localRamoFilter, setLocalRamoFilter] = useState<string[]>(currentRamoFilter || []);
  const [localSegmentoFilter, setLocalSegmentoFilter] = useState<string[]>(currentSegmentoFilter || []);
  const [localDateFilter, setLocalDateFilter] = useState<string>(dateFilter || 'mes_atual');
  const [localAnoEspecifico, setLocalAnoEspecifico] = useState<string>(anoEspecifico || '');
  const [localDateRange, setLocalDateRange] = useState(dateRangeProp);

  const parseBrDate = (v: string): Date | null => {
    if (!v || v.length !== 10) return null;
    const d = parse(v, 'dd/MM/yyyy', new Date());
    return isValid(d) ? d : null;
  };

  const formatDateInput = (value: string, prev: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const toggleExpand = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Effective produtor filter
  const effectiveProdutorFilter = useMemo(() => {
    if (localProdutorFilter.length > 0) return localProdutorFilter;
    return undefined;
  }, [localProdutorFilter]);

  // Compute the active date range from local filter state
  const dashboardDateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = now;
    const activeDateFilter = localDateFilter;
    const activeAno = localAnoEspecifico;

    switch (activeDateFilter) {
      case '30dias':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
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
        end = now;
        break;
      case 'ano_anterior':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31);
        break;
      case 'ano_especifico': {
        const year = parseInt(activeAno || '') || now.getFullYear();
        start = new Date(year, 0, 1);
        end = new Date(year, 11, 31);
        break;
      }
      case 'personalizado':
        start = localDateRange?.from || now;
        end = localDateRange?.to || start;
        break;
      default:
        start = new Date(2000, 0, 1);
        end = new Date(2099, 11, 31);
        break;
    }
    return { start, end };
  }, [localDateFilter, localAnoEspecifico, localDateRange]);

  const filterStartMonth = format(dashboardDateRange.start, 'yyyy-MM');
  const filterEndMonth = format(dashboardDateRange.end, 'yyyy-MM');

  // Distinct months restricted to the filtered date range
  const availableMonths = useMemo(() => {
    const isInRange = (mk: string) => mk >= filterStartMonth && mk <= filterEndMonth;
    const months = new Set<string>();
    allMetas.forEach((m) => {
      const mk = m.mes.substring(0, 7);
      if (isInRange(mk)) months.add(mk);
    });
    allProdutos.forEach((p) => {
      const mk = p.data_registro.substring(0, 7);
      if (isInRange(mk)) months.add(mk);
    });
    (allCotacoes || []).forEach((c) => {
      const mk = c.data_cotacao.substring(0, 7);
      if (isInRange(mk)) months.add(mk);
      if (c.data_fechamento) {
        const fk = c.data_fechamento.substring(0, 7);
        if (isInRange(fk)) months.add(fk);
      }
    });
    return Array.from(months).sort();
  }, [allMetas, allProdutos, allCotacoes, filterStartMonth, filterEndMonth]);

  // Monthly data per category (compute FIRST, then derive totals from it)
  const monthlyData = useMemo(() => {
    const result: Record<string, MonthlyRow[]> = {};
    CATEGORIES.forEach((cat) => {
      const rows: MonthlyRow[] = [];
      availableMonths.forEach((monthKey) => {
        const start = startOfMonth(parseISO(`${monthKey}-01`));
        const end = endOfMonth(start);

        const metaTotal = allMetas
          .filter((m) =>
            m.mes.startsWith(monthKey) &&
            isMetaType(m.tipo_meta?.descricao, cat) &&
            (!effectiveProdutorFilter?.length || (m.produtor && effectiveProdutorFilter.includes(m.produtor.nome)))
          )
          .reduce((s, m) => s + m.quantidade, 0);

        const realizado = computeRealized(cat, allProdutos, allCotacoes || [], start, end, effectiveProdutorFilter, localRamoFilter.length > 0 ? localRamoFilter : undefined, localSegmentoFilter.length > 0 ? localSegmentoFilter : undefined);

        if (metaTotal > 0 || realizado > 0) {
          const pct = metaTotal > 0 ? (realizado / metaTotal) * 100 : 0;
          rows.push({ monthLabel: format(start, "MMM/yy", { locale: ptBR }), monthKey, meta: metaTotal, realizado, pct });
        }
      });
      result[cat] = rows;
    });
    return result;
  }, [availableMonths, allMetas, allProdutos, allCotacoes, effectiveProdutorFilter, localRamoFilter, localSegmentoFilter]);

  // Main category totals derived from monthly data (ensures consistency)
  const computedChartData = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const months = monthlyData[cat] || [];
      const Meta = months.reduce((s, m) => s + m.meta, 0);
      const Realizado = months.reduce((s, m) => s + m.realizado, 0);
      return { categoria: cat, Meta, Realizado };
    });
  }, [monthlyData]);

  const enrichedData = useMemo(() =>
    computedChartData.map((item) => {
      const pct = item.Meta > 0 ? (item.Realizado / item.Meta) * 100 : 0;
      const falta = Math.max(0, item.Meta - item.Realizado);
      return { ...item, pct, falta };
    }), [computedChartData]);

  // When Ramo or Segmento filters are active, only show Cotação and Fechamento
  const hasRamoSegmentoFilter = localRamoFilter.length > 0 || localSegmentoFilter.length > 0;

  const filtered = useMemo(() => {
    let data = enrichedData;
    if (hasRamoSegmentoFilter) data = data.filter((d) => d.categoria === 'Cotação' || d.categoria === 'Fechamento');
    if (filterCategoria !== 'todas') data = data.filter((d) => d.categoria === filterCategoria);
    if (filterStatus === 'atingido') data = data.filter((d) => d.pct >= 100);
    else if (filterStatus === 'parcial') data = data.filter((d) => d.pct >= 70 && d.pct < 100);
    else if (filterStatus === 'critico') data = data.filter((d) => d.pct < 70);
    return data;
  }, [enrichedData, filterCategoria, filterStatus, hasRamoSegmentoFilter]);

  const totals = useMemo(() => {
    const m = filtered.reduce((s, i) => s + i.Meta, 0);
    const r = filtered.reduce((s, i) => s + i.Realizado, 0);
    return { meta: m, realizado: r, pct: m > 0 ? (r / m) * 100 : 0 };
  }, [filtered]);

  // Recompute produtor ranking from scratch using availableMonths (same scope as category breakdown)
  const computedProdutorData = useMemo(() => {
    const prodNames = new Set<string>();
    allMetas.forEach((m) => {
      if (m.produtor?.nome && availableMonths.some((mk) => m.mes.startsWith(mk))) {
        prodNames.add(m.produtor.nome);
      }
    });
    allProdutos.forEach((p) => {
      if (availableMonths.some((mk) => p.data_registro.startsWith(mk))) {
        prodNames.add(p.consultor);
      }
    });

    return Array.from(prodNames).map((nome) => {
      let totalMeta = 0;
      let totalRealizado = 0;

      availableMonths.forEach((monthKey) => {
        const start = startOfMonth(parseISO(`${monthKey}-01`));
        const end = endOfMonth(start);

        // Sum metas for this producer across all categories
        const monthMeta = allMetas
          .filter((m) => m.mes.startsWith(monthKey) && m.produtor?.nome === nome)
          .reduce((s, m) => s + m.quantidade, 0);

        // Sum realized for this producer across all categories
        let monthRealizado = 0;
        CATEGORIES.forEach((cat) => {
          monthRealizado += computeRealized(cat, allProdutos, allCotacoes || [], start, end, [nome]);
        });

        totalMeta += monthMeta;
        totalRealizado += monthRealizado;
      });

      const pct = totalMeta > 0 ? (totalRealizado / totalMeta) * 100 : 0;
      return { nome, meta: totalMeta, realizado: totalRealizado, pct };
    }).filter((p) => p.meta > 0 || p.realizado > 0);
  }, [availableMonths, allMetas, allProdutos, allCotacoes]);

  const filteredProdutores = useMemo(() => {
    let data = [...computedProdutorData];
    if (localProdutorFilter.length > 0) data = data.filter((d) => localProdutorFilter.includes(d.nome));
    if (filterStatus === 'atingido') data = data.filter((d) => d.pct >= 100);
    else if (filterStatus === 'parcial') data = data.filter((d) => d.pct >= 70 && d.pct < 100);
    else if (filterStatus === 'critico') data = data.filter((d) => d.pct < 70);
    return data.sort((a, b) => b.pct - a.pct);
  }, [computedProdutorData, filterStatus, localProdutorFilter]);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[calc(100vw-2rem)] max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-foreground" />
            Analítico — Meta x Realizado
          </DialogTitle>
        </DialogHeader>

        {/* Dashboard-style Filters */}
        <div className="bg-muted/30 border border-border/50 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Período */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Período:</span>
              <Select value={localDateFilter} onValueChange={setLocalDateFilter}>
                <SelectTrigger className="h-7 text-xs border-border/60 bg-background w-auto min-w-[120px] gap-1 px-2.5 rounded-md">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes_atual">Este mês</SelectItem>
                  <SelectItem value="mes_anterior">Mês passado</SelectItem>
                  <SelectItem value="ano_atual">Ano atual</SelectItem>
                  <SelectItem value="ano_anterior">Ano anterior</SelectItem>
                  <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                  <SelectItem value="ano_especifico">Ano específico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {localDateFilter === 'personalizado' && (
              <div className="shrink-0 w-[250px]">
                <DatePickerWithRange
                  date={localDateRange as any}
                  onDateChange={(range) => setLocalDateRange(range)}
                />
              </div>
            )}

            {localDateFilter === 'ano_especifico' && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-medium text-muted-foreground">Ano:</span>
                <Select value={localAnoEspecifico} onValueChange={setLocalAnoEspecifico}>
                  <SelectTrigger className="h-7 text-xs border-border/60 bg-background w-[80px] gap-1 px-2.5 rounded-md">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="h-4 w-px bg-border/60 shrink-0 hidden sm:block" />

            {/* Produtor */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Produtor:</span>
              <div className="w-[140px]">
                <MultiSelect
                  options={produtores.filter(p => p.ativo).map(p => ({ value: p.nome, label: p.nome }))}
                  selected={localProdutorFilter}
                  onChange={setLocalProdutorFilter}
                  placeholder="Todos"
                  className="h-7 text-xs"
                />
              </div>
            </div>

            {/* Ramo */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Ramo:</span>
              <div className="w-[100px]">
                <MultiSelect
                  options={ramos.filter(r => r.ativo).map(r => ({ value: r.descricao, label: r.descricao }))}
                  selected={localRamoFilter}
                  onChange={setLocalRamoFilter}
                  placeholder="Todos"
                  className="h-7 text-xs"
                />
              </div>
            </div>

            {/* Segmento */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Segmento:</span>
              <div className="w-[120px]">
                <MultiSelect
                  options={(() => { const s = new Set<string>(); ramos.forEach(r => { if (r.segmento) s.add(r.segmento); }); return Array.from(s).sort().map(v => ({ value: v, label: v })); })()}
                  selected={localSegmentoFilter}
                  onChange={setLocalSegmentoFilter}
                  placeholder="Todos"
                  className="h-7 text-xs"
                />
              </div>
            </div>

            <div className="flex-1 min-w-[4px]" />

            {/* Categoria & Status filters */}
            <div className="h-4 w-px bg-border/60 shrink-0 hidden sm:block" />
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="h-7 text-xs border-border/60 bg-background w-auto min-w-[130px] gap-1 px-2.5 rounded-md">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas categorias</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-7 text-xs border-border/60 bg-background w-auto min-w-[130px] gap-1 px-2.5 rounded-md">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos status</SelectItem>
                <SelectItem value="atingido">✅ Atingido (≥100%)</SelectItem>
                <SelectItem value="parcial">⚠️ Parcial (70-99%)</SelectItem>
                <SelectItem value="critico">🔴 Crítico (&lt;70%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-2xl font-bold">{totals.meta}</p>
            <p className="text-[11px] text-muted-foreground">Total Meta</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-2xl font-bold text-primary">{totals.realizado}</p>
            <p className="text-[11px] text-muted-foreground">Total Realizado</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className={`text-2xl font-bold ${getStatusColor(totals.pct)}`}>
              {totals.pct.toFixed(1)}%
            </p>
            <p className="text-[11px] text-muted-foreground">% Atingido</p>
          </div>
        </div>

        {/* Detail table with expandable months */}
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Detalhamento por Categoria</h3>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground w-8"></th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Categoria</th>
                  <th className="text-center px-3 py-2 font-medium text-muted-foreground">Meta</th>
                  <th className="text-center px-3 py-2 font-medium text-muted-foreground">Realizado</th>
                  <th className="text-center px-3 py-2 font-medium text-muted-foreground">Faltam</th>
                  <th className="text-center px-3 py-2 font-medium text-muted-foreground">% Atingido</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground w-[120px]">Progresso</th>
                  <th className="text-center px-3 py-2 font-medium text-muted-foreground w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const isExpanded = expandedCategories.has(item.categoria);
                  const months = monthlyData[item.categoria] || [];
                  const hasMonths = months.length > 0;

                  return (
                    <Fragment key={item.categoria}>
                      <tr
                        className={`border-t hover:bg-muted/20 transition-colors ${hasMonths ? 'cursor-pointer select-none' : ''}`}
                        onClick={() => hasMonths && toggleExpand(item.categoria)}
                      >
                        <td className="px-2 py-2.5 text-muted-foreground">
                          {hasMonths && (
                            isExpanded
                              ? <ChevronDown className="h-3.5 w-3.5" />
                              : <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-medium">{item.categoria}</td>
                        <td className="px-3 py-2.5 text-center text-muted-foreground">{item.Meta}</td>
                        <td className="px-3 py-2.5 text-center font-semibold text-primary">{item.Realizado}</td>
                        <td className="px-3 py-2.5 text-center">
                          {item.falta > 0 ? (
                            <span className="text-destructive font-medium">{item.falta}</span>
                          ) : (
                            <span className="text-success font-medium">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Badge variant="outline" className={`text-[11px] px-2 ${getStatusBg(item.pct)}`}>
                            {item.pct.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <Progress
                            value={Math.min(item.pct, 100)}
                            className={`h-2 ${getProgressColor(item.pct)}`}
                          />
                        </td>
                        <td className="px-2 py-2.5"></td>
                      </tr>
                      {isExpanded && months.map((m) => (
                        <tr key={`${item.categoria}-${m.monthKey}`} className="border-t bg-muted/10">
                          <td className="px-2 py-1.5 text-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={(e) => { e.stopPropagation(); setDetailCategoria(item.categoria); setDetailMonth(m.monthKey); }}
                                  >
                                    <Eye className="h-3 w-3 text-muted-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left"><p className="text-xs">Ver registros</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </td>
                          <td className="px-3 py-1.5 text-xs text-muted-foreground pl-8 capitalize">{m.monthLabel}</td>
                          <td className="px-3 py-1.5 text-center text-xs text-muted-foreground">{m.meta}</td>
                          <td className="px-3 py-1.5 text-center text-xs font-medium text-primary">{m.realizado}</td>
                          <td className="px-3 py-1.5 text-center text-xs">
                            {m.meta - m.realizado > 0 ? (
                              <span className="text-destructive">{m.meta - m.realizado}</span>
                            ) : (
                              <span className="text-success">—</span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <span className={`text-[10px] font-medium ${getStatusColor(m.pct)}`}>
                              {m.pct.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-3 py-1.5">
                            <Progress
                              value={Math.min(m.pct, 100)}
                              className={`h-1.5 ${getProgressColor(m.pct)}`}
                            />
                          </td>
                          <td className="px-2 py-1.5"></td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground text-sm">
                      Nenhum resultado com os filtros aplicados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Produtor ranking */}
        {filteredProdutores.length > 0 && (
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Ranking por Produtor</h3>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Produtor</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Meta</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Realizado</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">%</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground w-[140px]">Progresso</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProdutores.map((p, i) => (
                    <tr key={p.nome} className="border-t hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="px-3 py-2.5 font-medium flex items-center gap-1.5">
                        <TrendIcon pct={p.pct} />
                        {p.nome}
                      </td>
                      <td className="px-3 py-2.5 text-center text-muted-foreground">{p.meta}</td>
                      <td className="px-3 py-2.5 text-center font-semibold text-primary">{p.realizado}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-semibold ${getStatusColor(p.pct)}`}>
                          {p.pct.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Progress
                          value={Math.min(p.pct, 100)}
                          className={`h-2 ${getProgressColor(p.pct)}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>

    {detailCategoria && (
      <CategoriaDetailPopup
        open={!!detailCategoria}
        onOpenChange={(open) => { if (!open) { setDetailCategoria(null); setDetailMonth(null); } }}
        categoria={detailCategoria}
        allProdutos={allProdutos}
        allCotacoes={allCotacoes || []}
        produtorFilter={effectiveProdutorFilter}
        availableMonths={detailMonth ? [detailMonth] : availableMonths}
      />
    )}
  </>
  );
};
