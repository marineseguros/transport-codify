import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Target, DollarSign, FileText, Clock, Calendar, Zap, RefreshCw, Users, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import { type Cotacao } from "@/hooks/useSupabaseData";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getRegraRamo } from "@/lib/ramoClassification";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface StatusData {
  status: string;
  count: number;
  seguradosDistintos: number;
  percentage: number;
  cotacoes: Cotacao[];
  premioTotal: number;
  ticketMedio: number;
  transportador: number;
  embarcador: number;
  ramoBreakdown: { ramo: string; count: number; premio: number }[];
  seguradoraBreakdown: { seguradora: string; count: number; premio: number }[];
  tempoMedio: number;
}

interface ClienteAgrupado {
  segurado: string;
  cpf_cnpj: string;
  premio: number;
  count: number;
  ramos: string[];
}

interface ProdutorStats {
  nome: string;
  totalDistinct: number;
  emCotacaoDistinct: number;
  fechadasDistinct: number;
  declinadasDistinct: number;
  premioTotal: number;
  premioRecorrente: number;
  premioRegraTotal: number;
  premioEmAberto: number;
  premioEmAbertoRecorrente: number;
  ticketMedio: number;
  taxaConversao: number;
  cotacoesFechadas: Cotacao[];
  cotacoesEmAberto: Cotacao[];
  distinctFechadasList: { segurado: string; grupo: string; cotacoes: Cotacao[] }[];
  distinctEmAbertoList: { segurado: string; grupo: string; cotacoes: Cotacao[] }[];
}

interface ProdutorDetailModalProps {
  open: boolean;
  onClose: () => void;
  produtor: ProdutorStats | null;
  formatCurrency: (value: number) => string;
  formatDate: (date: string) => string;
  ranking: number;
  statusData?: StatusData[];
}

export function ProdutorDetailModal({
  open,
  onClose,
  produtor,
  formatCurrency,
  formatDate,
  ranking,
  statusData = [],
}: ProdutorDetailModalProps) {
  const [expandedStatus, setExpandedStatus] = useState<string | null>(null);
  
  if (!produtor) return null;

  // Calculate forecast - considering conversion rate and open quotes
  const potencialFechamento = produtor.premioEmAberto * (produtor.taxaConversao / 100);
  const previsaoTotal = produtor.premioTotal + potencialFechamento;

  // Get 10 most recent distinct closed (by segurado + grupo)
  const recentFechados = produtor.distinctFechadasList
    .slice(0, 10)
    .map(item => {
      const totalPremio = item.cotacoes.reduce((sum, c) => sum + (c.valor_premio || 0), 0);
      const cotacaoRamo = item.cotacoes[0]?.ramo;
      let regra: 'Recorrente' | 'Total' = getRegraRamo(cotacaoRamo);
      
      if (!cotacaoRamo) {
        const grupoName = item.grupo || '';
        regra = getRegraRamo(grupoName);
      }
      
      return {
        ...item,
        latestDate: item.cotacoes.reduce((latest, c) => {
          const date = c.data_fechamento || c.created_at;
          return date > latest ? date : latest;
        }, ''),
        totalPremio,
        regra,
      };
    })
    .sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());

  // Calculate total premium for % calculation
  const totalPremioFechados = recentFechados.reduce((sum, item) => sum + item.totalPremio, 0);

  // Filter status data for this producer's quotations
  const produtorStatusData = statusData.map(status => {
    const produtorCotacoes = status.cotacoes.filter(c => {
      if (status.status === "Em cotação") {
        return c.produtor_cotador?.nome === produtor.nome;
      }
      return c.produtor_origem?.nome === produtor.nome;
    });
    
    const premioTotal = produtorCotacoes.reduce((sum, c) => sum + (c.valor_premio || 0), 0);
    const transportador = produtorCotacoes.filter(c => c.segmento === "Transportador").length;
    const embarcador = produtorCotacoes.length - transportador;
    
    // Breakdown por ramo
    const ramoBreakdown: Record<string, { count: number; premio: number }> = {};
    produtorCotacoes.forEach(c => {
      const ramo = c.ramo?.descricao || "Não informado";
      if (!ramoBreakdown[ramo]) ramoBreakdown[ramo] = { count: 0, premio: 0 };
      ramoBreakdown[ramo].count++;
      ramoBreakdown[ramo].premio += c.valor_premio || 0;
    });

    // Breakdown por seguradora
    const seguradoraBreakdown: Record<string, { count: number; premio: number }> = {};
    produtorCotacoes.forEach(c => {
      const seg = c.seguradora?.nome || "Não informado";
      if (!seguradoraBreakdown[seg]) seguradoraBreakdown[seg] = { count: 0, premio: 0 };
      seguradoraBreakdown[seg].count++;
      seguradoraBreakdown[seg].premio += c.valor_premio || 0;
    });

    return {
      ...status,
      count: produtorCotacoes.length,
      cotacoes: produtorCotacoes,
      premioTotal,
      ticketMedio: produtorCotacoes.length > 0 ? premioTotal / produtorCotacoes.length : 0,
      transportador,
      embarcador,
      ramoBreakdown: Object.entries(ramoBreakdown)
        .map(([ramo, stats]) => ({ ramo, ...stats }))
        .sort((a, b) => b.premio - a.premio),
      seguradoraBreakdown: Object.entries(seguradoraBreakdown)
        .map(([seguradora, stats]) => ({ seguradora, ...stats }))
        .sort((a, b) => b.premio - a.premio),
    };
  }).filter(s => s.count > 0);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Negócio fechado":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "Em cotação":
        return <Clock className="h-4 w-4 text-brand-orange" />;
      case "Declinado":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Negócio fechado":
        return "success-alt";
      case "Em cotação":
        return "brand-orange";
      case "Declinado":
        return "destructive";
      default:
        return "secondary";
    }
  };

  // Agrupar cotações por cliente para cada status
  const getClientesAgrupados = (cotacoes: Cotacao[]): ClienteAgrupado[] => {
    const clienteMap = new Map<string, ClienteAgrupado>();
    
    cotacoes.forEach(c => {
      const key = c.cpf_cnpj;
      if (clienteMap.has(key)) {
        const existing = clienteMap.get(key)!;
        existing.premio += c.valor_premio || 0;
        existing.count += 1;
        if (c.ramo?.descricao && !existing.ramos.includes(c.ramo.descricao)) {
          existing.ramos.push(c.ramo.descricao);
        }
      } else {
        clienteMap.set(key, {
          segurado: c.segurado,
          cpf_cnpj: c.cpf_cnpj,
          premio: c.valor_premio || 0,
          count: 1,
          ramos: c.ramo?.descricao ? [c.ramo.descricao] : []
        });
      }
    });
    
    return Array.from(clienteMap.values()).sort((a, b) => b.premio - a.premio);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
              ranking === 1 ? 'bg-amber-500 text-amber-950' : 
              ranking === 2 ? 'bg-slate-400 text-slate-950' : 
              ranking === 3 ? 'bg-amber-700 text-amber-100' : 
              'bg-primary text-primary-foreground'
            }`}>
              {ranking}
            </span>
            {produtor.nome}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="resumo" className="w-full flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
            <TabsTrigger value="resumo">Resumo & Fechamentos</TabsTrigger>
            <TabsTrigger value="status">Análise por Status</TabsTrigger>
          </TabsList>
          
          <TabsContent value="resumo" className="flex-1 min-h-0">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-4">
                {/* KPIs Grid */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-1 text-success mb-1">
                      <Target className="h-4 w-4" />
                      <span className="text-2xl font-bold">{produtor.fechadasDistinct}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Fechados</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-1 text-brand-orange mb-1">
                      <FileText className="h-4 w-4" />
                      <span className="text-2xl font-bold">{produtor.emCotacaoDistinct}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Em Aberto</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <div className="flex items-center justify-center gap-1 text-destructive mb-1">
                      <TrendingDown className="h-4 w-4" />
                      <span className="text-2xl font-bold">{produtor.declinadasDistinct}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Declinados</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <div className={`flex items-center justify-center gap-1 mb-1 ${
                      produtor.taxaConversao >= 50 ? 'text-success' : 
                      produtor.taxaConversao >= 30 ? 'text-amber-500' : 'text-destructive'
                    }`}>
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-2xl font-bold">{produtor.taxaConversao.toFixed(0)}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Conversão</p>
                  </div>
                </div>

                {/* Premium Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <RefreshCw className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Recorrente</span>
                    </div>
                    <p className="text-lg font-bold text-primary">{formatCurrency(produtor.premioRecorrente)}</p>
                  </div>
                  <div className="p-3 bg-amber-500/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-4 w-4 text-amber-600" />
                      <span className="text-xs text-muted-foreground">Total</span>
                    </div>
                    <p className="text-lg font-bold text-amber-600">{formatCurrency(produtor.premioRegraTotal)}</p>
                  </div>
                  <div className="p-3 bg-brand-orange/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-brand-orange" />
                      <span className="text-xs text-muted-foreground">Aberto Rec.</span>
                    </div>
                    <p className="text-lg font-bold text-brand-orange">{formatCurrency(produtor.premioEmAbertoRecorrente)}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Ticket Médio</span>
                    </div>
                    <p className="text-lg font-bold">{formatCurrency(produtor.ticketMedio)}</p>
                  </div>
                </div>

                {/* Recent Closings */}
                <div className="border rounded-lg p-3">
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    10 Fechamentos Mais Recentes (Distintos)
                  </p>
                  {recentFechados.length > 0 ? (
                    <div className="space-y-2">
                      {recentFechados.map((item, idx) => {
                        const mainCotacao = item.cotacoes[0];
                        const percentual = totalPremioFechados > 0 
                          ? ((item.totalPremio / totalPremioFechados) * 100).toFixed(1)
                          : '0.0';
                        return (
                          <div
                            key={`${item.segurado}-${item.grupo}-${idx}`}
                            className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded hover:bg-muted/50"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{item.segurado}</p>
                                <Badge 
                                  variant={item.regra === 'Recorrente' ? 'default' : 'secondary'}
                                  className={`text-[10px] px-1.5 py-0 ${
                                    item.regra === 'Recorrente' 
                                      ? 'bg-primary/20 text-primary border-primary/30' 
                                      : 'bg-amber-500/20 text-amber-600 border-amber-500/30'
                                  }`}
                                >
                                  {item.regra}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{item.grupo}</span>
                                <span>•</span>
                                <span>{formatDate(item.latestDate)}</span>
                                {mainCotacao?.inicio_vigencia && (
                                  <>
                                    <span>•</span>
                                    <span>Vigência: {formatDate(mainCotacao.inicio_vigencia)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-2 shrink-0">
                              <Badge variant="success-alt">
                                {formatCurrency(item.totalPremio)}
                              </Badge>
                              <span className="text-xs text-muted-foreground font-medium">
                                {percentual}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Nenhum fechamento no período
                    </p>
                  )}
                </div>

                {/* Forecast & Potential Section */}
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Previsão e Potencial
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-lg border border-amber-500/20">
                      <p className="text-xs text-muted-foreground mb-1">Potencial de Fechamento</p>
                      <p className="text-xl font-bold text-amber-600">
                        {formatCurrency(potencialFechamento)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {produtor.emCotacaoDistinct} cotações × {produtor.taxaConversao.toFixed(0)}% conversão
                      </p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                      <p className="text-xs text-muted-foreground mb-1">Previsão Total</p>
                      <p className="text-xl font-bold text-primary">
                        {formatCurrency(previsaoTotal)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Fechado + Potencial estimado
                      </p>
                    </div>
                  </div>
                  
                  {/* Insights */}
                  <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2">Análise Rápida:</p>
                    <ul className="text-xs space-y-1">
                      {produtor.taxaConversao >= 50 && (
                        <li className="text-success">✓ Excelente taxa de conversão ({produtor.taxaConversao.toFixed(0)}%)</li>
                      )}
                      {produtor.taxaConversao < 30 && (
                        <li className="text-destructive">⚠ Taxa de conversão baixa - revisar abordagem</li>
                      )}
                      {produtor.emCotacaoDistinct > produtor.fechadasDistinct && (
                        <li className="text-brand-orange">→ {produtor.emCotacaoDistinct} cotações em aberto aguardando fechamento</li>
                      )}
                      {produtor.premioEmAberto > produtor.premioTotal && (
                        <li className="text-primary">→ Potencial em aberto ({formatCurrency(produtor.premioEmAberto)}) maior que realizado</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="status" className="flex-1 min-h-0">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-4">
                {/* Header with total stats */}
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-5 w-5" />
                  <span className="font-medium">Distribuição por Status - {produtor.nome}</span>
                </div>

                {produtorStatusData.length > 0 ? (
                  produtorStatusData.map((status) => {
                    const clientesAgrupados = getClientesAgrupados(status.cotacoes);
                    const isExpanded = expandedStatus === status.status;
                    
                    return (
                      <Card key={status.status} className="border-l-4" style={{ borderLeftColor: `hsl(var(--${getStatusColor(status.status)}))` }}>
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(status.status)}
                              <Badge variant={getStatusColor(status.status) as any}>{status.status}</Badge>
                              <span className="text-2xl font-bold">{status.count}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold">{formatCurrency(status.premioTotal)}</div>
                              <div className="text-xs text-muted-foreground">Prêmio Total</div>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">Ticket Médio</div>
                              <div className="font-semibold flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                {formatCurrency(status.ticketMedio)}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">Transportadores</div>
                              <div className="font-semibold">{status.transportador}</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">Embarcadores</div>
                              <div className="font-semibold">{status.embarcador}</div>
                            </div>
                          </div>
                          
                          {/* Breakdown por Ramo (top 3) */}
                          {status.ramoBreakdown.length > 0 && (
                            <div className="mt-4">
                              <div className="text-xs font-medium text-muted-foreground mb-2">Top Ramos</div>
                              <div className="flex flex-wrap gap-2">
                                {status.ramoBreakdown.slice(0, 3).map((ramo) => (
                                  <Badge key={ramo.ramo} variant="outline" className="text-xs">
                                    {ramo.ramo}: {ramo.count} ({formatCurrency(ramo.premio)})
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Breakdown por Seguradora (top 3) */}
                          {status.seguradoraBreakdown.length > 0 && (
                            <div className="mt-3">
                              <div className="text-xs font-medium text-muted-foreground mb-2">Top Seguradoras</div>
                              <div className="flex flex-wrap gap-2">
                                {status.seguradoraBreakdown.slice(0, 3).map((seg) => (
                                  <Badge key={seg.seguradora} variant="secondary" className="text-xs">
                                    {seg.seguradora}: {seg.count} ({formatCurrency(seg.premio)})
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Lista de Clientes Expandível */}
                          {clientesAgrupados.length > 0 && (
                            <Collapsible 
                              open={isExpanded} 
                              onOpenChange={() => setExpandedStatus(isExpanded ? null : status.status)}
                              className="mt-4"
                            >
                              <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full justify-between p-2 rounded-md hover:bg-muted/50">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  Clientes ({clientesAgrupados.length})
                                </span>
                                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="mt-2 border rounded-md overflow-hidden">
                                  <table className="w-full text-xs">
                                    <thead className="bg-muted/50">
                                      <tr>
                                        <th className="text-left py-2 px-3 font-medium">Cliente</th>
                                        <th className="text-left py-2 px-3 font-medium hidden sm:table-cell">Ramos</th>
                                        <th className="text-right py-2 px-3 font-medium">Qtd</th>
                                        <th className="text-right py-2 px-3 font-medium">Prêmio</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {clientesAgrupados.slice(0, 10).map((cliente, idx) => (
                                        <tr key={cliente.cpf_cnpj} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                                          <td className="py-2 px-3">
                                            <div className="font-medium truncate max-w-[150px]">{cliente.segurado}</div>
                                            <div className="text-muted-foreground text-[10px]">{cliente.cpf_cnpj}</div>
                                          </td>
                                          <td className="py-2 px-3 hidden sm:table-cell">
                                            <div className="flex flex-wrap gap-1">
                                              {cliente.ramos.slice(0, 2).map(r => (
                                                <Badge key={r} variant="outline" className="text-[10px] px-1 py-0">{r}</Badge>
                                              ))}
                                              {cliente.ramos.length > 2 && (
                                                <Badge variant="outline" className="text-[10px] px-1 py-0">+{cliente.ramos.length - 2}</Badge>
                                              )}
                                            </div>
                                          </td>
                                          <td className="py-2 px-3 text-right">{cliente.count}</td>
                                          <td className="py-2 px-3 text-right font-medium text-primary">{formatCurrency(cliente.premio)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  {clientesAgrupados.length > 10 && (
                                    <div className="text-center py-2 text-xs text-muted-foreground border-t">
                                      +{clientesAgrupados.length - 10} clientes
                                    </div>
                                  )}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhuma cotação encontrada para este produtor no período selecionado.
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
