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
  Legend,
} from 'recharts';
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

interface MetasRealizadoChartProps {
  dateFilter: string;
  dateRange?: { from?: Date; to?: Date };
  produtorFilter: string;
  produtores: Produtor[];
  // Fechamentos count from cotacoes (passed from parent to avoid duplicate queries)
  fechamentosCount: number;
}

// Map activity types from produtos to display names
// RULES:
// - VISITA and VÍDEO: Count ONLY by "subtipo" field, NOT by "tipo"
// - COLETA and INDICAÇÃO: Count by "tipo" field
// - COTAÇÃO: Count by tipo === 'Novos CRM'
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
  
  // COTAÇÃO: Count by tipo
  if (tipo === 'Novos CRM') {
    activities.push('Cotação');
  }
  
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
  fechamentosCount,
}: MetasRealizadoChartProps) => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculate date range based on filter
  const { startDate, endDate, targetMonth } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = now;
    
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

    // For metas, we use the first day of the month from the start date
    // Format as YYYY-MM-DD without timezone issues
    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
    const year = monthStart.getFullYear();
    const month = String(monthStart.getMonth() + 1).padStart(2, '0');
    const targetMonthStr = `${year}-${month}-01`;

    return {
      startDate: start,
      endDate: end,
      targetMonth: targetMonthStr,
    };
  }, [dateFilter, dateRange]);

  // Fetch produtos and metas
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch produtos within date range
        const startStr = startDate.toISOString();
        const endStr = new Date(endDate.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();

        const { data: produtosData, error: produtosError } = await supabase
          .from('produtos')
          .select('id, tipo, subtipo, data_registro, consultor')
          .gte('data_registro', startStr)
          .lte('data_registro', endStr);

        if (produtosError) throw produtosError;

        // Fetch metas for the target month with tipo_meta relation
        const { data: metasData, error: metasError } = await supabase
          .from('metas')
          .select(`
            id,
            produtor_id,
            mes,
            quantidade,
            tipo_meta:tipos_meta(id, descricao)
          `)
          .eq('mes', targetMonth);

        if (metasError) throw metasError;

        setProdutos(produtosData || []);
        setMetas(metasData || []);
      } catch (error) {
        logger.error('Error fetching metas data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, targetMonth]);

  // Calculate realized counts from produtos
  const realizadoPorAtividade = useMemo(() => {
    const counts: Record<string, number> = {};
    ACTIVITIES.forEach(act => counts[act] = 0);

    // Filter by produtor if needed (using consultor field)
    const filteredProdutos = produtorFilter === 'todos' 
      ? produtos 
      : produtos.filter(p => p.consultor === produtorFilter);

    filteredProdutos.forEach(produto => {
      // Get all activities this produto counts for
      const activities = mapProdutoToActivities(produto.tipo, produto.subtipo);
      activities.forEach(activity => {
        if (counts[activity] !== undefined) {
          counts[activity]++;
        }
      });
    });

    // Add fechamentos count (already filtered in parent)
    counts['Fechamento'] = fechamentosCount;

    return counts;
  }, [produtos, produtorFilter, fechamentosCount]);

  // Find the produtor_id from the selected producer name
  const selectedProdutorId = useMemo(() => {
    if (produtorFilter === 'todos') return null;
    const produtor = produtores.find(p => p.nome === produtorFilter);
    return produtor?.id || null;
  }, [produtores, produtorFilter]);

  // Calculate metas totals by activity type - FILTERED BY PRODUTOR
  // Each producer should only see their own metas, never sum across producers
  const metasPorAtividade = useMemo(() => {
    const totals: Record<string, number> = {};
    ACTIVITIES.forEach(act => totals[act] = 0);

    // Filter metas by produtor_id if a specific one is selected
    const filteredMetas = !selectedProdutorId 
      ? metas 
      : metas.filter(meta => meta.produtor_id === selectedProdutorId);

    filteredMetas.forEach(meta => {
      if (meta.tipo_meta?.descricao) {
        const normalizedType = normalizeMetaType(meta.tipo_meta.descricao);
        if (totals[normalizedType] !== undefined) {
          totals[normalizedType] += meta.quantidade;
        }
      }
    });

    return totals;
  }, [metas, selectedProdutorId]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return ACTIVITIES.map(activity => ({
      atividade: activity,
      Meta: metasPorAtividade[activity] || 0,
      Realizado: realizadoPorAtividade[activity] || 0,
    }));
  }, [metasPorAtividade, realizadoPorAtividade]);

  // Calculate totals for summary
  const totals = useMemo(() => {
    const totalMeta = Object.values(metasPorAtividade).reduce((sum, val) => sum + val, 0);
    const totalRealizado = Object.values(realizadoPorAtividade).reduce((sum, val) => sum + val, 0);
    const percentualAtingido = totalMeta > 0 ? (totalRealizado / totalMeta) * 100 : 0;
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
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Meta x Realizado
          </div>
          <div className="text-sm font-normal text-muted-foreground">
            Atingimento: <span className={`font-semibold ${totals.percentualAtingido >= 100 ? 'text-success' : totals.percentualAtingido >= 70 ? 'text-warning' : 'text-destructive'}`}>
              {totals.percentualAtingido.toFixed(1)}%
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="atividade" 
              tick={{ fontSize: 12 }}
              tickLine={false}
              className="text-muted-foreground"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={false}
              className="text-muted-foreground"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend />
            <Bar 
              dataKey="Meta" 
              fill="hsl(var(--muted-foreground))" 
              radius={[4, 4, 0, 0]}
              name="Meta"
            />
            <Bar 
              dataKey="Realizado" 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]}
              name="Realizado"
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold">{totals.totalMeta}</p>
            <p className="text-xs text-muted-foreground">Total Meta</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{totals.totalRealizado}</p>
            <p className="text-xs text-muted-foreground">Total Realizado</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${totals.percentualAtingido >= 100 ? 'text-success' : totals.percentualAtingido >= 70 ? 'text-warning' : 'text-destructive'}`}>
              {totals.percentualAtingido.toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground">% Atingido</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
