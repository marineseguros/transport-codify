import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRegraRamo } from "@/lib/ramoClassification";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCotacoesTotais, useProdutores, useUnidades, useSeguradoras, useRamos, type Cotacao } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { WeeklyReminderModal } from "@/components/WeeklyReminderModal";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Clock,
  Target,
  Plus,
  Upload,
  Users,
  Building,
  List,
  Grid3X3,
  BarChart as BarChartIcon,
  ExternalLink,
  Eye,
  Building2,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Shield,
  Layers,
} from "lucide-react";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import { DashboardEditToolbar } from "@/components/dashboard/DashboardEditToolbar";
import { DashboardFilters, type DashboardFilterValues } from "@/components/dashboard/DashboardFilters";
import { TopProdutoresModal } from "@/components/dashboard/TopProdutoresModal";
import { ProdutorDetailModal } from "@/components/dashboard/ProdutorDetailModal";
import { StatusDetailModal } from "@/components/dashboard/StatusDetailModal";
import { TendenciaDetailModal } from "@/components/dashboard/TendenciaDetailModal";
import { SeguradoraDetailModal } from "@/components/dashboard/SeguradoraDetailModal";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { CotacaoModal } from "@/components/CotacaoModal";
import { logger } from "@/lib/logger";
import { MetasRealizadoChart } from "@/components/dashboard/MetasRealizadoChart";
import { CotacoesEmAbertoChart } from "@/components/dashboard/CotacoesEmAbertoChart";
import { MetasPremioComparison } from "@/components/dashboard/MetasPremioComparison";

// Helper function to determine branch group
const getBranchGroup = (ramoDescricao: string | undefined): string => {
  if (!ramoDescricao) return "outros";
  
  const ramoUpper = ramoDescricao.toUpperCase();
  
  // Group 1: RCTR-C + RC-DC
  if (ramoUpper.includes("RCTR-C") || ramoUpper.includes("RC-DC")) {
    return "grupo_rctr";
  }
  
  // Group 2: All other specific types
  const group2Types = [
    "NACIONAL",
    "EXPORTAÇÃO",
    "EXPORTACAO",
    "IMPORTAÇÃO",
    "IMPORTACAO",
    "RCTR-VI",
    "NACIONAL AVULSA",
    "IMPORTAÇÃO AVULSA",
    "IMPORTACAO AVULSA",
    "RCTA-C",
    "AMBIENTAL",
    "RC-V"
  ];
  
  if (group2Types.some(type => ramoUpper.includes(type))) {
    return "grupo_nacional";
  }
  
  return "outros";
};

// Helper function to count distinct quotes by CNPJ + branch group for any status
const countDistinctByStatus = (cotacoes: Cotacao[], targetStatuses: string[]): number => {
  const distinctKeys = new Set<string>();
  
  cotacoes.forEach(cotacao => {
    if (targetStatuses.includes(cotacao.status)) {
      const branchGroup = getBranchGroup(cotacao.ramo?.descricao);
      const key = `${cotacao.cpf_cnpj}_${branchGroup}`;
      distinctKeys.add(key);
    }
  });
  
  return distinctKeys.size;
};

// Helper function to count distinct closings (backward compatibility wrapper)
const countDistinctClosings = (cotacoes: Cotacao[]): number => {
  return countDistinctByStatus(cotacoes, ["Negócio fechado", "Fechamento congênere"]);
};

const Dashboard = () => {
  const { user } = useAuth();
  const { cotacoes: allQuotes, loading: loadingCotacoes } = useCotacoesTotais();
  const { produtores, loading: loadingProdutores } = useProdutores();
  const { unidades, loading: loadingUnidades } = useUnidades();
  const { seguradoras, loading: loadingSeguradoras } = useSeguradoras();
  const { ramos, loading: loadingRamos } = useRamos();
  const loading = loadingCotacoes || loadingProdutores || loadingUnidades || loadingSeguradoras || loadingRamos;
  
  // Unified filter state
  const [filters, setFilters] = useState<DashboardFilterValues>({
    dateFilter: "mes_atual",
    dateRange: undefined,
    produtorFilter: "todos",
    seguradoraFilter: "todas",
    ramoFilter: "todos",
    segmentoFilter: "todos",
    regraFilter: "todas",
    anoEspecifico: "",
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCotacao, setSelectedCotacao] = useState<Cotacao | null>(null);
  const [showReminder, setShowReminder] = useState(false);
  
  // Dashboard layout customization - open for all users
  const dashboardLayout = useDashboardLayout();

  useEffect(() => {
    const checkWeeklyReminder = async () => {
      if (!user?.user_id) return;

      // Only show for Produtor and Operacional roles
      const targetRoles = ['Produtor', 'Operacional'];
      if (!user.papel || !targetRoles.includes(user.papel)) return;

      // Check if today is Monday (0 = Sunday, 1 = Monday)
      const today = new Date();
      // TEMPORÁRIO: Comentado para validação - descomentar depois
      // const isMonday = today.getDay() === 1;
      // if (!isMonday) return;

      const todayStr = today.toISOString().split('T')[0];

      // Check if dismissed in localStorage for today
      const dismissed = localStorage.getItem(`weekly_reminder_dismissed_${user.user_id}`);
      if (dismissed === todayStr) return;

      // Check if already confirmed in database for today
      try {
        const { data, error } = await supabase
          .from("weekly_reminder_confirmations")
          .select("id")
          .eq("user_id", user.user_id)
          .eq("confirmed_date", todayStr)
          .maybeSingle();

        if (error) throw error;

        // If not confirmed yet, show reminder
        if (!data) {
          setShowReminder(true);
        }
      } catch (error) {
        logger.error("Error checking weekly reminder:", error);
      }
    };

    checkWeeklyReminder();
  }, [user]);
  const handleImportCSV = () => {
    toast.success("Funcionalidade de importar CSV será implementada");
  };
  const handleNewCotacao = () => {
    setSelectedCotacao(null);
    setIsModalOpen(true);
  };

  // Filter cotacoes by all filter criteria
  // Use data_cotacao for "Em cotação" and "Declinado"
  // Use data_fechamento for "Negócio fechado" and "Fechamento congênere"
  const filteredCotacoes = useMemo(() => {
    let filtered = allQuotes;

    // Apply produtor filter
    if (filters.produtorFilter !== "todos") {
      filtered = filtered.filter((cotacao) => cotacao.produtor_cotador?.nome === filters.produtorFilter);
    }

    // Apply seguradora filter
    if (filters.seguradoraFilter !== "todas") {
      filtered = filtered.filter((cotacao) => cotacao.seguradora?.nome === filters.seguradoraFilter);
    }

    // Apply ramo filter
    if (filters.ramoFilter !== "todos") {
      filtered = filtered.filter((cotacao) => cotacao.ramo?.descricao === filters.ramoFilter);
    }

    // Apply segmento filter (from ramo)
    if (filters.segmentoFilter !== "todos") {
      filtered = filtered.filter((cotacao) => cotacao.ramo?.segmento === filters.segmentoFilter);
    }

    // Apply regra filter (from ramo - database field)
    if (filters.regraFilter !== "todas") {
      filtered = filtered.filter((cotacao) => cotacao.ramo?.regra === filters.regraFilter);
    }

    // Apply date filter
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    switch (filters.dateFilter) {
      case "30dias":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "mes_atual":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "mes_anterior":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "ano_atual":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case "ano_anterior":
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      case "ano_especifico":
        const year = parseInt(filters.anoEspecifico) || now.getFullYear();
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31);
        break;
      case "personalizado":
        if (!filters.dateRange?.from) return filtered;
        startDate = filters.dateRange.from;
        endDate = filters.dateRange.to || filters.dateRange.from;
        break;
      default:
        return filtered;
    }
    
    // Filter by correct date field based on status
    return filtered.filter((cotacao) => {
      // Use data_cotacao for "Em cotação" and "Declinado"
      if (cotacao.status === "Em cotação" || cotacao.status === "Declinado") {
        const cotacaoDate = new Date(cotacao.data_cotacao);
        return cotacaoDate >= startDate && cotacaoDate <= endDate;
      }
      // Use data_fechamento for "Negócio fechado" and "Fechamento congênere"
      if (cotacao.status === "Negócio fechado" || cotacao.status === "Fechamento congênere") {
        if (!cotacao.data_fechamento) return false;
        const fechamentoDate = new Date(cotacao.data_fechamento);
        return fechamentoDate >= startDate && fechamentoDate <= endDate;
      }
      // Default fallback
      const cotacaoDate = new Date(cotacao.data_cotacao);
      return cotacaoDate >= startDate && cotacaoDate <= endDate;
    });
  }, [allQuotes, filters]);

  // Calculate stats with comparisons based on selected period
  const monthlyStats = useMemo(() => {
    const now = new Date();

    // Get date ranges based on selected filter
    let currentStartDate: Date;
    let currentEndDate: Date = now;
    let previousStartDate: Date;
    let previousEndDate: Date;
    switch (filters.dateFilter) {
      case "30dias":
        currentStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        previousEndDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "mes_atual":
        currentStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
        currentEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "mes_anterior":
        currentStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        currentEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth() - 1, 0);
        break;
      case "ano_atual":
        currentStartDate = new Date(now.getFullYear(), 0, 1);
        currentEndDate = new Date(now.getFullYear(), 11, 31);
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
        previousEndDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      case "ano_anterior":
        currentStartDate = new Date(now.getFullYear() - 1, 0, 1);
        currentEndDate = new Date(now.getFullYear() - 1, 11, 31);
        previousStartDate = new Date(now.getFullYear() - 2, 0, 1);
        previousEndDate = new Date(now.getFullYear() - 2, 11, 31);
        break;
      case "ano_especifico":
        const year = parseInt(filters.anoEspecifico) || now.getFullYear();
        currentStartDate = new Date(year, 0, 1);
        currentEndDate = new Date(year, 11, 31);
        previousStartDate = new Date(year - 1, 0, 1);
        previousEndDate = new Date(year - 1, 11, 31);
        break;
      case "personalizado":
        if (!filters.dateRange?.from) {
          currentStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
          currentEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
        } else {
          currentStartDate = filters.dateRange.from;
          currentEndDate = filters.dateRange.to || filters.dateRange.from;
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

    // Apply all filters consistently for both periods
    const baseFilteredQuotes = allQuotes.filter((c) => {
      const produtorMatch = filters.produtorFilter === "todos" || c.produtor_cotador?.nome === filters.produtorFilter;
      const seguradoraMatch = filters.seguradoraFilter === "todas" || c.seguradora?.nome === filters.seguradoraFilter;
      const ramoMatch = filters.ramoFilter === "todos" || c.ramo?.descricao === filters.ramoFilter;
      const segmentoMatch = filters.segmentoFilter === "todos" || c.ramo?.segmento === filters.segmentoFilter;
      const regraMatch = filters.regraFilter === "todas" || c.ramo?.regra === filters.regraFilter;
      return produtorMatch && seguradoraMatch && ramoMatch && segmentoMatch && regraMatch;
    });
    
    // Filter quotations (Em cotação, Declinado) by data_cotacao
    const currentPeriodCotacoes = baseFilteredQuotes.filter((c) => {
      if (c.status === "Em cotação" || c.status === "Declinado") {
        const date = new Date(c.data_cotacao);
        return date >= currentStartDate && date <= currentEndDate;
      }
      return false;
    });
    
    const previousPeriodCotacoes = baseFilteredQuotes.filter((c) => {
      if (c.status === "Em cotação" || c.status === "Declinado") {
        const date = new Date(c.data_cotacao);
        return date >= previousStartDate && date <= previousEndDate;
      }
      return false;
    });
    
    // Filter closings (Negócio fechado, Fechamento congênere) by data_fechamento
    const currentPeriodFechamentos = baseFilteredQuotes.filter((c) => {
      if (c.status === "Negócio fechado" || c.status === "Fechamento congênere") {
        if (!c.data_fechamento) return false;
        const date = new Date(c.data_fechamento);
        return date >= currentStartDate && date <= currentEndDate;
      }
      return false;
    });
    
    const previousPeriodFechamentos = baseFilteredQuotes.filter((c) => {
      if (c.status === "Negócio fechado" || c.status === "Fechamento congênere") {
        if (!c.data_fechamento) return false;
        const date = new Date(c.data_fechamento);
        return date >= previousStartDate && date <= previousEndDate;
      }
      return false;
    });

    // Current period stats - use distinct count (CNPJ + branch group) for ALL statuses
    const emCotacao = countDistinctByStatus(currentPeriodCotacoes, ["Em cotação"]);
    const fechados = countDistinctByStatus(currentPeriodFechamentos, ["Negócio fechado", "Fechamento congênere"]);
    const declinados = countDistinctByStatus(currentPeriodCotacoes, ["Declinado"]);

    // Previous period stats - use distinct count for ALL statuses
    const emCotacaoAnterior = countDistinctByStatus(previousPeriodCotacoes, ["Em cotação"]);
    const fechadosAnterior = countDistinctByStatus(previousPeriodFechamentos, ["Negócio fechado", "Fechamento congênere"]);
    const declinadosAnterior = countDistinctByStatus(previousPeriodCotacoes, ["Declinado"]);

    // Calculate differences and percentages
    const calculateComparison = (current: number, previous: number) => {
      const diff = current - previous;
      const percentage = previous > 0 ? (diff / previous) * 100 : 0;
      return {
        diff,
        percentage,
      };
    };
    const emCotacaoComp = calculateComparison(emCotacao, emCotacaoAnterior);
    const fechadosComp = calculateComparison(fechados, fechadosAnterior);
    const declinadosComp = calculateComparison(declinados, declinadosAnterior);

    // KPIs calculations using current period - include "Fechamento congênere" in premio total
    const cotacoesFechadas = currentPeriodFechamentos; // Already filtered for both statuses
    const premioTotal = cotacoesFechadas.reduce((sum, c) => sum + (c.valor_premio || 0), 0);
    const ticketMedio = fechados > 0 ? premioTotal / fechados : 0; // Use distinct count

    // Previous period KPIs
    const cotacoesFechadasAnterior = previousPeriodFechamentos;
    const premioTotalAnterior = cotacoesFechadasAnterior.reduce((sum, c) => sum + (c.valor_premio || 0), 0);
    const ticketMedioAnterior = fechadosAnterior > 0 ? premioTotalAnterior / fechadosAnterior : 0;

    // Tempo médio de fechamento (dias)
    const temposFechamento = cotacoesFechadas
      .filter((c) => c.data_fechamento && c.data_cotacao)
      .map((c) => {
        const inicio = new Date(c.data_cotacao).getTime();
        const fim = new Date(c.data_fechamento!).getTime();
        return Math.round((fim - inicio) / (1000 * 60 * 60 * 24));
      });
    const tempoMedioFechamento =
      temposFechamento.length > 0
        ? temposFechamento.reduce((sum, tempo) => sum + tempo, 0) / temposFechamento.length
        : 0;

    // Previous period tempo médio
    const temposFechamentoAnterior = cotacoesFechadasAnterior
      .filter((c) => c.data_fechamento && c.data_cotacao)
      .map((c) => {
        const inicio = new Date(c.data_cotacao).getTime();
        const fim = new Date(c.data_fechamento!).getTime();
        return Math.round((fim - inicio) / (1000 * 60 * 60 * 24));
      });
    const tempoMedioFechamentoAnterior =
      temposFechamentoAnterior.length > 0
        ? temposFechamentoAnterior.reduce((sum, tempo) => sum + tempo, 0) / temposFechamentoAnterior.length
        : 0;

    // Taxa de conversão: fechamentos distintos / total distintos de todos os status
    const totalDistinct = emCotacao + declinados + fechados;
    const taxaConversao = totalDistinct > 0 ? (fechados / totalDistinct) * 100 : 0;
    
    const totalDistinctAnterior = emCotacaoAnterior + declinadosAnterior + fechadosAnterior;
    const taxaConversaoAnterior = totalDistinctAnterior > 0 ? (fechadosAnterior / totalDistinctAnterior) * 100 : 0;
    
    // Calculate comparisons
    const premioTotalComp = calculateComparison(premioTotal, premioTotalAnterior);
    const ticketMedioComp = calculateComparison(ticketMedio, ticketMedioAnterior);
    const tempoMedioComp = calculateComparison(tempoMedioFechamento, tempoMedioFechamentoAnterior);
    const taxaConversaoComp = calculateComparison(taxaConversao, taxaConversaoAnterior);
    
    // Stats by segmento - use combined period cotacoes and fechamentos
    const segmentos = ['Transportes', 'Avulso', 'Ambiental', 'RC-V'];
    const segmentoStats: Record<string, {
      emCotacao: number;
      fechados: number;
      declinados: number;
      premioTotal: number;
      tempoMedio: number;
      taxaConversao: number;
      previousEmCotacao: number;
      previousFechados: number;
      previousPremio: number;
      previousTempoMedio: number;
      previousTaxaConversao: number;
    }> = {};
    
    segmentos.forEach(segmento => {
      const currentCotacoesSegmento = currentPeriodCotacoes.filter(c => c.ramo?.segmento === segmento);
      const currentFechamentosSegmento = currentPeriodFechamentos.filter(c => c.ramo?.segmento === segmento);
      const previousCotacoesSegmento = previousPeriodCotacoes.filter(c => c.ramo?.segmento === segmento);
      const previousFechamentosSegmento = previousPeriodFechamentos.filter(c => c.ramo?.segmento === segmento);
      
      const emCotacaoSegmento = countDistinctByStatus(currentCotacoesSegmento, ["Em cotação"]);
      const fechadosSegmento = countDistinctByStatus(currentFechamentosSegmento, ["Negócio fechado", "Fechamento congênere"]);
      const declinadosSegmento = countDistinctByStatus(currentCotacoesSegmento, ["Declinado"]);
      const totalDistinctSegmento = emCotacaoSegmento + fechadosSegmento + declinadosSegmento;
      
      const previousEmCotacaoSegmento = countDistinctByStatus(previousCotacoesSegmento, ["Em cotação"]);
      const previousFechadosSegmento = countDistinctByStatus(previousFechamentosSegmento, ["Negócio fechado", "Fechamento congênere"]);
      const previousDeclinadosSegmento = countDistinctByStatus(previousCotacoesSegmento, ["Declinado"]);
      const previousTotalDistinctSegmento = previousEmCotacaoSegmento + previousFechadosSegmento + previousDeclinadosSegmento;
      
      // Tempo médio por segmento
      const temposFechamentoSegmento = currentFechamentosSegmento
        .filter((c) => c.data_fechamento && c.data_cotacao)
        .map((c) => {
          const inicio = new Date(c.data_cotacao).getTime();
          const fim = new Date(c.data_fechamento!).getTime();
          return Math.round((fim - inicio) / (1000 * 60 * 60 * 24));
        });
      const tempoMedioSegmento = temposFechamentoSegmento.length > 0
        ? temposFechamentoSegmento.reduce((sum, t) => sum + t, 0) / temposFechamentoSegmento.length
        : 0;
      
      const temposFechamentoPreviousSegmento = previousFechamentosSegmento
        .filter((c) => c.data_fechamento && c.data_cotacao)
        .map((c) => {
          const inicio = new Date(c.data_cotacao).getTime();
          const fim = new Date(c.data_fechamento!).getTime();
          return Math.round((fim - inicio) / (1000 * 60 * 60 * 24));
        });
      const tempoMedioPreviousSegmento = temposFechamentoPreviousSegmento.length > 0
        ? temposFechamentoPreviousSegmento.reduce((sum, t) => sum + t, 0) / temposFechamentoPreviousSegmento.length
        : 0;
      
      segmentoStats[segmento] = {
        emCotacao: emCotacaoSegmento,
        fechados: fechadosSegmento,
        declinados: declinadosSegmento,
        premioTotal: currentFechamentosSegmento.reduce((sum, c) => sum + (c.valor_premio || 0), 0),
        tempoMedio: tempoMedioSegmento,
        taxaConversao: totalDistinctSegmento > 0 ? (fechadosSegmento / totalDistinctSegmento) * 100 : 0,
        previousEmCotacao: previousEmCotacaoSegmento,
        previousFechados: previousFechadosSegmento,
        previousPremio: previousFechamentosSegmento.reduce((sum, c) => sum + (c.valor_premio || 0), 0),
        previousTempoMedio: tempoMedioPreviousSegmento,
        previousTaxaConversao: previousTotalDistinctSegmento > 0 ? (previousFechadosSegmento / previousTotalDistinctSegmento) * 100 : 0,
      };
    });

    return {
      emCotacao,
      fechados,
      declinados,
      emCotacaoComp,
      fechadosComp,
      declinadosComp,
      ticketMedio,
      ticketMedioComp,
      tempoMedioFechamento,
      tempoMedioComp,
      premioTotal,
      premioTotalComp,
      taxaConversao,
      taxaConversaoComp,
      segmentoStats,
    };
  }, [allQuotes, filters]);

  // Distribuição por status com dados detalhados para modal
  const distribuicaoStatusDetalhada = useMemo(() => {
    const validStatuses = ["Em cotação", "Negócio fechado", "Declinado"];
    
    const statusCounts: Record<string, { 
      cotacoes: Cotacao[]; 
      count: number;
      premioTotal: number;
      transportador: number;
      embarcador: number;
      ramoBreakdown: Record<string, { count: number; premio: number }>;
      seguradoraBreakdown: Record<string, { count: number; premio: number }>;
    }> = {};
    
    validStatuses.forEach((status) => {
      let statusCotacoes: Cotacao[];
      let targetStatuses: string[];
      
      if (status === "Negócio fechado") {
        targetStatuses = ["Negócio fechado", "Fechamento congênere"];
        statusCotacoes = filteredCotacoes.filter(
          (cotacao) => cotacao.status === "Negócio fechado" || cotacao.status === "Fechamento congênere"
        );
      } else {
        targetStatuses = [status];
        statusCotacoes = filteredCotacoes.filter((cotacao) => cotacao.status === status);
      }
      
      const count = countDistinctByStatus(statusCotacoes, targetStatuses);
      const premioTotal = statusCotacoes.reduce((sum, c) => sum + (c.valor_premio || 0), 0);
      const transportador = statusCotacoes.filter(c => c.segmento === "Transportador").length;
      const embarcador = statusCotacoes.filter(c => c.segmento !== "Transportador").length;
      
      // Breakdown por ramo
      const ramoBreakdown: Record<string, { count: number; premio: number }> = {};
      statusCotacoes.forEach(c => {
        const ramo = c.ramo?.descricao || "Não informado";
        if (!ramoBreakdown[ramo]) ramoBreakdown[ramo] = { count: 0, premio: 0 };
        ramoBreakdown[ramo].count++;
        ramoBreakdown[ramo].premio += c.valor_premio || 0;
      });
      
      // Breakdown por seguradora
      const seguradoraBreakdown: Record<string, { count: number; premio: number }> = {};
      statusCotacoes.forEach(c => {
        const seg = c.seguradora?.nome || "Não informado";
        if (!seguradoraBreakdown[seg]) seguradoraBreakdown[seg] = { count: 0, premio: 0 };
        seguradoraBreakdown[seg].count++;
        seguradoraBreakdown[seg].premio += c.valor_premio || 0;
      });
      
      statusCounts[status] = { 
        cotacoes: statusCotacoes, 
        count,
        premioTotal,
        transportador,
        embarcador,
        ramoBreakdown,
        seguradoraBreakdown,
      };
    });
    
    const totalDistinct = Object.values(statusCounts).reduce((sum, item) => sum + item.count, 0);
    
    return validStatuses.map((status) => {
      const data = statusCounts[status];
      return {
        status,
        count: data.count,
        seguradosDistintos: new Set(data.cotacoes.map((c) => c.cpf_cnpj)).size,
        percentage: totalDistinct > 0 ? (data.count / totalDistinct) * 100 : 0,
        cotacoes: data.cotacoes,
        premioTotal: data.premioTotal,
        ticketMedio: data.count > 0 ? data.premioTotal / data.count : 0,
        transportador: data.transportador,
        embarcador: data.embarcador,
        ramoBreakdown: Object.entries(data.ramoBreakdown)
          .map(([ramo, stats]) => ({ ramo, ...stats }))
          .sort((a, b) => b.premio - a.premio),
        seguradoraBreakdown: Object.entries(data.seguradoraBreakdown)
          .map(([seguradora, stats]) => ({ seguradora, ...stats }))
          .sort((a, b) => b.premio - a.premio),
        tempoMedio: 0,
      };
    });
  }, [filteredCotacoes]);
  
  // Backward compat
  const distribuicaoStatus = distribuicaoStatusDetalhada;

  // State for modals
  const [showTopProdutoresModal, setShowTopProdutoresModal] = useState(false);
  const [showStatusDetailModal, setShowStatusDetailModal] = useState(false);
  const [showTendenciaDetailModal, setShowTendenciaDetailModal] = useState(false);
  const [showSeguradoraDetailModal, setShowSeguradoraDetailModal] = useState(false);
  const [selectedProdutor, setSelectedProdutor] = useState<{
    nome: string;
    totalDistinct: number;
    emCotacaoDistinct: number;
    fechadasDistinct: number;
    declinadasDistinct: number;
    premioTotal: number;
    premioRecorrente: number;
    premioEmAberto: number;
    premioEmAbertoRecorrente: number;
    ticketMedio: number;
    taxaConversao: number;
    cotacoesFechadas: Cotacao[];
    cotacoesEmAberto: Cotacao[];
    distinctFechadasList: { segurado: string; grupo: string; cotacoes: Cotacao[] }[];
    distinctEmAbertoList: { segurado: string; grupo: string; cotacoes: Cotacao[] }[];
  } | null>(null);
  const [selectedProdutorRanking, setSelectedProdutorRanking] = useState(0);

  // Import centralized classification from lib
  // Using centralized getRegraRamo from lib/ramoClassification.ts

  // Top produtores com métricas detalhadas consolidadas
  // Using DISTINCT counting by CNPJ + branch group
  const topProdutoresDetalhado = useMemo(() => {
    const produtorStats: Record<
      string,
      {
        nome: string;
        distinctKeysTotal: Set<string>;
        distinctKeysEmCotacao: Set<string>;
        distinctKeysFechadas: Set<string>;
        distinctKeysDeclinadas: Set<string>;
        premioTotal: number;
        premioRecorrente: number;
        premioEmAberto: number;
        premioEmAbertoRecorrente: number;
        cotacoesFechadas: Cotacao[];
        cotacoesEmAberto: Cotacao[];
        // Group cotações by segurado+grupo for distinct listing
        fechadasByKey: Record<string, { segurado: string; grupo: string; cotacoes: Cotacao[] }>;
        emAbertoByKey: Record<string, { segurado: string; grupo: string; cotacoes: Cotacao[] }>;
      }
    > = {};
    
    filteredCotacoes.forEach((cotacao) => {
      if (cotacao.produtor_cotador) {
        const nome = cotacao.produtor_cotador.nome;
        if (!produtorStats[nome]) {
          produtorStats[nome] = {
            nome,
            distinctKeysTotal: new Set(),
            distinctKeysEmCotacao: new Set(),
            distinctKeysFechadas: new Set(),
            distinctKeysDeclinadas: new Set(),
            premioTotal: 0,
            premioRecorrente: 0,
            premioEmAberto: 0,
            premioEmAbertoRecorrente: 0,
            cotacoesFechadas: [],
            cotacoesEmAberto: [],
            fechadasByKey: {},
            emAbertoByKey: {},
          };
        }
        
        // Create distinct key: CNPJ + branch group
        const branchGroup = getBranchGroup(cotacao.ramo?.descricao);
        const distinctKey = `${cotacao.cpf_cnpj}_${branchGroup}`;
        
        // Add to total distinct
        produtorStats[nome].distinctKeysTotal.add(distinctKey);
        
        if (cotacao.status === "Negócio fechado" || cotacao.status === "Fechamento congênere") {
          produtorStats[nome].distinctKeysFechadas.add(distinctKey);
          const premio = cotacao.valor_premio || 0;
        const regra = getRegraRamo(cotacao.ramo);
          produtorStats[nome].premioTotal += premio;
          if (regra === 'Recorrente') {
            produtorStats[nome].premioRecorrente += premio;
          }
          produtorStats[nome].cotacoesFechadas.push(cotacao);
          
          // Group by segurado+grupo for distinct listing
          if (!produtorStats[nome].fechadasByKey[distinctKey]) {
            produtorStats[nome].fechadasByKey[distinctKey] = {
              segurado: cotacao.segurado,
              grupo: branchGroup,
              cotacoes: [],
            };
          }
          produtorStats[nome].fechadasByKey[distinctKey].cotacoes.push(cotacao);
        } else if (cotacao.status === "Em cotação") {
          produtorStats[nome].distinctKeysEmCotacao.add(distinctKey);
          const premio = cotacao.valor_premio || 0;
          const regra = getRegraRamo(cotacao.ramo);
          produtorStats[nome].premioEmAberto += premio;
          if (regra === 'Recorrente') {
            produtorStats[nome].premioEmAbertoRecorrente += premio;
          }
          produtorStats[nome].cotacoesEmAberto.push(cotacao);
          
          // Group by segurado+grupo for distinct listing
          if (!produtorStats[nome].emAbertoByKey[distinctKey]) {
            produtorStats[nome].emAbertoByKey[distinctKey] = {
              segurado: cotacao.segurado,
              grupo: branchGroup,
              cotacoes: [],
            };
          }
          produtorStats[nome].emAbertoByKey[distinctKey].cotacoes.push(cotacao);
        } else if (cotacao.status === "Declinado") {
          produtorStats[nome].distinctKeysDeclinadas.add(distinctKey);
        }
      }
    });
    
    return Object.values(produtorStats)
      .map(p => {
        const totalDistinct = p.distinctKeysTotal.size;
        const fechadasDistinct = p.distinctKeysFechadas.size;
        const emCotacaoDistinct = p.distinctKeysEmCotacao.size;
        const declinadasDistinct = p.distinctKeysDeclinadas.size;
        
        // Convert grouped objects to sorted arrays (most recent first)
        const distinctFechadasList = Object.values(p.fechadasByKey).sort((a, b) => {
          const dateA = a.cotacoes.reduce((latest, c) => {
            const d = c.data_fechamento || c.created_at;
            return d > latest ? d : latest;
          }, '');
          const dateB = b.cotacoes.reduce((latest, c) => {
            const d = c.data_fechamento || c.created_at;
            return d > latest ? d : latest;
          }, '');
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
        
        const distinctEmAbertoList = Object.values(p.emAbertoByKey).sort((a, b) => {
          const dateA = a.cotacoes[0]?.data_cotacao || '';
          const dateB = b.cotacoes[0]?.data_cotacao || '';
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
        
        return {
          nome: p.nome,
          totalDistinct,
          emCotacaoDistinct,
          fechadasDistinct,
          declinadasDistinct,
          premioTotal: p.premioTotal,
          premioRecorrente: p.premioRecorrente,
          premioEmAberto: p.premioEmAberto,
          premioEmAbertoRecorrente: p.premioEmAbertoRecorrente,
          ticketMedio: fechadasDistinct > 0 ? p.premioTotal / fechadasDistinct : 0,
          taxaConversao: totalDistinct > 0 ? (fechadasDistinct / totalDistinct) * 100 : 0,
          cotacoesFechadas: p.cotacoesFechadas,
          cotacoesEmAberto: p.cotacoesEmAberto,
          distinctFechadasList,
          distinctEmAbertoList,
        };
      })
      .sort((a, b) => {
        // Sort by fechadas first, then prêmio recorrente, then total
        if (b.fechadasDistinct !== a.fechadasDistinct) return b.fechadasDistinct - a.fechadasDistinct;
        if (b.premioRecorrente !== a.premioRecorrente) return b.premioRecorrente - a.premioRecorrente;
        if (b.premioTotal !== a.premioTotal) return b.premioTotal - a.premioTotal;
        return b.totalDistinct - a.totalDistinct;
      });
  }, [filteredCotacoes]);

  // Clientes fechados para o tooltip - include "Fechamento congênere"
  const clientesFechados = useMemo(() => {
    return filteredCotacoes
      .filter((cotacao) => cotacao.status === "Negócio fechado" || cotacao.status === "Fechamento congênere")
      .sort(
        (a, b) =>
          new Date(b.data_fechamento || b.created_at).getTime() - new Date(a.data_fechamento || a.created_at).getTime(),
      )
      .slice(0, 10);
  }, [filteredCotacoes]);

  // Clientes em cotação para o tooltip
  const clientesEmCotacao = useMemo(() => {
    return filteredCotacoes
      .filter((cotacao) => cotacao.status === "Em cotação")
      .sort((a, b) => new Date(b.data_cotacao).getTime() - new Date(a.data_cotacao).getTime())
      .slice(0, 10);
  }, [filteredCotacoes]);

  // View mode state for recent quotes
  const [recentQuotesViewMode, setRecentQuotesViewMode] = useState<"list" | "cards">("list");

  // Recent quotes for display (last 10)
  const recentQuotes = useMemo(() => {
    return [...filteredCotacoes]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);
  }, [filteredCotacoes]);

  // Monthly trend data DETALHADA para modal
  const monthlyTrendDataDetalhada = useMemo(() => {
    const months = [];
    const now = new Date();

    const trendFilteredCotacoes = allQuotes.filter((cotacao) => {
      const produtorMatch = filters.produtorFilter === "todos" || cotacao.produtor_cotador?.nome === filters.produtorFilter;
      const seguradoraMatch = filters.seguradoraFilter === "todas" || cotacao.seguradora?.nome === filters.seguradoraFilter;
      const ramoMatch = filters.ramoFilter === "todos" || cotacao.ramo?.descricao === filters.ramoFilter;
      const segmentoMatch = filters.segmentoFilter === "todos" || cotacao.ramo?.segmento === filters.segmentoFilter;
      const regraMatch = filters.regraFilter === "todas" || cotacao.ramo?.regra === filters.regraFilter;
      return produtorMatch && seguradoraMatch && ramoMatch && segmentoMatch && regraMatch;
    });
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString("pt-BR", { month: "short" });
      const year = date.getFullYear();
      const monthCotacoes = trendFilteredCotacoes.filter((c) => {
        const cotacaoDate = new Date(c.data_cotacao);
        return cotacaoDate.getMonth() === date.getMonth() && cotacaoDate.getFullYear() === date.getFullYear();
      });
      
      const emCotacao = monthCotacoes.filter((c) => c.status === "Em cotação").length;
      const fechadas = monthCotacoes.filter((c) => c.status === "Negócio fechado" || c.status === "Fechamento congênere").length;
      const declinadas = monthCotacoes.filter((c) => c.status === "Declinado").length;
      const premioFechado = monthCotacoes
        .filter((c) => c.status === "Negócio fechado" || c.status === "Fechamento congênere")
        .reduce((sum, c) => sum + (c.valor_premio || 0), 0);
      const premioAberto = monthCotacoes
        .filter((c) => c.status === "Em cotação")
        .reduce((sum, c) => sum + (c.valor_premio || 0), 0);
      const transportador = monthCotacoes.filter(c => c.segmento === "Transportador").length;
      const embarcador = monthCotacoes.filter(c => c.segmento !== "Transportador").length;
      const taxaConversao = monthCotacoes.length > 0 ? (fechadas / monthCotacoes.length * 100) : 0;
      
      months.push({
        mes: `${monthName}/${year.toString().slice(-2)}`,
        total: monthCotacoes.length,
        emCotacao,
        fechadas,
        declinadas,
        premioFechado,
        premioAberto,
        transportador,
        embarcador,
        taxaConversao,
      });
    }
    return months;
  }, [allQuotes, filters]);
  
  // Backward compat
  const monthlyTrendData = monthlyTrendDataDetalhada;

  // Top seguradoras data DETALHADA - últimos 12 meses
  const seguradoraDataDetalhada = useMemo(() => {
    const seguradoraStats: Record<string, {
      nome: string;
      premio: number;
      count: number;
      distinctKeys: Set<string>;
      transportador: number;
      embarcador: number;
      ramoBreakdown: Record<string, { count: number; premio: number }>;
      clientesMap: Map<string, { segurado: string; cpf_cnpj: string; premio: number; ramos: Set<string> }>;
    }> = {};

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);

    const seguradoraFilteredCotacoes = allQuotes.filter((cotacao) => {
      const produtorMatch = filters.produtorFilter === "todos" || cotacao.produtor_cotador?.nome === filters.produtorFilter;
      const seguradoraMatch = filters.seguradoraFilter === "todas" || cotacao.seguradora?.nome === filters.seguradoraFilter;
      const ramoMatch = filters.ramoFilter === "todos" || cotacao.ramo?.descricao === filters.ramoFilter;
      const segmentoMatch = filters.segmentoFilter === "todos" || cotacao.ramo?.segmento === filters.segmentoFilter;
      const regraMatch = filters.regraFilter === "todas" || cotacao.ramo?.regra === filters.regraFilter;
      const dateMatch = new Date(cotacao.data_cotacao) >= twelveMonthsAgo;
      return produtorMatch && seguradoraMatch && ramoMatch && segmentoMatch && regraMatch && dateMatch;
    });
    
    seguradoraFilteredCotacoes.forEach((cotacao) => {
      if (cotacao.seguradora && (cotacao.status === "Negócio fechado" || cotacao.status === "Fechamento congênere") && cotacao.valor_premio > 0) {
        const nome = cotacao.seguradora.nome;
        if (!seguradoraStats[nome]) {
          seguradoraStats[nome] = {
            nome,
            premio: 0,
            count: 0,
            distinctKeys: new Set(),
            transportador: 0,
            embarcador: 0,
            ramoBreakdown: {},
            clientesMap: new Map(),
          };
        }
        
        const branchGroup = getBranchGroup(cotacao.ramo?.descricao);
        const distinctKey = `${cotacao.cpf_cnpj}_${branchGroup}`;
        seguradoraStats[nome].distinctKeys.add(distinctKey);
        
        seguradoraStats[nome].premio += Number(cotacao.valor_premio);
        seguradoraStats[nome].count++;
        
        if (cotacao.segmento === "Transportador") {
          seguradoraStats[nome].transportador++;
        } else {
          seguradoraStats[nome].embarcador++;
        }
        
        // Ramo breakdown
        const ramo = cotacao.ramo?.descricao || "Não informado";
        if (!seguradoraStats[nome].ramoBreakdown[ramo]) {
          seguradoraStats[nome].ramoBreakdown[ramo] = { count: 0, premio: 0 };
        }
        seguradoraStats[nome].ramoBreakdown[ramo].count++;
        seguradoraStats[nome].ramoBreakdown[ramo].premio += cotacao.valor_premio || 0;

        // Clientes agregados
        const clienteKey = cotacao.cpf_cnpj;
        if (seguradoraStats[nome].clientesMap.has(clienteKey)) {
          const existing = seguradoraStats[nome].clientesMap.get(clienteKey)!;
          existing.premio += cotacao.valor_premio || 0;
          if (cotacao.ramo?.descricao) existing.ramos.add(cotacao.ramo.descricao);
        } else {
          seguradoraStats[nome].clientesMap.set(clienteKey, {
            segurado: cotacao.segurado,
            cpf_cnpj: cotacao.cpf_cnpj,
            premio: cotacao.valor_premio || 0,
            ramos: new Set(cotacao.ramo?.descricao ? [cotacao.ramo.descricao] : []),
          });
        }
      }
    });
    
    const totalPremio = Object.values(seguradoraStats).reduce((sum, s) => sum + s.premio, 0);
    const totalCount = Object.values(seguradoraStats).reduce((sum, s) => sum + s.distinctKeys.size, 0);
    
    return Object.values(seguradoraStats)
      .map(s => ({
        nome: s.nome,
        premio: s.premio,
        count: s.count,
        distinctCount: s.distinctKeys.size,
        ticketMedio: s.distinctKeys.size > 0 ? s.premio / s.distinctKeys.size : 0,
        percentualPremio: totalPremio > 0 ? (s.premio / totalPremio * 100) : 0,
        percentualCount: totalCount > 0 ? (s.distinctKeys.size / totalCount * 100) : 0,
        transportador: s.transportador,
        embarcador: s.embarcador,
        topRamos: Object.entries(s.ramoBreakdown)
          .map(([ramo, stats]) => ({ ramo, ...stats }))
          .sort((a, b) => b.premio - a.premio)
          .slice(0, 3),
        clientes: Array.from(s.clientesMap.values())
          .map(c => ({ ...c, ramos: Array.from(c.ramos) }))
          .sort((a, b) => b.premio - a.premio),
      }))
      .sort((a, b) => b.premio - a.premio);
  }, [allQuotes, filters]);
  
  // Backward compat - top 5 only
  const seguradoraData = seguradoraDataDetalhada.slice(0, 5);

  // Pie chart data
  const pieChartData = useMemo(() => {
    return distribuicaoStatus.map((item) => ({
      name: item.status,
      value: item.count,
      color:
        item.status === "Em cotação"
          ? "hsl(var(--brand-orange))"
          : item.status === "Negócio fechado"
            ? "hsl(var(--success-alt))"
            : "hsl(var(--destructive))",
    }));
  }, [distribuicaoStatus]);

  // Top produtores
  const topProdutores = useMemo(() => {
    const produtorStats: Record<
      string,
      {
        nome: string;
        total: number;
        fechadas: number;
      }
    > = {};
    filteredCotacoes.forEach((cotacao) => {
      if (cotacao.produtor_cotador) {
        const nome = cotacao.produtor_cotador.nome;
        if (!produtorStats[nome]) {
          produtorStats[nome] = {
            nome,
            total: 0,
            fechadas: 0,
          };
        }
        produtorStats[nome].total++;
        if (cotacao.status === "Negócio fechado" || cotacao.status === "Fechamento congênere") {
          produtorStats[nome].fechadas++;
        }
      }
    });
    return Object.values(produtorStats).sort((a, b) => b.fechadas - a.fechadas);
  }, [filteredCotacoes]);

  // Análise por tipo de cliente (Transportador/Embarcador) - cotações em aberto
  const cotacoesPorTipoCliente = useMemo(() => {
    const tipoStats: Record<string, { 
      transportador: Set<string>; 
      embarcador: Set<string>;
      transportadorCotacoes: Cotacao[];
      embarcadorCotacoes: Cotacao[];
      premioTransportador: number;
      premioEmbarcador: number;
    }> = {
      "Em Aberto": { 
        transportador: new Set(), 
        embarcador: new Set(),
        transportadorCotacoes: [],
        embarcadorCotacoes: [],
        premioTransportador: 0,
        premioEmbarcador: 0,
      }
    };
    
    filteredCotacoes
      .filter((c) => c.status === "Em cotação" || c.status === "Em análise")
      .forEach((cotacao) => {
        const segmento = cotacao.segmento || "Não informado";
        const branchGroup = getBranchGroup(cotacao.ramo?.descricao);
        const key = `${cotacao.cpf_cnpj}_${branchGroup}`;
        
        if (segmento === "Transportador") {
          tipoStats["Em Aberto"].transportador.add(key);
          tipoStats["Em Aberto"].transportadorCotacoes.push(cotacao);
          tipoStats["Em Aberto"].premioTransportador += Number(cotacao.valor_premio) || 0;
        } else {
          tipoStats["Em Aberto"].embarcador.add(key);
          tipoStats["Em Aberto"].embarcadorCotacoes.push(cotacao);
          tipoStats["Em Aberto"].premioEmbarcador += Number(cotacao.valor_premio) || 0;
        }
      });
    
    return {
      transportador: tipoStats["Em Aberto"].transportador.size,
      embarcador: tipoStats["Em Aberto"].embarcador.size,
      total: tipoStats["Em Aberto"].transportador.size + tipoStats["Em Aberto"].embarcador.size,
      transportadorCotacoes: tipoStats["Em Aberto"].transportadorCotacoes,
      embarcadorCotacoes: tipoStats["Em Aberto"].embarcadorCotacoes,
      premioTransportador: tipoStats["Em Aberto"].premioTransportador,
      premioEmbarcador: tipoStats["Em Aberto"].premioEmbarcador,
    };
  }, [filteredCotacoes]);

  // Análise por tipo de cliente - fechamentos
  const fechamentosPorTipoCliente = useMemo(() => {
    const tipoStats = {
      transportador: new Set<string>(),
      embarcador: new Set<string>(),
      transportadorCotacoes: [] as Cotacao[],
      embarcadorCotacoes: [] as Cotacao[],
      premioTransportador: 0,
      premioEmbarcador: 0,
    };
    
    filteredCotacoes
      .filter((c) => c.status === "Negócio fechado" || c.status === "Fechamento congênere")
      .forEach((cotacao) => {
        const segmento = cotacao.segmento || "Não informado";
        const branchGroup = getBranchGroup(cotacao.ramo?.descricao);
        const key = `${cotacao.cpf_cnpj}_${branchGroup}`;
        
        if (segmento === "Transportador") {
          tipoStats.transportador.add(key);
          tipoStats.transportadorCotacoes.push(cotacao);
          tipoStats.premioTransportador += Number(cotacao.valor_premio) || 0;
        } else {
          tipoStats.embarcador.add(key);
          tipoStats.embarcadorCotacoes.push(cotacao);
          tipoStats.premioEmbarcador += Number(cotacao.valor_premio) || 0;
        }
      });
    
    return {
      transportador: tipoStats.transportador.size,
      embarcador: tipoStats.embarcador.size,
      total: tipoStats.transportador.size + tipoStats.embarcador.size,
      transportadorCotacoes: tipoStats.transportadorCotacoes,
      embarcadorCotacoes: tipoStats.embarcadorCotacoes,
      premioTransportador: tipoStats.premioTransportador,
      premioEmbarcador: tipoStats.premioEmbarcador,
    };
  }, [filteredCotacoes]);

  // Análise por tipo de cliente - declinados
  const declinadosPorTipoCliente = useMemo(() => {
    const tipoStats = {
      transportador: new Set<string>(),
      embarcador: new Set<string>(),
      transportadorCotacoes: [] as Cotacao[],
      embarcadorCotacoes: [] as Cotacao[],
      premioTransportador: 0,
      premioEmbarcador: 0,
    };
    
    filteredCotacoes
      .filter((c) => c.status === "Declinado")
      .forEach((cotacao) => {
        const segmento = cotacao.segmento || "Não informado";
        const branchGroup = getBranchGroup(cotacao.ramo?.descricao);
        const key = `${cotacao.cpf_cnpj}_${branchGroup}`;
        
        if (segmento === "Transportador") {
          tipoStats.transportador.add(key);
          tipoStats.transportadorCotacoes.push(cotacao);
          tipoStats.premioTransportador += Number(cotacao.valor_premio) || 0;
        } else {
          tipoStats.embarcador.add(key);
          tipoStats.embarcadorCotacoes.push(cotacao);
          tipoStats.premioEmbarcador += Number(cotacao.valor_premio) || 0;
        }
      });
    
    return {
      transportador: tipoStats.transportador.size,
      embarcador: tipoStats.embarcador.size,
      total: tipoStats.transportador.size + tipoStats.embarcador.size,
      transportadorCotacoes: tipoStats.transportadorCotacoes,
      embarcadorCotacoes: tipoStats.embarcadorCotacoes,
      premioTransportador: tipoStats.premioTransportador,
      premioEmbarcador: tipoStats.premioEmbarcador,
    };
  }, [filteredCotacoes]);

  // Dados combinados para o gráfico empilhado
  const segmentoStackedData = useMemo(() => {
    return [
      {
        name: "Em Aberto",
        transportador: cotacoesPorTipoCliente.transportador,
        embarcador: cotacoesPorTipoCliente.embarcador,
        total: cotacoesPorTipoCliente.total,
        premioTransportador: cotacoesPorTipoCliente.premioTransportador,
        premioEmbarcador: cotacoesPorTipoCliente.premioEmbarcador,
      },
      {
        name: "Fechados",
        transportador: fechamentosPorTipoCliente.transportador,
        embarcador: fechamentosPorTipoCliente.embarcador,
        total: fechamentosPorTipoCliente.total,
        premioTransportador: fechamentosPorTipoCliente.premioTransportador,
        premioEmbarcador: fechamentosPorTipoCliente.premioEmbarcador,
      },
      {
        name: "Declinados",
        transportador: declinadosPorTipoCliente.transportador,
        embarcador: declinadosPorTipoCliente.embarcador,
        total: declinadosPorTipoCliente.total,
        premioTransportador: declinadosPorTipoCliente.premioTransportador,
        premioEmbarcador: declinadosPorTipoCliente.premioEmbarcador,
      }
    ];
  }, [cotacoesPorTipoCliente, fechamentosPorTipoCliente, declinadosPorTipoCliente]);
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  const formatDate = (dateString: string) => {
    // Parse the date from the database (which is stored as timestamptz in UTC)
    const date = new Date(dateString);
    // Extract the UTC date components to avoid timezone conversion
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Negócio fechado":
        return "success-alt";
      case "Em cotação":
        return "brand-orange";
      case "Declinado":
        return "destructive";
      case "Fechamento congênere":
        return "secondary";
      default:
        return "secondary";
    }
  };
  const formatComparison = (diff: number, percentage: number) => {
    const sign = diff > 0 ? "+" : "";
    const icon = diff > 0 ? <TrendingUp className="h-3 w-3" /> : diff < 0 ? <TrendingDown className="h-3 w-3" /> : null;
    const color = diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "text-muted-foreground";
    return (
      <span className={`text-xs flex items-center gap-1 ${color}`}>
        {icon}
        {sign}
        {diff} ({sign}
        {percentage.toFixed(1)}%)
      </span>
    );
  };
  return (
    <>
      <WeeklyReminderModal
        open={showReminder}
        onClose={() => setShowReminder(false)}
        userId={user?.user_id || ""}
      />
      
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <BarChartIcon className="h-7 w-7 md:h-8 md:w-8" />
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">Análise completa e KPIs de cotações</p>
        </div>

        <div className="flex flex-wrap gap-2 md:gap-3 w-full sm:w-auto items-center">
          {/* Dashboard Edit Toolbar - Admin Only */}
          <DashboardEditToolbar
            editMode={dashboardLayout.editMode}
            setEditMode={dashboardLayout.setEditMode}
            cards={dashboardLayout.cards}
            toggleCardVisibility={dashboardLayout.toggleCardVisibility}
            resetLayout={dashboardLayout.resetLayout}
            canEdit={dashboardLayout.canEdit}
          />
          
          <Button variant="outline" onClick={handleImportCSV} size="sm" className="gap-2 flex-1 sm:flex-none">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Importar CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
          <Button onClick={handleNewCotacao} size="sm" className="gap-2 flex-1 sm:flex-none">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova Cotação</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <DashboardFilters
        filters={filters}
        onFiltersChange={setFilters}
        produtores={produtores}
        seguradoras={seguradoras}
        ramos={ramos}
      />

      {/* KPIs Mensais com Comparativos */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
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
                    {clientesEmCotacao.length > 0 ? (
                      <div className="space-y-1">
                        {clientesEmCotacao.map((cotacao) => (
                          <div key={cotacao.id} className="text-xs border-b pb-1 last:border-b-0">
                            <div className="font-medium">{cotacao.segurado}</div>
                            <div className="text-muted-foreground">
                              Data Cotação: {formatDate(cotacao.data_cotacao)}
                            </div>
                            <div className="text-muted-foreground">Prêmio: {formatCurrency(cotacao.valor_premio)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Nenhum cliente em cotação no período</p>
                    )}
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
                    {clientesFechados.length > 0 ? (
                      <div className="space-y-1">
                        {clientesFechados.map((cotacao, index) => (
                          <div key={cotacao.id} className="text-xs border-b pb-1 last:border-b-0">
                            <div className="font-medium">{cotacao.segurado}</div>
                            <div className="text-muted-foreground">
                              Fechamento: {cotacao.data_fechamento ? formatDate(cotacao.data_fechamento) : "N/A"}
                            </div>
                            <div className="text-muted-foreground">Prêmio: {formatCurrency(cotacao.valor_premio)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Nenhum cliente fechado no período</p>
                    )}
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
            {formatComparison(monthlyStats.ticketMedioComp.diff, monthlyStats.ticketMedioComp.percentage)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(monthlyStats.tempoMedioFechamento)} dias</div>
            {monthlyStats.tempoMedioComp.diff !== 0 ? (
              <span className={`text-xs flex items-center gap-1 ${monthlyStats.tempoMedioComp.diff < 0 ? "text-success" : monthlyStats.tempoMedioComp.diff > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {monthlyStats.tempoMedioComp.diff < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                {monthlyStats.tempoMedioComp.diff > 0 ? "+" : ""}{Math.round(monthlyStats.tempoMedioComp.diff)} dias ({monthlyStats.tempoMedioComp.percentage > 0 ? "+" : ""}{monthlyStats.tempoMedioComp.percentage.toFixed(1)}%)
              </span>
            ) : (
              <p className="text-xs text-muted-foreground">Fechamento</p>
            )}
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prêmio Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(monthlyStats.premioTotal)}</div>
            {formatComparison(monthlyStats.premioTotalComp.diff, monthlyStats.premioTotalComp.percentage)}
          </CardContent>
        </Card>
      </div>

      {/* KPIs por Segmento */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
        {['Transportes', 'Avulso', 'Ambiental', 'RC-V'].map((segmento) => {
          const stats = monthlyStats.segmentoStats[segmento];
          const premioComp = stats.previousPremio > 0 
            ? ((stats.premioTotal - stats.previousPremio) / stats.previousPremio) * 100 
            : 0;
          const fechadosComp = stats.previousFechados > 0 
            ? stats.fechados - stats.previousFechados 
            : 0;
          const tempoMedioComp = stats.previousTempoMedio > 0 
            ? stats.tempoMedio - stats.previousTempoMedio 
            : 0;
          const taxaComp = stats.previousTaxaConversao > 0 
            ? stats.taxaConversao - stats.previousTaxaConversao 
            : 0;
          
          const segmentoColors: Record<string, string> = {
            'Transportes': 'bg-blue-500/10 border-blue-500/30',
            'Avulso': 'bg-amber-500/10 border-amber-500/30',
            'Ambiental': 'bg-emerald-500/10 border-emerald-500/30',
            'RC-V': 'bg-purple-500/10 border-purple-500/30',
          };
          
          const segmentoTextColors: Record<string, string> = {
            'Transportes': 'text-blue-500',
            'Avulso': 'text-amber-500',
            'Ambiental': 'text-emerald-500',
            'RC-V': 'text-purple-500',
          };
          
          return (
            <Card key={segmento} className={`border ${segmentoColors[segmento]}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
                <CardTitle className={`text-xs font-semibold ${segmentoTextColors[segmento]}`}>
                  {segmento}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 px-3 pb-2">
                {/* Linha 1: Aberto - Fechado - Declinado | Tempo Médio - Conversão */}
                <div className="flex items-center justify-around">
                  <div className="text-center flex-1">
                    <div className="text-base font-bold text-brand-orange">{stats.emCotacao}</div>
                    <div className="text-[9px] text-muted-foreground">Aberto</div>
                  </div>
                  <div className="text-center flex-1">
                    <div className="text-base font-bold text-success">{stats.fechados}</div>
                    <div className="text-[9px] text-muted-foreground">Fechado</div>
                    {fechadosComp !== 0 && (
                      <div className={`text-[9px] flex items-center justify-center gap-0.5 ${fechadosComp > 0 ? 'text-success' : 'text-destructive'}`}>
                        {fechadosComp > 0 ? '+' : ''}{fechadosComp}
                      </div>
                    )}
                  </div>
                  <div className="text-center flex-1">
                    <div className="text-base font-bold text-destructive">{stats.declinados}</div>
                    <div className="text-[9px] text-muted-foreground">Decl.</div>
                  </div>
                  
                  <div className="text-muted-foreground/50 text-lg font-light mx-1">|</div>
                  
                  <div className="text-center flex-1">
                    <div className="text-sm font-bold">{Math.round(stats.tempoMedio)}d</div>
                    <div className="text-[9px] text-muted-foreground">T. Médio</div>
                    {tempoMedioComp !== 0 && (
                      <div className={`text-[9px] flex items-center justify-center gap-0.5 ${tempoMedioComp < 0 ? 'text-success' : 'text-destructive'}`}>
                        {tempoMedioComp > 0 ? '+' : ''}{Math.round(tempoMedioComp)}d
                      </div>
                    )}
                  </div>
                  <div className="text-center flex-1">
                    <div className="text-sm font-bold text-success-alt">{stats.taxaConversao.toFixed(1)}%</div>
                    <div className="text-[9px] text-muted-foreground">Conv.</div>
                    {taxaComp !== 0 && (
                      <div className={`text-[9px] flex items-center justify-center gap-0.5 ${taxaComp > 0 ? 'text-success' : 'text-destructive'}`}>
                        {taxaComp > 0 ? '+' : ''}{taxaComp.toFixed(1)}pp
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Linha 2: Prêmio Total */}
                <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
                  <div className="text-xs font-semibold">{formatCurrency(stats.premioTotal)}</div>
                  {premioComp !== 0 && (
                    <div className={`text-[9px] flex items-center gap-0.5 ${premioComp > 0 ? 'text-success' : 'text-destructive'}`}>
                      {premioComp > 0 ? <TrendingUp className="h-2 w-2" /> : <TrendingDown className="h-2 w-2" />}
                      {premioComp > 0 ? '+' : ''}{premioComp.toFixed(1)}%
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Distribuição por Status e Top Produtores */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
        {/* Distribuição por Status */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4" />
                Distribuição por Status
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowStatusDetailModal(true)} className="text-xs gap-1">
                Análise <Eye className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {distribuicaoStatus.map(({ status, count, premioTotal, percentage }) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={getStatusBadgeVariant(status)}>{status}</Badge>
                    <span className="text-lg font-bold">{count}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{formatCurrency(premioTotal)}</span>
                    <div className="w-20 bg-secondary rounded-full h-2">
                      <div className="bg-primary rounded-full h-2" style={{ width: `${percentage}%` }} />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{percentage.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Produtores - Formato Tabela Minimalista */}
        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" />
                  Top Produtores
                </CardTitle>
                <p className="text-xs text-muted-foreground">Clientes distintos por período</p>
              </div>
              {topProdutoresDetalhado.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTopProdutoresModal(true)}
                  className="text-xs gap-1"
                >
                  Ver todos
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {topProdutoresDetalhado.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left py-2 font-medium">#</th>
                      <th className="text-left py-2 font-medium">Produtor</th>
                      <th className="text-center py-2 font-medium text-success">Fech.</th>
                      <th className="text-center py-2 font-medium text-brand-orange">Aberto</th>
                      <th className="text-center py-2 font-medium text-destructive">Decl.</th>
                      <th className="text-right py-2 font-medium">Recorrente</th>
                      <th className="text-right py-2 font-medium">Total</th>
                      <th className="text-center py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProdutoresDetalhado.slice(0, 3).map((produtor, index) => (
                      <tr key={produtor.nome} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2">
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                            index === 0 ? 'bg-amber-500 text-amber-950' : 
                            index === 1 ? 'bg-slate-400 text-slate-950' : 
                            index === 2 ? 'bg-amber-700 text-amber-100' : 
                            'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-2">
                          <div className="font-medium truncate max-w-[100px]">{produtor.nome}</div>
                        </td>
                        <td className="py-2 text-center">
                          <span className="font-semibold text-success">{produtor.fechadasDistinct}</span>
                        </td>
                        <td className="py-2 text-center">
                          <span className="font-semibold text-brand-orange">{produtor.emCotacaoDistinct}</span>
                        </td>
                        <td className="py-2 text-center">
                          <span className="font-semibold text-destructive">{produtor.declinadasDistinct}</span>
                        </td>
                        <td className="py-2 text-right">
                          <span className="font-semibold text-primary text-xs">{formatCurrency(produtor.premioRecorrente)}</span>
                        </td>
                        <td className="py-2 text-right">
                          <span className="font-medium text-muted-foreground text-xs">{formatCurrency(produtor.premioTotal)}</span>
                        </td>
                        <td className="py-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setSelectedProdutor(produtor);
                              setSelectedProdutorRanking(index + 1);
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {topProdutoresDetalhado.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    +{topProdutoresDetalhado.length - 3} produtores
                  </p>
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4 text-sm">
                Nenhum produtor encontrado no período
              </p>
            )}
          </CardContent>
        </Card>

        {/* Modal de Top Produtores Detalhado */}
        <TopProdutoresModal
          open={showTopProdutoresModal}
          onClose={() => setShowTopProdutoresModal(false)}
          produtores={topProdutoresDetalhado}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />

        {/* Modal Individual de Produtor */}
        <ProdutorDetailModal
          open={!!selectedProdutor}
          onClose={() => setSelectedProdutor(null)}
          produtor={selectedProdutor}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          ranking={selectedProdutorRanking}
        />
      </div>

      {/* Gráficos e Análises Avançadas */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
        {/* Tendência Mensal */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <LineChartIcon className="h-4 w-4" />
                Tendência de Cotações (6 Meses)
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowTendenciaDetailModal(true)} className="text-xs gap-1">
                Análise <Eye className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value, name) => [
                    value,
                    name === "fechadas" ? "Fechadas" : name === "emCotacao" ? "Em Cotação" : "Total",
                  ]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="emCotacao" stroke="hsl(var(--brand-orange))" strokeWidth={2} />
                <Line type="monotone" dataKey="fechadas" stroke="hsl(var(--success-alt))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Seguradoras */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4" />
                  Top 5 Seguradoras
                </CardTitle>
                <p className="text-xs text-muted-foreground">Últimos 12 meses</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowSeguradoraDetailModal(true)} className="text-xs gap-1">
                Ver todas <Eye className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {seguradoraData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left py-2 font-medium">#</th>
                      <th className="text-left py-2 font-medium">Seguradora</th>
                      <th className="text-right py-2 font-medium">Fech.</th>
                      <th className="text-right py-2 font-medium">Prêmio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seguradoraData.map((seg, index) => (
                      <tr key={seg.nome} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2">
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                            index === 0 ? 'bg-amber-500 text-amber-950' : 
                            index === 1 ? 'bg-slate-400 text-slate-950' : 
                            index === 2 ? 'bg-amber-700 text-amber-100' : 
                            'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-2">
                          <span className="font-medium truncate max-w-[120px]">{seg.nome}</span>
                        </td>
                        <td className="py-2 text-right">
                          <span className="text-muted-foreground">{seg.distinctCount} fech.</span>
                        </td>
                        <td className="py-2 text-right">
                          <span className="font-semibold text-primary">{formatCurrency(seg.premio)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Análises por Tipo de Cliente - Barras Empilhadas */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Cotações em Aberto por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cotações em Aberto</CardTitle>
            <p className="text-xs text-muted-foreground">Transportador x Embarcador (distintos)</p>
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <div className="space-y-4">
                {/* Barra empilhada */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Total</span>
                    <span className="font-bold text-brand-orange">{cotacoesPorTipoCliente.total}</span>
                  </div>
                  {cotacoesPorTipoCliente.total > 0 ? (
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <div className="w-full bg-secondary rounded-full h-10 flex items-center overflow-hidden cursor-help">
                          {cotacoesPorTipoCliente.transportador > 0 && (
                            <div
                              className="bg-brand-orange h-10 flex items-center justify-center text-xs font-medium text-white"
                              style={{
                                width: `${(cotacoesPorTipoCliente.transportador / cotacoesPorTipoCliente.total) * 100}%`,
                              }}
                            >
                              {cotacoesPorTipoCliente.transportador}
                            </div>
                          )}
                          {cotacoesPorTipoCliente.embarcador > 0 && (
                            <div
                              className="bg-chart-2 h-10 flex items-center justify-center text-xs font-medium text-white"
                              style={{
                                width: `${(cotacoesPorTipoCliente.embarcador / cotacoesPorTipoCliente.total) * 100}%`,
                              }}
                            >
                              {cotacoesPorTipoCliente.embarcador}
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-sm">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between gap-4">
                            <span className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded bg-brand-orange"></div>
                              Transportador
                            </span>
                            <span className="font-bold">{cotacoesPorTipoCliente.transportador} ({formatCurrency(cotacoesPorTipoCliente.premioTransportador)})</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded bg-chart-2"></div>
                              Embarcador
                            </span>
                            <span className="font-bold">{cotacoesPorTipoCliente.embarcador} ({formatCurrency(cotacoesPorTipoCliente.premioEmbarcador)})</span>
                          </div>
                        </div>
                      </TooltipContent>
                    </UITooltip>
                  ) : (
                    <div className="w-full bg-secondary rounded-full h-10 flex items-center justify-center text-xs text-muted-foreground">
                      Nenhuma cotação
                    </div>
                  )}
                </div>
                
                {/* Legenda e insights */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div className="text-center p-2 rounded-lg bg-brand-orange/10">
                    <div className="text-lg font-bold text-brand-orange">{cotacoesPorTipoCliente.transportador}</div>
                    <div className="text-xs text-muted-foreground">Transportador</div>
                    <div className="text-xs font-medium mt-1">{formatCurrency(cotacoesPorTipoCliente.premioTransportador)}</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-chart-2/10">
                    <div className="text-lg font-bold text-chart-2">{cotacoesPorTipoCliente.embarcador}</div>
                    <div className="text-xs text-muted-foreground">Embarcador</div>
                    <div className="text-xs font-medium mt-1">{formatCurrency(cotacoesPorTipoCliente.premioEmbarcador)}</div>
                  </div>
                </div>
                
                {/* Insight */}
                {cotacoesPorTipoCliente.total > 0 && (
                  <div className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
                    {cotacoesPorTipoCliente.transportador > cotacoesPorTipoCliente.embarcador
                      ? `Foco em Transportadores: ${((cotacoesPorTipoCliente.transportador / cotacoesPorTipoCliente.total) * 100).toFixed(0)}% do pipeline`
                      : cotacoesPorTipoCliente.embarcador > cotacoesPorTipoCliente.transportador
                      ? `Foco em Embarcadores: ${((cotacoesPorTipoCliente.embarcador / cotacoesPorTipoCliente.total) * 100).toFixed(0)}% do pipeline`
                      : "Pipeline equilibrado entre segmentos"}
                  </div>
                )}
              </div>
            </TooltipProvider>
          </CardContent>
        </Card>

        {/* Fechamentos por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fechamentos por Segmento</CardTitle>
            <p className="text-xs text-muted-foreground">Transportador x Embarcador (distintos)</p>
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <div className="space-y-4">
                {/* Barra empilhada */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Total</span>
                    <span className="font-bold text-success-alt">{fechamentosPorTipoCliente.total}</span>
                  </div>
                  {fechamentosPorTipoCliente.total > 0 ? (
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <div className="w-full bg-secondary rounded-full h-10 flex items-center overflow-hidden cursor-help">
                          {fechamentosPorTipoCliente.transportador > 0 && (
                            <div
                              className="bg-success-alt h-10 flex items-center justify-center text-xs font-medium text-white"
                              style={{
                                width: `${(fechamentosPorTipoCliente.transportador / fechamentosPorTipoCliente.total) * 100}%`,
                              }}
                            >
                              {fechamentosPorTipoCliente.transportador}
                            </div>
                          )}
                          {fechamentosPorTipoCliente.embarcador > 0 && (
                            <div
                              className="bg-chart-4 h-10 flex items-center justify-center text-xs font-medium text-white"
                              style={{
                                width: `${(fechamentosPorTipoCliente.embarcador / fechamentosPorTipoCliente.total) * 100}%`,
                              }}
                            >
                              {fechamentosPorTipoCliente.embarcador}
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-sm">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between gap-4">
                            <span className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded bg-success-alt"></div>
                              Transportador
                            </span>
                            <span className="font-bold">{fechamentosPorTipoCliente.transportador} ({formatCurrency(fechamentosPorTipoCliente.premioTransportador)})</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded bg-chart-4"></div>
                              Embarcador
                            </span>
                            <span className="font-bold">{fechamentosPorTipoCliente.embarcador} ({formatCurrency(fechamentosPorTipoCliente.premioEmbarcador)})</span>
                          </div>
                        </div>
                      </TooltipContent>
                    </UITooltip>
                  ) : (
                    <div className="w-full bg-secondary rounded-full h-10 flex items-center justify-center text-xs text-muted-foreground">
                      Nenhum fechamento
                    </div>
                  )}
                </div>
                
                {/* Legenda e insights */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div className="text-center p-2 rounded-lg bg-success-alt/10">
                    <div className="text-lg font-bold text-success-alt">{fechamentosPorTipoCliente.transportador}</div>
                    <div className="text-xs text-muted-foreground">Transportador</div>
                    <div className="text-xs font-medium mt-1">{formatCurrency(fechamentosPorTipoCliente.premioTransportador)}</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-chart-4/10">
                    <div className="text-lg font-bold text-chart-4">{fechamentosPorTipoCliente.embarcador}</div>
                    <div className="text-xs text-muted-foreground">Embarcador</div>
                    <div className="text-xs font-medium mt-1">{formatCurrency(fechamentosPorTipoCliente.premioEmbarcador)}</div>
                  </div>
                </div>
                
                {/* Ticket médio */}
                {fechamentosPorTipoCliente.total > 0 && (
                  <div className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded space-y-1">
                    <div className="flex justify-between">
                      <span>Ticket médio Transp.:</span>
                      <span className="font-medium">{fechamentosPorTipoCliente.transportador > 0 ? formatCurrency(fechamentosPorTipoCliente.premioTransportador / fechamentosPorTipoCliente.transportador) : '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ticket médio Embarc.:</span>
                      <span className="font-medium">{fechamentosPorTipoCliente.embarcador > 0 ? formatCurrency(fechamentosPorTipoCliente.premioEmbarcador / fechamentosPorTipoCliente.embarcador) : '-'}</span>
                    </div>
                  </div>
                )}
              </div>
            </TooltipProvider>
          </CardContent>
        </Card>

        {/* Declinados por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Declinados por Segmento</CardTitle>
            <p className="text-xs text-muted-foreground">Transportador x Embarcador (distintos)</p>
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <div className="space-y-4">
                {/* Barra empilhada */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Total</span>
                    <span className="font-bold text-destructive">{declinadosPorTipoCliente.total}</span>
                  </div>
                  {declinadosPorTipoCliente.total > 0 ? (
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <div className="w-full bg-secondary rounded-full h-10 flex items-center overflow-hidden cursor-help">
                          {declinadosPorTipoCliente.transportador > 0 && (
                            <div
                              className="bg-destructive h-10 flex items-center justify-center text-xs font-medium text-white"
                              style={{
                                width: `${(declinadosPorTipoCliente.transportador / declinadosPorTipoCliente.total) * 100}%`,
                              }}
                            >
                              {declinadosPorTipoCliente.transportador}
                            </div>
                          )}
                          {declinadosPorTipoCliente.embarcador > 0 && (
                            <div
                              className="bg-chart-5 h-10 flex items-center justify-center text-xs font-medium text-white"
                              style={{
                                width: `${(declinadosPorTipoCliente.embarcador / declinadosPorTipoCliente.total) * 100}%`,
                              }}
                            >
                              {declinadosPorTipoCliente.embarcador}
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-sm">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between gap-4">
                            <span className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded bg-destructive"></div>
                              Transportador
                            </span>
                            <span className="font-bold">{declinadosPorTipoCliente.transportador} ({formatCurrency(declinadosPorTipoCliente.premioTransportador)})</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded bg-chart-5"></div>
                              Embarcador
                            </span>
                            <span className="font-bold">{declinadosPorTipoCliente.embarcador} ({formatCurrency(declinadosPorTipoCliente.premioEmbarcador)})</span>
                          </div>
                        </div>
                      </TooltipContent>
                    </UITooltip>
                  ) : (
                    <div className="w-full bg-secondary rounded-full h-10 flex items-center justify-center text-xs text-muted-foreground">
                      Nenhum declinado
                    </div>
                  )}
                </div>
                
                {/* Legenda e insights */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div className="text-center p-2 rounded-lg bg-destructive/10">
                    <div className="text-lg font-bold text-destructive">{declinadosPorTipoCliente.transportador}</div>
                    <div className="text-xs text-muted-foreground">Transportador</div>
                    <div className="text-xs font-medium mt-1">{formatCurrency(declinadosPorTipoCliente.premioTransportador)}</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-chart-5/10">
                    <div className="text-lg font-bold text-chart-5">{declinadosPorTipoCliente.embarcador}</div>
                    <div className="text-xs text-muted-foreground">Embarcador</div>
                    <div className="text-xs font-medium mt-1">{formatCurrency(declinadosPorTipoCliente.premioEmbarcador)}</div>
                  </div>
                </div>
                
                {/* Taxa de declínio */}
                {(cotacoesPorTipoCliente.total + fechamentosPorTipoCliente.total + declinadosPorTipoCliente.total) > 0 && (
                  <div className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
                    Taxa de declínio: {(
                      (declinadosPorTipoCliente.total / 
                      (cotacoesPorTipoCliente.total + fechamentosPorTipoCliente.total + declinadosPorTipoCliente.total)) * 100
                    ).toFixed(1)}% do total de cotações
                  </div>
                )}
              </div>
            </TooltipProvider>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Metas */}
      <MetasRealizadoChart
        dateFilter={filters.dateFilter}
        dateRange={filters.dateRange}
        produtorFilter={filters.produtorFilter}
        produtores={produtores}
        fechamentosCount={monthlyStats.fechados}
      />

      {/* Batimento de Metas de Prêmio */}
      <MetasPremioComparison
        dateFilter={filters.dateFilter}
        dateRange={filters.dateRange}
        produtorFilter={filters.produtorFilter}
        produtores={produtores}
      />

      {/* Cotações em Aberto - Sempre exibe TODAS as cotações "Em cotação", sem filtro de data */}
      <CotacoesEmAbertoChart cotacoes={allQuotes} produtorFilter={filters.produtorFilter} />

      {/* Insights Adicionais */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Gráfico de Pizza - Status */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {pieChartData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: item.color,
                    }}
                  ></div>
                  <span className="text-sm">
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Análise de Produtividade - Top Produtores com Fechadas destacadas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Produtores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProdutoresDetalhado.slice(0, 5).map((produtor, index) => {
                const premioFormatado = formatCurrency(produtor.premioTotal);
                return (
                  <div key={produtor.nome} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-amber-500 text-amber-950' : 
                        index === 1 ? 'bg-slate-400 text-slate-950' : 
                        index === 2 ? 'bg-amber-700 text-amber-100' : 
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium truncate max-w-[100px]">{produtor.nome}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-success">{produtor.fechadasDistinct}</div>
                        <div className="text-[10px] text-muted-foreground">fechadas</div>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <div className="text-xs font-semibold text-primary">{premioFormatado}</div>
                        <div className="text-[10px] text-muted-foreground">{produtor.taxaConversao.toFixed(0)}% conv.</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Performance por Unidade - Com dados detalhados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Performance por Unidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(() => {
                // Calcular dados por unidade com distintos
                const unidadeStats: Record<string, { 
                  nome: string; 
                  total: number; 
                  fechadas: number; 
                  premio: number;
                  distinctKeys: Set<string>;
                  distinctFechadas: Set<string>;
                }> = {};
                
                filteredCotacoes.forEach((c) => {
                  const nome = c.unidade?.descricao || 'Não informada';
                  if (!unidadeStats[nome]) {
                    unidadeStats[nome] = { 
                      nome, 
                      total: 0, 
                      fechadas: 0, 
                      premio: 0,
                      distinctKeys: new Set(),
                      distinctFechadas: new Set(),
                    };
                  }
                  
                  const branchGroup = getBranchGroup(c.ramo?.descricao);
                  const key = `${c.cpf_cnpj}_${branchGroup}`;
                  
                  unidadeStats[nome].total++;
                  unidadeStats[nome].distinctKeys.add(key);
                  
                  if (c.status === "Negócio fechado" || c.status === "Fechamento congênere") {
                    unidadeStats[nome].fechadas++;
                    unidadeStats[nome].distinctFechadas.add(key);
                    unidadeStats[nome].premio += c.valor_premio || 0;
                  }
                });
                
                const unidadesOrdenadas = Object.values(unidadeStats)
                  .map(u => ({
                    ...u,
                    distinctTotal: u.distinctKeys.size,
                    distinctFechadas: u.distinctFechadas.size,
                    taxa: u.distinctKeys.size > 0 ? (u.distinctFechadas.size / u.distinctKeys.size) * 100 : 0,
                  }))
                  .sort((a, b) => b.premio - a.premio)
                  .slice(0, 5);
                
                const maxPremio = unidadesOrdenadas[0]?.premio || 1;
                
                return unidadesOrdenadas.map((unidade) => (
                  <div key={unidade.nome} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{unidade.nome}</span>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-sm font-bold text-success">{unidade.distinctFechadas}</span>
                          <span className="text-muted-foreground text-xs">/{unidade.distinctTotal}</span>
                        </div>
                        <span className="text-xs text-muted-foreground w-12 text-right">{unidade.taxa.toFixed(1)}%</span>
                      </div>
                    </div>
                    {/* Barra de progresso com prêmio */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-secondary rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-success to-success-alt h-full transition-all"
                          style={{ width: `${(unidade.premio / maxPremio) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-primary min-w-[70px] text-right">
                        {formatCurrency(unidade.premio)}
                      </span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cotações Recentes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cotações Recentes</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={recentQuotesViewMode === "list" ? "default" : "outline"}
              onClick={() => setRecentQuotesViewMode("list")}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              Lista
            </Button>
            <Button
              size="sm"
              variant={recentQuotesViewMode === "cards" ? "default" : "outline"}
              onClick={() => setRecentQuotesViewMode("cards")}
              className="gap-2"
            >
              <Grid3X3 className="h-4 w-4" />
              Cards
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentQuotesViewMode === "list" ? (
            <div className="space-y-3 overflow-x-auto">
              {recentQuotes.length > 0 ? (
                <div className="space-y-2 min-w-[800px]">
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
                  {recentQuotes.map((cotacao) => (
                    <div
                      key={cotacao.id}
                      className="grid grid-cols-12 gap-4 py-2 rounded-lg hover:bg-accent/50 transition-colors"
                    >
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
                        <p className="text-sm">{cotacao.seguradora?.nome || "-"}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm">{cotacao.ramo?.descricao || "-"}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm">{cotacao.produtor_origem?.nome || "-"}</p>
                      </div>
                      <div className="col-span-1 text-right">
                        <span className="text-sm font-bold text-quote-value">
                          {formatCurrency(cotacao.valor_premio)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Nenhuma cotação recente encontrada.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {recentQuotes.length > 0 ? (
                recentQuotes.map((cotacao) => (
                  <div key={cotacao.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant={getStatusBadgeVariant(cotacao.status)} className="text-xs">
                        {cotacao.status}
                      </Badge>
                      <span className="text-sm font-bold text-quote-value">{formatCurrency(cotacao.valor_premio)}</span>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{cotacao.segurado}</p>
                      <p className="text-xs text-muted-foreground">{cotacao.seguradora?.nome}</p>
                      <p className="text-xs text-muted-foreground">{cotacao.ramo?.descricao}</p>
                      <p className="text-xs text-muted-foreground">Produtor: {cotacao.produtor_origem?.nome}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(cotacao.created_at)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 col-span-full">
                  <p className="text-sm text-muted-foreground">Nenhuma cotação recente encontrada.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CotacaoModal
        cotacao={selectedCotacao}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCotacao(null);
        }}
      />
      
      {/* Modais de Análise Detalhada */}
      <StatusDetailModal
        open={showStatusDetailModal}
        onClose={() => setShowStatusDetailModal(false)}
        statusData={distribuicaoStatusDetalhada}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />
      
      <TendenciaDetailModal
        open={showTendenciaDetailModal}
        onClose={() => setShowTendenciaDetailModal(false)}
        monthlyData={monthlyTrendDataDetalhada}
        formatCurrency={formatCurrency}
      />
      
      <SeguradoraDetailModal
        open={showSeguradoraDetailModal}
        onClose={() => setShowSeguradoraDetailModal(false)}
        seguradoras={seguradoraDataDetalhada}
        formatCurrency={formatCurrency}
      />
      </div>
    </>
  );
};
export default Dashboard;
