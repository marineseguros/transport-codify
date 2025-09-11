import React, { useState, useMemo } from 'react';
import { Download, BarChart3, TrendingUp, Calendar, Filter, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useCotacoes } from '@/hooks/useSupabaseData';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

const Relatorios = () => {
  const { cotacoes, loading } = useCotacoes();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [produtorFilter, setProdutorFilter] = useState('');
  const [seguradoraFilter, setSeguradoraFilter] = useState('');

  // Get unique values for filters
  const produtores = [...new Set(cotacoes.map(c => c.produtor_origem?.nome).filter(Boolean))];
  const seguradoras = [...new Set(cotacoes.map(c => c.seguradora?.nome).filter(Boolean))];

  // Filter data based on selected criteria
  const filteredCotacoes = useMemo(() => {
    return cotacoes.filter(cotacao => {
      const cotacaoDate = new Date(cotacao.data_cotacao);
      const dateInRange = (!dateRange?.from || cotacaoDate >= dateRange.from) &&
                         (!dateRange?.to || cotacaoDate <= dateRange.to);
      const produtorMatch = produtorFilter === 'todos' || !produtorFilter || cotacao.produtor_origem?.nome === produtorFilter;
      const seguradoraMatch = seguradoraFilter === 'todos' || !seguradoraFilter || cotacao.seguradora?.nome === seguradoraFilter;
      
      return dateInRange && produtorMatch && seguradoraMatch;
    });
  }, [cotacoes, dateRange, produtorFilter, seguradoraFilter]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalCotacoes = filteredCotacoes.length;
    const cotacoesFechadas = filteredCotacoes.filter(c => c.status === 'Negócio fechado');
    const cotacoesDeclinadas = filteredCotacoes.filter(c => c.status === 'Declinado');
    
    const taxaFechamento = totalCotacoes > 0 ? (cotacoesFechadas.length / totalCotacoes) * 100 : 0;
    const totalPremio = cotacoesFechadas.reduce((sum, c) => sum + c.valor_premio, 0);
    const ticketMedio = cotacoesFechadas.length > 0 ? totalPremio / cotacoesFechadas.length : 0;

    return {
      totalCotacoes,
      cotacoesFechadas: cotacoesFechadas.length,
      cotacoesDeclinadas: cotacoesDeclinadas.length,
      taxaFechamento,
      totalPremio,
      ticketMedio
    };
  }, [filteredCotacoes]);

  // Monthly performance data
  const monthlyData = useMemo(() => {
    const monthlyStats = {};
    
    filteredCotacoes.forEach(cotacao => {
      const month = format(new Date(cotacao.data_cotacao), 'MMM/yyyy', { locale: ptBR });
      
      if (!monthlyStats[month]) {
        monthlyStats[month] = {
          month,
          total: 0,
          fechadas: 0,
          declinadas: 0,
          premio: 0
        };
      }
      
      monthlyStats[month].total++;
      
      if (cotacao.status === 'Negócio fechado') {
        monthlyStats[month].fechadas++;
        monthlyStats[month].premio += cotacao.valor_premio;
      } else if (cotacao.status === 'Declinado') {
        monthlyStats[month].declinadas++;
      }
    });
    
    return Object.values(monthlyStats).sort((a: any, b: any) => 
      new Date(a.month).getTime() - new Date(b.month).getTime()
    );
  }, [filteredCotacoes]);

  // Performance by producer
  const produtorData = useMemo(() => {
    const produtorStats = {};
    
    filteredCotacoes.forEach(cotacao => {
      const produtorNome = cotacao.produtor_origem?.nome || 'Sem Produtor';
      
      if (!produtorStats[produtorNome]) {
        produtorStats[produtorNome] = {
          nome: produtorNome,
          total: 0,
          fechadas: 0,
          premio: 0
        };
      }
      
      produtorStats[produtorNome].total++;
      
      if (cotacao.status === 'Negócio fechado') {
        produtorStats[produtorNome].fechadas++;
        produtorStats[produtorNome].premio += cotacao.valor_premio;
      }
    });
    
    return Object.values(produtorStats)
      .map((p: any) => ({
        ...p,
        taxa: p.total > 0 ? (p.fechadas / p.total) * 100 : 0
      }))
      .sort((a: any, b: any) => b.premio - a.premio);
  }, [filteredCotacoes]);

  // Status distribution
  const statusData = useMemo(() => {
    const statusCount = {
      'Em cotação': 0,
      'Negócio fechado': 0,
      'Declinado': 0
    };
    
    filteredCotacoes.forEach(cotacao => {
      statusCount[cotacao.status]++;
    });
    
    return Object.entries(statusCount).map(([name, value]) => ({ name, value }));
  }, [filteredCotacoes]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  const exportToCSV = () => {
    // Implementation would export current filtered data to CSV
    console.log('Exporting to CSV...');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">
            Análise detalhada de performance e métricas de vendas
          </p>
        </div>
        <Button onClick={exportToCSV}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Período</label>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Produtor</label>
              <Select value={produtorFilter} onValueChange={setProdutorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os produtores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os produtores</SelectItem>
                  {produtores.map(nome => (
                    <SelectItem key={nome} value={nome}>{nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Seguradora</label>
              <Select value={seguradoraFilter} onValueChange={setSeguradoraFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as seguradoras" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as seguradoras</SelectItem>
                  {seguradoras.map(nome => (
                    <SelectItem key={nome} value={nome}>{nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cotações</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalCotacoes}</div>
            <div className="text-xs text-muted-foreground">
              {kpis.cotacoesFechadas} fechadas · {kpis.cotacoesDeclinadas} declinadas
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Fechamento</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.taxaFechamento.toFixed(1)}%</div>
            <Badge variant={kpis.taxaFechamento >= 30 ? 'default' : 'secondary'}>
              {kpis.taxaFechamento >= 30 ? 'Boa' : 'Pode melhorar'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prêmio Total</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.totalPremio)}</div>
            <p className="text-xs text-muted-foreground">Total em prêmios</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.ticketMedio)}</div>
            <div className="text-xs text-muted-foreground">
              Ticket médio das cotações fechadas
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value, name) => [
                  name === 'premio' ? formatCurrency(Number(value)) : value,
                  name === 'premio' ? 'Prêmio' : name
                ]} />
                <Bar dataKey="fechadas" fill="#3b82f6" name="Fechadas" />
                <Bar dataKey="declinadas" fill="#ef4444" name="Declinadas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Producer Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Produtor</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={produtorData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="nome" type="category" width={120} />
              <Tooltip formatter={(value, name) => [
                name === 'premio' ? formatCurrency(Number(value)) : 
                name === 'taxa' ? `${Number(value).toFixed(1)}%` : value,
                name === 'premio' ? 'Prêmio' : 
                name === 'taxa' ? 'Taxa' : name
              ]} />
              <Bar dataKey="premio" fill="#3b82f6" name="Prêmio" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Relatorios;