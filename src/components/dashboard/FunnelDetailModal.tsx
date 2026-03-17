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
  Users, TrendingUp, DollarSign, Clock, BarChart3, AlertTriangle,
  Building2, Layers, Search, ArrowRight, CheckCircle2, XCircle, FileText,
  Zap, Flame, Thermometer, Snowflake, ArrowDown, Target, Lightbulb, Timer
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
const ROLE_LABELS: Record<string, string> = { origem: 'Produtor Origem', negociador: 'Produtor Negociador', cotador: 'Produtor Cotador' };
const ROLE_DESCRIPTIONS: Record<string, string> = {
  origem: 'Responsável pela captação e relacionamento comercial',
  negociador: 'Responsável pela negociação com o cliente',
  cotador: 'Responsável operacional pela cotação'
};
const ROLE_COLORS: Record<string, string> = { origem: 'hsl(210, 50%, 25%)', negociador: 'hsl(210, 55%, 45%)', cotador: 'hsl(200, 60%, 55%)' };

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatCurrencyShort = (v: number) => {
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}K`;
  return formatCurrency(v);
};

const isFechado = (s: string) => s === 'Negócio fechado' || s === 'Fechamento congênere';
const isEmAberto = (s: string) => !isFechado(s) && s !== 'Declinado';

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
  const [expandedCotacao, setExpandedCotacao] = useState<string | null>(null);

  useEffect(() => { if (open) { setActiveStage(initialStage); setFilterSeguradora('all'); setFilterProdutor('all'); setFilterRamo('all'); setSearchTerm(''); setExpandedCotacao(null); } }, [initialStage, open]);

  const roleKey = ROLE_KEY_MAP[activeStage as keyof typeof ROLE_KEY_MAP] || 'produtor_origem';

  // Filter options
  const filterOptions = useMemo(() => {
    const seg = new Map<string, string>();
    const prod = new Map<string, string>();
    const ram = new Map<string, string>();
    cotacoes.forEach((c) => {
      if (c.seguradora?.nome) seg.set(c.seguradora_id!, c.seguradora.nome);
      [c.produtor_origem, c.produtor_negociador, c.produtor_cotador].forEach((p) => { if (p?.nome && p?.id) prod.set(p.id, p.nome); });
      if (c.ramo?.descricao) ram.set(c.ramo_id!, c.ramo.ramo_agrupado || c.ramo.descricao);
    });
    return {
      seguradoras: Array.from(seg, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome)),
      produtores: Array.from(prod, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome)),
      ramos: Array.from(ram, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome))
    };
  }, [cotacoes]);

  // Filtered cotacoes
  const stageCotacoes = useMemo(() => {
    let filtered = cotacoes.filter((c) => !!c[roleKey]?.nome);
    if (filterSeguradora !== 'all') filtered = filtered.filter((c) => c.seguradora_id === filterSeguradora);
    if (filterProdutor !== 'all') filtered = filtered.filter((c) =>
      c.produtor_origem_id === filterProdutor || c.produtor_negociador_id === filterProdutor || c.produtor_cotador_id === filterProdutor);
    if (filterRamo !== 'all') filtered = filtered.filter((c) => c.ramo_id === filterRamo);
    if (searchTerm) { const t = searchTerm.toLowerCase(); filtered = filtered.filter((c) => c.segurado.toLowerCase().includes(t) || c.cpf_cnpj.includes(t)); }
    return filtered;
  }, [cotacoes, roleKey, filterSeguradora, filterProdutor, filterRamo, searchTerm]);

  // ─── 1. Stage-to-Stage Conversion ───
  const stageConversions = useMemo(() => {
    const comOrigem = cotacoes.filter(c => !!c.produtor_origem?.nome).length;
    const comNeg = cotacoes.filter(c => !!c.produtor_negociador?.nome).length;
    const comCot = cotacoes.filter(c => !!c.produtor_cotador?.nome).length;
    const fechados = cotacoes.filter(c => isFechado(c.status)).length;
    return [
      { from: 'Origem', to: 'Negociação', fromVal: comOrigem, toVal: comNeg, rate: comOrigem > 0 ? comNeg / comOrigem * 100 : 0 },
      { from: 'Negociação', to: 'Cotação', fromVal: comNeg, toVal: comCot, rate: comNeg > 0 ? comCot / comNeg * 100 : 0 },
      { from: 'Cotação', to: 'Fechamento', fromVal: comCot, toVal: fechados, rate: comCot > 0 ? fechados / comCot * 100 : 0 },
    ];
  }, [cotacoes]);

  // ─── KPIs ───
  const kpis = useMemo(() => {
    const total = stageCotacoes.length;
    const premio = stageCotacoes.reduce((s, c) => s + (c.valor_premio || 0), 0);
    const ticketMedio = total > 0 ? premio / total : 0;
    const fechados = stageCotacoes.filter(c => isFechado(c.status)).length;
    const declinados = stageCotacoes.filter(c => c.status === 'Declinado').length;
    const emCotacao = stageCotacoes.filter(c => isEmAberto(c.status)).length;
    const taxaConversao = total > 0 ? fechados / total * 100 : 0;
    const tempos: number[] = [];
    stageCotacoes.forEach(c => {
      const start = new Date(c.data_cotacao).getTime();
      const end = c.data_fechamento ? new Date(c.data_fechamento).getTime() : Date.now();
      tempos.push((end - start) / (1000 * 60 * 60 * 24));
    });
    const tempoMedio = tempos.length > 0 ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0;
    const tempoMax = tempos.length > 0 ? Math.max(...tempos) : 0;
    const premioFechado = stageCotacoes.filter(c => isFechado(c.status)).reduce((s, c) => s + (c.valor_premio || 0), 0);
    const premioEmAberto = stageCotacoes.filter(c => isEmAberto(c.status)).reduce((s, c) => s + (c.valor_premio || 0), 0);
    return { total, premio, ticketMedio, taxaConversao, tempoMedio, tempoMax, fechados, declinados, emCotacao, premioFechado, premioEmAberto };
  }, [stageCotacoes]);

  // ─── 2. Bottleneck Detection ───
  const bottlenecks = useMemo(() => {
    const issues: { type: 'critical' | 'warning' | 'info'; icon: typeof AlertTriangle; message: string; detail: string }[] = [];
    const worst = stageConversions.reduce((min, s) => s.rate < min.rate ? s : min, stageConversions[0]);
    if (worst && worst.rate < 80) {
      issues.push({ type: worst.rate < 40 ? 'critical' : 'warning', icon: AlertTriangle, message: `Gargalo: ${worst.from} → ${worst.to}`, detail: `Conversão de ${worst.rate.toFixed(0)}% — ${worst.fromVal - worst.toVal} oportunidades perdidas` });
    }
    if (kpis.tempoMedio > 30) {
      issues.push({ type: 'warning', icon: Timer, message: 'Tempo médio elevado', detail: `${kpis.tempoMedio.toFixed(0)} dias em média no pipeline` });
    }
    if (kpis.taxaConversao < 20 && kpis.total > 5) {
      issues.push({ type: 'warning', icon: TrendingUp, message: 'Baixa conversão geral', detail: `Apenas ${kpis.taxaConversao.toFixed(1)}% das cotações converteram` });
    }
    return issues;
  }, [stageConversions, kpis]);

  // ─── 3. Ranking Avançado ───
  const ranking = useMemo(() => {
    const map = new Map<string, { nome: string; total: number; fechados: number; declinados: number; emAberto: number; premio: number; premioAberto: number; tempos: number[] }>();
    stageCotacoes.forEach(c => {
      const nome = c[roleKey]?.nome || '—';
      if (nome === '—') return;
      const e = map.get(nome) || { nome, total: 0, fechados: 0, declinados: 0, emAberto: 0, premio: 0, premioAberto: 0, tempos: [] };
      e.total++;
      const dias = (((c.data_fechamento ? new Date(c.data_fechamento).getTime() : Date.now()) - new Date(c.data_cotacao).getTime()) / (1000 * 60 * 60 * 24));
      e.tempos.push(dias);
      if (isFechado(c.status)) { e.fechados++; e.premio += c.valor_premio || 0; }
      if (c.status === 'Declinado') e.declinados++;
      if (isEmAberto(c.status)) { e.emAberto++; e.premioAberto += c.valor_premio || 0; }
      map.set(nome, e);
    });
    return Array.from(map.values())
      .map(r => ({
        ...r,
        conversao: r.total > 0 ? r.fechados / r.total * 100 : 0,
        ticketMedio: r.fechados > 0 ? r.premio / r.fechados : 0,
        tempoMedio: r.tempos.length > 0 ? r.tempos.reduce((a, b) => a + b, 0) / r.tempos.length : 0,
        receitaPotencial: r.premioAberto * (r.total > 0 ? r.fechados / r.total : 0),
      }))
      .sort((a, b) => b.premio - a.premio);
  }, [stageCotacoes, roleKey]);

  // ─── 4. Seguradora & Ramo Enhanced ───
  const seguradoraAnalysis = useMemo(() => {
    const map = new Map<string, { nome: string; total: number; fechados: number; premio: number; tempos: number[] }>();
    stageCotacoes.forEach(c => {
      const nome = c.seguradora?.nome || 'Sem seguradora';
      const e = map.get(nome) || { nome, total: 0, fechados: 0, premio: 0, tempos: [] };
      e.total++;
      const dias = ((c.data_fechamento ? new Date(c.data_fechamento).getTime() : Date.now()) - new Date(c.data_cotacao).getTime()) / (1000 * 60 * 60 * 24);
      e.tempos.push(dias);
      if (isFechado(c.status)) { e.fechados++; e.premio += c.valor_premio || 0; }
      map.set(nome, e);
    });
    return Array.from(map.values())
      .map(s => ({
        ...s,
        conversao: s.total > 0 ? s.fechados / s.total * 100 : 0,
        tempoMedio: s.tempos.length > 0 ? s.tempos.reduce((a, b) => a + b, 0) / s.tempos.length : 0,
        ticketMedio: s.fechados > 0 ? s.premio / s.fechados : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [stageCotacoes]);

  const ramoAnalysis = useMemo(() => {
    const map = new Map<string, { nome: string; total: number; fechados: number; premio: number; tempos: number[] }>();
    stageCotacoes.forEach(c => {
      const nome = c.ramo?.ramo_agrupado || c.ramo?.descricao || 'Sem ramo';
      const e = map.get(nome) || { nome, total: 0, fechados: 0, premio: 0, tempos: [] };
      e.total++;
      const dias = ((c.data_fechamento ? new Date(c.data_fechamento).getTime() : Date.now()) - new Date(c.data_cotacao).getTime()) / (1000 * 60 * 60 * 24);
      e.tempos.push(dias);
      if (isFechado(c.status)) { e.fechados++; e.premio += c.valor_premio || 0; }
      map.set(nome, e);
    });
    return Array.from(map.values())
      .map(r => ({
        ...r,
        conversao: r.total > 0 ? r.fechados / r.total * 100 : 0,
        tempoMedio: r.tempos.length > 0 ? r.tempos.reduce((a, b) => a + b, 0) / r.tempos.length : 0,
        ticketMedio: r.fechados > 0 ? r.premio / r.fechados : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [stageCotacoes]);

  // ─── 5. Time Evolution with conversion & accumulated ───
  const timeEvolution = useMemo(() => {
    const monthMap = new Map<string, { mes: string; total: number; fechados: number; premio: number; premioAcum: number }>();
    stageCotacoes.forEach(c => {
      const d = new Date(c.data_cotacao);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      const e = monthMap.get(key) || { mes: label, total: 0, fechados: 0, premio: 0, premioAcum: 0 };
      e.total++;
      if (isFechado(c.status)) { e.fechados++; e.premio += c.valor_premio || 0; }
      monthMap.set(key, e);
    });
    const sorted = Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
    let acum = 0;
    sorted.forEach(s => { acum += s.premio; s.premioAcum = acum; });
    return sorted.map(s => ({ ...s, conversao: s.total > 0 ? (s.fechados / s.total * 100) : 0 }));
  }, [stageCotacoes]);

  // ─── 6. Forecast ───
  const forecast = useMemo(() => {
    const emAberto = stageCotacoes.filter(c => isEmAberto(c.status));
    const pipeline = emAberto.reduce((s, c) => s + (c.valor_premio || 0), 0);
    const taxaHist = kpis.total > 0 ? kpis.fechados / kpis.total : 0;
    return {
      pipeline,
      pessimista: pipeline * Math.max(taxaHist * 0.6, 0),
      provavel: pipeline * taxaHist,
      otimista: pipeline * Math.min(taxaHist * 1.4, 1),
    };
  }, [stageCotacoes, kpis]);

  // ─── 8. Tempo Parado ───
  const tempoParado = useMemo(() => {
    return stageCotacoes
      .filter(c => isEmAberto(c.status))
      .map(c => {
        const dias = (Date.now() - new Date(c.data_cotacao).getTime()) / (1000 * 60 * 60 * 24);
        return { id: c.id, numero: c.numero_cotacao, segurado: c.segurado, dias: Math.round(dias), premio: c.valor_premio || 0, status: c.status };
      })
      .sort((a, b) => b.dias - a.dias);
  }, [stageCotacoes]);

  // ─── 9. Opportunity Score ───
  const opportunityScores = useMemo(() => {
    const total = cotacoes.length;
    const fechados = cotacoes.filter(c => isFechado(c.status)).length;
    const taxaHist = total > 0 ? fechados / total : 0;

    return stageCotacoes
      .filter(c => isEmAberto(c.status))
      .map(c => {
        const dias = (Date.now() - new Date(c.data_cotacao).getTime()) / (1000 * 60 * 60 * 24);
        const valor = c.valor_premio || 0;
        let score: 'quente' | 'morno' | 'frio';
        if (dias <= 15 && valor > 0) score = 'quente';
        else if (dias <= 45) score = 'morno';
        else score = 'frio';
        return { id: c.id, numero: c.numero_cotacao, segurado: c.segurado, dias: Math.round(dias), premio: valor, score, status: c.status };
      })
      .sort((a, b) => {
        const scoreOrder = { quente: 0, morno: 1, frio: 2 };
        return scoreOrder[a.score] - scoreOrder[b.score] || b.premio - a.premio;
      });
  }, [stageCotacoes, cotacoes]);

  const scoreCounts = useMemo(() => {
    const c = { quente: 0, morno: 0, frio: 0 };
    opportunityScores.forEach(o => c[o.score]++);
    return c;
  }, [opportunityScores]);

  // ─── 10. Insights Automáticos ───
  const insights = useMemo(() => {
    const list: { icon: typeof Lightbulb; message: string; type: 'success' | 'warning' | 'info' }[] = [];

    // Best insurer
    const bestSeg = seguradoraAnalysis.filter(s => s.total >= 3).sort((a, b) => b.conversao - a.conversao)[0];
    if (bestSeg && bestSeg.conversao > 0) {
      list.push({ icon: Building2, message: `Focar na ${bestSeg.nome} — ${bestSeg.conversao.toFixed(0)}% de conversão`, type: 'success' });
    }

    // Worst producer
    const worstProd = ranking.filter(r => r.total >= 3).sort((a, b) => a.conversao - b.conversao)[0];
    if (worstProd && worstProd.conversao < 30) {
      list.push({ icon: Users, message: `${worstProd.nome} com baixa performance — ${worstProd.conversao.toFixed(0)}% conversão`, type: 'warning' });
    }

    // Stage with most loss
    const worstStage = stageConversions.reduce((min, s) => s.rate < min.rate ? s : min, stageConversions[0]);
    if (worstStage && worstStage.rate < 70) {
      list.push({ icon: AlertTriangle, message: `Etapa ${worstStage.from} → ${worstStage.to} com maior perda (${(100 - worstStage.rate).toFixed(0)}%)`, type: 'warning' });
    }

    // High value stale
    const stale = tempoParado.filter(t => t.dias > 30 && t.premio > 10000);
    if (stale.length > 0) {
      list.push({ icon: Timer, message: `${stale.length} oportunidade(s) de alto valor paradas há mais de 30 dias`, type: 'warning' });
    }

    // Hot opportunities
    if (scoreCounts.quente > 0) {
      const totalQuente = opportunityScores.filter(o => o.score === 'quente').reduce((s, o) => s + o.premio, 0);
      list.push({ icon: Flame, message: `${scoreCounts.quente} oportunidade(s) quente(s) — ${formatCurrencyShort(totalQuente)} potencial`, type: 'success' });
    }

    return list.slice(0, 5);
  }, [seguradoraAnalysis, ranking, stageConversions, tempoParado, scoreCounts, opportunityScores]);

  // ─── 7. Flow data with drill-down ───
  const flowData = useMemo(() => {
    return stageCotacoes.map(c => {
      const dias = ((c.data_fechamento ? new Date(c.data_fechamento).getTime() : Date.now()) - new Date(c.data_cotacao).getTime()) / (1000 * 60 * 60 * 24);
      return {
        id: c.id, numero: c.numero_cotacao, segurado: c.segurado,
        origem: c.produtor_origem?.nome || '—',
        negociador: c.produtor_negociador?.nome || '—',
        cotador: c.produtor_cotador?.nome || '—',
        premio: c.valor_premio || 0, status: c.status,
        dataCotacao: c.data_cotacao, dataFechamento: c.data_fechamento,
        seguradora: c.seguradora?.nome || '—',
        ramo: c.ramo?.ramo_agrupado || c.ramo?.descricao || '—',
        dias: Math.round(dias),
      };
    });
  }, [stageCotacoes]);

  const statusBadge = (status: string) => {
    if (isFechado(status))
      return <Badge className="bg-success/15 text-success border-success/30 text-[10px] gap-1"><CheckCircle2 className="h-3 w-3" />{status === 'Negócio fechado' ? 'Fechado' : 'Congênere'}</Badge>;
    if (status === 'Declinado')
      return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] gap-1"><XCircle className="h-3 w-3" />Declinado</Badge>;
    return <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] gap-1"><Clock className="h-3 w-3" />{status}</Badge>;
  };

  const scoreIcon = (score: 'quente' | 'morno' | 'frio') => {
    if (score === 'quente') return <Flame className="h-3.5 w-3.5 text-destructive" />;
    if (score === 'morno') return <Thermometer className="h-3.5 w-3.5 text-warning" />;
    return <Snowflake className="h-3.5 w-3.5 text-primary" />;
  };

  const scoreBadge = (score: 'quente' | 'morno' | 'frio') => {
    const colors = { quente: 'bg-destructive/15 text-destructive border-destructive/30', morno: 'bg-warning/15 text-warning border-warning/30', frio: 'bg-primary/15 text-primary border-primary/30' };
    const labels = { quente: 'Quente', morno: 'Morno', frio: 'Frio' };
    return <Badge className={`${colors[score]} text-[10px] gap-1`}>{scoreIcon(score)}{labels[score]}</Badge>;
  };

  const tooltipStyle = { backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '11px' };

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
            <button key={key} onClick={() => setActiveStage(key)}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition-all border ${activeStage === key ? 'text-white border-transparent shadow-sm' : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'}`}
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
            <SelectContent>{[<SelectItem key="all" value="all">Todas seguradoras</SelectItem>, ...filterOptions.seguradoras.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)]}</SelectContent>
          </Select>
          <Select value={filterProdutor} onValueChange={setFilterProdutor}>
            <SelectTrigger className="h-8 w-[155px] text-xs"><SelectValue placeholder="Produtor" /></SelectTrigger>
            <SelectContent>{[<SelectItem key="all" value="all">Todos produtores</SelectItem>, ...filterOptions.produtores.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)]}</SelectContent>
          </Select>
          <Select value={filterRamo} onValueChange={setFilterRamo}>
            <SelectTrigger className="h-8 w-[135px] text-xs"><SelectValue placeholder="Ramo" /></SelectTrigger>
            <SelectContent>{[<SelectItem key="all" value="all">Todos ramos</SelectItem>, ...filterOptions.ramos.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)]}</SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-4 pr-2">

            {/* ─── KPIs ─── */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20 text-center">
                <p className="text-xl font-bold text-primary">{kpis.total}</p>
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><FileText className="h-3 w-3" />Cotações</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-success/10 to-success/5 rounded-lg border border-success/20 text-center">
                <p className="text-xl font-bold text-success">{formatCurrencyShort(kpis.premioFechado)}</p>
                <p className="text-[10px] text-muted-foreground">Prêmio Fechado</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-lg border border-amber-500/20 text-center">
                <p className="text-xl font-bold text-brand-orange">{formatCurrencyShort(kpis.premioEmAberto)}</p>
                <p className="text-[10px] text-muted-foreground">Em Aberto</p>
              </div>
              <div className={`p-3 bg-gradient-to-br rounded-lg border text-center ${kpis.taxaConversao >= 30 ? 'from-success/10 to-success/5 border-success/20' : 'from-destructive/10 to-destructive/5 border-destructive/20'}`}>
                <p className={`text-xl font-bold ${kpis.taxaConversao >= 30 ? 'text-success' : 'text-destructive'}`}>{kpis.taxaConversao.toFixed(1)}%</p>
                <p className="text-[10px] text-muted-foreground">Conversão</p>
              </div>
              <div className={`p-3 bg-gradient-to-br rounded-lg border text-center ${kpis.tempoMedio <= 30 ? 'from-muted/30 to-muted/10 border-border' : 'from-destructive/10 to-destructive/5 border-destructive/20'}`}>
                <p className={`text-xl font-bold ${kpis.tempoMedio <= 30 ? 'text-foreground' : 'text-destructive'}`}>{kpis.tempoMedio.toFixed(0)} <span className="text-xs font-normal">dias</span></p>
                <p className="text-[10px] text-muted-foreground">Tempo Médio</p>
              </div>
            </div>

            {/* ─── Stage Conversion Mini Funnel ─── */}
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <ArrowDown className="h-4 w-4 text-primary" />
                  Conversão por Etapa
                </h4>
                <div className="flex items-center gap-2 justify-center flex-wrap">
                  {stageConversions.map((sc, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="text-center min-w-[70px]">
                        <p className="text-sm font-bold text-foreground">{sc.fromVal}</p>
                        <p className="text-[10px] text-muted-foreground">{sc.from}</p>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 min-w-[60px]">
                        <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                        <Badge className={`text-[10px] ${sc.rate >= 70 ? 'bg-success/15 text-success border-success/30' : sc.rate >= 40 ? 'bg-warning/15 text-warning border-warning/30' : 'bg-destructive/15 text-destructive border-destructive/30'}`}>
                          {sc.rate.toFixed(0)}%
                        </Badge>
                        <Progress value={sc.rate} className="w-12 h-1.5" />
                      </div>
                      {i === stageConversions.length - 1 && (
                        <div className="text-center min-w-[70px]">
                          <p className="text-sm font-bold text-success">{sc.toVal}</p>
                          <p className="text-[10px] text-muted-foreground">{sc.to}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ─── Bottlenecks & Insights ─── */}
            {(bottlenecks.length > 0 || insights.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {bottlenecks.length > 0 && (
                  <Card className="border-warning/30">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        Gargalos Identificados
                      </h4>
                      <div className="space-y-2">
                        {bottlenecks.map((b, i) => (
                          <div key={i} className={`flex items-start gap-2 p-2 rounded-md ${b.type === 'critical' ? 'bg-destructive/10 border border-destructive/20' : 'bg-warning/10 border border-warning/20'}`}>
                            <b.icon className={`h-4 w-4 shrink-0 mt-0.5 ${b.type === 'critical' ? 'text-destructive' : 'text-warning'}`} />
                            <div>
                              <p className={`text-xs font-semibold ${b.type === 'critical' ? 'text-destructive' : 'text-warning'}`}>{b.message}</p>
                              <p className="text-[10px] text-muted-foreground">{b.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {insights.length > 0 && (
                  <Card className="border-primary/30">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-primary" />
                        Insights Automáticos
                      </h4>
                      <div className="space-y-2">
                        {insights.map((ins, i) => (
                          <div key={i} className={`flex items-start gap-2 p-2 rounded-md ${ins.type === 'success' ? 'bg-success/10 border border-success/20' : ins.type === 'warning' ? 'bg-warning/10 border border-warning/20' : 'bg-primary/10 border border-primary/20'}`}>
                            <ins.icon className={`h-4 w-4 shrink-0 mt-0.5 ${ins.type === 'success' ? 'text-success' : ins.type === 'warning' ? 'text-warning' : 'text-primary'}`} />
                            <p className="text-xs text-foreground">{ins.message}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <Tabs defaultValue="fluxo" className="space-y-3">
              <TabsList className="grid w-full grid-cols-7 h-9">
                <TabsTrigger value="fluxo" className="text-[11px]">Fluxo</TabsTrigger>
                <TabsTrigger value="ranking" className="text-[11px]">Ranking</TabsTrigger>
                <TabsTrigger value="seguradora" className="text-[11px]">Seguradora</TabsTrigger>
                <TabsTrigger value="ramo" className="text-[11px]">Ramo</TabsTrigger>
                <TabsTrigger value="evolucao" className="text-[11px]">Evolução</TabsTrigger>
                <TabsTrigger value="forecast" className="text-[11px]">Forecast</TabsTrigger>
                <TabsTrigger value="score" className="text-[11px]">Score</TabsTrigger>
              </TabsList>

              {/* ─── Tab: Fluxo Comercial with Drill-Down ─── */}
              <TabsContent value="fluxo" className="space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-primary" />
                      Progressão das Cotações
                      <span className="text-[10px] text-muted-foreground font-normal ml-auto">Clique para drill-down</span>
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">Nº</TableHead>
                          <TableHead>Segurado</TableHead>
                          <TableHead className="text-center"><span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">Origem</span></TableHead>
                          <TableHead className="text-center w-[20px]" />
                          <TableHead className="text-center"><span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-orange/10 text-brand-orange font-semibold">Negociador</span></TableHead>
                          <TableHead className="text-center w-[20px]" />
                          <TableHead className="text-center"><span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success font-semibold">Cotador</span></TableHead>
                          <TableHead className="text-center w-[20px]" />
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-center">Dias</TableHead>
                          <TableHead className="text-right">Prêmio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {flowData.map(row => (
                          <>
                            <TableRow key={row.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setExpandedCotacao(expandedCotacao === row.id ? null : row.id)}>
                              <TableCell className="text-[10px] text-muted-foreground font-mono">{row.numero}</TableCell>
                              <TableCell className="font-medium text-xs max-w-[140px] truncate">{row.segurado}</TableCell>
                              <TableCell className="text-center text-xs font-medium text-primary">{row.origem}</TableCell>
                              <TableCell className="text-center"><ArrowRight className="h-3 w-3 text-muted-foreground/40 mx-auto" /></TableCell>
                              <TableCell className="text-center text-xs font-medium text-brand-orange">{row.negociador}</TableCell>
                              <TableCell className="text-center"><ArrowRight className="h-3 w-3 text-muted-foreground/40 mx-auto" /></TableCell>
                              <TableCell className="text-center text-xs font-medium text-success">{row.cotador}</TableCell>
                              <TableCell className="text-center"><ArrowRight className="h-3 w-3 text-muted-foreground/40 mx-auto" /></TableCell>
                              <TableCell className="text-center">{statusBadge(row.status)}</TableCell>
                              <TableCell className="text-center">
                                <span className={`text-xs font-medium ${row.dias > 30 ? 'text-destructive' : 'text-muted-foreground'}`}>{row.dias}d</span>
                              </TableCell>
                              <TableCell className="text-right text-xs font-semibold">{formatCurrency(row.premio)}</TableCell>
                            </TableRow>
                            {/* Drill-down timeline */}
                            {expandedCotacao === row.id && (
                              <TableRow key={`${row.id}-detail`}>
                                <TableCell colSpan={11} className="bg-muted/20 p-3">
                                  <div className="flex items-start gap-6 text-xs">
                                    <div className="space-y-2">
                                      <p className="font-semibold text-foreground flex items-center gap-1"><Timer className="h-3.5 w-3.5 text-primary" /> Timeline</p>
                                      <div className="flex items-center gap-2">
                                        <div className="flex flex-col items-center">
                                          <div className="w-3 h-3 rounded-full bg-primary" />
                                          <div className="w-0.5 h-8 bg-primary/30" />
                                        </div>
                                        <div>
                                          <p className="font-medium">Data Cotação</p>
                                          <p className="text-muted-foreground">{new Date(row.dataCotacao).toLocaleDateString('pt-BR')}</p>
                                        </div>
                                      </div>
                                      {row.dataFechamento && (
                                        <div className="flex items-center gap-2">
                                          <div className="flex flex-col items-center">
                                            <div className="w-3 h-3 rounded-full bg-success" />
                                          </div>
                                          <div>
                                            <p className="font-medium">Data Fechamento</p>
                                            <p className="text-muted-foreground">{new Date(row.dataFechamento).toLocaleDateString('pt-BR')}</p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    <div className="space-y-1 border-l pl-4">
                                      <p className="text-muted-foreground">Seguradora: <span className="font-medium text-foreground">{row.seguradora}</span></p>
                                      <p className="text-muted-foreground">Ramo: <span className="font-medium text-foreground">{row.ramo}</span></p>
                                      <p className="text-muted-foreground">Tempo total: <span className={`font-bold ${row.dias > 30 ? 'text-destructive' : 'text-foreground'}`}>{row.dias} dias</span></p>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        ))}
                        {flowData.length === 0 && <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-6">Nenhum dado disponível.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Fechamento Gerencial */}
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-warning" />Fechamento Gerencial</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><FileText className="h-3 w-3" />Pipeline</p>
                      <p className="text-xl font-bold text-primary">{kpis.total}</p>
                      <p className="text-[10px] text-muted-foreground">Em aberto: <span className="font-semibold text-primary">{kpis.emCotacao}</span></p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-success/10 to-success/5 rounded-lg border border-success/20">
                      <p className="text-xs text-muted-foreground mb-1">Resultados</p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-success" /><span className="text-lg font-bold text-success">{kpis.fechados}</span></div>
                        <div className="flex items-center gap-1"><XCircle className="h-3.5 w-3.5 text-destructive" /><span className="text-lg font-bold text-destructive">{kpis.declinados}</span></div>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-lg border border-amber-500/20">
                      <p className="text-xs text-muted-foreground mb-1">Financeiro</p>
                      <p className="text-lg font-bold text-success">{formatCurrencyShort(kpis.premioFechado)}</p>
                      <p className="text-[10px] text-muted-foreground">Ticket: <span className="font-semibold">{formatCurrencyShort(kpis.ticketMedio)}</span></p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-destructive/10 to-destructive/5 rounded-lg border border-destructive/20">
                      <p className="text-xs text-muted-foreground mb-1">Eficiência</p>
                      <p className="text-lg font-bold text-foreground">{kpis.tempoMedio.toFixed(0)} <span className="text-xs font-normal">dias</span></p>
                      <p className="text-[10px] text-muted-foreground">Máximo: <span className={`font-semibold ${kpis.tempoMax > 60 ? 'text-destructive' : ''}`}>{kpis.tempoMax.toFixed(0)}d</span></p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ─── Tab: Ranking Avançado ─── */}
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
                        <th className="text-right py-2 px-2 font-medium">Tempo Médio</th>
                        <th className="text-right py-2 px-2 font-medium">Prêmio</th>
                        <th className="text-right py-2 px-2 font-medium text-primary">Receita Pot.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.map((r, i) =>
                        <tr key={r.nome} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-2 px-2">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${i === 0 ? 'bg-amber-500 text-amber-950' : i === 1 ? 'bg-slate-400 text-slate-950' : i === 2 ? 'bg-amber-700 text-amber-100' : 'bg-muted text-muted-foreground'}`}>{i + 1}</span>
                          </td>
                          <td className="py-2 px-2 font-medium">{r.nome}</td>
                          <td className="py-2 px-2 text-center font-semibold text-success">{r.fechados}</td>
                          <td className="py-2 px-2 text-center font-semibold text-brand-orange">{r.emAberto}</td>
                          <td className="py-2 px-2 text-center">
                            <Badge className={`text-xs ${r.conversao >= 50 ? 'bg-success/15 text-success border-success/30' : r.conversao >= 25 ? 'bg-warning/15 text-warning border-warning/30' : 'bg-destructive/15 text-destructive border-destructive/30'}`}>
                              {r.conversao.toFixed(0)}%
                            </Badge>
                          </td>
                          <td className="py-2 px-2 text-right text-xs">{formatCurrencyShort(r.ticketMedio)}</td>
                          <td className="py-2 px-2 text-right">
                            <span className={`text-xs ${r.tempoMedio > 30 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>{r.tempoMedio.toFixed(0)}d</span>
                          </td>
                          <td className="py-2 px-2 text-right font-semibold text-success">{formatCurrencyShort(r.premio)}</td>
                          <td className="py-2 px-2 text-right font-medium text-primary">{formatCurrencyShort(r.receitaPotencial)}</td>
                        </tr>
                      )}
                      {ranking.length === 0 && <tr><td colSpan={9} className="text-center text-muted-foreground py-6">Nenhum dado.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* ─── Tab: Seguradora Enhanced ─── */}
              <TabsContent value="seguradora">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" />Análise por Seguradora</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={seguradoraAnalysis.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                          <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis dataKey="nome" type="category" width={100} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Total" />
                          <Bar dataKey="fechados" fill="hsl(156, 62%, 52%)" radius={[0, 4, 4, 0]} name="Fechados" />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-xs text-muted-foreground">
                              <th className="text-left py-2 px-2 font-medium">Seguradora</th>
                              <th className="text-center py-2 px-2 font-medium">Conv.</th>
                              <th className="text-center py-2 px-2 font-medium">Tempo</th>
                              <th className="text-right py-2 px-2 font-medium">Ticket</th>
                              <th className="text-right py-2 px-2 font-medium">Prêmio</th>
                            </tr>
                          </thead>
                          <tbody>
                            {seguradoraAnalysis.map((s, i) => {
                              const isBest = i === 0 && s.conversao > 0;
                              const isWorst = i === seguradoraAnalysis.length - 1 && seguradoraAnalysis.length > 2;
                              return (
                                <tr key={s.nome} className={`border-b border-border/50 hover:bg-muted/30 ${isBest ? 'bg-success/5' : isWorst ? 'bg-destructive/5' : ''}`}>
                                  <td className="py-2 px-2 font-medium text-xs flex items-center gap-1">
                                    {isBest && <CheckCircle2 className="h-3 w-3 text-success" />}
                                    {isWorst && <AlertTriangle className="h-3 w-3 text-destructive" />}
                                    {s.nome}
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    <Badge className={`text-[10px] ${s.conversao >= 40 ? 'bg-success/15 text-success border-success/30' : 'bg-destructive/15 text-destructive border-destructive/30'}`}>{s.conversao.toFixed(0)}%</Badge>
                                  </td>
                                  <td className="py-2 px-2 text-center text-xs text-muted-foreground">{s.tempoMedio.toFixed(0)}d</td>
                                  <td className="py-2 px-2 text-right text-xs">{formatCurrencyShort(s.ticketMedio)}</td>
                                  <td className="py-2 px-2 text-right text-xs font-semibold text-success">{formatCurrencyShort(s.premio)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─── Tab: Ramo Enhanced ─── */}
              <TabsContent value="ramo">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Layers className="h-4 w-4 text-primary" />Análise por Ramo / Produto</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={ramoAnalysis.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                          <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis dataKey="nome" type="category" width={120} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Bar dataKey="total" fill="hsl(210, 55%, 50%)" radius={[0, 4, 4, 0]} name="Total" />
                          <Bar dataKey="fechados" fill="hsl(156, 62%, 52%)" radius={[0, 4, 4, 0]} name="Fechados" />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-xs text-muted-foreground">
                              <th className="text-left py-2 px-2 font-medium">Ramo</th>
                              <th className="text-center py-2 px-2 font-medium">Conv.</th>
                              <th className="text-center py-2 px-2 font-medium">Tempo</th>
                              <th className="text-right py-2 px-2 font-medium">Ticket</th>
                              <th className="text-right py-2 px-2 font-medium">Prêmio</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ramoAnalysis.map((r, i) => {
                              const isBest = i === 0 && r.conversao > 0;
                              const isWorst = i === ramoAnalysis.length - 1 && ramoAnalysis.length > 2;
                              return (
                                <tr key={r.nome} className={`border-b border-border/50 hover:bg-muted/30 ${isBest ? 'bg-success/5' : isWorst ? 'bg-destructive/5' : ''}`}>
                                  <td className="py-2 px-2 font-medium text-xs">{r.nome}</td>
                                  <td className="py-2 px-2 text-center">
                                    <Badge className={`text-[10px] ${r.conversao >= 40 ? 'bg-success/15 text-success border-success/30' : 'bg-destructive/15 text-destructive border-destructive/30'}`}>{r.conversao.toFixed(0)}%</Badge>
                                  </td>
                                  <td className="py-2 px-2 text-center text-xs text-muted-foreground">{r.tempoMedio.toFixed(0)}d</td>
                                  <td className="py-2 px-2 text-right text-xs">{formatCurrencyShort(r.ticketMedio)}</td>
                                  <td className="py-2 px-2 text-right text-xs font-semibold text-success">{formatCurrencyShort(r.premio)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─── Tab: Evolução (Conversion + Accumulated Revenue) ─── */}
              <TabsContent value="evolucao">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Evolução no Tempo</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-2 font-medium">Conversão ao longo do tempo</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <ComposedChart data={timeEvolution} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                            <XAxis dataKey="mes" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis yAxisId="left" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} unit="%" />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                            <Bar yAxisId="left" dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Total" opacity={0.7} />
                            <Bar yAxisId="left" dataKey="fechados" fill="hsl(156, 62%, 52%)" radius={[4, 4, 0, 0]} name="Fechados" />
                            <Line yAxisId="right" type="monotone" dataKey="conversao" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ r: 3 }} name="Conversão %" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-2 font-medium">Receita acumulada</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <AreaChart data={timeEvolution} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                            <XAxis dataKey="mes" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => formatCurrencyShort(v)} />
                            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                            <Area type="monotone" dataKey="premioAcum" stroke="hsl(156, 62%, 52%)" fill="hsl(156, 62%, 52%)" fillOpacity={0.15} strokeWidth={2} name="Receita Acumulada" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─── Tab: Forecast ─── */}
              <TabsContent value="forecast">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2"><Target className="h-4 w-4 text-primary" />Previsão de Receita</h4>
                    <p className="text-xs text-muted-foreground">Baseado na taxa histórica de conversão de {kpis.taxaConversao.toFixed(1)}% e pipeline de {formatCurrency(forecast.pipeline)}</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-gradient-to-br from-destructive/10 to-destructive/5 rounded-lg border border-destructive/20 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Pessimista</p>
                        <p className="text-xl font-bold text-destructive">{formatCurrencyShort(forecast.pessimista)}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">× {(kpis.taxaConversao * 0.6).toFixed(0)}% conv.</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Provável</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrencyShort(forecast.provavel)}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">× {kpis.taxaConversao.toFixed(0)}% conv.</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-success/10 to-success/5 rounded-lg border border-success/20 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Otimista</p>
                        <p className="text-xl font-bold text-success">{formatCurrencyShort(forecast.otimista)}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">× {Math.min(kpis.taxaConversao * 1.4, 100).toFixed(0)}% conv.</p>
                      </div>
                    </div>

                    {/* Tempo parado summary */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Timer className="h-4 w-4 text-warning" />Tempo Parado — Registros Críticos</h4>
                      {tempoParado.length > 0 ? (
                        <div className="space-y-1.5">
                          {tempoParado.slice(0, 8).map(t => (
                            <div key={t.id} className={`flex items-center justify-between p-2 rounded-md ${t.dias > 60 ? 'bg-destructive/10 border border-destructive/20' : t.dias > 30 ? 'bg-warning/10 border border-warning/20' : 'bg-muted/30 border border-border'}`}>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-muted-foreground">{t.numero}</span>
                                <span className="text-xs font-medium truncate max-w-[180px]">{t.segurado}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground">{formatCurrencyShort(t.premio)}</span>
                                <Badge className={`text-[10px] ${t.dias > 60 ? 'bg-destructive/15 text-destructive border-destructive/30' : t.dias > 30 ? 'bg-warning/15 text-warning border-warning/30' : 'bg-muted text-muted-foreground'}`}>
                                  {t.dias}d parado
                                </Badge>
                              </div>
                            </div>
                          ))}
                          {tempoParado.length > 8 && <p className="text-[10px] text-muted-foreground text-center">+ {tempoParado.length - 8} registros</p>}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-4">Nenhum registro em aberto.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─── Tab: Score de Oportunidade ─── */}
              <TabsContent value="score">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2"><Flame className="h-4 w-4 text-destructive" />Score de Oportunidade</h4>
                    <p className="text-xs text-muted-foreground">Classificação automática baseada em tempo parado, valor e histórico</p>

                    {/* Score summary cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-gradient-to-br from-destructive/10 to-destructive/5 rounded-lg border border-destructive/20 text-center">
                        <Flame className="h-5 w-5 text-destructive mx-auto mb-1" />
                        <p className="text-2xl font-bold text-destructive">{scoreCounts.quente}</p>
                        <p className="text-[10px] text-muted-foreground">Quente</p>
                        <p className="text-[9px] text-muted-foreground">≤15 dias + valor</p>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-warning/10 to-warning/5 rounded-lg border border-warning/20 text-center">
                        <Thermometer className="h-5 w-5 text-warning mx-auto mb-1" />
                        <p className="text-2xl font-bold text-warning">{scoreCounts.morno}</p>
                        <p className="text-[10px] text-muted-foreground">Morno</p>
                        <p className="text-[9px] text-muted-foreground">≤45 dias</p>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20 text-center">
                        <Snowflake className="h-5 w-5 text-primary mx-auto mb-1" />
                        <p className="text-2xl font-bold text-primary">{scoreCounts.frio}</p>
                        <p className="text-[10px] text-muted-foreground">Frio</p>
                        <p className="text-[9px] text-muted-foreground">&gt;45 dias</p>
                      </div>
                    </div>

                    {/* Score list */}
                    <div className="space-y-1.5">
                      {opportunityScores.slice(0, 20).map(o => (
                        <div key={o.id} className="flex items-center justify-between p-2 rounded-md bg-muted/20 border hover:bg-muted/40">
                          <div className="flex items-center gap-2">
                            {scoreBadge(o.score)}
                            <span className="text-[10px] font-mono text-muted-foreground">{o.numero}</span>
                            <span className="text-xs font-medium truncate max-w-[200px]">{o.segurado}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold">{formatCurrencyShort(o.premio)}</span>
                            <span className={`text-[10px] ${o.dias > 30 ? 'text-destructive' : 'text-muted-foreground'}`}>{o.dias}d</span>
                          </div>
                        </div>
                      ))}
                      {opportunityScores.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhuma oportunidade em aberto.</p>}
                      {opportunityScores.length > 20 && <p className="text-[10px] text-muted-foreground text-center">+ {opportunityScores.length - 20} registros</p>}
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
