import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, Calendar, Award, LayoutGrid, Table2, Lightbulb, User, Users } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DateRange } from "react-day-picker";
import { logger } from "@/lib/logger";
import { getDaysInMonth, getDate } from "date-fns";
import { Button } from "@/components/ui/button";
import { getRegraRamo } from '@/lib/ramoClassification';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  { key: 'meta_jan', label: 'Jan', index: 0, quarter: 1 },
  { key: 'meta_fev', label: 'Fev', index: 1, quarter: 1 },
  { key: 'meta_mar', label: 'Mar', index: 2, quarter: 1 },
  { key: 'meta_abr', label: 'Abr', index: 3, quarter: 2 },
  { key: 'meta_mai', label: 'Mai', index: 4, quarter: 2 },
  { key: 'meta_jun', label: 'Jun', index: 5, quarter: 2 },
  { key: 'meta_jul', label: 'Jul', index: 6, quarter: 3 },
  { key: 'meta_ago', label: 'Ago', index: 7, quarter: 3 },
  { key: 'meta_set', label: 'Set', index: 8, quarter: 3 },
  { key: 'meta_out', label: 'Out', index: 9, quarter: 4 },
  { key: 'meta_nov', label: 'Nov', index: 10, quarter: 4 },
  { key: 'meta_dez', label: 'Dez', index: 11, quarter: 4 },
] as const;

// Quarter colors for escadinha visualization
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

// Verifica se o ramo é recorrente usando a classificação centralizada
const isRecurrentRamo = (ramo: Ramo | undefined): boolean => {
  if (!ramo) return false;
  return getRegraRamo(ramo.descricao) === 'Recorrente';
};

// Calculate FIRST INVOICE prize for a cotacao (for monthly "Realizado" - primeiras faturas only)
const calculateFirstInvoicePrize = (
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
    // RECURRENT: only the first invoice (proportional in inicio_vigencia month)
    if (!cotacao.inicio_vigencia) return monthlyPrizes;
    
    const inicioDate = new Date(cotacao.inicio_vigencia + 'T00:00:00');
    const inicioYear = inicioDate.getFullYear();
    const inicioMonth = inicioDate.getMonth();
    
    // Only process if inicio_vigencia is in the target year
    if (inicioYear !== targetYear) return monthlyPrizes;
    
    // First invoice: proportional only (primeira fatura)
    const daysInMonth = getDaysInMonth(inicioDate);
    const dayOfMonth = getDate(inicioDate);
    const daysRemaining = daysInMonth - dayOfMonth + 1;
    const dailyPremium = premio / daysInMonth;
    const proportionalPremium = dailyPremium * daysRemaining;
    
    // Only first month: proportional (NO subsequent months)
    monthlyPrizes[inicioMonth] = proportionalPremium;
  }
  
  return monthlyPrizes;
};

// Calculate FULL monthly prize distribution for a cotacao (for accumulated calculation)
const calculateMonthlyPrizesAccumulated = (
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
    // RECURRENT: use inicio_vigencia for proportional calculation + full for remaining months
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
  const [showEscadinha, setShowEscadinha] = useState(false);

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

    // Calculate FIRST INVOICE only for "Realizado" mensal (primeiras faturas)
    const totalMonthlyFirstInvoice = new Array(12).fill(0);
    
    // Calculate FULL distribution for accumulated calculation
    const totalMonthlyAccumulated = new Array(12).fill(0);
    
    filteredCotacoes.forEach(cotacao => {
      const ramo = cotacao.ramo_id ? ramos[cotacao.ramo_id] : undefined;
      
      // First invoice for monthly "Realizado"
      const firstInvoice = calculateFirstInvoicePrize(cotacao, ramo, targetYear);
      firstInvoice.forEach((value, index) => {
        totalMonthlyFirstInvoice[index] += value;
      });
      
      // Full distribution for accumulated
      const fullMonthly = calculateMonthlyPrizesAccumulated(cotacao, ramo, targetYear);
      fullMonthly.forEach((value, index) => {
        totalMonthlyAccumulated[index] += value;
      });
    });

    // Calculate accumulated from full monthly distribution
    const accumulated: number[] = [];
    totalMonthlyAccumulated.forEach((value, index) => {
      if (index === 0) {
        accumulated.push(value);
      } else {
        accumulated.push(accumulated[index - 1] + value);
      }
    });

    return { monthly: totalMonthlyFirstInvoice, accumulated };
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

  // Get selected meta for escadinha (only when a single produtor is selected)
  const selectedMeta = useMemo(() => {
    if (!selectedProdutorId) return null;
    return metasPremio.find(m => m.produtor_id === selectedProdutorId) || null;
  }, [metasPremio, selectedProdutorId]);

  // Calculate escadinha rows for visualization
  const escadinhaData = useMemo(() => {
    if (!selectedMeta) return null;

    const monthlyValues = MONTHS.map(m => selectedMeta[m.key as keyof MetaPremio] as number);
    
    // Calculate accumulated values (escadinha)
    const simpleAccum: number[] = [];
    monthlyValues.forEach((value, index) => {
      if (index === 0) {
        simpleAccum.push(value);
      } else {
        simpleAccum.push(simpleAccum[index - 1] + value);
      }
    });

    const escadinhaAccum: number[] = [];
    simpleAccum.forEach((value, index) => {
      if (index === 0) {
        escadinhaAccum.push(value);
      } else {
        escadinhaAccum.push(escadinhaAccum[index - 1] + value);
      }
    });

    // Generate escadinha rows
    const rows = MONTHS.map((month, rowIndex) => {
      const cells: (number | null)[] = [];
      for (let colIndex = 0; colIndex < 12; colIndex++) {
        if (colIndex >= rowIndex) {
          cells.push(monthlyValues[rowIndex]);
        } else {
          cells.push(null);
        }
      }
      return { month: month.label, cells, quarter: month.quarter };
    });

    return {
      monthlyValues,
      accumulatedValues: escadinhaAccum,
      rows,
      totalAnual: escadinhaAccum[11] || 0,
    };
  }, [selectedMeta]);

  // Calculate insights for consultor and gestor
  const insights = useMemo(() => {
    if (!escadinhaData || !selectedMeta) return null;

    const { monthlyValues, accumulatedValues, totalAnual } = escadinhaData;
    const produtorNome = selectedMeta.produtor?.nome || 'Produtor';

    // Find biggest growth jump
    let maxGrowth = 0;
    let maxGrowthFrom = 0;
    let maxGrowthTo = 1;
    
    for (let i = 1; i < 12; i++) {
      const growth = accumulatedValues[i] - accumulatedValues[i - 1];
      if (growth > maxGrowth) {
        maxGrowth = growth;
        maxGrowthFrom = i - 1;
        maxGrowthTo = i;
      }
    }

    // Find best months
    const sortedMonths = [...monthlyValues]
      .map((value, index) => ({ value, label: MONTHS[index].label }))
      .sort((a, b) => b.value - a.value);
    
    const bestMonths = sortedMonths.slice(0, 3).filter(m => m.value > 0);

    // Compare with realized
    const realizedTotal = monthlyPrizes.accumulated[targetMonth];
    const metaAcumulada = accumulatedValues[targetMonth];
    const gapValue = metaAcumulada - realizedTotal;
    const remainingMonths = 11 - targetMonth;
    const avgNeeded = remainingMonths > 0 ? gapValue / remainingMonths : 0;

    // Find months below average
    const avgMeta = totalAnual / 12;
    const monthsBelowAvg = monthlyValues
      .map((value, index) => ({ value, label: MONTHS[index].label }))
      .filter(m => m.value < avgMeta * 0.8);

    // Consultor insights
    const consultorInsights: string[] = [];
    
    if (gapValue > 0 && remainingMonths > 0) {
      consultorInsights.push(
        `Para atingir a meta acumulada até ${MONTHS[targetMonth].label}, você precisa fechar mais ${formatCurrency(gapValue)} em prêmios.`
      );
      consultorInsights.push(
        `Média necessária por mês restante (${remainingMonths} meses): ${formatCurrency(avgNeeded)}.`
      );
    } else if (gapValue <= 0) {
      consultorInsights.push(
        `Parabéns! Você já superou a meta acumulada até ${MONTHS[targetMonth].label} em ${formatCurrency(Math.abs(gapValue))}.`
      );
    }
    
    if (bestMonths.length > 0) {
      consultorInsights.push(
        `Seus meses de maior meta: ${bestMonths.map(m => m.label).join(', ')} - foque nesses períodos para maximizar resultados.`
      );
    }

    // Gestor insights
    const gestorInsights: string[] = [];
    
    gestorInsights.push(
      `Meta anual total de ${produtorNome}: ${formatCurrency(totalAnual)}.`
    );
    
    gestorInsights.push(
      `O maior salto de crescimento de meta ocorre entre ${MONTHS[maxGrowthFrom].label} e ${MONTHS[maxGrowthTo].label} (+${formatCurrency(maxGrowth)}).`
    );
    
    const percentageRealized = metaAcumulada > 0 ? (realizedTotal / metaAcumulada) * 100 : 0;
    gestorInsights.push(
      `Até ${MONTHS[targetMonth].label}: ${percentageRealized.toFixed(1)}% da meta acumulada realizada (${formatCurrency(realizedTotal)} de ${formatCurrency(metaAcumulada)}).`
    );
    
    if (monthsBelowAvg.length > 0) {
      gestorInsights.push(
        `Meses com metas abaixo da média: ${monthsBelowAvg.map(m => m.label).join(', ')} - oportunidade para redistribuição.`
      );
    }

    return {
      consultorInsights,
      gestorInsights,
    };
  }, [escadinhaData, selectedMeta, monthlyPrizes, targetMonth]);

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

      {/* Month-by-Month Comparison Table with Escadinha Toggle */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {showEscadinha ? 'Visualização Escadinha' : 'Análise Mensal de Prêmio'} - {targetYear}
            </CardTitle>
            {selectedProdutorId && escadinhaData && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEscadinha(!showEscadinha)}
                className="gap-2"
              >
                {showEscadinha ? (
                  <>
                    <Table2 className="h-4 w-4" />
                    Ver Tabela
                  </>
                ) : (
                  <>
                    <LayoutGrid className="h-4 w-4" />
                    Ver Escadinha
                  </>
                )}
              </Button>
            )}
          </div>
          {showEscadinha && selectedMeta && (
            <p className="text-sm text-muted-foreground mt-1">
              {selectedMeta.produtor?.nome} - Cada linha mostra a meta mensal replicada até dezembro
            </p>
          )}
        </CardHeader>
        <CardContent>
          {showEscadinha && escadinhaData ? (
            <div className="space-y-6">
              {/* Escadinha Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10 font-semibold">Mês</TableHead>
                      {MONTHS.map(m => (
                        <TableHead key={m.key} className={`text-center min-w-[75px] text-xs ${getQuarterHeaderColor(m.quarter)}`}>
                          {m.label}
                        </TableHead>
                      ))}
                      <TableHead className="text-center font-semibold bg-muted min-w-[90px]">Total Linha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {escadinhaData.rows.map((row, rowIndex) => {
                      const filledCells = row.cells.filter(c => c !== null).length;
                      const rowTotal = (escadinhaData.monthlyValues[rowIndex] || 0) * filledCells;
                      
                      return (
                        <TableRow key={row.month}>
                          <TableCell className={`font-medium sticky left-0 z-10 ${getQuarterColor(row.quarter)}`}>
                            {row.month}
                          </TableCell>
                          {row.cells.map((cell, colIndex) => {
                            const colQuarter = MONTHS[colIndex].quarter;
                            return (
                              <TableCell 
                                key={colIndex} 
                                className={`text-center text-xs ${
                                  cell !== null 
                                    ? `${getQuarterColor(colQuarter)} font-medium` 
                                    : 'bg-muted/30'
                                }`}
                              >
                                {cell !== null ? formatCurrency(cell) : '-'}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center font-semibold bg-muted text-xs">
                            {formatCurrency(rowTotal)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Accumulated row */}
                    <TableRow className="border-t-2 border-primary">
                      <TableCell className="font-bold sticky left-0 bg-background z-10">
                        Acumulado
                      </TableCell>
                      {escadinhaData.accumulatedValues.map((value, index) => (
                        <TableCell key={index} className="text-center font-bold bg-primary/20 text-xs">
                          {formatCurrency(value)}
                        </TableCell>
                      ))}
                      <TableCell className="text-center font-bold bg-primary/30 text-xs">
                        {formatCurrency(escadinhaData.totalAnual)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Insights Section */}
              {insights && (
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Consultor Insights */}
                  <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <h4 className="font-semibold text-blue-800 dark:text-blue-200">Para o Consultor</h4>
                    </div>
                    <div className="space-y-2">
                      {insights.consultorInsights.map((insight, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <Lightbulb className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                          <span className="text-blue-700 dark:text-blue-300">{insight}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Gestor Insights */}
                  <div className="p-4 rounded-lg border bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      <h4 className="font-semibold text-purple-800 dark:text-purple-200">Para o Gestor</h4>
                    </div>
                    <div className="space-y-2">
                      {insights.gestorInsights.map((insight, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <Lightbulb className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                          <span className="text-purple-700 dark:text-purple-300">{insight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};
