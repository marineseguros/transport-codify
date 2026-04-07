import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Cotacao as DashboardCotacao } from '@/hooks/useSupabaseData';

interface Produto {
  id: string;
  segurado: string;
  consultor: string;
  data_registro: string;
  tipo: string;
  subtipo?: string | null;
}

const normalizeLabel = (value?: string | null) =>
  (value || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

const getBranchGroup = (ramo: { descricao?: string; ramo_agrupado?: string | null } | undefined | null): string => {
  if (!ramo) return 'Outros';
  if (ramo.ramo_agrupado) return ramo.ramo_agrupado;
  const ramoUpper = (ramo.descricao || '').toUpperCase();
  if (ramoUpper.includes('RCTR-C') || ramoUpper.includes('RC-DC')) return 'RCTR-C + RC-DC';
  return ramo.descricao || 'Outros';
};

interface CategoriaDetailPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoria: string;
  allProdutos: Produto[];
  allCotacoes: DashboardCotacao[];
  produtorFilter?: string[];
  availableMonths: string[];
}

interface ProdutoRow {
  id: string;
  segurado: string;
  consultor: string;
  data: string;
  tipo: string;
  subtipo?: string | null;
}

interface CotacaoRow {
  key: string;
  segurado: string;
  cpfCnpj: string;
  ramo: string;
  seguradora: string;
  produtor: string;
  data: string;
  status: string;
  premio: number;
}

export const CategoriaDetailPopup = ({
  open,
  onOpenChange,
  categoria,
  allProdutos,
  allCotacoes,
  produtorFilter,
  availableMonths,
}: CategoriaDetailPopupProps) => {

  // Build date ranges from availableMonths
  const monthRanges = useMemo(() =>
    availableMonths.map((mk) => {
      const [y, m] = mk.split('-').map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      return { start, end };
    }), [availableMonths]);

  const isProdutoCategory = categoria !== 'Cotação' && categoria !== 'Fechamento';

  // Produtos-based categories
  const produtoRows = useMemo<ProdutoRow[]>(() => {
    if (!isProdutoCategory) return [];

    const filtered = allProdutos.filter((p) => {
      const d = new Date(p.data_registro);
      const inMonth = monthRanges.some((r) => d >= r.start && d <= r.end);
      if (!inMonth) return false;
      if (produtorFilter?.length && !produtorFilter.includes(p.consultor)) return false;

      if (categoria === 'Coleta') return p.tipo === 'Coleta';
      if (categoria === 'Vídeo') return p.tipo === 'Visita/Video' && normalizeLabel(p.subtipo) === 'video';
      if (categoria === 'Visita') return p.tipo === 'Visita/Video' && normalizeLabel(p.subtipo) === 'visita';
      if (categoria === 'Indicação') return p.tipo === 'Indicação';
      return false;
    });

    return filtered.map((p) => ({
      id: p.id,
      segurado: p.segurado || '—',
      consultor: p.consultor,
      data: p.data_registro,
      tipo: p.tipo,
      subtipo: p.subtipo,
    })).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [allProdutos, monthRanges, produtorFilter, categoria, isProdutoCategory]);

  // Cotação-based category
  const cotacaoRows = useMemo<CotacaoRow[]>(() => {
    if (categoria !== 'Cotação') return [];

    const filtered = allCotacoes.filter((c) => {
      const d = new Date(c.data_cotacao);
      const inMonth = monthRanges.some((r) => d >= r.start && d <= r.end);
      if (!inMonth) return false;
      if (produtorFilter?.length && !produtorFilter.includes(c.produtor_cotador?.nome || '')) return false;
      return true;
    });

    // Group by CPF/CNPJ + branch group (distinct counting)
    const groups = new Map<string, DashboardCotacao[]>();
    filtered.forEach((c) => {
      const key = `${c.cpf_cnpj}_${getBranchGroup(c.ramo)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    });

    return Array.from(groups.entries()).map(([key, cotacoes]) => {
      const first = cotacoes[0];
      const seguradoras = [...new Set(cotacoes.map((c) => c.seguradora?.nome).filter(Boolean))].join(' | ');
      return {
        key,
        segurado: first.segurado,
        cpfCnpj: first.cpf_cnpj,
        ramo: getBranchGroup(first.ramo),
        seguradora: seguradoras || '—',
        produtor: first.produtor_cotador?.nome || '—',
        data: first.data_cotacao,
        status: first.status,
        premio: cotacoes.reduce((s, c) => s + (c.valor_premio || 0), 0),
      };
    }).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [allCotacoes, monthRanges, produtorFilter, categoria]);

  // Fechamento-based category
  const fechamentoRows = useMemo<CotacaoRow[]>(() => {
    if (categoria !== 'Fechamento') return [];

    const closed = allCotacoes.filter((c) => {
      if (c.status !== 'Negócio fechado' && c.status !== 'Fechamento congênere') return false;
      if (!c.data_fechamento) return false;
      const d = new Date(c.data_fechamento);
      const inMonth = monthRanges.some((r) => d >= r.start && d <= r.end);
      if (!inMonth) return false;
      if (produtorFilter?.length && !produtorFilter.includes(c.produtor_origem?.nome || '')) return false;
      return true;
    });

    // Group by CPF/CNPJ + branch group (non-Avulso), individual for Avulso
    const groups = new Map<string, DashboardCotacao[]>();
    let avulsoIdx = 0;
    closed.forEach((c) => {
      const key = c.ramo?.segmento === 'Avulso'
        ? `avulso_${avulsoIdx++}`
        : `${c.cpf_cnpj}_${getBranchGroup(c.ramo)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    });

    return Array.from(groups.entries()).map(([key, cotacoes]) => {
      const first = cotacoes[0];
      const seguradoras = [...new Set(cotacoes.map((c) => c.seguradora?.nome).filter(Boolean))].join(' | ');
      return {
        key,
        segurado: first.segurado,
        cpfCnpj: first.cpf_cnpj,
        ramo: getBranchGroup(first.ramo),
        seguradora: seguradoras || '—',
        produtor: first.produtor_origem?.nome || '—',
        data: first.data_fechamento || first.data_cotacao,
        status: first.status,
        premio: cotacoes.reduce((s, c) => s + (c.valor_premio || 0), 0),
      };
    }).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [allCotacoes, monthRanges, produtorFilter, categoria]);

  const isCotacaoType = categoria === 'Cotação' || categoria === 'Fechamento';
  const rows = isCotacaoType ? (categoria === 'Cotação' ? cotacaoRows : fechamentoRows) : [];
  const totalCount = isCotacaoType ? rows.length : produtoRows.length;

  const formatDate = (d: string) => {
    try { return format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[calc(100vw-2rem)] max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            Detalhamento — {categoria}
            <Badge variant="secondary" className="text-xs">{totalCount} registros</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {isProdutoCategory ? (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Segurado</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Produtor</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {produtoRows.map((p, i) => (
                    <tr key={p.id} className="border-t hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="px-3 py-2 font-medium truncate max-w-[200px]">{p.segurado}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.consultor}</td>
                      <td className="px-3 py-2 text-center text-muted-foreground text-xs">{formatDate(p.data)}</td>
                    </tr>
                  ))}
                  {produtoRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                        Nenhum registro encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Segurado</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Ramo</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Seguradora</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Produtor</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Data</th>
                    {categoria === 'Fechamento' && (
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Prêmio</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.key} className="border-t hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="px-3 py-2 font-medium truncate max-w-[180px]">{r.segurado}</td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{r.ramo}</td>
                      <td className="px-3 py-2 text-muted-foreground text-xs truncate max-w-[120px]">{r.seguradora}</td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{r.produtor}</td>
                      <td className="px-3 py-2 text-center text-muted-foreground text-xs">{formatDate(r.data)}</td>
                      {categoria === 'Fechamento' && (
                        <td className="px-3 py-2 text-right text-xs font-medium text-success">
                          {formatCurrency(r.premio)}
                        </td>
                      )}
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={categoria === 'Fechamento' ? 7 : 6} className="px-3 py-6 text-center text-muted-foreground">
                        Nenhum registro encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
