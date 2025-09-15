import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCotacoesTotais, useProdutores, type Cotacao } from '@/hooks/useSupabaseData';
import { TrendingUp, TrendingDown, DollarSign, FileText, Clock, Target, Plus, Upload, CalendarIcon, Users, Building } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { DateRange } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
const Dashboard = () => {
  const {
    cotacoes: allQuotes,
    loading: loadingCotacoes
  } = useCotacoesTotais();
  const {
    produtores,
    loading: loadingProdutores
  } = useProdutores();
  const loading = loadingCotacoes || loadingProdutores;
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [dateFilter, setDateFilter] = useState<string>('mes_atual');
  const [produtorFilter, setProdutorFilter] = useState<string>('todos');
  const [unidadeFilter, setUnidadeFilter] = useState<string>('todas');
  const handleImportCSV = () => {
    toast.success('Funcionalidade de importar CSV será implementada');
  };

  // Filter cotacoes by date, produtor and unidade
  const filteredCotacoes = useMemo(() => {
    let filtered = allQuotes;

    // Apply produtor filter
    if (produtorFilter !== 'todos') {
      filtered = filtered.filter(cotacao => cotacao.produtor_origem?.nome === produtorFilter);
    }

    // Apply unidade filter (placeholder for now)
    if (unidadeFilter !== 'todas') {
      // TODO: Implement unidade filtering when unidades are available
    }

    // Apply date filter
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    switch (dateFilter) {
      case 'hoje':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '7dias':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30dias':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90dias':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'mes_atual':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'mes_anterior':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'personalizado':
        if (!dateRange?.from) return filtered;
        startDate = dateRange.from;
        endDate = dateRange.to || dateRange.from;
        break;
      default:
        return filtered;
    }
    return filtered.filter(cotacao => {
      const cotacaoDate = new Date(cotacao.data_cotacao);
      return cotacaoDate >= startDate && cotacaoDate <= endDate;
    });
  }, [allQuotes, dateFilter, dateRange, produtorFilter, unidadeFilter]);

  // Calculate monthly stats with comparisons
  const monthlyStats = useMemo(() => {
    const now = new Date();

    // Current month
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Previous month
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const currentMonthCotacoes = filteredCotacoes.filter(c => {
      const date = new Date(c.data_cotacao);
      return date >= currentMonthStart && date <= currentMonthEnd;
    });
    const previousMonthCotacoes = allQuotes.filter(c => {
      const date = new Date(c.data_cotacao);
      return date >= previousMonthStart && date <= previousMonthEnd;
    });

    // Current month stats
    const emCotacao = currentMonthCotacoes.filter(c => c.status === 'Em cotação').length;
    const fechados = currentMonthCotacoes.filter(c => c.status === 'Negócio fechado').length;
    const declinados = currentMonthCotacoes.filter(c => c.status === 'Declinado').length;

    // Previous month stats
    const emCotacaoAnterior = previousMonthCotacoes.filter(c => c.status === 'Em cotação').length;
    const fechadosAnterior = previousMonthCotacoes.filter(c => c.status === 'Negócio fechado').length;
    const declinadosAnterior = previousMonthCotacoes.filter(c => c.status === 'Declinado').length;

    // Calculate differences and percentages
    const calculateComparison = (current: number, previous: number) => {
      const diff = current - previous;
      const percentage = previous > 0 ? diff / previous * 100 : 0;
      return {
        diff,
        percentage
      };
    };
    const emCotacaoComp = calculateComparison(emCotacao, emCotacaoAnterior);
    const fechadosComp = calculateComparison(fechados, fechadosAnterior);
    const declinadosComp = calculateComparison(declinados, declinadosAnterior);

    // KPIs calculations
    const cotacoesFechadas = currentMonthCotacoes.filter(c => c.status === 'Negócio fechado');
    const premioTotal = cotacoesFechadas.reduce((sum, c) => sum + c.valor_premio, 0);
    const ticketMedio = cotacoesFechadas.length > 0 ? premioTotal / cotacoesFechadas.length : 0;

    // Tempo médio de fechamento (dias)
    const temposFechamento = cotacoesFechadas.filter(c => c.data_fechamento && c.data_cotacao).map(c => {
      const inicio = new Date(c.data_cotacao).getTime();
      const fim = new Date(c.data_fechamento!).getTime();
      return Math.round((fim - inicio) / (1000 * 60 * 60 * 24));
    });
    const tempoMedioFechamento = temposFechamento.length > 0 ? temposFechamento.reduce((sum, tempo) => sum + tempo, 0) / temposFechamento.length : 0;
    return {
      emCotacao,
      fechados,
      declinados,
      emCotacaoComp,
      fechadosComp,
      declinadosComp,
      ticketMedio,
      tempoMedioFechamento,
      premioTotal
    };
  }, [filteredCotacoes, allQuotes]);

  // Distribuição por status no período atual
  const distribuicaoStatus = useMemo(() => {
    const validStatuses = ['Em cotação', 'Negócio fechado', 'Declinado'];
    const counts = filteredCotacoes.reduce((acc, cotacao) => {
      if (validStatuses.includes(cotacao.status)) {
        acc[cotacao.status] = (acc[cotacao.status] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    return validStatuses.map(status => ({
      status,
      count: counts[status] || 0,
      percentage: filteredCotacoes.length > 0 ? (counts[status] || 0) / filteredCotacoes.length * 100 : 0
    }));
  }, [filteredCotacoes]);

  // Recent quotes for display (last 10)
  const recentQuotes = useMemo(() => {
    return [...filteredCotacoes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);
  }, [filteredCotacoes]);
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Negócio fechado':
        return 'default';
      case 'Em cotação':
        return 'secondary';
      case 'Declinado':
        return 'destructive';
      default:
        return 'secondary';
    }
  };
  const formatComparison = (diff: number, percentage: number) => {
    const sign = diff > 0 ? '+' : '';
    const icon = diff > 0 ? <TrendingUp className="h-3 w-3" /> : diff < 0 ? <TrendingDown className="h-3 w-3" /> : null;
    const color = diff > 0 ? 'text-success' : diff < 0 ? 'text-destructive' : 'text-muted-foreground';
    return <span className={`text-xs flex items-center gap-1 ${color}`}>
        {icon}
        {sign}{diff} ({sign}{percentage.toFixed(1)}%)
      </span>;
  };
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Análise completa e KPIs de cotações
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleImportCSV} className="gap-2">
            <Upload className="h-4 w-4" />
            Importar CSV
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Cotação
          </Button>
        </div>
      </div>

      {/* Filtros Globais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Filtros Globais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-sm font-medium mb-2 block">Período</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                  <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                  <SelectItem value="90dias">Últimos 90 dias</SelectItem>
                  <SelectItem value="mes_atual">Este mês</SelectItem>
                  <SelectItem value="mes_anterior">Mês passado</SelectItem>
                  <SelectItem value="personalizado">Período personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Produtor</label>
              <Select value={produtorFilter} onValueChange={setProdutorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os produtores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os produtores</SelectItem>
                  {produtores.map(produtor => <SelectItem key={produtor.id} value={produtor.nome}>
                      {produtor.nome}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Unidade</label>
              <Select value={unidadeFilter} onValueChange={setUnidadeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as unidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as unidades</SelectItem>
                  {/* TODO: Add unidades when available */}
                </SelectContent>
              </Select>
            </div>

            {dateFilter === 'personalizado' && <div className="col-span-full">
                <label className="text-sm font-medium mb-2 block">Data personalizada</label>
                <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
              </div>}

            <Button variant="outline" onClick={() => {
            setDateFilter('mes_atual');
            setProdutorFilter('todos');
            setUnidadeFilter('todas');
            setDateRange(undefined);
          }} className="col-span-full md:col-span-1">
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Mensais com Comparativos */}
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Cotação</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary bg-[D28F0E]">{monthlyStats.emCotacao}</div>
            {formatComparison(monthlyStats.emCotacaoComp.diff, monthlyStats.emCotacaoComp.percentage)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Negócio Fechado</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{monthlyStats.fechados}</div>
            {formatComparison(monthlyStats.fechadosComp.diff, monthlyStats.fechadosComp.percentage)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Declinado</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{monthlyStats.declinados}</div>
            {formatComparison(monthlyStats.declinadosComp.diff, monthlyStats.declinadosComp.percentage)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(monthlyStats.ticketMedio)}</div>
            <p className="text-xs text-muted-foreground">Média mensal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(monthlyStats.tempoMedioFechamento)} dias</div>
            <p className="text-xs text-muted-foreground">Fechamento</p>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por Status */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Status (Período Atual)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {distribuicaoStatus.map(({
            status,
            count,
            percentage
          }) => <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={getStatusBadgeVariant(status)}>
                    {status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {count} cotações
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-secondary rounded-full h-2">
                    <div className="bg-primary rounded-full h-2" style={{
                  width: `${percentage}%`
                }} />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </div>)}
          </div>
        </CardContent>
      </Card>

      {/* Cotações Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Cotações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentQuotes.length > 0 ? recentQuotes.map(cotacao => <div key={cotacao.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant={getStatusBadgeVariant(cotacao.status)} className="text-xs">
                      {cotacao.status}
                    </Badge>
                    <span className="text-sm font-bold text-primary">
                      {formatCurrency(cotacao.valor_premio)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{cotacao.segurado}</p>
                    <p className="text-xs text-muted-foreground">
                      {cotacao.seguradora?.nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cotacao.ramo?.descricao} • {cotacao.tipo}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Produtor: {cotacao.produtor_origem?.nome}
                    </p>
                  </div>
                </div>) : <div className="text-center py-8 col-span-full">
                <p className="text-sm text-muted-foreground">Nenhuma cotação recente encontrada.</p>
              </div>}
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default Dashboard;