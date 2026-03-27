import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import {
  TrendingUp, DollarSign, Clock, BarChart3, AlertTriangle,
  Building2, Layers, Search, ArrowRight, CheckCircle2, XCircle, FileText, Zap,
  ArrowUpDown, ArrowUp, ArrowDown, SlidersHorizontal
} from 'lucide-react';
import { type Cotacao } from '@/hooks/useSupabaseData';
import { useMemo, useState, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Legend } from 'recharts';
import { getRamoGroup } from '@/lib/ramoClassification';
import type { DashboardFilterValues } from './DashboardFilters';

const ROLE_KEY_MAP = {
  origem: 'produtor_origem' as const,
  negociador: 'produtor_negociador' as const,
  cotador: 'produtor_cotador' as const
};
const ROLE_LABELS: Record<string, string> = {
  origem: 'Produtor Origem',
  negociador: 'Produtor Negociador',
  cotador: 'Produtor Cotador'
};
const ROLE_DESCRIPTIONS: Record<string, string> = {
  origem: 'Responsável pela captação e relacionamento comercial',
  negociador: 'Responsável pela negociação com o cliente',
  cotador: 'Responsável operacional pela cotação'
};
const ROLE_DOT_CLASSES: Record<string, string> = {
  origem: 'bg-primary',
  negociador: 'bg-brand-orange',
  cotador: 'bg-success'
};
const ROLE_BUTTON_CLASSES: Record<string, string> = {
  origem: 'bg-primary text-primary-foreground border-primary/30 shadow-sm',
  negociador: 'bg-brand-orange text-brand-orange-foreground border-brand-orange/30 shadow-sm',
  cotador: 'bg-success text-success-foreground border-success/30 shadow-sm'
};

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const CLOSED_STATUSES = ['Negócio fechado', 'Fechamento congênere'];

const getDistinctQuoteKey = (cotacao: Cotacao) => `${cotacao.cpf_cnpj}_${getRamoGroup(cotacao.ramo)}`;

const getQuoteTimestamp = (cotacao: Cotacao) => {
  const referenceDate = CLOSED_STATUSES.includes(cotacao.status)
    ? cotacao.data_fechamento || cotacao.updated_at || cotacao.data_cotacao
    : cotacao.updated_at || cotacao.data_cotacao;

  const parsed = referenceDate ? new Date(referenceDate).getTime() : 0;
  return Number.isNaN(parsed) ? 0 : parsed;
};

const countDistinctByStatus = (cotacoes: Cotacao[], statuses: string[]) => {
  const keys = new Set<string>();

  cotacoes.forEach((cotacao) => {
    if (statuses.includes(cotacao.status)) {
      keys.add(getDistinctQuoteKey(cotacao));
    }
  });

  return keys.size;
};

const buildDistinctGroupedAnalysis = (
  cotacoes: Cotacao[],
  getGroupName: (cotacao: Cotacao) => string,
) => {
  const map = new Map<string, {
    nome: string;
    emCotacaoKeys: Set<string>;
    fechadosKeys: Set<string>;
    declinadosKeys: Set<string>;
    premio: number;
  }>();

  cotacoes.forEach((cotacao) => {
    const nome = getGroupName(cotacao);
    const entry = map.get(nome) || {
      nome,
      emCotacaoKeys: new Set<string>(),
      fechadosKeys: new Set<string>(),
      declinadosKeys: new Set<string>(),
      premio: 0,
    };

    const distinctKey = getDistinctQuoteKey(cotacao);

    if (cotacao.status === 'Em cotação') entry.emCotacaoKeys.add(distinctKey);
    if (CLOSED_STATUSES.includes(cotacao.status)) {
      entry.fechadosKeys.add(distinctKey);
      entry.premio += cotacao.valor_premio || 0;
    }
    if (cotacao.status === 'Declinado') entry.declinadosKeys.add(distinctKey);

    map.set(nome, entry);
  });

  return Array.from(map.values())
    .map((entry) => ({
      nome: entry.nome,
      total: entry.emCotacaoKeys.size,
      fechados: entry.fechadosKeys.size,
      declinados: entry.declinadosKeys.size,
      emCotacao: entry.emCotacaoKeys.size,
      oportunidades: entry.emCotacaoKeys.size + entry.fechadosKeys.size + entry.declinadosKeys.size,
      premio: entry.premio,
    }))
    .sort((a, b) => b.total - a.total || b.fechados - a.fechados);
};

const buildDistinctInsurerAnalysis = (cotacoes: Cotacao[]) => {
  const latestOpenByKey = new Map<string, Cotacao>();
  const latestClosedByKey = new Map<string, Cotacao>();
  const latestDeclinedByKey = new Map<string, Cotacao>();

  cotacoes.forEach((cotacao) => {
    const distinctKey = getDistinctQuoteKey(cotacao);

    if (cotacao.status === 'Em cotação') {
      const current = latestOpenByKey.get(distinctKey);
      if (!current || getQuoteTimestamp(cotacao) >= getQuoteTimestamp(current)) {
        latestOpenByKey.set(distinctKey, cotacao);
      }
      return;
    }

    if (CLOSED_STATUSES.includes(cotacao.status)) {
      const current = latestClosedByKey.get(distinctKey);
      if (!current || getQuoteTimestamp(cotacao) >= getQuoteTimestamp(current)) {
        latestClosedByKey.set(distinctKey, cotacao);
      }
      return;
    }

    if (cotacao.status === 'Declinado') {
      const current = latestDeclinedByKey.get(distinctKey);
      if (!current || getQuoteTimestamp(cotacao) >= getQuoteTimestamp(current)) {
        latestDeclinedByKey.set(distinctKey, cotacao);
      }
    }
  });

  const insurerMap = new Map<string, {
    nome: string;
    emCotacaoKeys: Set<string>;
    fechadosKeys: Set<string>;
    declinadosKeys: Set<string>;
    premio: number;
  }>();

  const assignToInsurer = (cotacao: Cotacao, bucket: 'emCotacao' | 'fechados' | 'declinados') => {
    const nome = cotacao.seguradora?.nome || 'Sem seguradora';
    const distinctKey = getDistinctQuoteKey(cotacao);
    const entry = insurerMap.get(nome) || {
      nome,
      emCotacaoKeys: new Set<string>(),
      fechadosKeys: new Set<string>(),
      declinadosKeys: new Set<string>(),
      premio: 0,
    };

    if (bucket === 'emCotacao') entry.emCotacaoKeys.add(distinctKey);
    if (bucket === 'fechados') {
      entry.fechadosKeys.add(distinctKey);
      entry.premio += cotacao.valor_premio || 0;
    }
    if (bucket === 'declinados') entry.declinadosKeys.add(distinctKey);

    insurerMap.set(nome, entry);
  };

  latestOpenByKey.forEach((cotacao) => assignToInsurer(cotacao, 'emCotacao'));
  latestClosedByKey.forEach((cotacao) => assignToInsurer(cotacao, 'fechados'));
  latestDeclinedByKey.forEach((cotacao) => assignToInsurer(cotacao, 'declinados'));

  return Array.from(insurerMap.values())
    .map((entry) => ({
      nome: entry.nome,
      total: entry.emCotacaoKeys.size,
      fechados: entry.fechadosKeys.size,
      declinados: entry.declinadosKeys.size,
      emCotacao: entry.emCotacaoKeys.size,
      oportunidades: entry.emCotacaoKeys.size + entry.fechadosKeys.size + entry.declinadosKeys.size,
      premio: entry.premio,
    }))
    .sort((a, b) => b.total - a.total || b.fechados - a.fechados || b.declinados - a.declinados);
};

interface FunnelDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cotacoes: Cotacao[];
  allCotacoes: Cotacao[];
  dashboardFilters: DashboardFilterValues;
  initialStage: string;
  totalDistinct?: number;
  dashboardCounts?: {
    emCotacao: number;
    fechados: number;
    declinados: number;
  };
}

type SortField = 'numero' | 'segurado' | 'origem' | 'negociador' | 'cotador' | 'status' | 'premio';
type SortDir = 'asc' | 'desc';

const getDateRangeFromFilter = (filters: DashboardFilterValues): { start?: Date; end?: Date } => {
  const now = new Date();
  let start: Date;
  let end: Date = now;

  switch (filters.dateFilter) {
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
      end = new Date(now.getFullYear(), 11, 31);
      break;
    case 'ano_anterior':
      start = new Date(now.getFullYear() - 1, 0, 1);
      end = new Date(now.getFullYear() - 1, 11, 31);
      break;
    case 'ano_especifico': {
      const year = parseInt(filters.anoEspecifico) || now.getFullYear();
      start = new Date(year, 0, 1);
      end = new Date(year, 11, 31);
      break;
    }
    case 'personalizado':
      if (!filters.dateRange?.from) return {};
      start = filters.dateRange.from;
      end = filters.dateRange.to || filters.dateRange.from;
      break;
    default:
      return {};
  }

  return { start, end };
};

const isWithinPeriod = (value: string | null | undefined, start?: Date, end?: Date) => {
  if (!start || !end || !value) return false;
  const date = new Date(value);
  return date >= start && date <= end;
};

const matchesDashboardNonDateFilters = (cotacao: Cotacao, filters: DashboardFilterValues) => {
  const produtorMatch = filters.produtorFilter.length === 0 || (
    cotacao.status === 'Em cotação'
      ? !!cotacao.produtor_cotador?.nome && filters.produtorFilter.includes(cotacao.produtor_cotador.nome)
      : !!cotacao.produtor_origem?.nome && filters.produtorFilter.includes(cotacao.produtor_origem.nome)
  );

  const seguradoraMatch = filters.seguradoraFilter.length === 0 || (!!cotacao.seguradora?.nome && filters.seguradoraFilter.includes(cotacao.seguradora.nome));
  const ramoMatch = filters.ramoFilter.length === 0 || (!!cotacao.ramo?.descricao && filters.ramoFilter.includes(cotacao.ramo.descricao));
  const segmentoMatch = filters.segmentoFilter.length === 0 || (!!cotacao.ramo?.segmento && filters.segmentoFilter.includes(cotacao.ramo.segmento));
  const regraMatch = filters.regraFilter.length === 0 || (!!cotacao.ramo?.regra && filters.regraFilter.includes(cotacao.ramo.regra));
  const unidadeMatch = filters.unidadeFilter.length === 0 || (!!cotacao.unidade?.descricao && filters.unidadeFilter.includes(cotacao.unidade.descricao));

  return produtorMatch && seguradoraMatch && ramoMatch && segmentoMatch && regraMatch && unidadeMatch;
};

export function FunnelDetailModal({ open, onOpenChange, cotacoes, allCotacoes, dashboardFilters, initialStage, totalDistinct, dashboardCounts }: FunnelDetailModalProps) {
  const [activeStage, setActiveStage] = useState(initialStage);
  const [filterSeguradora, setFilterSeguradora] = useState('all');
  const [filterProdutor, setFilterProdutor] = useState('all');
  const [filterRamo, setFilterRamo] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('numero');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [resultPeriodMode, setResultPeriodMode] = useState<'dashboard' | 'custom'>('dashboard');
  const [resultDateRange, setResultDateRange] = useState<DateRange | undefined>(dashboardFilters.dateRange);

  useEffect(() => {
    if (open) {
      setActiveStage(initialStage);
      setFilterSeguradora('all');
      setFilterProdutor('all');
      setFilterRamo('all');
      setSearchTerm('');
      setSortField('numero');
      setSortDir('desc');
      setResultPeriodMode('dashboard');
      setResultDateRange(dashboardFilters.dateRange);
    }
  }, [dashboardFilters.dateRange, initialStage, open]);

  const roleKey = ROLE_KEY_MAP[activeStage as keyof typeof ROLE_KEY_MAP] || 'produtor_origem';

  const filterOptions = useMemo(() => {
    const seg = new Map<string, string>();
    const prod = new Map<string, string>();
    const ram = new Map<string, string>();
    cotacoes.forEach((c) => {
      if (c.seguradora?.nome) seg.set(c.seguradora_id!, c.seguradora.nome);
      [c.produtor_origem, c.produtor_negociador, c.produtor_cotador].forEach((p) => {
        if (p?.nome && p?.id) prod.set(p.id, p.nome);
      });
      if (c.ramo?.descricao) ram.set(c.ramo_id!, c.ramo.ramo_agrupado || c.ramo.descricao);
    });
    return {
      seguradoras: Array.from(seg, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome)),
      produtores: Array.from(prod, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome)),
      ramos: Array.from(ram, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome))
    };
  }, [cotacoes]);

  const resultPeriod = useMemo(() => {
    if (resultPeriodMode === 'custom') {
      return {
        start: resultDateRange?.from,
        end: resultDateRange?.to || resultDateRange?.from,
      };
    }

    return getDateRangeFromFilter(dashboardFilters);
  }, [dashboardFilters, resultDateRange, resultPeriodMode]);

  const stageCotacoes = useMemo(() => {
    const dashboardScoped = allCotacoes.filter((c) => matchesDashboardNonDateFilters(c, dashboardFilters));

    let filtered = dashboardScoped.filter((c) => {
      if (!c[roleKey]?.nome) return false;

      if (c.status === 'Em cotação') return true;
      if (c.status === 'Declinado') return isWithinPeriod(c.data_cotacao, resultPeriod.start, resultPeriod.end);
      if (CLOSED_STATUSES.includes(c.status)) return isWithinPeriod(c.data_fechamento, resultPeriod.start, resultPeriod.end);

      return false;
    });

    if (filterSeguradora !== 'all') filtered = filtered.filter((c) => c.seguradora_id === filterSeguradora);
    if (filterProdutor !== 'all') {
      filtered = filtered.filter((c) => {
        const prodId = activeStage === 'origem' ? c.produtor_origem_id
          : activeStage === 'negociador' ? c.produtor_negociador_id
          : c.produtor_cotador_id;
        return prodId === filterProdutor;
      });
    }
    if (filterRamo !== 'all') filtered = filtered.filter((c) => c.ramo_id === filterRamo);
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      filtered = filtered.filter((c) => c.segurado.toLowerCase().includes(t) || c.cpf_cnpj.includes(t));
    }
    return filtered;
  }, [allCotacoes, dashboardFilters, roleKey, activeStage, filterSeguradora, filterProdutor, filterRamo, searchTerm, resultPeriod]);

  // Producer ranking for the active role
  const produtorRanking = useMemo(() => {
    const map = new Map<string, {
      nome: string;
      emCotacaoKeys: Set<string>;
      fechadosKeys: Set<string>;
      declinadosKeys: Set<string>;
      premio: number;
    }>();

    stageCotacoes.forEach((c) => {
      const prod = c[roleKey];
      if (!prod?.nome) return;
      const nome = prod.nome;
      const e = map.get(nome) || {
        nome,
        emCotacaoKeys: new Set<string>(),
        fechadosKeys: new Set<string>(),
        declinadosKeys: new Set<string>(),
        premio: 0,
      };
      const distinctKey = getDistinctQuoteKey(c);

      if (c.status === 'Em cotação') e.emCotacaoKeys.add(distinctKey);
      if (c.status === 'Declinado') e.declinadosKeys.add(distinctKey);
      if (c.status === 'Negócio fechado' || c.status === 'Fechamento congênere') {
        e.fechadosKeys.add(distinctKey);
        e.premio += c.valor_premio || 0;
      }

      map.set(nome, e);
    });

    return Array.from(map.values())
      .map((entry) => {
        const emCotacao = entry.emCotacaoKeys.size;
        const fechados = entry.fechadosKeys.size;
        const declinados = entry.declinadosKeys.size;

        return {
          nome: entry.nome,
          emCotacao,
          fechados,
          declinados,
          total: emCotacao + fechados + declinados,
          premio: entry.premio,
        };
      })
      .sort((a, b) => b.total - a.total || b.fechados - a.fechados);
  }, [stageCotacoes, roleKey]);

  // KPIs
  const kpis = useMemo(() => {
    const emCotacaoDistinct = countDistinctByStatus(stageCotacoes, ['Em cotação']);
    const fechadosDistinct = countDistinctByStatus(stageCotacoes, CLOSED_STATUSES);
    const declinadosDistinct = countDistinctByStatus(stageCotacoes, ['Declinado']);
    const usingDashboardTotals = resultPeriodMode === 'dashboard'
      && filterSeguradora === 'all'
      && filterProdutor === 'all'
      && filterRamo === 'all'
      && !searchTerm.trim();
    const emCotacao = usingDashboardTotals ? (dashboardCounts?.emCotacao ?? totalDistinct ?? emCotacaoDistinct) : emCotacaoDistinct;
    const fechados = usingDashboardTotals ? (dashboardCounts?.fechados ?? fechadosDistinct) : fechadosDistinct;
    const declinados = usingDashboardTotals ? (dashboardCounts?.declinados ?? declinadosDistinct) : declinadosDistinct;
    const oportunidades = emCotacao + fechados + declinados;
    const premio = stageCotacoes.filter((c) => CLOSED_STATUSES.includes(c.status)).reduce((s, c) => s + (c.valor_premio || 0), 0);
    const ticketMedio = fechados > 0 ? premio / fechados : 0;
    const taxaConversao = oportunidades > 0 ? fechados / oportunidades * 100 : 0;
    const tempos: number[] = [];
    stageCotacoes.filter((c) => c.status === 'Declinado' || CLOSED_STATUSES.includes(c.status)).forEach((c) => {
      const start = new Date(c.data_cotacao).getTime();
      const end = c.data_fechamento ? new Date(c.data_fechamento).getTime() : Date.now();
      tempos.push((end - start) / (1000 * 60 * 60 * 24));
    });
    const tempoMedio = tempos.length > 0 ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0;
    const premioFechado = stageCotacoes.filter((c) => c.status === 'Negócio fechado' || c.status === 'Fechamento congênere').reduce((s, c) => s + (c.valor_premio || 0), 0);
    const premioEmAberto = stageCotacoes.filter((c) => c.status === 'Em cotação').reduce((s, c) => s + (c.valor_premio || 0), 0);
    return { total: emCotacao, oportunidades, premio, ticketMedio, taxaConversao, tempoMedio, fechados, declinados, emCotacao, premioFechado, premioEmAberto };
  }, [stageCotacoes, resultPeriodMode, filterSeguradora, filterProdutor, filterRamo, searchTerm, dashboardCounts, totalDistinct]);

  const headerTotal = kpis.total;

  // Flow data with consolidation: same CNPJ + Ramo Group + Origem=Negociador=Cotador → 1 row
  const flowData = useMemo(() => {
    // Group cotacoes by consolidation key
    const consolidationMap = new Map<string, {
      ids: string[];
      numeros: string[];
      segurado: string;
      ramoAgrupado: string;
      origem: string;
      negociador: string;
      cotador: string;
      premio: number;
      statuses: string[];
      statusList: string[];
      canConsolidate: boolean;
      dias: number;
      cotacoes: Cotacao[];
    }>();

    stageCotacoes.forEach((c) => {
      const origemNome = c.produtor_origem?.nome || '—';
      const negociadorNome = c.produtor_negociador?.nome || '—';
      const cotadorNome = c.produtor_cotador?.nome || '—';
      const ramoGroup = getRamoGroup(c.ramo);
      const canConsolidate = origemNome === negociadorNome && negociadorNome === cotadorNome && origemNome !== '—';

      const consolidationKey = canConsolidate
        ? `${c.cpf_cnpj}_${ramoGroup}_${origemNome}`
        : c.id; // unique key for non-consolidatable rows

      const existing = consolidationMap.get(consolidationKey);
      if (existing) {
        existing.ids.push(c.id);
        existing.numeros.push(c.numero_cotacao);
        existing.premio += c.valor_premio || 0;
        existing.statuses.push(c.status);
        if (!existing.statusList.includes(c.status)) existing.statusList.push(c.status);
        existing.cotacoes.push(c);
      } else {
        // Calculate dias
        const startDate = new Date(c.data_cotacao).getTime();
        const endDate = c.data_fechamento ? new Date(c.data_fechamento).getTime() : Date.now();
        const dias = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));

        consolidationMap.set(consolidationKey, {
          ids: [c.id],
          numeros: [c.numero_cotacao],
          segurado: c.segurado,
          ramoAgrupado: ramoGroup,
          origem: origemNome,
          negociador: negociadorNome,
          cotador: cotadorNome,
          premio: c.valor_premio || 0,
          statuses: [c.status],
          statusList: [c.status],
          canConsolidate,
          dias,
          cotacoes: [c],
        });
      }
    });

    // Recalculate dias for consolidated rows (max range)
    const rows = Array.from(consolidationMap.values()).map((group) => {
      let dias = group.dias;
      if (group.cotacoes.length > 1) {
        const starts = group.cotacoes.map(c => new Date(c.data_cotacao).getTime());
        const ends = group.cotacoes.map(c => c.data_fechamento ? new Date(c.data_fechamento).getTime() : Date.now());
        const minStart = Math.min(...starts);
        const maxEnd = Math.max(...ends);
        dias = Math.floor((maxEnd - minStart) / (1000 * 60 * 60 * 24));
      }

      return {
        id: group.ids[0],
        ids: group.ids,
        numeros: group.numeros,
        numero: group.numeros[0],
        segurado: group.segurado,
        ramoAgrupado: group.ramoAgrupado,
        origem: group.origem,
        negociador: group.negociador,
        cotador: group.cotador,
        premio: group.premio,
        status: group.statusList.length === 1 ? group.statusList[0] : 'Múltiplos',
        statusList: group.statusList,
        statusCount: group.statuses.length,
        consolidated: group.cotacoes.length > 1,
        dias,
      };
    });

    rows.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'premio') cmp = a.premio - b.premio;
      else cmp = (a[sortField] || '').localeCompare(b[sortField] || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return rows;
  }, [stageCotacoes, sortField, sortDir]);

  // Seguradora analysis
  const seguradoraAnalysis = useMemo(() => buildDistinctInsurerAnalysis(stageCotacoes), [stageCotacoes]);

  // Ramo analysis
  const ramoAnalysis = useMemo(() => {
    return buildDistinctGroupedAnalysis(stageCotacoes, (cotacao) => cotacao.ramo?.ramo_agrupado || cotacao.ramo?.descricao || 'Sem ramo');
  }, [stageCotacoes]);

  // Time evolution
  const timeEvolution = useMemo(() => {
    const monthMap = new Map<string, {
      mes: string;
      emCotacaoKeys: Set<string>;
      fechadosKeys: Set<string>;
      declinadosKeys: Set<string>;
      premio: number;
      premioFechado: number;
    }>();

    stageCotacoes.forEach((c) => {
      const d = new Date(c.data_cotacao);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      const e = monthMap.get(key) || {
        mes: label,
        emCotacaoKeys: new Set<string>(),
        fechadosKeys: new Set<string>(),
        declinadosKeys: new Set<string>(),
        premio: 0,
        premioFechado: 0,
      };
      const distinctKey = getDistinctQuoteKey(c);

      if (c.status === 'Em cotação') e.emCotacaoKeys.add(distinctKey);
      if (c.status === 'Declinado') e.declinadosKeys.add(distinctKey);
      if (CLOSED_STATUSES.includes(c.status)) e.fechadosKeys.add(distinctKey);

      e.premio += c.valor_premio || 0;
      if (CLOSED_STATUSES.includes(c.status)) e.premioFechado += c.valor_premio || 0;
      monthMap.set(key, e);
    });

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => {
        const total = v.emCotacaoKeys.size;
        const fechados = v.fechadosKeys.size;
        const declinados = v.declinadosKeys.size;

        return {
          mes: v.mes,
          total,
          fechados,
          declinados,
          premio: v.premio,
          premioFechado: v.premioFechado,
          conversao: total > 0 ? (fechados / total * 100) : 0,
        };
      });
  }, [stageCotacoes]);

  // Bottlenecks
  const bottlenecks = useMemo(() => {
    const issues: { type: 'warning' | 'critical'; message: string }[] = [];
    if (kpis.tempoMedio > 30) issues.push({ type: 'critical', message: `Tempo médio de ${kpis.tempoMedio.toFixed(0)} dias é elevado` });
    if (kpis.taxaConversao < 20 && kpis.total > 5) issues.push({ type: 'warning', message: `Taxa de conversão de ${kpis.taxaConversao.toFixed(1)}% abaixo do esperado` });
    return issues.slice(0, 4);
  }, [kpis]);

  const statusBadge = (status: string) => {
    if (status === 'Negócio fechado' || status === 'Fechamento congênere')
      return <Badge className="bg-success/15 text-success border-success/30 text-[10px] gap-1"><CheckCircle2 className="h-3 w-3" />{status === 'Negócio fechado' ? 'Fechado' : 'Congênere'}</Badge>;
    if (status === 'Declinado')
      return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] gap-1"><XCircle className="h-3 w-3" />Declinado</Badge>;
    return <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] gap-1"><Clock className="h-3 w-3" />{status}</Badge>;
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />;
  };

  // Active role column highlight style
  const roleColumnStyle = (role: string) => {
    if (role === activeStage) return 'font-bold';
    return 'opacity-50';
  };

  // Chart height based on data rows
  const segChartHeight = Math.max(220, Math.min(seguradoraAnalysis.length * 34, 500));
  const ramoChartHeight = Math.max(220, Math.min(ramoAnalysis.length * 34, 500));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[85vh] overflow-hidden p-0 flex flex-col">
        <div className="border-b border-border/60 bg-gradient-to-b from-muted/20 to-transparent px-4 pt-4 pb-3">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className={`h-3 w-3 rounded-full ${ROLE_DOT_CLASSES[activeStage] || ROLE_DOT_CLASSES.origem}`} />
              {ROLE_LABELS[activeStage] || 'Produtor Origem'}
              <Badge variant="secondary" className="border-border/60 bg-muted/60 text-xs font-medium">{headerTotal} cotações</Badge>
            </DialogTitle>
            <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[activeStage]}</p>
          </DialogHeader>

          {/* Stage pills + Filters */}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/25 p-0.5">
              {Object.entries(ROLE_LABELS).map(([key, label]) =>
                <button
                  key={key}
                  onClick={() => { setActiveStage(key); setFilterProdutor('all'); }}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${activeStage === key
                    ? ROLE_BUTTON_CLASSES[key]
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                >
                  {label.replace('Produtor ', '')}
                </button>
              )}
            </div>

            <Select value={resultPeriodMode} onValueChange={(value: 'dashboard' | 'custom') => setResultPeriodMode(value)}>
              <SelectTrigger className="h-7 w-[150px] border-border/60 bg-background text-[11px]"><SelectValue placeholder="Período" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dashboard">Período do dashboard</SelectItem>
                <SelectItem value="custom">Período do modal</SelectItem>
              </SelectContent>
            </Select>
            {resultPeriodMode === 'custom' && (
              <DatePickerWithRange
                date={resultDateRange}
                onDateChange={setResultDateRange}
                className="h-7"
              />
            )}

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Buscar segurado..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-7 w-[140px] border-border/60 bg-background pl-8 text-[11px]" />
            </div>

            <Select value={filterSeguradora} onValueChange={setFilterSeguradora}>
              <SelectTrigger className="h-7 w-[140px] border-border/60 bg-background text-[11px]"><SelectValue placeholder="Todas seguradoras" /></SelectTrigger>
              <SelectContent>{[<SelectItem key="all" value="all">Todas seguradoras</SelectItem>, ...filterOptions.seguradoras.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)]}</SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1.5 border-border/60 text-[11px] text-muted-foreground hover:text-foreground">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Mais filtros
                  {(filterProdutor !== 'all' || filterRamo !== 'all') && (
                    <Badge className="h-4 min-w-[16px] rounded-full bg-primary px-1 text-[9px] text-primary-foreground">
                      {[filterProdutor !== 'all', filterRamo !== 'all'].filter(Boolean).length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[260px] space-y-3 p-3">
                <p className="text-xs font-semibold text-muted-foreground">Filtros adicionais</p>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Produtor</label>
                    <Select value={filterProdutor} onValueChange={setFilterProdutor}>
                      <SelectTrigger className="h-7 w-full border-border/60 bg-background text-[11px]"><SelectValue placeholder="Todos produtores" /></SelectTrigger>
                      <SelectContent>{[<SelectItem key="all" value="all">Todos produtores</SelectItem>, ...filterOptions.produtores.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)]}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Ramo</label>
                    <Select value={filterRamo} onValueChange={setFilterRamo}>
                      <SelectTrigger className="h-7 w-full border-border/60 bg-background text-[11px]"><SelectValue placeholder="Todos ramos" /></SelectTrigger>
                      <SelectContent>{[<SelectItem key="all" value="all">Todos ramos</SelectItem>, ...filterOptions.ramos.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)]}</SelectContent>
                    </Select>
                  </div>
                </div>
                {(filterProdutor !== 'all' || filterRamo !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-full text-[10px] text-muted-foreground"
                    onClick={() => { setFilterProdutor('all'); setFilterRamo('all'); }}
                  >
                    Limpar filtros
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-3">
            <Tabs defaultValue="fluxo" className="space-y-2">
              <TabsList className="h-9 w-full">
                <TabsTrigger value="fluxo" className="flex-1 text-[11px]">Fluxo Comercial</TabsTrigger>
                <TabsTrigger value="seguradora" className="flex-1 text-[11px]">Seguradora</TabsTrigger>
                <TabsTrigger value="ramo" className="flex-1 text-[11px]">Ramo</TabsTrigger>
                <TabsTrigger value="evolucao" className="flex-1 text-[11px]">Evolução</TabsTrigger>
              </TabsList>

              {/* ─── Tab: Fluxo Comercial ─── */}
              <TabsContent value="fluxo" className="space-y-4">
                {/* Producer ranking for active role - horizontal bar chart */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Distribuição por {ROLE_LABELS[activeStage]?.replace('Produtor ', '')}
                    </h4>
                    <div className="space-y-2">
                      {produtorRanking.map((p, i) => {
                        const maxTotal = produtorRanking[0]?.total || 1;
                        const conv = p.total > 0 ? (p.fechados / p.total * 100) : 0;
                        return (
                          <div key={p.nome} className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-muted-foreground w-5 text-right">{i + 1}.</span>
                            <span className="text-xs font-medium w-[100px] truncate">{p.nome}</span>
                            <div className="flex-1 flex items-center gap-1 h-6">
                              {p.emCotacao > 0 && (
                                <div
                                  className="h-full rounded-l bg-primary/80 flex items-center justify-center text-[9px] text-white font-bold min-w-[18px]"
                                  style={{ width: `${(p.emCotacao / maxTotal) * 100}%` }}
                                  title={`Em cotação: ${p.emCotacao}`}
                                >{p.emCotacao}</div>
                              )}
                              {p.fechados > 0 && (
                                <div
                                  className="h-full bg-success/80 flex items-center justify-center text-[9px] text-white font-bold min-w-[18px]"
                                  style={{ width: `${(p.fechados / maxTotal) * 100}%` }}
                                  title={`Fechados: ${p.fechados}`}
                                >{p.fechados}</div>
                              )}
                              {p.declinados > 0 && (
                                <div
                                  className="h-full rounded-r bg-destructive/80 flex items-center justify-center text-[9px] text-white font-bold min-w-[18px]"
                                  style={{ width: `${(p.declinados / maxTotal) * 100}%` }}
                                  title={`Declinados: ${p.declinados}`}
                                >{p.declinados}</div>
                              )}
                            </div>
                            <Badge className={`text-[9px] shrink-0 ${conv >= 40 ? 'bg-success/15 text-success border-success/30' : conv >= 20 ? 'bg-warning/15 text-warning border-warning/30' : 'bg-muted text-muted-foreground border-border'}`}>
                              {conv.toFixed(0)}%
                            </Badge>
                            <span className="text-[10px] text-success font-semibold w-[80px] text-right shrink-0">{formatCurrency(p.premio)}</span>
                          </div>
                        );
                      })}
                      {produtorRanking.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhum produtor encontrado.</p>}
                    </div>
                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-3 pt-2 border-t">
                      <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-primary/80" /><span className="text-[10px] text-muted-foreground">Em cotação</span></div>
                      <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-success/80" /><span className="text-[10px] text-muted-foreground">Fechados</span></div>
                      <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-destructive/80" /><span className="text-[10px] text-muted-foreground">Declinados</span></div>
                    </div>
                  </CardContent>
                </Card>

                {/* Table with sorting - highlight active role column */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-primary" />
                      Progressão das Cotações
                      <span className="text-[10px] text-muted-foreground font-normal ml-auto">Origem → Negociador → Cotador → Resultado</span>
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[70px] cursor-pointer" onClick={() => toggleSort('numero')}>
                            <div className="flex items-center gap-1">Nº <SortIcon field="numero" /></div>
                          </TableHead>
                          <TableHead className="cursor-pointer" onClick={() => toggleSort('segurado')}>
                            <div className="flex items-center gap-1">Segurado <SortIcon field="segurado" /></div>
                          </TableHead>
                          <TableHead className="text-center">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${activeStage === 'origem' ? 'bg-primary/20 text-primary ring-1 ring-primary/40' : 'bg-primary/10 text-primary'}`}>Origem</span>
                          </TableHead>
                          <TableHead className="text-center w-[20px]" />
                          <TableHead className="text-center">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${activeStage === 'negociador' ? 'bg-brand-orange/20 text-brand-orange ring-1 ring-brand-orange/40' : 'bg-brand-orange/10 text-brand-orange'}`}>Negociador</span>
                          </TableHead>
                          <TableHead className="text-center w-[20px]" />
                          <TableHead className="text-center">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${activeStage === 'cotador' ? 'bg-success/20 text-success ring-1 ring-success/40' : 'bg-success/10 text-success'}`}>Cotador</span>
                          </TableHead>
                          <TableHead className="text-center w-[20px]" />
                          <TableHead className="text-center cursor-pointer" onClick={() => toggleSort('status')}>
                            <div className="flex items-center justify-center gap-1">Status <SortIcon field="status" /></div>
                          </TableHead>
                          <TableHead className="text-right cursor-pointer" onClick={() => toggleSort('premio')}>
                            <div className="flex items-center justify-end gap-1">Prêmio <SortIcon field="premio" /></div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {flowData.map((row) =>
                          <TableRow key={row.id} className="hover:bg-muted/30 h-8">
                            <TableCell className="text-[10px] text-muted-foreground font-mono py-1">{row.numero}</TableCell>
                            <TableCell className="font-medium text-xs max-w-[160px] truncate py-1">{row.segurado}</TableCell>
                            <TableCell className={`text-center text-xs font-medium text-primary py-1 ${roleColumnStyle('origem')}`}>{row.origem}</TableCell>
                            <TableCell className="text-center py-1"><ArrowRight className="h-3 w-3 text-muted-foreground/40 mx-auto" /></TableCell>
                            <TableCell className={`text-center text-xs font-medium text-brand-orange py-1 ${roleColumnStyle('negociador')}`}>{row.negociador}</TableCell>
                            <TableCell className="text-center py-1"><ArrowRight className="h-3 w-3 text-muted-foreground/40 mx-auto" /></TableCell>
                            <TableCell className={`text-center text-xs font-medium text-success py-1 ${roleColumnStyle('cotador')}`}>{row.cotador}</TableCell>
                            <TableCell className="text-center py-1"><ArrowRight className="h-3 w-3 text-muted-foreground/40 mx-auto" /></TableCell>
                            <TableCell className="text-center py-1">{statusBadge(row.status)}</TableCell>
                            <TableCell className="text-right text-xs font-semibold py-1">{formatCurrency(row.premio)}</TableCell>
                          </TableRow>
                        )}
                        {flowData.length === 0 &&
                          <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">Nenhum dado disponível.</TableCell></TableRow>
                        }
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Mini Fechamento Gerencial */}
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-warning" />
                    Fechamento Gerencial — {ROLE_LABELS[activeStage]?.replace('Produtor ', '')}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><FileText className="h-3 w-3" />Pipeline</p>
                      <p className="text-xl font-bold text-primary">{kpis.total}</p>
                      <p className="text-xs text-muted-foreground mt-1">Em cotação: <span className="font-semibold text-primary">{kpis.emCotacao}</span></p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-success/10 to-success/5 rounded-lg border border-success/20">
                      <p className="text-xs text-muted-foreground mb-1">Resultados</p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-success" /><span className="text-lg font-bold text-success">{kpis.fechados}</span></div>
                        <div className="flex items-center gap-1"><XCircle className="h-3.5 w-3.5 text-destructive" /><span className="text-lg font-bold text-destructive">{kpis.declinados}</span></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Conversão: <span className="font-semibold text-success">{kpis.taxaConversao.toFixed(1)}%</span></p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-brand-orange/10 to-brand-orange/5 rounded-lg border border-brand-orange/20">
                      <p className="text-xs text-muted-foreground mb-1">Financeiro</p>
                      <p className="text-lg font-bold text-success">{formatCurrency(kpis.premioFechado)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Ticket: <span className="font-semibold text-foreground">{formatCurrency(kpis.ticketMedio)}</span></p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-destructive/10 to-destructive/5 rounded-lg border border-destructive/20">
                      <p className="text-xs text-muted-foreground mb-1">Eficiência</p>
                      <p className="text-lg font-bold text-foreground">{kpis.tempoMedio.toFixed(0)} <span className="text-xs font-normal">dias</span></p>
                      {bottlenecks.length > 0 &&
                        <div className="flex items-center gap-1 mt-1"><AlertTriangle className="h-3 w-3 text-warning" /><span className="text-[10px] text-warning">{bottlenecks.length} alerta(s)</span></div>
                      }
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ─── Tab: Seguradora ─── */}
              <TabsContent value="seguradora" className="space-y-4">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <div className="rounded-lg border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-2.5">
                    <p className="text-[10px] text-muted-foreground">Seguradoras Ativas</p>
                    <p className="text-xl font-bold text-primary">{seguradoraAnalysis.length}</p>
                  </div>
                  <div className="rounded-lg border border-success/20 bg-gradient-to-br from-success/10 to-success/5 p-2.5">
                    <p className="text-[10px] text-muted-foreground">Prêmio Fechado Total</p>
                    <p className="text-base font-bold text-success">{formatCurrency(seguradoraAnalysis.reduce((s, x) => s + x.premio, 0))}</p>
                  </div>
                  <div className="rounded-lg border border-brand-orange/20 bg-gradient-to-br from-brand-orange/10 to-brand-orange/5 p-2.5">
                    <p className="text-[10px] text-muted-foreground">Melhor Conversão</p>
                    {(() => {
                      const best = seguradoraAnalysis.filter(s => s.total >= 3).sort((a, b) => (b.fechados / b.total) - (a.fechados / a.total))[0];
                      return best ? (
                        <>
                          <p className="text-xs font-bold text-foreground truncate">{best.nome}</p>
                          <p className="text-[10px] text-success font-semibold">{(best.fechados / best.total * 100).toFixed(1)}%</p>
                        </>
                      ) : <p className="text-xs text-muted-foreground">—</p>;
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.15fr_0.95fr]">
                  <Card>
                    <CardContent className="p-3">
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        Volume por Seguradora
                      </h4>
                      <ResponsiveContainer width="100%" height={segChartHeight}>
                        <BarChart data={seguradoraAnalysis} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                          <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis dataKey="nome" type="category" width={88} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar dataKey="emCotacao" stackId="a" fill="hsl(var(--primary))" name="Em Cotação" />
                          <Bar dataKey="fechados" stackId="a" fill="hsl(var(--success))" name="Fechados" />
                          <Bar dataKey="declinados" stackId="a" fill="hsl(var(--destructive))" name="Declinados" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <Building2 className="h-4 w-4 text-primary" />
                        Detalhamento
                      </h4>
                      <div className="max-h-[420px] overflow-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b text-xs text-muted-foreground">
                              <th className="sticky top-0 bg-card text-left px-2 py-1.5 font-medium">Seguradora</th>
                              <th className="sticky top-0 bg-card text-center px-2 py-1.5 font-medium">Total</th>
                              <th className="sticky top-0 bg-card text-center px-2 py-1.5 font-medium text-success">Fech.</th>
                              <th className="sticky top-0 bg-card text-center px-2 py-1.5 font-medium text-destructive">Decl.</th>
                              <th className="sticky top-0 bg-card text-center px-2 py-1.5 font-medium">Conv.</th>
                              <th className="sticky top-0 bg-card text-right px-2 py-1.5 font-medium">Prêmio</th>
                            </tr>
                          </thead>
                          <tbody>
                            {seguradoraAnalysis.map((s) => {
                               const conv = s.oportunidades > 0 ? (s.fechados / s.oportunidades * 100) : 0;
                              return (
                                <tr key={s.nome} className="border-b border-border/50 hover:bg-muted/30">
                                  <td className="px-2 py-1.5 font-medium">{s.nome}</td>
                                  <td className="px-2 py-1.5 text-center font-semibold">{s.total}</td>
                                  <td className="px-2 py-1.5 text-center font-semibold text-success">{s.fechados}</td>
                                  <td className="px-2 py-1.5 text-center font-semibold text-destructive">{s.declinados}</td>
                                  <td className="px-2 py-1.5 text-center">
                                    <Badge className={`text-[10px] ${conv >= 40 ? 'bg-success/15 text-success border-success/30' : conv >= 20 ? 'bg-warning/15 text-warning border-warning/30' : 'bg-destructive/15 text-destructive border-destructive/30'}`}>
                                      {conv.toFixed(1)}%
                                    </Badge>
                                  </td>
                                  <td className="px-2 py-1.5 text-right font-semibold text-success">{formatCurrency(s.premio)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* ─── Tab: Ramo ─── */}
              <TabsContent value="ramo" className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                    <p className="text-[10px] text-muted-foreground">Ramos Ativos</p>
                    <p className="text-2xl font-bold text-primary">{ramoAnalysis.length}</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-gradient-to-br from-success/10 to-success/5 border-success/20">
                    <p className="text-[10px] text-muted-foreground">Prêmio Fechado Total</p>
                    <p className="text-lg font-bold text-success">{formatCurrency(ramoAnalysis.reduce((s, x) => s + x.premio, 0))}</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-gradient-to-br from-brand-orange/10 to-brand-orange/5 border-brand-orange/20">
                    <p className="text-[10px] text-muted-foreground">Maior Volume</p>
                    {ramoAnalysis[0] ? (
                      <>
                        <p className="text-sm font-bold text-foreground truncate">{ramoAnalysis[0].nome}</p>
                        <p className="text-[10px] text-primary font-semibold">{ramoAnalysis[0].total} cotações</p>
                      </>
                    ) : <p className="text-xs text-muted-foreground">—</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        Volume por Ramo
                      </h4>
                      <ResponsiveContainer width="100%" height={ramoChartHeight}>
                        <BarChart data={ramoAnalysis} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                          <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis dataKey="nome" type="category" width={120} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar dataKey="emCotacao" stackId="a" fill="hsl(var(--primary))" name="Em Cotação" />
                           <Bar dataKey="fechados" stackId="a" fill="hsl(var(--success))" name="Fechados" />
                           <Bar dataKey="declinados" stackId="a" fill="hsl(var(--destructive))" name="Declinados" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary" />
                        Detalhamento
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-xs text-muted-foreground">
                              <th className="text-left py-2 px-2 font-medium">Ramo</th>
                              <th className="text-center py-2 px-2 font-medium">Total</th>
                              <th className="text-center py-2 px-2 font-medium text-success">Fech.</th>
                              <th className="text-center py-2 px-2 font-medium text-destructive">Decl.</th>
                              <th className="text-center py-2 px-2 font-medium">Conv.</th>
                              <th className="text-right py-2 px-2 font-medium">Prêmio</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ramoAnalysis.map((r) => {
                               const conv = r.oportunidades > 0 ? (r.fechados / r.oportunidades * 100) : 0;
                              return (
                                <tr key={r.nome} className="border-b border-border/50 hover:bg-muted/30">
                                  <td className="py-2 px-2 font-medium text-xs">{r.nome}</td>
                                  <td className="py-2 px-2 text-center font-semibold">{r.total}</td>
                                  <td className="py-2 px-2 text-center font-semibold text-success">{r.fechados}</td>
                                  <td className="py-2 px-2 text-center font-semibold text-destructive">{r.declinados}</td>
                                  <td className="py-2 px-2 text-center">
                                    <Badge className={`text-[10px] ${conv >= 40 ? 'bg-success/15 text-success border-success/30' : conv >= 20 ? 'bg-warning/15 text-warning border-warning/30' : 'bg-destructive/15 text-destructive border-destructive/30'}`}>
                                      {conv.toFixed(1)}%
                                    </Badge>
                                  </td>
                                  <td className="py-2 px-2 text-right text-xs font-semibold text-success">{formatCurrency(r.premio)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* ─── Tab: Evolução ─── */}
              <TabsContent value="evolucao" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Volume Mensal
                      </h4>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={timeEvolution} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                          <XAxis dataKey="mes" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Total" />
                          <Bar dataKey="fechados" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Fechados" />
                          <Bar dataKey="declinados" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Declinados" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-success" />
                        Conversão e Prêmio
                      </h4>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={timeEvolution} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                          <XAxis dataKey="mes" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} unit="%" />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                           <Line yAxisId="left" type="monotone" dataKey="premioFechado" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} name="Prêmio Fechado" />
                          <Line yAxisId="right" type="monotone" dataKey="conversao" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Conversão %" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Resumo Mensal
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-xs text-muted-foreground">
                            <th className="text-left py-2 px-2 font-medium">Mês</th>
                            <th className="text-center py-2 px-2 font-medium">Total</th>
                            <th className="text-center py-2 px-2 font-medium text-success">Fechados</th>
                            <th className="text-center py-2 px-2 font-medium text-destructive">Declinados</th>
                            <th className="text-center py-2 px-2 font-medium">Conversão</th>
                            <th className="text-right py-2 px-2 font-medium">Prêmio Total</th>
                            <th className="text-right py-2 px-2 font-medium">Prêmio Fechado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {timeEvolution.map((m) => (
                            <tr key={m.mes} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="py-2 px-2 font-medium text-xs">{m.mes}</td>
                              <td className="py-2 px-2 text-center font-semibold">{m.total}</td>
                              <td className="py-2 px-2 text-center font-semibold text-success">{m.fechados}</td>
                              <td className="py-2 px-2 text-center font-semibold text-destructive">{m.declinados}</td>
                              <td className="py-2 px-2 text-center">
                                <Badge className={`text-[10px] ${m.conversao >= 40 ? 'bg-success/15 text-success border-success/30' : m.conversao >= 20 ? 'bg-warning/15 text-warning border-warning/30' : 'bg-destructive/15 text-destructive border-destructive/30'}`}>
                                  {m.conversao.toFixed(1)}%
                                </Badge>
                              </td>
                              <td className="py-2 px-2 text-right text-xs font-semibold">{formatCurrency(m.premio)}</td>
                              <td className="py-2 px-2 text-right text-xs font-semibold text-success">{formatCurrency(m.premioFechado)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
