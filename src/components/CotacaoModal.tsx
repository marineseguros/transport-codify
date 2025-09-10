import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CotacaoTRN, CotacaoStatus, CotacaoTipo } from "@/types";
import { 
  MOCK_CLIENTES, MOCK_PRODUTORES, MOCK_SEGURADORAS, 
  MOCK_RAMOS 
} from "@/data/mockData";
import { toast } from "@/hooks/use-toast";
import { Save, X, FileText, MessageSquare, History, Paperclip } from "lucide-react";

interface CotacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  cotacao: CotacaoTRN | null;
  mode: 'create' | 'edit' | 'view';
  onSave: () => void;
}

export const CotacaoModal = ({ 
  isOpen, 
  onClose, 
  cotacao, 
  mode, 
  onSave 
}: CotacaoModalProps) => {
  const [formData, setFormData] = useState<Partial<CotacaoTRN>>({
    cliente_id: '',
    produtor_id: '',
    seguradora_id: '',
    ramo_id: '',
    tipo: 'Novo',
    data_cotacao: new Date().toISOString().split('T')[0],
    inicio_vigencia: '',
    fim_vigencia: '',
    valor_premio: 0,
    status: 'Em cotação',
    observacoes: ''
  });

  const isReadOnly = mode === 'view';
  const isEditing = mode === 'edit';
  const isCreating = mode === 'create';

  useEffect(() => {
    if (cotacao && (isEditing || mode === 'view')) {
      setFormData(cotacao);
    } else if (isCreating) {
      const hoje = new Date();
      const inicioVigencia = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
      const fimVigencia = new Date(inicioVigencia.getTime() + 365 * 24 * 60 * 60 * 1000);

      setFormData({
        ...(cotacao || {}), // Se é duplicação, mantém dados existentes
        tipo: 'Novo',
        status: 'Em cotação',
        data_cotacao: hoje.toISOString().split('T')[0],
        inicio_vigencia: inicioVigencia.toISOString().split('T')[0],
        fim_vigencia: fimVigencia.toISOString().split('T')[0],
        valor_premio: 0,
      });
    }
  }, [cotacao, mode]);

  const handleInputChange = (field: string, value: any) => {
    if (isReadOnly) return;

    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Validações automáticas
    if (field === 'status' && value === 'Negócio fechado') {
      setFormData(prev => ({
        ...prev,
        [field]: value,
        data_fechamento: prev.data_fechamento || new Date().toISOString().split('T')[0]
      }));
    } else if (field === 'status' && value !== 'Negócio fechado') {
      setFormData(prev => ({
        ...prev,
        [field]: value,
        data_fechamento: undefined,
        num_apolice: undefined
      }));
    }

    // Validar datas
    if (field === 'inicio_vigencia' || field === 'fim_vigencia') {
      const inicio = field === 'inicio_vigencia' ? value : formData.inicio_vigencia;
      const fim = field === 'fim_vigencia' ? value : formData.fim_vigencia;
      
      if (inicio && fim && new Date(fim) <= new Date(inicio)) {
        toast({
          title: "Data inválida",
          description: "A data de fim da vigência deve ser posterior ao início.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSave = () => {
    // Validações básicas
    if (!formData.cliente_id) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione um cliente.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.produtor_id) {
      toast({
        title: "Campo obrigatório", 
        description: "Selecione um produtor.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.seguradora_id) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione uma seguradora.", 
        variant: "destructive",
      });
      return;
    }

    if (!formData.ramo_id) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione um ramo.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.valor_premio || formData.valor_premio <= 0) {
      toast({
        title: "Valor inválido",
        description: "O valor do prêmio deve ser maior que zero.",
        variant: "destructive",
      });
      return;
    }

    if (formData.status === 'Negócio fechado' && !formData.data_fechamento) {
      toast({
        title: "Campo obrigatório",
        description: "Data de fechamento é obrigatória quando o status é 'Negócio fechado'.",
        variant: "destructive",
      });
      return;
    }

    // Validar datas
    if (formData.inicio_vigencia && formData.fim_vigencia) {
      if (new Date(formData.fim_vigencia) <= new Date(formData.inicio_vigencia)) {
        toast({
          title: "Data inválida",
          description: "A data de fim da vigência deve ser posterior ao início.",
          variant: "destructive",
        });
        return;
      }
    }

    // Aqui salvaria no modo mock ou Supabase
    console.log('Salvando cotação:', formData);
    
    toast({
      title: isCreating ? "Cotação criada" : "Cotação atualizada",
      description: isCreating 
        ? "A nova cotação foi criada com sucesso." 
        : "As alterações foram salvas com sucesso.",
    });

    onSave();
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);

  const getStatusBadgeVariant = (status: CotacaoStatus) => {
    switch (status) {
      case 'Negócio fechado': return 'default';
      case 'Em cotação': return 'secondary';  
      case 'Declinado': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isCreating && "Nova Cotação"}
            {isEditing && "Editar Cotação"}
            {mode === 'view' && "Detalhes da Cotação"}
          </DialogTitle>
          {cotacao && mode === 'view' && (
            <DialogDescription>
              Cotação #{cotacao.id} • {cotacao.cliente?.segurado}
            </DialogDescription>
          )}
        </DialogHeader>

        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="anexos">Anexos</TabsTrigger>
            <TabsTrigger value="comentarios">Comentários</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-6 mt-6">
            <div className="grid gap-6">
              {/* Informações Básicas */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="cliente_id">Cliente *</Label>
                  <Select 
                    value={formData.cliente_id || ''} 
                    onValueChange={(value) => handleInputChange('cliente_id', value)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_CLIENTES.map(cliente => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.segurado} - {cliente.cidade}/{cliente.uf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="produtor_id">Produtor *</Label>
                  <Select 
                    value={formData.produtor_id || ''} 
                    onValueChange={(value) => handleInputChange('produtor_id', value)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o produtor" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_PRODUTORES.map(produtor => (
                        <SelectItem key={produtor.id} value={produtor.id}>
                          {produtor.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="seguradora_id">Seguradora *</Label>
                  <Select 
                    value={formData.seguradora_id || ''} 
                    onValueChange={(value) => handleInputChange('seguradora_id', value)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a seguradora" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_SEGURADORAS.map(seguradora => (
                        <SelectItem key={seguradora.id} value={seguradora.id}>
                          {seguradora.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="ramo_id">Ramo *</Label>
                  <Select 
                    value={formData.ramo_id || ''} 
                    onValueChange={(value) => handleInputChange('ramo_id', value)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ramo" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_RAMOS.map(ramo => (
                        <SelectItem key={ramo.id} value={ramo.id}>
                          {ramo.codigo} - {ramo.descricao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tipo e Status */}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select 
                    value={formData.tipo || 'Novo'} 
                    onValueChange={(value: CotacaoTipo) => handleInputChange('tipo', value)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Novo">Novo</SelectItem>
                      <SelectItem value="Endosso">Endosso</SelectItem>
                      <SelectItem value="Renovação">Renovação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status || 'Em cotação'} 
                    onValueChange={(value: CotacaoStatus) => handleInputChange('status', value)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Em cotação">Em cotação</SelectItem>
                      <SelectItem value="Negócio fechado">Negócio fechado</SelectItem>
                      <SelectItem value="Declinado">Declinado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="data_cotacao">Data da Cotação</Label>
                  <Input
                    type="date"
                    value={formData.data_cotacao || ''}
                    onChange={(e) => handleInputChange('data_cotacao', e.target.value)}
                    readOnly={isReadOnly}
                  />
                </div>
              </div>

              {/* Datas de Vigência */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="inicio_vigencia">Início da Vigência</Label>
                  <Input
                    type="date"
                    value={formData.inicio_vigencia || ''}
                    onChange={(e) => handleInputChange('inicio_vigencia', e.target.value)}
                    readOnly={isReadOnly}
                  />
                </div>

                <div>
                  <Label htmlFor="fim_vigencia">Fim da Vigência</Label>
                  <Input
                    type="date"
                    value={formData.fim_vigencia || ''}
                    onChange={(e) => handleInputChange('fim_vigencia', e.target.value)}
                    readOnly={isReadOnly}
                  />
                </div>
              </div>

              {/* Valor do Prêmio */}
              <div className="grid gap-4 md:grid-cols-1">
                <div>
                  <Label htmlFor="valor_premio">Valor do Prêmio *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valor_premio || ''}
                    onChange={(e) => handleInputChange('valor_premio', parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    readOnly={isReadOnly}
                    required
                  />
                </div>
              </div>

              {/* Campos condicionais para negócio fechado */}
              {formData.status === 'Negócio fechado' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="data_fechamento">Data de Fechamento *</Label>
                    <Input
                      type="date"
                      value={formData.data_fechamento || ''}
                      onChange={(e) => handleInputChange('data_fechamento', e.target.value)}
                      readOnly={isReadOnly}
                    />
                  </div>

                  <div>
                    <Label htmlFor="num_apolice">Número da Apólice</Label>
                    <Input
                      value={formData.num_apolice || ''}
                      onChange={(e) => handleInputChange('num_apolice', e.target.value)}
                      placeholder="Ex: TRN123456"
                      readOnly={isReadOnly}
                    />
                  </div>
                </div>
              )}

              {/* Observações */}
              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  value={formData.observacoes || ''}
                  onChange={(e) => handleInputChange('observacoes', e.target.value)}
                  placeholder="Informações adicionais sobre a cotação..."
                  rows={4}
                  readOnly={isReadOnly}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="anexos" className="space-y-4 mt-6">
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              <span className="font-medium">Anexos da Cotação</span>
            </div>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <p className="text-muted-foreground">Nenhum anexo encontrado</p>
              {!isReadOnly && (
                <Button variant="outline" className="mt-4">
                  Adicionar Anexo
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="comentarios" className="space-y-4 mt-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="font-medium">Comentários</span>
            </div>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <p className="text-muted-foreground">Nenhum comentário encontrado</p>
              {!isReadOnly && (
                <Button variant="outline" className="mt-4">
                  Adicionar Comentário
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="historico" className="space-y-4 mt-6">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="font-medium">Histórico de Alterações</span>
            </div>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <p className="text-muted-foreground">Nenhuma alteração registrada</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            {isReadOnly ? 'Fechar' : 'Cancelar'}
          </Button>
          {!isReadOnly && (
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              {isCreating ? 'Criar Cotação' : 'Salvar Alterações'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};