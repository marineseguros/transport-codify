import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, Calendar, Award } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DateRange } from "react-day-picker";
import { logger } from "@/lib/logger";
import { getDaysInMonth, getDate } from "date-fns";

interface MetaPremio {
  id: string;
  produtor_id: string;
  ano: number;
  meta_jan: number;
  meta_fev: number;
  meta_mar: number;
  meta_abr: number;
  meta_mai: number;
  meta_jun: number;
  meta_jul: number;
  meta_ago: number;
  meta_set: number;
  meta_out: number;
  meta_nov: number;
  meta_dez: number;
  produtor?: { id: string; nome: string; email: string };
}

interface Ramo {
  id: string;
  descricao: string;
  ramo_agrupado: string | null;
}

interface Cotacao {
  id: string;
  valor_premio: number | null;
  status: string;
  data_fechamento: string | null;
  inicio_vigencia: string | null;
  ramo_id: string | null;
  produtor_cotador?: { nome: string; email: string } | null;
}

interface MetasPremioComparisonProps {
  dateFilter: string;
  dateRange: DateRange | undefined;
  produtorFilter: string;
  produtores: { id: string; nome: string; email: string }[];
}

const MONTHS = [
  { key: 'meta_jan', label: 'Jan', index: 0 },
  { key: 'meta_fev', label: 'Fev', index: 1 },
  { key: 'meta_mar', label: 'Mar', index: 2 },
  { key: 'meta_abr', label: 'Abr', index: 3 },
  { key: 'meta_mai', label: 'Mai', index: 4 },
  { key: 'meta_jun', label: 'Jun', index: 5 },
  { key: 'meta_jul', label: 'Jul', index: 6 },
  { key: 'meta_ago', label: 'Ago', index: 7 },
  { key: 'meta_set', label: 'Set', index: 8 },
  { key: 'meta_out', label: 'Out', index: 9 },
  { key: 'meta_nov', label: 'Nov', index: 10 },
  { key: 'meta_dez', label: 'Dez', index: 11 },
] as const;

// Ramos recorrentes based on ramo_agrupado
const RECURRENT_RAMOS = [
  'Nacional', 'Exportação', 'Importação', 'RCTR-C', 'RC-DC', 'RCTR-VI', 'RCTA-C', 'RC-V'
];

const isRecurrentRamo = (ramo: Ramo | undefined): boolean => {
  if (!ramo) return false;
  return RECURRENT_RAMOS.includes(ramo.ramo_agrupado || ramo.descricao);
};

// Calculate monthly prize distribution for a cotacao
const calculateMonthlyPrizes = (
  cotacao: Cotacao,
  ramo: Ramo | undefined,
  targetYear: number
): number[] => {
  const monthlyPrizes = new Array(12).fill(0);
  const premio = cotacao.valor_premio || 0;
  
  if (premio === 0) return monthlyPrizes;
  
  if (!isRecurrentRamo(ramo)) {
    // NON-RECURRENT: use full prize only in the month of data_fechamento
    if (!cotacao.data_fechamento) return monthlyPrizes;
    
    const fechamentoDate = new Date(cotacao.data_fechamento);
    const fechamentoYear = fechamentoDate.getFullYear();
    const fechamentoMonth = fechamentoDate.getMonth();
    
    // Only process if data_fechamento is in the target year
    if (fechamentoYear !== targetYear) return monthlyPrizes;
    
    monthlyPrizes[fechamentoMonth] = premio;
  } else {
    // RECURRENT: use inicio_vigencia for proportional calculation
    if (!cotacao.inicio_vigencia) return monthlyPrizes;
    
    const inicioDate = new Date(cotacao.inicio_vigencia + 'T00:00:00');
    const inicioYear = inicioDate.getFullYear();
    const inicioMonth = inicioDate.getMonth();
    
    // Only process if inicio_vigencia is in the target year
    if (inicioYear !== targetYear) return monthlyPrizes;
    
    // Proportional in first month, full for remaining months until December
    const daysInMonth = getDaysInMonth(inicioDate);
    const dayOfMonth = getDate(inicioDate);
    const daysRemaining = daysInMonth - dayOfMonth + 1;
    const dailyPremium = premio / daysInMonth;
    const proportionalPremium = dailyPremium * daysRemaining;
    
    // First month: proportional
    monthlyPrizes[inicioMonth] = proportionalPremium;
    
    // Remaining months until December: full premium
    for (let month = inicioMonth + 1; month < 12; month++) {
      monthlyPrizes[month] = premio;
    }
  }
  
  return monthlyPrizes;
};

// Calculate accumulated meta (escadinha)
const calculateAccumulatedMetas = (meta: MetaPremio): number[] => {
  const monthlyValues = MONTHS.map(m => meta[m.key as keyof MetaPremio] as number);
  
  // Step 1: Simple accumulation
  const simpleAccum: number[] = [];
  monthlyValues.forEach((value, index) => {
    if (index === 0) {
      simpleAccum.push(value);
    } else {
      simpleAccum.push(simpleAccum[index - 1] + value);
    }
  });
  
  // Step 2: Escadinha accumulation
  const escadinhaAccum: number[] = [];
  simpleAccum.forEach((value, index) => {
    if (index === 0) {
      escadinhaAccum.push(value);
    } else {
      escadinhaAccum.push(escadinhaAccum[index - 1] + value);
    }
  });
  
  return escadinhaAccum;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
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

export const MetasPremioComparison = ({
  dateFilter,
  dateRange,
  produtorFilter,
  produtores,
}: MetasPremioComparisonProps) => {
  const [metasPremio, setMetasPremio] = useState<MetaPremio[]>([]);
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [ramos, setRamos] = useState<Record<string, Ramo>>({});
  const [loading, setLoading] = useState(true);

  // Calculate target month/year based on date filter
  const { targetMonth, targetYear, startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = now;
    
    switch (dateFilter) {
      case "hoje":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "7dias":
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30dias":
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90dias":
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "mes_atual":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "mes_anterior":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "ano_atual":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case "personalizado":
      case "personalizado_comparacao":
        if (dateRange?.from) {
          start = dateRange.from;
          end = dateRange.to || dateRange.from;
        } else {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    // Use end date to determine target month for monthly comparison
    return {
      targetMonth: end.getMonth(),
      targetYear: end.getFullYear(),
      startDate: start,
      endDate: end,
    };
  }, [dateFilter, dateRange]);

  // Get selected produtor ID
  const selectedProdutorId = useMemo(() => {
    if (produtorFilter === "todos") return null;
    const produtor = produtores.find(p => p.nome === produtorFilter);
    return produtor?.id || null;
  }, [produtorFilter, produtores]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch ramos first
        const { data: ramosData, error: ramosError } = await supabase
          .from('ramos')
          .select('id, descricao, ramo_agrupado');
        
        if (ramosError) throw ramosError;
        
        const ramosMap: Record<string, Ramo> = {};
        (ramosData || []).forEach(r => {
          ramosMap[r.id] = r;
        });
        setRamos(ramosMap);

        // Fetch metas premio
        let metasQuery = supabase
          .from('metas_premio')
          .select(`*, produtor:produtores(id, nome, email)`)
          .eq('ano', targetYear);

        if (selectedProdutorId) {
          metasQuery = metasQuery.eq('produtor_id', selectedProdutorId);
        }

        const { data: metasData, error: metasError } = await metasQuery;
        if (metasError) throw metasError;

        // Fetch closed cotacoes for the target year (need full year for recurrent calculation)
        const yearStart = `${targetYear}-01-01`;
        const yearEnd = `${targetYear}-12-31T23:59:59`;

        const { data: cotacoesData, error: cotacoesError } = await supabase
          .from('cotacoes')
          .select(`id, valor_premio, status, data_fechamento, inicio_vigencia, ramo_id, produtor_cotador:produtores!cotacoes_produtor_cotador_id_fkey(nome, email)`)
          .in('status', ['Negócio fechado', 'Fechamento congênere'])
          .gte('data_fechamento', yearStart)
          .lte('data_fechamento', yearEnd);

        if (cotacoesError) throw cotacoesError;

        setMetasPremio((metasData as MetaPremio[]) || []);
        setCotacoes((cotacoesData as Cotacao[]) || []);
      } catch (error) {
        logger.error('Erro ao carregar dados de comparação de metas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [targetYear, selectedProdutorId]);

  // Calculate monthly prizes using recurrent logic
  const monthlyPrizes = useMemo(() => {
    // Filter cotacoes by produtor if needed
    let filteredCotacoes = cotacoes;
    if (selectedProdutorId) {
      const selectedProdutor = produtores.find(p => p.id === selectedProdutorId);
      if (selectedProdutor) {
        filteredCotacoes = cotacoes.filter(c => c.produtor_cotador?.email === selectedProdutor.email);
      }
    }

    // Calculate monthly distribution for all cotacoes
    const totalMonthly = new Array(12).fill(0);
    
    filteredCotacoes.forEach(cotacao => {
      const ramo = cotacao.ramo_id ? ramos[cotacao.ramo_id] : undefined;
      const monthly = calculateMonthlyPrizes(cotacao, ramo, targetYear);
      monthly.forEach((value, index) => {
        totalMonthly[index] += value;
      });
    });

    // Calculate accumulated
    const accumulated: number[] = [];
    totalMonthly.forEach((value, index) => {
      if (index === 0) {
        accumulated.push(value);
      } else {
        accumulated.push(accumulated[index - 1] + value);
      }
    });

    return { monthly: totalMonthly, accumulated };
  }, [cotacoes, ramos, targetYear, selectedProdutorId, produtores]);

  // Calculate monthly comparison
  const monthlyComparison = useMemo(() => {
    const valorRealizado = monthlyPrizes.monthly[targetMonth];

    // Get monthly meta
    const monthKey = MONTHS[targetMonth].key as keyof MetaPremio;
    let metaMensal = 0;

    if (selectedProdutorId) {
      const produtorMeta = metasPremio.find(m => m.produtor_id === selectedProdutorId);
      if (produtorMeta) {
        metaMensal = produtorMeta[monthKey] as number;
      }
    } else {
      metaMensal = metasPremio.reduce((sum, m) => sum + (m[monthKey] as number || 0), 0);
    }

    const percentual = metaMensal > 0 ? (valorRealizado / metaMensal) * 100 : 0;

    return {
      valorRealizado,
      metaMensal,
      percentual,
      mesLabel: MONTHS[targetMonth].label,
    };
  }, [monthlyPrizes, metasPremio, targetMonth, selectedProdutorId]);

  // Calculate accumulated comparison (escadinha)
  const accumulatedComparison = useMemo(() => {
    const valorRealizadoAno = monthlyPrizes.accumulated[targetMonth];

    // Get accumulated meta (escadinha) for the target month
    let metaAcumulada = 0;

    if (selectedProdutorId) {
      const produtorMeta = metasPremio.find(m => m.produtor_id === selectedProdutorId);
      if (produtorMeta) {
        const accumulated = calculateAccumulatedMetas(produtorMeta);
        metaAcumulada = accumulated[targetMonth];
      }
    } else {
      // Sum all produtors' accumulated metas
      metasPremio.forEach(m => {
        const accumulated = calculateAccumulatedMetas(m);
        metaAcumulada += accumulated[targetMonth];
      });
    }

    const percentual = metaAcumulada > 0 ? (valorRealizadoAno / metaAcumulada) * 100 : 0;

    return {
      valorRealizadoAno,
      metaAcumulada,
      percentual,
    };
  }, [monthlyPrizes, metasPremio, targetMonth, selectedProdutorId]);

  // Calculate full year month-by-month comparison for table
  const monthlyTableData = useMemo(() => {
    return MONTHS.map((month, index) => {
      const monthKey = month.key as keyof MetaPremio;
      
      // Get meta for this month
      let metaMensal = 0;
      let metaAcumulada = 0;
      
      if (selectedProdutorId) {
        const produtorMeta = metasPremio.find(m => m.produtor_id === selectedProdutorId);
        if (produtorMeta) {
          metaMensal = produtorMeta[monthKey] as number;
          const accumulated = calculateAccumulatedMetas(produtorMeta);
          metaAcumulada = accumulated[index];
        }
      } else {
        metasPremio.forEach(m => {
          metaMensal += (m[monthKey] as number || 0);
          const accumulated = calculateAccumulatedMetas(m);
          metaAcumulada += accumulated[index];
        });
      }

      const realizadoMensal = monthlyPrizes.monthly[index];
      const realizadoAcumulado = monthlyPrizes.accumulated[index];
      
      const percentualMensal = metaMensal > 0 ? (realizadoMensal / metaMensal) * 100 : 0;
      const percentualAcumulado = metaAcumulada > 0 ? (realizadoAcumulado / metaAcumulada) * 100 : 0;

      return {
        mes: month.label,
        index,
        metaMensal,
        realizadoMensal,
        percentualMensal,
        metaAcumulada,
        realizadoAcumulado,
        percentualAcumulado,
        isCurrent: index === targetMonth,
      };
    });
  }, [metasPremio, monthlyPrizes, selectedProdutorId, targetMonth]);

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
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
        {/* Monthly Comparison Card */}
        <Card className={`border ${getPercentageBgColor(monthlyComparison.percentual)}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Meta Mensal x Realizado
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {monthlyComparison.mesLabel}/{targetYear}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Meta do Mês</p>
                <p className="text-xl font-bold">{formatCurrency(monthlyComparison.metaMensal)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Realizado</p>
                <p className="text-xl font-bold">{formatCurrency(monthlyComparison.valorRealizado)}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm font-medium">Atingimento</span>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${getPercentageColor(monthlyComparison.percentual)}`}>
                  {monthlyComparison.percentual.toFixed(1)}%
                </span>
                {monthlyComparison.percentual >= 100 ? (
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
                  monthlyComparison.percentual >= 100 ? 'bg-success-alt' :
                  monthlyComparison.percentual >= 80 ? 'bg-amber-500' : 'bg-destructive'
                }`}
                style={{ width: `${Math.min(monthlyComparison.percentual, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Accumulated Comparison Card */}
        <Card className={`border ${getPercentageBgColor(accumulatedComparison.percentual)}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Meta Acumulada x Realizado
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {targetYear} (até {monthlyComparison.mesLabel})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Meta Acumulada (Escadinha)</p>
                <p className="text-xl font-bold">{formatCurrency(accumulatedComparison.metaAcumulada)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total Realizado no Ano</p>
                <p className="text-xl font-bold">{formatCurrency(accumulatedComparison.valorRealizadoAno)}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm font-medium">Atingimento Acumulado</span>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${getPercentageColor(accumulatedComparison.percentual)}`}>
                  {accumulatedComparison.percentual.toFixed(1)}%
                </span>
                {accumulatedComparison.percentual >= 100 ? (
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
                  accumulatedComparison.percentual >= 100 ? 'bg-success-alt' :
                  accumulatedComparison.percentual >= 80 ? 'bg-amber-500' : 'bg-destructive'
                }`}
                style={{ width: `${Math.min(accumulatedComparison.percentual, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Month-by-Month Comparison Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Análise Mensal de Prêmio - {targetYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-3 text-left font-medium text-muted-foreground">Mês</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">Meta Mensal</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">Realizado</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">%</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">Meta Acum.</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">Real. Acum.</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">% Acum.</th>
                </tr>
              </thead>
              <tbody>
                {monthlyTableData.map((row) => (
                  <tr 
                    key={row.mes}
                    className={`border-b last:border-0 ${row.isCurrent ? 'bg-primary/5 font-medium' : ''}`}
                  >
                    <td className="py-2 px-3">
                      {row.mes}
                      {row.isCurrent && (
                        <span className="ml-2 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">atual</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">{formatCurrency(row.metaMensal)}</td>
                    <td className="py-2 px-3 text-right">{formatCurrency(row.realizadoMensal)}</td>
                    <td className={`py-2 px-3 text-right font-medium ${getPercentageColor(row.percentualMensal)}`}>
                      {row.percentualMensal.toFixed(0)}%
                    </td>
                    <td className="py-2 px-3 text-right text-muted-foreground">{formatCurrency(row.metaAcumulada)}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground">{formatCurrency(row.realizadoAcumulado)}</td>
                    <td className={`py-2 px-3 text-right font-medium ${getPercentageColor(row.percentualAcumulado)}`}>
                      {row.percentualAcumulado.toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-bold bg-muted/30">
                  <td className="py-2 px-3">Total Ano</td>
                  <td className="py-2 px-3 text-right">
                    {formatCurrency(monthlyTableData.reduce((sum, r) => sum + r.metaMensal, 0))}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {formatCurrency(monthlyTableData.reduce((sum, r) => sum + r.realizadoMensal, 0))}
                  </td>
                  <td className="py-2 px-3 text-right">-</td>
                  <td className="py-2 px-3 text-right text-muted-foreground">-</td>
                  <td className="py-2 px-3 text-right text-muted-foreground">-</td>
                  <td className="py-2 px-3 text-right">-</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
