import { useState, useMemo, useCallback, Fragment } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, FileText, Building, ArrowUpDown, ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
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
  periodStart?: Date;
  periodEnd?: Date;
  periodDistinctCount?: number;
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
  hasNew: boolean;
  newCount: number;
}


type SortField = 'segurado' | 'ramoGroup' | null;
type SortDirection = 'asc' | 'desc';

export function KpiDetailModal({ open, onClose, type, cotacoes, cardDistinctCount, formatCurrency, formatDate, periodStart, periodEnd, periodDistinctCount }: KpiDetailModalProps) {
  const config = typeConfig[type];
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('segurado');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const toDateKey = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);


  const isInPeriod = useCallback((dateStr?: string | null) => {
    if (!periodStart || !periodEnd || !dateStr) return false;
    const dateKey = dateStr.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
    return dateKey >= toDateKey(periodStart) && dateKey <= toDateKey(periodEnd);
  }, [periodStart, periodEnd, toDateKey]);

  const dateFieldForNew = type === 'fechado' ? 'data_fechamento' : 'data_cotacao';

  const isCotacaoNew = useCallback((c: Cotacao) => {
    const v = (c as any)[dateFieldForNew] as string | undefined;
    return isInPeriod(v);
  }, [isInPeriod, dateFieldForNew]);

  const groups = useMemo(() => {
    const map = new Map<string, SegmentoGroup>();
    cotacoes.forEach((c) => {
      const ramoGroup = getBranchGroup(c.ramo);
      const key = `${c.cpf_cnpj}_${ramoGroup}`;
      if (!map.has(key)) {
        map.set(key, { key, segurado: c.segurado, cpfCnpj: c.cpf_cnpj, ramoGroup, premioTotal: 0, cotacoes: [], hasNew: false, newCount: 0 });
      }
      const g = map.get(key)!;
      g.premioTotal += c.valor_premio || 0;
      g.cotacoes.push(c);
      if (isCotacaoNew(c)) {
        g.hasNew = true;
        g.newCount += 1;
      }
    });
    const arr = Array.from(map.values());
    if (sortField) {
      arr.sort((a, b) => {
        const valA = a[sortField].toUpperCase();
        const valB = b[sortField].toUpperCase();
        const cmp = valA.localeCompare(valB, 'pt-BR');
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    } else {
      arr.sort((a, b) => b.premioTotal - a.premioTotal);
    }
    return arr;
  }, [cotacoes, sortField, sortDirection, isCotacaoNew]);

  const novosClientesNoMes = useMemo(() => groups.filter(g => g.hasNew).length, [groups]);
  const shouldSeparateNew = type === 'emCotacao' && !!periodStart && !!periodEnd;
  const novosNoMesCount = periodDistinctCount ?? novosClientesNoMes;
  const newGroups = useMemo(() => shouldSeparateNew ? groups.filter(g => g.hasNew) : [], [groups, shouldSeparateNew]);
  const otherGroups = useMemo(() => shouldSeparateNew ? groups.filter(g => !g.hasNew) : groups, [groups, shouldSeparateNew]);


  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  const allExpanded = groups.length > 0 && expandedGroups.size === groups.length;

  const toggleAll = useCallback(() => {
    if (allExpanded) {
      setExpandedGroups(new Set());
    } else {
      setExpandedGroups(new Set(groups.map(g => g.key)));
    }
  }, [allExpanded, groups]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground/50" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1 text-primary" />
      : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
  };

  const renderGroupRows = (items: SegmentoGroup[]) => items.map((group) => {
    const isExpanded = expandedGroups.has(group.key);
    return (
      <Fragment key={group.key}>
        <tr
          className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
          onClick={() => toggleGroup(group.key)}
        >
          <td className="py-2 px-3">
            {isExpanded
              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          </td>
          <td className="py-2 px-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Building className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="font-medium">{group.segurado}</span>
              {group.hasNew && (
                <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                  Novo no mês{group.newCount > 1 ? ` (${group.newCount})` : ''}
                </Badge>
              )}
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
          <tr key={cotacao.id} className={`border-b border-border/30 ${isCotacaoNew(cotacao) ? 'bg-warning/10' : 'bg-muted/10'}`}>
            <td className="py-1.5 px-3">
              {isCotacaoNew(cotacao) && (
                <Badge variant="warning" className="text-[9px] px-1 py-0">Novo</Badge>
              )}
            </td>
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
      </Fragment>
    );
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base flex-wrap">
            <FileText className="h-5 w-5" />
            <span>{config.title}</span>
            <Badge variant={config.badgeVariant} className="ml-2">{cardDistinctCount} {type === 'fechado' ? 'fechamentos' : type === 'emCotacao' ? 'em cotação' : 'declinados'}</Badge>
            {shouldSeparateNew && (
              <Badge variant="warning">Novos no mês: {novosNoMesCount}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {(() => {
          const distinctClients = new Set(cotacoes.map(c => c.cpf_cnpj)).size;
          const indice = distinctClients > 0 ? (cardDistinctCount / distinctClients) : 0;
          const typeLabel = type === 'fechado' ? 'Total de Fechamentos' : type === 'emCotacao' ? 'Total em Cotação' : 'Total Declinados';
          return (
            <div className="grid grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="text-center">
                <p className={`text-xl font-bold ${config.color}`}>{cardDistinctCount}</p>
                <p className="text-xs text-muted-foreground">{typeLabel}</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-primary">{distinctClients}</p>
                <p className="text-xs text-muted-foreground">Clientes Distintos</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{indice.toFixed(2).replace('.', ',')}</p>
                <p className="text-xs text-muted-foreground">Índice ({cardDistinctCount} / {distinctClients})</p>
              </div>
            </div>
          );
        })()}


        {groups.length > 0 && (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs gap-1.5 h-7">
              <ChevronsUpDown className="h-3.5 w-3.5" />
              {allExpanded ? 'Recolher Tudo' : 'Expandir Tudo'}
            </Button>
          </div>
        )}

        <div className="overflow-y-auto flex-1">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-background z-10">
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-2 px-3 font-medium w-8"></th>
                <th
                  className="text-left py-2 px-2 font-medium cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => handleSort('segurado')}
                >
                  <div className="flex items-center">
                    Segurado
                    <SortIcon field="segurado" />
                  </div>
                </th>
                <th className="text-left py-2 px-2 font-medium">CPF/CNPJ</th>
                <th
                  className="text-left py-2 px-2 font-medium cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => handleSort('ramoGroup')}
                >
                  <div className="flex items-center">
                    Ramo Agrupado
                    <SortIcon field="ramoGroup" />
                  </div>
                </th>
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
              {shouldSeparateNew && newGroups.length > 0 && (
                <tr className="border-b border-warning/30 bg-warning/10">
                  <td colSpan={6} className="px-3 py-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-warning-foreground">
                      <Badge variant="warning" className="text-[10px] px-1.5 py-0">Novos</Badge>
                      <span>Novos no mês</span>
                    </div>
                  </td>
                </tr>
              )}
              {renderGroupRows(newGroups)}
              {shouldSeparateNew && newGroups.length > 0 && otherGroups.length > 0 && (
                <tr className="border-b border-border/60 bg-muted/20">
                  <td colSpan={6} className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                    Demais registros
                  </td>
                </tr>
              )}
              {renderGroupRows(otherGroups)}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
