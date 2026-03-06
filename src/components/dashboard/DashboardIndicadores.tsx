import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChartBig, ExternalLink, Search, ChevronDown, ChevronUp, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

interface DashboardIndicadoresProps {
  produtorFilter?: string[];
}

const SUMMARY_SIZE = 5;

// Map meta types to produto types
const TIPO_META_TO_PRODUTO: Record<string, string[]> = {
  'Coleta': ['Coleta'],
  'Indicação': ['Indicação'],
  'Visita': ['Visita/Video'],
  'Vídeo': ['Visita/Video'],
};

// Types that come from cotacoes
const COTACAO_TYPES = ['Cotação', 'Fechamento'];

export const DashboardIndicadores = ({ produtorFilter }: DashboardIndicadoresProps) => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [cotacoesCount, setCotacoesCount] = useState({ cotacoes: 0, fechamentos: 0 });
  const [metasCotacoes, setMetasCotacoes] = useState({ cotacoes: 0, fechamentos: 0 });
  const [loading, setLoading] = useState(true);
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [searchSegurado, setSearchSegurado] = useState('');
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const currentMonth = new Date();
  const currentYear = currentMonth.getFullYear();
  const currentMonthStr = format(currentMonth, 'yyyy-MM');
  const startCurrent = startOfMonth(currentMonth);
  const endCurrent = endOfMonth(currentMonth);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);

        // Fetch produtos (indicadores)
        const { data: prodData, error: prodError } = await supabase
          .from('produtos')
          .select('*')
          .gte('data_registro', `${currentYear}-01-01`)
          .order('data_registro', { ascending: false });
        if (prodError) throw prodError;

        // Fetch metas with tipo_meta and produtor
        const { data: metasData, error: metasError } = await supabase
          .from('metas')
          .select('*, tipo_meta:tipos_meta(id, descricao), produtor:produtores(id, nome)')
          .gte('mes', `${currentYear}-01-01`)
          .lte('mes', `${currentYear}-12-31`);
        if (metasError) throw metasError;

        // Fetch cotacoes counts for current month (Cotações = all, Fechamentos = closed)
        const { count: cotCount } = await supabase
          .from('cotacoes')
          .select('*', { count: 'exact', head: true })
          .gte('data_cotacao', startCurrent.toISOString())
          .lte('data_cotacao', endCurrent.toISOString());

        const { count: fechCount } = await supabase
          .from('cotacoes')
          .select('*', { count: 'exact', head: true })
          .in('status', ['Negócio fechado', 'Fechamento congênere'])
          .gte('data_fechamento', startCurrent.toISOString())
          .lte('data_fechamento', endCurrent.toISOString());

        // Find metas for Cotação and Fechamento types this month
        const metaCotacao = (metasData || []).filter(m =>
          m.mes === currentMonthStr && m.tipo_meta?.descricao === 'Cotação'
        ).reduce((sum: number, m: Meta) => sum + m.quantidade, 0);

        const metaFechamento = (metasData || []).filter(m =>
          m.mes === currentMonthStr && m.tipo_meta?.descricao === 'Fechamento'
        ).reduce((sum: number, m: Meta) => sum + m.quantidade, 0);

        setProdutos(prodData || []);
        setMetas(metasData || []);
        setCotacoesCount({ cotacoes: cotCount || 0, fechamentos: fechCount || 0 });
        setMetasCotacoes({ cotacoes: metaCotacao, fechamentos: metaFechamento });
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
    if (produtorFilter && produtorFilter.length > 0) {
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

  // KPI data: Metas vs Realizado for current month
  const kpiData = useMemo(() => {
    const currentMonthProdutos = produtos.filter(p => {
      const d = new Date(p.data_registro);
      return d >= startCurrent && d <= endCurrent &&
        (!produtorFilter?.length || produtorFilter.includes(p.consultor));
    });

    const tipoGroups = [
      { label: 'Coleta', produtoTypes: ['Coleta'], icon: '📋' },
      { label: 'Indicação', produtoTypes: ['Indicação'], icon: '🤝' },
      { label: 'Visita', produtoTypes: ['Visita/Video'], subtipo: 'Visita', icon: '🏢' },
      { label: 'Vídeo', produtoTypes: ['Visita/Video'], subtipo: 'Vídeo', icon: '🎥' },
    ];

    return tipoGroups.map(group => {
      const realizado = currentMonthProdutos.filter(p => {
        if (!group.produtoTypes.includes(p.tipo)) return false;
        if (group.subtipo && p.subtipo !== group.subtipo) return false;
        return true;
      }).length;

      // Find meta for this type this month
      const metaForType = metas.filter(m => {
        if (m.mes !== currentMonthStr) return false;
        if (!m.tipo_meta?.descricao) return false;
        if (m.tipo_meta.descricao !== group.label) return false;
        if (produtorFilter?.length && m.produtor) {
          return produtorFilter.includes(m.produtor.nome);
        }
        return true;
      }).reduce((sum, m) => sum + m.quantidade, 0);

      const percentual = metaForType > 0 ? (realizado / metaForType) * 100 : 0;

      return {
        ...group,
        realizado,
        meta: metaForType,
        percentual,
      };
    });
  }, [produtos, metas, produtorFilter, startCurrent, endCurrent, currentMonthStr]);

  // Cotações & Fechamentos KPIs
  const cotacaoKpis = useMemo(() => {
    const cotPct = metasCotacoes.cotacoes > 0
      ? (cotacoesCount.cotacoes / metasCotacoes.cotacoes) * 100 : 0;
    const fechPct = metasCotacoes.fechamentos > 0
      ? (cotacoesCount.fechamentos / metasCotacoes.fechamentos) * 100 : 0;
    return [
      {
        label: 'Cotações',
        icon: '📄',
        realizado: cotacoesCount.cotacoes,
        meta: metasCotacoes.cotacoes,
        percentual: cotPct,
      },
      {
        label: 'Fechamentos',
        icon: '✅',
        realizado: cotacoesCount.fechamentos,
        meta: metasCotacoes.fechamentos,
        percentual: fechPct,
      },
    ];
  }, [cotacoesCount, metasCotacoes]);

  const allKpis = [...kpiData, ...cotacaoKpis];

  // Total summary
  const totalRealizado = allKpis.reduce((s, k) => s + k.realizado, 0);
  const totalMeta = allKpis.reduce((s, k) => s + k.meta, 0);
  const totalPct = totalMeta > 0 ? (totalRealizado / totalMeta) * 100 : 0;

  const getStatusColor = (pct: number) => {
    if (pct >= 100) return 'text-emerald-600 dark:text-emerald-400';
    if (pct >= 80) return 'text-amber-500';
    return 'text-destructive';
  };

  const getStatusBg = (pct: number) => {
    if (pct >= 100) return 'bg-emerald-500/10 border-emerald-500/20';
    if (pct >= 80) return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-destructive/10 border-destructive/20';
  };

  const getTrendIcon = (pct: number) => {
    if (pct >= 100) return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
    if (pct >= 80) return <Minus className="h-3.5 w-3.5 text-amber-500" />;
    return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
  };

  const displayedProdutos = expanded ? filteredProdutos : filteredProdutos.slice(0, SUMMARY_SIZE);

  const getSubtipoDisplay = (produto: Produto) => {
    if (produto.tipo === 'Indicação' && produto.tipo_indicacao) return produto.tipo_indicacao;
    if (produto.tipo === 'Visita/Video' && produto.subtipo) return produto.subtipo;
    return '-';
  };

  const getDetalhesDisplay = (produto: Produto) => {
    if (produto.tipo === 'Indicação' && produto.cliente_indicado) return produto.cliente_indicado;
    if (produto.tipo === 'Visita/Video' && produto.subtipo === 'Visita' && produto.cidade) return produto.cidade;
    if (produto.tipo === 'Visita/Video' && produto.subtipo === 'Vídeo' && produto.data_realizada) {
      return format(new Date(produto.data_realizada), 'dd/MM/yyyy', { locale: ptBR });
    }
    return '-';
  };

  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: ptBR });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChartBig className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Indicadores — Metas vs Realizado</CardTitle>
            <Badge variant="outline" className="text-[10px] font-normal capitalize">
              {monthLabel}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => navigate('/produtos')}
          >
            Ir para Indicadores
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* KPI Cards */}
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* Overall summary */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <Target className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Performance Geral</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{totalRealizado}</span>
                  <span className="text-xs text-muted-foreground">/ {totalMeta} meta</span>
                  {totalMeta > 0 && (
                    <Badge className={`text-[10px] border ${getStatusBg(totalPct)} ${getStatusColor(totalPct)} bg-transparent`}>
                      {totalPct.toFixed(0)}%
                    </Badge>
                  )}
                </div>
              </div>
              {totalMeta > 0 && (
                <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${totalPct >= 100 ? 'bg-emerald-500' : totalPct >= 80 ? 'bg-amber-500' : 'bg-destructive'}`}
                    style={{ width: `${Math.min(totalPct, 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Individual KPIs grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {allKpis.map(kpi => (
                <div
                  key={kpi.label}
                  className={`rounded-lg border p-2.5 space-y-1 ${kpi.meta > 0 ? getStatusBg(kpi.percentual) : 'bg-muted/30'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground">{kpi.label}</span>
                    {kpi.meta > 0 && getTrendIcon(kpi.percentual)}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold">{kpi.realizado}</span>
                    {kpi.meta > 0 && (
                      <span className="text-[10px] text-muted-foreground">/ {kpi.meta}</span>
                    )}
                  </div>
                  {kpi.meta > 0 && (
                    <div className="w-full h-1 rounded-full bg-background/50 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${kpi.percentual >= 100 ? 'bg-emerald-500' : kpi.percentual >= 80 ? 'bg-amber-500' : 'bg-destructive'}`}
                        style={{ width: `${Math.min(kpi.percentual, 100)}%` }}
                      />
                    </div>
                  )}
                  {kpi.meta > 0 && (
                    <p className={`text-[10px] font-semibold ${getStatusColor(kpi.percentual)}`}>
                      {kpi.percentual.toFixed(0)}%
                    </p>
                  )}
                  {kpi.meta === 0 && (
                    <p className="text-[10px] text-muted-foreground">Sem meta</p>
                  )}
                </div>
              ))}
            </div>

            {/* Compact filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Segurado..."
                  value={searchSegurado}
                  onChange={e => setSearchSegurado(e.target.value)}
                  className="h-7 text-xs pl-7 w-[160px]"
                />
              </div>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="h-7 text-xs w-[120px]">
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
              <span className="text-[10px] text-muted-foreground ml-auto">
                {filteredProdutos.length} registro(s)
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Segurado</TableHead>
                    <TableHead className="text-xs">Consultor</TableHead>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Subtipo</TableHead>
                    <TableHead className="text-xs">Detalhes</TableHead>
                    <TableHead className="text-xs max-w-[150px]">Obs.</TableHead>
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
                        <TableCell className="text-xs py-1.5 max-w-[150px] truncate">
                          {produto.observacao || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Ver todos / Recolher */}
            {filteredProdutos.length > SUMMARY_SIZE && (
              <div className="flex justify-center border-t pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? (
                    <>
                      Recolher <ChevronUp className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      Ver todos ({filteredProdutos.length}) <ChevronDown className="h-3 w-3" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
