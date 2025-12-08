import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, TrendingDown, Clock, Target, DollarSign, Users, Building, AlertCircle, CheckCircle2, XCircle, BarChart3 } from "lucide-react";
import { type Cotacao } from "@/hooks/useSupabaseData";

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
            {statusData.map((status) => (
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
                </CardContent>
              </Card>
            ))}
            
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
