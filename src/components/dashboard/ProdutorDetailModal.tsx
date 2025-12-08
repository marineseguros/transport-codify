import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, DollarSign, FileText, Clock, Calendar, Zap, RefreshCw } from "lucide-react";
import { type Cotacao } from "@/hooks/useSupabaseData";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getRegraRamo } from "@/lib/ramoClassification";

interface ProdutorStats {
  nome: string;
  totalDistinct: number;
  emCotacaoDistinct: number;
  fechadasDistinct: number;
  declinadasDistinct: number;
  premioTotal: number;
  premioRecorrente: number;
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
}

export function ProdutorDetailModal({
  open,
  onClose,
  produtor,
  formatCurrency,
  formatDate,
  ranking,
}: ProdutorDetailModalProps) {
  if (!produtor) return null;

  // Calculate forecast - considering conversion rate and open quotes
  const potencialFechamento = produtor.premioEmAberto * (produtor.taxaConversao / 100);
  const previsaoTotal = produtor.premioTotal + potencialFechamento;

  // Using centralized getRegraRamo from lib/ramoClassification.ts

  // Get 10 most recent distinct closed (by segurado + grupo)
  const recentFechados = produtor.distinctFechadasList
    .slice(0, 10)
    .map(item => {
      const totalPremio = item.cotacoes.reduce((sum, c) => sum + (c.valor_premio || 0), 0);
      // Determine regra using centralized classification - use the grupo name (which is the ramo description or group)
      // For grouped ramos like "RCTR-C + RC-DC", check if it contains any recurrent ramo
      const grupoName = item.grupo || '';
      let regra: 'Recorrente' | 'Total' = getRegraRamo(grupoName);
      
      // Special case: "RCTR-C + RC-DC" is a recurrent group
      if (grupoName.includes('RCTR-C') || grupoName.includes('RC-DC')) {
        regra = 'Recorrente';
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
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

        <ScrollArea className="max-h-[70vh] pr-4">
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
              <div className="p-3 bg-success/10 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-success" />
                  <span className="text-xs text-muted-foreground">Total Fechado</span>
                </div>
                <p className="text-lg font-bold text-success">{formatCurrency(produtor.premioTotal)}</p>
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

            {/* Recent Closings - 10 most recent distinct by segurado+grupo */}
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
      </DialogContent>
    </Dialog>
  );
}
