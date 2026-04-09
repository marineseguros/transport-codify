import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Target, Package, DollarSign, ArrowLeft, TrendingUp, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import MetasProdutos from './MetasProdutos';
import MetasPremio from './MetasPremio';

type MetaView = 'selection' | 'produtos' | 'premio';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const Metas = () => {
  const [currentView, setCurrentView] = useState<MetaView>('selection');
  const [totalPremioAcumulado, setTotalPremioAcumulado] = useState<number>(0);
  const [totalMetas, setTotalMetas] = useState<number>(0);
  const [produtoresComMeta, setProdutoresComMeta] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();
  const currentMonthName = new Date().toLocaleDateString('pt-BR', { month: 'long' });

  useEffect(() => {
    const fetchTotals = async () => {
      try {
        const [premioRes, metasCountRes, produtoresRes] = await Promise.all([
          supabase
            .from('metas_premio')
            .select('meta_jan, meta_fev, meta_mar, meta_abr, meta_mai, meta_jun, meta_jul, meta_ago, meta_set, meta_out, meta_nov, meta_dez')
            .eq('ano', currentYear),
          supabase
            .from('metas')
            .select('*', { count: 'exact', head: true }),
          supabase
            .from('metas_premio')
            .select('produtor_id')
            .eq('ano', currentYear),
        ]);

        if (premioRes.data) {
          const total = premioRes.data.reduce((acc, meta) => {
            return acc +
              (Number(meta.meta_jan) || 0) + (Number(meta.meta_fev) || 0) +
              (Number(meta.meta_mar) || 0) + (Number(meta.meta_abr) || 0) +
              (Number(meta.meta_mai) || 0) + (Number(meta.meta_jun) || 0) +
              (Number(meta.meta_jul) || 0) + (Number(meta.meta_ago) || 0) +
              (Number(meta.meta_set) || 0) + (Number(meta.meta_out) || 0) +
              (Number(meta.meta_nov) || 0) + (Number(meta.meta_dez) || 0);
          }, 0);
          setTotalPremioAcumulado(total);
        }

        setTotalMetas(metasCountRes.count || 0);

        if (produtoresRes.data) {
          const unique = new Set(produtoresRes.data.map(p => p.produtor_id));
          setProdutoresComMeta(unique.size);
        }
      } catch (error) {
        logger.error('Error fetching totals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTotals();
  }, [currentYear]);

  if (currentView === 'produtos') {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentView('selection')}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground -mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Metas
        </Button>
        <MetasProdutos />
      </div>
    );
  }

  if (currentView === 'premio') {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentView('selection')}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground -mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Metas
        </Button>
        <MetasPremio />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Metas</h1>
            <p className="text-sm text-muted-foreground">
              Defina e acompanhe metas de produção e prêmio por produtor
            </p>
          </div>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 rounded-lg bg-muted/40 text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Ano:</span>
          <span className="font-semibold">{currentYear}</span>
        </div>
        <Separator orientation="vertical" className="h-4 hidden sm:block" />
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Produtores c/ meta:</span>
          <span className="font-semibold">{loading ? '...' : produtoresComMeta}</span>
        </div>
        <Separator orientation="vertical" className="h-4 hidden sm:block" />
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Mês atual:</span>
          <span className="font-semibold capitalize">{currentMonthName}</span>
        </div>
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl">
        {/* Metas de Produtos */}
        <Card
          className="group relative cursor-pointer border transition-all duration-200 hover:border-primary/50 hover:shadow-md overflow-hidden"
          onClick={() => setCurrentView('produtos')}
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-primary/60 group-hover:bg-primary transition-colors" />
          <CardContent className="p-6 pl-7">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center justify-center h-11 w-11 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <Badge variant="outline" className="text-xs font-normal">
                Atividades
              </Badge>
            </div>

            <h3 className="text-lg font-semibold mb-1">Metas de Produtos</h3>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              Coleta, Visita, Vídeo, Indicação, Cotação e Fechamento
            </p>

            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold tracking-tight">{loading ? '—' : totalMetas}</div>
                <div className="text-xs text-muted-foreground mt-0.5">metas cadastradas</div>
              </div>
              <Button size="sm" variant="ghost" className="text-primary group-hover:bg-primary/10">
                Acessar →
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Metas de Prêmio */}
        <Card
          className="group relative cursor-pointer border transition-all duration-200 hover:border-primary/50 hover:shadow-md overflow-hidden"
          onClick={() => setCurrentView('premio')}
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-success/60 group-hover:bg-success transition-colors" />
          <CardContent className="p-6 pl-7">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center justify-center h-11 w-11 rounded-lg bg-success/10 group-hover:bg-success/15 transition-colors">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <Badge variant="outline" className="text-xs font-normal">
                Receita
              </Badge>
            </div>

            <h3 className="text-lg font-semibold mb-1">Metas de Prêmio</h3>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              Metas mensais de prêmio com escadinha acumulativa
            </p>

            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold tracking-tight">
                  {loading ? '—' : formatCurrency(totalPremioAcumulado)}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">acumulado {currentYear}</div>
              </div>
              <Button size="sm" variant="ghost" className="text-success group-hover:bg-success/10">
                Acessar →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Metas;
