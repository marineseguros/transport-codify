import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp, DollarSign, Clock, BarChart3, AlertTriangle,
  Building2, Layers, Search, ArrowRight, CheckCircle2, XCircle, FileText, Zap,
  ArrowUpDown, ArrowUp, ArrowDown, PieChart
} from 'lucide-react';
import { type Cotacao } from '@/hooks/useSupabaseData';
import { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Legend, Cell, PieChart as RechartsPie, Pie } from 'recharts';

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
const ROLE_COLORS: Record<string, string> = {
  origem: 'hsl(210, 50%, 25%)',
  negociador: 'hsl(210, 55%, 45%)',
  cotador: 'hsl(200, 60%, 55%)'
};

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_COLORS = [
  'hsl(var(--primary))',
  'hsl(156, 62%, 52%)',
  'hsl(0, 84%, 60%)',
  'hsl(45, 93%, 47%)',
];

interface FunnelDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cotacoes: Cotacao[];
  initialStage: string;
}

type SortField = 'numero' | 'segurado' | 'origem' | 'negociador' | 'cotador' | 'status' | 'premio';
type SortDir = 'asc' | 'desc';

export function FunnelDetailModal({ open, onOpenChange, cotacoes, initialStage }: FunnelDetailModalProps) {
  const [activeStage, setActiveStage] = useState(initialStage);
  const [filterSeguradora, setFilterSeguradora] = useState('all');
  const [filterProdutor, setFilterProdutor] = useState('all');
  const [filterRamo, setFilterRamo] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('numero');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    if (open) {
      setActiveStage(initialStage);
      setFilterSeguradora('all');
      setFilterProdutor('all');
      setFilterRamo('all');
      setSearchTerm('');
      setSortField('numero');
      setSortDir('desc');
    }
  }, [initialStage, open]);

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

  const stageCotacoes = useMemo(() => {
    let filtered = cotacoes.filter((c) => !!c[roleKey]?.nome);
    if (filterSeguradora !== 'all') filtered = filtered.filter((c) => c.seguradora_id === filterSeguradora);
    if (filterProdutor !== 'all') filtered = filtered.filter((c) =>
      c.produtor_origem_id === filterProdutor || c.produtor_negociador_id === filterProdutor || c.produtor_cotador_id === filterProdutor
    );
    if (filterRamo !== 'all') filtered = filtered.filter((c) => c.ramo_id === filterRamo);
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      filtered = filtered.filter((c) => c.segurado.toLowerCase().includes(t) || c.cpf_cnpj.includes(t));
    }
    return filtered;
  }, [cotacoes, roleKey, filterSeguradora, filterProdutor, filterRamo, searchTerm]);

  // KPIs
  const kpis = useMemo(() => {
    const total = stageCotacoes.length;
    const premio = stageCotacoes.reduce((s, c) => s + (c.valor_premio || 0), 0);
    const ticketMedio = total > 0 ? premio / total : 0;
    const fechados = stageCotacoes.filter((c) => c.status === 'Negócio fechado' || c.status === 'Fechamento congênere').length;
    const declinados = stageCotacoes.filter((c) => c.status === 'Declinado').length;
    const emCotacao = stageCotacoes.filter((c) => c.status === 'Em cotação').length;
    const taxaConversao = total > 0 ? fechados / total * 100 : 0;
    const tempos: number[] = [];
    stageCotacoes.forEach((c) => {
      const start = new Date(c.data_cotacao).getTime();
      const end = c.data_fechamento ? new Date(c.data_fechamento).getTime() : Date.now();
      tempos.push((end - start) / (1000 * 60 * 60 * 24));
    });
    const tempoMedio = tempos.length > 0 ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0;
    const premioFechado = stageCotacoes.filter((c) => c.status === 'Negócio fechado' || c.status === 'Fechamento congênere').reduce((s, c) => s + (c.valor_premio || 0), 0);
    const premioEmAberto = stageCotacoes.filter((c) => c.status === 'Em cotação').reduce((s, c) => s + (c.valor_premio || 0), 0);
    return { total, premio, ticketMedio, taxaConversao, tempoMedio, fechados, declinados, emCotacao, premioFechado, premioEmAberto };
  }, [stageCotacoes]);

  // Flow data with sorting
  const flowData = useMemo(() => {
    const rows = stageCotacoes.map((c) => ({
      id: c.id,
      numero: c.numero_cotacao,
      segurado: c.segurado,
      origem: c.produtor_origem?.nome || '—',
      negociador: c.produtor_negociador?.nome || '—',
      cotador: c.produtor_cotador?.nome || '—',
      premio: c.valor_premio || 0,
      status: c.status,
    }));

    rows.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'premio') cmp = a.premio - b.premio;
      else cmp = (a[sortField] || '').localeCompare(b[sortField] || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return rows;
  }, [stageCotacoes, sortField, sortDir]);

  // Seguradora analysis - enhanced
  const seguradoraAnalysis = useMemo(() => {
    const map = new Map<string, { nome: string; total: number; fechados: number; declinados: number; emCotacao: number; premio: number; premioAberto: number }>();
    stageCotacoes.forEach((c) => {
      const nome = c.seguradora?.nome || 'Sem seguradora';
      const e = map.get(nome) || { nome, total: 0, fechados: 0, declinados: 0, emCotacao: 0, premio: 0, premioAberto: 0 };
      e.total++;
      if (c.status === 'Negócio fechado' || c.status === 'Fechamento congênere') { e.fechados++; e.premio += c.valor_premio || 0; }
      if (c.status === 'Declinado') e.declinados++;
      if (c.status === 'Em cotação') { e.emCotacao++; e.premioAberto += c.valor_premio || 0; }
      map.set(nome, e);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [stageCotacoes]);

  // Ramo analysis - enhanced
  const ramoAnalysis = useMemo(() => {
    const map = new Map<string, { nome: string; total: number; fechados: number; declinados: number; emCotacao: number; premio: number; premioAberto: number }>();
    stageCotacoes.forEach((c) => {
      const nome = c.ramo?.ramo_agrupado || c.ramo?.descricao || 'Sem ramo';
      const e = map.get(nome) || { nome, total: 0, fechados: 0, declinados: 0, emCotacao: 0, premio: 0, premioAberto: 0 };
      e.total++;
      if (c.status === 'Negócio fechado' || c.status === 'Fechamento congênere') { e.fechados++; e.premio += c.valor_premio || 0; }
      if (c.status === 'Declinado') e.declinados++;
      if (c.status === 'Em cotação') { e.emCotacao++; e.premioAberto += c.valor_premio || 0; }
      map.set(nome, e);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [stageCotacoes]);

  // Time evolution - enhanced
  const timeEvolution = useMemo(() => {
    const monthMap = new Map<string, { mes: string; total: number; fechados: number; declinados: number; premio: number; premioFechado: number }>();
    stageCotacoes.forEach((c) => {
      const d = new Date(c.data_cotacao);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      const e = monthMap.get(key) || { mes: label, total: 0, fechados: 0, declinados: 0, premio: 0, premioFechado: 0 };
      e.total++;
      e.premio += c.valor_premio || 0;
      if (c.status === 'Negócio fechado' || c.status === 'Fechamento congênere') { e.fechados++; e.premioFechado += c.valor_premio || 0; }
      if (c.status === 'Declinado') e.declinados++;
      monthMap.set(key, e);
    });
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({ ...v, conversao: v.total > 0 ? (v.fechados / v.total * 100) : 0 }));
  }, [stageCotacoes]);

  // Bottlenecks
  const bottlenecks = useMemo(() => {
    const issues: { type: 'warning' | 'critical'; message: string }[] = [];
    if (kpis.tempoMedio > 30) issues.push({ type: 'critical', message: `Tempo médio de ${kpis.tempoMedio.toFixed(0)} dias é elevado` });
    if (kpis.taxaConversao < 20 && kpis.total > 5) issues.push({ type: 'warning', message: `Taxa de conversão de ${kpis.taxaConversao.toFixed(1)}% abaixo do esperado` });
    return issues.slice(0, 4);
  }, [kpis]);

  // Status distribution for mini viz
  const statusDistribution = useMemo(() => {
    return [
      { name: 'Em cotação', value: kpis.emCotacao, color: 'hsl(var(--primary))' },
      { name: 'Fechados', value: kpis.fechados, color: 'hsl(156, 62%, 52%)' },
      { name: 'Declinados', value: kpis.declinados, color: 'hsl(0, 84%, 60%)' },
    ].filter(s => s.value > 0);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: ROLE_COLORS[activeStage] || ROLE_COLORS.origem }} />
            {ROLE_LABELS[activeStage] || 'Produtor Origem'}
            <Badge variant="secondary" className="text-xs">{kpis.total} cotações</Badge>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{ROLE_DESCRIPTIONS[activeStage]}</p>
        </DialogHeader>

        {/* Stage pills + Filters - all on same line */}
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(ROLE_LABELS).map(([key, label]) =>
            <button
              key={key}
              onClick={() => setActiveStage(key)}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all border ${activeStage === key
                ? 'text-white border-transparent shadow-sm'
                : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'}`}
              style={activeStage === key ? { backgroundColor: ROLE_COLORS[key] } : undefined}
            >
              {label.replace('Produtor ', '')}
            </button>
          )}
          <div className="h-5 w-px bg-border mx-1" />
          <div className="relative min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar segurado..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-8 pl-8 text-xs" />
          </div>
          <Select value={filterSeguradora} onValueChange={setFilterSeguradora}>
            <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Seguradora" /></SelectTrigger>
            <SelectContent>{[<SelectItem key="all" value="all">Todas seguradoras</SelectItem>, ...filterOptions.seguradoras.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)]}</SelectContent>
          </Select>
          <Select value={filterProdutor} onValueChange={setFilterProdutor}>
            <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Produtor" /></SelectTrigger>
            <SelectContent>{[<SelectItem key="all" value="all">Todos produtores</SelectItem>, ...filterOptions.produtores.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)]}</SelectContent>
          </Select>
          <Select value={filterRamo} onValueChange={setFilterRamo}>
            <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Ramo" /></SelectTrigger>
            <SelectContent>{[<SelectItem key="all" value="all">Todos ramos</SelectItem>, ...filterOptions.ramos.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)]}</SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-4 pr-2">
            <Tabs defaultValue="fluxo" className="space-y-3">
              <TabsList className="grid w-full grid-cols-4 h-9">
                <TabsTrigger value="fluxo" className="text-xs">Fluxo Comercial</TabsTrigger>
                <TabsTrigger value="seguradora" className="text-xs">Seguradora</TabsTrigger>
                <TabsTrigger value="ramo" className="text-xs">Ramo</TabsTrigger>
                <TabsTrigger value="evolucao" className="text-xs">Evolução</TabsTrigger>
              </TabsList>

              {/* ─── Tab: Fluxo Comercial ─── */}
              <TabsContent value="fluxo" className="space-y-4">
                {/* Quick visual summary */}
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-8 grid grid-cols-4 gap-2">
                    {[
                      { label: 'Em Cotação', value: kpis.emCotacao, premio: kpis.premioEmAberto, pct: kpis.total > 0 ? (kpis.emCotacao / kpis.total * 100) : 0, color: 'primary' },
                      { label: 'Fechados', value: kpis.fechados, premio: kpis.premioFechado, pct: kpis.total > 0 ? (kpis.fechados / kpis.total * 100) : 0, color: 'success' },
                      { label: 'Declinados', value: kpis.declinados, premio: 0, pct: kpis.total > 0 ? (kpis.declinados / kpis.total * 100) : 0, color: 'destructive' },
                      { label: 'Tempo Médio', value: null, premio: null, pct: null, color: 'muted-foreground' },
                    ].map((item) => (
                      <div key={item.label} className="p-3 rounded-lg border bg-muted/20">
                        {item.value !== null ? (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-muted-foreground font-medium">{item.label}</span>
                              <span className={`text-[10px] font-semibold text-${item.color}`}>{item.pct?.toFixed(1)}%</span>
                            </div>
                            <p className={`text-lg font-bold text-${item.color}`}>{item.value}</p>
                            {item.premio !== null && item.premio > 0 && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">{formatCurrency(item.premio)}</p>
                            )}
                            <Progress value={item.pct || 0} className="h-1 mt-1.5" />
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] text-muted-foreground font-medium">{item.label}</span>
                            <p className={`text-lg font-bold mt-1 ${kpis.tempoMedio > 30 ? 'text-destructive' : 'text-foreground'}`}>
                              {kpis.tempoMedio.toFixed(0)} <span className="text-xs font-normal">dias</span>
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Ticket: {formatCurrency(kpis.ticketMedio)}
                            </p>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="col-span-4 flex items-center justify-center">
                    {statusDistribution.length > 0 ? (
                      <div className="flex items-center gap-4">
                        <ResponsiveContainer width={100} height={100}>
                          <RechartsPie>
                            <Pie data={statusDistribution} dataKey="value" cx="50%" cy="50%" innerRadius={25} outerRadius={42} paddingAngle={3} strokeWidth={0}>
                              {statusDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                          </RechartsPie>
                        </ResponsiveContainer>
                        <div className="space-y-1.5">
                          {statusDistribution.map((s) => (
                            <div key={s.name} className="flex items-center gap-1.5">
                              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                              <span className="text-[10px] text-muted-foreground">{s.name}</span>
                              <span className="text-[10px] font-bold">{s.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Sem dados</p>
                    )}
                  </div>
                </div>

                {/* Table with sorting */}
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
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">Origem</span>
                          </TableHead>
                          <TableHead className="text-center w-[20px]" />
                          <TableHead className="text-center">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-orange/10 text-brand-orange font-semibold">Negociador</span>
                          </TableHead>
                          <TableHead className="text-center w-[20px]" />
                          <TableHead className="text-center">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success font-semibold">Cotador</span>
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
                          <TableRow key={row.id} className="hover:bg-muted/30">
                            <TableCell className="text-[10px] text-muted-foreground font-mono">{row.numero}</TableCell>
                            <TableCell className="font-medium text-xs max-w-[160px] truncate">{row.segurado}</TableCell>
                            <TableCell className="text-center text-xs font-medium text-primary">{row.origem}</TableCell>
                            <TableCell className="text-center"><ArrowRight className="h-3 w-3 text-muted-foreground/40 mx-auto" /></TableCell>
                            <TableCell className="text-center text-xs font-medium text-brand-orange">{row.negociador}</TableCell>
                            <TableCell className="text-center"><ArrowRight className="h-3 w-3 text-muted-foreground/40 mx-auto" /></TableCell>
                            <TableCell className="text-center text-xs font-medium text-success">{row.cotador}</TableCell>
                            <TableCell className="text-center"><ArrowRight className="h-3 w-3 text-muted-foreground/40 mx-auto" /></TableCell>
                            <TableCell className="text-center">{statusBadge(row.status)}</TableCell>
                            <TableCell className="text-right text-xs font-semibold">{formatCurrency(row.premio)}</TableCell>
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
                    <div className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-lg border border-amber-500/20">
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
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                    <p className="text-[10px] text-muted-foreground">Seguradoras Ativas</p>
                    <p className="text-2xl font-bold text-primary">{seguradoraAnalysis.length}</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-gradient-to-br from-success/10 to-success/5 border-success/20">
                    <p className="text-[10px] text-muted-foreground">Prêmio Fechado Total</p>
                    <p className="text-lg font-bold text-success">{formatCurrency(seguradoraAnalysis.reduce((s, x) => s + x.premio, 0))}</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
                    <p className="text-[10px] text-muted-foreground">Melhor Conversão</p>
                    {(() => {
                      const best = seguradoraAnalysis.filter(s => s.total >= 3).sort((a, b) => (b.fechados / b.total) - (a.fechados / a.total))[0];
                      return best ? (
                        <>
                          <p className="text-sm font-bold text-foreground truncate">{best.nome}</p>
                          <p className="text-[10px] text-success font-semibold">{(best.fechados / best.total * 100).toFixed(1)}%</p>
                        </>
                      ) : <p className="text-xs text-muted-foreground">—</p>;
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        Volume por Seguradora
                      </h4>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={seguradoraAnalysis.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                          <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis dataKey="nome" type="category" width={100} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar dataKey="emCotacao" stackId="a" fill="hsl(var(--primary))" name="Em Cotação" />
                          <Bar dataKey="fechados" stackId="a" fill="hsl(156, 62%, 52%)" name="Fechados" />
                          <Bar dataKey="declinados" stackId="a" fill="hsl(0, 84%, 60%)" name="Declinados" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        Detalhamento
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-xs text-muted-foreground">
                              <th className="text-left py-2 px-2 font-medium">Seguradora</th>
                              <th className="text-center py-2 px-2 font-medium">Total</th>
                              <th className="text-center py-2 px-2 font-medium text-success">Fech.</th>
                              <th className="text-center py-2 px-2 font-medium text-destructive">Decl.</th>
                              <th className="text-center py-2 px-2 font-medium">Conv.</th>
                              <th className="text-right py-2 px-2 font-medium">Prêmio</th>
                            </tr>
                          </thead>
                          <tbody>
                            {seguradoraAnalysis.map((s) => {
                              const conv = s.total > 0 ? (s.fechados / s.total * 100) : 0;
                              return (
                                <tr key={s.nome} className="border-b border-border/50 hover:bg-muted/30">
                                  <td className="py-2 px-2 font-medium text-xs">{s.nome}</td>
                                  <td className="py-2 px-2 text-center font-semibold">{s.total}</td>
                                  <td className="py-2 px-2 text-center font-semibold text-success">{s.fechados}</td>
                                  <td className="py-2 px-2 text-center font-semibold text-destructive">{s.declinados}</td>
                                  <td className="py-2 px-2 text-center">
                                    <Badge className={`text-[10px] ${conv >= 40 ? 'bg-success/15 text-success border-success/30' : conv >= 20 ? 'bg-warning/15 text-warning border-warning/30' : 'bg-destructive/15 text-destructive border-destructive/30'}`}>
                                      {conv.toFixed(1)}%
                                    </Badge>
                                  </td>
                                  <td className="py-2 px-2 text-right text-xs font-semibold text-success">{formatCurrency(s.premio)}</td>
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
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                    <p className="text-[10px] text-muted-foreground">Ramos Ativos</p>
                    <p className="text-2xl font-bold text-primary">{ramoAnalysis.length}</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-gradient-to-br from-success/10 to-success/5 border-success/20">
                    <p className="text-[10px] text-muted-foreground">Prêmio Fechado Total</p>
                    <p className="text-lg font-bold text-success">{formatCurrency(ramoAnalysis.reduce((s, x) => s + x.premio, 0))}</p>
                  </div>
                  <div className="p-3 rounded-lg border bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
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
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={ramoAnalysis.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                          <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis dataKey="nome" type="category" width={120} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar dataKey="emCotacao" stackId="a" fill="hsl(var(--primary))" name="Em Cotação" />
                          <Bar dataKey="fechados" stackId="a" fill="hsl(156, 62%, 52%)" name="Fechados" />
                          <Bar dataKey="declinados" stackId="a" fill="hsl(0, 84%, 60%)" name="Declinados" radius={[0, 4, 4, 0]} />
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
                              const conv = r.total > 0 ? (r.fechados / r.total * 100) : 0;
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
                          <Bar dataKey="fechados" fill="hsl(156, 62%, 52%)" radius={[4, 4, 0, 0]} name="Fechados" />
                          <Bar dataKey="declinados" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} name="Declinados" />
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
                          <Line yAxisId="left" type="monotone" dataKey="premioFechado" stroke="hsl(156, 62%, 52%)" strokeWidth={2} dot={{ r: 3 }} name="Prêmio Fechado" />
                          <Line yAxisId="right" type="monotone" dataKey="conversao" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Conversão %" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Monthly table */}
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
