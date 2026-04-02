import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, FileText, Building } from "lucide-react";
import { type Cotacao } from "@/hooks/useSupabaseData";

type KpiType = 'emCotacao' | 'fechado' | 'declinado';

interface KpiDetailModalProps {
  open: boolean;
  onClose: () => void;
  type: KpiType;
  cotacoes: Cotacao[];
  cardDistinctCount: number;
  formatCurrency: (value: number) => string;
  formatDate: (dateString: string) => string;
}

const typeConfig: Record<KpiType, { title: string; color: string; badgeVariant: 'default' | 'success-alt' | 'warning' | 'destructive' }> = {
  emCotacao: { title: 'Clientes em Cotação no Período', color: 'text-brand-orange', badgeVariant: 'warning' },
  fechado: { title: 'Clientes Fechados no Período', color: 'text-success', badgeVariant: 'success-alt' },
  declinado: { title: 'Clientes Declinados no Período', color: 'text-destructive', badgeVariant: 'destructive' },
};

const getBranchGroup = (ramo: { descricao?: string; ramo_agrupado?: string | null } | undefined | null): string => {
  if (!ramo) return "Outros";
  if (ramo.ramo_agrupado) return ramo.ramo_agrupado;
  const ramoUpper = (ramo.descricao || '').toUpperCase();
  if (ramoUpper.includes("RCTR-C") || ramoUpper.includes("RC-DC")) return "RCTR-C + RC-DC";
  return ramo.descricao || "Outros";
};

interface SegmentoGroup {
  key: string;
  segurado: string;
  cpfCnpj: string;
  ramoGroup: string;
  premioTotal: number;
  cotacoes: Cotacao[];
}

export function KpiDetailModal({ open, onClose, type, cotacoes, formatCurrency, formatDate }: KpiDetailModalProps) {
  const config = typeConfig[type];
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const map = new Map<string, SegmentoGroup>();
    cotacoes.forEach((c) => {
      const ramoGroup = getBranchGroup(c.ramo);
      const key = `${c.cpf_cnpj}_${ramoGroup}`;
      if (!map.has(key)) {
        map.set(key, { key, segurado: c.segurado, cpfCnpj: c.cpf_cnpj, ramoGroup, premioTotal: 0, cotacoes: [] });
      }
      const g = map.get(key)!;
      g.premioTotal += c.valor_premio || 0;
      g.cotacoes.push(c);
    });
    return Array.from(map.values()).sort((a, b) => b.premioTotal - a.premioTotal);
  }, [cotacoes]);

  const totalPremio = useMemo(() => cotacoes.reduce((s, c) => s + (c.valor_premio || 0), 0), [cotacoes]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            <span>{config.title}</span>
            <Badge variant={config.badgeVariant} className="ml-2">{groups.length} segmentos</Badge>
            <Badge variant="secondary" className="ml-1">{cotacoes.length} cotações</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg">
          <div className="text-center">
            <p className={`text-xl font-bold ${config.color}`}>{groups.length}</p>
            <p className="text-xs text-muted-foreground">Segmentos</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-primary">{formatCurrency(totalPremio)}</p>
            <p className="text-xs text-muted-foreground">Prêmio Total</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{cotacoes.length}</p>
            <p className="text-xs text-muted-foreground">Total Cotações</p>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-background z-10">
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-2 px-3 font-medium w-8"></th>
                <th className="text-left py-2 px-2 font-medium">Segurado</th>
                <th className="text-left py-2 px-2 font-medium">CPF/CNPJ</th>
                <th className="text-left py-2 px-2 font-medium">Ramo Agrupado</th>
                <th className="text-center py-2 px-2 font-medium">Qtd</th>
                <th className="text-right py-2 px-2 font-medium">Prêmio</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-xs text-muted-foreground py-8">
                    Nenhum registro encontrado no período
                  </td>
                </tr>
              )}
              {groups.map((group) => {
                const isExpanded = expandedGroups.has(group.key);
                return (
                  <>
                    <tr
                      key={group.key}
                      className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => toggleGroup(group.key)}
                    >
                      <td className="py-2 px-3">
                        {isExpanded
                          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <Building className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="font-medium">{group.segurado}</span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-xs text-muted-foreground font-mono">{group.cpfCnpj}</td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className="text-xs">{group.ramoGroup}</Badge>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <Badge variant="secondary" className="text-xs">{group.cotacoes.length}</Badge>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span className={`font-semibold ${config.color}`}>{formatCurrency(group.premioTotal)}</span>
                      </td>
                    </tr>
                    {isExpanded && group.cotacoes.map((cotacao) => (
                      <tr key={cotacao.id} className="bg-muted/10 border-b border-border/30">
                        <td className="py-1.5 px-3"></td>
                        <td colSpan={5} className="py-1.5 px-2">
                          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-2 text-xs text-muted-foreground items-center">
                            <div>
                              <span className="text-[10px] text-muted-foreground/60 block">Ramo</span>
                              {cotacao.ramo?.descricao || '—'}
                            </div>
                            <div>
                              <span className="text-[10px] text-muted-foreground/60 block">Seguradora</span>
                              {cotacao.seguradora?.nome || '—'}
                            </div>
                            <div>
                              <span className="text-[10px] text-muted-foreground/60 block">Captação</span>
                              {cotacao.captacao?.descricao || '—'}
                            </div>
                            <div>
                              <span className="text-[10px] text-muted-foreground/60 block">Produtor Origem</span>
                              {cotacao.produtor_origem?.nome || '—'}
                            </div>
                            <div>
                              <span className="text-[10px] text-muted-foreground/60 block">
                                {type === 'fechado' ? 'Fechamento' : 'Data Cotação'}
                              </span>
                              {type === 'fechado'
                                ? (cotacao.data_fechamento ? formatDate(cotacao.data_fechamento) : '—')
                                : formatDate(cotacao.data_cotacao)}
                              {cotacao.inicio_vigencia && (
                                <span className="ml-2 text-muted-foreground/60">
                                  Vig: {formatDate(cotacao.inicio_vigencia)}
                                </span>
                              )}
                            </div>
                            <div className="text-right font-medium text-foreground">
                              {formatCurrency(cotacao.valor_premio)}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
