import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Users, TrendingUp, DollarSign, Clock, BarChart3, AlertTriangle,
  Building2, Layers, Search, ArrowRight, CheckCircle2, XCircle, FileText } from
'lucide-react';
import { type Cotacao } from '@/hooks/useSupabaseData';
import { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Legend } from 'recharts';

// ─── Config ───
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

// ─── Component ───
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

  useEffect(() => {if (open) {setActiveStage(initialStage);setFilterSeguradora('all');setFilterProdutor('all');setFilterRamo('all');setSearchTerm('');}}, [initialStage, open]);

  const roleKey = ROLE_KEY_MAP[activeStage as keyof typeof ROLE_KEY_MAP] || 'produtor_origem';

  // Filter options
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

  // Filtered cotacoes for active role
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

  // ─── KPIs ───
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
    return { total, premio, ticketMedio, taxaConversao, tempoMedio, fechados, declinados, emCotacao };
  }, [stageCotacoes]);

  // ─── Flow: cotação → origem → negociador → cotador → status ───
  const flowData = useMemo(() => {
    return stageCotacoes.map((c) => ({
      id: c.id,
      numero: c.numero_cotacao,
      segurado: c.segurado,
      cpf_cnpj: c.cpf_cnpj,
      origem: c.produtor_origem?.nome || '—',
      negociador: c.produtor_negociador?.nome || '—',
      cotador: c.produtor_cotador?.nome || '—',
      seguradora: c.seguradora?.nome || '—',
      ramo: c.ramo?.ramo_agrupado || c.ramo?.descricao || '—',
      premio: c.valor_premio || 0,
      status: c.status,
      data: c.data_cotacao
    }));
  }, [stageCotacoes]);

  // ─── Ranking ───
  const ranking = useMemo(() => {
    const map = new Map<string, {nome: string;total: number;fechados: number;declinados: number;emCotacao: number;premio: number;}>();
    stageCotacoes.forEach((c) => {
      const nome = c[roleKey]?.nome || '—';
      if (nome === '—') return;
      const e = map.get(nome) || { nome, total: 0, fechados: 0, declinados: 0, emCotacao: 0, premio: 0 };
      e.total++;
      if (c.status === 'Negócio fechado' || c.status === 'Fechamento congênere') {e.fechados++;e.premio += c.valor_premio || 0;}
      if (c.status === 'Declinado') e.declinados++;
      if (c.status === 'Em cotação') e.emCotacao++;
      map.set(nome, e);
    });
    return Array.from(map.values()).
    map((r) => ({ ...r, conversao: r.total > 0 ? r.fechados / r.total * 100 : 0 })).
    sort((a, b) => b.total - a.total);
  }, [stageCotacoes, roleKey]);

  // ─── Seguradora & Ramo ───
  const seguradoraAnalysis = useMemo(() => {
    const map = new Map<string, {nome: string;total: number;fechados: number;premio: number;}>();
    stageCotacoes.forEach((c) => {
      const nome = c.seguradora?.nome || 'Sem seguradora';
      const e = map.get(nome) || { nome, total: 0, fechados: 0, premio: 0 };
      e.total++;
      if (c.status === 'Negócio fechado' || c.status === 'Fechamento congênere') {e.fechados++;e.premio += c.valor_premio || 0;}
      map.set(nome, e);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [stageCotacoes]);

  const ramoAnalysis = useMemo(() => {
    const map = new Map<string, {nome: string;total: number;fechados: number;premio: number;}>();
    stageCotacoes.forEach((c) => {
      const nome = c.ramo?.ramo_agrupado || c.ramo?.descricao || 'Sem ramo';
      const e = map.get(nome) || { nome, total: 0, fechados: 0, premio: 0 };
      e.total++;
      if (c.status === 'Negócio fechado' || c.status === 'Fechamento congênere') {e.fechados++;e.premio += c.valor_premio || 0;}
      map.set(nome, e);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [stageCotacoes]);

  // ─── Time evolution ───
  const timeEvolution = useMemo(() => {
    const monthMap = new Map<string, {mes: string;total: number;fechados: number;premio: number;}>();
    stageCotacoes.forEach((c) => {
      const d = new Date(c.data_cotacao);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      const e = monthMap.get(key) || { mes: label, total: 0, fechados: 0, premio: 0 };
      e.total++;
      if (c.status === 'Negócio fechado' || c.status === 'Fechamento congênere') {e.fechados++;e.premio += c.valor_premio || 0;}
      monthMap.set(key, e);
    });
    return Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [stageCotacoes]);

  // ─── Bottlenecks ───
  const bottlenecks = useMemo(() => {
    const issues: {type: 'warning' | 'critical';message: string;}[] = [];
    if (kpis.tempoMedio > 30) issues.push({ type: 'critical', message: `Tempo médio de ${kpis.tempoMedio.toFixed(0)} dias é elevado para este papel` });
    if (kpis.taxaConversao < 20 && kpis.total > 5) issues.push({ type: 'warning', message: `Taxa de conversão de ${kpis.taxaConversao.toFixed(1)}% está abaixo do esperado` });
    ranking.filter((r) => r.total >= 5 && r.conversao < 15).forEach((r) => {
      issues.push({ type: 'warning', message: `${r.nome}: ${r.total} oportunidades, apenas ${r.conversao.toFixed(0)}% de conversão` });
    });
    seguradoraAnalysis.filter((s) => s.total >= 5 && s.fechados === 0).forEach((s) => {
      issues.push({ type: 'critical', message: `${s.nome}: ${s.total} cotações sem fechamento` });
    });
    return issues.slice(0, 6);
  }, [kpis, ranking, seguradoraAnalysis]);

  const statusIcon = (status: string) => {
    if (status === 'Negócio fechado' || status === 'Fechamento congênere') return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
    if (status === 'Declinado') return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    return <Clock className="h-3.5 w-3.5 text-primary" />;
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

        {/* Stage pills */}
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(ROLE_LABELS).map(([key, label]) =>
          <button
            key={key}
            onClick={() => setActiveStage(key)}
            className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all border ${
            activeStage === key ?
            'text-white border-transparent shadow-sm' :
            'bg-muted/50 text-muted-foreground border-border hover:bg-muted'}`
            }
            style={activeStage === key ? { backgroundColor: ROLE_COLORS[key] } : undefined}>
            
              {label.replace('Produtor ', '')}
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[180px] max-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar segurado..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-8 pl-8 text-xs" />
          </div>
          <Select value={filterSeguradora} onValueChange={setFilterSeguradora}>
            <SelectTrigger className="h-8 w-[155px] text-xs"><SelectValue placeholder="Seguradora" /></SelectTrigger>
            <SelectContent>{[<SelectItem key="all" value="all">Todas seguradoras</SelectItem>, ...filterOptions.seguradoras.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)]}</SelectContent>
          </Select>
          <Select value={filterProdutor} onValueChange={setFilterProdutor}>
            <SelectTrigger className="h-8 w-[155px] text-xs"><SelectValue placeholder="Produtor" /></SelectTrigger>
            <SelectContent>{[<SelectItem key="all" value="all">Todos produtores</SelectItem>, ...filterOptions.produtores.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)]}</SelectContent>
          </Select>
          <Select value={filterRamo} onValueChange={setFilterRamo}>
            <SelectTrigger className="h-8 w-[135px] text-xs"><SelectValue placeholder="Ramo" /></SelectTrigger>
            <SelectContent>{[<SelectItem key="all" value="all">Todos ramos</SelectItem>, ...filterOptions.ramos.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)]}</SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-4 pr-2">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
              { icon: FileText, label: 'Cotações', value: kpis.total.toString(), color: 'text-foreground' },
              { icon: DollarSign, label: 'Prêmio Total', value: formatCurrency(kpis.premio), color: 'text-foreground' },
              { icon: BarChart3, label: 'Ticket Médio', value: formatCurrency(kpis.ticketMedio), color: 'text-foreground' },
              { icon: TrendingUp, label: 'Conversão', value: `${kpis.taxaConversao.toFixed(1)}%`, color: kpis.taxaConversao >= 30 ? 'text-success' : 'text-destructive' },
              { icon: Clock, label: 'Tempo Médio', value: `${kpis.tempoMedio.toFixed(0)} dias`, color: kpis.tempoMedio <= 30 ? 'text-success' : 'text-destructive' }].
              map((k) =>
              <Card key={k.label}>
                  





                
                </Card>
              )}
            </div>

            <Tabs defaultValue="fluxo" className="space-y-3">
              <TabsList className="grid w-full grid-cols-5 h-9">
                <TabsTrigger value="fluxo" className="text-xs">Fluxo Comercial</TabsTrigger>
                <TabsTrigger value="ranking" className="text-xs">Ranking</TabsTrigger>
                <TabsTrigger value="seguradora" className="text-xs">Seguradora</TabsTrigger>
                <TabsTrigger value="ramo" className="text-xs">Ramo</TabsTrigger>
                <TabsTrigger value="evolucao" className="text-xs">Evolução</TabsTrigger>
              </TabsList>

              {/* ─── Tab: Fluxo Comercial ─── */}
              <TabsContent value="fluxo" className="space-y-4">
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
                          <TableHead className="w-[60px]">Nº</TableHead>
                          <TableHead>Segurado</TableHead>
                          <TableHead className="text-center">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">Origem</span>
                          </TableHead>
                          <TableHead className="text-center w-[20px]" />
                          <TableHead className="text-center">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">Negociador</span>
                          </TableHead>
                          <TableHead className="text-center w-[20px]" />
                          <TableHead className="text-center">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">Cotador</span>
                          </TableHead>
                          <TableHead className="text-center w-[20px]" />
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-right">Prêmio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {flowData.slice(0, 50).map((row) =>
                        <TableRow key={row.id}>
                            <TableCell className="text-[10px] text-muted-foreground font-mono">{row.numero}</TableCell>
                            <TableCell className="font-medium text-xs max-w-[160px] truncate">{row.segurado}</TableCell>
                            <TableCell className="text-center text-xs">{row.origem}</TableCell>
                            <TableCell className="text-center"><ArrowRight className="h-3 w-3 text-muted-foreground/50 mx-auto" /></TableCell>
                            <TableCell className="text-center text-xs">{row.negociador}</TableCell>
                            <TableCell className="text-center"><ArrowRight className="h-3 w-3 text-muted-foreground/50 mx-auto" /></TableCell>
                            <TableCell className="text-center text-xs">{row.cotador}</TableCell>
                            <TableCell className="text-center"><ArrowRight className="h-3 w-3 text-muted-foreground/50 mx-auto" /></TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {statusIcon(row.status)}
                                <span className="text-[10px]">{row.status === 'Negócio fechado' ? 'Fechado' : row.status === 'Fechamento congênere' ? 'Congênere' : row.status}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">{formatCurrency(row.premio)}</TableCell>
                          </TableRow>
                        )}
                        {flowData.length === 0 &&
                        <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">Nenhum dado disponível.</TableCell></TableRow>
                        }
                      </TableBody>
                    </Table>
                    {flowData.length > 50 &&
                    <p className="text-[10px] text-muted-foreground text-center mt-2">Exibindo 50 de {flowData.length} registros</p>
                    }
                  </CardContent>
                </Card>

                {/* Mini Fechamento Gerencial */}
                <Card className="border-primary/20 bg-primary/[0.02]">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Fechamento Gerencial — {ROLE_LABELS[activeStage]?.replace('Produtor ', '')}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pipeline</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-foreground">{kpis.total}</span>
                          <span className="text-xs text-muted-foreground">cotações</span>
                        </div>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[10px] text-primary">Em cotação: {kpis.emCotacao}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Resultados</p>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                            <span className="text-lg font-bold text-success">{kpis.fechados}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <XCircle className="h-3.5 w-3.5 text-destructive" />
                            <span className="text-lg font-bold text-destructive">{kpis.declinados}</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Conversão: <span className="font-semibold text-foreground">{kpis.taxaConversao.toFixed(1)}%</span>
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Financeiro</p>
                        <p className="text-lg font-bold text-foreground">{formatCurrency(kpis.premio)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Ticket médio: <span className="font-semibold text-foreground">{formatCurrency(kpis.ticketMedio)}</span>
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Eficiência</p>
                        <p className="text-lg font-bold text-foreground">{kpis.tempoMedio.toFixed(0)} <span className="text-xs font-normal">dias</span></p>
                        <p className="text-[10px] text-muted-foreground">tempo médio no estágio</p>
                        {bottlenecks.length > 0 &&
                        <div className="flex items-center gap-1 mt-1">
                            <AlertTriangle className="h-3 w-3 text-yellow-500" />
                            <span className="text-[10px] text-yellow-600">{bottlenecks.length} alerta(s)</span>
                          </div>
                        }
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─── Tab: Ranking ─── */}
              <TabsContent value="ranking">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      Ranking — {ROLE_LABELS[activeStage]?.replace('Produtor ', '')}
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Produtor</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                          <TableHead className="text-center">Em Cotação</TableHead>
                          <TableHead className="text-center">Fechados</TableHead>
                          <TableHead className="text-center">Declinados</TableHead>
                          <TableHead className="text-center">Conversão</TableHead>
                          <TableHead className="text-right">Prêmio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ranking.map((r, i) =>
                        <TableRow key={r.nome}>
                            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                            <TableCell className="font-medium">{r.nome}</TableCell>
                            <TableCell className="text-center font-semibold">{r.total}</TableCell>
                            <TableCell className="text-center text-primary font-semibold">{r.emCotacao}</TableCell>
                            <TableCell className="text-center text-success font-semibold">{r.fechados}</TableCell>
                            <TableCell className="text-center text-destructive font-semibold">{r.declinados}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={r.conversao >= 50 ? 'default' : r.conversao >= 25 ? 'secondary' : 'outline'} className="text-[10px]">
                                {r.conversao.toFixed(1)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">{formatCurrency(r.premio)}</TableCell>
                          </TableRow>
                        )}
                        {ranking.length === 0 &&
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Nenhum dado.</TableCell></TableRow>
                        }
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─── Tab: Seguradora ─── */}
              <TabsContent value="seguradora">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      Análise por Seguradora
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          {seguradoraAnalysis.map((s) =>
                          <TableRow key={s.nome}>
                              <TableCell className="font-medium text-xs">{s.nome}</TableCell>
                              <TableCell className="text-center font-semibold">{s.total}</TableCell>
                              <TableCell className="text-center text-success font-semibold">{s.fechados}</TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground">{formatCurrency(s.premio)}</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─── Tab: Ramo ─── */}
              <TabsContent value="ramo">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      Análise por Ramo / Produto
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          {ramoAnalysis.map((r) =>
                          <TableRow key={r.nome}>
                              <TableCell className="font-medium text-xs">{r.nome}</TableCell>
                              <TableCell className="text-center font-semibold">{r.total}</TableCell>
                              <TableCell className="text-center text-success font-semibold">{r.fechados}</TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground">{formatCurrency(r.premio)}</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─── Tab: Evolução ─── */}
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
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>);

}