import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Users, DollarSign, Eye, RefreshCw, Zap } from "lucide-react";
import { type Cotacao } from "@/hooks/useSupabaseData";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ProdutorDetailModal } from "./ProdutorDetailModal";

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

interface StatusDetailModalProps {
  open: boolean;
  onClose: () => void;
  statusData: StatusData[];
  formatCurrency: (value: number) => string;
  formatDate: (date: string) => string;
  produtores?: ProdutorStats[];
}

export function StatusDetailModal({ 
  open, 
  onClose, 
  statusData, 
  formatCurrency,
  formatDate,
  produtores = []
}: StatusDetailModalProps) {
  const [selectedProdutor, setSelectedProdutor] = useState<ProdutorStats | null>(null);
  const [selectedRanking, setSelectedRanking] = useState(0);

  // Calculate totals for forecast
  const totalPremioFechado = produtores.reduce((sum, p) => sum + p.premioTotal, 0);
  const totalPremioRecorrente = produtores.reduce((sum, p) => sum + p.premioRecorrente, 0);
  const totalPremioEmAberto = produtores.reduce((sum, p) => sum + p.premioEmAberto, 0);
  const avgConversao = produtores.length > 0 
    ? produtores.reduce((sum, p) => sum + p.taxaConversao, 0) / produtores.length 
    : 0;
  const potencialTotal = totalPremioEmAberto * (avgConversao / 100);
  const previsaoGeral = totalPremioFechado + potencialTotal;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Ranking de Produtores - Análise Consolidada
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <p className="text-xl font-bold text-primary">{formatCurrency(totalPremioRecorrente)}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Recorrente Fechado
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-success">{formatCurrency(totalPremioFechado)}</p>
                  <p className="text-xs text-muted-foreground">Total Fechado</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-brand-orange">{formatCurrency(totalPremioEmAberto)}</p>
                  <p className="text-xs text-muted-foreground">Total em Aberto</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{avgConversao.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Média Conversão</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-muted-foreground">{produtores.length}</p>
                  <p className="text-xs text-muted-foreground">Produtores</p>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left py-2 px-2 font-medium">#</th>
                      <th className="text-left py-2 px-2 font-medium">Produtor</th>
                      <th className="text-center py-2 px-2 font-medium text-success">Fechados</th>
                      <th className="text-center py-2 px-2 font-medium text-brand-orange">Em Aberto</th>
                      <th className="text-center py-2 px-2 font-medium text-destructive">Declinados</th>
                      <th className="text-center py-2 px-2 font-medium">Conversão</th>
                      <th className="text-right py-2 px-2 font-medium">Recorrente</th>
                      <th className="text-right py-2 px-2 font-medium">Total</th>
                      <th className="text-right py-2 px-2 font-medium">Aberto Rec.</th>
                      <th className="text-right py-2 px-2 font-medium">Aberto Total</th>
                      <th className="text-center py-2 px-2 font-medium">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtores.map((produtor, index) => (
                      <tr key={produtor.nome} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 px-2">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            index === 0 ? 'bg-amber-500 text-amber-950' : 
                            index === 1 ? 'bg-slate-400 text-slate-950' : 
                            index === 2 ? 'bg-amber-700 text-amber-100' : 
                            'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-medium">{produtor.nome}</td>
                        <td className="py-2 px-2 text-center">
                          <span className="font-semibold text-success">{produtor.fechadasDistinct}</span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className="font-semibold text-brand-orange">{produtor.emCotacaoDistinct}</span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className="font-semibold text-destructive">{produtor.declinadasDistinct}</span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <Badge 
                            variant={produtor.taxaConversao >= 50 ? 'success-alt' : produtor.taxaConversao >= 30 ? 'warning' : 'destructive'}
                            className="text-xs"
                          >
                            {produtor.taxaConversao.toFixed(0)}%
                          </Badge>
                        </td>
                        <td className="py-2 px-2 text-right font-semibold text-primary">
                          {formatCurrency(produtor.premioRecorrente)}
                        </td>
                        <td className="py-2 px-2 text-right font-medium text-success">
                          {formatCurrency(produtor.premioTotal)}
                        </td>
                        <td className="py-2 px-2 text-right font-medium text-brand-orange/80">
                          {formatCurrency(produtor.premioEmAbertoRecorrente)}
                        </td>
                        <td className="py-2 px-2 text-right font-medium text-brand-orange">
                          {formatCurrency(produtor.premioEmAberto)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => {
                              setSelectedProdutor(produtor);
                              setSelectedRanking(index + 1);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Forecast Section */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Previsão e Potencial Consolidado
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" />
                      Recorrente Realizado
                    </p>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(totalPremioRecorrente)}
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-success/10 to-success/5 rounded-lg border border-success/20">
                    <p className="text-xs text-muted-foreground mb-1">Total Realizado</p>
                    <p className="text-xl font-bold text-success">
                      {formatCurrency(totalPremioFechado)}
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-lg border border-amber-500/20">
                    <p className="text-xs text-muted-foreground mb-1">Potencial de Fechamento</p>
                    <p className="text-xl font-bold text-amber-600">
                      {formatCurrency(potencialTotal)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(totalPremioEmAberto)} × {avgConversao.toFixed(0)}%
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-chart-4/10 to-chart-4/5 rounded-lg border border-chart-4/20">
                    <p className="text-xs text-muted-foreground mb-1">Previsão Total</p>
                    <p className="text-xl font-bold text-chart-4">
                      {formatCurrency(previsaoGeral)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Fechado + Potencial
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Individual Producer Detail Modal */}
      <ProdutorDetailModal
        open={!!selectedProdutor}
        onClose={() => setSelectedProdutor(null)}
        produtor={selectedProdutor}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        ranking={selectedRanking}
        statusData={statusData}
      />
    </>
  );
}
