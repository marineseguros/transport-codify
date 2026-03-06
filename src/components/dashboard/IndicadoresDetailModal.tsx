import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, TrendingDown, Minus, Filter } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ChartItem {
  categoria: string;
  Meta: number;
  Realizado: number;
}

interface ProdutorPerformance {
  nome: string;
  meta: number;
  realizado: number;
  pct: number;
}

interface IndicadoresDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chartData: ChartItem[];
  produtorData: ProdutorPerformance[];
}

const getStatusColor = (pct: number) => {
  if (pct >= 100) return 'text-success';
  if (pct >= 70) return 'text-warning';
  return 'text-destructive';
};

const getStatusBg = (pct: number) => {
  if (pct >= 100) return 'bg-success/10 text-success border-success/20';
  if (pct >= 70) return 'bg-warning/10 text-warning border-warning/20';
  return 'bg-destructive/10 text-destructive border-destructive/20';
};

const getProgressColor = (pct: number) => {
  if (pct >= 100) return '[&>div]:bg-success';
  if (pct >= 70) return '[&>div]:bg-warning';
  return '[&>div]:bg-destructive';
};

const TrendIcon = ({ pct }: { pct: number }) => {
  if (pct >= 100) return <TrendingUp className="h-3.5 w-3.5 text-success" />;
  if (pct >= 70) return <Minus className="h-3.5 w-3.5 text-warning" />;
  return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
};

export const IndicadoresDetailModal = ({
  open,
  onOpenChange,
  chartData,
  produtorData,
}: IndicadoresDetailModalProps) => {
  const [filterCategoria, setFilterCategoria] = useState<string>('todas');
  const [filterStatus, setFilterStatus] = useState<string>('todos');

  const enrichedData = useMemo(() =>
    chartData.map((item) => {
      const pct = item.Meta > 0 ? (item.Realizado / item.Meta) * 100 : 0;
      const falta = Math.max(0, item.Meta - item.Realizado);
      return { ...item, pct, falta };
    }), [chartData]);

  const filtered = useMemo(() => {
    let data = enrichedData;
    if (filterCategoria !== 'todas') {
      data = data.filter((d) => d.categoria === filterCategoria);
    }
    if (filterStatus === 'atingido') data = data.filter((d) => d.pct >= 100);
    else if (filterStatus === 'parcial') data = data.filter((d) => d.pct >= 70 && d.pct < 100);
    else if (filterStatus === 'critico') data = data.filter((d) => d.pct < 70);
    return data;
  }, [enrichedData, filterCategoria, filterStatus]);

  const totals = useMemo(() => {
    const m = filtered.reduce((s, i) => s + i.Meta, 0);
    const r = filtered.reduce((s, i) => s + i.Realizado, 0);
    return { meta: m, realizado: r, pct: m > 0 ? (r / m) * 100 : 0 };
  }, [filtered]);

  const filteredProdutores = useMemo(() => {
    let data = [...produtorData];
    if (filterStatus === 'atingido') data = data.filter((d) => d.pct >= 100);
    else if (filterStatus === 'parcial') data = data.filter((d) => d.pct >= 70 && d.pct < 100);
    else if (filterStatus === 'critico') data = data.filter((d) => d.pct < 70);
    return data.sort((a, b) => b.pct - a.pct);
  }, [produtorData, filterStatus]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[calc(100vw-2rem)] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" />
            Analítico — Meta x Realizado
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/30 border">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas categorias</SelectItem>
              {chartData.map((c) => (
                <SelectItem key={c.categoria} value={c.categoria}>{c.categoria}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              <SelectItem value="atingido">✅ Atingido (≥100%)</SelectItem>
              <SelectItem value="parcial">⚠️ Parcial (70-99%)</SelectItem>
              <SelectItem value="critico">🔴 Crítico (&lt;70%)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-2xl font-bold">{totals.meta}</p>
            <p className="text-[11px] text-muted-foreground">Total Meta</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-2xl font-bold text-primary">{totals.realizado}</p>
            <p className="text-[11px] text-muted-foreground">Total Realizado</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className={`text-2xl font-bold ${getStatusColor(totals.pct)}`}>
              {totals.pct.toFixed(1)}%
            </p>
            <p className="text-[11px] text-muted-foreground">% Atingido</p>
          </div>
        </div>

        {/* Detail table */}
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Detalhamento por Categoria</h3>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Categoria</th>
                  <th className="text-center px-3 py-2 font-medium text-muted-foreground">Meta</th>
                  <th className="text-center px-3 py-2 font-medium text-muted-foreground">Realizado</th>
                  <th className="text-center px-3 py-2 font-medium text-muted-foreground">Faltam</th>
                  <th className="text-center px-3 py-2 font-medium text-muted-foreground">% Atingido</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground w-[120px]">Progresso</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.categoria} className="border-t hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2.5 font-medium">{item.categoria}</td>
                    <td className="px-3 py-2.5 text-center text-muted-foreground">{item.Meta}</td>
                    <td className="px-3 py-2.5 text-center font-semibold text-primary">{item.Realizado}</td>
                    <td className="px-3 py-2.5 text-center">
                      {item.falta > 0 ? (
                        <span className="text-destructive font-medium">{item.falta}</span>
                      ) : (
                        <span className="text-success font-medium">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Badge variant="outline" className={`text-[11px] px-2 ${getStatusBg(item.pct)}`}>
                        {item.pct.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <Progress
                        value={Math.min(item.pct, 100)}
                        className={`h-2 ${getProgressColor(item.pct)}`}
                      />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground text-sm">
                      Nenhum resultado com os filtros aplicados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Produtor ranking */}
        {filteredProdutores.length > 0 && (
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Ranking por Produtor</h3>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Produtor</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Meta</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">Realizado</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">%</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground w-[140px]">Progresso</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProdutores.map((p, i) => (
                    <tr key={p.nome} className="border-t hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="px-3 py-2.5 font-medium flex items-center gap-1.5">
                        <TrendIcon pct={p.pct} />
                        {p.nome}
                      </td>
                      <td className="px-3 py-2.5 text-center text-muted-foreground">{p.meta}</td>
                      <td className="px-3 py-2.5 text-center font-semibold text-primary">{p.realizado}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-semibold ${getStatusColor(p.pct)}`}>
                          {p.pct.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Progress
                          value={Math.min(p.pct, 100)}
                          className={`h-2 ${getProgressColor(p.pct)}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
