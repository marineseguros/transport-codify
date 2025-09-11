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
import { toast } from "sonner";
import { Save, X, FileText, MessageSquare, History, Paperclip } from "lucide-react";
import { formatCPFCNPJ } from "@/utils/csvUtils";
import { useProfiles, useSeguradoras, useClientes, useCotacoes, type Cotacao } from '@/hooks/useSupabaseData';
import { MOCK_PRODUTORES, MOCK_SEGURADORAS, MOCK_RAMOS, MOCK_CAPTACAO, MOCK_STATUS_SEGURADORA } from '@/data/mockData';

interface CotacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  cotacao?: Cotacao | null;
  mode?: 'create' | 'edit' | 'view';
}

export const CotacaoModal = ({ 
  isOpen, 
  onClose, 
  cotacao, 
  mode = 'create'
}: CotacaoModalProps) => {
  const { profiles } = useProfiles();
  const { seguradoras } = useSeguradoras();
  const { clientes } = useClientes();
  const { createCotacao, updateCotacao } = useCotacoes();

  const [formData, setFormData] = useState({
    cliente_id: '',
    unidade: 'Matriz',
    produtor_origem_id: '',
    produtor_negociador_id: '',
    produtor_cotador_id: '',
    cnpj: '',
    segurado: '',
    seguradora_id: '',
    ramo_id: '',
    captacao_id: '',
    status_seguradora_id: '',
    tipo: 'Novo',
    data_cotacao: new Date().toISOString().split('T')[0],
    inicio_vigencia: '',
    fim_vigencia: '',
    valor_premio: 0,
    status: 'Em cotação',
    observacoes: '',
    segmento: '',
    data_fechamento: undefined as string | undefined,
    num_apolice: undefined as string | undefined,
    motivo_recusa: ''
  });

  const isReadOnly = mode === 'view';
  const isEditing = mode === 'edit';
  const isCreating = mode === 'create';

  useEffect(() => {
    if (cotacao && (isEditing || mode === 'view')) {
      setFormData({
        cliente_id: cotacao.cliente_id || '',
        unidade: 'Matriz',
        produtor_origem_id: cotacao.produtor_origem_id || '',
        produtor_negociador_id: cotacao.produtor_negociador_id || '',
        produtor_cotador_id: cotacao.produtor_cotador_id || '',
        cnpj: cotacao.cpf_cnpj || '',
        segurado: cotacao.segurado || '',
        seguradora_id: cotacao.seguradora_id || '',
        ramo_id: '',
        captacao_id: '',
        status_seguradora_id: '',
        tipo: 'Novo',
        data_cotacao: cotacao.data_cotacao || new Date().toISOString().split('T')[0],
        inicio_vigencia: '',
        fim_vigencia: '',
        valor_premio: cotacao.valor_premio || 0,
        status: cotacao.status || 'Em cotação',
        observacoes: cotacao.observacoes || '',
        segmento: cotacao.segmento || '',
        data_fechamento: undefined,
        num_apolice: undefined,
        motivo_recusa: ''
      });
    } else if (isCreating) {
      const hoje = new Date();
      const inicioVigencia = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
      const fimVigencia = new Date(inicioVigencia.getTime() + 365 * 24 * 60 * 60 * 1000);

      setFormData({
        cliente_id: '',
        unidade: 'Matriz',
        produtor_origem_id: '',
        produtor_negociador_id: '',
        produtor_cotador_id: '',
        cnpj: '',
        segurado: '',
        seguradora_id: '',
        ramo_id: '',
        captacao_id: '',
        status_seguradora_id: '',
        tipo: 'Novo',
        data_cotacao: hoje.toISOString().split('T')[0],
        inicio_vigencia: inicioVigencia.toISOString().split('T')[0],
        fim_vigencia: fimVigencia.toISOString().split('T')[0],
        valor_premio: 0,
        status: 'Em cotação',
        observacoes: '',
        segmento: '',
        data_fechamento: undefined,
        num_apolice: undefined,
        motivo_recusa: ''
      });
    }
  }, [cotacao, mode]);

  const handleInputChange = (field: string, value: any) => {
    if (isReadOnly) return;

    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-fill client data when selecting from dropdown
    if (field === 'cliente_id') {
      const cliente = clientes.find(c => c.id === value);
      if (cliente) {
        setFormData(prev => ({
          ...prev,
          cliente_id: value,
          segurado: cliente.segurado,
          cnpj: cliente.cpf_cnpj
        }));
      }
    }

    // Auto-fill segment based on ramo
    if (field === 'ramo_id') {
      const ramo = MOCK_RAMOS.find(r => r.id === value);
      setFormData(prev => ({
        ...prev,
        ramo_id: value,
        segmento: ramo ? ramo.segmento : ''
      }));
    }

    // Validations
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

    // Validate dates
    if (field === 'inicio_vigencia' || field === 'fim_vigencia') {
      const inicio = field === 'inicio_vigencia' ? value : formData.inicio_vigencia;
      const fim = field === 'fim_vigencia' ? value : formData.fim_vigencia;
      
      if (inicio && fim && new Date(fim) <= new Date(inicio)) {
        toast.error("A data de fim da vigência deve ser posterior ao início.");
      }
    }
  };

  const handleSave = async () => {
    // Basic validations
    const requiredFields = [
      { field: 'unidade', message: 'Selecione uma unidade.' },
      { field: 'cnpj', message: 'Informe o CNPJ.' },
      { field: 'segurado', message: 'Informe o segurado.' }
    ];

    for (const { field, message } of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        toast.error(message);
        return;
      }
    }

    if (!formData.valor_premio || formData.valor_premio <= 0) {
      toast.error("O valor do prêmio deve ser maior que zero.");
      return;
    }

    // Validate dates
    if (formData.inicio_vigencia && formData.fim_vigencia) {
      if (new Date(formData.fim_vigencia) <= new Date(formData.inicio_vigencia)) {
        toast.error("A data de fim da vigência deve ser posterior ao início.");
        return;
      }
    }

    try {
      const cotacaoData = {
        segurado: formData.segurado,
        cpf_cnpj: formData.cnpj,
        produtor_origem_id: formData.produtor_origem_id || undefined,
        produtor_negociador_id: formData.produtor_negociador_id || undefined,
        produtor_cotador_id: formData.produtor_cotador_id || undefined,
        seguradora_id: formData.seguradora_id || undefined,
        segmento: formData.segmento || undefined,
        valor_premio: formData.valor_premio,
        status: formData.status,
        observacoes: formData.observacoes || undefined,
        data_cotacao: formData.data_cotacao
      };

      if (cotacao && isEditing) {
        await updateCotacao(cotacao.id, cotacaoData);
        toast.success('Cotação atualizada com sucesso!');
      } else {
        await createCotacao(cotacaoData);
        toast.success('Cotação criada com sucesso!');
      }
      
      onClose();
    } catch (error) {
      toast.error('Erro ao salvar cotação');
      console.error('Error saving cotacao:', error);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isCreating && "Nova Cotação"}
            {isEditing && "Editar Cotação"}
            {mode === 'view' && "Detalhes da Cotação"}
          </DialogTitle>
          {cotacao && mode === 'view' && (
            <DialogDescription>
              Cotação #{cotacao.numero_cotacao} • {cotacao.segurado}
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
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="unidade">Unidade *</Label>
                  <Select 
                    value={formData.unidade} 
                    onValueChange={(value) => handleInputChange('unidade', value)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Matriz">Matriz</SelectItem>
                      <SelectItem value="Filial">Filial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    value={formData.cnpj}
                    onChange={(e) => handleInputChange('cnpj', formatCPFCNPJ(e.target.value))}
                    placeholder="00.000.000/0000-00"
                    readOnly={isReadOnly}
                  />
                </div>

                <div>
                  <Label htmlFor="segurado">Segurado *</Label>
                  <Input
                    value={formData.segurado}
                    onChange={(e) => handleInputChange('segurado', e.target.value)}
                    placeholder="Digite o nome do segurado"
                    readOnly={isReadOnly}
                  />
                </div>
              </div>

              {/* Produtores */}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="produtor_origem_id">Produtor Origem *</Label>
                  <Select 
                    value={formData.produtor_origem_id} 
                    onValueChange={(value) => handleInputChange('produtor_origem_id', value)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o produtor origem" />
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
                  <Label htmlFor="produtor_negociador_id">Produtor Negociador *</Label>
                  <Select 
                    value={formData.produtor_negociador_id} 
                    onValueChange={(value) => handleInputChange('produtor_negociador_id', value)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o produtor negociador" />
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
                  <Label htmlFor="produtor_cotador_id">Produtor Cotador *</Label>
                  <Select 
                    value={formData.produtor_cotador_id} 
                    onValueChange={(value) => handleInputChange('produtor_cotador_id', value)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o produtor cotador" />
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
              </div>

              {/* Seguradora, Ramo e Segmento */}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="seguradora_id">Seguradora *</Label>
                  <Select 
                    value={formData.seguradora_id} 
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
                    value={formData.ramo_id} 
                    onValueChange={(value) => handleInputChange('ramo_id', value)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ramo" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_RAMOS.map(ramo => (
                        <SelectItem key={ramo.id} value={ramo.id}>
                          {ramo.descricao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="segmento">Segmento</Label>
                  <Input
                    value={formData.segmento}
                    onChange={(e) => handleInputChange('segmento', e.target.value)}
                    placeholder="Preenchido automaticamente"
                    readOnly
                  />
                </div>
              </div>

              {/* Captação e Status Seguradora */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="captacao_id">Captação *</Label>
                  <Select 
                    value={formData.captacao_id} 
                    onValueChange={(value) => handleInputChange('captacao_id', value)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a captação" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_CAPTACAO.map(captacao => (
                        <SelectItem key={captacao.id} value={captacao.id}>
                          {captacao.descricao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status_seguradora_id">Status da Seguradora</Label>
                  <Select 
                    value={formData.status_seguradora_id} 
                    onValueChange={(value) => handleInputChange('status_seguradora_id', value)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status da seguradora" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_STATUS_SEGURADORA.map(status => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.descricao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Motivo Recusa - Condicional */}
              {formData.status_seguradora_id === '5' && (
                <div>
                  <Label htmlFor="motivo_recusa">Motivo da Recusa</Label>
                  <Textarea
                    value={formData.motivo_recusa}
                    onChange={(e) => handleInputChange('motivo_recusa', e.target.value)}
                    placeholder="Descreva o motivo da recusa..."
                    className="min-h-[80px]"
                    readOnly={isReadOnly}
                  />
                </div>
              )}

              {/* Tipo, Status e Data */}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Select 
                    value={formData.tipo} 
                    onValueChange={(value) => handleInputChange('tipo', value)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Novo">Novo</SelectItem>
                      <SelectItem value="Renovação">Renovação</SelectItem>
                      <SelectItem value="Migração">Migração</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Status *</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => handleInputChange('status', value)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Em cotação">Em cotação</SelectItem>
                      <SelectItem value="Negócio fechado">Negócio fechado</SelectItem>
                      <SelectItem value="Declinado">Declinado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="data_cotacao">Data da Cotação *</Label>
                  <Input
                    type="date"
                    value={formData.data_cotacao}
                    onChange={(e) => handleInputChange('data_cotacao', e.target.value)}
                    readOnly={isReadOnly}
                  />
                </div>
              </div>

              {/* Vigência */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="inicio_vigencia">Início da Vigência</Label>
                  <Input
                    type="date"
                    value={formData.inicio_vigencia}
                    onChange={(e) => handleInputChange('inicio_vigencia', e.target.value)}
                    readOnly={isReadOnly}
                  />
                </div>

                <div>
                  <Label htmlFor="fim_vigencia">Fim da Vigência</Label>
                  <Input
                    type="date"
                    value={formData.fim_vigencia}
                    onChange={(e) => handleInputChange('fim_vigencia', e.target.value)}
                    readOnly={isReadOnly}
                  />
                </div>
              </div>

              {/* Valor do Prêmio */}
              <div>
                <Label htmlFor="valor_premio">Valor do Prêmio *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor_premio}
                  onChange={(e) => handleInputChange('valor_premio', parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  readOnly={isReadOnly}
                />
              </div>

              {/* Observações */}
              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={(e) => handleInputChange('observacoes', e.target.value)}
                  placeholder="Informações adicionais sobre a cotação..."
                  className="min-h-[100px]"
                  readOnly={isReadOnly}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="anexos" className="space-y-6 mt-6">
            <div className="text-center py-12">
              <Paperclip className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Anexos</h3>
              <p className="text-muted-foreground">
                Funcionalidade de anexos será implementada
              </p>
            </div>
          </TabsContent>

          <TabsContent value="comentarios" className="space-y-6 mt-6">
            <div className="text-center py-12">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Comentários</h3>
              <p className="text-muted-foreground">
                Funcionalidade de comentários será implementada
              </p>
            </div>
          </TabsContent>

          <TabsContent value="historico" className="space-y-6 mt-6">
            <div className="text-center py-12">
              <History className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Histórico</h3>
              <p className="text-muted-foreground">
                Funcionalidade de histórico será implementada
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-end pt-6 border-t">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              {isReadOnly ? 'Fechar' : 'Cancelar'}
            </Button>
            {!isReadOnly && (
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                {isCreating ? 'Criar' : 'Salvar'} Cotação
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};