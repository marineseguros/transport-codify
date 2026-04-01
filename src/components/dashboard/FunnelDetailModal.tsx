import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Layers, ArrowRight, CheckCircle2, XCircle, Clock, ExternalLink, Building2
} from 'lucide-react';
import { type Cotacao } from '@/hooks/useSupabaseData';
import { useMemo, useState, useEffect } from 'react';
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

const ROLE_FILTER_LABELS: Record<string, string> = {
  origem: 'Origem',
  negociador: 'Negociador',
  cotador: 'Cotador'
};

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const CLOSED_STATUSES = ['Negócio fechado', 'Fechamento congênere'];

const getDistinctQuoteKey = (cotacao: Cotacao) => `${cotacao.cpf_cnpj}_${getRamoGroup(cotacao.ramo)}`;

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

export function FunnelDetailModal({ open, onOpenChange, cotacoes, allCotacoes, dashboardFilters, initialStage, totalDistinct, dashboardCounts }: FunnelDetailModalProps) {
  const [activeStage, setActiveStage] = useState(initialStage);
  const [selectedFlow, setSelectedFlow] = useState<{ origem: string; negociador: string; cotador: string } | null>(null);
  const [roleHighlight, setRoleHighlight] = useState<string | null>(null);
  const [selectedProducer, setSelectedProducer] = useState<string>('');

  useEffect(() => {
    if (open) {
      setActiveStage(initialStage);
      setRoleHighlight(null);
      setSelectedProducer('');
    }
  }, [initialStage, open]);

  // Reset producer filter when stage changes
  useEffect(() => {
    setSelectedProducer('');
  }, [activeStage]);

  const roleKey = ROLE_KEY_MAP[activeStage as keyof typeof ROLE_KEY_MAP] || 'produtor_origem';

  const resultPeriod = useMemo(() => getDateRangeFromFilter(dashboardFilters), [dashboardFilters]);

  const stageCotacoes = useMemo(() => {
    const dashboardScoped = allCotacoes.filter((c) => matchesDashboardNonDateFilters(c, dashboardFilters));

    return dashboardScoped.filter((c) => {
      if (!c[roleKey]?.nome) return false;
      if (c.status === 'Em cotação') return true;
      if (c.status === 'Declinado') return isWithinPeriod(c.data_cotacao, resultPeriod.start, resultPeriod.end);
      if (CLOSED_STATUSES.includes(c.status)) return isWithinPeriod(c.data_fechamento, resultPeriod.start, resultPeriod.end);
      return false;
    });
  }, [allCotacoes, dashboardFilters, roleKey, resultPeriod]);

  // Flow data with consolidation
  const flowData = useMemo(() => {
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
        : c.id;

      const existing = consolidationMap.get(consolidationKey);
      if (existing) {
        existing.ids.push(c.id);
        existing.numeros.push(c.numero_cotacao);
        existing.premio += c.valor_premio || 0;
        existing.statuses.push(c.status);
        if (!existing.statusList.includes(c.status)) existing.statusList.push(c.status);
        existing.cotacoes.push(c);
      } else {
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

    const rows = Array.from(consolidationMap.values()).map((group) => {
      let dias = group.dias;
      if (group.cotacoes.length > 1) {
        const starts = group.cotacoes.map(c => new Date(c.data_cotacao).getTime());
        const ends = group.cotacoes.map(c => c.data_fechamento ? new Date(c.data_fechamento).getTime() : Date.now());
        dias = Math.floor((Math.max(...ends) - Math.min(...starts)) / (1000 * 60 * 60 * 24));
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

    return rows;
  }, [stageCotacoes]);

  // Grouped by flow — with optional role filter
  const flowGroups = useMemo(() => {
    const groups: { key: string; origem: string; negociador: string; cotador: string; count: number; segurados: string[]; premio: number }[] = [];
    flowData.forEach((row) => {
      const key = `${row.origem}→${row.negociador}→${row.cotador}`;
      const existing = groups.find(a => a.key === key);
      if (existing) {
        existing.count += 1;
        if (!existing.segurados.includes(row.segurado)) existing.segurados.push(row.segurado);
        existing.premio += row.premio;
      } else {
        groups.push({ key, origem: row.origem, negociador: row.negociador, cotador: row.cotador, count: 1, segurados: [row.segurado], premio: row.premio });
      }
    });
    return groups.sort((a, b) => b.count - a.count);
  }, [flowData]);

  // Unique producers for the active stage role
  const producerOptions = useMemo(() => {
    const roleField = activeStage as 'origem' | 'negociador' | 'cotador';
    const names = new Set<string>();
    flowGroups.forEach(g => names.add(g[roleField]));
    return Array.from(names).filter(n => n !== '—').sort((a, b) => a.localeCompare(b));
  }, [flowGroups, activeStage]);

  // Filter by selected producer for the active role
  const filteredFlowGroups = useMemo(() => {
    if (!selectedProducer) return flowGroups;
    const roleField = activeStage as 'origem' | 'negociador' | 'cotador';
    return flowGroups.filter(g => g[roleField] === selectedProducer);
  }, [flowGroups, selectedProducer, activeStage]);

  const maxCount = filteredFlowGroups[0]?.count || 1;
  const totalRegistros = flowData.length;

  const statusBadge = (status: string) => {
    if (status === 'Negócio fechado' || status === 'Fechamento congênere')
      return <Badge className="bg-success/15 text-success border-success/30 text-[10px] gap-1"><CheckCircle2 className="h-3 w-3" />{status === 'Negócio fechado' ? 'Fechado' : 'Congênere'}</Badge>;
    if (status === 'Declinado')
      return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] gap-1"><XCircle className="h-3 w-3" />Declinado</Badge>;
    return <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] gap-1"><Clock className="h-3 w-3" />{status}</Badge>;
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden p-0 flex flex-col">
        {/* Header */}
        <div className="border-b border-border/60 bg-gradient-to-b from-muted/20 to-transparent px-5 pt-4 pb-3">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className={`h-3 w-3 rounded-full ${ROLE_DOT_CLASSES[activeStage] || ROLE_DOT_CLASSES.origem}`} />
              {ROLE_LABELS[activeStage] || 'Produtor Origem'}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[activeStage]}</p>
          </DialogHeader>

          {/* Stage pills + Producer filter inline */}
          <div className="mt-2 flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/25 p-0.5 w-fit">
              {Object.entries(ROLE_LABELS).map(([key, label]) =>
                <button
                  key={key}
                  onClick={() => setActiveStage(key)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${activeStage === key
                    ? ROLE_BUTTON_CLASSES[key]
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                >
                  {label.replace('Produtor ', '')}
                </button>
              )}
            </div>

            <select
              value={selectedProducer}
              onChange={(e) => setSelectedProducer(e.target.value)}
              className="h-7 rounded-md border border-border/60 bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 min-w-[180px]"
            >
              <option value="">Todos os produtores</option>
              {producerOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content — Only Composição por Produtor */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex items-start justify-center">
          <Card className="border-primary/20 w-full max-w-3xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Composição por Produtor
                  <span className="text-[11px] text-muted-foreground font-normal ml-1">Origem → Negociador → Cotador</span>
                </h4>
                <span className="text-[11px] text-muted-foreground font-normal">{filteredFlowGroups.length} fluxos · {totalRegistros} registros</span>
              </div>

              {/* Role filter chips */}
              <div className="flex items-center gap-1.5 mb-4">
                <span className="text-[10px] text-muted-foreground mr-1">Destacar:</span>
                {(['origem', 'negociador', 'cotador'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => setRoleHighlight(prev => prev === role ? null : role)}
                    className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all border ${
                      roleHighlight === role
                        ? ROLE_BUTTON_CLASSES[role]
                        : 'border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    {ROLE_FILTER_LABELS[role]}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
                {filteredFlowGroups.map((group) => (
                  <button
                    key={group.key}
                    onClick={() => setSelectedFlow({ origem: group.origem, negociador: group.negociador, cotador: group.cotador })}
                    className="flex items-center gap-3 w-full text-left cursor-pointer group hover:bg-primary/5 rounded-lg px-3 py-2 transition-colors border border-transparent hover:border-primary/20"
                  >
                    {/* Producer names with role highlight */}
                    <div className="flex items-center gap-1.5 shrink-0" style={{ minWidth: '280px' }}>
                      <span className={`text-xs whitespace-nowrap ${
                        roleHighlight === 'origem'
                          ? 'font-bold text-primary text-[13px]'
                          : roleHighlight ? 'font-normal text-muted-foreground' : 'font-semibold text-primary'
                      }`}>{group.origem}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                      <span className={`text-xs whitespace-nowrap ${
                        roleHighlight === 'negociador'
                          ? 'font-bold text-brand-orange text-[13px]'
                          : roleHighlight ? 'font-normal text-muted-foreground' : 'font-semibold text-brand-orange'
                      }`}>{group.negociador}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                      <span className={`text-xs whitespace-nowrap ${
                        roleHighlight === 'cotador'
                          ? 'font-bold text-success text-[13px]'
                          : roleHighlight ? 'font-normal text-muted-foreground' : 'font-semibold text-success'
                      }`}>{group.cotador}</span>
                    </div>

                    {/* Bar */}
                    <div className="flex-1 max-w-[220px] h-6 bg-muted/30 rounded-md overflow-hidden">
                      <div
                        className="h-full bg-primary/60 rounded-md flex items-center justify-center text-[10px] text-white font-bold transition-all group-hover:bg-primary/80"
                        style={{ width: `${(group.count / maxCount) * 100}%`, minWidth: '24px' }}
                      >{group.count}</div>
                    </div>

                    <span className="text-[11px] text-muted-foreground font-medium w-[90px] text-right shrink-0">{formatCurrency(group.premio)}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary shrink-0 transition-colors" />
                  </button>
                ))}
                {filteredFlowGroups.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Nenhum fluxo encontrado.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>

      {/* Sub-Modal: Flow Detail */}
      {selectedFlow && (
        <FlowDetailSubModal
          open={!!selectedFlow}
          onOpenChange={(o) => !o && setSelectedFlow(null)}
          flow={selectedFlow}
          flowRecords={flowData.filter(r => r.origem === selectedFlow.origem && r.negociador === selectedFlow.negociador && r.cotador === selectedFlow.cotador)}
          stageCotacoes={stageCotacoes}
          formatCurrency={formatCurrency}
          statusBadge={statusBadge}
        />
      )}
    </Dialog>
  );
}

/* ─── Flow Detail Sub-Modal ─── */
function FlowDetailSubModal({
  open, onOpenChange, flow, flowRecords, stageCotacoes, formatCurrency: fmtCurrency, statusBadge
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flow: { origem: string; negociador: string; cotador: string };
  flowRecords: any[];
  stageCotacoes: Cotacao[];
  formatCurrency: (v: number) => string;
  statusBadge: (status: string) => React.ReactNode;
}) {
  const flowCotacoes = useMemo(() => {
    return stageCotacoes.filter(c => {
      const o = c.produtor_origem?.nome || '—';
      const n = c.produtor_negociador?.nome || '—';
      const ct = c.produtor_cotador?.nome || '—';
      return o === flow.origem && n === flow.negociador && ct === flow.cotador;
    });
  }, [stageCotacoes, flow]);

  const totalPremio = flowCotacoes.reduce((s, c) => s + (c.valor_premio || 0), 0);

  const seguradoraData = useMemo(() => {
    const map = new Map<string, { nome: string; count: number; premio: number; segurados: Set<string> }>();
    flowCotacoes.forEach(c => {
      const nome = c.seguradora?.nome || 'Sem seguradora';
      const entry = map.get(nome) || { nome, count: 0, premio: 0, segurados: new Set<string>() };
      entry.count += 1;
      entry.premio += c.valor_premio || 0;
      entry.segurados.add(c.segurado);
      map.set(nome, entry);
    });
    return Array.from(map.values())
      .map(e => ({ ...e, segurados: Array.from(e.segurados).sort((a, b) => a.localeCompare(b)) }))
      .sort((a, b) => b.count - a.count);
  }, [flowCotacoes]);

  const ramoData = useMemo(() => {
    const map = new Map<string, { nome: string; count: number; premio: number; segurados: Set<string> }>();
    flowCotacoes.forEach(c => {
      const nome = c.ramo?.ramo_agrupado || c.ramo?.descricao || 'Sem ramo';
      const entry = map.get(nome) || { nome, count: 0, premio: 0, segurados: new Set<string>() };
      entry.count += 1;
      entry.premio += c.valor_premio || 0;
      entry.segurados.add(c.segurado);
      map.set(nome, entry);
    });
    return Array.from(map.values())
      .map(e => ({ ...e, segurados: Array.from(e.segurados).sort((a, b) => a.localeCompare(b)) }))
      .sort((a, b) => b.count - a.count);
  }, [flowCotacoes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden p-0 flex flex-col">
        <div className="border-b border-border/60 bg-gradient-to-b from-muted/20 to-transparent px-5 pt-4 pb-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Layers className="h-4 w-4 text-primary" />
              Detalhamento do Fluxo
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 flex items-center gap-2">
            <Badge className="bg-primary/15 text-primary border-primary/30 text-[11px]">{flow.origem}</Badge>
            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
            <Badge className="bg-brand-orange/15 text-brand-orange border-brand-orange/30 text-[11px]">{flow.negociador}</Badge>
            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
            <Badge className="bg-success/15 text-success border-success/30 text-[11px]">{flow.cotador}</Badge>
            <span className="ml-3 text-xs text-muted-foreground">{flowCotacoes.length} cotações · {fmtCurrency(totalPremio)}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <Tabs defaultValue="geral" className="mt-3">
            <TabsList className="h-8 w-full">
              <TabsTrigger value="geral" className="flex-1 text-[11px]">Geral</TabsTrigger>
              <TabsTrigger value="seguradoras" className="flex-1 text-[11px]">Seguradoras</TabsTrigger>
              <TabsTrigger value="ramo" className="flex-1 text-[11px]">Ramo</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="mt-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px] text-[10px]">Nº</TableHead>
                    <TableHead className="text-[10px]">Segurado</TableHead>
                    <TableHead className="text-center text-[10px]">Ramo</TableHead>
                    <TableHead className="text-center text-[10px]">Seguradora</TableHead>
                    <TableHead className="text-center text-[10px]">Status</TableHead>
                    <TableHead className="text-center text-[10px]">Dias</TableHead>
                    <TableHead className="text-right text-[10px]">Prêmio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flowCotacoes.map(c => {
                    const dias = Math.floor(((c.data_fechamento ? new Date(c.data_fechamento).getTime() : Date.now()) - new Date(c.data_cotacao).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <TableRow key={c.id} className="hover:bg-muted/30 h-8">
                        <TableCell className="text-[10px] text-muted-foreground font-mono py-1">{c.numero_cotacao}</TableCell>
                        <TableCell className="font-medium text-xs max-w-[180px] truncate py-1">{c.segurado}</TableCell>
                        <TableCell className="text-center text-[10px] text-muted-foreground py-1">{c.ramo?.ramo_agrupado || c.ramo?.descricao || '—'}</TableCell>
                        <TableCell className="text-center text-[10px] text-muted-foreground py-1">{c.seguradora?.nome || '—'}</TableCell>
                        <TableCell className="text-center py-1">{statusBadge(c.status)}</TableCell>
                        <TableCell className="text-center text-[10px] text-muted-foreground py-1">{dias}d</TableCell>
                        <TableCell className="text-right text-xs font-semibold py-1">{fmtCurrency(c.valor_premio || 0)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {flowCotacoes.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Nenhum registro.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="seguradoras" className="mt-3 space-y-3">
              {seguradoraData.map(seg => (
                <Card key={seg.nome}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-semibold flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                        {seg.nome}
                      </h5>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>{seg.count} cotações</span>
                        <span className="font-semibold text-success">{fmtCurrency(seg.premio)}</span>
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px] text-[10px]">Nº</TableHead>
                          <TableHead className="text-[10px]">Segurado</TableHead>
                          <TableHead className="text-center text-[10px]">Ramo</TableHead>
                          <TableHead className="text-center text-[10px]">Status</TableHead>
                          <TableHead className="text-right text-[10px]">Prêmio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {flowCotacoes.filter(c => (c.seguradora?.nome || 'Sem seguradora') === seg.nome).map(c => (
                          <TableRow key={c.id} className="hover:bg-muted/30 h-8">
                            <TableCell className="text-[10px] text-muted-foreground font-mono py-1">{c.numero_cotacao}</TableCell>
                            <TableCell className="font-medium text-xs max-w-[180px] truncate py-1">{c.segurado}</TableCell>
                            <TableCell className="text-center text-[10px] text-muted-foreground py-1">{c.ramo?.ramo_agrupado || c.ramo?.descricao || '—'}</TableCell>
                            <TableCell className="text-center py-1">{statusBadge(c.status)}</TableCell>
                            <TableCell className="text-right text-xs font-semibold py-1">{fmtCurrency(c.valor_premio || 0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
              {seguradoraData.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Nenhuma seguradora encontrada.</p>}
            </TabsContent>

            <TabsContent value="ramo" className="mt-3 space-y-3">
              {ramoData.map(ramo => (
                <Card key={ramo.nome}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-semibold flex items-center gap-2">
                        <Layers className="h-3.5 w-3.5 text-primary" />
                        {ramo.nome}
                      </h5>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>{ramo.count} cotações</span>
                        <span className="font-semibold text-success">{fmtCurrency(ramo.premio)}</span>
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px] text-[10px]">Nº</TableHead>
                          <TableHead className="text-[10px]">Segurado</TableHead>
                          <TableHead className="text-center text-[10px]">Seguradora</TableHead>
                          <TableHead className="text-center text-[10px]">Status</TableHead>
                          <TableHead className="text-right text-[10px]">Prêmio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {flowCotacoes.filter(c => (c.ramo?.ramo_agrupado || c.ramo?.descricao || 'Sem ramo') === ramo.nome).map(c => (
                          <TableRow key={c.id} className="hover:bg-muted/30 h-8">
                            <TableCell className="text-[10px] text-muted-foreground font-mono py-1">{c.numero_cotacao}</TableCell>
                            <TableCell className="font-medium text-xs max-w-[180px] truncate py-1">{c.segurado}</TableCell>
                            <TableCell className="text-center text-[10px] text-muted-foreground py-1">{c.seguradora?.nome || '—'}</TableCell>
                            <TableCell className="text-center py-1">{statusBadge(c.status)}</TableCell>
                            <TableCell className="text-right text-xs font-semibold py-1">{fmtCurrency(c.valor_premio || 0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
              {ramoData.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Nenhum ramo encontrado.</p>}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
