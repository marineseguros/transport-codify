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
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ExportCotacoesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportCotacoesModal({ open, onOpenChange }: ExportCotacoesModalProps) {
  const [criterio, setCriterio] = useState<string>("data_fechamento");
  const [ano, setAno] = useState<string>("");
  const [mes, setMes] = useState<string>("");
  const [produtorId, setProdutorId] = useState<string>("todos");
  const [unidadeId, setUnidadeId] = useState<string>("todos");
  const [loading, setLoading] = useState(false);
  const [produtores, setProdutores] = useState<{ id: string; nome: string }[]>([]);
  const [unidades, setUnidades] = useState<{ id: string; descricao: string }[]>([]);

  // Load produtores and unidades on mount
  React.useEffect(() => {
    if (open) {
      loadFilters();
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

  const handleExport = async () => {
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

      // Apply date filter based on criterion
      if (ano && mes) {
        const startDate = `${ano}-${mes}-01`;
        const lastDay = new Date(parseInt(ano), parseInt(mes), 0).getDate();
        const endDate = `${ano}-${mes}-${String(lastDay).padStart(2, "0")}`;

        if (criterio === "data_fechamento") {
          query = query.gte("data_fechamento", startDate).lte("data_fechamento", endDate);
        } else if (criterio === "inicio_vigencia") {
          query = query.gte("inicio_vigencia", startDate).lte("inicio_vigencia", endDate);
        }
      } else if (ano) {
        const startDate = `${ano}-01-01`;
        const endDate = `${ano}-12-31`;

        if (criterio === "data_fechamento") {
          query = query.gte("data_fechamento", startDate).lte("data_fechamento", endDate);
        } else if (criterio === "inicio_vigencia") {
          query = query.gte("inicio_vigencia", startDate).lte("inicio_vigencia", endDate);
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

      // Format data for Excel
      const excelData = data.map((cotacao) => ({
        "Número Cotação": cotacao.numero_cotacao,
        "Data Cotação": formatDate(cotacao.data_cotacao),
        "Data Fechamento": formatDate(cotacao.data_fechamento),
        "Início Vigência": formatDate(cotacao.inicio_vigencia),
        "Fim Vigência": formatDate(cotacao.fim_vigencia),
        Segurado: cotacao.segurado,
        "CPF/CNPJ": cotacao.cpf_cnpj,
        Status: cotacao.status,
        "Valor Prêmio": cotacao.valor_premio,
        Segmento: cotacao.segmento || "",
        Tipo: cotacao.tipo || "",
        "Nº Proposta": cotacao.num_proposta || "",
        "Motivo Recusa": cotacao.motivo_recusa || "",
        Observações: cotacao.observacoes || "",
        Comentários: cotacao.comentarios || "",
        // Unidade
        "Unidade Código": cotacao.unidade?.codigo || "",
        "Unidade Descrição": cotacao.unidade?.descricao || "",
        // Produtor Origem
        "Produtor Origem": cotacao.produtor_origem?.nome || "",
        "Produtor Origem Email": cotacao.produtor_origem?.email || "",
        "Produtor Origem Código": cotacao.produtor_origem?.codigo_prod || "",
        // Produtor Negociador
        "Produtor Negociador": cotacao.produtor_negociador?.nome || "",
        "Produtor Negociador Email": cotacao.produtor_negociador?.email || "",
        "Produtor Negociador Código": cotacao.produtor_negociador?.codigo_prod || "",
        // Produtor Cotador
        "Produtor Cotador": cotacao.produtor_cotador?.nome || "",
        "Produtor Cotador Email": cotacao.produtor_cotador?.email || "",
        "Produtor Cotador Código": cotacao.produtor_cotador?.codigo_prod || "",
        // Seguradora
        Seguradora: cotacao.seguradora?.nome || "",
        "Seguradora Código": cotacao.seguradora?.codigo || "",
        // Ramo
        "Ramo Código": cotacao.ramo?.codigo || "",
        "Ramo Descrição": cotacao.ramo?.descricao || "",
        "Ramo Agrupado": cotacao.ramo?.ramo_agrupado || "",
        "Ramo Segmento": cotacao.ramo?.segmento || "",
        // Captação
        Captação: cotacao.captacao?.descricao || "",
        // Status Seguradora
        "Status Seguradora": cotacao.status_seguradora?.descricao || "",
        "Status Seguradora Código": cotacao.status_seguradora?.codigo || "",
        // Cliente
        "Cliente Email": cotacao.cliente?.email || "",
        "Cliente Telefone": cotacao.cliente?.telefone || "",
        "Cliente Endereço": cotacao.cliente?.endereco || "",
        "Cliente Cidade": cotacao.cliente?.cidade || "",
        "Cliente UF": cotacao.cliente?.uf || "",
        "Cliente CEP": cotacao.cliente?.cep || "",
        // Metadados
        "Criado em": formatDateTime(cotacao.created_at),
        "Atualizado em": formatDateTime(cotacao.updated_at),
        Módulo: cotacao.modulo || "",
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Auto-width columns
      const colWidths = Object.keys(excelData[0] || {}).map((key) => ({
        wch: Math.max(key.length, 15),
      }));
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Cotações");

      // Generate filename
      const criterioLabel = criterio === "data_fechamento" ? "Fechamento" : "InicioVigencia";
      const periodoLabel = ano ? (mes ? `${ano}-${mes}` : ano) : "Todos";
      const filename = `Cotacoes_${criterioLabel}_${periodoLabel}_${new Date().toISOString().split("T")[0]}.xlsx`;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Cotações
          </DialogTitle>
          <DialogDescription>
            Selecione os filtros para exportar as cotações em Excel
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Critério */}
          <div className="space-y-2">
            <Label>Critério de Data</Label>
            <Select value={criterio} onValueChange={setCriterio}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o critério" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="data_fechamento">Ano/Mês de Fechamento</SelectItem>
                <SelectItem value="inicio_vigencia">Ano/Mês de Início de Vigência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ano e Mês */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Ano</Label>
              <Select value={ano} onValueChange={setAno}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
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
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
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

          {/* Produtor */}
          <div className="space-y-2">
            <Label>Produtor</Label>
            <Select value={produtorId} onValueChange={setProdutorId}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os produtores" />
              </SelectTrigger>
              <SelectContent>
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
              <SelectTrigger>
                <SelectValue placeholder="Todas as unidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as unidades</SelectItem>
                {unidades.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={loading}>
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
