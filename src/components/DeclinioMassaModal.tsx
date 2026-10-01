import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { X, Ban, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStatusSeguradora } from "@/hooks/useSupabaseData";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { MultiSelect } from "@/components/ui/multi-select";

const MOTIVOS_DECLINIO = ["Relacionamento", "Condição", "Taxa", "Sem proposta"];
const MOTIVOS_RECUSA = ["Sinistralidade", "Já em cotação", "Blacklist", "Fora de perfil", "Condição"];


interface CotacaoLinha {
  id: string;
  numero_cotacao: string;
  segurado: string;
  cpf_cnpj: string;
  produtor_negociador: { nome: string } | null;
  seguradora: { nome: string } | null;
  ramo: { descricao: string } | null;
  status_seguradora_id: string | null;
  status: string;
  motivo_recusa: string | null;
}

interface SeguradoOption {
  key: string;
  segurado: string;
  cpf_cnpj: string;
  total: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pré-seleciona o segurado (CPF/CNPJ) ao abrir */
  initialCpfCnpj?: string | null;
  onSaved?: () => void;
}
interface EditState {
  status_seguradora_id: string;
  motivos: string[];
  recusas: string[];
}

export function DeclinioMassaModal({ open, onOpenChange, initialCpfCnpj, onSaved }: Props) {

  const { statusSeguradora } = useStatusSeguradora();
  const [segurados, setSegurados] = useState<SeguradoOption[]>([]);
  const [loadingSegurados, setLoadingSegurados] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [linhas, setLinhas] = useState<CotacaoLinha[]>([]);
  const [loadingLinhas, setLoadingLinhas] = useState(false);
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Carregar segurados com cotações "Em cotação"
  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoadingSegurados(true);
      try {
        const { data, error } = await supabase
          .from("cotacoes")
          .select("segurado, cpf_cnpj")
          .eq("status", "Em cotação")
          .order("segurado");
        if (error) throw error;
        const map = new Map<string, SeguradoOption>();
        (data || []).forEach((row: { segurado: string; cpf_cnpj: string }) => {
          const key = row.cpf_cnpj || row.segurado;
          const existing = map.get(key);
          if (existing) existing.total += 1;
          else map.set(key, { key, segurado: row.segurado, cpf_cnpj: row.cpf_cnpj, total: 1 });
        });
        setSegurados(Array.from(map.values()).sort((a, b) => a.segurado.localeCompare(b.segurado)));
      } catch (e) {
        logger.error("Erro ao carregar segurados para declínio:", e);
        toast.error("Erro ao carregar segurados");
      } finally {
        setLoadingSegurados(false);
      }
    };
    load();
  }, [open]);

  // Reset ao abrir/fechar
  useEffect(() => {
    if (open) {
      setSelectedKey(initialCpfCnpj || "");
      setLinhas([]);
      setEdits({});
      setShowErrors(false);
    }
  }, [open, initialCpfCnpj]);

  // Carregar cotações do segurado selecionado
  useEffect(() => {
    if (!open || !selectedKey) {
      setLinhas([]);
      return;
    }
    const load = async () => {
      setLoadingLinhas(true);
      try {
        const { data, error } = await supabase
          .from("cotacoes")
          .select(
            `id, numero_cotacao, segurado, cpf_cnpj, status, status_seguradora_id, motivo_recusa,
             produtor_negociador:produtor_negociador_id(nome),
             seguradora:seguradora_id(nome),
             ramo:ramo_id(descricao)`
          )
          .eq("status", "Em cotação")
          .eq("cpf_cnpj", selectedKey)
          .order("numero_cotacao");
        if (error) throw error;
        const rows = (data || []) as unknown as CotacaoLinha[];
        setLinhas(rows);
        const initial: Record<string, EditState> = {};
        rows.forEach((r) => {
          const recusaPart = r.motivo_recusa?.includes("||")
            ? r.motivo_recusa.split("||")[0].trim()
            : (r.motivo_recusa || "");
          const declinadoPart = r.motivo_recusa?.includes("||")
            ? r.motivo_recusa.split("||")[1].trim()
            : "";
          initial[r.id] = {
            status_seguradora_id: r.status_seguradora_id || "",
            motivos: declinadoPart ? declinadoPart.split(",").map((m) => m.trim()).filter(Boolean) : [],
            recusas: recusaPart ? recusaPart.split(",").map((m) => m.trim()).filter(Boolean) : [],
          };
        });
        setEdits(initial);
        setShowErrors(false);
      } catch (e) {
        logger.error("Erro ao carregar cotações do segurado:", e);
        toast.error("Erro ao carregar cotações do segurado");
      } finally {
        setLoadingLinhas(false);
      }
    };
    load();
  }, [open, selectedKey]);

  const removerLinha = (id: string) => {
    setLinhas((prev) => prev.filter((l) => l.id !== id));
    setEdits((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const statusEhRecusa = (id: string) =>
    statusSeguradora.find((status) => status.id === id)?.descricao?.toLowerCase().includes("recus") ?? false;

  const algumRecusa = linhas.some((linha) => statusEhRecusa(edits[linha.id]?.status_seguradora_id || ""));

  const pendencias = useMemo(
    () => linhas.filter((l) => {
      const edit = edits[l.id];
      return !edit?.status_seguradora_id || !edit.motivos.length ||
        (statusEhRecusa(edit.status_seguradora_id) && !edit.recusas.length);
    }).length,
    [linhas, edits, statusSeguradora]
  );

  const handleDeclinar = () => {
    if (linhas.length === 0) return;
    if (pendencias > 0) {
      setShowErrors(true);
      toast.error("Preencha o Status da Seguradora, Motivo do Declínio e, quando houver Recusa, Motivo da Recusa.");
      return;
    }
    setConfirmOpen(true);
  };

  const confirmarDeclinio = async () => {
    setSaving(true);
    try {
      for (const linha of linhas) {
        const e = edits[linha.id];
        const { error } = await supabase
          .from("cotacoes")
          .update({
            status_seguradora_id: e.status_seguradora_id,
            status: "Declinado",
            motivo_recusa: `${statusEhRecusa(e.status_seguradora_id) ? e.recusas.join(", ") : ""}||${e.motivos.join(", ")}`,
          })
          .eq("id", linha.id);
        if (error) throw error;
      }
      toast.success(`${linhas.length} cotação(ões) atualizada(s) com sucesso!`);
      setConfirmOpen(false);
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      logger.error("Erro ao declinar cotações:", e);
      toast.error("Erro ao declinar cotações");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5" />
              Declinar Cotações
            </DialogTitle>
            <DialogDescription>
              Selecione o segurado e atualize os status das cotações em aberto em uma única operação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Segurado</Label>
              <Select value={selectedKey} onValueChange={setSelectedKey} disabled={loadingSegurados}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={loadingSegurados ? "Carregando..." : "Selecione o segurado"} />
                </SelectTrigger>
                <SelectContent>
                  {segurados.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.segurado} ({s.total})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loadingLinhas && (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando cotações...
              </div>
            )}

            {!loadingLinhas && selectedKey && linhas.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Nenhuma cotação "Em cotação" para este segurado.
              </div>
            )}

            {!loadingLinhas && linhas.length > 0 && (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Número</TableHead>
                      <TableHead className="whitespace-nowrap">Produtor Negociador</TableHead>
                      <TableHead className="whitespace-nowrap">Seguradora</TableHead>
                      <TableHead className="whitespace-nowrap">Ramo</TableHead>
                      <TableHead className="whitespace-nowrap">Status da Seguradora</TableHead>
                      {algumRecusa && <TableHead className="whitespace-nowrap">Motivo(s) da Recusa</TableHead>}
                      <TableHead className="whitespace-nowrap">Motivo(s) do Declínio</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhas.map((linha) => {
                      const e = edits[linha.id] || { status_seguradora_id: "", motivos: [] as string[], recusas: [] as string[] };
                      const isRecusa = statusEhRecusa(e.status_seguradora_id);
                      const erroRetorno = showErrors && !e.status_seguradora_id;
                      const erroMotivo = showErrors && e.motivos.length === 0;
                      const erroRecusa = showErrors && isRecusa && (e.recusas?.length || 0) === 0;
                      return (
                        <TableRow key={linha.id} className={cn((erroRetorno || erroMotivo || erroRecusa) && "bg-destructive/5")}>
                          <TableCell className="font-mono whitespace-nowrap">{linha.numero_cotacao}</TableCell>
                          <TableCell className="whitespace-nowrap">{linha.produtor_negociador?.nome || "-"}</TableCell>
                          <TableCell className="whitespace-nowrap">{linha.seguradora?.nome || "-"}</TableCell>
                          <TableCell className="whitespace-nowrap">{linha.ramo?.descricao || "-"}</TableCell>
                          <TableCell>
                            <Select
                              value={e.status_seguradora_id}
                              onValueChange={(v) =>
                                setEdits((prev) => ({
                                  ...prev,
                                  [linha.id]: {
                                    ...prev[linha.id],
                                    status_seguradora_id: v,
                                    recusas: statusEhRecusa(v) ? prev[linha.id]?.recusas || [] : [],
                                  },
                                }))
                              }
                            >
                              <SelectTrigger
                                className={cn("h-9 min-w-[170px]", erroRetorno && "border-destructive ring-1 ring-destructive")}
                              >
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {statusSeguradora.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.descricao}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {erroRetorno && <p className="text-xs text-destructive mt-1">Obrigatório</p>}
                          </TableCell>
                          {algumRecusa && (
                            <TableCell>
                              {isRecusa ? (
                                <>
                                  <div className={cn("min-w-[200px] rounded-md", erroRecusa && "ring-1 ring-destructive")}>
                                    <MultiSelect
                                      options={MOTIVOS_RECUSA.map((m) => ({ value: m, label: m }))}
                                      selected={e.recusas || []}
                                      onChange={(vals) =>
                                        setEdits((prev) => ({ ...prev, [linha.id]: { ...prev[linha.id], recusas: vals } }))
                                      }
                                      placeholder="Selecione"
                                      showSelectAll={false}
                                        defaultMultiMode
                                        showSelectedChips
                                        className="h-auto min-h-8"
                                    />
                                  </div>
                                  {erroRecusa && <p className="text-xs text-destructive mt-1">Selecione ao menos um motivo</p>}
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          )}
                          <TableCell>
                            <div className={cn("min-w-[200px] rounded-md", erroMotivo && "ring-1 ring-destructive")}>
                              <MultiSelect
                                options={MOTIVOS_DECLINIO.map((m) => ({ value: m, label: m }))}
                                selected={e.motivos}
                                onChange={(vals) =>
                                  setEdits((prev) => ({ ...prev, [linha.id]: { ...prev[linha.id], motivos: vals } }))
                                }
                                placeholder="Selecione"
                                showSelectAll={false}
                                defaultMultiMode
                                showSelectedChips
                                className="h-auto min-h-8"
                              />
                            </div>
                            {erroMotivo && <p className="text-xs text-destructive mt-1">Selecione ao menos um motivo</p>}
                          </TableCell>

                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removerLinha(linha.id)}
                              title="Remover desta operação"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDeclinar} disabled={linhas.length === 0 || saving}>
              Declinar Cotações {linhas.length > 0 ? `(${linhas.length})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar declínio</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja concluir o declínio de {linhas.length} cotação(ões) deste segurado?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(ev) => { ev.preventDefault(); confirmarDeclinio(); }} disabled={saving}>
              {saving ? "Salvando..." : "Confirmar Declínio"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
