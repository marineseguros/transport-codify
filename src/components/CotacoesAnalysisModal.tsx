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
import { Download, BarChart3, FileSpreadsheet, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getRamoGroup, getRegraRamo } from "@/lib/ramoClassification";
import { format, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import { toast } from "sonner";

interface CotacoesAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AnalysisType = "finalizadas" | "em_aberto";

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

export function CotacoesAnalysisModal({ open, onOpenChange }: CotacoesAnalysisModalProps) {
  const [analysisType, setAnalysisType] = useState<AnalysisType>("finalizadas");
  const [periodoFilter, setPeriodoFilter] = useState("ano_atual");
  const [produtorFilter, setProdutorFilter] = useState("todos");
  const [ramoFilter, setRamoFilter] = useState("todos");
  const [grupoFilter, setGrupoFilter] = useState("todos");
  const [recorrenciaFilter, setRecorrenciaFilter] = useState("todos");

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
      case "ano_atual":
        return { start: startOfYear(now), end: endOfYear(now) };
      default:
        return { start: startOfYear(now), end: endOfYear(now) };
    }
  }, [periodoFilter]);

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
    const statusFilter = analysisType === "finalizadas" ? STATUS_FINALIZADOS : STATUS_EM_ABERTO;
    
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

    const tipoLabel = analysisType === "finalizadas" ? "Finalizadas" : "EmAberto";
    const fileName = `Analise_Cotacoes_${tipoLabel}_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("Relatório exportado com sucesso!");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Negócio fechado":
      case "Fechamento congênere":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "Declinado":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "Em cotação":
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Análise de Cotações
          </DialogTitle>
        </DialogHeader>

        <Tabs value={analysisType} onValueChange={(v) => setAnalysisType(v as AnalysisType)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="finalizadas" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Finalizadas
            </TabsTrigger>
            <TabsTrigger value="em_aberto" className="gap-2">
              <Clock className="h-4 w-4" />
              Em Aberto
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 py-4">
            <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes_atual">Mês Atual</SelectItem>
                <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
                <SelectItem value="ultimos_3_meses">Últimos 3 Meses</SelectItem>
                <SelectItem value="ultimos_6_meses">Últimos 6 Meses</SelectItem>
                <SelectItem value="ano_atual">Ano Atual</SelectItem>
              </SelectContent>
            </Select>

            <Select value={produtorFilter} onValueChange={setProdutorFilter}>
              <SelectTrigger>
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
              <SelectTrigger>
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
              <SelectTrigger>
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
              <SelectTrigger>
                <SelectValue placeholder="Recorrência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="Recorrente">Recorrente</SelectItem>
                <SelectItem value="Total">Não Recorrente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Card>
              <CardContent className="p-3">
                <div className="text-sm text-muted-foreground">Total Cotações</div>
                <div className="text-2xl font-bold">{summary.totalCotacoes}</div>
                <div className="text-xs text-muted-foreground">(CNPJ + Ramo distintos)</div>
              </CardContent>
            </Card>
            
            {analysisType === "finalizadas" && (
              <>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      Negócio Fechado
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {(summary.byStatus["Negócio fechado"] || 0) + (summary.byStatus["Fechamento congênere"] || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <TrendingDown className="h-3 w-3 text-red-500" />
                      Declinado
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      {summary.byStatus["Declinado"] || 0}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            <Card>
              <CardContent className="p-3">
                <div className="text-sm text-muted-foreground">Recorrentes</div>
                <div className="text-2xl font-bold">{summary.byRecorrencia.Recorrente}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <div className="text-sm text-muted-foreground">Não Recorrentes</div>
                <div className="text-2xl font-bold">{summary.byRecorrencia.Total}</div>
              </CardContent>
            </Card>
          </div>

          {/* Data Table */}
          <TabsContent value={analysisType} className="flex-1 overflow-hidden mt-0">
            <Card className="h-full flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-base">
                  {analysisType === "finalizadas" ? "Cotações Finalizadas" : "Cotações em Aberto"} por Período
                </CardTitle>
                <Button onClick={handleExport} variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar Excel
                </Button>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-[300px]">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : groupedData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                      <FileSpreadsheet className="h-8 w-8 mb-2" />
                      <p>Nenhuma cotação encontrada para os filtros selecionados</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mês Início</TableHead>
                          <TableHead>Segurado</TableHead>
                          <TableHead>CNPJ</TableHead>
                          <TableHead>Ramo/Grupo</TableHead>
                          <TableHead>Produtor</TableHead>
                          <TableHead>Recorrência</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Seguradoras</TableHead>
                          {analysisType === "finalizadas" && <TableHead>Dias</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupedData.map((item, idx) => (
                          <TableRow key={`${item.cpf_cnpj}-${item.ramo_group}-${idx}`}>
                            <TableCell className="font-medium">
                              {format(parseISO(item.mes_inicio + "-01"), "MMM/yy", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate" title={item.segurado}>
                              {item.segurado}
                            </TableCell>
                            <TableCell className="text-xs font-mono">{item.cpf_cnpj}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm">{item.ramo_descricao}</span>
                                {item.ramo_group !== item.ramo_descricao && (
                                  <span className="text-xs text-muted-foreground">{item.ramo_group}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{item.produtor_cotador_nome}</TableCell>
                            <TableCell>
                              <Badge variant={item.recorrencia === "Recorrente" ? "default" : "secondary"}>
                                {item.recorrencia}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(item.status_final)}
                                <span className="text-sm">{item.status_final}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {item.seguradoras.length > 0 ? (
                                  <span className="text-xs" title={item.seguradoras.join(" | ")}>
                                    {item.seguradoras.slice(0, 2).join(" | ")}
                                    {item.seguradoras.length > 2 && ` +${item.seguradoras.length - 2}`}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </div>
                            </TableCell>
                            {analysisType === "finalizadas" && (
                              <TableCell>
                                {item.dias_ate_fechamento !== null ? (
                                  <span className="text-sm">{item.dias_ate_fechamento}d</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
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

        {/* Summary by dimensions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {/* By Month */}
          <Card>
            <CardHeader className="py-2">
              <CardTitle className="text-sm">Por Mês</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[120px]">
                {Object.entries(summary.byMes).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
                ) : (
                  <div className="space-y-1">
                    {Object.entries(summary.byMes)
                      .sort((a, b) => b[1] - a[1])
                      .map(([mes, count]) => (
                        <div key={mes} className="flex justify-between text-sm">
                          <span>{mes}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* By Produtor */}
          <Card>
            <CardHeader className="py-2">
              <CardTitle className="text-sm">Por Produtor</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[120px]">
                {Object.entries(summary.byProdutor).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
                ) : (
                  <div className="space-y-1">
                    {Object.entries(summary.byProdutor)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 10)
                      .map(([produtor, count]) => (
                        <div key={produtor} className="flex justify-between text-sm">
                          <span className="truncate max-w-[150px]" title={produtor}>{produtor}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* By Ramo Group */}
          <Card>
            <CardHeader className="py-2">
              <CardTitle className="text-sm">Por Grupo/Ramo</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[120px]">
                {Object.entries(summary.byRamoGroup).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
                ) : (
                  <div className="space-y-1">
                    {Object.entries(summary.byRamoGroup)
                      .sort((a, b) => b[1] - a[1])
                      .map(([grupo, count]) => (
                        <div key={grupo} className="flex justify-between text-sm">
                          <span className="truncate max-w-[150px]" title={grupo}>{grupo}</span>
                          <Badge variant="outline">{count}</Badge>
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
