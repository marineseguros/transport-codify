import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, X, FileText, MessageSquare, History, Paperclip, Upload, Plus, Trash2 } from "lucide-react";
import { formatCPFCNPJ } from "@/utils/csvUtils";
import { useAuth } from "@/contexts/AuthContext";
import { useProfiles, useSeguradoras, useClientes, useCotacoes, useProdutores, useRamos, useCaptacao, useStatusSeguradora, useUnidades, type Cotacao } from '@/hooks/useSupabaseData';
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
  const {
    user
  } = useAuth();
  const {
    profiles
  } = useProfiles();
  const {
    produtores,
    loading: produtoresLoading,
    refetch: refetchProdutores
  } = useProdutores();
  const {
    seguradoras
  } = useSeguradoras();
  const {
    ramos
  } = useRamos();
  const {
    captacao
  } = useCaptacao();
  const {
    statusSeguradora
  } = useStatusSeguradora();
  const {
    unidades
  } = useUnidades();
  const {
    clientes
  } = useClientes();
  const {
    cotacoes,
    createCotacao,
    updateCotacao
  } = useCotacoes();
  const [formData, setFormData] = useState({
    cliente_id: '',
    unidade_id: '',
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
    status: 'Em cotação',
    observacoes: '',
    segmento: '',
    data_fechamento: undefined as string | undefined,
    num_proposta: undefined as string | undefined,
    motivo_recusa: '',
    comentarios: ''
  });

  // State for extra ramos (up to 3 additional)
  const [ramosExtras, setRamosExtras] = useState<{
    ramo_id: string;
    segmento: string;
  }[]>([]);

  // State for extra seguradoras (up to 10 additional)
  const [seguradorasExtras, setSeguradorasExtras] = useState<{
    seguradora_id: string;
  }[]>([]);
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
        unidade_id: cotacao.unidade_id || '',
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
        num_proposta: cotacao.num_proposta || undefined,
        motivo_recusa: cotacao.motivo_recusa || '',
        comentarios: cotacao.comentarios || ''
      });
    } else if (isCreating) {
      const hoje = new Date();
      const inicioVigencia = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
      const fimVigencia = new Date(inicioVigencia.getTime() + 365 * 24 * 60 * 60 * 1000);

      // Find current user in produtores list to set as default cotador
      // Try to match by email first, then by name if available
      const currentUserProdutor = produtores.find(p => p.email && user?.email && p.email.toLowerCase() === user.email.toLowerCase() || p.nome && user?.nome && p.nome.toLowerCase().includes(user.nome.toLowerCase())) || produtores[0]; // Fallback to first produtor if no match

      setFormData({
        cliente_id: '',
        unidade_id: '',
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
        status: 'Em cotação',
        observacoes: '',
        segmento: '',
        data_fechamento: undefined,
        num_proposta: undefined,
        motivo_recusa: '',
        comentarios: ''
      });

      // Reset extra ramos and seguradoras when creating new cotação
      setRamosExtras([]);
      setSeguradorasExtras([]);
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
        num_proposta: undefined
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
      setRamosExtras([...ramosExtras, {
        ramo_id: '',
        segmento: ''
      }]);
    }
  };
  const handleRemoveRamoExtra = (index: number) => {
    setRamosExtras(ramosExtras.filter((_, i) => i !== index));
  };
  const handleRamoExtraChange = (index: number, value: string) => {
    const segmento = getSegmentoByRamo(value);
    const newRamosExtras = [...ramosExtras];
    newRamosExtras[index] = {
      ramo_id: value,
      segmento: segmento
    };
    setRamosExtras(newRamosExtras);
  };

  const handleAddSeguradoraExtra = () => {
    if (seguradorasExtras.length < 10) {
      setSeguradorasExtras([...seguradorasExtras, {
        seguradora_id: ''
      }]);
    }
  };

  const handleRemoveSeguradoraExtra = (index: number) => {
    setSeguradorasExtras(seguradorasExtras.filter((_, i) => i !== index));
  };

  const handleSeguradoraExtraChange = (index: number, value: string) => {
    const newSeguradorasExtras = [...seguradorasExtras];
    newSeguradorasExtras[index] = {
      seguradora_id: value
    };
    setSeguradorasExtras(newSeguradorasExtras);
  };
  const handleSave = async () => {
    // Basic validations
    const requiredFields = [{
      field: 'unidade_id',
      message: 'Selecione uma unidade.'
    }, {
      field: 'cnpj',
      message: 'Informe o CNPJ.'
    }, {
      field: 'segurado',
      message: 'Informe o segurado.'
    }];
    for (const {
      field,
      message
    } of requiredFields) {
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
      if (!formData.num_proposta) {
        toast.error("Número da proposta é obrigatório para negócios fechados.");
        return;
      }
    }

    // Validate motivo_recusa for "Declinado" status
    if (formData.status === 'Declinado') {
      if (!formData.motivo_recusa || formData.motivo_recusa.trim() === '') {
        toast.error("Selecione pelo menos um motivo da recusa.");
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
        cliente_id: formData.cliente_id || undefined,
        unidade_id: formData.unidade_id || undefined,
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
        num_proposta: formData.status === 'Negócio fechado' ? formData.num_proposta : undefined
      };
      if (cotacao && isEditing) {
        // When editing, just update the single record
        const cotacaoData = {
          ...baseCotacaoData,
          ramo_id: formData.ramo_id || undefined
        };
        await updateCotacao(cotacao.id, cotacaoData);
        toast.success('Cotação atualizada com sucesso!');
      } else {
        // When creating, create multiple records for combinations of ramos and seguradoras
        const ramosToCreate = [{
          ramo_id: formData.ramo_id,
          segmento: formData.segmento
        }, ...ramosExtras.filter(r => r.ramo_id)];
        
        const seguradorasToCreate = [{
          seguradora_id: formData.seguradora_id
        }, ...seguradorasExtras.filter(s => s.seguradora_id)];
        
        let createdCount = 0;
        for (const ramoData of ramosToCreate) {
          if (ramoData.ramo_id) {
            for (const seguradoraData of seguradorasToCreate) {
              if (seguradoraData.seguradora_id) {
                const cotacaoData = {
                  ...baseCotacaoData,
                  ramo_id: ramoData.ramo_id,
                  segmento: ramoData.segmento,
                  seguradora_id: seguradoraData.seguradora_id
                };
                await createCotacao(cotacaoData);
                createdCount++;
              }
            }
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
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isCreating && "Nova Cotação"}
            {isEditing && "Editar Cotação"}
            {mode === 'view' && "Detalhes da Cotação"}
          </DialogTitle>
          {cotacao && mode === 'view' && <DialogDescription>
              Cotação #{cotacao.numero_cotacao} • {cotacao.segurado}
            </DialogDescription>}
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
                  <Select value={formData.unidade_id} onValueChange={value => handleInputChange('unidade_id', value)} disabled={isReadOnly}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades.map(unidade => <SelectItem key={unidade.id} value={unidade.id}>
                          {unidade.descricao}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="cliente_id">Segurado *</Label>
                  <Select value={formData.cliente_id} onValueChange={value => handleInputChange('cliente_id', value)} disabled={isReadOnly}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente">
                        {formData.cliente_id ? clientes.find(c => c.id === formData.cliente_id)?.segurado : "Selecione o cliente"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map(cliente => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          <div>
                            <div className="font-medium">{cliente.segurado}</div>
                            <div className="text-sm text-muted-foreground">{cliente.cpf_cnpj}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input value={formData.cnpj} onChange={e => handleInputChange('cnpj', formatCPFCNPJ(e.target.value))} placeholder="00.000.000/0000-00" readOnly={isReadOnly} />
                </div>
              </div>

              {/* Produtores */}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="produtor_origem_id">Produtor Origem *</Label>
                  <Select value={formData.produtor_origem_id} onValueChange={value => handleInputChange('produtor_origem_id', value)} disabled={isReadOnly}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o produtor origem" />
                    </SelectTrigger>
                    <SelectContent>
                      {produtores.map(produtor => <SelectItem key={produtor.id} value={produtor.id}>
                          {produtor.nome}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="produtor_negociador_id">Produtor Negociador *</Label>
                  <Select value={formData.produtor_negociador_id} onValueChange={value => handleInputChange('produtor_negociador_id', value)} disabled={isReadOnly}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o produtor negociador" />
                    </SelectTrigger>
                    <SelectContent>
                      {produtores.map(produtor => <SelectItem key={produtor.id} value={produtor.id}>
                          {produtor.nome}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="produtor_cotador_id">Produtor Cotador *</Label>
                  <Select value={formData.produtor_cotador_id} onValueChange={value => handleInputChange('produtor_cotador_id', value)} disabled={isReadOnly}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o produtor cotador" />
                    </SelectTrigger>
                    <SelectContent>
                      {produtores.map(produtor => <SelectItem key={produtor.id} value={produtor.id}>
                          {produtor.nome}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Seguradora, Ramo e Segmento - Agora em 2 colunas */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Coluna 1: Seguradora */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="seguradora_id">Seguradora *</Label>
                    {isCreating && seguradorasExtras.length < 10 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        className="h-6 w-6"
                        onClick={handleAddSeguradoraExtra}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Select value={formData.seguradora_id} onValueChange={value => handleInputChange('seguradora_id', value)} disabled={isReadOnly}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a seguradora" />
                    </SelectTrigger>
                    <SelectContent>
                      {seguradoras.map(seguradora => <SelectItem key={seguradora.id} value={seguradora.id}>
                          {seguradora.nome}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                  
                  {/* Seguradoras Extras */}
                  {isCreating && seguradorasExtras.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {seguradorasExtras.map((seguradoraExtra, index) => (
                        <div key={index} className="flex items-center gap-1 bg-muted/50 rounded-md p-1.5 min-w-[180px] flex-1 h-10">
                          <Select 
                            value={seguradoraExtra.seguradora_id} 
                            onValueChange={value => handleSeguradoraExtraChange(index, value)}
                          >
                            <SelectTrigger className="h-7 text-xs border-0 bg-transparent">
                              <SelectValue placeholder="Seguradora" />
                            </SelectTrigger>
                            <SelectContent>
                              {seguradoras.filter(seguradora => {
                                if (seguradora.id === seguradoraExtra.seguradora_id) return true;
                                if (seguradora.id === formData.seguradora_id) return false;
                                const otherSelectedSeguradoras = seguradorasExtras
                                  .map((s, i) => i !== index ? s.seguradora_id : null)
                                  .filter(Boolean);
                                return !otherSelectedSeguradoras.includes(seguradora.id);
                              }).map(seguradora => (
                                <SelectItem key={seguradora.id} value={seguradora.id}>
                                  {seguradora.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon"
                            className="h-6 w-6 flex-shrink-0 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveSeguradoraExtra(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Coluna 2: Ramo + Segmento */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Ramo * / Segmento</Label>
                    {isCreating && ramosExtras.length < 3 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        className="h-6 w-6"
                        onClick={handleAddRamoExtra}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Ramo e Segmento principal em grid */}
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <Select value={formData.ramo_id} onValueChange={value => handleInputChange('ramo_id', value)} disabled={isReadOnly}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o ramo" />
                      </SelectTrigger>
                      <SelectContent>
                        {ramos.map(ramo => <SelectItem key={ramo.id} value={ramo.id}>
                            {ramo.descricao}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                    
                    <div className="flex items-center bg-muted/30 rounded-md px-3 min-w-[140px]">
                      <span className="text-sm text-muted-foreground">
                        {formData.segmento || '-'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Ramos Extras - Layout responsivo */}
                  {isCreating && ramosExtras.length > 0 && (
                    <div className="grid grid-cols-[1fr_auto] gap-2 mt-2">
                      {ramosExtras.map((ramoExtra, index) => (
                        <>
                          <div key={`ramo-${index}`} className="flex items-center gap-1 bg-muted/50 rounded-md p-1.5">
                            <Select 
                              value={ramoExtra.ramo_id} 
                              onValueChange={value => handleRamoExtraChange(index, value)}
                            >
                              <SelectTrigger className="h-7 text-xs border-0 bg-transparent">
                                <SelectValue placeholder="Ramo" />
                              </SelectTrigger>
                              <SelectContent>
                                {ramos.filter(ramo => {
                                  if (ramo.id === ramoExtra.ramo_id) return true;
                                  if (ramo.id === formData.ramo_id) return false;
                                  const otherSelectedRamos = ramosExtras
                                    .map((r, i) => i !== index ? r.ramo_id : null)
                                    .filter(Boolean);
                                  return !otherSelectedRamos.includes(ramo.id);
                                }).map(ramo => (
                                  <SelectItem key={ramo.id} value={ramo.id}>
                                    {ramo.descricao}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon"
                              className="h-6 w-6 flex-shrink-0 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveRamoExtra(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <div key={`segmento-${index}`} className="flex items-center bg-muted/30 rounded-md px-3 h-10">
                            <span className="text-xs text-muted-foreground">
                              {ramoExtra.segmento || '-'}
                            </span>
                          </div>
                        </>
                      ))}
                    </div>
                  )}
                </div>
              </div>


              {/* Info box about multiple cotações creation */}
              {isCreating && (seguradorasExtras.length > 0 || ramosExtras.length > 0) && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Importante:</strong> Ao criar a cotação, será gerado um registro independente 
                    para cada combinação de ramo e seguradora selecionados, com todos os outros dados idênticos.
                  </p>
                </div>
              )}


              {/* Captação e Status Seguradora */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="captacao_id">Captação *</Label>
                  <Select value={formData.captacao_id} onValueChange={value => handleInputChange('captacao_id', value)} disabled={isReadOnly}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a captação" />
                    </SelectTrigger>
                    <SelectContent>
                      {captacao.map(capt => <SelectItem key={capt.id} value={capt.id}>
                          {capt.descricao}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status_seguradora_id">Status da Seguradora</Label>
                  <Select value={formData.status_seguradora_id} onValueChange={value => handleInputChange('status_seguradora_id', value)} disabled={isReadOnly}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status da seguradora" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusSeguradora.map(status => <SelectItem key={status.id} value={status.id}>
                          {status.descricao}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Motivo Recusa - Condicional para Status Seguradora */}
              {(() => {
              const selectedStatus = statusSeguradora.find(s => s.id === formData.status_seguradora_id);
              return selectedStatus?.descricao?.toLowerCase().includes('recus') && <div>
                    <Label htmlFor="motivo_recusa">Motivo da Recusa</Label>
                    <Textarea value={formData.motivo_recusa} onChange={e => handleInputChange('motivo_recusa', e.target.value)} placeholder="Descreva o motivo da recusa..." className="min-h-[80px]" readOnly={isReadOnly} />
                  </div>;
            })()}

              {/* Tipo, Status e Data */}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Select value={formData.tipo} onValueChange={value => handleInputChange('tipo', value)} disabled={isReadOnly}>
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
                  <Select value={formData.status} onValueChange={value => handleInputChange('status', value)} disabled={isReadOnly}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Em cotação">Em cotação</SelectItem>
                        <SelectItem value="Negócio fechado">Negócio fechado</SelectItem>
                        <SelectItem value="Declinado">Declinado</SelectItem>
                        {mode === 'view' && <SelectItem value="Alocada Outra">Alocada Outra</SelectItem>}
                      </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="data_cotacao">Data da Cotação *</Label>
                  <Input type="date" value={formData.data_cotacao} onChange={e => handleInputChange('data_cotacao', e.target.value)} readOnly={isReadOnly} />
                </div>
              </div>

              {/* Motivos de Recusa - Checklist quando Status é "Declinado" */}
              {formData.status === 'Declinado' && <div className="space-y-3">
                  <Label>Motivo(s) da Recusa *</Label>
                  <div className="grid grid-cols-4 gap-3">
                    {['Relacionamento', 'Condição', 'Taxa', 'Sem proposta'].map(motivo => {
                      const motivosArray = formData.motivo_recusa ? formData.motivo_recusa.split(',').map(m => m.trim()) : [];
                      const isChecked = motivosArray.includes(motivo);
                      
                      return <div key={motivo} className="flex items-center space-x-2">
                          <input type="checkbox" id={`motivo_${motivo}`} checked={isChecked} onChange={e => {
                        const checked = e.target.checked;
                        let newMotivos = [...motivosArray];
                        
                        if (checked) {
                          newMotivos.push(motivo);
                        } else {
                          newMotivos = newMotivos.filter(m => m !== motivo);
                        }
                        
                        handleInputChange('motivo_recusa', newMotivos.join(', '));
                      }} disabled={isReadOnly} className="h-4 w-4 rounded border-primary text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2" />
                          <label htmlFor={`motivo_${motivo}`} className="text-sm cursor-pointer">
                            {motivo}
                          </label>
                        </div>;
                    })}
                  </div>
                </div>}

              {/* Campos condicionais para Negócio Fechado */}
              {formData.status === 'Negócio fechado' && <>
                   {/* Vigência */}
                   <div className="grid gap-4 md:grid-cols-3">
                     <div>
                       <Label htmlFor="data_fechamento">Data de Fechamento *</Label>
                       <Input type="date" value={formData.data_fechamento || ''} onChange={e => handleInputChange('data_fechamento', e.target.value)} readOnly={isReadOnly} />
                     </div>
                     
                     <div>
                       <Label htmlFor="inicio_vigencia">Início da Vigência</Label>
                       <Input type="date" value={formData.inicio_vigencia} onChange={e => handleInputChange('inicio_vigencia', e.target.value)} readOnly={isReadOnly} />
                     </div>

                     <div>
                       <Label htmlFor="fim_vigencia">Fim da Vigência</Label>
                       <Input type="date" value={formData.fim_vigencia} onChange={e => handleInputChange('fim_vigencia', e.target.value)} readOnly={isReadOnly} />
                     </div>
                   </div>

                   {/* Número da Apólice e Valor do Prêmio */}
                   <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="num_proposta">Número da Proposta *</Label>
                        <Input value={formData.num_proposta || ''} onChange={e => handleInputChange('num_proposta', e.target.value)} placeholder="Digite o número da proposta" readOnly={isReadOnly} />
                     </div>
                     
                     <div>
                       <Label htmlFor="valor_premio">Valor do Prêmio *</Label>
                       <Input type="number" step="0.01" value={formData.valor_premio} onChange={e => handleInputChange('valor_premio', parseFloat(e.target.value) || 0)} placeholder="0,00" readOnly={isReadOnly} />
                     </div>
                   </div>
                </>}

              {/* Observações */}
              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea value={formData.observacoes} onChange={e => handleInputChange('observacoes', e.target.value)} placeholder="Informações adicionais sobre a cotação..." className="min-h-[100px]" readOnly={isReadOnly} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="anexos" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-muted-foreground">Anexos</h3>
                {!isReadOnly && <label className="cursor-pointer">
                    <Button variant="outline" className="gap-2" asChild>
                      <span>
                        <Upload className="h-4 w-4" />
                        Importar Arquivo
                      </span>
                    </Button>
                    <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    toast.success('Funcionalidade de anexos será implementada');
                  }
                }} className="hidden" />
                  </label>}
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
                <Textarea value={formData.comentarios} onChange={e => handleInputChange('comentarios', e.target.value)} placeholder="Adicione seus comentários sobre esta cotação..." className="min-h-[150px]" readOnly={isReadOnly} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="historico" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground">Histórico do Cliente</h3>
              </div>
              
              {formData.cliente_id ? (
                (() => {
                  const clienteHistorico = cotacoes
                    .filter(c => c.cliente_id === formData.cliente_id && (!cotacao || c.id !== cotacao.id))
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                  
                  if (clienteHistorico.length === 0) {
                    return (
                      <div className="text-center py-8 border border-dashed border-muted-foreground/25 rounded-lg">
                        <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground mt-2">
                          Nenhuma cotação anterior encontrada para este cliente
                        </p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {clienteHistorico.length} cotação(ões) anterior(es) encontrada(s)
                      </p>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {clienteHistorico.map((historicoCotacao) => {
                          const seguradora = seguradoras.find(s => s.id === historicoCotacao.seguradora_id);
                          const ramo = ramos.find(r => r.id === historicoCotacao.ramo_id);
                          const statusBadgeColor = {
                            'Em cotação': 'bg-blue-100 text-blue-800',
                            'Negócio fechado': 'bg-green-100 text-green-800',
                            'Declinado': 'bg-red-100 text-red-800',
                            'Em análise': 'bg-yellow-100 text-yellow-800'
                          }[historicoCotacao.status] || 'bg-gray-100 text-gray-800';
                          
                          return (
                            <div key={historicoCotacao.id} className="border rounded-lg p-4 space-y-2 bg-muted/20">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">#{historicoCotacao.numero_cotacao}</span>
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusBadgeColor}`}>
                                    {historicoCotacao.status}
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(historicoCotacao.data_cotacao).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Seguradora:</span>{' '}
                                  <span className="font-medium">{seguradora?.nome || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Ramo:</span>{' '}
                                  <span className="font-medium">{ramo?.descricao || 'N/A'}</span>
                                </div>
                                {historicoCotacao.segmento && (
                                  <div>
                                    <span className="text-muted-foreground">Segmento:</span>{' '}
                                    <span className="font-medium">{historicoCotacao.segmento}</span>
                                  </div>
                                )}
                                {historicoCotacao.valor_premio > 0 && (
                                  <div>
                                    <span className="text-muted-foreground">Valor do Prêmio:</span>{' '}
                                    <span className="font-medium">
                                      {new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                      }).format(historicoCotacao.valor_premio)}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              {historicoCotacao.observacoes && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Observações:</span>{' '}
                                  <span className="text-muted-foreground">{historicoCotacao.observacoes}</span>
                                </div>
                              )}
                              
                              {historicoCotacao.motivo_recusa && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Motivo da Recusa:</span>{' '}
                                  <span className="text-red-600">{historicoCotacao.motivo_recusa}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-8 border border-dashed border-muted-foreground/25 rounded-lg">
                  <History className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground mt-2">
                    Selecione um cliente para visualizar o histórico de cotações
                  </p>
                </div>
              )}
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
            {!isReadOnly && <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                {isCreating ? 'Criar' : 'Salvar'} Cotação
              </Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>;
};