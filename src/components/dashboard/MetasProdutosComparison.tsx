import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, Calendar, Award } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Meta {
  id: string;
  produtor_id: string;
  mes: string;
  tipo_meta_id: string;
  quantidade: number;
  modulo: string;
  produtor?: { id: string; nome: string };
  tipo_meta?: { id: string; descricao: string };
}

interface Produto {
  id: string;
  tipo: string;
  data_registro: string;
  data_realizada: string | null;
  consultor: string;
}

interface TipoMeta {
  id: string;
  descricao: string;
}

interface MetasProdutosComparisonProps {
  filterAno: string;
  filterProdutor: string;
  metas: Meta[];
  tiposMeta: TipoMeta[];
  produtorNome: string;
}

// Map meta types to produto types
const TIPO_META_TO_PRODUTO: Record<string, string[]> = {
  'Coleta': ['Coleta'],
  'Cotação': ['Cotação'],
  'Visita': ['Visita', 'Vídeo'],
  'Vídeo': ['Vídeo'],
  'Indicação': ['Indicação'],
  'Fechamento': ['Fechamento'],
};

const MONTHS = [
  { key: 0, label: 'Jan', value: '01' },
  { key: 1, label: 'Fev', value: '02' },
  { key: 2, label: 'Mar', value: '03' },
  { key: 3, label: 'Abr', value: '04' },
  { key: 4, label: 'Mai', value: '05' },
  { key: 5, label: 'Jun', value: '06' },
  { key: 6, label: 'Jul', value: '07' },
  { key: 7, label: 'Ago', value: '08' },
  { key: 8, label: 'Set', value: '09' },
  { key: 9, label: 'Out', value: '10' },
  { key: 10, label: 'Nov', value: '11' },
  { key: 11, label: 'Dez', value: '12' },
];

const getQuarterColor = (quarter: number) => {
  switch (quarter) {
    case 1: return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
    case 2: return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
    case 3: return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200';
    case 4: return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200';
    default: return 'bg-muted';
  }
};

const getQuarterHeaderColor = (quarter: number) => {
  switch (quarter) {
    case 1: return 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100';
    case 2: return 'bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100';
    case 3: return 'bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100';
    case 4: return 'bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100';
    default: return 'bg-muted';
  }
};

const getQuarter = (monthIndex: number): number => {
  if (monthIndex < 3) return 1;
  if (monthIndex < 6) return 2;
  if (monthIndex < 9) return 3;
  return 4;
};

const getPercentageColor = (percentage: number) => {
  if (percentage >= 100) return 'text-success-alt';
  if (percentage >= 80) return 'text-amber-500';
  return 'text-destructive';
};

const getPercentageBgColor = (percentage: number) => {
  if (percentage >= 100) return 'bg-success-alt/10 border-success-alt/20';
  if (percentage >= 80) return 'bg-amber-500/10 border-amber-500/20';
  return 'bg-destructive/10 border-destructive/20';
};

export const MetasProdutosComparison = ({
  filterAno,
  filterProdutor,
  metas,
  tiposMeta,
  produtorNome,
}: MetasProdutosComparisonProps) => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  const targetYear = filterAno !== 'all' ? parseInt(filterAno) : new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  // Fetch produtos for the year
  useEffect(() => {
    const fetchProdutos = async () => {
      setLoading(true);
      try {
        const yearStart = `${targetYear}-01-01`;
        const yearEnd = `${targetYear}-12-31`;

        const { data, error } = await supabase
          .from('produtos')
          .select('id, tipo, data_registro, data_realizada, consultor')
          .gte('data_registro', yearStart)
          .lte('data_registro', yearEnd);

        if (error) throw error;
        setProdutos(data || []);
      } catch (error) {
        logger.error('Erro ao carregar produtos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProdutos();
  }, [targetYear]);

  // Filter metas by year
  const filteredMetas = useMemo(() => {
    return metas.filter(meta => meta.mes.startsWith(targetYear.toString()));
  }, [metas, targetYear]);

  // Calculate monthly data per tipo
  const monthlyData = useMemo(() => {
    return tiposMeta.map(tipo => {
      const tipoDescricao = tipo.descricao;
      const produtoTipos = TIPO_META_TO_PRODUTO[tipoDescricao] || [tipoDescricao];
      
      const months = MONTHS.map((month, index) => {
        const mesKey = `${targetYear}-${month.value}`;
        
        // Find meta for this month and tipo
        const meta = filteredMetas.find(m => 
          m.mes === mesKey && m.tipo_meta_id === tipo.id
        );
        const metaValue = meta?.quantidade || 0;
        
        // Count realized produtos for this month and tipo
        const monthStart = new Date(targetYear, index, 1);
        const monthEnd = endOfMonth(monthStart);
        
        const realizado = produtos.filter(p => {
          const dataRegistro = new Date(p.data_registro);
          return produtoTipos.includes(p.tipo) &&
            dataRegistro >= monthStart &&
            dataRegistro <= monthEnd &&
            (filterProdutor === 'all' || p.consultor === produtorNome);
        }).length;
        
        const percentual = metaValue > 0 ? (realizado / metaValue) * 100 : 0;
        
        return {
          mes: month.label,
          mesIndex: index,
          meta: metaValue,
          realizado,
          percentual,
          quarter: getQuarter(index),
        };
      });
      
      const totalMeta = months.reduce((sum, m) => sum + m.meta, 0);
      const totalRealizado = months.reduce((sum, m) => sum + m.realizado, 0);
      
      return {
        tipoId: tipo.id,
        tipoDescricao,
        months,
        totalMeta,
        totalRealizado,
        totalPercentual: totalMeta > 0 ? (totalRealizado / totalMeta) * 100 : 0,
      };
    }).filter(t => t.totalMeta > 0 || t.totalRealizado > 0);
  }, [tiposMeta, filteredMetas, produtos, targetYear, filterProdutor, produtorNome]);

  // Calculate current month summary
  const currentMonthSummary = useMemo(() => {
    let totalMeta = 0;
    let totalRealizado = 0;
    
    monthlyData.forEach(tipo => {
      const monthData = tipo.months[currentMonth];
      if (monthData) {
        totalMeta += monthData.meta;
        totalRealizado += monthData.realizado;
      }
    });
    
    return {
      meta: totalMeta,
      realizado: totalRealizado,
      percentual: totalMeta > 0 ? (totalRealizado / totalMeta) * 100 : 0,
      mesLabel: MONTHS[currentMonth].label,
    };
  }, [monthlyData, currentMonth]);

  // Calculate year-to-date summary
  const yearToDateSummary = useMemo(() => {
    let totalMeta = 0;
    let totalRealizado = 0;
    
    monthlyData.forEach(tipo => {
      for (let i = 0; i <= currentMonth; i++) {
        const monthData = tipo.months[i];
        if (monthData) {
          totalMeta += monthData.meta;
          totalRealizado += monthData.realizado;
        }
      }
    });
    
    return {
      meta: totalMeta,
      realizado: totalRealizado,
      percentual: totalMeta > 0 ? (totalRealizado / totalMeta) * 100 : 0,
    };
  }, [monthlyData, currentMonth]);

  if (loading) {
    return (
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-center h-[180px]">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-center h-[180px]">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
        {/* Monthly Summary Card */}
        <Card className={`border ${getPercentageBgColor(currentMonthSummary.percentual)}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Meta Mensal x Realizado
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {currentMonthSummary.mesLabel}/{targetYear}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Meta do Mês</p>
                <p className="text-xl font-bold">{currentMonthSummary.meta}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Realizado</p>
                <p className="text-xl font-bold">{currentMonthSummary.realizado}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm font-medium">Atingimento</span>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${getPercentageColor(currentMonthSummary.percentual)}`}>
                  {currentMonthSummary.percentual.toFixed(1)}%
                </span>
                {currentMonthSummary.percentual >= 100 ? (
                  <Award className="h-5 w-5 text-success-alt" />
                ) : (
                  <Target className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  currentMonthSummary.percentual >= 100 ? 'bg-success-alt' :
                  currentMonthSummary.percentual >= 80 ? 'bg-amber-500' : 'bg-destructive'
                }`}
                style={{ width: `${Math.min(currentMonthSummary.percentual, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Year-to-Date Summary Card */}
        <Card className={`border ${getPercentageBgColor(yearToDateSummary.percentual)}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Meta Acumulada x Realizado
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {targetYear} (até {currentMonthSummary.mesLabel})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Meta Acumulada</p>
                <p className="text-xl font-bold">{yearToDateSummary.meta}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total Realizado</p>
                <p className="text-xl font-bold">{yearToDateSummary.realizado}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm font-medium">Atingimento Acumulado</span>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${getPercentageColor(yearToDateSummary.percentual)}`}>
                  {yearToDateSummary.percentual.toFixed(1)}%
                </span>
                {yearToDateSummary.percentual >= 100 ? (
                  <Award className="h-5 w-5 text-success-alt" />
                ) : (
                  <Target className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  yearToDateSummary.percentual >= 100 ? 'bg-success-alt' :
                  yearToDateSummary.percentual >= 80 ? 'bg-amber-500' : 'bg-destructive'
                }`}
                style={{ width: `${Math.min(yearToDateSummary.percentual, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table by Tipo */}
      {monthlyData.map(tipoData => (
        <Card key={tipoData.tipoId}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {tipoData.tipoDescricao}
              <span className={`ml-auto text-sm font-bold ${getPercentageColor(tipoData.totalPercentual)}`}>
                {tipoData.totalPercentual.toFixed(1)}% no ano
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Métrica</TableHead>
                    {tipoData.months.map((m, i) => (
                      <TableHead 
                        key={i} 
                        className={`text-center min-w-[60px] text-xs ${getQuarterHeaderColor(m.quarter)}`}
                      >
                        {m.mes}
                      </TableHead>
                    ))}
                    <TableHead className="text-center font-semibold bg-muted min-w-[70px]">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Meta</TableCell>
                    {tipoData.months.map((m, i) => (
                      <TableCell key={i} className={`text-center text-sm ${getQuarterColor(m.quarter)}`}>
                        {m.meta || '-'}
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-semibold bg-muted">
                      {tipoData.totalMeta}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Realizado</TableCell>
                    {tipoData.months.map((m, i) => (
                      <TableCell key={i} className={`text-center text-sm ${getQuarterColor(m.quarter)}`}>
                        {m.realizado || '-'}
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-semibold bg-muted">
                      {tipoData.totalRealizado}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">%</TableCell>
                    {tipoData.months.map((m, i) => (
                      <TableCell 
                        key={i} 
                        className={`text-center text-sm font-bold ${m.meta > 0 ? getPercentageColor(m.percentual) : 'text-muted-foreground'}`}
                      >
                        {m.meta > 0 ? `${m.percentual.toFixed(0)}%` : '-'}
                      </TableCell>
                    ))}
                    <TableCell className={`text-center font-bold ${getPercentageColor(tipoData.totalPercentual)}`}>
                      {tipoData.totalPercentual.toFixed(0)}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}

      {monthlyData.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            Nenhuma meta cadastrada para {targetYear}.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MetasProdutosComparison;
