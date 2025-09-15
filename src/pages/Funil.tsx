import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCotacoesTotais, type Cotacao } from '@/hooks/useSupabaseData';
import { useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Calendar, DollarSign, Building2, User } from "lucide-react";

const Funil = () => {
  const { cotacoes, loading } = useCotacoesTotais();
  
  // Organizar cotações por status
  const cotacoesPorStatus = useMemo(() => {
    return {
      'Em cotação': cotacoes.filter(c => c.status === 'Em cotação'),
      'Negócio fechado': cotacoes.filter(c => c.status === 'Negócio fechado'),
      'Declinado': cotacoes.filter(c => c.status === 'Declinado'),
    };
  }, [cotacoes]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);

  const formatDate = (dateStr: string) => 
    new Date(dateStr).toLocaleDateString('pt-BR');

  const getDiasEmEtapa = (dataEtapa: string) => {
    const hoje = new Date();
    const data = new Date(dataEtapa);
    const diffTime = Math.abs(hoje.getTime() - data.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Em cotação': return 'border-l-brand-orange bg-background';
      case 'Negócio fechado': return 'border-l-success-alt bg-background';
      case 'Declinado': return 'border-l-destructive bg-background';
      default: return 'border-l-muted bg-background';
    }
  };

  const onDragEnd = (result: any) => {
    // Aqui seria implementada a lógica de arrastar e soltar
    // Por enquanto apenas console.log
    console.log('Drag result:', result);
  };

  const CotacaoCard = ({ cotacao, index }: { cotacao: Cotacao; index: number }) => (
    <Draggable draggableId={cotacao.id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`p-4 rounded-lg border-l-4 bg-card shadow-sm hover:shadow-md transition-shadow cursor-pointer ${getStatusColor(cotacao.status)}`}
        >
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-sm">{cotacao.segurado}</h4>
              <p className="text-xs text-muted-foreground">
                {cotacao.cliente?.cidade}, {cotacao.cliente?.uf}
              </p>
            </div>
            
            <div className="flex items-center gap-2 text-xs">
              <Building2 className="h-3 w-3" />
              <span>{cotacao.seguradora?.nome}</span>
            </div>
            
            <div className="flex items-center gap-2 text-xs">
              <User className="h-3 w-3" />
              <span>{cotacao.produtor_origem?.nome}</span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <DollarSign className="h-3 w-3" />
              <span className="font-medium">{formatCurrency(cotacao.valor_premio)}</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{getDiasEmEtapa(cotacao.data_cotacao)} dias na etapa</span>
            </div>

            <Badge variant="outline" className="text-xs">
              {cotacao.ramo?.codigo}
            </Badge>
          </div>
        </div>
      )}
    </Draggable>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Funil de Cotações</h1>
        <p className="text-muted-foreground">
          Visualize e gerencie o pipeline de vendas
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(cotacoesPorStatus).map(([status, statusCotacoes]) => {
          const total = statusCotacoes.reduce((sum, c) => sum + c.valor_premio, 0);
          return (
            <Card key={status}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{status}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statusCotacoes.length}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(total)} em prêmios
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid gap-6 lg:grid-cols-3">
          {Object.entries(cotacoesPorStatus).map(([status, statusCotacoes]) => (
            <Card key={status} className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{status}</span>
                  <Badge variant="secondary">{statusCotacoes.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Droppable droppableId={status}>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-3 min-h-[200px]"
                    >
                      {statusCotacoes.map((cotacao, index) => (
                        <CotacaoCard key={cotacao.id} cotacao={cotacao} index={index} />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default Funil;