import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Eye, RefreshCw, Zap, Info } from "lucide-react";
import { type Cotacao } from "@/hooks/useSupabaseData";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ProdutorDetailModal } from "./ProdutorDetailModal";
import { ClientesStatusDetailPopup } from "./ClientesStatusDetailPopup";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  // New fields: Total em aberto de todo período
  emAbertoTotalDistinct: number;
  premioEmAbertoTotal: number;
  premioEmAbertoTotalRecorrente: number;
  ticketMedio: number;
  taxaConversao: number;
  cotacoesFechadas: Cotacao[];
  cotacoesEmAberto: Cotacao[];
  cotacoesDeclinadas?: Cotacao[];
  cotacoesEmAbertoTotal?: Cotacao[];
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

type StatusPopupType = 'fechados' | 'aberto_mes' | 'aberto_total' | 'declinados';

interface SelectedStatusDetail {
  produtorNome: string;
  statusType: StatusPopupType;
  cotacoes: Cotacao[];
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
  const [statusDetail, setStatusDetail] = useState<SelectedStatusDetail | null>(null);

  // Calculate totals for forecast
  const totalPremioFechado = produtores.reduce((sum, p) => sum + p.premioTotal, 0);
  const totalPremioRecorrente = produtores.reduce((sum, p) => sum + p.premioRecorrente, 0);
  const totalPremioEmAberto = produtores.reduce((sum, p) => sum + p.premioEmAberto, 0);
  const totalPremioEmAbertoTotal = produtores.reduce((sum, p) => sum + (p.premioEmAbertoTotal || 0), 0);
  const avgConversao = produtores.length > 0 
    ? produtores.reduce((sum, p) => sum + p.taxaConversao, 0) / produtores.length 
    : 0;
  const potencialTotal = totalPremioEmAbertoTotal * (avgConversao / 100);
  const previsaoGeral = totalPremioFechado + potencialTotal;

  // Get totals from statusData for consistency with main cards
  const statusEmCotacao = statusData.find(s => s.status === "Em cotação");
  const statusFechado = statusData.find(s => s.status === "Negócio fechado");
  const statusDeclinado = statusData.find(s => s.status === "Declinado");
  
  const totalEmCotacao = statusEmCotacao?.count || 0;
  const totalFechados = statusFechado?.count || 0;
  const totalDeclinados = statusDeclinado?.count || 0;

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Ranking de Produtores - Análise Consolidada
            </DialogTitle>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
              <Info className="h-3 w-3" />
              Clique nos números de status para ver a lista detalhada de clientes
            </p>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              {/* Summary KPIs - Counts from Dashboard for consistency */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <p className="text-xl font-bold text-brand-orange">{totalEmCotacao}</p>
                  <p className="text-xs text-muted-foreground">Em Cotação</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-success">{totalFechados}</p>
                  <p className="text-xs text-muted-foreground">Fechados</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-destructive">{totalDeclinados}</p>
                  <p className="text-xs text-muted-foreground">Declinados</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-primary">{formatCurrency(totalPremioRecorrente)}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Rec. Fechado
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-success">{formatCurrency(totalPremioFechado)}</p>
                  <p className="text-xs text-muted-foreground">Total Fechado</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-chart-4">{formatCurrency(totalPremioEmAbertoTotal)}</p>
                  <p className="text-xs text-muted-foreground">Em Aberto (Total)</p>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left py-2 px-1 font-medium">#</th>
                      <th className="text-left py-2 px-1 font-medium">Produtor</th>
                      <th className="text-center py-2 px-1 font-medium text-success">Fechados</th>
                      <th className="text-center py-2 px-1 font-medium text-brand-orange">Aberto (Mês)</th>
                      <th className="text-center py-2 px-1 font-medium text-chart-4">Aberto (Total)</th>
                      <th className="text-center py-2 px-1 font-medium text-destructive">Declin.</th>
                      <th className="text-center py-2 px-1 font-medium">Conv.</th>
                      <th className="text-right py-2 px-1 font-medium">Rec. Fechado</th>
                      <th className="text-right py-2 px-1 font-medium">Total Fechado</th>
                      <th className="text-right py-2 px-1 font-medium">Aberto Total R$</th>
                      <th className="text-center py-2 px-1 font-medium">Ação</th>
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
                        <td className="py-2 px-1 font-medium truncate max-w-[120px]">{produtor.nome}</td>
                        <td className="py-2 px-1 text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className="font-semibold text-success hover:underline hover:bg-success/10 px-2 py-0.5 rounded cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:no-underline"
                                onClick={() => setStatusDetail({
                                  produtorNome: produtor.nome,
                                  statusType: 'fechados',
                                  cotacoes: produtor.cotacoesFechadas
                                })}
                                disabled={produtor.fechadasDistinct === 0}
                              >
                                {produtor.fechadasDistinct}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Ver clientes fechados</p>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                        <td className="py-2 px-1 text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className="font-semibold text-brand-orange hover:underline hover:bg-brand-orange/10 px-2 py-0.5 rounded cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:no-underline"
                                onClick={() => setStatusDetail({
                                  produtorNome: produtor.nome,
                                  statusType: 'aberto_mes',
                                  cotacoes: produtor.cotacoesEmAberto
                                })}
                                disabled={produtor.emCotacaoDistinct === 0}
                              >
                                {produtor.emCotacaoDistinct}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Ver cotações em aberto do período</p>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                        <td className="py-2 px-1 text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className="font-semibold text-chart-4 hover:underline hover:bg-chart-4/10 px-2 py-0.5 rounded cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:no-underline"
                                onClick={() => setStatusDetail({
                                  produtorNome: produtor.nome,
                                  statusType: 'aberto_total',
                                  cotacoes: produtor.cotacoesEmAbertoTotal || []
                                })}
                                disabled={!produtor.emAbertoTotalDistinct}
                              >
                                {produtor.emAbertoTotalDistinct || 0}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Ver todas cotações em aberto</p>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                        <td className="py-2 px-1 text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className="font-semibold text-destructive hover:underline hover:bg-destructive/10 px-2 py-0.5 rounded cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:no-underline"
                                onClick={() => setStatusDetail({
                                  produtorNome: produtor.nome,
                                  statusType: 'declinados',
                                  cotacoes: produtor.cotacoesDeclinadas || []
                                })}
                                disabled={produtor.declinadasDistinct === 0}
                              >
                                {produtor.declinadasDistinct}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Ver cotações declinadas</p>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                        <td className="py-2 px-1 text-center">
                          <Badge 
                            variant={produtor.taxaConversao >= 50 ? 'success-alt' : produtor.taxaConversao >= 30 ? 'warning' : 'destructive'}
                            className="text-xs"
                          >
                            {produtor.taxaConversao.toFixed(0)}%
                          </Badge>
                        </td>
                        <td className="py-2 px-1 text-right font-semibold text-primary text-xs">
                          {formatCurrency(produtor.premioRecorrente)}
                        </td>
                        <td className="py-2 px-1 text-right font-medium text-success text-xs">
                          {formatCurrency(produtor.premioTotal)}
                        </td>
                        <td className="py-2 px-1 text-right font-medium text-chart-4 text-xs">
                          {formatCurrency(produtor.premioEmAbertoTotal || 0)}
                        </td>
                        <td className="py-2 px-1 text-center">
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
                  <Zap className="h-4 w-4 text-chart-4" />
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
                  <div className="p-4 bg-gradient-to-br from-chart-4/10 to-chart-4/5 rounded-lg border border-chart-4/20">
                    <p className="text-xs text-muted-foreground mb-1">Potencial de Fechamento</p>
                    <p className="text-xl font-bold text-chart-4">
                      {formatCurrency(potencialTotal)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(totalPremioEmAbertoTotal)} × {avgConversao.toFixed(0)}%
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

      {/* Status Detail Popup */}
      <ClientesStatusDetailPopup
        open={!!statusDetail}
        onClose={() => setStatusDetail(null)}
        produtorNome={statusDetail?.produtorNome || ''}
        statusType={statusDetail?.statusType || 'fechados'}
        cotacoes={statusDetail?.cotacoes || []}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />
    </TooltipProvider>
  );
}
