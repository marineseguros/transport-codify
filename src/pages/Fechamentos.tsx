import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCotacoesTotais, useProdutores, useUnidades, useSeguradoras, useRamos, type Cotacao } from "@/hooks/useSupabaseData";
import { ArrowLeft, Search, FileText, TrendingUp, DollarSign, Users, Building2, Filter, X, CheckCircle, Clock, XCircle, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getRamoGroup } from "@/lib/ramoClassification";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConsolidatedRecord {
  key: string;
  segurado: string;
  cpf_cnpj: string;
  status: string;
  ramo_descricao: string;
  ramo_agrupado: string;
  data_cotacao: string;
  data_fechamento: string | null;
  unidade_descricao: string;
  produtor_origem: string;
  produtor_negociador: string;
  produtor_cotador: string;
  seguradora: string;
  motivo_recusa: string;
  observacoes: string;
  valor_premio: number;
  // For merged RCTR-C + RC-DC
  merged: boolean;
  originalRecords: Cotacao[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "—";
  try {
    return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  "Negócio fechado": { label: "Fechado", color: "bg-success/10 text-success border-success/20", icon: CheckCircle },
  "Fechamento congênere": { label: "Congênere", color: "bg-success-alt/10 text-success-alt border-success-alt/20", icon: CheckCircle },
  "Em cotação": { label: "Em Cotação", color: "bg-warning/10 text-warning border-warning/20", icon: Clock },
  "Declinado": { label: "Declinado", color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
};

// ─── Consolidation Logic ──────────────────────────────────────────────────────

/**
 * Applies business rules:
 * 1. Merge RCTR-C + RC-DC for same Segurado into one record
 * 2. When same Segurado has both "Declinado" and "Em cotação", ignore Declinado
 */
function consolidateRecords(cotacoes: Cotacao[]): ConsolidatedRecord[] {
  // Step 1: Group all records by segurado (cpf_cnpj)
  const bySegurado = new Map<string, Cotacao[]>();
  cotacoes.forEach(c => {
    const key = c.cpf_cnpj;
    if (!bySegurado.has(key)) bySegurado.set(key, []);
    bySegurado.get(key)!.push(c);
  });

  const results: ConsolidatedRecord[] = [];

  bySegurado.forEach((records, cpf_cnpj) => {
    // Step 2: Check status prevalence - if same segurado has "Em cotação" and "Declinado",
    // remove all "Declinado" for that segurado
    const hasEmCotacao = records.some(r => r.status === "Em cotação");
    const filteredRecords = hasEmCotacao
      ? records.filter(r => r.status !== "Declinado")
      : records;

    // Step 3: Separate RCTR-C and RC-DC records for merging
    const rctrC = filteredRecords.filter(r => r.ramo?.descricao?.toUpperCase().trim() === "RCTR-C");
    const rcDC = filteredRecords.filter(r => r.ramo?.descricao?.toUpperCase().trim() === "RC-DC");
    const others = filteredRecords.filter(r => {
      const desc = r.ramo?.descricao?.toUpperCase().trim();
      return desc !== "RCTR-C" && desc !== "RC-DC";
    });

    // Step 4: Merge RCTR-C + RC-DC per segurado
    // If both exist, combine into one record
    if (rctrC.length > 0 && rcDC.length > 0) {
      // Use the RCTR-C record as base, sum premiums, combine info
      const allMerged = [...rctrC, ...rcDC];
      const base = rctrC[0];
      const totalPremio = allMerged.reduce((sum, r) => sum + (r.valor_premio || 0), 0);
      const seguradoras = [...new Set(allMerged.map(r => r.seguradora?.nome).filter(Boolean))].join(", ");
      const dataFechamento = allMerged.find(r => r.data_fechamento)?.data_fechamento || null;
      
      // Pick best status (prefer "Negócio fechado" or "Fechamento congênere" over others)
      const statusPriority = ["Negócio fechado", "Fechamento congênere", "Em cotação", "Declinado"];
      const bestStatus = statusPriority.find(s => allMerged.some(r => r.status === s)) || base.status;

      results.push({
        key: `${cpf_cnpj}_RCTR-C+RC-DC`,
        segurado: base.segurado,
        cpf_cnpj: base.cpf_cnpj,
        status: bestStatus,
        ramo_descricao: "RCTR-C + RC-DC",
        ramo_agrupado: base.ramo?.ramo_agrupado || "",
        data_cotacao: base.data_cotacao,
        data_fechamento: dataFechamento,
        unidade_descricao: base.unidade?.descricao || "",
        produtor_origem: base.produtor_origem?.nome || "",
        produtor_negociador: base.produtor_negociador?.nome || "",
        produtor_cotador: base.produtor_cotador?.nome || "",
        seguradora: seguradoras,
        motivo_recusa: allMerged.map(r => r.motivo_recusa).filter(Boolean).join("; "),
        observacoes: allMerged.map(r => r.observacoes).filter(Boolean).join("; "),
        valor_premio: totalPremio,
        merged: true,
        originalRecords: allMerged,
      });
    } else {
      // If only one of RCTR-C or RC-DC exists, add individually
      [...rctrC, ...rcDC].forEach(r => {
        results.push(makeRecord(r, false));
      });
    }

    // Step 5: Add all other records
    others.forEach(r => {
      results.push(makeRecord(r, false));
    });
  });

  // Sort by data_cotacao descending
  results.sort((a, b) => (b.data_cotacao || "").localeCompare(a.data_cotacao || ""));

  return results;
}

function makeRecord(c: Cotacao, merged: boolean): ConsolidatedRecord {
  return {
    key: c.id,
    segurado: c.segurado,
    cpf_cnpj: c.cpf_cnpj,
    status: c.status,
    ramo_descricao: c.ramo?.descricao || "",
    ramo_agrupado: c.ramo?.ramo_agrupado || "",
    data_cotacao: c.data_cotacao,
    data_fechamento: c.data_fechamento || null,
    unidade_descricao: c.unidade?.descricao || "",
    produtor_origem: c.produtor_origem?.nome || "",
    produtor_negociador: c.produtor_negociador?.nome || "",
    produtor_cotador: c.produtor_cotador?.nome || "",
    seguradora: c.seguradora?.nome || "",
    motivo_recusa: c.motivo_recusa || "",
    observacoes: c.observacoes || "",
    valor_premio: c.valor_premio || 0,
    merged,
    originalRecords: [c],
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

const Fechamentos = () => {
  const navigate = useNavigate();
  const { cotacoes: allCotacoes, loading: loadingCotacoes } = useCotacoesTotais();
  const { produtores } = useProdutores();

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [produtorFilter, setProdutorFilter] = useState<string>("todos");
  const [ramoFilter, setRamoFilter] = useState<string>("todos");

  // Consolidate records applying business rules
  const consolidated = useMemo(() => consolidateRecords(allCotacoes), [allCotacoes]);

  // Apply UI filters
  const filteredRecords = useMemo(() => {
    let records = consolidated;

    if (statusFilter !== "todos") {
      if (statusFilter === "fechados") {
        records = records.filter(r => r.status === "Negócio fechado" || r.status === "Fechamento congênere");
      } else {
        records = records.filter(r => r.status === statusFilter);
      }
    }

    if (produtorFilter !== "todos") {
      records = records.filter(r =>
        r.produtor_origem === produtorFilter ||
        r.produtor_negociador === produtorFilter ||
        r.produtor_cotador === produtorFilter
      );
    }

    if (ramoFilter !== "todos") {
      records = records.filter(r => r.ramo_descricao === ramoFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      records = records.filter(r =>
        r.segurado.toLowerCase().includes(term) ||
        r.cpf_cnpj.toLowerCase().includes(term) ||
        r.seguradora.toLowerCase().includes(term) ||
        r.produtor_origem.toLowerCase().includes(term) ||
        r.ramo_descricao.toLowerCase().includes(term)
      );
    }

    return records;
  }, [consolidated, statusFilter, produtorFilter, ramoFilter, searchTerm]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filteredRecords.length;
    const fechados = filteredRecords.filter(r => r.status === "Negócio fechado" || r.status === "Fechamento congênere").length;
    const emCotacao = filteredRecords.filter(r => r.status === "Em cotação").length;
    const declinados = filteredRecords.filter(r => r.status === "Declinado").length;
    const premioFechado = filteredRecords
      .filter(r => r.status === "Negócio fechado" || r.status === "Fechamento congênere")
      .reduce((sum, r) => sum + r.valor_premio, 0);
    const premioTotal = filteredRecords.reduce((sum, r) => sum + r.valor_premio, 0);
    const taxaConversao = total > 0 ? (fechados / total * 100) : 0;
    const mergedCount = filteredRecords.filter(r => r.merged).length;

    // Unique segurados
    const uniqueSegurados = new Set(filteredRecords.map(r => r.cpf_cnpj)).size;

    // Ramos distribution
    const ramoDistribution: Record<string, number> = {};
    filteredRecords.forEach(r => {
      ramoDistribution[r.ramo_descricao || "Não informado"] = (ramoDistribution[r.ramo_descricao || "Não informado"] || 0) + 1;
    });

    return { total, fechados, emCotacao, declinados, premioFechado, premioTotal, taxaConversao, mergedCount, uniqueSegurados, ramoDistribution };
  }, [filteredRecords]);

  // Unique ramos for filter
  const uniqueRamos = useMemo(() => {
    const ramos = new Set(consolidated.map(r => r.ramo_descricao).filter(Boolean));
    return Array.from(ramos).sort();
  }, [consolidated]);

  // Unique produtores for filter
  const uniqueProdutores = useMemo(() => {
    const prods = new Set<string>();
    consolidated.forEach(r => {
      if (r.produtor_origem) prods.add(r.produtor_origem);
      if (r.produtor_negociador) prods.add(r.produtor_negociador);
      if (r.produtor_cotador) prods.add(r.produtor_cotador);
    });
    return Array.from(prods).sort();
  }, [consolidated]);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("todos");
    setProdutorFilter("todos");
    setRamoFilter("todos");
  };

  const hasActiveFilters = statusFilter !== "todos" || produtorFilter !== "todos" || ramoFilter !== "todos" || searchTerm !== "";

  if (loadingCotacoes) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <BarChart3 className="h-7 w-7 md:h-8 md:w-8" />
              Fechamentos
            </h1>
            <p className="text-sm text-muted-foreground">
              Análise gerencial consolidada · {kpis.total} registros
              {kpis.mergedCount > 0 && (
                <span className="ml-1 text-primary">
                  ({kpis.mergedCount} junções RCTR-C + RC-DC)
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total Consolidado</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.total}</div>
            <p className="text-xs text-muted-foreground">{kpis.uniqueSegurados} segurados únicos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Fechados</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{kpis.fechados}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(kpis.premioFechado)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Em Cotação</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{kpis.emCotacao}</div>
            <p className="text-xs text-muted-foreground">Em andamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Declinados</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{kpis.declinados}</div>
            <p className="text-xs text-muted-foreground">Após prevalência</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Taxa Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{kpis.taxaConversao.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Fechados / Total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Prêmio Total</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-success">{formatCurrency(kpis.premioFechado)}</div>
            <p className="text-xs text-muted-foreground">Negócios fechados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-col md:flex-row gap-3 items-end">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar segurado, CNPJ, seguradora, produtor, ramo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="fechados">Fechados</SelectItem>
                <SelectItem value="Em cotação">Em Cotação</SelectItem>
                <SelectItem value="Declinado">Declinado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={produtorFilter} onValueChange={setProdutorFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Produtor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Produtores</SelectItem>
                {uniqueProdutores.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={ramoFilter} onValueChange={setRamoFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Ramo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Ramos</SelectItem>
                {uniqueRamos.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 shrink-0">
                <X className="h-4 w-4" />
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Registros Consolidados
            <Badge variant="secondary" className="ml-2">{filteredRecords.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">Data Cotação</TableHead>
                  <TableHead className="min-w-[100px]">Data Fechamento</TableHead>
                  <TableHead className="min-w-[200px]">Segurado</TableHead>
                  <TableHead className="min-w-[140px]">CPF/CNPJ</TableHead>
                  <TableHead className="min-w-[120px]">Status</TableHead>
                  <TableHead className="min-w-[120px]">Ramo</TableHead>
                  <TableHead className="min-w-[100px]">Ramo Agrupado</TableHead>
                  <TableHead className="min-w-[120px]">Unidade</TableHead>
                  <TableHead className="min-w-[130px]">Produtor Origem</TableHead>
                  <TableHead className="min-w-[130px]">Produtor Negociador</TableHead>
                  <TableHead className="min-w-[130px]">Produtor Cotador</TableHead>
                  <TableHead className="min-w-[150px]">Seguradora</TableHead>
                  <TableHead className="min-w-[120px] text-right">Prêmio</TableHead>
                  <TableHead className="min-w-[150px]">Motivo Recusa</TableHead>
                  <TableHead className="min-w-[150px]">Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} className="text-center py-10 text-muted-foreground">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => {
                    const config = statusConfig[record.status] || statusConfig["Declinado"];
                    return (
                      <TableRow key={record.key} className={record.merged ? "bg-primary/5" : ""}>
                        <TableCell className="text-sm">{formatDate(record.data_cotacao)}</TableCell>
                        <TableCell className="text-sm">{formatDate(record.data_fechamento)}</TableCell>
                        <TableCell className="text-sm font-medium">
                          <div className="flex items-center gap-1.5">
                            {record.segurado}
                            {record.merged && (
                              <TooltipProvider>
                                <UITooltip>
                                  <TooltipTrigger>
                                    <Badge variant="outline" className="text-[10px] px-1 py-0 border-primary/30 text-primary">
                                      Junção
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>RCTR-C e RC-DC combinados em um único registro</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {record.originalRecords.length} cotações originais mescladas
                                    </p>
                                  </TooltipContent>
                                </UITooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-mono text-xs">{record.cpf_cnpj}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${config.color}`}>
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{record.ramo_descricao}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{record.ramo_agrupado || "—"}</TableCell>
                        <TableCell className="text-sm">{record.unidade_descricao || "—"}</TableCell>
                        <TableCell className="text-sm">{record.produtor_origem || "—"}</TableCell>
                        <TableCell className="text-sm">{record.produtor_negociador || "—"}</TableCell>
                        <TableCell className="text-sm">{record.produtor_cotador || "—"}</TableCell>
                        <TableCell className="text-sm">{record.seguradora || "—"}</TableCell>
                        <TableCell className="text-sm text-right font-medium">
                          {record.valor_premio > 0 ? formatCurrency(record.valor_premio) : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {record.motivo_recusa || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {record.observacoes || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Business Rules Info */}
      <Card className="border-dashed">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-3">
            <Filter className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Regras aplicadas:</strong></p>
              <p>• <strong>Junção RCTR-C + RC-DC:</strong> Quando o mesmo segurado possui ambos os ramos, são consolidados em um único registro "RCTR-C + RC-DC", independente da seguradora.</p>
              <p>• <strong>Prevalência de status:</strong> Quando o mesmo segurado possui registros "Declinado" e "Em cotação", o status "Declinado" é desconsiderado, prevalecendo "Em cotação".</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Fechamentos;
