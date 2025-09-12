import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCotacoesRecentes, useCotacoesTotais, type Cotacao } from '@/hooks/useSupabaseData';
import { KPI } from "@/types";
import { 
  TrendingUp, TrendingDown, DollarSign, FileText, 
  Clock, Target, Plus, Upload
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { DateRange } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";

const Dashboard = () => {
  const { cotacoes: recentQuotes, loading: loadingRecentes } = useCotacoesRecentes(10);
  const { cotacoes: allQuotes, loading: loadingTodas } = useCotacoesTotais();
  
  const loading = loadingRecentes || loadingTodas;
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [dateFilter, setDateFilter] = useState<string>('todos');
  
  const handleImportCSV = () => {
    toast.success('Funcionalidade de importar CSV será implementada');
  };

  // Filter cotacoes by date
  const filteredCotacoes = useMemo(() => {
    if (dateFilter === 'todos') return allQuotes;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let startDate: Date;
    let endDate: Date = now;
    
    switch (dateFilter) {
      case 'hoje':
        startDate = today;
        break;
      case '7dias':
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30dias':
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90dias':
        startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'personalizado':
        if (!dateRange?.from) return allQuotes;
        startDate = dateRange.from;
        endDate = dateRange.to || dateRange.from;
        break;
      default:
        return allQuotes;
    }
    
    return allQuotes.filter(cotacao => {
      const cotacaoDate = new Date(cotacao.data_cotacao);
      return cotacaoDate >= startDate && cotacaoDate <= endDate;
    });
  }, [allQuotes, dateFilter, dateRange]);

  // Calculate stats from all cotações
  const stats = useMemo(() => {
    const total = allQuotes.length;
    const emAnalise = allQuotes.filter(c => c.status === 'Em análise').length;
    const fechados = allQuotes.filter(c => c.status === 'Negócio fechado').length;
    const valorTotal = allQuotes
      .filter(c => c.status === 'Negócio fechado')
      .reduce((sum, c) => sum + c.valor_premio, 0);
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const thisMonthCotacoes = allQuotes.filter(c => 
      new Date(c.data_cotacao) >= thisMonth
    );
    
    const mesAtual = thisMonthCotacoes.length;
    const valorMes = thisMonthCotacoes
      .filter(c => c.status === 'Negócio fechado')
      .reduce((sum, c) => sum + c.valor_premio, 0);
    
    return { total, emAnalise, fechados, valorTotal, mesAtual, valorMes };
  }, [allQuotes]);

  // Chart data based on all cotações
  const chartData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return {
        month: date.toLocaleDateString('pt-BR', { month: 'short' }),
        year: date.getFullYear(),
        monthIndex: date.getMonth()
      };
    }).reverse();

    return last6Months.map(({ month, year, monthIndex }) => {
      const monthCotacoes = allQuotes.filter(c => {
        const cotacaoDate = new Date(c.data_cotacao);
        return cotacaoDate.getMonth() === monthIndex && cotacaoDate.getFullYear() === year;
      });
      
      const fechados = monthCotacoes.filter(c => c.status === 'Negócio fechado').length;
      const valor = monthCotacoes
        .filter(c => c.status === 'Negócio fechado')
        .reduce((sum, c) => sum + c.valor_premio, 0);
      
      return {
        month,
        cotacoes: monthCotacoes.length,
        fechados,
        valor
      };
    });
  }, [allQuotes]);
  
  // Calcular KPIs
  const kpis = useMemo(() => {
    const totalCotacoes = filteredCotacoes.length;
    const emAndamento = filteredCotacoes.filter(c => c.status === 'Em cotação').length;
    const negocioFechado = filteredCotacoes.filter(c => c.status === 'Negócio fechado').length;
    const declinado = filteredCotacoes.filter(c => c.status === 'Declinado').length;
    
    const cotacoesFechadas = filteredCotacoes.filter(c => c.status === 'Negócio fechado');
    const premioTotal = cotacoesFechadas.reduce((sum, c) => sum + c.valor_premio, 0);
    const ticketMedio = cotacoesFechadas.length > 0 ? premioTotal / cotacoesFechadas.length : 0;
    
    // Tempo médio de fechamento (dias)
    const temposFechamento = cotacoesFechadas
      .filter(c => c.data_fechamento && c.data_cotacao)
      .map(c => {
        const inicio = new Date(c.data_cotacao).getTime();
        const fim = new Date(c.data_fechamento!).getTime();
        return Math.round((fim - inicio) / (1000 * 60 * 60 * 24));
      });
    
    const tempoMedioFechamento = temposFechamento.length > 0 
      ? temposFechamento.reduce((sum, tempo) => sum + tempo, 0) / temposFechamento.length
      : 0;

    return {
      totalCotacoes,
      emAndamento,
      negocioFechado,
      declinado,
      ticketMedio,
      tempoMedioFechamento
    };
  }, [filteredCotacoes]);

  // Distribuição por status
  const distribuicaoStatus = useMemo(() => {
    const counts = filteredCotacoes.reduce((acc, cotacao) => {
      acc[cotacao.status] = (acc[cotacao.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(counts).map(([status, count]) => ({
      status,
      count,
      percentage: filteredCotacoes.length > 0 ? (count / filteredCotacoes.length) * 100 : 0
    }));
  }, [filteredCotacoes]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Negócio fechado': return 'default';
      case 'Em cotação': return 'secondary';
      case 'Declinado': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do desempenho de cotações de transportes
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

      {/* Filtros de Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Filtros de Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-48">
              <label className="text-sm font-medium mb-2 block">Período</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os períodos</SelectItem>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                  <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                  <SelectItem value="90dias">Últimos 90 dias</SelectItem>
                  <SelectItem value="personalizado">Período personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateFilter === 'personalizado' && (
              <div className="flex-1 min-w-80">
                <label className="text-sm font-medium mb-2 block">Data personalizada</label>
                <DatePickerWithRange
                  date={dateRange}
                  onDateChange={setDateRange}
                />
              </div>
            )}

            <Button 
              variant="outline" 
              onClick={() => {
                setDateFilter('todos');
                setDateRange(undefined);
              }}
            >
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Distribuição por Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Distribuição por Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {distribuicaoStatus.map(({ status, count, percentage }) => (
              <div key={status} className="flex items-center justify-between">
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
                    <div 
                      className="bg-primary rounded-full h-2"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalCotacoes}</div>
            <p className="text-xs text-muted-foreground">Cotações</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.emAndamento}</div>
            <p className="text-xs text-muted-foreground">Em cotação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fechados</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.negocioFechado}</div>
            <p className="text-xs text-success flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Negócios
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Declinados</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.declinado}</div>
            <p className="text-xs text-destructive">Perdidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.ticketMedio)}</div>
            <p className="text-xs text-muted-foreground">Negócios fechados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(kpis.tempoMedioFechamento)} dias</div>
            <p className="text-xs text-muted-foreground">Para fechamento</p>
          </CardContent>
        </Card>
      </div>

      {/* Cotações Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Cotações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentQuotes.length > 0 ? (
              recentQuotes.map((cotacao) => (
                <div key={cotacao.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
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
                </div>
              ))
            ) : (
              <div className="text-center py-8 col-span-full">
                <p className="text-sm text-muted-foreground">Nenhuma cotação recente encontrada.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;