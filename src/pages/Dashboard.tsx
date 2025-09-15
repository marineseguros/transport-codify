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
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
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

  // Monthly trend data for charts (last 6 months)
  const monthlyTrendData = useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
      const year = date.getFullYear();
      
      const monthCotacoes = allQuotes.filter(c => {
        const cotacaoDate = new Date(c.data_cotacao);
        return cotacaoDate.getMonth() === date.getMonth() && 
               cotacaoDate.getFullYear() === date.getFullYear();
      });
      
      months.push({
        mes: `${monthName}/${year.toString().slice(-2)}`,
        cotacoes: monthCotacoes.length,
        fechadas: monthCotacoes.filter(c => c.status === 'Negócio fechado').length,
      });
    }
    
    return months;
  }, [allQuotes]);

  // Top seguradoras data
  const seguradoraData = useMemo(() => {
    const seguradoraStats = {};
    
    filteredCotacoes.forEach(cotacao => {
      if (cotacao.seguradora && cotacao.status === 'Negócio fechado') {
        const nome = cotacao.seguradora.nome;
        if (!seguradoraStats[nome]) {
          seguradoraStats[nome] = { nome, premio: 0, count: 0 };
        }
        seguradoraStats[nome].premio += cotacao.valor_premio;
        seguradoraStats[nome].count++;
      }
    });
    
    return Object.values(seguradoraStats)
      .sort((a: any, b: any) => b.premio - a.premio)
      .slice(0, 5);
  }, [filteredCotacoes]);

  // Pie chart data
  const pieChartData = useMemo(() => {
    return distribuicaoStatus.map(item => ({
      name: item.status,
      value: item.count,
      color: item.status === 'Em cotação' ? 'hsl(var(--brand-orange))' :
             item.status === 'Negócio fechado' ? 'hsl(var(--success-alt))' :
             'hsl(var(--destructive))'
    }));
  }, [distribuicaoStatus]);

  // Top produtores
  const topProdutores = useMemo(() => {
    const produtorStats: Record<string, { nome: string; total: number; fechadas: number }> = {};
    
    filteredCotacoes.forEach(cotacao => {
      if (cotacao.produtor_origem) {
        const nome = cotacao.produtor_origem.nome;
        if (!produtorStats[nome]) {
          produtorStats[nome] = { nome, total: 0, fechadas: 0 };
        }
        produtorStats[nome].total++;
        if (cotacao.status === 'Negócio fechado') {
          produtorStats[nome].fechadas++;
        }
      }
    });
    
    return Object.values(produtorStats)
      .sort((a, b) => b.fechadas - a.fechadas);
  }, [filteredCotacoes]);
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Negócio fechado':
        return 'success-alt';
      case 'Em cotação':
        return 'brand-orange';
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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
            <div className="text-2xl font-bold text-brand-orange">{monthlyStats.emCotacao}</div>
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

      {/* Gráficos e Análises Avançadas */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Tendência Mensal */}
        <Card>
          <CardHeader>
            <CardTitle>Tendência de Cotações (Últimos 6 Meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(value, name) => [
                  value,
                  name === 'fechadas' ? 'Fechadas' : name === 'cotacoes' ? 'Total' : name
                ]} />
                <Line type="monotone" dataKey="cotacoes" stroke="hsl(var(--brand-orange))" strokeWidth={2} name="Total" />
                <Line type="monotone" dataKey="fechadas" stroke="hsl(var(--success-alt))" strokeWidth={2} name="Fechadas" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance por Seguradora */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Seguradoras</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={seguradoraData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="nome" type="category" width={100} />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Prêmio Total']} />
                <Bar dataKey="premio" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Insights Adicionais */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Gráfico de Pizza - Status */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {pieChartData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Análise de Produtividade */}
        <Card>
          <CardHeader>
            <CardTitle>Top Produtores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProdutores.slice(0, 5).map((produtor, index) => (
                <div key={produtor.nome} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium">{produtor.nome}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{produtor.fechadas}</div>
                    <div className="text-xs text-muted-foreground">fechadas</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Métricas de Tempo */}
        <Card>
          <CardHeader>
            <CardTitle>Análise Temporal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                <span className="text-sm">Tempo médio fechamento</span>
                <span className="font-bold">{Math.round(monthlyStats.tempoMedioFechamento)} dias</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                <span className="text-sm">Taxa conversão</span>
                <span className="font-bold text-success-alt">
                  {filteredCotacoes.length > 0 ? 
                    ((filteredCotacoes.filter(c => c.status === 'Negócio fechado').length / filteredCotacoes.length) * 100).toFixed(1) 
                    : '0'}%
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                <span className="text-sm">Cotações este mês</span>
                <span className="font-bold text-brand-orange">{monthlyStats.emCotacao + monthlyStats.fechados + monthlyStats.declinados}</span>
              </div>
            </div>
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
            {recentQuotes.length > 0 ? recentQuotes.map(cotacao => <div key={cotacao.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant={getStatusBadgeVariant(cotacao.status)} className="text-xs">
                      {cotacao.status}
                    </Badge>
                    <span className="text-sm font-bold text-quote-value">
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