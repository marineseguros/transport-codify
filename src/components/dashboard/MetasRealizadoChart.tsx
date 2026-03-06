import { useMemo, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend } from
'recharts';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface Produto {
  id: string;
  tipo: string;
  subtipo: string | null;
  data_registro: string;
  consultor: string;
}

interface Meta {
  id: string;
  produtor_id: string;
  mes: string;
  quantidade: number;
  tipo_meta: {
    id: string;
    descricao: string;
  } | null;
}

interface Produtor {
  id: string;
  nome: string;
}

interface CotacaoForCount {
  id: string;
  cpf_cnpj: string;
  produtor_origem_id: string | null;
  produtor_negociador_id: string | null;
  produtor_cotador_id: string | null;
  ramo: {descricao: string;} | null;
}

interface MetasRealizadoChartProps {
  dateFilter: string;
  dateRange?: {from?: Date;to?: Date;};
  produtorFilter: string[];
  produtores: Produtor[];
  // Fechamentos count from cotacoes (passed from parent to avoid duplicate queries)
  fechamentosCount: number;
}

// Function to categorize branches into groups for distinct counting
// Group 1: RCTR-C + RC-DC (combined)
// Group 2: All other specific types (each counts separately)
const getBranchGroup = (ramo: {descricao?: string;ramo_agrupado?: string | null;} | undefined | null): string => {
  if (!ramo) return "Outros";
  if (ramo.ramo_agrupado) return ramo.ramo_agrupado;
  // Fallback por descrição
  const ramoUpper = (ramo.descricao || '').toUpperCase();
  if (ramoUpper.includes("RCTR-C") || ramoUpper.includes("RC-DC")) return "RCTR-C + RC-DC";
  return ramo.descricao || "Outros";
};

// Count distinct cotações by CNPJ + branch group
const countDistinctCotacoes = (
cotacoes: CotacaoForCount[],
produtorId: string | null)
: number => {
  const distinctKeys = new Set<string>();

  cotacoes.forEach((cotacao) => {
    // Filter by produtor if selected
    if (produtorId &&
    cotacao.produtor_origem_id !== produtorId &&
    cotacao.produtor_negociador_id !== produtorId &&
    cotacao.produtor_cotador_id !== produtorId) {
      return;
    }

    const branchGroup = getBranchGroup(cotacao.ramo);
    const key = `${cotacao.cpf_cnpj}_${branchGroup}`;
    distinctKeys.add(key);
  });

  return distinctKeys.size;
};

// Map activity types from produtos to display names
// RULES:
// - VISITA and VÍDEO: Count ONLY by "subtipo" field, NOT by "tipo"
// - COLETA and INDICAÇÃO: Count by "tipo" field
// - COTAÇÃO: Counted from cotacoes table, NOT from produtos
// - FECHAMENTO: Counted from cotacoes table with status "Negócio fechado"
const mapProdutoToActivities = (tipo: string, subtipo: string | null): string[] => {
  const activities: string[] = [];

  // COLETA: Count by tipo
  if (tipo === 'Coleta') {
    activities.push('Coleta');
  }

  // INDICAÇÃO: Count by tipo
  if (tipo === 'Indicação') {
    activities.push('Indicação');
  }

  // COTAÇÃO: Now counted from cotacoes table, not from produtos
  // Removed: if (tipo === 'Novos CRM') activities.push('Cotação');

  // VISITA: Count ONLY by subtipo (regardless of tipo)
  if (subtipo === 'Visita') {
    activities.push('Visita');
  }

  // VÍDEO: Count ONLY by subtipo (regardless of tipo)
  if (subtipo === 'Vídeo') {
    activities.push('Vídeo');
  }

  return activities;
};

// Map tipos_meta.descricao to activity names for matching
const normalizeMetaType = (descricao: string): string => {
  const normalized = descricao.toLowerCase().trim();
  if (normalized === 'coleta') return 'Coleta';
  if (normalized === 'cotação' || normalized === 'cotacao') return 'Cotação';
  if (normalized === 'vídeo' || normalized === 'video') return 'Vídeo';
  if (normalized === 'visita') return 'Visita';
  if (normalized === 'indicação' || normalized === 'indicacao') return 'Indicação';
  if (normalized === 'fechamento') return 'Fechamento';
  return descricao;
};

const ACTIVITIES = ['Coleta', 'Cotação', 'Vídeo', 'Visita', 'Indicação', 'Fechamento'];

export const MetasRealizadoChart = ({
  dateFilter,
  dateRange,
  produtorFilter,
  produtores,
  fechamentosCount
}: MetasRealizadoChartProps) => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [cotacoesData, setCotacoesData] = useState<CotacaoForCount[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculate date range based on filter
  const { startDate, endDate, targetYear, isYearFilter } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = now;
    let yearFilter = false;

    switch (dateFilter) {
      case 'hoje':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '7dias':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30dias':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90dias':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'mes_atual':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'mes_anterior':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'ano_atual':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        yearFilter = true;
        break;
      case 'personalizado':
      case 'personalizado_comparacao':
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

    // For metas, we use the year from the start date
    const year = start.getFullYear();

    return {
      startDate: start,
      endDate: end,
      targetYear: year,
      isYearFilter: yearFilter
    };
  }, [dateFilter, dateRange]);

  // Find the produtor_id from the selected producer names
  const selectedProdutorIds = useMemo(() => {
    if (produtorFilter.length === 0) return [];
    return produtores.
    filter((p) => produtorFilter.includes(p.nome)).
    map((p) => p.id);
  }, [produtores, produtorFilter]);

  // Fetch produtos, metas, and cotações count
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch produtos within date range
        const startStr = startDate.toISOString();
        const endStr = new Date(endDate.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();

        const { data: produtosData, error: produtosError } = await supabase.
        from('produtos').
        select('id, tipo, subtipo, data_registro, consultor').
        gte('data_registro', startStr).
        lte('data_registro', endStr);

        if (produtosError) throw produtosError;

        // Fetch metas - for year filter, get all months of the year; otherwise get specific month
        let metasQuery = supabase.
        from('metas').
        select(`
            id,
            produtor_id,
            mes,
            quantidade,
            tipo_meta:tipos_meta(id, descricao)
          `);

        if (isYearFilter) {
          // Fetch all metas for the entire year (all 12 months)
          const yearStart = `${targetYear}-01-01`;
          const yearEnd = `${targetYear}-12-31`;
          metasQuery = metasQuery.gte('mes', yearStart).lte('mes', yearEnd);
        } else {
          // Fetch metas for the specific month
          const monthStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
          const month = String(monthStart.getMonth() + 1).padStart(2, '0');
          const targetMonth = `${monthStart.getFullYear()}-${month}-01`;
          metasQuery = metasQuery.eq('mes', targetMonth);
        }

        const { data: metasData, error: metasError } = await metasQuery;
        if (metasError) throw metasError;

        // Fetch cotações with full data for distinct counting (CNPJ + Ramo)
        const { data: cotacoesDataResult, error: cotacoesError } = await supabase.
        from('cotacoes').
        select(`
            id,
            cpf_cnpj,
            produtor_origem_id,
            produtor_negociador_id,
            produtor_cotador_id,
            ramo:ramos(descricao)
          `).
        gte('data_cotacao', startStr).
        lte('data_cotacao', endStr);

        if (cotacoesError) throw cotacoesError;

        setProdutos(produtosData || []);
        setMetas(metasData || []);
        setCotacoesData(cotacoesDataResult as CotacaoForCount[] || []);
      } catch (error) {
        logger.error('Error fetching metas data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, targetYear, isYearFilter, selectedProdutorIds]);

  // Calculate realized counts from produtos
  const realizadoPorAtividade = useMemo(() => {
    const counts: Record<string, number> = {};
    ACTIVITIES.forEach((act) => counts[act] = 0);

    // Filter by produtor if needed (using consultor field)
    const filteredProdutos = produtorFilter.length === 0 ?
    produtos :
    produtos.filter((p) => produtorFilter.includes(p.consultor));

    filteredProdutos.forEach((produto) => {
      // Get all activities this produto counts for
      const activities = mapProdutoToActivities(produto.tipo, produto.subtipo);
      activities.forEach((activity) => {
        if (counts[activity] !== undefined) {
          counts[activity]++;
        }
      });
    });

    // Add fechamentos count (already filtered in parent)
    counts['Fechamento'] = fechamentosCount;

    // Use distinct cotações count (CNPJ + Ramo group)
    counts['Cotação'] = countDistinctCotacoes(cotacoesData, selectedProdutorIds.length > 0 ? selectedProdutorIds[0] : null);

    return counts;
  }, [produtos, produtorFilter, fechamentosCount, cotacoesData, selectedProdutorIds]);

  // Calculate metas totals by activity type - FILTERED BY PRODUTOR
  // Each producer should only see their own metas, never sum across producers
  const metasPorAtividade = useMemo(() => {
    const totals: Record<string, number> = {};
    ACTIVITIES.forEach((act) => totals[act] = 0);

    // Filter metas by produtor_id if specific ones are selected
    const filteredMetas = selectedProdutorIds.length === 0 ?
    metas :
    metas.filter((meta) => selectedProdutorIds.includes(meta.produtor_id));

    filteredMetas.forEach((meta) => {
      if (meta.tipo_meta?.descricao) {
        const normalizedType = normalizeMetaType(meta.tipo_meta.descricao);
        if (totals[normalizedType] !== undefined) {
          totals[normalizedType] += meta.quantidade;
        }
      }
    });

    return totals;
  }, [metas, selectedProdutorIds]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return ACTIVITIES.map((activity) => ({
      atividade: activity,
      Meta: metasPorAtividade[activity] || 0,
      Realizado: realizadoPorAtividade[activity] || 0
    }));
  }, [metasPorAtividade, realizadoPorAtividade]);

  // Calculate totals for summary
  const totals = useMemo(() => {
    const totalMeta = Object.values(metasPorAtividade).reduce((sum, val) => sum + val, 0);
    const totalRealizado = Object.values(realizadoPorAtividade).reduce((sum, val) => sum + val, 0);
    const percentualAtingido = totalMeta > 0 ? totalRealizado / totalMeta * 100 : 0;
    return { totalMeta, totalRealizado, percentualAtingido };
  }, [metasPorAtividade, realizadoPorAtividade]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Meta x Realizado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>);

  }

  return (
    <Card>
      











      
      























































      
    </Card>);

};