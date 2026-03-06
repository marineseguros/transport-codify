import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, TrendingUp, BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Cotacao } from '@/hooks/useSupabaseData';

interface DashboardIndicadoresProps {
  cotacoes: Cotacao[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2, 142 71% 45%))',
  'hsl(var(--chart-3, 38 92% 50%))',
  'hsl(var(--destructive))',
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const DashboardIndicadores = ({ cotacoes }: DashboardIndicadoresProps) => {
  const kpis = useMemo(() => {
    const total = cotacoes.length;
    const fechadas = cotacoes.filter(c => c.status === 'Negócio fechado' || c.status === 'Fechamento congênere');
    const declinadas = cotacoes.filter(c => c.status === 'Declinado');
    const taxaFechamento = total > 0 ? (fechadas.length / total) * 100 : 0;
    const totalPremio = fechadas.reduce((sum, c) => sum + (c.valor_premio || 0), 0);
    const ticketMedio = fechadas.length > 0 ? totalPremio / fechadas.length : 0;

    return { total, fechadas: fechadas.length, declinadas: declinadas.length, taxaFechamento, totalPremio, ticketMedio };
  }, [cotacoes]);

  const monthlyData = useMemo(() => {
    const stats: Record<string, { month: string; fechadas: number; declinadas: number; premio: number }> = {};
    cotacoes.forEach(c => {
      const month = format(new Date(c.data_cotacao), 'MMM/yy', { locale: ptBR });
      if (!stats[month]) stats[month] = { month, fechadas: 0, declinadas: 0, premio: 0 };
      if (c.status === 'Negócio fechado' || c.status === 'Fechamento congênere') {
        stats[month].fechadas++;
        stats[month].premio += c.valor_premio || 0;
      } else if (c.status === 'Declinado') {
        stats[month].declinadas++;
      }
    });
    return Object.values(stats);
  }, [cotacoes]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = { 'Em cotação': 0, 'Fechadas': 0, 'Declinado': 0 };
    cotacoes.forEach(c => {
      if (c.status === 'Negócio fechado' || c.status === 'Fechamento congênere') counts['Fechadas']++;
      else if (c.status === 'Em cotação') counts['Em cotação']++;
      else if (c.status === 'Declinado') counts['Declinado']++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [cotacoes]);

  const produtorData = useMemo(() => {
    const stats: Record<string, { nome: string; total: number; fechadas: number; premio: number }> = {};
    cotacoes.forEach(c => {
      const nome = c.produtor_origem?.nome || 'Sem Produtor';
      if (!stats[nome]) stats[nome] = { nome, total: 0, fechadas: 0, premio: 0 };
      stats[nome].total++;
      if (c.status === 'Negócio fechado' || c.status === 'Fechamento congênere') {
        stats[nome].fechadas++;
        stats[nome].premio += c.valor_premio || 0;
      }
    });
    return Object.values(stats)
      .map(p => ({ ...p, taxa: p.total > 0 ? (p.fechadas / p.total) * 100 : 0 }))
      .sort((a, b) => b.premio - a.premio)
      .slice(0, 10);
  }, [cotacoes]);

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Indicadores de Performance</h2>
        <Badge variant="outline" className="text-xs">Período filtrado</Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Cotações</CardTitle>
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold">{kpis.total}</div>
            <p className="text-[10px] text-muted-foreground">{kpis.fechadas} fechadas · {kpis.declinadas} declinadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Taxa Fechamento</CardTitle>
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold">{kpis.taxaFechamento.toFixed(1)}%</div>
            <Badge variant={kpis.taxaFechamento >= 30 ? 'secondary' : 'outline'} className="text-[10px]">
              {kpis.taxaFechamento >= 30 ? 'Boa' : 'Pode melhorar'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Prêmio Total</CardTitle>
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold">{formatCurrency(kpis.totalPremio)}</div>
            <p className="text-[10px] text-muted-foreground">Prêmios fechados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Ticket Médio</CardTitle>
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold">{formatCurrency(kpis.ticketMedio)}</div>
            <p className="text-[10px] text-muted-foreground">Por cotação fechada</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Performance */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Performance Mensal</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(value: number, name: string) => [
                    name === 'premio' ? formatCurrency(value) : value,
                    name === 'fechadas' ? 'Fechadas' : name === 'declinadas' ? 'Declinadas' : 'Prêmio',
                  ]}
                />
                <Bar dataKey="fechadas" fill="hsl(var(--primary))" name="Fechadas" radius={[2, 2, 0, 0]} />
                <Bar dataKey="declinadas" fill="hsl(var(--destructive))" name="Declinadas" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Producer Performance */}
      {produtorData.length > 0 && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Performance por Produtor (Top 10)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ResponsiveContainer width="100%" height={Math.max(200, produtorData.length * 40)}>
              <BarChart data={produtorData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} />
                <YAxis dataKey="nome" type="category" width={110} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(value: number, name: string) => [
                    name === 'premio' ? formatCurrency(value) : `${value.toFixed(1)}%`,
                    name === 'premio' ? 'Prêmio' : 'Taxa',
                  ]}
                />
                <Bar dataKey="premio" fill="hsl(var(--primary))" name="Prêmio" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
