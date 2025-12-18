import { useState, useEffect } from 'react';
import { Target, Package, DollarSign, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import MetasProdutos from './MetasProdutos';
import MetasPremio from './MetasPremio';

type MetaView = 'selection' | 'produtos' | 'premio';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const Metas = () => {
  const [currentView, setCurrentView] = useState<MetaView>('selection');
  const [totalPremioAcumulado, setTotalPremioAcumulado] = useState<number>(0);
  const [totalMetas, setTotalMetas] = useState<number>(0);

  useEffect(() => {
    const fetchTotals = async () => {
      try {
        // Fetch total accumulated prize from metas_premio
        const currentYear = new Date().getFullYear();
        const { data: metasPremio } = await supabase
          .from('metas_premio')
          .select('meta_jan, meta_fev, meta_mar, meta_abr, meta_mai, meta_jun, meta_jul, meta_ago, meta_set, meta_out, meta_nov, meta_dez')
          .eq('ano', currentYear);

        if (metasPremio) {
          const total = metasPremio.reduce((acc, meta) => {
            return acc + 
              (Number(meta.meta_jan) || 0) +
              (Number(meta.meta_fev) || 0) +
              (Number(meta.meta_mar) || 0) +
              (Number(meta.meta_abr) || 0) +
              (Number(meta.meta_mai) || 0) +
              (Number(meta.meta_jun) || 0) +
              (Number(meta.meta_jul) || 0) +
              (Number(meta.meta_ago) || 0) +
              (Number(meta.meta_set) || 0) +
              (Number(meta.meta_out) || 0) +
              (Number(meta.meta_nov) || 0) +
              (Number(meta.meta_dez) || 0);
          }, 0);
          setTotalPremioAcumulado(total);
        }

        // Fetch total product metas count
        const { count } = await supabase
          .from('metas')
          .select('*', { count: 'exact', head: true });
        
        setTotalMetas(count || 0);
      } catch (error) {
        console.error('Error fetching totals:', error);
      }
    };

    fetchTotals();
  }, []);

  if (currentView === 'produtos') {
    return (
      <div className="space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => setCurrentView('selection')}
          className="flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <MetasProdutos />
      </div>
    );
  }

  if (currentView === 'premio') {
    return (
      <div className="space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => setCurrentView('selection')}
          className="flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <MetasPremio />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Target className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Metas</h1>
          <p className="text-muted-foreground text-sm">
            Gerenciamento de metas por produtor
          </p>
        </div>
      </div>

      {/* Selection Cards */}
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <h2 className="text-xl font-semibold text-foreground mb-6">
          Qual tipo de meta você deseja trabalhar?
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          <Card 
            className="cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-200"
            onClick={() => setCurrentView('produtos')}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-2">
                <Package className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Metas de Produtos</CardTitle>
              <CardDescription>
                Visita, Coleta, Vídeo, Indicação, Fechamento
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-3">
              <div className="text-2xl font-bold text-primary">
                {totalMetas} <span className="text-sm font-normal text-muted-foreground">metas cadastradas</span>
              </div>
              <Button className="w-full">
                Acessar
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-200"
            onClick={() => setCurrentView('premio')}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-2">
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Metas de Prêmio</CardTitle>
              <CardDescription>
                Metas mensais de prêmio por produtor
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-3">
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(totalPremioAcumulado)}
              </div>
              <p className="text-xs text-muted-foreground -mt-2">Total acumulado {new Date().getFullYear()}</p>
              <Button className="w-full">
                Acessar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Metas;
