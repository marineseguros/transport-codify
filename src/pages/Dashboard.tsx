import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCotacoesWithRelations, MOCK_COTACOES } from "@/data/mockData";
import { CotacaoTRN, KPI } from "@/types";
import { 
  TrendingUp, TrendingDown, DollarSign, FileText, 
  Clock, Target, Plus, Upload, CheckSquare 
} from "lucide-react";
import { useMemo } from "react";

const Dashboard = () => {
  const cotacoes = getCotacoesWithRelations();
  
  // Calcular KPIs
  const kpis = useMemo((): KPI => {
    const totalCotacoes = cotacoes.length;
    const cotacoesFechadas = cotacoes.filter(c => c.status === 'Negócio fechado');
    const taxaFechamento = totalCotacoes > 0 ? (cotacoesFechadas.length / totalCotacoes) * 100 : 0;
    
    const premioTotal = cotacoesFechadas.reduce((sum, c) => sum + c.valor_premio, 0);
    const ticketMedio = cotacoesFechadas.length > 0 ? premioTotal / cotacoesFechadas.length : 0;
    
    const comissaoTotal = cotacoesFechadas.reduce((sum, c) => sum + c.valor_comissao, 0);
    
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
      taxaFechamento,
      ticketMedio,
      comissaoTotal,
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
          <Button variant="outline" className="gap-2">
            <CheckSquare className="h-4 w-4" />
            Nova Tarefa
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Cotação
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Cotações</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalCotacoes}</div>
            <p className="text-xs text-muted-foreground">
              +12% em relação ao mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Fechamento</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.taxaFechamento.toFixed(1)}%</div>
            <p className="text-xs text-success flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +2.5% vs último período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.ticketMedio)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(kpis.comissaoTotal)} em comissões
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(kpis.tempoMedioFechamento)} dias</div>
            <p className="text-xs text-muted-foreground">
              Para fechamento de negócios
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Distribuição por Status */}
        <Card className="lg:col-span-2">
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

        {/* Atividades Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Cotações Recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cotacoesRecentes.map((cotacao) => (
              <div key={cotacao.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium text-sm">{cotacao.cliente?.segurado}</p>
                  <p className="text-xs text-muted-foreground">
                    {cotacao.seguradora?.nome} • {cotacao.ramo?.descricao}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={getStatusBadgeVariant(cotacao.status)} className="text-xs">
                    {cotacao.status}
                  </Badge>
                  <p className="text-xs font-medium mt-1">
                    {formatCurrency(cotacao.valor_premio)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;