import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
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
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Info, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

interface ImportRealizadoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ano: number;
  onImported: () => void;
}

interface ParsedRow {
  inicio_vigencia: string;
  seguradora_nome: string | null;
  ramo_nome: string | null;
  cnpj: string | null;
  valor_premio: number;
  produtores: { nome: string; tipo: string }[];
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

// Converte serial date do Excel ou string para YYYY-MM-DD
function parseExcelDate(value: any): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    const d = XLSX.SSF.parse_date_code(value);
    if (!d) return null;
    const mm = String(d.m).padStart(2, "0");
    const dd = String(d.d).padStart(2, "0");
    return `${d.y}-${mm}-${dd}`;
  }
  const s = String(value).trim();
  // DD/MM/YYYY
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  // YYYY-MM-DD já
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  }
  return null;
}

function parseNumber(v: any): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

const normalizeKey = (k: string) =>
  k
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

// Mapa de chaves aceitas → campo lógico
const HEADER_ALIASES: Record<string, string> = {
  "seg.": "seguradora",
  seguradora: "seguradora",
  ramo: "ramo",
  "cpf/cnpj": "cnpj",
  cnpj: "cnpj",
  "inicio de vig.": "inicio_vig",
  "início de vig.": "inicio_vig",
  "inicio vig.": "inicio_vig",
  "início vigência": "inicio_vig",
  "pr. liquido": "valor",
  "pr. líquido": "valor",
  "pr liquido": "valor",
  produtor: "produtor",
  "prod. indireto": "prod_indireto_1",
  "prod. indireto 1": "prod_indireto_1",
  "prod. indireto 2": "prod_indireto_2",
  "prod. indireto 3": "prod_indireto_3",
};

export const ImportRealizadoModal = ({
  open,
  onOpenChange,
  ano,
  onImported,
}: ImportRealizadoModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [yearMismatch, setYearMismatch] = useState<number>(0);
  const [existingCount, setExistingCount] = useState<number | null>(null);
  const [lastImportAt, setLastImportAt] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { count } = await supabase
        .from("realizado_premio")
        .select("id", { count: "exact", head: true })
        .eq("ano", ano);
      setExistingCount(count ?? 0);
      const { data: lastImp } = await supabase
        .from("realizado_premio_importacoes")
        .select("importado_em")
        .eq("ano", ano)
        .order("importado_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      setLastImportAt(lastImp?.importado_em ?? null);
    })();
  }, [open, ano]);

  const resetState = () => {
    setFile(null);
    setParsed(null);
    setParseError(null);
    setYearMismatch(0);
  };

  const handleFile = async (f: File) => {
    setFile(f);
    setParsed(null);
    setParseError(null);
    setYearMismatch(0);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
        defval: null,
        raw: true,
      });
      if (!rows.length) {
        setParseError("Planilha vazia.");
        return;
      }

      // Mapeia cabeçalhos
      const headerMap: Record<string, string> = {};
      Object.keys(rows[0]).forEach((k) => {
        const norm = normalizeKey(k);
        if (HEADER_ALIASES[norm]) headerMap[HEADER_ALIASES[norm]] = k;
      });

      const required = ["inicio_vig", "valor", "produtor"];
      const missing = required.filter((r) => !headerMap[r]);
      if (missing.length) {
        setParseError(
          `Colunas obrigatórias não encontradas: ${missing.join(", ")}. Cabeçalhos detectados: ${Object.keys(rows[0]).join(", ")}`,
        );
        return;
      }

      const parsedRows: ParsedRow[] = [];
      let mismatchCount = 0;

      for (const r of rows) {
        const dateStr = parseExcelDate(r[headerMap.inicio_vig]);
        if (!dateStr) continue;
        const year = parseInt(dateStr.slice(0, 4), 10);
        if (year !== ano) {
          mismatchCount++;
          continue;
        }
        const valor = parseNumber(r[headerMap.valor]);
        const produtores: { nome: string; tipo: string }[] = [];
        const addProd = (key: string, tipo: string) => {
          const v = headerMap[key] ? r[headerMap[key]] : null;
          if (v != null && String(v).trim()) {
            produtores.push({ nome: String(v).trim(), tipo });
          }
        };
        addProd("produtor", "Cotador");
        addProd("prod_indireto_1", "Indireto 1");
        addProd("prod_indireto_2", "Indireto 2");
        addProd("prod_indireto_3", "Indireto 3");

        if (!produtores.length) continue;

        parsedRows.push({
          inicio_vigencia: dateStr,
          seguradora_nome: headerMap.seguradora
            ? r[headerMap.seguradora]
              ? String(r[headerMap.seguradora]).trim()
              : null
            : null,
          ramo_nome: headerMap.ramo
            ? r[headerMap.ramo]
              ? String(r[headerMap.ramo]).trim()
              : null
            : null,
          cnpj: headerMap.cnpj
            ? r[headerMap.cnpj]
              ? String(r[headerMap.cnpj]).trim()
              : null
            : null,
          valor_premio: valor,
          produtores,
        });
      }

      setYearMismatch(mismatchCount);
      setParsed(parsedRows);
    } catch (e: any) {
      logger.error("Erro ao ler planilha:", e);
      setParseError(`Erro ao ler arquivo: ${e?.message ?? e}`);
    }
  };

  const totalValor = parsed
    ? parsed.reduce((s, r) => s + r.valor_premio, 0)
    : 0;

  const handleImport = async () => {
    if (!parsed?.length) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "import-realizado-premio",
        {
          body: {
            ano,
            arquivo_nome: file?.name ?? null,
            linhas: parsed,
          },
        },
      );
      if (error) throw error;
      const result = data as any;
      toast({
        title: "Importação concluída",
        description: `${result.linhas_inseridas} linhas importadas.${result.produtores_nao_encontrados?.length ? ` ${result.produtores_nao_encontrados.length} produtor(es) não encontrado(s).` : ""}`,
      });
      onImported();
      onOpenChange(false);
      resetState();
    } catch (e: any) {
      logger.error("Erro ao importar realizado:", e);
      toast({
        title: "Erro ao importar",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!loading) {
          onOpenChange(o);
          if (!o) resetState();
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Realizado de Prêmio - {ano}
          </DialogTitle>
          <DialogDescription>
            Carregue a planilha (.xlsx) com as colunas <strong>Seg., Ramo, CPF/CNPJ, Início de Vig., Pr. Líquido, Produtor, Prod. Indireto 1/2/3</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="file" className="text-sm">
              Arquivo
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                id="file"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
                className="flex-1 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
              />
            </div>
          </div>

          {parseError && (
            <div className="flex items-start gap-2 p-3 rounded bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {parsed && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 rounded bg-success-alt/10 text-sm">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-success-alt" />
                <div className="flex-1">
                  <div className="font-medium">
                    {parsed.length} linha(s) prontas para importar
                  </div>
                  <div className="text-muted-foreground">
                    Soma de Pr. Líquido: {formatCurrency(totalValor)}
                  </div>
                  {yearMismatch > 0 && (
                    <div className="text-amber-600 dark:text-amber-400 mt-1">
                      {yearMismatch} linha(s) ignorada(s) por estarem fora do ano {ano}.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm">Modo de importação</Label>
                <RadioGroup
                  value={modo}
                  onValueChange={(v) => setModo(v as any)}
                  className="mt-2 space-y-1"
                >
                  <div className="flex items-start gap-2">
                    <RadioGroupItem value="substituir" id="m-sub" className="mt-1" />
                    <Label htmlFor="m-sub" className="font-normal cursor-pointer">
                      <span className="font-medium">Substituir</span> — apaga todos os dados de realizado de {ano} antes de inserir.
                    </Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <RadioGroupItem value="adicionar" id="m-add" className="mt-1" />
                    <Label htmlFor="m-add" className="font-normal cursor-pointer">
                      <span className="font-medium">Adicionar</span> — soma estas linhas ao realizado já existente de {ano}.
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetState();
            }}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parsed?.length || loading}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {loading ? "Importando..." : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
