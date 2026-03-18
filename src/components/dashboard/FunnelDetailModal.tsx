import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Users, TrendingUp, DollarSign, Clock, BarChart3, AlertTriangle,
  Building2, Layers, Search, ArrowRight, CheckCircle2, XCircle, FileText,
  Zap, Flame, Snowflake, ThermometerSun, Target, Lightbulb, Timer
} from 'lucide-react';
import { type Cotacao } from '@/hooks/useSupabaseData';
import { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Legend, AreaChart, Area, ComposedChart } from 'recharts';

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
const formatCurrencyShort = (v: number) => {
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}K`;
  return formatCurrency(v);
};

const getDias = (c: Cotacao) => {
  const start = new Date(c.data_cotacao).getTime();
  const end = c.data_fechamento ? new Date(c.data_fechamento).getTime() : Date.now();
  return (end - start) / (1000 * 60 * 60 * 24);
};

const getScore = (c: Cotacao): 'quente' | 'morno' | 'frio' => {
  if (c.status !== 'Em cotação') return 'frio';
  const dias = getDias(c);
  const premio = c.valor_premio || 0;
  if (dias <= 15 && premio > 5000) return 'quente';
  if (dias <= 45) return 'morno';
  return 'frio';
};

const scoreBadge = (score: 'quente' | 'morno' | 'frio') => {
  if (score === 'quente') return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[9px] gap-0.5"><Flame className="h-2.5 w-2.5" />Quente</Badge>;
  if (score === 'morno') return <Badge className="bg-warning/15 text-warning border-warning/30 text-[9px] gap-0.5"><ThermometerSun className="h-2.5 w-2.5" />Morno</Badge>;
  return <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/30 text-[9px] gap-0.5"><Snowflake className="h-2.5 w-2.5" />Frio</Badge>;
};

const statusBadge = (status: string) => {
  if (status === 'Negócio fechado' || status === 'Fechamento congênere')
    return <Badge className="bg-success/15 text-success border-success/30 text-[9px] gap-0.5"><CheckCircle2 className="h-2.5 w-2.5" />{status === 'Negócio fechado' ? 'Fechado' : 'Congênere'}</Badge>;
  if (status === 'Declinado')
    return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[9px] gap-0.5"><XCircle className="h-2.5 w-2.5" />Declinado</Badge>;
  return <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px] gap-0.5"><Clock className="h-2.5 w-2.5" />{status}</Badge>;
};

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

  useEffect(() => { if (open) { setActiveStage(initialStage); setFilterSeguradora('all'); setFilterProdutor('all'); setFilterRamo('all'); setSearchTerm(''); } }, [initialStage, open]);

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
    const tempos = stageCotacoes.map(getDias);
    const tempoMedio = tempos.length > 0 ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0;
    const premioFechado = stageCotacoes.filter((c) => c.status === 'Negócio fechado' || c.status === 'Fechamento congênere').reduce((s, c) => s + (c.valor_premio || 0), 0);
    const premioEmAberto = stageCotacoes.filter((c) => c.status === 'Em cotação').reduce((s, c) => s + (c.valor_premio || 0), 0);
    return { total, premio, ticketMedio, taxaConversao, tempoMedio, fechados, declinados, emCotacao, premioFechado, premioEmAberto };
  }, [stageCotacoes]);

  // ─── Conversion by stage ───
  const stageConversions = useMemo(() => {
    const withOrigem = cotacoes.filter(c => c.produtor_origem?.nome).length;
    const withNeg = cotacoes.filter(c => c.produtor_negociador?.nome).length;
    const withCot = cotacoes.filter(c => c.produtor_cotador?.nome).length;
    const fechados = cotacoes.filter(c => c.status === 'Negócio fechado' || c.status === 'Fechamento congênere').length;
    return [
      { etapa: 'Origem → Negociador', de: withOrigem, para: withNeg, conv: withOrigem > 0 ? (withNeg / withOrigem * 100) : 0 },
      { etapa: 'Negociador → Cotador', de: withNeg, para: withCot, conv: withNeg > 0 ? (withCot / withNeg * 100) : 0 },
      { etapa: 'Cotador → Fechado', de: withCot, para: fechados, conv: withCot > 0 ? (fechados / withCot * 100) : 0 },
    ];
  }, [cotacoes]);

  // ─── Flow data with score + tempo ───
  const flowData = useMemo(() => {
    return stageCotacoes.map((c) => ({
      id: c.id,
      numero: c.numero_cotacao,
      segurado: c.segurado,
      origem: c.produtor_origem?.nome || '—',
      negociador: c.produtor_negociador?.nome || '—',
      cotador: c.produtor_cotador?.nome || '—',
      premio: c.valor_premio || 0,
      status: c.status,
      dias: getDias(c),
      score: getScore(c),
      dataCotacao: c.data_cotacao,
      dataFechamento: c.data_fechamento,
    }));
  }, [stageCotacoes]);

  // ─── Ranking with ticket, tempo, receita potencial ───
  const ranking = useMemo(() => {
    const map = new Map<string, { nome: string; total: number; fechados: number; declinados: number; emCotacao: number; premio: number; premioEmAberto: number; tempos: number[] }>();
    stageCotacoes.forEach((c) => {
      const nome = c[roleKey]?.nome || '—';
      if (nome === '—') return;
      const e = map.get(nome) || { nome, total: 0, fechados: 0, declinados: 0, emCotacao: 0, premio: 0, premioEmAberto: 0, tempos: [] };
      e.total++;
      e.tempos.push(getDias(c));
      if (c.status === 'Negócio fechado' || c.status === 'Fechamento congênere') { e.fechados++; e.premio += c.valor_premio || 0; }
      if (c.status === 'Declinado') e.declinados++;
      if (c.status === 'Em cotação') { e.emCotacao++; e.premioEmAberto += c.valor_premio || 0; }
      map.set(nome, e);
    });
    return Array.from(map.values())
      .map((r) => ({
        ...r,
        conversao: r.total > 0 ? r.fechados / r.total * 100 : 0,
        ticketMedio: r.fechados > 0 ? r.premio / r.fechados : 0,
        tempoMedio: r.tempos.length > 0 ? r.tempos.reduce((a, b) => a + b, 0) / r.tempos.length : 0,
      }))
      .sort((a, b) => b.premio - a.premio);
  }, [stageCotacoes, roleKey]);

  // ─── Seguradora with conversão, ticket, tempo ───
  const seguradoraAnalysis = useMemo(() => {
    const map = new Map<string, { nome: string; total: number; fechados: number; premio: number; tempos: number[] }>();
    stageCotacoes.forEach((c) => {
      const nome = c.seguradora?.nome || 'Sem seguradora';
      const e = map.get(nome) || { nome, total: 0, fechados: 0, premio: 0, tempos: [] };
      e.total++;
      e.tempos.push(getDias(c));
      if (c.status === 'Negócio fechado' || c.status === 'Fechamento congênere') { e.fechados++; e.premio += c.valor_premio || 0; }
      map.set(nome, e);
    });
    return Array.from(map.values())
      .map(s => ({
        ...s,
        conversao: s.total > 0 ? s.fechados / s.total * 100 : 0,
        ticketMedio: s.fechados > 0 ? s.premio / s.fechados : 0,
        tempoMedio: s.tempos.length > 0 ? s.tempos.reduce((a, b) => a + b, 0) / s.tempos.length : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [stageCotacoes]);

  // ─── Ramo with conversão, ticket, tempo ───
  const ramoAnalysis = useMemo(() => {
    const map = new Map<string, { nome: string; total: number; fechados: number; premio: number; tempos: number[] }>();
    stageCotacoes.forEach((c) => {
      const nome = c.ramo?.ramo_agrupado || c.ramo?.descricao || 'Sem ramo';
      const e = map.get(nome) || { nome, total: 0, fechados: 0, premio: 0, tempos: [] };
      e.total++;
      e.tempos.push(getDias(c));
      if (c.status === 'Negócio fechado' || c.status === 'Fechamento congênere') { e.fechados++; e.premio += c.valor_premio || 0; }
      map.set(nome, e);
    });
    return Array.from(map.values())
      .map(r => ({
        ...r,
        conversao: r.total > 0 ? r.fechados / r.total * 100 : 0,
        ticketMedio: r.fechados > 0 ? r.premio / r.fechados : 0,
        tempoMedio: r.tempos.length > 0 ? r.tempos.reduce((a, b) => a + b, 0) / r.tempos.length : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [stageCotacoes]);

  // ─── Time evolution with conversion + accumulated revenue ───
  const timeEvolution = useMemo(() => {
    const monthMap = new Map<string, { mes: string; total: number; fechados: number; premio: number; premioAcum: number }>();
    stageCotacoes.forEach((c) => {
      const d = new Date(c.data_cotacao);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      const e = monthMap.get(key) || { mes: label, total: 0, fechados: 0, premio: 0, premioAcum: 0 };
      e.total++;
      if (c.status === 'Negócio fechado' || c.status === 'Fechamento congênere') { e.fechados++; e.premio += c.valor_premio || 0; }
      monthMap.set(key, e);
    });
    const sorted = Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
    let acum = 0;
    sorted.forEach(s => { acum += s.premio; s.premioAcum = acum; });
    return sorted.map(s => ({ ...s, conversao: s.total > 0 ? (s.fechados / s.total * 100) : 0 }));
  }, [stageCotacoes]);

  // ─── Bottlenecks ───
  const bottlenecks = useMemo(() => {
    const issues: { type: 'warning' | 'critical'; message: string }[] = [];
    if (kpis.tempoMedio > 30) issues.push({ type: 'critical', message: `Tempo médio de ${kpis.tempoMedio.toFixed(0)} dias é elevado para esta etapa` });
    if (kpis.taxaConversao < 20 && kpis.total > 5) issues.push({ type: 'warning', message: `Taxa de conversão de ${kpis.taxaConversao.toFixed(1)}% abaixo do esperado` });
    // Tempo parado critical
    const criticos = flowData.filter(f => f.status === 'Em cotação' && f.dias > 60);
    if (criticos.length > 0) issues.push({ type: 'critical', message: `${criticos.length} cotação(ões) parada(s) há mais de 60 dias` });
    ranking.filter((r) => r.total >= 5 && r.conversao < 15).forEach((r) => {
      issues.push({ type: 'warning', message: `${r.nome}: ${r.total} oportunidades, apenas ${r.conversao.toFixed(0)}% conversão` });
    });
    // Gargalo between stages
    stageConversions.forEach(sc => {
      if (sc.conv < 60 && sc.de > 3) issues.push({ type: 'warning', message: `Gargalo em "${sc.etapa}": apenas ${sc.conv.toFixed(0)}% passam` });
    });
    return issues.slice(0, 6);
  }, [kpis, ranking, flowData, stageConversions]);

  // ─── Insights automáticos ───
  const insights = useMemo(() => {
    const tips: string[] = [];
    // Best producer
    const best = ranking[0];
    if (best && best.conversao > 0) tips.push(`🏆 ${best.nome} lidera com ${formatCurrency(best.premio)} em prêmio fechado e ${best.conversao.toFixed(0)}% de conversão`);
    // Worst conversion
    const worst = [...ranking].filter(r => r.total >= 3).sort((a, b) => a.conversao - b.conversao)[0];
    if (worst && worst.conversao < 20) tips.push(`⚠️ ${worst.nome} precisa de atenção: ${worst.conversao.toFixed(0)}% de conversão em ${worst.total} oportunidades`);
    // Best seguradora
    const bestSeg = [...seguradoraAnalysis].sort((a, b) => b.conversao - a.conversao)[0];
    if (bestSeg && bestSeg.conversao > 0) tips.push(`🏢 Melhor conversão por seguradora: ${bestSeg.nome} com ${bestSeg.conversao.toFixed(0)}%`);
    // Hot opportunities
    const quentes = flowData.filter(f => f.score === 'quente').length;
    if (quentes > 0) tips.push(`🔥 ${quentes} oportunidade(s) quente(s) — priorizar contato imediato`);
    // Stale quotes
    const paradas = flowData.filter(f => f.status === 'Em cotação' && f.dias > 45).length;
    if (paradas > 0) tips.push(`❄️ ${paradas} cotação(ões) parada(s) há mais de 45 dias — reavaliar ou declinar`);
    // Forecast
    const conv = kpis.total > 0 ? kpis.fechados / kpis.total : 0;
    const potencial = kpis.premioEmAberto * conv;
    if (potencial > 0) tips.push(`💰 Receita potencial estimada: ${formatCurrency(potencial)} baseado na taxa de conversão atual`);
    return tips.slice(0, 5);
  }, [ranking, seguradoraAnalysis, flowData, kpis]);

  // ─── Forecast ───
  const forecast = useMemo(() => {
    const conv = kpis.total > 0 ? kpis.fechados / kpis.total : 0;
    const pipeline = kpis.premioEmAberto;
    return {
      pessimista: pipeline * Math.max(conv * 0.6, 0.05),
      provavel: pipeline * Math.max(conv, 0.1),
      otimista: pipeline * Math.min(conv * 1.5, 0.95),
    };
  }, [kpis]);

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
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all border ${activeStage === key
                ? 'text-white border-transparent shadow-sm'
                : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'}`}
              style={activeStage === key ? { backgroundColor: ROLE_COLORS[key] } : undefined}
            >
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
              <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20 text-center">
                <p className="text-xl font-bold text-primary">{kpis.total}</p>
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><FileText className="h-3 w-3" />Cotações</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-success/10 to-success/5 rounded-lg border border-success/20 text-center">
                <p className="text-xl font-bold text-success">{formatCurrencyShort(kpis.premioFechado)}</p>
                <p className="text-[10px] text-muted-foreground">Prêmio Fechado</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-lg border border-amber-500/20 text-center">
                <p className="text-xl font-bold text-brand-orange">{formatCurrencyShort(kpis.premioEmAberto)}</p>
                <p className="text-[10px] text-muted-foreground">Pipeline Aberto</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20 text-center">
                <p className={`text-xl font-bold ${kpis.taxaConversao >= 30 ? 'text-success' : kpis.taxaConversao >= 15 ? 'text-warning' : 'text-destructive'}`}>{kpis.taxaConversao.toFixed(1)}%</p>
                <p className="text-[10px] text-muted-foreground">Conversão</p>
              </div>
              <div className={`p-3 rounded-lg border text-center ${kpis.tempoMedio > 30 ? 'bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20' : 'bg-gradient-to-br from-muted/50 to-muted/30 border-border'}`}>
                <p className={`text-xl font-bold ${kpis.tempoMedio > 30 ? 'text-destructive' : 'text-foreground'}`}>{kpis.tempoMedio.toFixed(0)} <span className="text-xs font-normal">dias</span></p>
                <p className="text-[10px] text-muted-foreground">Tempo Médio</p>
              </div>
            </div>

            {/* Conversion Pipeline */}
            <div className="p-3 bg-muted/20 rounded-lg border">
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Target className="h-3.5 w-3.5 text-primary" />Conversão por Etapa</p>
              <div className="flex items-center gap-2 justify-center flex-wrap">
                {stageConversions.map((sc, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="text-center">
                      <p className="text-sm font-bold text-foreground">{sc.de}</p>
                      <p className="text-[9px] text-muted-foreground">{sc.etapa.split(' → ')[0]}</p>
                    </div>
                    <div className="flex flex-col items-center px-1">
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className={`text-[10px] font-bold ${sc.conv >= 70 ? 'text-success' : sc.conv >= 40 ? 'text-warning' : 'text-destructive'}`}>{sc.conv.toFixed(0)}%</span>
                    </div>
                    {i === stageConversions.length - 1 && (
                      <div className="text-center">
                        <p className="text-sm font-bold text-success">{sc.para}</p>
                        <p className="text-[9px] text-muted-foreground">Fechados</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottlenecks + Insights row */}
            {(bottlenecks.length > 0 || insights.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {bottlenecks.length > 0 && (
                  <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                    <p className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-destructive"><AlertTriangle className="h-3.5 w-3.5" />Gargalos e Alertas</p>
                    <div className="space-y-1.5">
                      {bottlenecks.map((b, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <AlertTriangle className={`h-3 w-3 mt-0.5 shrink-0 ${b.type === 'critical' ? 'text-destructive' : 'text-warning'}`} />
                          <p className={`text-[11px] ${b.type === 'critical' ? 'text-destructive' : 'text-warning'}`}>{b.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {insights.length > 0 && (
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-primary"><Lightbulb className="h-3.5 w-3.5" />Insights & Sugestões</p>
                    <div className="space-y-1.5">
                      {insights.map((tip, i) => (
                        <p key={i} className="text-[11px] text-foreground">{tip}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Tabs defaultValue="fluxo" className="space-y-3">
              <TabsList className="grid w-full grid-cols-6 h-9">
                <TabsTrigger value="fluxo" className="text-xs">Fluxo & Score</TabsTrigger>
                <TabsTrigger value="ranking" className="text-xs">Ranking</TabsTrigger>
                <TabsTrigger value="seguradora" className="text-xs">Seguradora</TabsTrigger>
                <TabsTrigger value="ramo" className="text-xs">Ramo</TabsTrigger>
                <TabsTrigger value="evolucao" className="text-xs">Evolução</TabsTrigger>
                <TabsTrigger value="forecast" className="text-xs">Forecast</TabsTrigger>
              </TabsList>

              {/* ─── Tab: Fluxo & Score ─── */}
              <TabsContent value="fluxo" className="space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-primary" />
                      Timeline & Score de Oportunidades
                      <span className="text-[10px] text-muted-foreground font-normal ml-auto">Origem → Negociador → Cotador → Resultado</span>
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[55px]">Nº</TableHead>
                          <TableHead>Segurado</TableHead>
                          <TableHead className="text-center"><span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">Origem</span></TableHead>
                          <TableHead className="text-center w-[16px]" />
                          <TableHead className="text-center"><span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-orange/10 text-brand-orange font-semibold">Negociador</span></TableHead>
                          <TableHead className="text-center w-[16px]" />
                          <TableHead className="text-center"><span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success font-semibold">Cotador</span></TableHead>
                          <TableHead className="text-center w-[16px]" />
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-center">Score</TableHead>
                          <TableHead className="text-center">Dias</TableHead>
                          <TableHead className="text-right">Prêmio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {flowData.slice(0, 50).map((row) => (
                          <TableRow key={row.id} className={`hover:bg-muted/30 ${row.dias > 60 && row.status === 'Em cotação' ? 'bg-destructive/5' : ''}`}>
                            <TableCell className="text-[10px] text-muted-foreground font-mono">{row.numero}</TableCell>
                            <TableCell className="font-medium text-xs max-w-[140px] truncate">{row.segurado}</TableCell>
                            <TableCell className="text-center text-xs font-medium text-primary">{row.origem}</TableCell>
                            <TableCell className="text-center"><ArrowRight className="h-3 w-3 text-muted-foreground/40 mx-auto" /></TableCell>
                            <TableCell className="text-center text-xs font-medium text-brand-orange">{row.negociador}</TableCell>
                            <TableCell className="text-center"><ArrowRight className="h-3 w-3 text-muted-foreground/40 mx-auto" /></TableCell>
                            <TableCell className="text-center text-xs font-medium text-success">{row.cotador}</TableCell>
                            <TableCell className="text-center"><ArrowRight className="h-3 w-3 text-muted-foreground/40 mx-auto" /></TableCell>
                            <TableCell className="text-center">{statusBadge(row.status)}</TableCell>
                            <TableCell className="text-center">{row.status === 'Em cotação' ? scoreBadge(row.score) : '—'}</TableCell>
                            <TableCell className="text-center">
                              <span className={`text-[10px] font-semibold ${row.dias > 60 ? 'text-destructive' : row.dias > 30 ? 'text-warning' : 'text-muted-foreground'}`}>
                                {row.dias.toFixed(0)}d
                                {row.dias > 60 && row.status === 'Em cotação' && <Timer className="h-2.5 w-2.5 inline ml-0.5 text-destructive" />}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-xs font-semibold">{formatCurrency(row.premio)}</TableCell>
                          </TableRow>
                        ))}
                        {flowData.length === 0 &&
                          <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-6">Nenhum dado disponível.</TableCell></TableRow>
                        }
                      </TableBody>
                    </Table>
                    {flowData.length > 50 &&
                      <p className="text-[10px] text-muted-foreground text-center mt-2">Exibindo 50 de {flowData.length} registros</p>
                    }
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─── Tab: Ranking ─── */}
              <TabsContent value="ranking">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="text-left py-2 px-2 font-medium">#</th>
                        <th className="text-left py-2 px-2 font-medium">Produtor</th>
                        <th className="text-center py-2 px-2 font-medium text-success">Fechados</th>
                        <th className="text-center py-2 px-2 font-medium text-brand-orange">Aberto</th>
                        <th className="text-center py-2 px-2 font-medium">Conversão</th>
                        <th className="text-right py-2 px-2 font-medium">Ticket Médio</th>
                        <th className="text-center py-2 px-2 font-medium">Tempo Médio</th>
                        <th className="text-right py-2 px-2 font-medium">Prêmio</th>
                        <th className="text-right py-2 px-2 font-medium text-brand-orange">Pipeline</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.map((r, i) =>
                        <tr key={r.nome} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-2 px-2">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${i === 0 ? 'bg-amber-500 text-amber-950' :
                              i === 1 ? 'bg-slate-400 text-slate-950' :
                                i === 2 ? 'bg-amber-700 text-amber-100' :
                                  'bg-muted text-muted-foreground'
                              }`}>{i + 1}</span>
                          </td>
                          <td className="py-2 px-2 font-medium">{r.nome}</td>
                          <td className="py-2 px-2 text-center font-semibold text-success">{r.fechados}</td>
                          <td className="py-2 px-2 text-center font-semibold text-brand-orange">{r.emCotacao}</td>
                          <td className="py-2 px-2 text-center">
                            <Badge className={`text-xs ${r.conversao >= 50 ? 'bg-success/15 text-success border-success/30' :
                              r.conversao >= 25 ? 'bg-warning/15 text-warning border-warning/30' :
                                'bg-destructive/15 text-destructive border-destructive/30'}`}>
                              {r.conversao.toFixed(1)}%
                            </Badge>
                          </td>
                          <td className="py-2 px-2 text-right text-xs">{r.ticketMedio > 0 ? formatCurrencyShort(r.ticketMedio) : '—'}</td>
                          <td className="py-2 px-2 text-center">
                            <span className={`text-xs font-medium ${r.tempoMedio > 30 ? 'text-destructive' : 'text-muted-foreground'}`}>{r.tempoMedio.toFixed(0)}d</span>
                          </td>
                          <td className="py-2 px-2 text-right font-semibold text-success">{formatCurrencyShort(r.premio)}</td>
                          <td className="py-2 px-2 text-right font-medium text-brand-orange">{formatCurrencyShort(r.premioEmAberto)}</td>
                        </tr>
                      )}
                      {ranking.length === 0 &&
                        <tr><td colSpan={9} className="text-center text-muted-foreground py-6">Nenhum dado.</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
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
                          <Bar dataKey="fechados" fill="hsl(156, 62%, 52%)" radius={[0, 4, 4, 0]} name="Fechados" />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-xs text-muted-foreground">
                              <th className="text-left py-2 px-2 font-medium">Seguradora</th>
                              <th className="text-center py-2 px-2 font-medium">Total</th>
                              <th className="text-center py-2 px-2 font-medium">Conv.</th>
                              <th className="text-center py-2 px-2 font-medium">Ticket</th>
                              <th className="text-center py-2 px-2 font-medium">Tempo</th>
                              <th className="text-right py-2 px-2 font-medium">Prêmio</th>
                            </tr>
                          </thead>
                          <tbody>
                            {seguradoraAnalysis.map((s) =>
                              <tr key={s.nome} className="border-b border-border/50 hover:bg-muted/30">
                                <td className="py-2 px-2 font-medium text-xs">{s.nome}</td>
                                <td className="py-2 px-2 text-center font-semibold">{s.total}</td>
                                <td className="py-2 px-2 text-center">
                                  <span className={`text-xs font-semibold ${s.conversao >= 40 ? 'text-success' : s.conversao >= 20 ? 'text-warning' : 'text-destructive'}`}>{s.conversao.toFixed(0)}%</span>
                                </td>
                                <td className="py-2 px-2 text-center text-xs">{s.ticketMedio > 0 ? formatCurrencyShort(s.ticketMedio) : '—'}</td>
                                <td className="py-2 px-2 text-center">
                                  <span className={`text-xs ${s.tempoMedio > 30 ? 'text-destructive' : 'text-muted-foreground'}`}>{s.tempoMedio.toFixed(0)}d</span>
                                </td>
                                <td className="py-2 px-2 text-right text-xs font-semibold text-success">{formatCurrencyShort(s.premio)}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
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
                          <Bar dataKey="fechados" fill="hsl(156, 62%, 52%)" radius={[0, 4, 4, 0]} name="Fechados" />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-xs text-muted-foreground">
                              <th className="text-left py-2 px-2 font-medium">Ramo</th>
                              <th className="text-center py-2 px-2 font-medium">Total</th>
                              <th className="text-center py-2 px-2 font-medium">Conv.</th>
                              <th className="text-center py-2 px-2 font-medium">Ticket</th>
                              <th className="text-center py-2 px-2 font-medium">Tempo</th>
                              <th className="text-right py-2 px-2 font-medium">Prêmio</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ramoAnalysis.map((r) =>
                              <tr key={r.nome} className="border-b border-border/50 hover:bg-muted/30">
                                <td className="py-2 px-2 font-medium text-xs">{r.nome}</td>
                                <td className="py-2 px-2 text-center font-semibold">{r.total}</td>
                                <td className="py-2 px-2 text-center">
                                  <span className={`text-xs font-semibold ${r.conversao >= 40 ? 'text-success' : r.conversao >= 20 ? 'text-warning' : 'text-destructive'}`}>{r.conversao.toFixed(0)}%</span>
                                </td>
                                <td className="py-2 px-2 text-center text-xs">{r.ticketMedio > 0 ? formatCurrencyShort(r.ticketMedio) : '—'}</td>
                                <td className="py-2 px-2 text-center">
                                  <span className={`text-xs ${r.tempoMedio > 30 ? 'text-destructive' : 'text-muted-foreground'}`}>{r.tempoMedio.toFixed(0)}d</span>
                                </td>
                                <td className="py-2 px-2 text-right text-xs font-semibold text-success">{formatCurrencyShort(r.premio)}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─── Tab: Evolução ─── */}
              <TabsContent value="evolucao">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Evolução — Conversão e Receita Acumulada
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-2 font-semibold uppercase">Conversão ao Longo do Tempo</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <ComposedChart data={timeEvolution} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                            <XAxis dataKey="mes" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis yAxisId="left" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} unit="%" />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                            <Bar yAxisId="left" dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Total" opacity={0.7} />
                            <Bar yAxisId="left" dataKey="fechados" fill="hsl(156, 62%, 52%)" radius={[4, 4, 0, 0]} name="Fechados" />
                            <Line yAxisId="right" type="monotone" dataKey="conversao" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 2 }} name="Conversão %" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-2 font-semibold uppercase">Receita Acumulada</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <AreaChart data={timeEvolution} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                            <XAxis dataKey="mes" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }} formatter={(v: number) => formatCurrency(v)} />
                            <Area type="monotone" dataKey="premioAcum" stroke="hsl(156, 62%, 52%)" fill="hsl(156, 62%, 52%)" fillOpacity={0.2} strokeWidth={2} name="Receita Acumulada" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─── Tab: Forecast ─── */}
              <TabsContent value="forecast">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-gradient-to-br from-destructive/10 to-destructive/5 rounded-lg border border-destructive/20 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Pessimista</p>
                      <p className="text-xl font-bold text-destructive">{formatCurrencyShort(forecast.pessimista)}</p>
                      <p className="text-[9px] text-muted-foreground mt-1">Conv. × 0.6</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Provável</p>
                      <p className="text-2xl font-bold text-foreground">{formatCurrencyShort(forecast.provavel)}</p>
                      <p className="text-[9px] text-muted-foreground mt-1">Taxa atual: {kpis.taxaConversao.toFixed(1)}%</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-success/10 to-success/5 rounded-lg border border-success/20 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Otimista</p>
                      <p className="text-xl font-bold text-success">{formatCurrencyShort(forecast.otimista)}</p>
                      <p className="text-[9px] text-muted-foreground mt-1">Conv. × 1.5</p>
                    </div>
                  </div>

                  {/* Forecast details */}
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-warning" />
                        Fechamento Gerencial
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                          <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><FileText className="h-3 w-3" />Pipeline</p>
                          <p className="text-lg font-bold text-primary">{kpis.total}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Em cotação: <span className="font-semibold text-primary">{kpis.emCotacao}</span></p>
                        </div>
                        <div className="p-3 bg-gradient-to-br from-success/10 to-success/5 rounded-lg border border-success/20">
                          <p className="text-[10px] text-muted-foreground mb-1">Resultados</p>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /><span className="text-lg font-bold text-success">{kpis.fechados}</span></div>
                            <div className="flex items-center gap-1"><XCircle className="h-3 w-3 text-destructive" /><span className="text-lg font-bold text-destructive">{kpis.declinados}</span></div>
                          </div>
                        </div>
                        <div className="p-3 bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-lg border border-amber-500/20">
                          <p className="text-[10px] text-muted-foreground mb-1">Financeiro</p>
                          <p className="text-lg font-bold text-success">{formatCurrencyShort(kpis.premioFechado)}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Ticket: <span className="font-semibold">{formatCurrencyShort(kpis.ticketMedio)}</span></p>
                        </div>
                        <div className={`p-3 rounded-lg border ${kpis.tempoMedio > 30 ? 'bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20' : 'bg-gradient-to-br from-muted/50 to-muted/30 border-border'}`}>
                          <p className="text-[10px] text-muted-foreground mb-1">Eficiência</p>
                          <p className="text-lg font-bold text-foreground">{kpis.tempoMedio.toFixed(0)} <span className="text-xs font-normal">dias</span></p>
                          {bottlenecks.length > 0 &&
                            <div className="flex items-center gap-1 mt-0.5"><AlertTriangle className="h-3 w-3 text-warning" /><span className="text-[10px] text-warning">{bottlenecks.length} alerta(s)</span></div>
                          }
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
