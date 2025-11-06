import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCotacoesAcompanhamento, type Cotacao } from "@/hooks/useSupabaseData";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, AlertTriangle, Pencil } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CotacaoModal } from "@/components/CotacaoModal";

interface AcompanhamentoSegurado {
  segurado: string;
  cpfCnpj: string;
  quantidadeCotacoes: number;
  dataInicio: Date;
  diasEmAberto: number;
  cotacoes: Array<{
    id: string;
    numeroCotacao: string;
    seguradora: string;
    ramo: string;
    valorPremio: number;
    dataCotacao: Date;
    status: string;
  }>;
}

const AcompanhamentoCotacoes = () => {
  const { user } = useAuth();
  const { cotacoes, loading, refetch } = useCotacoesAcompanhamento();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingCotacao, setEditingCotacao] = useState<Cotacao | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Processar e agrupar cotações por segurado
  const acompanhamentos: AcompanhamentoSegurado[] = (() => {
    if (!cotacoes || cotacoes.length === 0) return [];

    // Agrupar por CPF/CNPJ
    const grouped = cotacoes.reduce((acc, cotacao) => {
      const key = cotacao.cpf_cnpj;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(cotacao);
      return acc;
    }, {} as Record<string, typeof cotacoes>);

    // Criar array de acompanhamentos
    const result = Object.entries(grouped).map(([cpfCnpj, cotacoesGrupo]) => {
      // Ordenar por data para pegar a mais antiga
      const sorted = [...cotacoesGrupo].sort((a, b) => 
        new Date(a.data_cotacao).getTime() - new Date(b.data_cotacao).getTime()
      );
      
      const dataInicio = new Date(sorted[0].data_cotacao);
      const hoje = new Date();
      const diasEmAberto = differenceInDays(hoje, dataInicio);

      return {
        segurado: sorted[0].segurado,
        cpfCnpj,
        quantidadeCotacoes: cotacoesGrupo.length,
        dataInicio,
        diasEmAberto,
        cotacoes: sorted.map(c => ({
          id: c.id,
          numeroCotacao: c.numero_cotacao,
          seguradora: c.seguradora?.nome || "-",
          ramo: c.ramo?.descricao || "-",
          valorPremio: c.valor_premio || 0,
          dataCotacao: new Date(c.data_cotacao),
          status: c.status,
        })),
      };
    });

    // Ordenar por dias em aberto (decrescente)
    return result.sort((a, b) => b.diasEmAberto - a.diasEmAberto);
  })();

  const getAlertVariant = (dias: number): { variant: "default" | "secondary" | "destructive" | "outline" | "brand-orange" | "success-alt"; showIcon: boolean } => {
    if (dias <= 3) return { variant: "success-alt", showIcon: false };
    if (dias <= 7) return { variant: "secondary", showIcon: false };
    if (dias <= 14) return { variant: "brand-orange", showIcon: false };
    return { variant: "destructive", showIcon: true };
  };

  const toggleRow = (cpfCnpj: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(cpfCnpj)) {
      newExpanded.delete(cpfCnpj);
    } else {
      newExpanded.add(cpfCnpj);
    }
    setExpandedRows(newExpanded);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleEditCotacao = (cotacaoId: string) => {
    const cotacao = cotacoes.find(c => c.id === cotacaoId);
    if (cotacao) {
      setEditingCotacao(cotacao);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCotacao(null);
  };

  const handleSaved = () => {
    refetch();
    handleCloseModal();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-8 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Acompanhamento de Cotações</h1>
            <p className="text-muted-foreground mt-2">
              Monitoramento de cotações em aberto por segurado
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total de segurados</p>
            <p className="text-2xl font-bold">{acompanhamentos.length}</p>
          </div>
        </div>

        {/* Legenda de cores */}
        <Card className="p-6">
          <div className="flex flex-wrap gap-6 items-center">
            <span className="text-sm font-semibold">Legenda:</span>
            <div className="flex items-center gap-4">
              <Badge variant="success-alt">≤ 3 dias</Badge>
              <Badge variant="secondary">4-7 dias</Badge>
              <Badge variant="brand-orange">8-14 dias</Badge>
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                &gt; 14 dias
              </Badge>
            </div>
          </div>
        </Card>

        {/* Lista de acompanhamentos */}
        <div className="space-y-4">
          {acompanhamentos.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">
                Nenhuma cotação em aberto no momento.
              </p>
            </Card>
          ) : (
            acompanhamentos.map((item) => {
              const { variant, showIcon } = getAlertVariant(item.diasEmAberto);
              const isExpanded = expandedRows.has(item.cpfCnpj);

              return (
                <Collapsible key={item.cpfCnpj} open={isExpanded}>
                  <Card className="overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full p-6 hover:bg-accent/50 flex items-center justify-between text-left"
                        onClick={() => toggleRow(item.cpfCnpj)}
                      >
                        <div className="flex items-center gap-8 flex-1">
                          <div className="flex-1 min-w-0 max-w-md">
                            <h3 className="font-semibold text-lg truncate">
                              {item.segurado}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              CPF/CNPJ: {item.cpfCnpj}
                            </p>
                          </div>

                          <div className="flex items-center gap-12">
                            <div className="text-center min-w-[100px]">
                              <p className="text-xs text-muted-foreground mb-1">Cotações</p>
                              <p className="text-2xl font-bold">{item.quantidadeCotacoes}</p>
                            </div>

                            <div className="text-center min-w-[120px]">
                              <p className="text-xs text-muted-foreground mb-1">Início</p>
                              <p className="text-sm font-semibold">
                                {format(item.dataInicio, "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            </div>

                            <div className="text-center min-w-[140px]">
                              <p className="text-xs text-muted-foreground mb-2">Dias em Aberto</p>
                              <Badge variant={variant} className="text-base px-4 py-1.5">
                                {showIcon && <AlertTriangle className="h-4 w-4 mr-1.5" />}
                                {item.diasEmAberto} {item.diasEmAberto === 1 ? "dia" : "dias"}
                              </Badge>
                            </div>
                          </div>

                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t">
                        <div className="p-6 bg-muted/30">
                          <h4 className="font-semibold mb-4 text-sm uppercase text-muted-foreground">
                            Cotações em Aberto ({item.quantidadeCotacoes})
                          </h4>
                          <div className="space-y-3">
                            {item.cotacoes.map((cotacao) => (
                              <div
                                key={cotacao.id}
                                className="bg-background p-5 rounded-lg border flex items-center justify-between hover:border-primary/50 transition-colors"
                              >
                                <div className="flex-1 grid grid-cols-5 gap-6">
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Número</p>
                                    <p className="font-semibold">{cotacao.numeroCotacao}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Seguradora</p>
                                    <p className="font-semibold">{cotacao.seguradora}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Ramo</p>
                                    <p className="font-semibold">{cotacao.ramo}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Valor Prêmio</p>
                                    <p className="font-semibold">{formatCurrency(cotacao.valorPremio)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Data</p>
                                    <p className="text-sm font-semibold">
                                      {format(cotacao.dataCotacao, "dd/MM/yyyy", { locale: ptBR })}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="ml-6 flex items-center gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditCotacao(cotacao.id);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                  Editar
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })
          )}
        </div>
      </div>

      {/* Modal de edição */}
      <CotacaoModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        cotacao={editingCotacao}
        mode="edit"
        onSaved={handleSaved}
      />
    </>
  );
};

export default AcompanhamentoCotacoes;
