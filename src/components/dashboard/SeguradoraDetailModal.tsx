import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building, DollarSign, TrendingUp, Target, Award, BarChart3, Eye, ChevronDown, ChevronUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ClienteData {
  segurado: string;
  cpf_cnpj: string;
  premio: number;
  ramos: string[];
}

interface SeguradoraData {
  nome: string;
  premio: number;
  count: number;
  distinctCount: number;
  ticketMedio: number;
  percentualPremio: number;
  percentualCount: number;
  transportador: number;
  embarcador: number;
  topRamos: { ramo: string; count: number; premio: number }[];
  clientes?: ClienteData[];
}

interface SeguradoraDetailModalProps {
  open: boolean;
  onClose: () => void;
  seguradoras: SeguradoraData[];
  formatCurrency: (value: number) => string;
}

export function SeguradoraDetailModal({ 
  open, 
  onClose, 
  seguradoras,
  formatCurrency 
}: SeguradoraDetailModalProps) {
  const [expandedSeguradora, setExpandedSeguradora] = useState<string | null>(null);
  const [showClientsFor, setShowClientsFor] = useState<string | null>(null);
  
  const totalPremio = seguradoras.reduce((sum, s) => sum + s.premio, 0);
  const totalCount = seguradoras.reduce((sum, s) => sum + s.distinctCount, 0);
  const top3Premio = seguradoras.slice(0, 3).reduce((sum, s) => sum + s.premio, 0);
  
  // Concentração
  const concentracaoTop3 = totalPremio > 0 ? (top3Premio / totalPremio * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Análise Completa de Seguradoras
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-100px)] pr-4">
          <div className="space-y-6">
            {/* KPIs Gerais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground">Seguradoras Ativas</div>
                  <div className="text-2xl font-bold">{seguradoras.length}</div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground">Total Fechamentos</div>
                  <div className="text-2xl font-bold text-success">{totalCount}</div>
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
                  <div className="text-xs text-muted-foreground">Concentração Top 3</div>
                  <div className="text-2xl font-bold text-brand-orange">{concentracaoTop3.toFixed(0)}%</div>
                </CardContent>
              </Card>
            </div>
            
            {/* Ranking Completo */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Ranking de Seguradoras
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {seguradoras.map((seguradora, index) => {
                    const isExpanded = expandedSeguradora === seguradora.nome;
                    const showClients = showClientsFor === seguradora.nome;
                    
                    return (
                      <div key={seguradora.nome} className="border rounded-lg overflow-hidden">
                        {/* Header da Seguradora */}
                        <div 
                          className={`p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 ${
                            index < 3 ? 'bg-gradient-to-r from-primary/5 to-transparent' : ''
                          }`}
                          onClick={() => setExpandedSeguradora(isExpanded ? null : seguradora.nome)}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                              index === 0 ? 'bg-amber-500 text-amber-950' : 
                              index === 1 ? 'bg-slate-400 text-slate-950' : 
                              index === 2 ? 'bg-amber-700 text-amber-100' : 
                              'bg-muted text-muted-foreground'
                            }`}>
                              {index + 1}
                            </span>
                            <div>
                              <div className="font-medium">{seguradora.nome}</div>
                              <div className="text-xs text-muted-foreground">
                                {seguradora.distinctCount} fechamentos distintos
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="font-semibold text-primary">{formatCurrency(seguradora.premio)}</div>
                              <div className="text-xs text-muted-foreground">{seguradora.percentualPremio.toFixed(1)}% do total</div>
                            </div>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </Button>
                          </div>
                        </div>
                        
                        {/* Detalhes Expandidos */}
                        {isExpanded && (
                          <div className="p-4 border-t bg-muted/20">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div>
                                <div className="text-xs text-muted-foreground">Ticket Médio</div>
                                <div className="font-semibold">{formatCurrency(seguradora.ticketMedio)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">% Fechamentos</div>
                                <div className="font-semibold">{seguradora.percentualCount.toFixed(1)}%</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Transportadores</div>
                                <div className="font-semibold">{seguradora.transportador}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Embarcadores</div>
                                <div className="font-semibold">{seguradora.embarcador}</div>
                              </div>
                            </div>
                            
                            {/* Top Ramos */}
                            {seguradora.topRamos.length > 0 && (
                              <div className="mb-4">
                                <div className="text-xs font-medium text-muted-foreground mb-2">Top Ramos</div>
                                <div className="flex flex-wrap gap-2">
                                  {seguradora.topRamos.map((ramo) => (
                                    <Badge key={ramo.ramo} variant="outline" className="text-xs">
                                      {ramo.ramo}: {ramo.count} ({formatCurrency(ramo.premio)})
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Lista de Clientes */}
                            {seguradora.clientes && seguradora.clientes.length > 0 && (
                              <Collapsible 
                                open={showClients} 
                                onOpenChange={() => setShowClientsFor(showClients ? null : seguradora.nome)}
                              >
                                <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full justify-between p-2 rounded-md hover:bg-muted/50">
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    Clientes ({seguradora.clientes.length})
                                  </span>
                                  {showClients ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="mt-2 border rounded-md overflow-hidden">
                                    <table className="w-full text-xs">
                                      <thead className="bg-muted/50">
                                        <tr>
                                          <th className="text-left py-2 px-3 font-medium">Cliente</th>
                                          <th className="text-left py-2 px-3 font-medium hidden sm:table-cell">Ramos</th>
                                          <th className="text-right py-2 px-3 font-medium">Prêmio</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {seguradora.clientes.slice(0, 10).map((cliente, idx) => (
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
                                            <td className="py-2 px-3 text-right font-medium text-primary">{formatCurrency(cliente.premio)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    {seguradora.clientes.length > 10 && (
                                      <div className="text-center py-2 text-xs text-muted-foreground border-t">
                                        +{seguradora.clientes.length - 10} clientes
                                      </div>
                                    )}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            
            {/* Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Análise de Concentração
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    • As <span className="font-semibold">top 3 seguradoras</span> concentram{" "}
                    <span className="font-semibold text-primary">{concentracaoTop3.toFixed(0)}%</span> do prêmio total
                  </p>
                  {seguradoras[0] && (
                    <p>
                      • Líder: <span className="font-semibold">{seguradoras[0].nome}</span> com{" "}
                      <span className="font-semibold">{formatCurrency(seguradoras[0].premio)}</span>
                    </p>
                  )}
                  {concentracaoTop3 > 70 && (
                    <p className="text-brand-orange">
                      • Alta concentração detectada - considere diversificação
                    </p>
                  )}
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-success/5 to-success/10 border-success/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4 text-success" />
                    Oportunidades
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {(() => {
                    const maxTicket = Math.max(...seguradoras.map(s => s.ticketMedio));
                    const bestTicket = seguradoras.find(s => s.ticketMedio === maxTicket);
                    if (bestTicket) {
                      return (
                        <p>
                          • Melhor ticket médio: <span className="font-semibold">{bestTicket.nome}</span> com{" "}
                          <span className="font-semibold text-success">{formatCurrency(bestTicket.ticketMedio)}</span>
                        </p>
                      );
                    }
                    return null;
                  })()}
                  {seguradoras.length < 5 && (
                    <p>
                      • Apenas {seguradoras.length} seguradoras ativas - oportunidade para expandir parcerias
                    </p>
                  )}
                  {seguradoras.filter(s => s.embarcador > s.transportador).length > 0 && (
                    <p>
                      • {seguradoras.filter(s => s.embarcador > s.transportador).length} seguradora(s) com foco em embarcadores
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
