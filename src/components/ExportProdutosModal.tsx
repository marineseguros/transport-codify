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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ExportProdutosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Define all available columns
const COLUMN_GROUPS = {
  "Dados Principais": [
    { key: "segurado", label: "Segurado" },
    { key: "consultor", label: "Consultor" },
    { key: "data_registro", label: "Data do Registro" },
    { key: "tipo", label: "Tipo" },
    { key: "subtipo", label: "Subtipo" },
    { key: "observacao", label: "Observação" },
  ],
  "Indicação": [
    { key: "tipo_indicacao", label: "Tipo de Indicação" },
    { key: "cliente_indicado", label: "Cliente Indicado" },
  ],
  "Visita/Vídeo": [
    { key: "cidade", label: "Cidade" },
    { key: "data_realizada", label: "Data Realizada" },
  ],
  "Metadados": [
    { key: "created_at", label: "Criado em" },
    { key: "updated_at", label: "Atualizado em" },
    { key: "modulo", label: "Módulo" },
  ],
};

// Get all column keys
const ALL_COLUMN_KEYS = Object.values(COLUMN_GROUPS).flatMap(cols => cols.map(c => c.key));

type TipoRelatorio = "geral" | "coleta" | "indicacao" | "novos_crm" | "visita_video";

export function ExportProdutosModal({ open, onOpenChange }: ExportProdutosModalProps) {
  const [tipoRelatorio, setTipoRelatorio] = useState<TipoRelatorio>("geral");
  const [tipoPeriodo, setTipoPeriodo] = useState<string>("mes_ano");
  const [ano, setAno] = useState<string>("");
  const [mes, setMes] = useState<string>("");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [consultor, setConsultor] = useState<string>("todos");
  const [loading, setLoading] = useState(false);
  const [consultores, setConsultores] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set(ALL_COLUMN_KEYS));
  const [columnsExpanded, setColumnsExpanded] = useState(false);

  // Load consultores on mount
  React.useEffect(() => {
    if (open) {
      loadFilters();
      setSelectedColumns(new Set(ALL_COLUMN_KEYS));
    }
  }, [open]);

  const loadFilters = async () => {
    const { data } = await supabase
      .from("produtos")
      .select("consultor")
      .order("consultor");
    
    if (data) {
      const uniqueConsultores = [...new Set(data.map(p => p.consultor))];
      setConsultores(uniqueConsultores);
    }
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

  const formatDateValue = (dateString?: string | null) => {
    if (!dateString) return "";
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleString("pt-BR");
    } catch {
      return dateString;
    }
  };

  const getColumnValue = (produto: any, key: string): string => {
    const map: Record<string, () => string> = {
      segurado: () => produto.segurado || "",
      consultor: () => produto.consultor || "",
      data_registro: () => formatDateValue(produto.data_registro),
      tipo: () => produto.tipo || "",
      subtipo: () => produto.subtipo || "",
      observacao: () => produto.observacao || "",
      tipo_indicacao: () => produto.tipo_indicacao || "",
      cliente_indicado: () => produto.cliente_indicado || "",
      cidade: () => produto.cidade || "",
      data_realizada: () => formatDateValue(produto.data_realizada),
      created_at: () => formatDateTime(produto.created_at),
      updated_at: () => formatDateTime(produto.updated_at),
      modulo: () => produto.modulo || "",
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
      let query = supabase
        .from("produtos")
        .select("*");

      // Apply tipo filter based on report type
      if (tipoRelatorio === "coleta") {
        query = query.eq("tipo", "Coleta");
      } else if (tipoRelatorio === "indicacao") {
        query = query.eq("tipo", "Indicação");
      } else if (tipoRelatorio === "novos_crm") {
        query = query.eq("tipo", "Novos CRM");
      } else if (tipoRelatorio === "visita_video") {
        query = query.eq("tipo", "Visita/Video");
      }

      // Apply date filter
      if (tipoPeriodo === "personalizado" && dataInicio && dataFim) {
        query = query.gte("data_registro", dataInicio).lte("data_registro", dataFim);
      } else if (tipoPeriodo === "mes_ano") {
        if (ano && mes && ano !== "todos") {
          const startDate = `${ano}-${mes}-01`;
          const lastDay = new Date(parseInt(ano), parseInt(mes), 0).getDate();
          const endDate = `${ano}-${mes}-${String(lastDay).padStart(2, "0")}`;
          query = query.gte("data_registro", startDate).lte("data_registro", endDate);
        } else if (ano && ano !== "todos") {
          const startDate = `${ano}-01-01`;
          const endDate = `${ano}-12-31`;
          query = query.gte("data_registro", startDate).lte("data_registro", endDate);
        }
      }

      // Apply consultor filter
      if (consultor && consultor !== "todos") {
        query = query.eq("consultor", consultor);
      }

      const { data, error } = await query.order("data_registro", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.warning("Nenhum produto encontrado com os filtros selecionados");
        setLoading(false);
        return;
      }

      // Format data for Excel - only include selected columns
      const orderedKeys = ALL_COLUMN_KEYS.filter(key => selectedColumns.has(key));
      
      const excelData = data.map((produto) => {
        const row: Record<string, string> = {};
        orderedKeys.forEach(key => {
          row[getColumnLabel(key)] = getColumnValue(produto, key);
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
      const sheetNames: Record<TipoRelatorio, string> = {
        geral: "Produtos",
        coleta: "Coleta",
        indicacao: "Indicação",
        novos_crm: "Novos CRM",
        visita_video: "Visita-Video",
      };

      XLSX.utils.book_append_sheet(wb, ws, sheetNames[tipoRelatorio]);

      // Generate filename
      const tipoLabels: Record<TipoRelatorio, string> = {
        geral: "Geral",
        coleta: "Coleta",
        indicacao: "Indicacao",
        novos_crm: "NovosCRM",
        visita_video: "VisitaVideo",
      };
      const periodoLabel = tipoPeriodo === "personalizado" 
        ? `${dataInicio}_${dataFim}` 
        : ano && ano !== "todos" 
          ? (mes ? `${ano}-${mes}` : ano) 
          : "Todos";
      const filename = `Produtos_${tipoLabels[tipoRelatorio]}_${periodoLabel}_${new Date().toISOString().split("T")[0]}.xlsx`;

      // Download
      XLSX.writeFile(wb, filename);

      toast.success(`${data.length} produtos exportados com sucesso!`);
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error("Erro ao exportar produtos");
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = selectedColumns.size;
  const totalCount = ALL_COLUMN_KEYS.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Produtos
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
                  <SelectItem value="geral">Relatório Geral</SelectItem>
                  <SelectItem value="coleta">Coleta</SelectItem>
                  <SelectItem value="indicacao">Indicação</SelectItem>
                  <SelectItem value="novos_crm">Novos CRM</SelectItem>
                  <SelectItem value="visita_video">Visita/Vídeo</SelectItem>
                </SelectContent>
              </Select>
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

            {/* Consultor */}
            <div className="space-y-2">
              <Label>Consultor</Label>
              <Select value={consultor} onValueChange={setConsultor}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos os consultores" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                  <SelectItem value="todos">Todos os consultores</SelectItem>
                  {consultores.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
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
                              id={`group-produtos-${groupName}`}
                              checked={allSelected}
                              ref={(el) => {
                                if (el) {
                                  (el as any).indeterminate = someSelected && !allSelected;
                                }
                              }}
                              onCheckedChange={() => toggleGroup(groupName)}
                            />
                            <Label
                              htmlFor={`group-produtos-${groupName}`}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {groupName}
                            </Label>
                          </div>
                          <div className="ml-6 grid grid-cols-2 gap-1">
                            {columns.map((col) => (
                              <div key={col.key} className="flex items-center gap-2">
                                <Checkbox
                                  id={`produtos-${col.key}`}
                                  checked={selectedColumns.has(col.key)}
                                  onCheckedChange={() => toggleColumn(col.key)}
                                />
                                <Label
                                  htmlFor={`produtos-${col.key}`}
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
