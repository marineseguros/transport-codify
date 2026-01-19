import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, Loader2, ChevronDown, ChevronRight, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DatePickerInputString } from "@/components/ui/date-picker-input";

interface ExportCotacoesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Define all available columns grouped by category
const COLUMN_GROUPS = {
  "Dados Principais": [
    { key: "numero_cotacao", label: "Número Cotação" },
    { key: "data_cotacao", label: "Data Cotação" },
    { key: "data_fechamento", label: "Data Fechamento" },
    { key: "inicio_vigencia", label: "Início Vigência" },
    { key: "fim_vigencia", label: "Fim Vigência" },
    { key: "segurado", label: "Segurado" },
    { key: "cpf_cnpj", label: "CPF/CNPJ" },
    { key: "status", label: "Status" },
    { key: "valor_premio", label: "Valor Prêmio" },
    { key: "segmento", label: "Segmento" },
    { key: "tipo", label: "Tipo" },
    { key: "num_proposta", label: "Nº Proposta" },
    { key: "motivo_recusa", label: "Motivo Recusa" },
    { key: "observacoes", label: "Observações" },
    { key: "comentarios", label: "Comentários" },
  ],
  "Unidade": [
    { key: "unidade_codigo", label: "Unidade Código" },
    { key: "unidade_descricao", label: "Unidade Descrição" },
  ],
  "Produtor Origem": [
    { key: "produtor_origem_nome", label: "Produtor Origem" },
    { key: "produtor_origem_email", label: "Produtor Origem Email" },
    { key: "produtor_origem_codigo", label: "Produtor Origem Código" },
  ],
  "Produtor Negociador": [
    { key: "produtor_negociador_nome", label: "Produtor Negociador" },
    { key: "produtor_negociador_email", label: "Produtor Negociador Email" },
    { key: "produtor_negociador_codigo", label: "Produtor Negociador Código" },
  ],
  "Produtor Cotador": [
    { key: "produtor_cotador_nome", label: "Produtor Cotador" },
    { key: "produtor_cotador_email", label: "Produtor Cotador Email" },
    { key: "produtor_cotador_codigo", label: "Produtor Cotador Código" },
  ],
  "Seguradora": [
    { key: "seguradora_nome", label: "Seguradora" },
    { key: "seguradora_codigo", label: "Seguradora Código" },
  ],
  "Ramo": [
    { key: "ramo_codigo", label: "Ramo Código" },
    { key: "ramo_descricao", label: "Ramo Descrição" },
    { key: "ramo_agrupado", label: "Ramo Agrupado" },
    { key: "ramo_segmento", label: "Ramo Segmento" },
  ],
  "Captação e Status": [
    { key: "captacao", label: "Captação" },
    { key: "status_seguradora_descricao", label: "Status Seguradora" },
    { key: "status_seguradora_codigo", label: "Status Seguradora Código" },
  ],
  "Cliente": [
    { key: "cliente_email", label: "Cliente Email" },
    { key: "cliente_telefone", label: "Cliente Telefone" },
    { key: "cliente_endereco", label: "Cliente Endereço" },
    { key: "cliente_cidade", label: "Cliente Cidade" },
    { key: "cliente_uf", label: "Cliente UF" },
    { key: "cliente_cep", label: "Cliente CEP" },
  ],
  "Metadados": [
    { key: "created_at", label: "Criado em" },
    { key: "updated_at", label: "Atualizado em" },
    { key: "modulo", label: "Módulo" },
  ],
};

// Get all column keys
const ALL_COLUMN_KEYS = Object.values(COLUMN_GROUPS).flatMap(cols => cols.map(c => c.key));

type TipoRelatorio = "negocio_fechado" | "em_cotacao" | "declinados";

export function ExportCotacoesModal({ open, onOpenChange }: ExportCotacoesModalProps) {
  const [tipoRelatorio, setTipoRelatorio] = useState<TipoRelatorio>("negocio_fechado");
  const [criterio, setCriterio] = useState<string>("data_fechamento");

  // When report type changes, update criteria accordingly
  React.useEffect(() => {
    if (tipoRelatorio === "em_cotacao" || tipoRelatorio === "declinados") {
      setCriterio("data_cotacao");
    }
  }, [tipoRelatorio]);
  const [tipoPeriodo, setTipoPeriodo] = useState<string>("mes_ano");
  const [ano, setAno] = useState<string>("");
  const [mes, setMes] = useState<string>("");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [produtorId, setProdutorId] = useState<string>("todos");
  const [unidadeId, setUnidadeId] = useState<string>("todos");
  const [loading, setLoading] = useState(false);
  const [produtores, setProdutores] = useState<{ id: string; nome: string }[]>([]);
  const [unidades, setUnidades] = useState<{ id: string; descricao: string }[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set(ALL_COLUMN_KEYS));
  const [columnsExpanded, setColumnsExpanded] = useState(false);

  // Load produtores and unidades on mount
  React.useEffect(() => {
    if (open) {
      loadFilters();
      // Reset columns to all selected when modal opens
      setSelectedColumns(new Set(ALL_COLUMN_KEYS));
    }
  }, [open]);

  const loadFilters = async () => {
    const [produtoresRes, unidadesRes] = await Promise.all([
      supabase.from("produtores").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("unidades").select("id, descricao").eq("ativo", true).order("descricao"),
    ]);

    if (produtoresRes.data) setProdutores(produtoresRes.data);
    if (unidadesRes.data) setUnidades(unidadesRes.data);
  };

  // Generate years (current year and 5 years back)
  const anos = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => currentYear - i);
  }, []);

  const meses = [
    { value: "01", label: "Janeiro" },
    { value: "02", label: "Fevereiro" },
    { value: "03", label: "Março" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Maio" },
    { value: "06", label: "Junho" },
    { value: "07", label: "Julho" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  const toggleColumn = (key: string) => {
    setSelectedColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const toggleGroup = (groupName: string) => {
    const groupColumns = COLUMN_GROUPS[groupName as keyof typeof COLUMN_GROUPS];
    const groupKeys = groupColumns.map(c => c.key);
    const allSelected = groupKeys.every(key => selectedColumns.has(key));
    
    setSelectedColumns(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        groupKeys.forEach(key => newSet.delete(key));
      } else {
        groupKeys.forEach(key => newSet.add(key));
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedColumns(new Set(ALL_COLUMN_KEYS));
  };

  const selectNone = () => {
    setSelectedColumns(new Set());
  };

  const getColumnValue = (cotacao: any, key: string): string => {
    const map: Record<string, () => string> = {
      numero_cotacao: () => cotacao.numero_cotacao,
      data_cotacao: () => formatDate(cotacao.data_cotacao),
      data_fechamento: () => formatDate(cotacao.data_fechamento),
      inicio_vigencia: () => formatDate(cotacao.inicio_vigencia),
      fim_vigencia: () => formatDate(cotacao.fim_vigencia),
      segurado: () => cotacao.segurado,
      cpf_cnpj: () => cotacao.cpf_cnpj,
      status: () => cotacao.status,
      valor_premio: () => cotacao.valor_premio?.toString() || "",
      segmento: () => cotacao.segmento || "",
      tipo: () => cotacao.tipo || "",
      num_proposta: () => cotacao.num_proposta || "",
      motivo_recusa: () => cotacao.motivo_recusa || "",
      observacoes: () => cotacao.observacoes || "",
      comentarios: () => cotacao.comentarios || "",
      unidade_codigo: () => cotacao.unidade?.codigo || "",
      unidade_descricao: () => cotacao.unidade?.descricao || "",
      produtor_origem_nome: () => cotacao.produtor_origem?.nome || "",
      produtor_origem_email: () => cotacao.produtor_origem?.email || "",
      produtor_origem_codigo: () => cotacao.produtor_origem?.codigo_prod || "",
      produtor_negociador_nome: () => cotacao.produtor_negociador?.nome || "",
      produtor_negociador_email: () => cotacao.produtor_negociador?.email || "",
      produtor_negociador_codigo: () => cotacao.produtor_negociador?.codigo_prod || "",
      produtor_cotador_nome: () => cotacao.produtor_cotador?.nome || "",
      produtor_cotador_email: () => cotacao.produtor_cotador?.email || "",
      produtor_cotador_codigo: () => cotacao.produtor_cotador?.codigo_prod || "",
      seguradora_nome: () => cotacao.seguradora?.nome || "",
      seguradora_codigo: () => cotacao.seguradora?.codigo || "",
      ramo_codigo: () => cotacao.ramo?.codigo || "",
      ramo_descricao: () => cotacao.ramo?.descricao || "",
      ramo_agrupado: () => cotacao.ramo?.ramo_agrupado || "",
      ramo_segmento: () => cotacao.ramo?.segmento || "",
      captacao: () => cotacao.captacao?.descricao || "",
      status_seguradora_descricao: () => cotacao.status_seguradora?.descricao || "",
      status_seguradora_codigo: () => cotacao.status_seguradora?.codigo || "",
      cliente_email: () => cotacao.cliente?.email || "",
      cliente_telefone: () => cotacao.cliente?.telefone || "",
      cliente_endereco: () => cotacao.cliente?.endereco || "",
      cliente_cidade: () => cotacao.cliente?.cidade || "",
      cliente_uf: () => cotacao.cliente?.uf || "",
      cliente_cep: () => cotacao.cliente?.cep || "",
      created_at: () => formatDateTime(cotacao.created_at),
      updated_at: () => formatDateTime(cotacao.updated_at),
      modulo: () => cotacao.modulo || "",
    };
    return map[key]?.() || "";
  };

  const getColumnLabel = (key: string): string => {
    for (const group of Object.values(COLUMN_GROUPS)) {
      const col = group.find(c => c.key === key);
      if (col) return col.label;
    }
    return key;
  };

  const handleExport = async () => {
    if (selectedColumns.size === 0) {
      toast.warning("Selecione pelo menos uma coluna para exportar");
      return;
    }

    setLoading(true);
    try {
      // Build query
      let query = supabase
        .from("cotacoes")
        .select(`
          *,
          produtor_origem:produtores!cotacoes_produtor_origem_id_fkey(id, nome, email, telefone, codigo_prod),
          produtor_negociador:produtores!cotacoes_produtor_negociador_id_fkey(id, nome, email, telefone, codigo_prod),
          produtor_cotador:produtores!cotacoes_produtor_cotador_id_fkey(id, nome, email, telefone, codigo_prod),
          seguradora:seguradoras(id, nome, codigo),
          cliente:clientes(id, segurado, cpf_cnpj, email, telefone, endereco, cidade, uf, cep),
          ramo:ramos(id, codigo, descricao, ramo_agrupado, segmento),
          captacao:captacao(id, descricao),
          status_seguradora:status_seguradora(id, descricao, codigo),
          unidade:unidades(id, codigo, descricao)
        `);

      // Apply status filter based on report type
      if (tipoRelatorio === "negocio_fechado") {
        query = query.in("status", ["Negócio fechado", "Fechamento congênere"]);
      } else if (tipoRelatorio === "em_cotacao") {
        query = query.eq("status", "Em cotação");
      } else if (tipoRelatorio === "declinados") {
        query = query.eq("status", "Declinado");
      }

      // Apply date filter based on period type
      if (tipoPeriodo === "personalizado" && dataInicio && dataFim) {
        if (criterio === "data_fechamento") {
          query = query.gte("data_fechamento", dataInicio).lte("data_fechamento", dataFim);
        } else if (criterio === "inicio_vigencia") {
          query = query.gte("inicio_vigencia", dataInicio).lte("inicio_vigencia", dataFim);
        } else if (criterio === "data_cotacao") {
          query = query.gte("data_cotacao", dataInicio).lte("data_cotacao", dataFim);
        }
      } else if (tipoPeriodo === "mes_ano") {
        if (ano && mes) {
          const startDate = `${ano}-${mes}-01`;
          const lastDay = new Date(parseInt(ano), parseInt(mes), 0).getDate();
          const endDate = `${ano}-${mes}-${String(lastDay).padStart(2, "0")}`;

          if (criterio === "data_fechamento") {
            query = query.gte("data_fechamento", startDate).lte("data_fechamento", endDate);
          } else if (criterio === "inicio_vigencia") {
            query = query.gte("inicio_vigencia", startDate).lte("inicio_vigencia", endDate);
          } else if (criterio === "data_cotacao") {
            query = query.gte("data_cotacao", startDate).lte("data_cotacao", endDate);
          }
        } else if (ano && ano !== "todos") {
          const startDate = `${ano}-01-01`;
          const endDate = `${ano}-12-31`;

          if (criterio === "data_fechamento") {
            query = query.gte("data_fechamento", startDate).lte("data_fechamento", endDate);
          } else if (criterio === "inicio_vigencia") {
            query = query.gte("inicio_vigencia", startDate).lte("inicio_vigencia", endDate);
          } else if (criterio === "data_cotacao") {
            query = query.gte("data_cotacao", startDate).lte("data_cotacao", endDate);
          }
        }
      }

      // Apply produtor filter (check all three produtor fields)
      if (produtorId && produtorId !== "todos") {
        query = query.or(
          `produtor_origem_id.eq.${produtorId},produtor_negociador_id.eq.${produtorId},produtor_cotador_id.eq.${produtorId}`
        );
      }

      // Apply unidade filter
      if (unidadeId && unidadeId !== "todos") {
        query = query.eq("unidade_id", unidadeId);
      }

      const { data, error } = await query.order("numero_cotacao", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.warning("Nenhuma cotação encontrada com os filtros selecionados");
        setLoading(false);
        return;
      }

      // Format data for Excel - only include selected columns
      const orderedKeys = ALL_COLUMN_KEYS.filter(key => selectedColumns.has(key));
      
      const excelData = data.map((cotacao) => {
        const row: Record<string, string> = {};
        orderedKeys.forEach(key => {
          row[getColumnLabel(key)] = getColumnValue(cotacao, key);
        });
        return row;
      });

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Auto-width columns
      const colWidths = Object.keys(excelData[0] || {}).map((key) => ({
        wch: Math.max(key.length, 15),
      }));
      ws["!cols"] = colWidths;

      // Get sheet name based on report type
      const sheetName = tipoRelatorio === "negocio_fechado" 
        ? "Negócio Fechado" 
        : tipoRelatorio === "em_cotacao" 
          ? "Em Cotação" 
          : "Declinados";

      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Generate filename
      const tipoLabel = tipoRelatorio === "negocio_fechado" 
        ? "NegocioFechado" 
        : tipoRelatorio === "em_cotacao" 
          ? "EmCotacao" 
          : "Declinados";
      const criterioLabel = criterio === "data_fechamento" 
        ? "Fechamento" 
        : criterio === "inicio_vigencia" 
          ? "InicioVigencia" 
          : "DataCotacao";
      const periodoLabel = tipoPeriodo === "personalizado" 
        ? `${dataInicio}_${dataFim}` 
        : ano && ano !== "todos" 
          ? (mes ? `${ano}-${mes}` : ano) 
          : "Todos";
      const filename = `Cotacoes_${tipoLabel}_${criterioLabel}_${periodoLabel}_${new Date().toISOString().split("T")[0]}.xlsx`;

      // Download
      XLSX.writeFile(wb, filename);

      toast.success(`${data.length} cotações exportadas com sucesso!`);
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error("Erro ao exportar cotações");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString("pt-BR");
  };

  const selectedCount = selectedColumns.size;
  const totalCount = ALL_COLUMN_KEYS.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Cotações
          </DialogTitle>
          <DialogDescription>
            Selecione o tipo de relatório, filtros e colunas para exportar
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 py-4">
            {/* Tipo de Relatório */}
            <div className="space-y-2">
              <Label>Tipo de Relatório</Label>
              <Select value={tipoRelatorio} onValueChange={(v) => setTipoRelatorio(v as TipoRelatorio)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                  <SelectItem value="negocio_fechado">Negócio Fechado</SelectItem>
                  <SelectItem value="em_cotacao">Em Cotação</SelectItem>
                  <SelectItem value="declinados">Declinados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Critério - Only show options based on report type */}
            <div className="space-y-2">
              <Label>Critério de Data</Label>
              {tipoRelatorio === "negocio_fechado" ? (
                <Select value={criterio} onValueChange={setCriterio}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o critério" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    <SelectItem value="data_cotacao">Data da Cotação</SelectItem>
                    <SelectItem value="data_fechamento">Data de Fechamento</SelectItem>
                    <SelectItem value="inicio_vigencia">Início de Vigência</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                  Data da Cotação
                </div>
              )}
            </div>

            {/* Tipo de Período */}
            <div className="space-y-2">
              <Label>Tipo de Período</Label>
              <Select value={tipoPeriodo} onValueChange={setTipoPeriodo}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                  <SelectItem value="mes_ano">Mês/Ano</SelectItem>
                  <SelectItem value="personalizado">Período Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Período - Mês/Ano */}
            {tipoPeriodo === "mes_ano" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Ano</Label>
                  <Select value={ano} onValueChange={setAno}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4}>
                      <SelectItem value="todos">Todos</SelectItem>
                      {anos.map((a) => (
                        <SelectItem key={a} value={String(a)}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Mês</Label>
                  <Select value={mes} onValueChange={setMes} disabled={!ano || ano === "todos"}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4}>
                      <SelectItem value="todos">Todos</SelectItem>
                      {meses.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Período - Personalizado */}
            {tipoPeriodo === "personalizado" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Data Início
                  </Label>
                  <DatePickerInputString
                    value={dataInicio}
                    onChange={(date) => setDataInicio(date || "")}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Data Fim
                  </Label>
                  <DatePickerInputString
                    value={dataFim}
                    onChange={(date) => setDataFim(date || "")}
                  />
                </div>
              </div>
            )}

            {/* Produtor */}
            <div className="space-y-2">
              <Label>Produtor</Label>
              <Select value={produtorId} onValueChange={setProdutorId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos os produtores" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                  <SelectItem value="todos">Todos os produtores</SelectItem>
                  {produtores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Unidade */}
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select value={unidadeId} onValueChange={setUnidadeId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas as unidades" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                  <SelectItem value="todos">Todas as unidades</SelectItem>
                  {unidades.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Column Selection */}
            <Collapsible open={columnsExpanded} onOpenChange={setColumnsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    {columnsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    Colunas para exportar
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {selectedCount} de {totalCount} selecionadas
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="border rounded-md p-3 space-y-3">
                  {/* Quick actions */}
                  <div className="flex gap-2 pb-2 border-b">
                    <Button variant="ghost" size="sm" onClick={selectAll}>
                      Selecionar todas
                    </Button>
                    <Button variant="ghost" size="sm" onClick={selectNone}>
                      Limpar seleção
                    </Button>
                  </div>

                  {/* Column groups */}
                  <div className="space-y-3 max-h-[250px] overflow-y-auto">
                    {Object.entries(COLUMN_GROUPS).map(([groupName, columns]) => {
                      const groupKeys = columns.map(c => c.key);
                      const allSelected = groupKeys.every(key => selectedColumns.has(key));
                      const someSelected = groupKeys.some(key => selectedColumns.has(key));

                      return (
                        <div key={groupName} className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`group-${groupName}`}
                              checked={allSelected}
                              ref={(el) => {
                                if (el) {
                                  (el as any).indeterminate = someSelected && !allSelected;
                                }
                              }}
                              onCheckedChange={() => toggleGroup(groupName)}
                            />
                            <Label
                              htmlFor={`group-${groupName}`}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {groupName}
                            </Label>
                          </div>
                          <div className="ml-6 grid grid-cols-2 gap-1">
                            {columns.map((col) => (
                              <div key={col.key} className="flex items-center gap-2">
                                <Checkbox
                                  id={col.key}
                                  checked={selectedColumns.has(col.key)}
                                  onCheckedChange={() => toggleColumn(col.key)}
                                />
                                <Label
                                  htmlFor={col.key}
                                  className="text-xs cursor-pointer text-muted-foreground"
                                >
                                  {col.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={loading || selectedColumns.size === 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportar Excel
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
