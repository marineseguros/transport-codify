import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, BarChart3, FileSpreadsheet, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, RefreshCw, Calendar, ListFilter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getRamoGroup, getRegraRamo } from "@/lib/ramoClassification";
import { format, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { DatePickerInput } from "@/components/ui/date-picker-input";

interface CotacoesAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AnalysisType = "finalizadas" | "em_aberto" | "geral";

interface GroupedCotacao {
  cpf_cnpj: string;
  ramo_id: string;
  ramo_descricao: string;
  ramo_group: string;
  segurado: string;
  produtor_cotador_nome: string;
  produtor_cotador_id: string;
  recorrencia: "Recorrente" | "Total";
  mes_inicio: string;
  status_final: string;
  seguradoras: string[];
  cotacao_ids: string[];
  data_cotacao: string;
  data_fechamento: string | null;
  dias_ate_fechamento: number | null;
}

// Status categories
const STATUS_FINALIZADOS = ["Negócio fechado", "Fechamento congênere", "Declinado"];
const STATUS_EM_ABERTO = ["Em cotação"];
const STATUS_TODOS = [...STATUS_FINALIZADOS, ...STATUS_EM_ABERTO];

// Available years for selection (last 5 years)
const getAvailableYears = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => currentYear - i);
};

export function CotacoesAnalysisModal({ open, onOpenChange }: CotacoesAnalysisModalProps) {
  const [analysisType, setAnalysisType] = useState<AnalysisType>("finalizadas");
  const [periodoFilter, setPeriodoFilter] = useState("ano_atual");
  const [produtorFilter, setProdutorFilter] = useState("todos");
  const [ramoFilter, setRamoFilter] = useState("todos");
  const [grupoFilter, setGrupoFilter] = useState("todos");
  const [recorrenciaFilter, setRecorrenciaFilter] = useState("todos");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // Calculate date range based on period filter
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (periodoFilter) {
      case "mes_atual":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "mes_anterior":
        const prevMonth = subMonths(now, 1);
        return { start: startOfMonth(prevMonth), end: endOfMonth(prevMonth) };
      case "ultimos_3_meses":
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      case "ultimos_6_meses":
        return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
      case "ultimos_12_meses":
        return { start: startOfMonth(subMonths(now, 11)), end: endOfMonth(now) };
      case "ano_atual":
        return { start: startOfYear(now), end: endOfYear(now) };
      case "ano_anterior":
        const prevYear = subYears(now, 1);
        return { start: startOfYear(prevYear), end: endOfYear(prevYear) };
      case "ano_especifico":
        const year = parseInt(selectedYear);
        return { start: new Date(year, 0, 1), end: new Date(year, 11, 31) };
      case "personalizado":
        return { 
          start: customStartDate || startOfYear(now), 
          end: customEndDate || endOfYear(now) 
        };
      default:
        return { start: startOfYear(now), end: endOfYear(now) };
    }
  }, [periodoFilter, customStartDate, customEndDate, selectedYear]);

  // Fetch all quotations with related data
  const { data: cotacoes = [], isLoading } = useQuery({
    queryKey: ["cotacoes-analysis", dateRange.start, dateRange.end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotacoes")
        .select(`
          id,
          cpf_cnpj,
          segurado,
          status,
          data_cotacao,
          data_fechamento,
          ramo_id,
          ramo:ramos(id, descricao, ramo_agrupado, regra),
          seguradora_id,
          seguradora:seguradoras(id, nome),
          produtor_cotador_id,
          produtor_cotador:produtores!cotacoes_produtor_cotador_id_fkey(id, nome),
          produtor_origem_id,
          produtor_origem:produtores!cotacoes_produtor_origem_id_fkey(id, nome)
        `)
        .gte("data_cotacao", dateRange.start.toISOString())
        .lte("data_cotacao", dateRange.end.toISOString())
        .order("data_cotacao", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Fetch produtores for filter
  const { data: produtores = [] } = useQuery({
    queryKey: ["produtores-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtores")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Fetch ramos for filter
  const { data: ramos = [] } = useQuery({
    queryKey: ["ramos-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ramos")
        .select("id, descricao, ramo_agrupado")
        .eq("ativo", true)
        .order("descricao");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Get unique groups
  const grupos = useMemo(() => {
    const uniqueGroups = new Set<string>();
    ramos.forEach((ramo) => {
      if (ramo.ramo_agrupado) {
        uniqueGroups.add(ramo.ramo_agrupado);
      }
    });
    return Array.from(uniqueGroups).sort();
  }, [ramos]);

  // Filter and group cotações based on analysis type
  const groupedData = useMemo(() => {
    // Filter by status type
    let statusFilter: string[];
    if (analysisType === "finalizadas") {
      statusFilter = STATUS_FINALIZADOS;
    } else if (analysisType === "em_aberto") {
      statusFilter = STATUS_EM_ABERTO;
    } else {
      statusFilter = STATUS_TODOS;
    }
    
    let filtered = cotacoes.filter((c) => statusFilter.includes(c.status));

    // Apply produtor filter
    if (produtorFilter !== "todos") {
      filtered = filtered.filter((c) => c.produtor_cotador_id === produtorFilter);
    }

    // Apply ramo filter
    if (ramoFilter !== "todos") {
      filtered = filtered.filter((c) => c.ramo_id === ramoFilter);
    }

    // Apply grupo filter
    if (grupoFilter !== "todos") {
      filtered = filtered.filter((c) => {
        const ramo = c.ramo as any;
        return ramo?.ramo_agrupado === grupoFilter;
      });
    }

    // Apply recorrência filter
    if (recorrenciaFilter !== "todos") {
      filtered = filtered.filter((c) => {
        const ramo = c.ramo as any;
        const recorrencia = getRegraRamo(ramo);
        return recorrencia === recorrenciaFilter;
      });
    }

    // Group by CNPJ + Ramo Group (using getRamoGroup to combine RCTR-C and RC-DC)
    const groupMap = new Map<string, GroupedCotacao>();

    filtered.forEach((cotacao) => {
      const ramo = cotacao.ramo as any;
      const ramoDescricao = ramo?.descricao || "Não informado";
      const ramoGroup = getRamoGroup(ramoDescricao);
      const seguradora = cotacao.seguradora as any;
      const produtorCotador = cotacao.produtor_cotador as any;

      // Create unique key: CNPJ + Ramo Group
      const key = `${cotacao.cpf_cnpj}|${ramoGroup}`;

      if (groupMap.has(key)) {
        // Add seguradora to existing group
        const existing = groupMap.get(key)!;
        const seguradoraNome = seguradora?.nome;
        if (seguradoraNome && !existing.seguradoras.includes(seguradoraNome)) {
          existing.seguradoras.push(seguradoraNome);
        }
        existing.cotacao_ids.push(cotacao.id);
        
        // Update status if needed (prioritize Negócio fechado)
        if (cotacao.status === "Negócio fechado" && existing.status_final !== "Negócio fechado") {
          existing.status_final = cotacao.status;
          existing.data_fechamento = cotacao.data_fechamento;
          if (cotacao.data_fechamento && cotacao.data_cotacao) {
            const inicio = new Date(cotacao.data_cotacao);
            const fim = new Date(cotacao.data_fechamento);
            existing.dias_ate_fechamento = Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
          }
        }
      } else {
        // Create new group
        const recorrencia = getRegraRamo(ramo);
        const mesInicio = format(parseISO(cotacao.data_cotacao), "yyyy-MM");
        
        let diasAteFechamento: number | null = null;
        if (cotacao.data_fechamento && cotacao.data_cotacao) {
          const inicio = new Date(cotacao.data_cotacao);
          const fim = new Date(cotacao.data_fechamento);
          diasAteFechamento = Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
        }

        groupMap.set(key, {
          cpf_cnpj: cotacao.cpf_cnpj,
          ramo_id: cotacao.ramo_id || "",
          ramo_descricao: ramoDescricao,
          ramo_group: ramoGroup,
          segurado: cotacao.segurado,
          produtor_cotador_nome: produtorCotador?.nome || "Não informado",
          produtor_cotador_id: cotacao.produtor_cotador_id || "",
          recorrencia,
          mes_inicio: mesInicio,
          status_final: cotacao.status,
          seguradoras: seguradora?.nome ? [seguradora.nome] : [],
          cotacao_ids: [cotacao.id],
          data_cotacao: cotacao.data_cotacao,
          data_fechamento: cotacao.data_fechamento,
          dias_ate_fechamento: diasAteFechamento,
        });
      }
    });

    return Array.from(groupMap.values());
  }, [cotacoes, analysisType, produtorFilter, ramoFilter, grupoFilter, recorrenciaFilter]);

  // Summary statistics
  const summary = useMemo(() => {
    const totalCotacoes = groupedData.length;
    const byStatus: Record<string, number> = {};
    const byMes: Record<string, number> = {};
    const byProdutor: Record<string, number> = {};
    const byRamoGroup: Record<string, number> = {};
    const byRecorrencia: Record<string, number> = { Recorrente: 0, Total: 0 };

    groupedData.forEach((item) => {
      // By status
      byStatus[item.status_final] = (byStatus[item.status_final] || 0) + 1;
      
      // By month
      const mesFormatado = format(parseISO(item.mes_inicio + "-01"), "MMM/yy", { locale: ptBR });
      byMes[mesFormatado] = (byMes[mesFormatado] || 0) + 1;
      
      // By produtor
      byProdutor[item.produtor_cotador_nome] = (byProdutor[item.produtor_cotador_nome] || 0) + 1;
      
      // By ramo group
      byRamoGroup[item.ramo_group] = (byRamoGroup[item.ramo_group] || 0) + 1;
      
      // By recorrência
      byRecorrencia[item.recorrencia] = (byRecorrencia[item.recorrencia] || 0) + 1;
    });

    return {
      totalCotacoes,
      byStatus,
      byMes,
      byProdutor,
      byRamoGroup,
      byRecorrencia,
    };
  }, [groupedData]);

  // Export to Excel
  const handleExport = () => {
    if (groupedData.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    const exportData = groupedData.map((item) => ({
      "Mês Início": format(parseISO(item.mes_inicio + "-01"), "MMMM/yyyy", { locale: ptBR }),
      "Segurado": item.segurado,
      "CNPJ": item.cpf_cnpj,
      "Ramo": item.ramo_descricao,
      "Grupo": item.ramo_group,
      "Produtor": item.produtor_cotador_nome,
      "Recorrência": item.recorrencia,
      "Status Final": item.status_final,
      "Seguradoras": item.seguradoras.join(" | "),
      "Qtd Seguradoras": item.seguradoras.length,
      "Dias até Fechamento": item.dias_ate_fechamento ?? "-",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Análise Cotações");

    // Add summary sheet
    const summaryData = [
      { "Métrica": "Total de Cotações (Distintas)", "Valor": summary.totalCotacoes },
      { "Métrica": "", "Valor": "" },
      { "Métrica": "Por Status:", "Valor": "" },
      ...Object.entries(summary.byStatus).map(([status, count]) => ({
        "Métrica": `  ${status}`,
        "Valor": count,
      })),
      { "Métrica": "", "Valor": "" },
      { "Métrica": "Por Recorrência:", "Valor": "" },
      ...Object.entries(summary.byRecorrencia).map(([rec, count]) => ({
        "Métrica": `  ${rec}`,
        "Valor": count,
      })),
    ];
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, "Resumo");

    const tipoLabel = analysisType === "finalizadas" ? "Finalizadas" : analysisType === "em_aberto" ? "EmAberto" : "Geral";
    const fileName = `Analise_Cotacoes_${tipoLabel}_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("Relatório exportado com sucesso!");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Negócio fechado":
      case "Fechamento congênere":
        return <CheckCircle className="h-3 w-3 text-emerald-500" />;
      case "Declinado":
        return <XCircle className="h-3 w-3 text-rose-500" />;
      case "Em cotação":
        return <Clock className="h-3 w-3 text-amber-500" />;
      default:
        return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Negócio fechado":
      case "Fechamento congênere":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "Declinado":
        return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400";
      case "Em cotação":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const showDaysColumn = analysisType === "finalizadas" || analysisType === "geral";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-hidden flex flex-col p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Análise de Cotações
          </DialogTitle>
        </DialogHeader>

        <Tabs value={analysisType} onValueChange={(v) => setAnalysisType(v as AnalysisType)} className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs - 3 columns */}
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="finalizadas" className="gap-1.5 text-sm font-semibold">
              <CheckCircle className="h-3.5 w-3.5" />
              Finalizadas
            </TabsTrigger>
            <TabsTrigger value="em_aberto" className="gap-1.5 text-sm font-semibold">
              <Clock className="h-3.5 w-3.5" />
              Em Aberto
            </TabsTrigger>
            <TabsTrigger value="geral" className="gap-1.5 text-sm font-semibold">
              <ListFilter className="h-3.5 w-3.5" />
              Geral
            </TabsTrigger>
          </TabsList>

          {/* All Filters on same line */}
          <div className="flex flex-wrap items-center gap-2 py-2">
            <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
              <SelectTrigger className="h-8 w-[140px] text-xs font-medium border-2 bg-background shadow-sm">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes_atual">Mês Atual</SelectItem>
                <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
                <SelectItem value="ultimos_3_meses">Últimos 3 Meses</SelectItem>
                <SelectItem value="ultimos_6_meses">Últimos 6 Meses</SelectItem>
                <SelectItem value="ultimos_12_meses">Últimos 12 Meses</SelectItem>
                <SelectItem value="ano_atual">Ano Atual</SelectItem>
                <SelectItem value="ano_anterior">Ano Anterior</SelectItem>
                <SelectItem value="ano_especifico">Ano Específico</SelectItem>
                <SelectItem value="personalizado">Período Personalizado</SelectItem>
              </SelectContent>
            </Select>

            {periodoFilter === "ano_especifico" && (
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-8 w-[90px] text-xs font-medium border-2 bg-background shadow-sm">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableYears().map((year) => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {periodoFilter === "personalizado" && (
              <>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <DatePickerInput
                    value={customStartDate}
                    onChange={setCustomStartDate}
                    placeholder="Início"
                    className="h-8 w-[110px] text-xs"
                  />
                </div>
                <span className="text-xs text-muted-foreground">até</span>
                <DatePickerInput
                  value={customEndDate}
                  onChange={setCustomEndDate}
                  placeholder="Fim"
                  className="h-8 w-[110px] text-xs"
                />
              </>
            )}

            <div className="h-4 w-px bg-border" />

            <Select value={produtorFilter} onValueChange={setProdutorFilter}>
              <SelectTrigger className="h-8 w-[130px] text-xs font-medium border-2 bg-background shadow-sm">
                <SelectValue placeholder="Produtor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Produtores</SelectItem>
                {produtores.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={ramoFilter} onValueChange={setRamoFilter}>
              <SelectTrigger className="h-8 w-[120px] text-xs font-medium border-2 bg-background shadow-sm">
                <SelectValue placeholder="Ramo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Ramos</SelectItem>
                {ramos.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.descricao}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={grupoFilter} onValueChange={setGrupoFilter}>
              <SelectTrigger className="h-8 w-[120px] text-xs font-medium border-2 bg-background shadow-sm">
                <SelectValue placeholder="Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Grupos</SelectItem>
                {grupos.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={recorrenciaFilter} onValueChange={setRecorrenciaFilter}>
              <SelectTrigger className="h-8 w-[110px] text-xs font-medium border-2 bg-background shadow-sm">
                <SelectValue placeholder="Recorrência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="Recorrente">Recorrente</SelectItem>
                <SelectItem value="Total">Não Recorrente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Summary Cards - All on same line, compact */}
          <div className="flex flex-wrap gap-2 mb-2">
            {/* Total - Blue */}
            <Card className="flex-1 min-w-[120px] border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/20">
              <CardContent className="p-2">
                <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Total Cotações</div>
                <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{summary.totalCotacoes}</div>
                <div className="text-[10px] text-blue-500/70">(CNPJ + Ramo distintos)</div>
              </CardContent>
            </Card>
            
            {(analysisType === "finalizadas" || analysisType === "geral") && (
              <>
                {/* Negócio Fechado - Green */}
                <Card className="flex-1 min-w-[100px] border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-950/20">
                  <CardContent className="p-2">
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Negócio Fechado
                    </div>
                    <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                      {(summary.byStatus["Negócio fechado"] || 0) + (summary.byStatus["Fechamento congênere"] || 0)}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Declinado - Rose */}
                <Card className="flex-1 min-w-[100px] border-l-4 border-l-rose-500 bg-gradient-to-r from-rose-50 to-transparent dark:from-rose-950/20">
                  <CardContent className="p-2">
                    <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      Declinado
                    </div>
                    <div className="text-xl font-bold text-rose-700 dark:text-rose-300">
                      {summary.byStatus["Declinado"] || 0}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {analysisType === "geral" && (
              <Card className="flex-1 min-w-[100px] border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-950/20">
                <CardContent className="p-2">
                  <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Em Cotação
                  </div>
                  <div className="text-xl font-bold text-amber-700 dark:text-amber-300">
                    {summary.byStatus["Em cotação"] || 0}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recorrentes - Purple */}
            <Card className="flex-1 min-w-[100px] border-l-4 border-l-violet-500 bg-gradient-to-r from-violet-50 to-transparent dark:from-violet-950/20">
              <CardContent className="p-2">
                <div className="text-xs text-violet-600 dark:text-violet-400 font-semibold flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Recorrentes
                </div>
                <div className="text-xl font-bold text-violet-700 dark:text-violet-300">{summary.byRecorrencia.Recorrente}</div>
              </CardContent>
            </Card>

            {/* Não Recorrentes - Orange */}
            <Card className="flex-1 min-w-[100px] border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-transparent dark:from-orange-950/20">
              <CardContent className="p-2">
                <div className="text-xs text-orange-600 dark:text-orange-400 font-semibold">Não Recorrentes</div>
                <div className="text-xl font-bold text-orange-700 dark:text-orange-300">{summary.byRecorrencia.Total}</div>
              </CardContent>
            </Card>
          </div>

          {/* Data Table - Expanded */}
          <TabsContent value={analysisType} className="flex-1 overflow-hidden mt-0">
            <Card className="h-full flex flex-col border-2">
              <CardHeader className="flex flex-row items-center justify-between py-2 px-3 border-b">
                <CardTitle className="text-sm font-semibold">
                  {analysisType === "finalizadas" ? "Cotações Finalizadas" : analysisType === "em_aberto" ? "Cotações em Aberto" : "Todas as Cotações"} por Período
                </CardTitle>
                <Button onClick={handleExport} variant="outline" size="sm" className="h-7 gap-1.5 text-xs font-semibold shadow-sm">
                  <Download className="h-3.5 w-3.5" />
                  Exportar Excel
                </Button>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-[calc(100vh-520px)] min-h-[200px]">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : groupedData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                      <FileSpreadsheet className="h-6 w-6 mb-2" />
                      <p className="text-sm">Nenhuma cotação encontrada para os filtros selecionados</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 h-8">
                          <TableHead className="text-xs py-1">Mês Início</TableHead>
                          <TableHead className="text-xs py-1">Segurado</TableHead>
                          <TableHead className="text-xs py-1">CNPJ</TableHead>
                          <TableHead className="text-xs py-1">Ramo/Grupo</TableHead>
                          <TableHead className="text-xs py-1">Produtor</TableHead>
                          <TableHead className="text-xs py-1">Recorrência</TableHead>
                          <TableHead className="text-xs py-1">Status</TableHead>
                          <TableHead className="text-xs py-1">Seguradoras</TableHead>
                          {showDaysColumn && <TableHead className="text-xs py-1">Dias</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupedData.map((item, idx) => (
                          <TableRow key={`${item.cpf_cnpj}-${item.ramo_group}-${idx}`} className="hover:bg-muted/30 h-8">
                            <TableCell className="py-1 text-xs">
                              <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-[10px] px-1.5 py-0">
                                {format(parseISO(item.mes_inicio + "-01"), "MMM/yy", { locale: ptBR })}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[130px] truncate py-1 text-xs" title={item.segurado}>
                              {item.segurado}
                            </TableCell>
                            <TableCell className="text-[10px] font-mono text-muted-foreground py-1">{item.cpf_cnpj}</TableCell>
                            <TableCell className="py-1">
                              <div className="flex flex-col">
                                <span className="text-xs font-medium leading-tight">{item.ramo_descricao}</span>
                                {item.ramo_group !== item.ramo_descricao && (
                                  <span className="text-[10px] text-muted-foreground leading-tight">{item.ramo_group}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-1 text-xs">{item.produtor_cotador_nome}</TableCell>
                            <TableCell className="py-1">
                              <Badge 
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 ${item.recorrencia === "Recorrente" 
                                  ? "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400 border-violet-300" 
                                  : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300"
                                }`}
                              >
                                {item.recorrencia === "Recorrente" ? "Recorrente" : "Não Recorr."}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-1">
                              <div className="flex items-center gap-1">
                                {getStatusIcon(item.status_final)}
                                <Badge className={`text-[10px] px-1.5 py-0 ${getStatusBadgeClass(item.status_final)}`}>
                                  {item.status_final}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="py-1">
                              <div className="flex flex-wrap gap-0.5 max-w-[150px]">
                                {item.seguradoras.length > 0 ? (
                                  <span className="text-[10px] text-muted-foreground" title={item.seguradoras.join(" | ")}>
                                    {item.seguradoras.slice(0, 2).join(" | ")}
                                    {item.seguradoras.length > 2 && (
                                      <Badge variant="secondary" className="ml-0.5 text-[9px] px-1 py-0">
                                        +{item.seguradoras.length - 2}
                                      </Badge>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-[10px]">-</span>
                                )}
                              </div>
                            </TableCell>
                            {showDaysColumn && (
                              <TableCell className="py-1">
                                {item.dias_ate_fechamento !== null ? (
                                  <Badge variant="outline" className="bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400 text-[10px] px-1.5 py-0">
                                    {item.dias_ate_fechamento}d
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-[10px]">-</span>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Summary by dimensions - Compact */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          {/* By Month - Cyan */}
          <Card className="border-t-2 border-t-cyan-500">
            <CardHeader className="py-1 px-2 bg-gradient-to-r from-cyan-50 to-transparent dark:from-cyan-950/20">
              <CardTitle className="text-xs text-cyan-700 dark:text-cyan-400 font-semibold">Por Mês</CardTitle>
            </CardHeader>
            <CardContent className="p-1">
              <ScrollArea className="h-[80px]">
                {Object.entries(summary.byMes).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">Sem dados</p>
                ) : (
                  <div className="space-y-0.5">
                    {Object.entries(summary.byMes)
                      .sort((a, b) => b[1] - a[1])
                      .map(([mes, count]) => (
                        <div key={mes} className="flex justify-between text-xs items-center px-1.5 py-0.5 hover:bg-muted/50 rounded">
                          <span className="capitalize">{mes}</span>
                          <Badge className="bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 text-[10px] px-1.5 py-0">{count}</Badge>
                        </div>
                      ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* By Produtor - Indigo */}
          <Card className="border-t-2 border-t-indigo-500">
            <CardHeader className="py-1 px-2 bg-gradient-to-r from-indigo-50 to-transparent dark:from-indigo-950/20">
              <CardTitle className="text-xs text-indigo-700 dark:text-indigo-400 font-semibold">Por Produtor</CardTitle>
            </CardHeader>
            <CardContent className="p-1">
              <ScrollArea className="h-[80px]">
                {Object.entries(summary.byProdutor).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">Sem dados</p>
                ) : (
                  <div className="space-y-0.5">
                    {Object.entries(summary.byProdutor)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 10)
                      .map(([produtor, count]) => (
                        <div key={produtor} className="flex justify-between text-xs items-center px-1.5 py-0.5 hover:bg-muted/50 rounded">
                          <span className="truncate max-w-[120px]" title={produtor}>{produtor}</span>
                          <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 text-[10px] px-1.5 py-0">{count}</Badge>
                        </div>
                      ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* By Ramo Group - Teal */}
          <Card className="border-t-2 border-t-teal-500">
            <CardHeader className="py-1 px-2 bg-gradient-to-r from-teal-50 to-transparent dark:from-teal-950/20">
              <CardTitle className="text-xs text-teal-700 dark:text-teal-400 font-semibold">Por Grupo/Ramo</CardTitle>
            </CardHeader>
            <CardContent className="p-1">
              <ScrollArea className="h-[80px]">
                {Object.entries(summary.byRamoGroup).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">Sem dados</p>
                ) : (
                  <div className="space-y-0.5">
                    {Object.entries(summary.byRamoGroup)
                      .sort((a, b) => b[1] - a[1])
                      .map(([grupo, count]) => (
                        <div key={grupo} className="flex justify-between text-xs items-center px-1.5 py-0.5 hover:bg-muted/50 rounded">
                          <span className="truncate max-w-[120px]" title={grupo}>{grupo}</span>
                          <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 text-[10px] px-1.5 py-0">{count}</Badge>
                        </div>
                      ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
