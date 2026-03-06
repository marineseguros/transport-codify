import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { logger } from '@/lib/logger';

interface Produto {
  id: string;
  consultor: string;
  data_registro: string;
  tipo: string;
  subtipo?: string | null;
}

interface Meta {
  id: string;
  produtor_id: string;
  mes: string;
  quantidade: number;
  tipo_meta?: {id: string;descricao: string;};
  produtor?: {id: string;nome: string;};
}

interface Cotacao {
  id: string;
  status: string;
  data_cotacao: string;
  data_fechamento: string | null;
}

interface DashboardIndicadoresProps {
  produtorFilter?: string[];
}

const normalizeLabel = (value?: string | null) =>
(value || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

export const DashboardIndicadores = ({ produtorFilter }: DashboardIndicadoresProps) => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [loading, setLoading] = useState(true);

  const isMetaType = (descricao: string | undefined, target: string) =>
  normalizeLabel(descricao) === normalizeLabel(target);

  const analysisDate = useMemo(() => {
    const timestamps: number[] = [];
    produtos.forEach((p) => {const t = new Date(p.data_registro).getTime();if (!Number.isNaN(t)) timestamps.push(t);});
    if (timestamps.length) return new Date(Math.max(...timestamps));
    metas.forEach((m) => {const t = new Date(m.mes).getTime();if (!Number.isNaN(t)) timestamps.push(t);});
    if (timestamps.length) return new Date(Math.max(...timestamps));
    cotacoes.forEach((c) => {const t = new Date(c.data_cotacao).getTime();if (!Number.isNaN(t)) timestamps.push(t);});
    return timestamps.length ? new Date(Math.max(...timestamps)) : new Date();
  }, [produtos, metas, cotacoes]);

  const currentMonthStr = format(analysisDate, 'yyyy-MM');
  const startCurrent = startOfMonth(analysisDate);
  const endCurrent = endOfMonth(analysisDate);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [prodRes, metasRes, cotRes] = await Promise.all([
        supabase.from('produtos').select('id, consultor, data_registro, tipo, subtipo').order('data_registro', { ascending: false }),
        supabase.from('metas').select('*, tipo_meta:tipos_meta(id, descricao), produtor:produtores(id, nome)').order('mes', { ascending: false }),
        supabase.from('cotacoes').select('id, status, data_cotacao, data_fechamento').order('data_cotacao', { ascending: false })]
        );
        if (prodRes.error) throw prodRes.error;
        if (metasRes.error) throw metasRes.error;
        if (cotRes.error) throw cotRes.error;
        setProdutos(prodRes.data || []);
        setMetas(metasRes.data || []);
        setCotacoes(cotRes.data || []);
      } catch (error: any) {
        logger.error('Error fetching indicadores data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const currentMonthProdutos = useMemo(() =>
  produtos.filter((p) => {const d = new Date(p.data_registro);return d >= startCurrent && d <= endCurrent;}),
  [produtos, startCurrent, endCurrent]);

  const currentMonthCotacoes = useMemo(() =>
  cotacoes.filter((c) => {const d = new Date(c.data_cotacao);return d >= startCurrent && d <= endCurrent;}),
  [cotacoes, startCurrent, endCurrent]);

  const currentMonthFechamentos = useMemo(() =>
  cotacoes.filter((c) => {
    if (!c.data_fechamento) return false;
    const d = new Date(c.data_fechamento);
    return d >= startCurrent && d <= endCurrent && ['Negócio fechado', 'Fechamento congênere'].includes(c.status);
  }), [cotacoes, startCurrent, endCurrent]);

  const chartData = useMemo(() => {
    const filteredProds = produtorFilter?.length ?
    currentMonthProdutos.filter((p) => produtorFilter.includes(p.consultor)) :
    currentMonthProdutos;

    const getMetaTotal = (target: string) =>
    metas.filter((m) =>
    m.mes.startsWith(currentMonthStr) &&
    isMetaType(m.tipo_meta?.descricao, target) && (
    !produtorFilter?.length || m.produtor && produtorFilter.includes(m.produtor.nome))
    ).reduce((s, m) => s + m.quantidade, 0);

    return [
    { categoria: 'Coleta', Meta: getMetaTotal('Coleta'), Realizado: filteredProds.filter((p) => p.tipo === 'Coleta').length },
    { categoria: 'Cotação', Meta: getMetaTotal('Cotação'), Realizado: currentMonthCotacoes.length },
    { categoria: 'Vídeo', Meta: getMetaTotal('Vídeo'), Realizado: filteredProds.filter((p) => p.tipo === 'Visita/Video' && normalizeLabel(p.subtipo) === 'video').length },
    { categoria: 'Visita', Meta: getMetaTotal('Visita'), Realizado: filteredProds.filter((p) => p.tipo === 'Visita/Video' && normalizeLabel(p.subtipo) === 'visita').length },
    { categoria: 'Indicação', Meta: getMetaTotal('Indicação'), Realizado: filteredProds.filter((p) => p.tipo === 'Indicação').length },
    { categoria: 'Fechamento', Meta: getMetaTotal('Fechamento'), Realizado: currentMonthFechamentos.length }];

  }, [currentMonthProdutos, currentMonthCotacoes, currentMonthFechamentos, metas, produtorFilter, currentMonthStr]);

  const totals = useMemo(() => {
    const totalMeta = chartData.reduce((s, i) => s + i.Meta, 0);
    const totalRealizado = chartData.reduce((s, i) => s + i.Realizado, 0);
    const pct = totalMeta > 0 ? totalRealizado / totalMeta * 100 : 0;
    return { totalMeta, totalRealizado, pct };
  }, [chartData]);

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