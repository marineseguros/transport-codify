import { useState } from 'react';
import { Target, Package, DollarSign, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import MetasProdutos from './MetasProdutos';
import MetasPremio from './MetasPremio';

type MetaView = 'selection' | 'produtos' | 'premio';

const Metas = () => {
  const [currentView, setCurrentView] = useState<MetaView>('selection');

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
            <CardContent className="text-center">
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
            <CardContent className="text-center">
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
