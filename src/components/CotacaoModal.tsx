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
import { CotacaoTRN, CotacaoStatus, CotacaoTipo } from "@/types";
import { 
  MOCK_CLIENTES, MOCK_PRODUTORES, MOCK_SEGURADORAS, 
  MOCK_RAMOS, MOCK_CAPTACAO, MOCK_STATUS_SEGURADORA 
} from "@/data/mockData";
import { toast } from "@/hooks/use-toast";
import { Save, X, FileText, MessageSquare, History, Paperclip, Upload, Download } from "lucide-react";
import { exportToCsv, parseCsvFile } from "@/utils/csvUtils";

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
        unidade: 'Matriz',
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

    // Habilita motivo recusa quando status seguradora é RECUSA
    if (field === 'status_seguradora_id' && value !== '5') {
      setFormData(prev => ({
        ...prev,
        [field]: value,
        motivo_recusa: undefined
      }));
    }

    // Auto preencher segmento baseado no ramo selecionado
    if (field === 'ramo_id') {
      const ramo = MOCK_RAMOS.find(r => r.id === value);
      // Pode ser usado para filtrar seguradoras se necessário
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
    const requiredFields = [
      { field: 'unidade', message: 'Selecione uma unidade.' },
      { field: 'produtor_origem_id', message: 'Selecione o produtor origem.' },
      { field: 'produtor_negociador_id', message: 'Selecione o produtor negociador.' },
      { field: 'produtor_cotador_id', message: 'Selecione o produtor cotador.' },
      { field: 'cnpj', message: 'Informe o CNPJ.' },
      { field: 'segurado', message: 'Informe o segurado.' },
      { field: 'seguradora_id', message: 'Selecione uma seguradora.' },
      { field: 'ramo_id', message: 'Selecione um ramo.' },
      { field: 'captacao_id', message: 'Selecione uma captação.' },
      { field: 'status_seguradora_id', message: 'Selecione o status da seguradora.' }
    ];

    for (const { field, message } of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        toast({
          title: "Campo obrigatório",
          description: message,
          variant: "destructive",
        });
        return;
      }
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

    if (formData.status_seguradora_id === '5' && !formData.motivo_recusa) {
      toast({
        title: "Campo obrigatório",
        description: "Motivo da recusa é obrigatório quando o status da seguradora é 'RECUSA'.",
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

  const handleExportCsv = () => {
    const data = cotacao ? [cotacao] : [];
    exportToCsv(data, `cotacao_${cotacao?.id || 'nova'}.csv`);
  };

  const handleImportCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseCsvFile(file);
      console.log('Dados importados:', data);
      
      toast({
        title: "Importação concluída",
        description: `${data.length} registros importados com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro na importação",
        description: "Erro ao processar o arquivo CSV.",
        variant: "destructive",
      });
    }
  };

  const getSegmentoByRamo = (ramoId: string) => {
    const ramo = MOCK_RAMOS.find(r => r.id === ramoId);
    return ramo?.segmento;
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
              Cotação #{cotacao.id} • {cotacao.segurado}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* CSV Actions */}
        <div className="flex justify-end gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <label className="cursor-pointer">
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Importar CSV
              </span>
            </Button>
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCsv}
              className="hidden"
            />
          </label>
        </div>

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
                    value={formData.unidade || 'Matriz'} 
                    onValueChange={(value: 'Matriz' | 'Filial') => handleInputChange('unidade', value)}
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
                    value={formData.cnpj || ''}
                    onChange={(e) => handleInputChange('cnpj', e.target.value)}
                    placeholder="00.000.000/0000-00"
                    readOnly={isReadOnly}
                  />
                </div>

                <div>
                  <Label htmlFor="segurado">Segurado *</Label>
                  <Input
                    value={formData.segurado || ''}
                    onChange={(e) => handleInputChange('segurado', e.target.value)}
                    placeholder="Nome do segurado"
                    readOnly={isReadOnly}
                  />
                </div>
              </div>


              {/* Produtores */}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="produtor_origem_id">Produtor Origem *</Label>
                  <Select 
                    value={formData.produtor_origem_id || ''} 
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
                    value={formData.produtor_negociador_id || ''} 
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
                    value={formData.produtor_cotador_id || ''} 
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

              {/* Seguradora e Ramo */}
              <div className="grid gap-4 md:grid-cols-2">
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
                          {seguradora.codigo} - {seguradora.nome}
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
                          {ramo.codigo} - {ramo.descricao} ({ramo.segmento})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Captação e Status Seguradora */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="captacao_id">Captação *</Label>
                  <Select 
                    value={formData.captacao_id || ''} 
                    onValueChange={(value) => handleInputChange('captacao_id', value)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a captação" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_CAPTACAO.map(captacao => (
                        <SelectItem key={captacao.id} value={captacao.id}>
                          {captacao.codigo} - {captacao.descricao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status_seguradora_id">Status da Seguradora *</Label>
                  <Select 
                    value={formData.status_seguradora_id || ''} 
                    onValueChange={(value) => handleInputChange('status_seguradora_id', value)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status da seguradora" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_STATUS_SEGURADORA.map(status => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.codigo} - {status.descricao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Motivo Recusa - Condicional */}
              {formData.status_seguradora_id === '5' && (
                <div>
                  <Label htmlFor="motivo_recusa">Motivo da Recusa *</Label>
                  <Textarea
                    value={formData.motivo_recusa || ''}
                    onChange={(e) => handleInputChange('motivo_recusa', e.target.value)}
                    placeholder="Descreva o motivo da recusa..."
                    rows={3}
                    readOnly={isReadOnly}
                  />
                </div>
              )}

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
                      <SelectItem value="Migração">Migração</SelectItem>
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