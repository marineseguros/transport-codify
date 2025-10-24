import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCotacoesTotais, useProdutores, useUnidades, type Cotacao } from '@/hooks/useSupabaseData';
import { TrendingUp, TrendingDown, DollarSign, FileText, Clock, Target, Plus, Upload, CalendarIcon, Users, Building, List, Grid3X3 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { DateRange } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { CotacaoModal } from '@/components/CotacaoModal';
const Dashboard = () => {
  const {
    cotacoes: allQuotes,
    loading: loadingCotacoes
  } = useCotacoesTotais();
  const {
    produtores,
    loading: loadingProdutores
  } = useProdutores();
  const {
    unidades,
    loading: loadingUnidades
  } = useUnidades();
  const loading = loadingCotacoes || loadingProdutores || loadingUnidades;
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [dateFilter, setDateFilter] = useState<string>('mes_atual');
  const [produtorFilter, setProdutorFilter] = useState<string>('todos');
  const [unidadeFilter, setUnidadeFilter] = useState<string>('todas');
  const [compareRange, setCompareRange] = useState<DateRange | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCotacao, setSelectedCotacao] = useState<Cotacao | null>(null);
  const handleImportCSV = () => {
    toast.success('Funcionalidade de importar CSV será implementada');
  };
  const handleNewCotacao = () => {
    setSelectedCotacao(null);
    setIsModalOpen(true);
  };

  // Filter cotacoes by date, produtor and unidade
  const filteredCotacoes = useMemo(() => {
    let filtered = allQuotes;

    // Apply produtor filter
    if (produtorFilter !== 'todos') {
      filtered = filtered.filter(cotacao => cotacao.produtor_cotador?.nome === produtorFilter);
    }

    // Apply unidade filter
    if (unidadeFilter !== 'todas') {
      filtered = filtered.filter(cotacao => cotacao.unidade?.descricao === unidadeFilter);
    }

    // Apply date filter
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    switch (dateFilter) {
      case 'hoje':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '7dias':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30dias':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90dias':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'mes_atual':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'mes_anterior':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'ano_atual':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case 'personalizado':
        if (!dateRange?.from) return filtered;
        startDate = dateRange.from;
        endDate = dateRange.to || dateRange.from;
        break;
      case 'personalizado_comparacao':
        if (!dateRange?.from) return filtered;
        startDate = dateRange.from;
        endDate = dateRange.to || dateRange.from;
        break;
      default:
        return filtered;
    }
    return filtered.filter(cotacao => {
      const cotacaoDate = new Date(cotacao.data_cotacao);
      return cotacaoDate >= startDate && cotacaoDate <= endDate;
    });
  }, [allQuotes, dateFilter, dateRange, produtorFilter, unidadeFilter]);

  // Calculate stats with comparisons based on selected period
  const monthlyStats = useMemo(() => {
    const now = new Date();

    // Get date ranges based on selected filter
    let currentStartDate: Date;
    let currentEndDate: Date = now;
    let previousStartDate: Date;
    let previousEndDate: Date;
    switch (dateFilter) {
      case 'hoje':
        currentStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        previousStartDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        previousEndDate = new Date(previousStartDate.getFullYear(), previousStartDate.getMonth(), previousStartDate.getDate(), 23, 59, 59);
        break;
      case '7dias':
        currentStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        previousEndDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30dias':
        currentStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        previousEndDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90dias':
        currentStartDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        previousEndDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'mes_atual':
        currentStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
        currentEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'mes_anterior':
        currentStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        currentEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth() - 1, 0);
        break;
      case 'trimestre_atual':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        currentStartDate = new Date(now.getFullYear(), quarterStart, 1);
        currentEndDate = new Date(now.getFullYear(), quarterStart + 3, 0);
        previousStartDate = new Date(now.getFullYear(), quarterStart - 3, 1);
        previousEndDate = new Date(now.getFullYear(), quarterStart, 0);
        break;
      case 'semestre_atual':
        const semesterStart = now.getMonth() < 6 ? 0 : 6;
        currentStartDate = new Date(now.getFullYear(), semesterStart, 1);
        currentEndDate = new Date(now.getFullYear(), semesterStart + 6, 0);
        previousStartDate = new Date(now.getFullYear(), semesterStart - 6, 1);
        previousEndDate = new Date(now.getFullYear(), semesterStart, 0);
        break;
      case 'ano_atual':
        currentStartDate = new Date(now.getFullYear(), 0, 1);
        currentEndDate = new Date(now.getFullYear(), 11, 31);
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
        previousEndDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      case 'personalizado':
      case 'personalizado_comparacao':
        if (!dateRange?.from) {
          currentStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
          currentEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
        } else {
          currentStartDate = dateRange.from;
          currentEndDate = dateRange.to || dateRange.from;
          const daysDiff = Math.floor((currentEndDate.getTime() - currentStartDate.getTime()) / (1000 * 60 * 60 * 24));
          previousEndDate = new Date(currentStartDate.getTime() - 24 * 60 * 60 * 1000);
          previousStartDate = new Date(previousEndDate.getTime() - daysDiff * 24 * 60 * 60 * 1000);
        }
        break;
      default:
        currentStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
        currentEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
    }

    // Apply produtor and unidade filters consistently for both periods
    const baseFilteredQuotes = allQuotes.filter(c => {
      const produtorMatch = produtorFilter === 'todos' || c.produtor_cotador?.nome === produtorFilter;
      const unidadeMatch = unidadeFilter === 'todas' || c.unidade?.descricao === unidadeFilter;
      return produtorMatch && unidadeMatch;
    });
    const currentPeriodCotacoes = baseFilteredQuotes.filter(c => {
      const date = new Date(c.data_cotacao);
      return date >= currentStartDate && date <= currentEndDate;
    });
    const previousPeriodCotacoes = baseFilteredQuotes.filter(c => {
      const date = new Date(c.data_cotacao);
      return date >= previousStartDate && date <= previousEndDate;
    });

    // Current period stats
    const emCotacao = currentPeriodCotacoes.filter(c => c.status === 'Em cotação').length;
    const fechados = currentPeriodCotacoes.filter(c => c.status === 'Negócio fechado').length;
    const declinados = currentPeriodCotacoes.filter(c => c.status === 'Declinado').length;

    // Previous period stats
    const emCotacaoAnterior = previousPeriodCotacoes.filter(c => c.status === 'Em cotação').length;
    const fechadosAnterior = previousPeriodCotacoes.filter(c => c.status === 'Negócio fechado').length;
    const declinadosAnterior = previousPeriodCotacoes.filter(c => c.status === 'Declinado').length;

    // Calculate differences and percentages
    const calculateComparison = (current: number, previous: number) => {
      const diff = current - previous;
      const percentage = previous > 0 ? diff / previous * 100 : 0;
      return {
        diff,
        percentage
      };
    };
    const emCotacaoComp = calculateComparison(emCotacao, emCotacaoAnterior);
    const fechadosComp = calculateComparison(fechados, fechadosAnterior);
    const declinadosComp = calculateComparison(declinados, declinadosAnterior);

    // KPIs calculations using current period
    const cotacoesFechadas = currentPeriodCotacoes.filter(c => c.status === 'Negócio fechado');
    const premioTotal = cotacoesFechadas.reduce((sum, c) => sum + c.valor_premio, 0);
    const ticketMedio = cotacoesFechadas.length > 0 ? premioTotal / cotacoesFechadas.length : 0;

    // Tempo médio de fechamento (dias)
    const temposFechamento = cotacoesFechadas.filter(c => c.data_fechamento && c.data_cotacao).map(c => {
      const inicio = new Date(c.data_cotacao).getTime();
      const fim = new Date(c.data_fechamento!).getTime();
      return Math.round((fim - inicio) / (1000 * 60 * 60 * 24));
    });
    const tempoMedioFechamento = temposFechamento.length > 0 ? temposFechamento.reduce((sum, tempo) => sum + tempo, 0) / temposFechamento.length : 0;

    // Taxa de conversão
    const taxaConversao = currentPeriodCotacoes.length > 0 ? fechados / currentPeriodCotacoes.length * 100 : 0;
    const taxaConversaoAnterior = previousPeriodCotacoes.length > 0 ? fechadosAnterior / previousPeriodCotacoes.length * 100 : 0;
    const taxaConversaoComp = calculateComparison(taxaConversao, taxaConversaoAnterior);
    return {
      emCotacao,
      fechados,
      declinados,
      emCotacaoComp,
      fechadosComp,
      declinadosComp,
      ticketMedio,
      tempoMedioFechamento,
      premioTotal,
      taxaConversao,
      taxaConversaoComp
    };
  }, [allQuotes, dateFilter, dateRange, produtorFilter, unidadeFilter]);

  // Distribuição por status no período atual com segurados distintos
  const distribuicaoStatus = useMemo(() => {
    const validStatuses = ['Em cotação', 'Negócio fechado', 'Declinado', 'Alocada Outra'];
    const statusData = validStatuses.map(status => {
      const statusCotacoes = filteredCotacoes.filter(cotacao => cotacao.status === status);
      const totalCotacoes = statusCotacoes.length;
      const seguradosDistintos = new Set(statusCotacoes.map(cotacao => cotacao.cpf_cnpj)).size;
      return {
        status,
        count: totalCotacoes,
        seguradosDistintos,
        percentage: filteredCotacoes.length > 0 ? totalCotacoes / filteredCotacoes.length * 100 : 0
      };
    });
    return statusData;
  }, [filteredCotacoes]);

  // Top produtores com métricas detalhadas
  const topProdutoresDetalhado = useMemo(() => {
    const produtorStats: Record<string, {
      nome: string;
      total: number;
      fechadas: number;
      declinadas: number;
    }> = {};
    filteredCotacoes.forEach(cotacao => {
      if (cotacao.produtor_cotador) {
        const nome = cotacao.produtor_cotador.nome;
        if (!produtorStats[nome]) {
          produtorStats[nome] = {
            nome,
            total: 0,
            fechadas: 0,
            declinadas: 0
          };
        }
        produtorStats[nome].total++;
        if (cotacao.status === 'Negócio fechado') {
          produtorStats[nome].fechadas++;
        } else if (cotacao.status === 'Declinado') {
          produtorStats[nome].declinadas++;
        }
      }
    });
    return Object.values(produtorStats).sort((a, b) => {
      if (b.fechadas !== a.fechadas) return b.fechadas - a.fechadas;
      return b.total - a.total;
    }).slice(0, 5);
  }, [filteredCotacoes]);

  // Clientes fechados para o tooltip
  const clientesFechados = useMemo(() => {
    return filteredCotacoes.filter(cotacao => cotacao.status === 'Negócio fechado').sort((a, b) => new Date(b.data_fechamento || b.created_at).getTime() - new Date(a.data_fechamento || a.created_at).getTime()).slice(0, 10);
  }, [filteredCotacoes]);

  // Clientes em cotação para o tooltip
  const clientesEmCotacao = useMemo(() => {
    return filteredCotacoes.filter(cotacao => cotacao.status === 'Em cotação').sort((a, b) => new Date(b.data_cotacao).getTime() - new Date(a.data_cotacao).getTime()).slice(0, 10);
  }, [filteredCotacoes]);

  // View mode state for recent quotes
  const [recentQuotesViewMode, setRecentQuotesViewMode] = useState<'list' | 'cards'>('list');

  // Recent quotes for display (last 10)
  const recentQuotes = useMemo(() => {
    return [...filteredCotacoes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);
  }, [filteredCotacoes]);

  // Monthly trend data for charts (last 6 months) - always shows last 6 months regardless of date filter
  const monthlyTrendData = useMemo(() => {
    const months = [];
    const now = new Date();

    // Apply only producer and unit filters, not date filter
    const trendFilteredCotacoes = allQuotes.filter(cotacao => {
      const produtorMatch = produtorFilter === 'todos' || cotacao.produtor_cotador?.nome === produtorFilter;
      const unidadeMatch = unidadeFilter === 'todas' || cotacao.unidade?.descricao === unidadeFilter;
      return produtorMatch && unidadeMatch;
    });
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('pt-BR', {
        month: 'short'
      });
      const year = date.getFullYear();
      const monthCotacoes = trendFilteredCotacoes.filter(c => {
        const cotacaoDate = new Date(c.data_cotacao);
        return cotacaoDate.getMonth() === date.getMonth() && cotacaoDate.getFullYear() === date.getFullYear();
      });
      const emCotacao = monthCotacoes.filter(c => c.status === 'Em cotação').length;
      const fechadas = monthCotacoes.filter(c => c.status === 'Negócio fechado').length;
      months.push({
        mes: `${monthName}/${year.toString().slice(-2)}`,
        total: monthCotacoes.length,
        emCotacao,
        fechadas
      });
    }
    return months;
  }, [allQuotes, produtorFilter, unidadeFilter]);

  // Top seguradoras data - últimos 12 meses com filtros de produtor e unidade
  const seguradoraData = useMemo(() => {
    const seguradoraStats: Record<string, {
      nome: string;
      premio: number;
      count: number;
    }> = {};

    // Calculate date range for last 12 months
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);

    // Apply only producer and unit filters, use fixed 12-month period
    const seguradoraFilteredCotacoes = allQuotes.filter(cotacao => {
      const produtorMatch = produtorFilter === 'todos' || cotacao.produtor_cotador?.nome === produtorFilter;
      const unidadeMatch = unidadeFilter === 'todas' || cotacao.unidade?.descricao === unidadeFilter;
      const dateMatch = new Date(cotacao.data_cotacao) >= twelveMonthsAgo;
      return produtorMatch && unidadeMatch && dateMatch;
    });
    console.log('Seguradoras Debug:', {
      totalFiltered: seguradoraFilteredCotacoes.length,
      fechadas: seguradoraFilteredCotacoes.filter(c => c.status === 'Negócio fechado').length,
      comSeguradora: seguradoraFilteredCotacoes.filter(c => c.seguradora).length,
      comPremio: seguradoraFilteredCotacoes.filter(c => c.status === 'Negócio fechado' && c.valor_premio > 0).length,
      sample: seguradoraFilteredCotacoes.slice(0, 3).map(c => ({
        status: c.status,
        seguradora: c.seguradora?.nome,
        premio: c.valor_premio
      }))
    });
    seguradoraFilteredCotacoes.forEach(cotacao => {
      if (cotacao.seguradora && cotacao.status === 'Negócio fechado' && cotacao.valor_premio > 0) {
        const nome = cotacao.seguradora.nome;
        if (!seguradoraStats[nome]) {
          seguradoraStats[nome] = {
            nome,
            premio: 0,
            count: 0
          };
        }
        seguradoraStats[nome].premio += Number(cotacao.valor_premio);
        seguradoraStats[nome].count++;
      }
    });
    const result = Object.values(seguradoraStats).sort((a, b) => b.premio - a.premio).slice(0, 5);
    console.log('Seguradoras Result:', result);
    return result;
  }, [allQuotes, produtorFilter, unidadeFilter]);

  // Pie chart data
  const pieChartData = useMemo(() => {
    return distribuicaoStatus.map(item => ({
      name: item.status,
      value: item.count,
      color: item.status === 'Em cotação' ? 'hsl(var(--brand-orange))' : item.status === 'Negócio fechado' ? 'hsl(var(--success-alt))' : 'hsl(var(--destructive))'
    }));
  }, [distribuicaoStatus]);

  // Top produtores
  const topProdutores = useMemo(() => {
    const produtorStats: Record<string, {
      nome: string;
      total: number;
      fechadas: number;
    }> = {};
    filteredCotacoes.forEach(cotacao => {
      if (cotacao.produtor_cotador) {
        const nome = cotacao.produtor_cotador.nome;
        if (!produtorStats[nome]) {
          produtorStats[nome] = {
            nome,
            total: 0,
            fechadas: 0
          };
        }
        produtorStats[nome].total++;
        if (cotacao.status === 'Negócio fechado') {
          produtorStats[nome].fechadas++;
        }
      }
    });
    return Object.values(produtorStats).sort((a, b) => b.fechadas - a.fechadas);
  }, [filteredCotacoes]);

  // Análise por segmento - cotações em aberto (clientes distintos)
  const cotacoesPorSegmento = useMemo(() => {
    const segmentoStats: Record<string, {
      clientes: Set<string>;
      cotacoes: Cotacao[];
    }> = {};
    filteredCotacoes.filter(c => c.status === 'Em cotação' || c.status === 'Em análise').forEach(cotacao => {
      const segmento = cotacao.segmento || 'Não informado';
      if (!segmentoStats[segmento]) {
        segmentoStats[segmento] = {
          clientes: new Set(),
          cotacoes: []
        };
      }
      segmentoStats[segmento].clientes.add(cotacao.cpf_cnpj);
      segmentoStats[segmento].cotacoes.push(cotacao);
    });
    return Object.entries(segmentoStats).map(([segmento, data]) => ({
      segmento,
      count: data.clientes.size,
      cotacoes: data.cotacoes
    })).sort((a, b) => b.count - a.count);
  }, [filteredCotacoes]);

  // Análise por segmento - negócios fechados (clientes distintos)
  const fechamentosPorSegmento = useMemo(() => {
    const segmentoStats: Record<string, {
      clientes: Set<string>;
      cotacoes: Cotacao[];
    }> = {};
    filteredCotacoes.filter(c => c.status === 'Negócio fechado').forEach(cotacao => {
      const segmento = cotacao.segmento || 'Não informado';
      if (!segmentoStats[segmento]) {
        segmentoStats[segmento] = {
          clientes: new Set(),
          cotacoes: []
        };
      }
      segmentoStats[segmento].clientes.add(cotacao.cpf_cnpj);
      segmentoStats[segmento].cotacoes.push(cotacao);
    });
    return Object.entries(segmentoStats).map(([segmento, data]) => ({
      segmento,
      count: data.clientes.size,
      cotacoes: data.cotacoes
    })).sort((a, b) => b.count - a.count);
  }, [filteredCotacoes]);

  // Análise por segmento - declinados (clientes distintos)
  const declinadosPorSegmento = useMemo(() => {
    const segmentoStats: Record<string, {
      clientes: Set<string>;
      cotacoes: Cotacao[];
    }> = {};
    filteredCotacoes.filter(c => c.status === 'Declinado').forEach(cotacao => {
      const segmento = cotacao.segmento || 'Não informado';
      if (!segmentoStats[segmento]) {
        segmentoStats[segmento] = {
          clientes: new Set(),
          cotacoes: []
        };
      }
      segmentoStats[segmento].clientes.add(cotacao.cpf_cnpj);
      segmentoStats[segmento].cotacoes.push(cotacao);
    });
    return Object.entries(segmentoStats).map(([segmento, data]) => ({
      segmento,
      count: data.clientes.size,
      cotacoes: data.cotacoes
    })).sort((a, b) => b.count - a.count);
  }, [filteredCotacoes]);
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Negócio fechado':
        return 'success-alt';
      case 'Em cotação':
        return 'brand-orange';
      case 'Declinado':
        return 'destructive';
      case 'Alocada Outra':
        return 'secondary';
      default:
        return 'secondary';
    }
  };
  const formatComparison = (diff: number, percentage: number) => {
    const sign = diff > 0 ? '+' : '';
    const icon = diff > 0 ? <TrendingUp className="h-3 w-3" /> : diff < 0 ? <TrendingDown className="h-3 w-3" /> : null;
    const color = diff > 0 ? 'text-success' : diff < 0 ? 'text-destructive' : 'text-muted-foreground';
    return <span className={`text-xs flex items-center gap-1 ${color}`}>
        {icon}
        {sign}{diff} ({sign}{percentage.toFixed(1)}%)
      </span>;
  };
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Análise completa e KPIs de cotações
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleImportCSV} className="gap-2">
            <Upload className="h-4 w-4" />
            Importar CSV
          </Button>
          <Button onClick={handleNewCotacao} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Cotação
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Período</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                  <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                  <SelectItem value="90dias">Últimos 90 dias</SelectItem>
                  <SelectItem value="mes_atual">Este mês</SelectItem>
                  <SelectItem value="mes_anterior">Mês passado</SelectItem>
                  <SelectItem value="ano_atual">Ano atual</SelectItem>
                  <SelectItem value="personalizado">Período personalizado</SelectItem>
                  <SelectItem value="personalizado_comparacao">Personalizado com comparação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(dateFilter === 'personalizado' || dateFilter === 'personalizado_comparacao') && (
              <div className="flex-1 min-w-[280px]">
                <label className="text-sm font-medium mb-2 block">Data personalizada</label>
                <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
              </div>
            )}

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Produtor</label>
              <Select value={produtorFilter} onValueChange={setProdutorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os produtores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os produtores</SelectItem>
                  {produtores.map(produtor => <SelectItem key={produtor.id} value={produtor.nome}>
                      {produtor.nome}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Unidade</label>
              <Select value={unidadeFilter} onValueChange={setUnidadeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as unidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as unidades</SelectItem>
                  {unidades.map(unidade => <SelectItem key={unidade.id} value={unidade.descricao}>
                      {unidade.descricao}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {dateFilter === 'personalizado_comparacao' && (
              <div className="flex-1 min-w-[280px]">
                <label className="text-sm font-medium mb-2 block">Período de comparação</label>
                <DatePickerWithRange date={compareRange} onDateChange={setCompareRange} />
              </div>
            )}

            <Button variant="outline" onClick={() => {
            setDateFilter('mes_atual');
            setProdutorFilter('todos');
            setUnidadeFilter('todas');
            setDateRange(undefined);
            setCompareRange(undefined);
          }} className="col-span-full md:col-span-1">
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Mensais com Comparativos */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Cotação</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <div className="text-2xl font-bold text-brand-orange">{monthlyStats.emCotacao}</div>
                    {formatComparison(monthlyStats.emCotacaoComp.diff, monthlyStats.emCotacaoComp.percentage)}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-sm max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Clientes em Cotação no Período</h4>
                    {clientesEmCotacao.length > 0 ? <div className="space-y-1">
                        {clientesEmCotacao.map(cotacao => <div key={cotacao.id} className="text-xs border-b pb-1 last:border-b-0">
                            <div className="font-medium">{cotacao.segurado}</div>
                            <div className="text-muted-foreground">
                              Data Cotação: {formatDate(cotacao.data_cotacao)}
                            </div>
                            <div className="text-muted-foreground">
                              Prêmio: {formatCurrency(cotacao.valor_premio)}
                            </div>
                          </div>)}
                      </div> : <p className="text-xs text-muted-foreground">Nenhum cliente em cotação no período</p>}
                  </div>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Negócio Fechado</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <div className="text-2xl font-bold text-success">{monthlyStats.fechados}</div>
                    {formatComparison(monthlyStats.fechadosComp.diff, monthlyStats.fechadosComp.percentage)}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-sm max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Clientes Fechados no Período</h4>
                    {clientesFechados.length > 0 ? <div className="space-y-1">
                        {clientesFechados.map((cotacao, index) => <div key={cotacao.id} className="text-xs border-b pb-1 last:border-b-0">
                            <div className="font-medium">{cotacao.segurado}</div>
                            <div className="text-muted-foreground">
                              Fechamento: {cotacao.data_fechamento ? formatDate(cotacao.data_fechamento) : 'N/A'}
                            </div>
                            <div className="text-muted-foreground">
                              Prêmio: {formatCurrency(cotacao.valor_premio)}
                            </div>
                          </div>)}
                      </div> : <p className="text-xs text-muted-foreground">Nenhum cliente fechado no período</p>}
                  </div>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Declinado</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{monthlyStats.declinados}</div>
            {formatComparison(monthlyStats.declinadosComp.diff, monthlyStats.declinadosComp.percentage)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(monthlyStats.ticketMedio)}</div>
            <p className="text-xs text-muted-foreground">Média mensal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(monthlyStats.tempoMedioFechamento)} dias</div>
            <p className="text-xs text-muted-foreground">Fechamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success-alt">{monthlyStats.taxaConversao.toFixed(1)}%</div>
            {formatComparison(monthlyStats.taxaConversaoComp.diff, monthlyStats.taxaConversaoComp.percentage)}
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por Status e Top Produtores */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Distribuição por Status (50% da largura) */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {distribuicaoStatus.map(({
              status,
              count,
              seguradosDistintos,
              percentage
            }) => <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={getStatusBadgeVariant(status)}>
                      {status}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      <div>{count} cotações</div>
                      <div>{seguradosDistintos} segurados distintos</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-secondary rounded-full h-2">
                      <div className="bg-primary rounded-full h-2" style={{
                    width: `${percentage}%`
                  }} />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>)}
            </div>
          </CardContent>
        </Card>

        {/* Top Produtores */}
        <Card>
          <CardHeader>
            <CardTitle>Top Produtores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProdutoresDetalhado.length > 0 ? topProdutoresDetalhado.map((produtor, index) => <div key={produtor.nome} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{produtor.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {produtor.total} cotações
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-bold text-success">{produtor.fechadas}</div>
                        <div className="text-xs text-muted-foreground">Fechados</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-destructive">{produtor.declinadas}</div>
                        <div className="text-xs text-muted-foreground">Declinados</div>
                      </div>
                    </div>
                  </div>) : <p className="text-center text-muted-foreground py-4">
                  Nenhum produtor encontrado no período
                </p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos e Análises Avançadas */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Tendência Mensal */}
        <Card>
          <CardHeader>
            <CardTitle>Tendência de Cotações (Últimos 6 Meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(value, name) => [value, name === 'fechadas' ? 'Negócios Fechados' : name === 'emCotacao' ? 'Em Cotação' : name === 'total' ? 'Total de Cotações' : name]} />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--muted-foreground))" strokeWidth={2} name="Total" strokeDasharray="5 5" />
                <Line type="monotone" dataKey="emCotacao" stroke="hsl(var(--brand-orange))" strokeWidth={2} name="Em Cotação" />
                <Line type="monotone" dataKey="fechadas" stroke="hsl(var(--success-alt))" strokeWidth={2} name="Fechadas" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance por Seguradora */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Top 5 Seguradoras</CardTitle>
              <span className="text-xs text-muted-foreground">Últimos 12 meses</span>
            </div>
          </CardHeader>
          <CardContent>
            {seguradoraData.length > 0 ? <ResponsiveContainer width="100%" height={300}>
                <BarChart data={seguradoraData} layout="vertical" margin={{
              left: 20
            }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="nome" type="category" width={100} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={label => label} contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))'
              }} />
                  <Bar dataKey="premio" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer> : <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado disponível para o período selecionado
              </div>}
          </CardContent>
        </Card>
      </div>

      {/* Análises por Segmento */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Cotações em Aberto por Segmento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cotações em Aberto por Segmento</CardTitle>
            <p className="text-xs text-muted-foreground">Clientes distintos</p>
          </CardHeader>
          <CardContent>
            {cotacoesPorSegmento.length > 0 ? <TooltipProvider>
                <div className="space-y-3">
                  {cotacoesPorSegmento.map(item => <div key={item.segmento} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.segmento}</span>
                        <span className="font-bold text-brand-orange">{item.count}</span>
                      </div>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <div className="w-full bg-secondary rounded-full h-8 flex items-center cursor-help">
                            <div className="bg-brand-orange rounded-full h-8 flex items-center justify-end px-3 text-xs font-medium text-white transition-all" style={{
                        width: `${Math.max(item.count / Math.max(...cotacoesPorSegmento.map(s => s.count)) * 100, 10)}%`
                      }}>
                              {item.count}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-md max-h-96 overflow-y-auto">
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm mb-2">Detalhes - {item.segmento}</h4>
                            {item.cotacoes.slice(0, 10).map(cotacao => <div key={cotacao.id} className="text-xs border-b pb-2 last:border-b-0">
                                <div className="font-medium">{cotacao.segurado}</div>
                                <div className="text-muted-foreground mt-1">
                                  <div>Produtor: {cotacao.produtor_cotador?.nome || 'Não informado'}</div>
                                  <div>Ramo: {cotacao.ramo?.descricao || 'Não informado'}</div>
                                  <div>Prêmio: {formatCurrency(cotacao.valor_premio)}</div>
                                </div>
                              </div>)}
                            {item.cotacoes.length > 10 && <p className="text-xs text-muted-foreground italic">
                                E mais {item.cotacoes.length - 10} cotações...
                              </p>}
                          </div>
                        </TooltipContent>
                      </UITooltip>
                    </div>)}
                </div>
              </TooltipProvider> : <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                Nenhuma cotação em aberto no período
              </div>}
          </CardContent>
        </Card>

        {/* Fechamentos por Segmento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quantidade de Fechamentos Por Segmento</CardTitle>
            <p className="text-xs text-muted-foreground">Clientes distintos</p>
          </CardHeader>
          <CardContent>
            {fechamentosPorSegmento.length > 0 ? <TooltipProvider>
                <div className="space-y-3">
                  {fechamentosPorSegmento.map(item => <div key={item.segmento} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.segmento}</span>
                        <span className="font-bold text-success-alt">{item.count}</span>
                      </div>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <div className="w-full bg-secondary rounded-full h-8 flex items-center cursor-help">
                            <div className="bg-success-alt rounded-full h-8 flex items-center justify-end px-3 text-xs font-medium text-white transition-all" style={{
                        width: `${Math.max(item.count / Math.max(...fechamentosPorSegmento.map(s => s.count)) * 100, 10)}%`
                      }}>
                              {item.count}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-md max-h-96 overflow-y-auto">
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm mb-2">Detalhes - {item.segmento}</h4>
                            {item.cotacoes.slice(0, 10).map(cotacao => <div key={cotacao.id} className="text-xs border-b pb-2 last:border-b-0">
                                <div className="font-medium">{cotacao.segurado}</div>
                                <div className="text-muted-foreground mt-1">
                                  <div>Produtor: {cotacao.produtor_cotador?.nome || 'Não informado'}</div>
                                  <div>Ramo: {cotacao.ramo?.descricao || 'Não informado'}</div>
                                  <div>Prêmio: {formatCurrency(cotacao.valor_premio)}</div>
                                  {cotacao.data_fechamento && <div>Fechamento: {formatDate(cotacao.data_fechamento)}</div>}
                                </div>
                              </div>)}
                            {item.cotacoes.length > 10 && <p className="text-xs text-muted-foreground italic">
                                E mais {item.cotacoes.length - 10} cotações...
                              </p>}
                          </div>
                        </TooltipContent>
                      </UITooltip>
                    </div>)}
                </div>
              </TooltipProvider> : <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                Nenhum fechamento no período
              </div>}
          </CardContent>
        </Card>

        {/* Declinados por Segmento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cotações Declinadas por Segmento</CardTitle>
            <p className="text-xs text-muted-foreground">Clientes distintos</p>
          </CardHeader>
          <CardContent>
            {declinadosPorSegmento.length > 0 ? <TooltipProvider>
                <div className="space-y-3">
                  {declinadosPorSegmento.map(item => <div key={item.segmento} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.segmento}</span>
                        <span className="font-bold text-destructive">{item.count}</span>
                      </div>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <div className="w-full bg-secondary rounded-full h-8 flex items-center cursor-help">
                            <div className="bg-destructive rounded-full h-8 flex items-center justify-end px-3 text-xs font-medium text-white transition-all" style={{
                        width: `${Math.max(item.count / Math.max(...declinadosPorSegmento.map(s => s.count)) * 100, 10)}%`
                      }}>
                              {item.count}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-md max-h-96 overflow-y-auto">
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm mb-2">Detalhes - {item.segmento}</h4>
                            {item.cotacoes.slice(0, 10).map(cotacao => <div key={cotacao.id} className="text-xs border-b pb-2 last:border-b-0">
                                <div className="font-medium">{cotacao.segurado}</div>
                                <div className="text-muted-foreground mt-1">
                                  <div>Produtor: {cotacao.produtor_cotador?.nome || 'Não informado'}</div>
                                  <div>Ramo: {cotacao.ramo?.descricao || 'Não informado'}</div>
                                  <div>Prêmio: {formatCurrency(cotacao.valor_premio)}</div>
                                </div>
                              </div>)}
                            {item.cotacoes.length > 10 && <p className="text-xs text-muted-foreground italic">
                                E mais {item.cotacoes.length - 10} cotações...
                              </p>}
                          </div>
                        </TooltipContent>
                      </UITooltip>
                    </div>)}
                </div>
              </TooltipProvider> : <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                Nenhuma cotação declinada no período
              </div>}
          </CardContent>
        </Card>
      </div>

      {/* Insights Adicionais */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Gráfico de Pizza - Status */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieChartData} cx="50%" cy="50%" labelLine={false} label={({
                name,
                percent
              }) => `${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                  {pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {pieChartData.map(item => <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{
                backgroundColor: item.color
              }}></div>
                  <span className="text-sm">{item.name}: {item.value}</span>
                </div>)}
            </div>
          </CardContent>
        </Card>

        {/* Análise de Produtividade */}
        <Card>
          <CardHeader>
            <CardTitle>Top Produtores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProdutores.slice(0, 5).map((produtor, index) => <div key={produtor.nome} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium">{produtor.nome}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{produtor.fechadas}</div>
                    <div className="text-xs text-muted-foreground">fechadas</div>
                  </div>
                </div>)}
            </div>
          </CardContent>
        </Card>

        {/* Análise de Unidades */}
        <Card>
          <CardHeader>
            <CardTitle>Performance por Unidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from(new Set(filteredCotacoes.map(c => c.unidade?.descricao).filter(Boolean))).slice(0, 5).map(unidadeNome => {
              const unidadeCotacoes = filteredCotacoes.filter(c => c.unidade?.descricao === unidadeNome);
              const fechadas = unidadeCotacoes.filter(c => c.status === 'Negócio fechado').length;
              const taxa = unidadeCotacoes.length > 0 ? fechadas / unidadeCotacoes.length * 100 : 0;
              return <div key={unidadeNome} className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                      <span className="text-sm font-medium">{unidadeNome}</span>
                      <div className="text-right">
                        <div className="text-sm font-bold">{fechadas}/{unidadeCotacoes.length}</div>
                        <div className="text-xs text-muted-foreground">{taxa.toFixed(1)}%</div>
                      </div>
                    </div>;
            })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cotações Recentes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cotações Recentes</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant={recentQuotesViewMode === 'list' ? 'default' : 'outline'} onClick={() => setRecentQuotesViewMode('list')} className="gap-2">
              <List className="h-4 w-4" />
              Lista
            </Button>
            <Button size="sm" variant={recentQuotesViewMode === 'cards' ? 'default' : 'outline'} onClick={() => setRecentQuotesViewMode('cards')} className="gap-2">
              <Grid3X3 className="h-4 w-4" />
              Cards
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentQuotesViewMode === 'list' ? <div className="space-y-3">
              {recentQuotes.length > 0 ? <div className="space-y-2">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-4 pb-2 border-b text-sm font-medium text-muted-foreground">
                    <div className="col-span-2">Status</div>
                    <div className="col-span-3">Segurado</div>
                    <div className="col-span-2">Seguradora</div>
                    <div className="col-span-2">Ramo</div>
                    <div className="col-span-2">Produtor</div>
                    <div className="col-span-1 text-right">Valor</div>
                  </div>
                  {/* Rows */}
                  {recentQuotes.map(cotacao => <div key={cotacao.id} className="grid grid-cols-12 gap-4 py-2 rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="col-span-2">
                        <Badge variant={getStatusBadgeVariant(cotacao.status)} className="text-xs">
                          {cotacao.status}
                        </Badge>
                      </div>
                      <div className="col-span-3">
                        <p className="font-medium text-sm">{cotacao.segurado}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(cotacao.created_at)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm">{cotacao.seguradora?.nome || '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm">{cotacao.ramo?.descricao || '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm">{cotacao.produtor_origem?.nome || '-'}</p>
                      </div>
                      <div className="col-span-1 text-right">
                        <span className="text-sm font-bold text-quote-value">
                          {formatCurrency(cotacao.valor_premio)}
                        </span>
                      </div>
                    </div>)}
                </div> : <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Nenhuma cotação recente encontrada.</p>
                </div>}
            </div> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentQuotes.length > 0 ? recentQuotes.map(cotacao => <div key={cotacao.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant={getStatusBadgeVariant(cotacao.status)} className="text-xs">
                      {cotacao.status}
                    </Badge>
                    <span className="text-sm font-bold text-quote-value">
                      {formatCurrency(cotacao.valor_premio)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{cotacao.segurado}</p>
                    <p className="text-xs text-muted-foreground">
                      {cotacao.seguradora?.nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cotacao.ramo?.descricao}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Produtor: {cotacao.produtor_origem?.nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(cotacao.created_at)}
                    </p>
                  </div>
                </div>) : <div className="text-center py-8 col-span-full">
                  <p className="text-sm text-muted-foreground">Nenhuma cotação recente encontrada.</p>
                </div>}
            </div>}
        </CardContent>
      </Card>

      <CotacaoModal cotacao={selectedCotacao} isOpen={isModalOpen} onClose={() => {
      setIsModalOpen(false);
      setSelectedCotacao(null);
    }} />
    </div>;
};
export default Dashboard;