import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, TrendingDown, Clock, Target, DollarSign, Users, Building, AlertCircle, CheckCircle2, XCircle, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { type Cotacao } from "@/hooks/useSupabaseData";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ClienteAgrupado {
  segurado: string;
  cpf_cnpj: string;
  premio: number;
  count: number;
  ramos: string[];
}

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

interface StatusDetailModalProps {
  open: boolean;
  onClose: () => void;
  statusData: StatusData[];
  formatCurrency: (value: number) => string;
  formatDate: (date: string) => string;
}

export function StatusDetailModal({ 
  open, 
  onClose, 
  statusData, 
  formatCurrency,
  formatDate 
}: StatusDetailModalProps) {
  const [expandedStatus, setExpandedStatus] = useState<string | null>(null);
  
  // Total de segurados distintos (soma dos seguradosDistintos de cada categoria)
  const totalSeguradosDistintos = statusData.reduce((sum, s) => sum + s.seguradosDistintos, 0);
  const totalPremio = statusData.reduce((sum, s) => sum + s.premioTotal, 0);
  const totalCotacoes = statusData.reduce((sum, s) => sum + s.count, 0);
  
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Análise Detalhada por Status
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-100px)] pr-4">
          <div className="space-y-6">
            {/* Resumo Geral */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground">Total Distintos</div>
                  <div className="text-2xl font-bold">{totalSeguradosDistintos}</div>
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
                  <div className="text-xs text-muted-foreground">Taxa de Conversão</div>
                  <div className="text-2xl font-bold text-success">
                    {totalCotacoes > 0 
                      ? ((statusData.find(s => s.status === "Negócio fechado")?.count || 0) / totalCotacoes * 100).toFixed(1) 
                      : 0}%
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground">Taxa de Declínio</div>
                  <div className="text-2xl font-bold text-destructive">
                    {totalCotacoes > 0 
                      ? ((statusData.find(s => s.status === "Declinado")?.count || 0) / totalCotacoes * 100).toFixed(1) 
                      : 0}%
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Detalhes por Status */}
            {statusData.map((status) => {
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
                        <span className="text-sm text-muted-foreground">({status.percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{formatCurrency(status.premioTotal)}</div>
                        <div className="text-xs text-muted-foreground">Prêmio Total</div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Métricas */}
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Segurados Distintos</div>
                        <div className="font-semibold flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {status.seguradosDistintos}
                        </div>
                      </div>
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
            })}
            
            {/* Insights */}
            <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {statusData.find(s => s.status === "Negócio fechado")?.count && statusData.find(s => s.status === "Declinado")?.count && (
                  <p>
                    • A proporção de fechamento vs. declínio é de{" "}
                    <span className="font-semibold">
                      {((statusData.find(s => s.status === "Negócio fechado")?.count || 0) / 
                        (statusData.find(s => s.status === "Declinado")?.count || 1)).toFixed(1)}:1
                    </span>
                  </p>
                )}
                {statusData.find(s => s.status === "Em cotação")?.count && (
                  <p>
                    • Pipeline ativo com{" "}
                    <span className="font-semibold text-brand-orange">
                      {statusData.find(s => s.status === "Em cotação")?.count} cotações em andamento
                    </span>
                    {" "}representando{" "}
                    <span className="font-semibold">
                      {formatCurrency(statusData.find(s => s.status === "Em cotação")?.premioTotal || 0)}
                    </span>
                    {" "}em prêmio potencial
                  </p>
                )}
                {(() => {
                  const fechado = statusData.find(s => s.status === "Negócio fechado");
                  const emCotacao = statusData.find(s => s.status === "Em cotação");
                  if (fechado && emCotacao && fechado.ticketMedio > emCotacao.ticketMedio) {
                    return (
                      <p>
                        • Ticket médio de fechamentos ({formatCurrency(fechado.ticketMedio)}) é{" "}
                        <span className="font-semibold text-success">
                          {((fechado.ticketMedio / emCotacao.ticketMedio - 1) * 100).toFixed(0)}% maior
                        </span>
                        {" "}que o de cotações em aberto
                      </p>
                    );
                  }
                  return null;
                })()}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
