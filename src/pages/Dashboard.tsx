import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCotacoesWithRelations, MOCK_COTACOES } from "@/data/mockData";
import { CotacaoTRN, KPI } from "@/types";
import { 
  TrendingUp, TrendingDown, DollarSign, FileText, 
  Clock, Target, Plus, Upload
} from "lucide-react";
import { useMemo } from "react";

const Dashboard = () => {
  const cotacoes = getCotacoesWithRelations();
  
  // Calcular KPIs
  const kpis = useMemo(() => {
    const totalCotacoes = cotacoes.length;
    const emAndamento = cotacoes.filter(c => c.status === 'Em cotação').length;
    const negocioFechado = cotacoes.filter(c => c.status === 'Negócio fechado').length;
    const declinado = cotacoes.filter(c => c.status === 'Declinado').length;
    
    const cotacoesFechadas = cotacoes.filter(c => c.status === 'Negócio fechado');
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
  }, [cotacoes]);

  // Dados recentes
  const cotacoesRecentes = useMemo(() => {
    return cotacoes
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [cotacoes]);

  // Distribuição por status
  const distribuicaoStatus = useMemo(() => {
    const counts = cotacoes.reduce((acc, cotacao) => {
      acc[cotacao.status] = (acc[cotacao.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(counts).map(([status, count]) => ({
      status,
      count,
      percentage: (count / cotacoes.length) * 100
    }));
  }, [cotacoes]);

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
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Importar CSV
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Cotação
          </Button>
        </div>
      </div>

      {/* Distribuição por Status - Moved up */}
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
            {cotacoesRecentes.map((cotacao) => (
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
                  <p className="font-medium text-sm">{cotacao.cliente?.segurado}</p>
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
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;