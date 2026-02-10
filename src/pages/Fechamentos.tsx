import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCotacoesTotais, useProdutores, useUnidades, useSeguradoras, useRamos, type Cotacao } from "@/hooks/useSupabaseData";
import {
  ArrowLeft, Search, FileText, TrendingUp, DollarSign, Users, Filter, X,
  CheckCircle, Clock, XCircle, BarChart3, ChevronDown, ChevronUp, Info, Building2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  merged: boolean;
  originalRecords: Cotacao[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

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
  "Fechamento congênere": { label: "Congênere", color: "bg-success/10 text-success border-success/20", icon: CheckCircle },
  "Em cotação": { label: "Em Cotação", color: "bg-warning/10 text-warning border-warning/20", icon: Clock },
  "Declinado": { label: "Declinado", color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
};

// ─── Consolidation Logic ──────────────────────────────────────────────────────

function consolidateRecords(cotacoes: Cotacao[]): ConsolidatedRecord[] {
  const bySegurado = new Map<string, Cotacao[]>();
  cotacoes.forEach(c => {
    const key = c.cpf_cnpj;
    if (!bySegurado.has(key)) bySegurado.set(key, []);
    bySegurado.get(key)!.push(c);
  });

  const results: ConsolidatedRecord[] = [];

  bySegurado.forEach((records) => {
    const hasEmCotacao = records.some(r => r.status === "Em cotação");
    const filteredRecords = hasEmCotacao
      ? records.filter(r => r.status !== "Declinado")
      : records;

    const rctrC = filteredRecords.filter(r => r.ramo?.descricao?.toUpperCase().trim() === "RCTR-C");
    const rcDC = filteredRecords.filter(r => r.ramo?.descricao?.toUpperCase().trim() === "RC-DC");
    const others = filteredRecords.filter(r => {
      const desc = r.ramo?.descricao?.toUpperCase().trim();
      return desc !== "RCTR-C" && desc !== "RC-DC";
    });

    if (rctrC.length > 0 && rcDC.length > 0) {
      const allMerged = [...rctrC, ...rcDC];
      const base = rctrC[0];
      const totalPremio = allMerged.reduce((sum, r) => sum + (r.valor_premio || 0), 0);
      const seguradoras = [...new Set(allMerged.map(r => r.seguradora?.nome).filter(Boolean))].join(", ");
      const dataFechamento = allMerged.find(r => r.data_fechamento)?.data_fechamento || null;
      const statusPriority = ["Negócio fechado", "Fechamento congênere", "Em cotação", "Declinado"];
      const bestStatus = statusPriority.find(s => allMerged.some(r => r.status === s)) || base.status;

      results.push({
        key: `${base.cpf_cnpj}_RCTR-C+RC-DC`,
        segurado: base.segurado, cpf_cnpj: base.cpf_cnpj, status: bestStatus,
        ramo_descricao: "RCTR-C + RC-DC", ramo_agrupado: base.ramo?.ramo_agrupado || "",
        data_cotacao: base.data_cotacao, data_fechamento: dataFechamento,
        unidade_descricao: base.unidade?.descricao || "",
        produtor_origem: base.produtor_origem?.nome || "",
        produtor_negociador: base.produtor_negociador?.nome || "",
        produtor_cotador: base.produtor_cotador?.nome || "",
        seguradora: seguradoras,
        motivo_recusa: allMerged.map(r => r.motivo_recusa).filter(Boolean).join("; "),
        observacoes: allMerged.map(r => r.observacoes).filter(Boolean).join("; "),
        valor_premio: totalPremio, merged: true, originalRecords: allMerged,
      });
    } else {
      [...rctrC, ...rcDC].forEach(r => results.push(makeRecord(r, false)));
    }

    others.forEach(r => results.push(makeRecord(r, false)));
  });

  results.sort((a, b) => (b.data_cotacao || "").localeCompare(a.data_cotacao || ""));
  return results;
}

function makeRecord(c: Cotacao, merged: boolean): ConsolidatedRecord {
  return {
    key: c.id, segurado: c.segurado, cpf_cnpj: c.cpf_cnpj, status: c.status,
    ramo_descricao: c.ramo?.descricao || "", ramo_agrupado: c.ramo?.ramo_agrupado || "",
    data_cotacao: c.data_cotacao, data_fechamento: c.data_fechamento || null,
    unidade_descricao: c.unidade?.descricao || "",
    produtor_origem: c.produtor_origem?.nome || "",
    produtor_negociador: c.produtor_negociador?.nome || "",
    produtor_cotador: c.produtor_cotador?.nome || "",
    seguradora: c.seguradora?.nome || "",
    motivo_recusa: c.motivo_recusa || "", observacoes: c.observacoes || "",
    valor_premio: c.valor_premio || 0, merged, originalRecords: [c],
  };
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ record }: { record: ConsolidatedRecord }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 px-4 py-3 bg-muted/30 border-t text-sm">
      <div>
        <span className="text-muted-foreground text-xs block">CPF/CNPJ</span>
        <span className="font-mono text-xs">{record.cpf_cnpj}</span>
      </div>
      <div>
        <span className="text-muted-foreground text-xs block">Data Cotação</span>
        <span>{formatDate(record.data_cotacao)}</span>
      </div>
      <div>
        <span className="text-muted-foreground text-xs block">Data Fechamento</span>
        <span>{formatDate(record.data_fechamento)}</span>
      </div>
      <div>
        <span className="text-muted-foreground text-xs block">Ramo Agrupado</span>
        <span>{record.ramo_agrupado || "—"}</span>
      </div>
      <div>
        <span className="text-muted-foreground text-xs block">Produtor Origem</span>
        <span>{record.produtor_origem || "—"}</span>
      </div>
      <div>
        <span className="text-muted-foreground text-xs block">Produtor Negociador</span>
        <span>{record.produtor_negociador || "—"}</span>
      </div>
      <div>
        <span className="text-muted-foreground text-xs block">Produtor Cotador</span>
        <span>{record.produtor_cotador || "—"}</span>
      </div>
      <div>
        <span className="text-muted-foreground text-xs block">Unidade</span>
        <span>{record.unidade_descricao || "—"}</span>
      </div>
      {record.motivo_recusa && (
        <div className="col-span-2">
          <span className="text-muted-foreground text-xs block">Motivo Recusa</span>
          <span className="text-destructive">{record.motivo_recusa}</span>
        </div>
      )}
      {record.observacoes && (
        <div className="col-span-2">
          <span className="text-muted-foreground text-xs block">Observações</span>
          <span>{record.observacoes}</span>
        </div>
      )}
      {record.merged && (
        <div className="col-span-full">
          <span className="text-muted-foreground text-xs block">Junção RCTR-C + RC-DC</span>
          <span className="text-primary text-xs">
            {record.originalRecords.length} cotações mescladas · Seguradoras: {record.seguradora}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 30;

const Fechamentos = () => {
  const navigate = useNavigate();
  const { cotacoes: allCotacoes, loading: loadingCotacoes } = useCotacoesTotais();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [produtorFilter, setProdutorFilter] = useState<string>("todos");
  const [ramoFilter, setRamoFilter] = useState<string>("todos");
  const [seguradoraFilter, setSeguradoraFilter] = useState<string>("todos");
  const [unidadeFilter, setUnidadeFilter] = useState<string>("todos");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const consolidated = useMemo(() => consolidateRecords(allCotacoes), [allCotacoes]);

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

    if (ramoFilter !== "todos") records = records.filter(r => r.ramo_descricao === ramoFilter);
    if (seguradoraFilter !== "todos") records = records.filter(r => r.seguradora.includes(seguradoraFilter));
    if (unidadeFilter !== "todos") records = records.filter(r => r.unidade_descricao === unidadeFilter);

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
  }, [consolidated, statusFilter, produtorFilter, ramoFilter, seguradoraFilter, unidadeFilter, searchTerm]);

  // Reset page on filter change
  useMemo(() => setPage(1), [statusFilter, produtorFilter, ramoFilter, seguradoraFilter, unidadeFilter, searchTerm]);

  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, page]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));

  // KPIs
  const kpis = useMemo(() => {
    const total = filteredRecords.length;
    const fechados = filteredRecords.filter(r => r.status === "Negócio fechado" || r.status === "Fechamento congênere").length;
    const emCotacao = filteredRecords.filter(r => r.status === "Em cotação").length;
    const declinados = filteredRecords.filter(r => r.status === "Declinado").length;
    const premioFechado = filteredRecords
      .filter(r => r.status === "Negócio fechado" || r.status === "Fechamento congênere")
      .reduce((sum, r) => sum + r.valor_premio, 0);
    const taxaConversao = total > 0 ? (fechados / total * 100) : 0;
    const mergedCount = filteredRecords.filter(r => r.merged).length;
    const uniqueSegurados = new Set(filteredRecords.map(r => r.cpf_cnpj)).size;

    return { total, fechados, emCotacao, declinados, premioFechado, taxaConversao, mergedCount, uniqueSegurados };
  }, [filteredRecords]);

  const uniqueRamos = useMemo(() => Array.from(new Set(consolidated.map(r => r.ramo_descricao).filter(Boolean))).sort(), [consolidated]);
  const uniqueProdutores = useMemo(() => {
    const prods = new Set<string>();
    consolidated.forEach(r => {
      if (r.produtor_origem) prods.add(r.produtor_origem);
      if (r.produtor_negociador) prods.add(r.produtor_negociador);
      if (r.produtor_cotador) prods.add(r.produtor_cotador);
    });
    return Array.from(prods).sort();
  }, [consolidated]);
  const uniqueSeguradoras = useMemo(() => Array.from(new Set(consolidated.flatMap(r => r.seguradora.split(", ")).filter(Boolean))).sort(), [consolidated]);
  const uniqueUnidades = useMemo(() => Array.from(new Set(consolidated.map(r => r.unidade_descricao).filter(Boolean))).sort(), [consolidated]);

  const clearFilters = () => {
    setSearchTerm(""); setStatusFilter("todos"); setProdutorFilter("todos");
    setRamoFilter("todos"); setSeguradoraFilter("todos"); setUnidadeFilter("todos");
  };
  const hasActiveFilters = statusFilter !== "todos" || produtorFilter !== "todos" || ramoFilter !== "todos" || seguradoraFilter !== "todos" || unidadeFilter !== "todos" || searchTerm !== "";

  if (loadingCotacoes) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
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
              Visão gerencial consolidada · {kpis.uniqueSegurados} segurados
              {kpis.mergedCount > 0 && (
                <span className="ml-1 text-primary">· {kpis.mergedCount} junções RCTR-C + RC-DC</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards – compact 5-column grid */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { title: "Total", value: kpis.total.toString(), sub: `${kpis.uniqueSegurados} segurados`, icon: FileText, iconColor: "text-muted-foreground" },
          { title: "Fechados", value: kpis.fechados.toString(), sub: formatCurrency(kpis.premioFechado), icon: CheckCircle, iconColor: "text-success" },
          { title: "Em Cotação", value: kpis.emCotacao.toString(), sub: "Em andamento", icon: Clock, iconColor: "text-warning" },
          { title: "Declinados", value: kpis.declinados.toString(), sub: "Após prevalência", icon: XCircle, iconColor: "text-destructive" },
          { title: "Conversão", value: `${kpis.taxaConversao.toFixed(1)}%`, sub: formatCurrency(kpis.premioFechado), icon: TrendingUp, iconColor: "text-primary" },
        ].map(kpi => (
          <Card key={kpi.title}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`rounded-lg p-2 bg-muted ${kpi.iconColor}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{kpi.title}</p>
                <p className="text-xl font-bold leading-tight">{kpi.value}</p>
                <p className="text-[11px] text-muted-foreground truncate">{kpi.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters – single row */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar segurado, CNPJ, seguradora..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Status</SelectItem>
                <SelectItem value="fechados">Fechados</SelectItem>
                <SelectItem value="Em cotação">Em Cotação</SelectItem>
                <SelectItem value="Declinado">Declinado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={produtorFilter} onValueChange={setProdutorFilter}>
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue placeholder="Produtor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Produtores</SelectItem>
                {uniqueProdutores.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={ramoFilter} onValueChange={setRamoFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Ramo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Ramos</SelectItem>
                {uniqueRamos.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={seguradoraFilter} onValueChange={setSeguradoraFilter}>
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue placeholder="Seguradora" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Seguradoras</SelectItem>
                {uniqueSeguradoras.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={unidadeFilter} onValueChange={setUnidadeFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Unidades</SelectItem>
                {uniqueUnidades.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1 text-xs px-2">
                <X className="h-3.5 w-3.5" /> Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Table – compact, essential columns only + expandable detail */}
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Registros Consolidados
              <Badge variant="secondary" className="text-xs">{filteredRecords.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              Clique na linha para ver detalhes
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-8 px-2"></TableHead>
                <TableHead className="text-xs">Segurado</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Ramo</TableHead>
                <TableHead className="text-xs">Seguradora</TableHead>
                <TableHead className="text-xs">Produtor Origem</TableHead>
                <TableHead className="text-xs text-right">Prêmio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRecords.map((record) => {
                  const config = statusConfig[record.status] || statusConfig["Declinado"];
                  const isExpanded = expandedRow === record.key;
                  return (
                    <TooltipProvider key={record.key}>
                      <TableRow
                        className={`cursor-pointer transition-colors ${record.merged ? "bg-primary/5" : ""} ${isExpanded ? "border-b-0" : ""}`}
                        onClick={() => setExpandedRow(isExpanded ? null : record.key)}
                      >
                        <TableCell className="px-2 py-2">
                          {isExpanded
                            ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm truncate max-w-[220px]">{record.segurado}</span>
                            {record.merged && (
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary/30 text-primary shrink-0">
                                    Junção
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>RCTR-C e RC-DC combinados</p>
                                </TooltipContent>
                              </UITooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className={`text-[10px] ${config.color}`}>
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-sm">{record.ramo_descricao}</TableCell>
                        <TableCell className="py-2 text-sm truncate max-w-[140px]">{record.seguradora || "—"}</TableCell>
                        <TableCell className="py-2 text-sm">{record.produtor_origem || "—"}</TableCell>
                        <TableCell className="py-2 text-sm text-right font-medium">
                          {record.valor_premio > 0 ? formatCurrency(record.valor_premio) : "—"}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={7} className="p-0">
                            <DetailPanel record={record} />
                          </TableCell>
                        </TableRow>
                      )}
                    </TooltipProvider>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">
                Exibindo {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredRecords.length)} de {filteredRecords.length}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  Anterior
                </Button>
                <span className="text-xs text-muted-foreground px-2">
                  {page} / {totalPages}
                </span>
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business Rules Footer */}
      <div className="flex items-start gap-2 text-[11px] text-muted-foreground px-1">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <p>
          <strong>Regras:</strong> RCTR-C + RC-DC do mesmo segurado são consolidados em registro único. Status "Declinado" é ignorado quando há "Em cotação" para o mesmo segurado.
        </p>
      </div>
    </div>
  );
};

export default Fechamentos;
