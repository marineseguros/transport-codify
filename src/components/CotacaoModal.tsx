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
import { Save, X, FileText, MessageSquare, History, Paperclip, Upload, Plus, Trash2 } from "lucide-react";
import { formatCPFCNPJ } from "@/utils/csvUtils";
import { useAuth } from "@/contexts/AuthContext";
import { 
  useProfiles, 
  useSeguradoras, 
  useClientes, 
  useCotacoes, 
  useProdutores,
  useRamos,
  useCaptacao,
  useStatusSeguradora,
  type Cotacao 
} from '@/hooks/useSupabaseData';

interface CotacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  cotacao?: Cotacao | null;
  mode?: 'create' | 'edit' | 'view';
  onSaved?: () => void;
}

export const CotacaoModal = ({ 
  isOpen, 
  onClose, 
  cotacao, 
  mode = 'create',
  onSaved
}: CotacaoModalProps) => {
  const { user } = useAuth();
  const { profiles } = useProfiles();
  const { produtores, loading: produtoresLoading, refetch: refetchProdutores } = useProdutores();
  const { seguradoras } = useSeguradoras();
  const { ramos } = useRamos();
  const { captacao } = useCaptacao();
  const { statusSeguradora } = useStatusSeguradora();
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
        tipo: 'Nova',
        data_cotacao: new Date().toISOString().split('T')[0],
        inicio_vigencia: '',
        fim_vigencia: '',
        valor_premio: 0,
        status: 'Em análise',
    observacoes: '',
    segmento: '',
    data_fechamento: undefined as string | undefined,
    num_apolice: undefined as string | undefined,
    motivo_recusa: '',
    comentarios: ''
  });

  // State for extra ramos (up to 3 additional)
  const [ramosExtras, setRamosExtras] = useState<string[]>([]);

  const isReadOnly = mode === 'view';
  const isEditing = mode === 'edit';
  const isCreating = mode === 'create';

  // Fetch produtores when modal opens
  useEffect(() => {
    if (isOpen && produtores.length === 0) {
      refetchProdutores();
    }
  }, [isOpen, produtores.length, refetchProdutores]);

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
        ramo_id: cotacao.ramo_id || '',
        captacao_id: cotacao.captacao_id || '',
        status_seguradora_id: cotacao.status_seguradora_id || '',
        tipo: cotacao.tipo || 'Nova',
        data_cotacao: cotacao.data_cotacao || new Date().toISOString().split('T')[0],
        inicio_vigencia: cotacao.data_cotacao || '',
        fim_vigencia: cotacao.data_fechamento || '',
        valor_premio: cotacao.valor_premio || 0,
        status: cotacao.status || 'Em análise',
        observacoes: cotacao.observacoes || '',
        segmento: cotacao.segmento || '',
        data_fechamento: cotacao.data_fechamento || undefined,
        num_apolice: cotacao.num_apolice || undefined,
        motivo_recusa: cotacao.motivo_recusa || '',
        comentarios: cotacao.comentarios || ''
      });
    } else if (isCreating) {
      const hoje = new Date();
      const inicioVigencia = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
      const fimVigencia = new Date(inicioVigencia.getTime() + 365 * 24 * 60 * 60 * 1000);

      // Find current user in produtores list to set as default cotador
      // Try to match by email first, then by name if available
      const currentUserProdutor = produtores.find(p => 
        (p.email && user?.email && p.email.toLowerCase() === user.email.toLowerCase()) ||
        (p.nome && user?.nome && p.nome.toLowerCase().includes(user.nome.toLowerCase()))
      ) || produtores[0]; // Fallback to first produtor if no match

      setFormData({
        cliente_id: '',
        unidade: 'Matriz',
        produtor_origem_id: '',
        produtor_negociador_id: '',
        produtor_cotador_id: currentUserProdutor?.id || '',
        cnpj: '',
        segurado: '',
        seguradora_id: '',
        ramo_id: '',
        captacao_id: '',
        status_seguradora_id: '',
        tipo: 'Nova',
        data_cotacao: hoje.toISOString().split('T')[0],
        inicio_vigencia: inicioVigencia.toISOString().split('T')[0],
        fim_vigencia: fimVigencia.toISOString().split('T')[0],
        valor_premio: 0,
        status: 'Em análise',
        observacoes: '',
        segmento: '',
        data_fechamento: undefined,
        num_apolice: undefined,
        motivo_recusa: '',
        comentarios: ''
      });
      
      // Reset extra ramos when creating new cotação
      setRamosExtras([]);
    }
  }, [cotacao, mode, produtores, user]);

  const handleInputChange = (field: string, value: any) => {
    console.log('handleInputChange called with field:', field, 'value:', value);
    if (isReadOnly) return;

    // Auto-fill client data when selecting from dropdown
    if (field === 'cliente_id') {
      const cliente = clientes.find(c => c.id === value);
      if (cliente) {
        console.log('Auto-filling client data:', cliente);
        setFormData(prev => ({
          ...prev,
          cliente_id: value,
          segurado: cliente.segurado,
          cnpj: cliente.cpf_cnpj
        }));
      }
      return; // Return early since we set all needed fields
    }

    // Auto-fill segment based on ramo
    if (field === 'ramo_id') {
      console.log('Processing ramo_id change, value:', value);
      const segmento = getSegmentoByRamo(value);
      console.log('Calculated segmento:', segmento);
      
      setFormData(prev => {
        console.log('Previous formData:', prev);
        const newData = {
          ...prev,
          ramo_id: value,
          segmento: segmento
        };
        console.log('New formData after ramo change:', newData);
        return newData;
      });
      return; // Return early since we already set both fields
    }

    // For other fields, use the general update
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Validations
    if (field === 'status' && value === 'Negócio fechado') {
      setFormData(prev => ({
        ...prev,
        data_fechamento: prev.data_fechamento || new Date().toISOString().split('T')[0]
      }));
    } else if (field === 'status' && value !== 'Negócio fechado') {
      setFormData(prev => ({
        ...prev,
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

  // Utility function to get segment based on ramo
  const getSegmentoByRamo = (ramoId: string) => {
    console.log('getSegmentoByRamo called with ramoId:', ramoId);
    const ramo = ramos.find(r => r.id === ramoId);
    console.log('Found ramo:', ramo);
    if (!ramo) {
      console.log('No ramo found, returning empty string');
      return '';
    }
    
    const ramoDesc = ramo.descricao.toUpperCase();
    console.log('Ramo description (uppercase):', ramoDesc);
    
    if (['NACIONAL', 'EXPORTAÇÃO', 'IMPORTAÇÃO', 'NACIONAL AVULSA', 'IMPORTAÇÃO AVULSA', 'EXPORTAÇÃO AVULSA'].includes(ramoDesc)) {
      console.log('Returning Embarcador');
      return 'Embarcador';
    } else if (['RCTR-C', 'RC-DC', 'RCTR-VI', 'GARANTIA', 'RCTA-C', 'AMBIENTAL', 'RC-V'].includes(ramoDesc)) {
      console.log('Returning Transportador');
      return 'Transportador';
    }
    
    console.log('No segment match found, returning empty string');
    return '';
  };

  const handleAddRamoExtra = () => {
    if (ramosExtras.length < 3) {
      setRamosExtras([...ramosExtras, '']);
    }
  };

  const handleRemoveRamoExtra = (index: number) => {
    setRamosExtras(ramosExtras.filter((_, i) => i !== index));
  };

  const handleRamoExtraChange = (index: number, value: string) => {
    const newRamosExtras = [...ramosExtras];
    newRamosExtras[index] = value;
    setRamosExtras(newRamosExtras);
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
      // Only require premium value when status is "Negócio fechado"
      if (formData.status === 'Negócio fechado') {
        toast.error("O valor do prêmio deve ser maior que zero.");
        return;
      }
    }

    // Validate required fields for "Negócio fechado"
    if (formData.status === 'Negócio fechado') {
      if (!formData.data_fechamento) {
        toast.error("Data de fechamento é obrigatória para negócios fechados.");
        return;
      }
      if (!formData.num_apolice) {
        toast.error("Número da apólice é obrigatório para negócios fechados.");
        return;
      }
    }

    // Validate dates
    if (formData.inicio_vigencia && formData.fim_vigencia) {
      if (new Date(formData.fim_vigencia) <= new Date(formData.inicio_vigencia)) {
        toast.error("A data de fim da vigência deve ser posterior ao início.");
        return;
      }
    }

    try {
      const baseCotacaoData = {
        segurado: formData.segurado,
        cpf_cnpj: formData.cnpj,
        produtor_origem_id: formData.produtor_origem_id || undefined,
        produtor_negociador_id: formData.produtor_negociador_id || undefined,
        produtor_cotador_id: formData.produtor_cotador_id || undefined,
        seguradora_id: formData.seguradora_id || undefined,
        captacao_id: formData.captacao_id || undefined,
        status_seguradora_id: formData.status_seguradora_id || undefined,
        segmento: formData.segmento || undefined,
        valor_premio: formData.valor_premio,
        status: formData.status,
        observacoes: formData.observacoes || undefined,
        comentarios: formData.comentarios || undefined,
        motivo_recusa: formData.motivo_recusa || undefined,
        data_cotacao: formData.data_cotacao,
        data_fechamento: formData.status === 'Negócio fechado' ? formData.data_fechamento : undefined,
        num_apolice: formData.status === 'Negócio fechado' ? formData.num_apolice : undefined
      };

      if (cotacao && isEditing) {
        // When editing, just update the single record
        const cotacaoData = {
          ...baseCotacaoData,
          ramo_id: formData.ramo_id || undefined,
        };
        await updateCotacao(cotacao.id, cotacaoData);
        toast.success('Cotação atualizada com sucesso!');
      } else {
        // When creating, create multiple records if there are extra ramos
        const ramosToCreate = [formData.ramo_id, ...ramosExtras.filter(r => r)];
        let createdCount = 0;

        for (const ramoId of ramosToCreate) {
          if (ramoId) {
            const segmento = getSegmentoByRamo(ramoId);
            const cotacaoData = {
              ...baseCotacaoData,
              ramo_id: ramoId,
              segmento: segmento || baseCotacaoData.segmento, // Use calculated segment or fallback to original
            };
            await createCotacao(cotacaoData);
            createdCount++;
          }
        }

        if (createdCount === 1) {
          toast.success('Cotação criada com sucesso!');
        } else {
          toast.success(`${createdCount} cotações criadas com sucesso!`);
        }
      }
      
      // Call callback if provided
      if (onSaved) {
        onSaved();
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
                      {produtores.map(produtor => (
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
                      {produtores.map(produtor => (
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
                      {produtores.map(produtor => (
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
                      {seguradoras.map(seguradora => (
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
                      {ramos.map(ramo => (
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

              {/* Ramos Extras - Only show when creating new cotação */}
              {isCreating && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-muted-foreground">Ramos Extras (Opcional)</Label>
                    {ramosExtras.length < 3 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddRamoExtra}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar Ramo
                      </Button>
                    )}
                  </div>
                  
                  {ramosExtras.length > 0 && (
                    <div className="space-y-3">
                      {ramosExtras.map((ramoExtra, index) => (
                        <div key={index} className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Label htmlFor={`ramo_extra_${index}`}>Ramo Extra {index + 1}</Label>
                            <Select 
                              value={ramoExtra} 
                              onValueChange={(value) => handleRamoExtraChange(index, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o ramo" />
                              </SelectTrigger>
                              <SelectContent>
                                {ramos
                                  .filter(ramo => ramo.id !== formData.ramo_id && !ramosExtras.includes(ramo.id))
                                  .map(ramo => (
                                    <SelectItem key={ramo.id} value={ramo.id}>
                                      {ramo.descricao}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveRamoExtra(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">
                          <strong>Importante:</strong> Ao criar a cotação, será gerado um registro independente 
                          para cada ramo selecionado (principal + extras), com todos os outros dados idênticos.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                      {captacao.map(capt => (
                        <SelectItem key={capt.id} value={capt.id}>
                          {capt.descricao}
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
                      {statusSeguradora.map(status => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.descricao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Motivo Recusa - Condicional */}
              {(() => {
                const selectedStatus = statusSeguradora.find(s => s.id === formData.status_seguradora_id);
                return selectedStatus?.descricao?.toLowerCase().includes('recus') && (
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
                );
              })()}

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
                       <SelectItem value="Nova">Nova</SelectItem>
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
                       <SelectItem value="Em análise">Em análise</SelectItem>
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

              {/* Campos condicionais para Negócio Fechado */}
              {formData.status === 'Negócio fechado' && (
                <>
                   {/* Vigência */}
                   <div className="grid gap-4 md:grid-cols-3">
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

                   {/* Número da Apólice e Valor do Prêmio */}
                   <div className="grid gap-4 md:grid-cols-2">
                     <div>
                       <Label htmlFor="num_apolice">Número da Apólice *</Label>
                       <Input
                         value={formData.num_apolice || ''}
                         onChange={(e) => handleInputChange('num_apolice', e.target.value)}
                         placeholder="Digite o número da apólice"
                         readOnly={isReadOnly}
                       />
                     </div>
                     
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
                   </div>
                </>
              )}

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
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-muted-foreground">Anexos</h3>
                {!isReadOnly && (
                  <label className="cursor-pointer">
                    <Button variant="outline" className="gap-2" asChild>
                      <span>
                        <Upload className="h-4 w-4" />
                        Importar Arquivo
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          toast.success('Funcionalidade de anexos será implementada');
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                <Paperclip className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground mt-2">
                  Nenhum arquivo anexado
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="comentarios" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground">Comentários</h3>
              </div>
              <div>
                <Textarea
                  value={formData.comentarios}
                  onChange={(e) => handleInputChange('comentarios', e.target.value)}
                  placeholder="Adicione seus comentários sobre esta cotação..."
                  className="min-h-[150px]"
                  readOnly={isReadOnly}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="historico" className="space-y-6 mt-6">
            <div className="text-center py-12">
              <History className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-sm font-medium text-muted-foreground">Histórico</h3>
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