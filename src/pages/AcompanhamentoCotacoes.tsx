import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCotacoesAcompanhamento, useProdutores, type Cotacao } from "@/hooks/useSupabaseData";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, AlertTriangle, Pencil, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CotacaoModal } from "@/components/CotacaoModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const {
    user
  } = useAuth();
  const {
    cotacoes,
    loading,
    refetch
  } = useCotacoesAcompanhamento(user?.email, user?.papel);
  const { produtores } = useProdutores();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCotacao, setEditingCotacao] = useState<Cotacao | null>(null);
  const [selectedProdutorId, setSelectedProdutorId] = useState<string>("todos");
  const [diasFilter, setDiasFilter] = useState<string>("todos"); // "todos", "0-3", "4-7", "8-14", "15+"

  // Verificar se o usuário é admin/gerente/ceo
  const isAdminRole = user?.papel && ['Administrador', 'Gerente', 'CEO'].includes(user.papel);

  // Processar e agrupar cotações por segurado
  const acompanhamentos: AcompanhamentoSegurado[] = (() => {
    if (!cotacoes || cotacoes.length === 0) return [];

    // Filtrar cotações por produtor selecionado (apenas para admins)
    let cotacoesFiltradas = cotacoes;
    if (isAdminRole && selectedProdutorId !== "todos") {
      cotacoesFiltradas = cotacoes.filter(c => 
        c.produtor_origem_id === selectedProdutorId ||
        c.produtor_negociador_id === selectedProdutorId ||
        c.produtor_cotador_id === selectedProdutorId
      );
    }

    // Agrupar por CPF/CNPJ
    const grouped = cotacoesFiltradas.reduce((acc, cotacao) => {
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
      const sorted = [...cotacoesGrupo].sort((a, b) => new Date(a.data_cotacao).getTime() - new Date(b.data_cotacao).getTime());
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
          status: c.status
        }))
      };
    });

    // Ordenar por dias em aberto (decrescente)
    let sortedResult = result.sort((a, b) => b.diasEmAberto - a.diasEmAberto);

    // Aplicar filtro de dias
    if (diasFilter !== "todos") {
      sortedResult = sortedResult.filter(item => {
        if (diasFilter === "0-3") return item.diasEmAberto <= 3;
        if (diasFilter === "4-7") return item.diasEmAberto >= 4 && item.diasEmAberto <= 7;
        if (diasFilter === "8-14") return item.diasEmAberto >= 8 && item.diasEmAberto <= 14;
        if (diasFilter === "15+") return item.diasEmAberto > 14;
        return true;
      });
    }

    return sortedResult;
  })();
  const getAlertVariant = (dias: number): {
    variant: "default" | "secondary" | "destructive" | "outline" | "brand-orange" | "success-alt" | "warning";
    showIcon: boolean;
  } => {
    if (dias <= 3) return {
      variant: "success-alt",
      showIcon: false
    };
    if (dias <= 7) return {
      variant: "warning",
      showIcon: false
    };
    if (dias <= 14) return {
      variant: "brand-orange",
      showIcon: false
    };
    return {
      variant: "destructive",
      showIcon: true
    };
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
      currency: "BRL"
    }).format(value);
  };
  const handleEditCotacao = (cotacaoId: string) => {
    const cotacaoCompleta = cotacoes?.find(c => c.id === cotacaoId);
    if (cotacaoCompleta) {
      setEditingCotacao(cotacaoCompleta);
      setIsModalOpen(true);
    }
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCotacao(null);
  };
  const handleSaved = async () => {
    // Refetch data to update the list with latest changes
    await refetch();
    handleCloseModal();
  };
  if (loading) {
    return <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Clock className="h-7 w-7 md:h-8 md:w-8" />
            Acompanhamento de Cotações
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitoramento de cotações em aberto por segurado
          </p>
        </div>
        <div className="flex items-center gap-6">
          {isAdminRole && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Filtrar por Produtor</label>
              <Select value={selectedProdutorId} onValueChange={setSelectedProdutorId}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="Todos os produtores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os produtores</SelectItem>
                  {produtores.filter(p => p.ativo).map(produtor => (
                    <SelectItem key={produtor.id} value={produtor.id}>
                      {produtor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total de segurados</p>
            <p className="text-2xl font-bold">{acompanhamentos.length}</p>
          </div>
        </div>
      </div>

      {/* Card de Objetivo */}
      <Card className="border-l-4 border-l-primary bg-accent/30">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <AlertTriangle className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">Objetivo desta página</h3>
              <p className="text-sm text-foreground/90 mb-3">
                Servir como lembrete para evitar cotações paradas em "Em Cotação" e incentivar atualizações constantes.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>Atualize o status assim que houver retorno das seguradoras</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Legenda de cores - agora com filtros clicáveis */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-sm font-medium">Legenda (clique para filtrar):</span>
          <div className="flex flex-wrap items-center gap-2">
            <Badge 
              variant={diasFilter === "todos" ? "default" : "outline"}
              className="cursor-pointer transition-all hover:scale-105 hover:shadow-md px-4 py-2 text-sm"
              onClick={() => setDiasFilter("todos")}
            >
              Todos
            </Badge>
            <Badge 
              variant="success-alt"
              className={`cursor-pointer transition-all hover:scale-105 hover:shadow-md px-4 py-2 text-sm ${diasFilter !== "todos" && diasFilter !== "0-3" ? "opacity-50" : ""}`}
              onClick={() => setDiasFilter("0-3")}
            >
              ≤ 3 dias
            </Badge>
            <Badge 
              variant="warning"
              className={`cursor-pointer transition-all hover:scale-105 hover:shadow-md px-4 py-2 text-sm ${diasFilter !== "todos" && diasFilter !== "4-7" ? "opacity-50" : ""}`}
              onClick={() => setDiasFilter("4-7")}
            >
              4-7 dias
            </Badge>
            <Badge 
              variant="alert-orange"
              className={`cursor-pointer transition-all hover:scale-105 hover:shadow-md px-4 py-2 text-sm ${diasFilter !== "todos" && diasFilter !== "8-14" ? "opacity-50" : ""}`}
              onClick={() => setDiasFilter("8-14")}
            >
              8-14 dias
            </Badge>
            <Badge 
              variant="destructive"
              className={`flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 hover:shadow-md px-4 py-2 text-sm ${diasFilter !== "todos" && diasFilter !== "15+" ? "opacity-50" : ""}`}
              onClick={() => setDiasFilter("15+")}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Δ 15 dias
            </Badge>
          </div>
        </div>
      </Card>

      {/* Lista de acompanhamentos */}
      <div className="space-y-3">
        {acompanhamentos.length === 0 ? <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              Nenhuma cotação em aberto no momento.
            </p>
          </Card> : acompanhamentos.map(item => {
        const {
          variant,
          showIcon
        } = getAlertVariant(item.diasEmAberto);
        const isExpanded = expandedRows.has(item.cpfCnpj);
        return <Collapsible key={item.cpfCnpj} open={isExpanded}>
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full py-12 px-6 hover:bg-accent/50 flex items-center justify-between text-left" onClick={() => toggleRow(item.cpfCnpj)}>
                      <div className="flex items-center gap-8 flex-1">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate">
                            {item.segurado}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            CPF/CNPJ: {item.cpfCnpj}
                          </p>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Cotações</p>
                            <p className="text-xl font-bold">{item.quantidadeCotacoes}</p>
                          </div>

                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Início</p>
                            <p className="text-sm font-medium">
                              {format(item.dataInicio, "dd/MM/yyyy", {
                          locale: ptBR
                        })}
                            </p>
                          </div>

                          <div className="text-center min-w-[120px]">
                            <p className="text-sm text-muted-foreground mb-1">Dias em Aberto</p>
                            <Badge variant={variant} className="text-base px-3 py-1">
                              {showIcon && <AlertTriangle className="h-4 w-4 mr-1" />}
                              {item.diasEmAberto} {item.diasEmAberto === 1 ? "dia" : "dias"}
                            </Badge>
                          </div>
                        </div>

                        {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                      </div>
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t">
                      <div className="p-4 bg-muted/30">
                        <h4 className="font-semibold mb-3 text-sm uppercase text-muted-foreground">
                          Cotações em Aberto ({item.quantidadeCotacoes})
                        </h4>
                        <div className="space-y-2">
                          {item.cotacoes.map(cotacao => <div key={cotacao.id} className="bg-background p-3 rounded-lg border flex items-center justify-between">
                              <div className="flex-1 grid grid-cols-4 gap-4">
                                <div>
                                  <p className="text-xs text-muted-foreground">Número</p>
                                  <p className="font-medium">{cotacao.numeroCotacao}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Seguradora</p>
                                  <p className="font-medium">{cotacao.seguradora}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Ramo</p>
                                  <p className="font-medium">{cotacao.ramo}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Valor Prêmio</p>
                                  <p className="font-medium">{formatCurrency(cotacao.valorPremio)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 ml-4">
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">Data</p>
                                  <p className="text-sm font-medium">
                                    {format(cotacao.dataCotacao, "dd/MM/yyyy", {
                              locale: ptBR
                            })}
                                  </p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleEditCotacao(cotacao.id)} className="h-8 w-8">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>)}
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>;
      })}
      </div>

      {/* Modal de Edição */}
      <CotacaoModal isOpen={isModalOpen} onClose={handleCloseModal} cotacao={editingCotacao} mode="edit" onSaved={handleSaved} />
    </div>;
};
export default AcompanhamentoCotacoes;