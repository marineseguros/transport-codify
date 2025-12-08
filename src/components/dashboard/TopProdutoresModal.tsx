import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Users, Target, DollarSign, FileText, Clock } from "lucide-react";
import { type Cotacao } from "@/hooks/useSupabaseData";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProdutorStats {
  nome: string;
  totalDistinct: number;
  emCotacaoDistinct: number;
  fechadasDistinct: number;
  declinadasDistinct: number;
  premioTotal: number;
  premioEmAberto: number;
  ticketMedio: number;
  taxaConversao: number;
  cotacoesFechadas: Cotacao[];
  cotacoesEmAberto: Cotacao[];
}

interface TopProdutoresModalProps {
  open: boolean;
  onClose: () => void;
  produtores: ProdutorStats[];
  formatCurrency: (value: number) => string;
  formatDate: (date: string) => string;
}

export function TopProdutoresModal({
  open,
  onClose,
  produtores,
  formatCurrency,
  formatDate,
}: TopProdutoresModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Ranking de Produtores - Análise Detalhada
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {produtores.map((produtor, index) => (
              <div
                key={produtor.nome}
                className="p-4 border rounded-lg bg-muted/30"
              >
                {/* Header */}
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                      index === 0
                        ? "bg-amber-500 text-amber-950"
                        : index === 1
                          ? "bg-slate-400 text-slate-950"
                          : index === 2
                            ? "bg-amber-700 text-amber-100"
                            : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{produtor.nome}</h3>
                    <p className="text-sm text-muted-foreground">
                      {produtor.totalDistinct} clientes distintos no período
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary">
                      {formatCurrency(produtor.premioTotal)}
                    </div>
                    <p className="text-xs text-muted-foreground">Prêmio Fechado</p>
                  </div>
                </div>

                {/* KPIs Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="p-3 bg-background rounded-lg text-center">
                    <div className="flex items-center justify-center gap-1 text-success mb-1">
                      <Target className="h-4 w-4" />
                      <span className="text-2xl font-bold">{produtor.fechadasDistinct}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Fechados</p>
                  </div>
                  <div className="p-3 bg-background rounded-lg text-center">
                    <div className="flex items-center justify-center gap-1 text-brand-orange mb-1">
                      <FileText className="h-4 w-4" />
                      <span className="text-2xl font-bold">{produtor.emCotacaoDistinct}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Em Aberto</p>
                  </div>
                  <div className="p-3 bg-background rounded-lg text-center">
                    <div className="flex items-center justify-center gap-1 text-destructive mb-1">
                      <TrendingDown className="h-4 w-4" />
                      <span className="text-2xl font-bold">{produtor.declinadasDistinct}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Declinados</p>
                  </div>
                  <div className="p-3 bg-background rounded-lg text-center">
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

                {/* Additional Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 text-sm">
                  <div className="p-2 bg-background/50 rounded flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">Ticket Médio</p>
                      <p className="font-semibold">{formatCurrency(produtor.ticketMedio)}</p>
                    </div>
                  </div>
                  <div className="p-2 bg-background/50 rounded flex items-center gap-2">
                    <Clock className="h-4 w-4 text-brand-orange" />
                    <div>
                      <p className="text-muted-foreground text-xs">Prêmio em Aberto</p>
                      <p className="font-semibold text-brand-orange">{formatCurrency(produtor.premioEmAberto)}</p>
                    </div>
                  </div>
                  <div className="p-2 bg-background/50 rounded flex items-center gap-2">
                    <Target className="h-4 w-4 text-success" />
                    <div>
                      <p className="text-muted-foreground text-xs">Potencial Total</p>
                      <p className="font-semibold">{formatCurrency(produtor.premioTotal + produtor.premioEmAberto)}</p>
                    </div>
                  </div>
                </div>

                {/* Recent Closings */}
                {produtor.cotacoesFechadas.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium mb-2">Últimos Fechamentos</p>
                    <div className="space-y-2">
                      {produtor.cotacoesFechadas.slice(0, 5).map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between text-sm p-2 bg-background/50 rounded"
                        >
                          <div className="flex-1">
                            <p className="font-medium truncate">{c.segurado}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.ramo?.descricao || "N/A"} • {c.data_fechamento ? formatDate(c.data_fechamento) : "N/A"}
                            </p>
                          </div>
                          <Badge variant="success-alt" className="ml-2">
                            {formatCurrency(c.valor_premio)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Open Quotes Preview */}
                {produtor.cotacoesEmAberto.length > 0 && (
                  <div className="border-t pt-3 mt-3">
                    <p className="text-sm font-medium mb-2">Cotações em Aberto</p>
                    <div className="space-y-2">
                      {produtor.cotacoesEmAberto.slice(0, 3).map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between text-sm p-2 bg-background/50 rounded"
                        >
                          <div className="flex-1">
                            <p className="font-medium truncate">{c.segurado}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.ramo?.descricao || "N/A"}
                            </p>
                          </div>
                          <Badge variant="brand-orange" className="ml-2">
                            {formatCurrency(c.valor_premio)}
                          </Badge>
                        </div>
                      ))}
                      {produtor.cotacoesEmAberto.length > 3 && (
                        <p className="text-xs text-muted-foreground text-center">
                          E mais {produtor.cotacoesEmAberto.length - 3} cotações em aberto...
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
