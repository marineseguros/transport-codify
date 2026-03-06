import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChartBig, ExternalLink, Search, ChevronDown, ChevronUp, Target, Users, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/lib/logger';

interface Produto {
  id: string;
  segurado: string;
  consultor: string;
  data_registro: string;
  tipo: string;
  observacao: string | null;
  tipo_indicacao?: string | null;
  cliente_indicado?: string | null;
  subtipo?: string | null;
  cidade?: string | null;
  data_realizada?: string | null;
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

interface Produtor {
  id: string;
  nome: string;
}

interface DashboardIndicadoresProps {
  produtorFilter?: string[];
}

const SUMMARY_SIZE = 5;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const DashboardIndicadores = ({ produtorFilter }: DashboardIndicadoresProps) => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [produtores, setProdutores] = useState<Produtor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [searchSegurado, setSearchSegurado] = useState('');
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const normalizeLabel = (value?: string | null) =>
    (value || '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();

  const isSubtipo = (subtipo: string | null | undefined, expected: 'visita' | 'video') =>
    normalizeLabel(subtipo) === expected;

  const isMetaType = (descricao: string | undefined, target: 'coleta' | 'indicacao' | 'visita' | 'video' | 'cotacao' | 'fechamento') => {
    const normalized = normalizeLabel(descricao);
    if (target === 'coleta') return normalized === 'coleta';
    if (target === 'indicacao') return normalized === 'indicacao';
    if (target === 'visita') return normalized === 'visita';
    if (target === 'video') return normalized === 'video';
    if (target === 'cotacao') return normalized === 'cotacao';
    return normalized === 'fechamento';
  };

  const analysisDate = useMemo(() => {
    const produtoTimestamps: number[] = [];

    produtos.forEach(p => {
      const t = new Date(p.data_registro).getTime();
      if (!Number.isNaN(t)) produtoTimestamps.push(t);
    });

    if (produtoTimestamps.length) {
      return new Date(Math.max(...produtoTimestamps));
    }

    const metasTimestamps: number[] = [];
    metas.forEach(m => {
      const t = new Date(m.mes).getTime();
      if (!Number.isNaN(t)) metasTimestamps.push(t);
    });

    if (metasTimestamps.length) {
      return new Date(Math.max(...metasTimestamps));
    }

    const fallbackTimestamps: number[] = [];
    cotacoes.forEach(c => {
      const tCotacao = new Date(c.data_cotacao).getTime();
      if (!Number.isNaN(tCotacao)) fallbackTimestamps.push(tCotacao);
      if (c.data_fechamento) {
        const tFechamento = new Date(c.data_fechamento).getTime();
        if (!Number.isNaN(tFechamento)) fallbackTimestamps.push(tFechamento);
      }
    });

    return fallbackTimestamps.length ? new Date(Math.max(...fallbackTimestamps)) : new Date();
  }, [produtos, metas, cotacoes]);

  const currentMonthStr = format(analysisDate, 'yyyy-MM');
  const startCurrent = startOfMonth(analysisDate);
  const endCurrent = endOfMonth(analysisDate);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);

        const [prodRes, metasRes, cotRes, produtoresRes] = await Promise.all([
          supabase.from('produtos').select('*').order('data_registro', { ascending: false }),
          supabase.from('metas').select('*, tipo_meta:tipos_meta(id, descricao), produtor:produtores(id, nome)').order('mes', { ascending: false }),
          supabase.from('cotacoes').select('id, status, data_cotacao, data_fechamento, valor_premio, produtor_origem_id, produtor_cotador_id').order('data_cotacao', { ascending: false }),
          supabase.from('produtores').select('id, nome').eq('ativo', true).order('ordem'),
        ]);

        if (prodRes.error) throw prodRes.error;
        if (metasRes.error) throw metasRes.error;
        if (cotRes.error) throw cotRes.error;
        if (produtoresRes.error) throw produtoresRes.error;

        setProdutos(prodRes.data || []);
        setMetas(metasRes.data || []);
        setCotacoes(cotRes.data || []);
        setProdutores(produtoresRes.data || []);
      } catch (error: any) {
        logger.error('Error fetching indicadores data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Filter produtos for table display
  const filteredProdutos = useMemo(() => {
    let filtered = produtos;
    if (produtorFilter?.length) {
      filtered = filtered.filter(p => produtorFilter.includes(p.consultor));
    }
    if (filterTipo !== 'todos') {
      filtered = filtered.filter(p => p.tipo === filterTipo);
    }
    if (searchSegurado) {
      filtered = filtered.filter(p =>
        p.segurado.toLowerCase().includes(searchSegurado.toLowerCase())
      );
    }
    return filtered;
  }, [produtos, produtorFilter, filterTipo, searchSegurado]);

  // Current month produtos
  const currentMonthProdutos = useMemo(() => {
    return produtos.filter(p => {
      const d = new Date(p.data_registro);
      return d >= startCurrent && d <= endCurrent;
    });
  }, [produtos, startCurrent, endCurrent]);

  // Current month cotacoes
  const currentMonthCotacoes = useMemo(() => {
    return cotacoes.filter(c => {
      const d = new Date(c.data_cotacao);
      return d >= startCurrent && d <= endCurrent;
    });
  }, [cotacoes, startCurrent, endCurrent]);

  const currentMonthFechamentos = useMemo(() => {
    return cotacoes.filter(c => {
      if (!c.data_fechamento) return false;
      const d = new Date(c.data_fechamento);
      return d >= startCurrent && d <= endCurrent &&
        ['Negócio fechado', 'Fechamento congênere'].includes(c.status);
    });
  }, [cotacoes, startCurrent, endCurrent]);

  // Header KPIs (consolidated totals)
  const headerKpis = useMemo(() => {
    const filteredProds = produtorFilter?.length
      ? currentMonthProdutos.filter(p => produtorFilter.includes(p.consultor))
      : currentMonthProdutos;

    const coleta = filteredProds.filter(p => p.tipo === 'Coleta').length;
    const indicacao = filteredProds.filter(p => p.tipo === 'Indicação').length;
    const visita = filteredProds.filter(p => p.tipo === 'Visita/Video' && isSubtipo(p.subtipo, 'visita')).length;
    const video = filteredProds.filter(p => p.tipo === 'Visita/Video' && isSubtipo(p.subtipo, 'video')).length;
    const cotacoesCount = currentMonthCotacoes.length;
    const fechamentosCount = currentMonthFechamentos.length;
    const premioFechado = currentMonthFechamentos.reduce((s, c) => s + (c.valor_premio || 0), 0);

    // Metas totals for current month
    const getMetaTotal = (target: 'coleta' | 'indicacao' | 'visita' | 'video' | 'cotacao' | 'fechamento') =>
      metas.filter(m => m.mes.startsWith(currentMonthStr) && isMetaType(m.tipo_meta?.descricao, target) &&
        (!produtorFilter?.length || (m.produtor && produtorFilter.includes(m.produtor.nome)))
      ).reduce((s, m) => s + m.quantidade, 0);

    return {
      coleta, indicacao, visita, video, cotacoesCount, fechamentosCount, premioFechado,
      metaColeta: getMetaTotal('coleta'),
      metaIndicacao: getMetaTotal('indicacao'),
      metaVisita: getMetaTotal('visita'),
      metaVideo: getMetaTotal('video'),
      metaCotacao: getMetaTotal('cotacao'),
      metaFechamento: getMetaTotal('fechamento'),
    };
  }, [currentMonthProdutos, currentMonthCotacoes, currentMonthFechamentos, metas, produtorFilter, currentMonthStr]);

  // Producer ranking data
  const producerRanking = useMemo(() => {
    const relevantProdutores = produtorFilter?.length
      ? produtores.filter(p => produtorFilter.includes(p.nome))
      : produtores;

    return relevantProdutores.map(prod => {
      const prods = currentMonthProdutos.filter(p => p.consultor === prod.nome);
      const coleta = prods.filter(p => p.tipo === 'Coleta').length;
      const indicacao = prods.filter(p => p.tipo === 'Indicação').length;
      const visita = prods.filter(p => p.tipo === 'Visita/Video' && isSubtipo(p.subtipo, 'visita')).length;
      const video = prods.filter(p => p.tipo === 'Visita/Video' && isSubtipo(p.subtipo, 'video')).length;
      const totalProdutos = coleta + indicacao + visita + video;

      // Cotacoes where this produtor is cotador
      const cotProd = currentMonthCotacoes.filter(c => c.produtor_cotador_id === prod.id).length;
      // Fechamentos where this produtor is origem
      const fechProd = currentMonthFechamentos.filter(c => c.produtor_origem_id === prod.id);
      const fechCount = fechProd.length;
      const premioFechado = fechProd.reduce((s, c) => s + (c.valor_premio || 0), 0);

      // Meta totals for this produtor
      const getMetaProd = (target: 'coleta' | 'indicacao' | 'visita' | 'video') =>
        metas.filter(m => m.mes.startsWith(currentMonthStr) && isMetaType(m.tipo_meta?.descricao, target) && m.produtor?.nome === prod.nome)
          .reduce((s, m) => s + m.quantidade, 0);

      const totalMeta = getMetaProd('coleta') + getMetaProd('indicacao') + getMetaProd('visita') + getMetaProd('video');
      const pctAtingimento = totalMeta > 0 ? (totalProdutos / totalMeta) * 100 : 0;

      return {
        id: prod.id,
        nome: prod.nome,
        coleta, indicacao, visita, video,
        totalProdutos,
        cotacoes: cotProd,
        fechamentos: fechCount,
        premioFechado,
        totalMeta,
        pctAtingimento,
      };
    })
      .filter(p => p.totalProdutos > 0 || p.cotacoes > 0 || p.fechamentos > 0)
      .sort((a, b) => b.totalProdutos - a.totalProdutos || b.fechamentos - a.fechamentos);
  }, [produtores, currentMonthProdutos, currentMonthCotacoes, currentMonthFechamentos, metas, produtorFilter, currentMonthStr]);

  // Consolidated forecast
  const consolidado = useMemo(() => {
    const totalRealizadoProdutos = headerKpis.coleta + headerKpis.indicacao + headerKpis.visita + headerKpis.video;
    const totalMetaProdutos = headerKpis.metaColeta + headerKpis.metaIndicacao + headerKpis.metaVisita + headerKpis.metaVideo;
    const pctGeral = totalMetaProdutos > 0 ? (totalRealizadoProdutos / totalMetaProdutos) * 100 : 0;
    const avgConversion = headerKpis.cotacoesCount > 0 ? (headerKpis.fechamentosCount / headerKpis.cotacoesCount) * 100 : 0;

    return {
      totalRealizadoProdutos,
      totalMetaProdutos,
      pctGeral,
      premioFechado: headerKpis.premioFechado,
      avgConversion,
      cotacoesCount: headerKpis.cotacoesCount,
      fechamentosCount: headerKpis.fechamentosCount,
    };
  }, [headerKpis]);

  const getStatusColor = (pct: number) => {
    if (pct >= 100) return 'text-emerald-600 dark:text-emerald-400';
    if (pct >= 80) return 'text-amber-500';
    return 'text-destructive';
  };

  const getPctBadgeBg = (pct: number) => {
    if (pct >= 100) return 'bg-emerald-500 text-white';
    if (pct >= 80) return 'bg-amber-500 text-white';
    if (pct > 0) return 'bg-destructive text-white';
    return 'bg-muted text-muted-foreground';
  };

  const displayedProdutos = expanded ? filteredProdutos : filteredProdutos.slice(0, SUMMARY_SIZE);

  const getSubtipoDisplay = (produto: Produto) => {
    if (produto.tipo === 'Indicação' && produto.tipo_indicacao) return produto.tipo_indicacao;
    if (produto.tipo === 'Visita/Video' && produto.subtipo) return produto.subtipo;
    return '-';
  };

  const getDetalhesDisplay = (produto: Produto) => {
    if (produto.tipo === 'Indicação' && produto.cliente_indicado) return produto.cliente_indicado;
    if (produto.tipo === 'Visita/Video' && isSubtipo(produto.subtipo, 'visita') && produto.cidade) return produto.cidade;
    if (produto.tipo === 'Visita/Video' && isSubtipo(produto.subtipo, 'video') && produto.data_realizada) {
      return format(new Date(produto.data_realizada), 'dd/MM/yyyy', { locale: ptBR });
    }
    return '-';
  };

  const monthLabel = format(analysisDate, 'MMMM yyyy', { locale: ptBR });

  const kpiItems = [
    { label: 'Coleta', realizado: headerKpis.coleta, meta: headerKpis.metaColeta },
    { label: 'Indicação', realizado: headerKpis.indicacao, meta: headerKpis.metaIndicacao },
    { label: 'Visita', realizado: headerKpis.visita, meta: headerKpis.metaVisita },
    { label: 'Video', realizado: headerKpis.video, meta: headerKpis.metaVideo },
    { label: 'Cotação', realizado: headerKpis.cotacoesCount, meta: headerKpis.metaCotacao },
    { label: 'Fechamento', realizado: headerKpis.fechamentosCount, meta: headerKpis.metaFechamento },
  ];

  const chartData = kpiItems.map(item => ({
    categoria: item.label,
    meta: item.meta,
    realizado: item.realizado,
  }));

  const totalMetaPainel = chartData.reduce((sum, item) => sum + item.meta, 0);
  const totalRealizadoPainel = chartData.reduce((sum, item) => sum + item.realizado, 0);
  const pctPainel = totalMetaPainel > 0 ? (totalRealizadoPainel / totalMetaPainel) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChartBig className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Ranking de Indicadores — Análise Consolidada</CardTitle>
            <Badge variant="outline" className="text-[10px] font-normal capitalize">
              {monthLabel}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate('/produtos')}>
            Ir para Indicadores <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
          <Users className="h-3 w-3" />
          Clique nos números para detalhamento por tipo
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* Meta x Realizado (estilo analítico) */}
            <div className="rounded-xl border bg-gradient-to-br from-card via-card to-muted/40 p-3 md:p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Meta x Realizado
                </h4>
                <span className={`text-xs font-semibold ${getStatusColor(pctPainel)}`}>
                  Atingimento: {pctPainel.toFixed(1)}%
                </span>
              </div>

              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 12, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />
                    <XAxis dataKey="categoria" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number, name) => [value, name === 'meta' ? 'Meta' : 'Realizado']}
                    />
                    <Legend formatter={(value) => (value === 'meta' ? 'Meta' : 'Realizado')} />
                    <Bar dataKey="meta" name="meta" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="realizado" name="realizado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-2 border-t pt-3">
                <div className="text-center">
                  <p className="text-2xl font-bold">{totalMetaPainel}</p>
                  <p className="text-[10px] text-muted-foreground">Total Meta</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{totalRealizadoPainel}</p>
                  <p className="text-[10px] text-muted-foreground">Total Realizado</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${getStatusColor(pctPainel)}`}>{pctPainel.toFixed(1)}%</p>
                  <p className="text-[10px] text-muted-foreground">% Atingido</p>
                </div>
              </div>
            </div>

            {/* Producer Ranking Table */}
            {producerRanking.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px] w-8">#</TableHead>
                      <TableHead className="text-[10px]">Produtor</TableHead>
                      <TableHead className="text-[10px] text-center">Coleta</TableHead>
                      <TableHead className="text-[10px] text-center">Indicação</TableHead>
                      <TableHead className="text-[10px] text-center">Visita</TableHead>
                      <TableHead className="text-[10px] text-center">Vídeo</TableHead>
                      <TableHead className="text-[10px] text-center">Cotações</TableHead>
                      <TableHead className="text-[10px] text-center">Fecham.</TableHead>
                      <TableHead className="text-[10px] text-center">Conv.</TableHead>
                      <TableHead className="text-[10px] text-right">Prêmio Fechado</TableHead>
                      <TableHead className="text-[10px] text-center">Meta %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {producerRanking.map((prod, idx) => (
                      <TableRow key={prod.id} className="h-9">
                        <TableCell className="py-1.5">
                          <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold text-white ${
                            idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-700' : 'bg-muted-foreground'
                          }`}>
                            {idx + 1}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-medium py-1.5">{prod.nome}</TableCell>
                        <TableCell className="text-xs text-center py-1.5 font-medium text-primary">{prod.coleta || '-'}</TableCell>
                        <TableCell className="text-xs text-center py-1.5 font-medium text-primary">{prod.indicacao || '-'}</TableCell>
                        <TableCell className="text-xs text-center py-1.5 font-medium text-primary">{prod.visita || '-'}</TableCell>
                        <TableCell className="text-xs text-center py-1.5 font-medium text-primary">{prod.video || '-'}</TableCell>
                        <TableCell className="text-xs text-center py-1.5 font-medium text-amber-500">{prod.cotacoes || '-'}</TableCell>
                        <TableCell className="text-xs text-center py-1.5 font-bold text-emerald-600 dark:text-emerald-400">{prod.fechamentos || '-'}</TableCell>
                        <TableCell className="text-center py-1.5">
                          {prod.cotacoes > 0 ? (
                            <Badge className={`text-[10px] px-1.5 ${getPctBadgeBg(
                              prod.cotacoes > 0 ? (prod.fechamentos / prod.cotacoes) * 100 : 0
                            )}`}>
                              {((prod.fechamentos / prod.cotacoes) * 100).toFixed(0)}%
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-right py-1.5 font-medium">
                          {prod.premioFechado > 0 ? formatCurrency(prod.premioFechado) : (
                            <span className="text-muted-foreground">R$ 0,00</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center py-1.5">
                          {prod.totalMeta > 0 ? (
                            <Badge className={`text-[10px] px-1.5 ${getPctBadgeBg(prod.pctAtingimento)}`}>
                              {prod.pctAtingimento.toFixed(0)}%
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Consolidated Forecast */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-semibold">Previsão e Potencial Consolidado</h4>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Target className="h-3 w-3" /> Atividades Realizadas
                  </p>
                  <p className="text-xl font-bold text-primary">{consolidado.totalRealizadoProdutos}</p>
                  {consolidado.totalMetaProdutos > 0 && (
                    <p className="text-[9px] text-muted-foreground">
                      Meta: {consolidado.totalMetaProdutos} · <span className={getStatusColor(consolidado.pctGeral)}>{consolidado.pctGeral.toFixed(0)}%</span>
                    </p>
                  )}
                </div>
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <p className="text-[10px] text-muted-foreground">Prêmio Fechado</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(consolidado.premioFechado)}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {consolidado.fechamentosCount} negócio(s) fechado(s)
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <p className="text-[10px] text-muted-foreground">Taxa de Conversão</p>
                  <p className={`text-xl font-bold ${consolidado.avgConversion >= 30 ? 'text-emerald-600 dark:text-emerald-400' : consolidado.avgConversion >= 15 ? 'text-amber-500' : 'text-destructive'}`}>
                    {consolidado.avgConversion.toFixed(1)}%
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {consolidado.fechamentosCount} / {consolidado.cotacoesCount} cotações
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <p className="text-[10px] text-muted-foreground">Performance Geral</p>
                  <p className={`text-xl font-bold ${getStatusColor(consolidado.pctGeral)}`}>
                    {consolidado.pctGeral > 0 ? `${consolidado.pctGeral.toFixed(0)}%` : '-'}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    Atividades vs Meta
                  </p>
                </div>
              </div>
            </div>

            {/* Divider + detail table */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs font-semibold text-muted-foreground">Registros Detalhados</h4>
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Segurado..."
                      value={searchSegurado}
                      onChange={e => setSearchSegurado(e.target.value)}
                      className="h-7 text-xs pl-7 w-[150px]"
                    />
                  </div>
                  <Select value={filterTipo} onValueChange={setFilterTipo}>
                    <SelectTrigger className="h-7 text-xs w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="Coleta">Coleta</SelectItem>
                      <SelectItem value="Indicação">Indicação</SelectItem>
                      <SelectItem value="Novos CRM">Novos CRM</SelectItem>
                      <SelectItem value="Visita/Video">Visita/Video</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-[10px] text-muted-foreground">{filteredProdutos.length} registro(s)</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">Segurado</TableHead>
                      <TableHead className="text-[10px]">Consultor</TableHead>
                      <TableHead className="text-[10px]">Data</TableHead>
                      <TableHead className="text-[10px]">Tipo</TableHead>
                      <TableHead className="text-[10px]">Subtipo</TableHead>
                      <TableHead className="text-[10px]">Detalhes</TableHead>
                      <TableHead className="text-[10px] max-w-[120px]">Obs.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedProdutos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4 text-xs text-muted-foreground">
                          Nenhum registro encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayedProdutos.map(produto => (
                        <TableRow key={produto.id} className="h-9">
                          <TableCell className="text-xs font-medium py-1.5">{produto.segurado}</TableCell>
                          <TableCell className="text-xs py-1.5">{produto.consultor}</TableCell>
                          <TableCell className="text-xs py-1.5">
                            {format(new Date(produto.data_registro), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell className="py-1.5">
                            <Badge variant="outline" className="text-[10px] font-normal">{produto.tipo}</Badge>
                          </TableCell>
                          <TableCell className="text-xs py-1.5">{getSubtipoDisplay(produto)}</TableCell>
                          <TableCell className="text-xs py-1.5">{getDetalhesDisplay(produto)}</TableCell>
                          <TableCell className="text-xs py-1.5 max-w-[120px] truncate">{produto.observacao || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {filteredProdutos.length > SUMMARY_SIZE && (
                <div className="flex justify-center pt-1">
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setExpanded(!expanded)}>
                    {expanded ? (
                      <>Recolher <ChevronUp className="h-3 w-3" /></>
                    ) : (
                      <>Ver todos ({filteredProdutos.length}) <ChevronDown className="h-3 w-3" /></>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
