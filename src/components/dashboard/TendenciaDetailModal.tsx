import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, TrendingDown, LineChart, Calendar, DollarSign, Target, Zap } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface MonthData {
  mes: string;
  total: number;
  emCotacao: number;
  fechadas: number;
  declinadas: number;
  premioFechado: number;
  premioAberto: number;
  transportador: number;
  embarcador: number;
  taxaConversao: number;
}

interface TendenciaDetailModalProps {
  open: boolean;
  onClose: () => void;
  monthlyData: MonthData[];
  formatCurrency: (value: number) => string;
}

export function TendenciaDetailModal({ 
  open, 
  onClose, 
  monthlyData,
  formatCurrency 
}: TendenciaDetailModalProps) {
  // Calcular tendências
  const lastMonth = monthlyData[monthlyData.length - 1];
  const previousMonth = monthlyData[monthlyData.length - 2];
  
  const totalGeral = monthlyData.reduce((sum, m) => sum + m.total, 0);
  const totalFechadas = monthlyData.reduce((sum, m) => sum + m.fechadas, 0);
  const totalPremio = monthlyData.reduce((sum, m) => sum + m.premioFechado, 0);
  
  const mediaMensal = totalGeral / monthlyData.length;
  const mediaFechamentos = totalFechadas / monthlyData.length;
  
  // Calcular variação
  const variacaoTotal = previousMonth ? ((lastMonth?.total - previousMonth.total) / previousMonth.total * 100) : 0;
  const variacaoFechadas = previousMonth && previousMonth.fechadas > 0 
    ? ((lastMonth?.fechadas - previousMonth.fechadas) / previousMonth.fechadas * 100) 
    : 0;
  
  // Mês de melhor performance
  const melhorMesFechadas = [...monthlyData].sort((a, b) => b.fechadas - a.fechadas)[0];
  const melhorMesPremio = [...monthlyData].sort((a, b) => b.premioFechado - a.premioFechado)[0];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            Análise de Tendência - Últimos 6 Meses
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-100px)] pr-4">
          <div className="space-y-6">
            {/* KPIs do Período */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground">Total Período</div>
                  <div className="text-2xl font-bold">{totalGeral}</div>
                  <div className="text-xs text-muted-foreground">Média: {mediaMensal.toFixed(0)}/mês</div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground">Fechamentos</div>
                  <div className="text-2xl font-bold text-success">{totalFechadas}</div>
                  <div className="text-xs text-muted-foreground">Média: {mediaFechamentos.toFixed(0)}/mês</div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground">Prêmio Total</div>
                  <div className="text-lg font-bold text-primary">{formatCurrency(totalPremio)}</div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground">Conversão Média</div>
                  <div className="text-2xl font-bold text-success-alt">
                    {(totalGeral > 0 ? (totalFechadas / totalGeral * 100) : 0).toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Gráfico de Área Empilhada - Transportador vs Embarcador */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Distribuição Transportador vs Embarcador</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                      }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="transportador" 
                      stackId="1"
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary) / 0.6)" 
                      name="Transportador"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="embarcador" 
                      stackId="1"
                      stroke="hsl(var(--brand-orange))" 
                      fill="hsl(var(--brand-orange) / 0.6)" 
                      name="Embarcador"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {/* Tabela Detalhada */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Dados Mensais Detalhados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="text-left py-2 px-2">Mês</th>
                        <th className="text-center py-2 px-2">Total</th>
                        <th className="text-center py-2 px-2 text-brand-orange">Em Cotação</th>
                        <th className="text-center py-2 px-2 text-success">Fechadas</th>
                        <th className="text-center py-2 px-2 text-destructive">Declinadas</th>
                        <th className="text-right py-2 px-2">Prêmio</th>
                        <th className="text-center py-2 px-2">Conversão</th>
                        <th className="text-center py-2 px-2">Transp.</th>
                        <th className="text-center py-2 px-2">Embarc.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.map((month, index) => {
                        const prevMonth = monthlyData[index - 1];
                        const trend = prevMonth ? month.fechadas - prevMonth.fechadas : 0;
                        
                        return (
                          <tr key={month.mes} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="py-2 px-2 font-medium">{month.mes}</td>
                            <td className="py-2 px-2 text-center">{month.total}</td>
                            <td className="py-2 px-2 text-center text-brand-orange">{month.emCotacao}</td>
                            <td className="py-2 px-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-success font-semibold">{month.fechadas}</span>
                                {trend !== 0 && (
                                  <span className={`text-xs ${trend > 0 ? 'text-success' : 'text-destructive'}`}>
                                    {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-2 text-center text-destructive">{month.declinadas}</td>
                            <td className="py-2 px-2 text-right text-xs">{formatCurrency(month.premioFechado)}</td>
                            <td className="py-2 px-2 text-center">
                              <Badge variant={month.taxaConversao >= 30 ? "success-alt" : month.taxaConversao >= 20 ? "brand-orange" : "destructive"} className="text-xs">
                                {month.taxaConversao.toFixed(0)}%
                              </Badge>
                            </td>
                            <td className="py-2 px-2 text-center">{month.transportador}</td>
                            <td className="py-2 px-2 text-center">{month.embarcador}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            
            {/* Insights e Tendências */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-r from-success/5 to-success/10 border-success/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    Destaques Positivos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {melhorMesFechadas && (
                    <p>
                      • Melhor mês em fechamentos: <span className="font-semibold text-success">{melhorMesFechadas.mes}</span> com {melhorMesFechadas.fechadas} negócios
                    </p>
                  )}
                  {melhorMesPremio && (
                    <p>
                      • Melhor mês em prêmio: <span className="font-semibold text-primary">{melhorMesPremio.mes}</span> com {formatCurrency(melhorMesPremio.premioFechado)}
                    </p>
                  )}
                  {variacaoFechadas > 0 && (
                    <p>
                      • Crescimento de <span className="font-semibold text-success">{variacaoFechadas.toFixed(0)}%</span> em fechamentos vs. mês anterior
                    </p>
                  )}
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-brand-orange/5 to-brand-orange/10 border-brand-orange/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-brand-orange" />
                    Oportunidades
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {lastMonth && lastMonth.emCotacao > 0 && (
                    <p>
                      • <span className="font-semibold text-brand-orange">{lastMonth.emCotacao} cotações em aberto</span> no mês atual aguardando fechamento
                    </p>
                  )}
                  {variacaoTotal < 0 && (
                    <p>
                      • Volume de cotações reduziu <span className="font-semibold text-destructive">{Math.abs(variacaoTotal).toFixed(0)}%</span> - oportunidade para prospecção
                    </p>
                  )}
                  {(() => {
                    const avgConversion = totalGeral > 0 ? (totalFechadas / totalGeral * 100) : 0;
                    if (avgConversion < 25) {
                      return (
                        <p>
                          • Taxa de conversão de {avgConversion.toFixed(0)}% - potencial para melhoria no follow-up
                        </p>
                      );
                    }
                    return null;
                  })()}
                </CardContent>
              </Card>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
