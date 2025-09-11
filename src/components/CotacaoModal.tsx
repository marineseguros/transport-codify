import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatCPFCNPJ } from '@/utils/csvUtils';
import { useProfiles, useSeguradoras, useCotacoes, type Cotacao } from '@/hooks/useSupabaseData';

interface CotacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  cotacao?: Cotacao;
}

const CotacaoModal: React.FC<CotacaoModalProps> = ({ isOpen, onClose, cotacao }) => {
  const { profiles } = useProfiles();
  const { seguradoras } = useSeguradoras();
  const { createCotacao, updateCotacao } = useCotacoes();

  const [formData, setFormData] = useState({
    segurado: '',
    cpf_cnpj: '',
    produtor_origem_id: '',
    produtor_negociador_id: '',
    produtor_cotador_id: '',
    seguradora_id: '',
    segmento: '',
    valor_premio: '',
    status: 'Em análise',
    observacoes: ''
  });

  useEffect(() => {
    if (cotacao) {
      setFormData({
        segurado: cotacao.segurado || '',
        cpf_cnpj: cotacao.cpf_cnpj || '',
        produtor_origem_id: cotacao.produtor_origem_id || '',
        produtor_negociador_id: cotacao.produtor_negociador_id || '',
        produtor_cotador_id: cotacao.produtor_cotador_id || '',
        seguradora_id: cotacao.seguradora_id || '',
        segmento: cotacao.segmento || '',
        valor_premio: cotacao.valor_premio?.toString() || '',
        status: cotacao.status || 'Em análise',
        observacoes: cotacao.observacoes || ''
      });
    } else {
      setFormData({
        segurado: '',
        cpf_cnpj: '',
        produtor_origem_id: '',
        produtor_negociador_id: '',
        produtor_cotador_id: '',
        seguradora_id: '',
        segmento: '',
        valor_premio: '',
        status: 'Em análise',
        observacoes: ''
      });
    }
  }, [cotacao]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.segurado.trim()) {
      toast.error('Nome do segurado é obrigatório');
      return;
    }

    if (!formData.cpf_cnpj.trim()) {
      toast.error('CPF/CNPJ é obrigatório');
      return;
    }

    try {
      const cotacaoData = {
        segurado: formData.segurado.trim(),
        cpf_cnpj: formData.cpf_cnpj.trim(),
        produtor_origem_id: formData.produtor_origem_id || undefined,
        produtor_negociador_id: formData.produtor_negociador_id || undefined,
        produtor_cotador_id: formData.produtor_cotador_id || undefined,
        seguradora_id: formData.seguradora_id || undefined,
        segmento: formData.segmento || undefined,
        valor_premio: parseFloat(formData.valor_premio) || 0,
        status: formData.status,
        observacoes: formData.observacoes || undefined
      };

      if (cotacao) {
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

  // Simple CNPJ formatting function
  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };
  const handleProdutorOrigemChange = (value: string) => {
    const profile = profiles.find(p => p.id === value);
    let segmento = '';
    
    // Map profile name to segment
    if (profile?.nome.toLowerCase().includes('transportador')) {
      segmento = 'TRANSPORTADOR';
    } else if (profile?.nome.toLowerCase().includes('embarcador')) {
      segmento = 'EMBARCADOR';
    }
    
    setFormData({
      ...formData,
      produtor_origem_id: value,
      segmento: segmento
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {cotacao ? 'Editar Cotação' : 'Nova Cotação'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Unidade - Fixed as Matriz */}
            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade *</Label>
              <Input
                value="Matriz"
                readOnly
                className="bg-muted"
              />
            </div>

            {/* CNPJ */}
            <div className="space-y-2">
              <Label htmlFor="cpf_cnpj">CNPJ *</Label>
              <Input
                id="cpf_cnpj"
                value={formData.cpf_cnpj}
                onChange={(e) => setFormData({ ...formData, cpf_cnpj: formatCPFCNPJ(e.target.value) })}
                placeholder="00.000.000/0000-00"
                maxLength={18}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-1">
            {/* Segurado Field - Now editable (GREEN) */}
            <div className="space-y-2">
              <Label htmlFor="segurado">Segurado *</Label>
              <Input
                id="segurado"
                value={formData.segurado}
                onChange={(e) => setFormData({ ...formData, segurado: e.target.value })}
                placeholder="Digite o nome do segurado"
                className="border-2 border-green-200 bg-green-50 focus:border-green-400"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Produtor Origem */}
            <div className="space-y-2">
              <Label htmlFor="produtor_origem">Produtor Origem *</Label>
              <Select 
                value={formData.produtor_origem_id} 
                onValueChange={handleProdutorOrigemChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produtor origem" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Produtor Negociador */}
            <div className="space-y-2">
              <Label htmlFor="produtor_negociador">Produtor Negociador *</Label>
              <Select 
                value={formData.produtor_negociador_id} 
                onValueChange={(value) => setFormData({ ...formData, produtor_negociador_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produtor negociador" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Produtor Cotador */}
            <div className="space-y-2">
              <Label htmlFor="produtor_cotador">Produtor Cotador *</Label>
              <Select 
                value={formData.produtor_cotador_id} 
                onValueChange={(value) => setFormData({ ...formData, produtor_cotador_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produtor cotador" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Seguradora */}
            <div className="space-y-2">
              <Label htmlFor="seguradora">Seguradora *</Label>
              <Select 
                value={formData.seguradora_id} 
                onValueChange={(value) => setFormData({ ...formData, seguradora_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a seguradora" />
                </SelectTrigger>
                <SelectContent>
                  {seguradoras.map((seguradora) => (
                    <SelectItem key={seguradora.id} value={seguradora.id}>
                      {seguradora.codigo} - {seguradora.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Segmento - Auto-filled */}
            <div className="space-y-2">
              <Label htmlFor="segmento">Segmento</Label>
              <Input
                id="segmento"
                value={formData.segmento}
                onChange={(e) => setFormData({ ...formData, segmento: e.target.value })}
                placeholder="Será preenchido automaticamente ou digite manualmente"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Valor do Prêmio */}
            <div className="space-y-2">
              <Label htmlFor="valor_premio">Valor do Prêmio</Label>
              <Input
                id="valor_premio"
                type="number"
                step="0.01"
                value={formData.valor_premio}
                onChange={(e) => setFormData({ ...formData, valor_premio: e.target.value })}
                placeholder="0,00"
              />
            </div>

            {/* Status da Seguradora - Not mandatory */}
            <div className="space-y-2">
              <Label htmlFor="status">Status da Seguradora</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Em análise">Em análise</SelectItem>
                  <SelectItem value="Aguardando cliente">Aguardando cliente</SelectItem>
                  <SelectItem value="Negócio fechado">Negócio fechado</SelectItem>
                  <SelectItem value="Cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {cotacao ? 'Atualizar' : 'Criar'} Cotação
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export { CotacaoModal };