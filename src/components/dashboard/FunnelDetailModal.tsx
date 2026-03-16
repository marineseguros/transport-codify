import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Filter, Users, TrendingUp, DollarSign, Clock, BarChart3, AlertTriangle, Building2, Layers, Search } from 'lucide-react';
import { type Cotacao } from '@/hooks/useSupabaseData';
import { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LineChart, Line, Legend } from 'recharts';

// ─── Stage configuration ───
const STAGE_CONFIG: Record<string, { label: string; description: string; color: string; filterFn: (c: Cotacao) => boolean }> = {
  origem: {
    label: 'Produtor Origem',
    description: 'Responsável pela captação comercial',
    color: 'hsl(var(--primary))',
    filterFn: (c) => !!c.produtor_origem?.nome,
  },
  cotador: {
    label: 'Produtor Cotador',
    description: 'Responsável operacional pela cotação',
    color: 'hsl(210, 55%, 50%)',
    filterFn: (c) => !!c.produtor_cotador?.nome,
  },
  negociador: {
    label: 'Produtor Negociador',
    description: 'Responsável pela negociação com o cliente',
    color: 'hsl(200, 60%, 55%)',
    filterFn: (c) => !!c.produtor_negociador?.nome,
  },
  fechado: {
    label: 'Fechados',
    description: 'Negócios efetivados',
    color: 'hsl(156, 72%, 40%)',
    filterFn: (c) => c.status === 'Negócio fechado' || c.status === 'Fechamento congênere',
  },
  declinado: {
    label: 'Declinados',
    description: 'Cotações recusadas ou perdidas',
    color: 'hsl(0, 84%, 55%)',
    filterFn: (c) => c.status === 'Declinado',
  },
};

const getProducerName = (c: Cotacao, stageKey: string): string => {
  if (stageKey === 'origem') return c.produtor_origem?.nome || '—';
  if (stageKey === 'cotador') return c.produtor_cotador?.nome || '—';
  if (stageKey === 'negociador') return c.produtor_negociador?.nome || '—';
  if (stageKey === 'fechado') return c.produtor_origem?.nome || c.produtor_negociador?.nome || '—';
  return c.produtor_origem?.nome || '—';
};

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ─── Main Component ───
interface FunnelDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cotacoes: Cotacao[];
  initialStage: string;
}

export function FunnelDetailModal({ open, onOpenChange, cotacoes, initialStage }: FunnelDetailModalProps) {
  const [activeStage, setActiveStage] = useState(initialStage);
  const [filterSeguradora, setFilterSeguradora] = useState('all');
  const [filterProdutor, setFilterProdutor] = useState('all');
  const [filterRamo, setFilterRamo] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Reset stage when modal opens with new stage
  useMemo(() => { if (open) setActiveStage(initialStage); }, [initialStage, open]);

  const config = STAGE_CONFIG[activeStage] || STAGE_CONFIG.origem;

  // Available filter options
  const filterOptions = useMemo(() => {
    const seguradoras = new Map<string, string>();
    const produtores = new Map<string, string>();
    const ramos = new Map<string, string>();
    cotacoes.forEach((c) => {
      if (c.seguradora?.nome) seguradoras.set(c.seguradora_id!, c.seguradora.nome);
      if (c.produtor_origem?.nome) produtores.set(c.produtor_origem_id!, c.produtor_origem.nome);
      if (c.produtor_negociador?.nome) produtores.set(c.produtor_negociador_id!, c.produtor_negociador.nome);
      if (c.produtor_cotador?.nome) produtores.set(c.produtor_cotador_id!, c.produtor_cotador.nome);
      if (c.ramo?.descricao) ramos.set(c.ramo_id!, c.ramo.ramo_agrupado || c.ramo.descricao);
    });
    return {
      seguradoras: Array.from(seguradoras, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome)),
      produtores: Array.from(produtores, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome)),
      ramos: Array.from(ramos, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome)),
    };
  }, [cotacoes]);

  // Filtered cotacoes for active stage
  const stageCotacoes = useMemo(() => {
    let filtered = cotacoes.filter(config.filterFn);
    if (filterSeguradora !== 'all') filtered = filtered.filter(c => c.seguradora_id === filterSeguradora);
    if (filterProdutor !== 'all') filtered = filtered.filter(c =>
      c.produtor_origem_id === filterProdutor || c.produtor_negociador_id === filterProdutor || c.produtor_cotador_id === filterProdutor
    );
    if (filterRamo !== 'all') filtered = filtered.filter(c => c.ramo_id === filterRamo);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => c.segurado.toLowerCase().includes(term) || c.cpf_cnpj.includes(term));
    }
    return filtered;
  }, [cotacoes, config, filterSeguradora, filterProdutor, filterRamo, searchTerm]);

  // ─── KPIs ───
  const kpis = useMemo(() => {
    const total = stageCotacoes.length;
    const premio = stageCotacoes.reduce((s, c) => s + (c.valor_premio || 0), 0);
    const ticketMedio = total > 0 ? premio / total : 0;
    const fechados = stageCotacoes.filter(c => c.status === 'Negócio fechado' || c.status === 'Fechamento congênere').length;
    const taxaConversao = total > 0 ? (fechados / total) * 100 : 0;

    // Tempo médio no estágio (dias entre data_cotacao e data_fechamento ou now)
    let tempoMedio = 0;
    const tempos: number[] = [];
    stageCotacoes.forEach(c => {
      const start = new Date(c.data_cotacao).getTime();
      const end = c.data_fechamento ? new Date(c.data_fechamento).getTime() : Date.now();
      tempos.push((end - start) / (1000 * 60 * 60 * 24));
    });
    if (tempos.length > 0) tempoMedio = tempos.reduce((a, b) => a + b, 0) / tempos.length;

    return { total, premio, ticketMedio, taxaConversao, tempoMedio, fechados };
  }, [stageCotacoes]);

  // ─── Ranking de Responsáveis ───
  const ranking = useMemo(() => {
    const map = new Map<string, { nome: string; total: number; fechados: number; premio: number }>();
    stageCotacoes.forEach(c => {
      const nome = getProducerName(c, activeStage);
      if (nome === '—') return;
      const entry = map.get(nome) || { nome, total: 0, fechados: 0, premio: 0 };
      entry.total++;
      if (c.status === 'Negócio fechado' || c.status === 'Fechamento congênere') {
        entry.fechados++;
        entry.premio += c.valor_premio || 0;
      }
      map.set(nome, entry);
    });
    return Array.from(map.values())
      .map(r => ({ ...r, conversao: r.total > 0 ? (r.fechados / r.total) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [stageCotacoes, activeStage]);

  // ─── Análise por Seguradora ───
  const seguradoraAnalysis = useMemo(() => {
    const map = new Map<string, { nome: string; total: number; fechados: number; premio: number }>();
    stageCotacoes.forEach(c => {
      const nome = c.seguradora?.nome || 'Sem seguradora';
      const entry = map.get(nome) || { nome, total: 0, fechados: 0, premio: 0 };
      entry.total++;
      if (c.status === 'Negócio fechado' || c.status === 'Fechamento congênere') {
        entry.fechados++;
        entry.premio += c.valor_premio || 0;
      }
      map.set(nome, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [stageCotacoes]);

  // ─── Análise por Ramo ───
  const ramoAnalysis = useMemo(() => {
    const map = new Map<string, { nome: string; total: number; fechados: number; premio: number }>();
    stageCotacoes.forEach(c => {
      const nome = c.ramo?.ramo_agrupado || c.ramo?.descricao || 'Sem ramo';
      const entry = map.get(nome) || { nome, total: 0, fechados: 0, premio: 0 };
      entry.total++;
      if (c.status === 'Negócio fechado' || c.status === 'Fechamento congênere') {
        entry.fechados++;
        entry.premio += c.valor_premio || 0;
      }
      map.set(nome, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [stageCotacoes]);

  // ─── Evolução no Tempo ───
  const timeEvolution = useMemo(() => {
    const monthMap = new Map<string, { mes: string; total: number; fechados: number; premio: number }>();
    stageCotacoes.forEach(c => {
      const d = new Date(c.data_cotacao);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      const entry = monthMap.get(key) || { mes: label, total: 0, fechados: 0, premio: 0 };
      entry.total++;
      if (c.status === 'Negócio fechado' || c.status === 'Fechamento congênere') {
        entry.fechados++;
        entry.premio += c.valor_premio || 0;
      }
      monthMap.set(key, entry);
    });
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [stageCotacoes]);

  // ─── Gargalos ───
  const bottlenecks = useMemo(() => {
    const issues: { type: 'warning' | 'critical'; message: string }[] = [];
    if (kpis.tempoMedio > 30) issues.push({ type: 'critical', message: `Tempo médio de ${kpis.tempoMedio.toFixed(0)} dias é elevado` });
    if (kpis.taxaConversao < 20 && kpis.total > 5) issues.push({ type: 'warning', message: `Taxa de conversão de ${kpis.taxaConversao.toFixed(1)}% está abaixo do esperado` });
    
    // Produtores com muitas cotações e baixa conversão
    ranking.filter(r => r.total >= 5 && r.conversao < 15).forEach(r => {
      issues.push({ type: 'warning', message: `${r.nome}: ${r.total} oportunidades, apenas ${r.conversao.toFixed(0)}% de conversão` });
    });

    // Seguradoras com alto volume e baixo fechamento
    seguradoraAnalysis.filter(s => s.total >= 5 && s.fechados === 0).forEach(s => {
      issues.push({ type: 'critical', message: `${s.nome}: ${s.total} cotações sem nenhum fechamento` });
    });

    return issues.slice(0, 6);
  }, [kpis, ranking, seguradoraAnalysis]);

  const CHART_COLORS = ['hsl(var(--primary))', 'hsl(156, 72%, 40%)', 'hsl(35, 95%, 55%)', 'hsl(0, 84%, 55%)', 'hsl(210, 55%, 50%)'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: config.color }} />
            {config.label}
            <Badge variant="secondary" className="text-xs">{kpis.total} oportunidades</Badge>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </DialogHeader>

        {/* Stage Tabs */}
        <div className="flex gap-1 flex-wrap">
          {Object.entries(STAGE_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setActiveStage(key)}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all ${
                activeStage === key
                  ? 'text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
              style={activeStage === key ? { backgroundColor: cfg.color } : undefined}
            >
              {cfg.label.replace('Produtor ', '')}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[180px] max-w-[250px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar segurado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Select value={filterSeguradora} onValueChange={setFilterSeguradora}>
            <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Seguradora" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas seguradoras</SelectItem>
              {filterOptions.seguradoras.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterProdutor} onValueChange={setFilterProdutor}>
            <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Produtor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos produtores</SelectItem>
              {filterOptions.produtores.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterRamo} onValueChange={setFilterRamo}>
            <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Ramo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos ramos</SelectItem>
              {filterOptions.ramos.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-4 pr-2">
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { icon: Users, label: 'Oportunidades', value: kpis.total.toString(), sub: `${kpis.fechados} fechados` },
                { icon: DollarSign, label: 'Prêmio Total', value: formatCurrency(kpis.premio), sub: '' },
                { icon: BarChart3, label: 'Ticket Médio', value: formatCurrency(kpis.ticketMedio), sub: '' },
                { icon: TrendingUp, label: 'Conversão', value: `${kpis.taxaConversao.toFixed(1)}%`, sub: '' },
                { icon: Clock, label: 'Tempo Médio', value: `${kpis.tempoMedio.toFixed(0)}d`, sub: '' },
              ].map((kpi) => (
                <Card key={kpi.label}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                      <kpi.icon className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-medium uppercase tracking-wider">{kpi.label}</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                    {kpi.sub && <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Tabs defaultValue="ranking" className="space-y-3">
              <TabsList className="grid w-full grid-cols-5 h-9">
                <TabsTrigger value="ranking" className="text-xs">Ranking</TabsTrigger>
                <TabsTrigger value="seguradora" className="text-xs">Seguradora</TabsTrigger>
                <TabsTrigger value="ramo" className="text-xs">Ramo</TabsTrigger>
                <TabsTrigger value="evolucao" className="text-xs">Evolução</TabsTrigger>
                <TabsTrigger value="gargalos" className="text-xs">Gargalos</TabsTrigger>
              </TabsList>

              {/* Tab: Ranking */}
              <TabsContent value="ranking">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      Ranking de Responsáveis
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Produtor</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                          <TableHead className="text-center">Fechados</TableHead>
                          <TableHead className="text-center">Conversão</TableHead>
                          <TableHead className="text-right">Prêmio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ranking.map((r, i) => (
                          <TableRow key={r.nome}>
                            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                            <TableCell className="font-medium">{r.nome}</TableCell>
                            <TableCell className="text-center font-semibold">{r.total}</TableCell>
                            <TableCell className="text-center text-success font-semibold">{r.fechados}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={r.conversao >= 50 ? 'default' : r.conversao >= 25 ? 'secondary' : 'outline'} className="text-[10px]">
                                {r.conversao.toFixed(1)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">{formatCurrency(r.premio)}</TableCell>
                          </TableRow>
                        ))}
                        {ranking.length === 0 && (
                          <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nenhum dado.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Seguradora */}
              <TabsContent value="seguradora">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      Análise por Seguradora
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={seguradoraAnalysis.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                            <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis dataKey="nome" type="category" width={100} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Total" />
                            <Bar dataKey="fechados" fill="hsl(156, 72%, 40%)" radius={[0, 4, 4, 0]} name="Fechados" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Seguradora</TableHead>
                            <TableHead className="text-center">Total</TableHead>
                            <TableHead className="text-center">Fechados</TableHead>
                            <TableHead className="text-right">Prêmio</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {seguradoraAnalysis.map(s => (
                            <TableRow key={s.nome}>
                              <TableCell className="font-medium text-xs">{s.nome}</TableCell>
                              <TableCell className="text-center font-semibold">{s.total}</TableCell>
                              <TableCell className="text-center text-success font-semibold">{s.fechados}</TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground">{formatCurrency(s.premio)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Ramo */}
              <TabsContent value="ramo">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      Análise por Ramo / Produto
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={ramoAnalysis.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                            <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis dataKey="nome" type="category" width={120} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                            <Bar dataKey="total" fill="hsl(210, 55%, 50%)" radius={[0, 4, 4, 0]} name="Total" />
                            <Bar dataKey="fechados" fill="hsl(156, 72%, 40%)" radius={[0, 4, 4, 0]} name="Fechados" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ramo</TableHead>
                            <TableHead className="text-center">Total</TableHead>
                            <TableHead className="text-center">Fechados</TableHead>
                            <TableHead className="text-right">Prêmio</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ramoAnalysis.map(r => (
                            <TableRow key={r.nome}>
                              <TableCell className="font-medium text-xs">{r.nome}</TableCell>
                              <TableCell className="text-center font-semibold">{r.total}</TableCell>
                              <TableCell className="text-center text-success font-semibold">{r.fechados}</TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground">{formatCurrency(r.premio)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Evolução */}
              <TabsContent value="evolucao">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Evolução no Tempo
                    </h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={timeEvolution} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis dataKey="mes" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Total" />
                        <Line type="monotone" dataKey="fechados" stroke="hsl(156, 72%, 40%)" strokeWidth={2} dot={{ r: 3 }} name="Fechados" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Gargalos */}
              <TabsContent value="gargalos">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Identificação de Gargalos
                    </h4>
                    {bottlenecks.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">Nenhum gargalo identificado neste estágio. ✅</p>
                    ) : (
                      <div className="space-y-2">
                        {bottlenecks.map((b, i) => (
                          <div key={i} className={`flex items-start gap-2 p-3 rounded-lg border ${
                            b.type === 'critical' ? 'border-destructive/30 bg-destructive/5' : 'border-yellow-500/30 bg-yellow-500/5'
                          }`}>
                            <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${
                              b.type === 'critical' ? 'text-destructive' : 'text-yellow-600'
                            }`} />
                            <p className="text-sm text-foreground">{b.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
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
