import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Cliente } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { clienteSchema } from '@/lib/validations';
import { Textarea } from '@/components/ui/textarea';
import { useCaptacao } from '@/hooks/useSupabaseData';

interface ClienteModalProps {
  cliente?: Cliente | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export const ClienteModal: React.FC<ClienteModalProps> = ({
  cliente,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { toast } = useToast();
  const { captacao, loading: loadingCaptacao } = useCaptacao();
  const [formData, setFormData] = useState({
    segurado: '',
    cpf_cnpj: '',
    email: '',
    telefone: '',
    cidade: '',
    uf: '',
    observacoes: '',
    captacao_id: '',
  });

  useEffect(() => {
    if (cliente) {
      setFormData({
        segurado: cliente.segurado,
        cpf_cnpj: cliente.cpf_cnpj,
        email: cliente.email || '',
        telefone: cliente.telefone || '',
        cidade: cliente.cidade || '',
        uf: cliente.uf || '',
        observacoes: cliente.observacoes || '',
        captacao_id: cliente.captacao_id || '',
      });
    } else {
      setFormData({
        segurado: '',
        cpf_cnpj: '',
        email: '',
        telefone: '',
        cidade: '',
        uf: '',
        observacoes: '',
        captacao_id: '',
      });
    }
  }, [cliente, isOpen]);

  const formatCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatTelefone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const handleInputChange = (field: string, value: string) => {
    let formattedValue = value;
    
    if (field === 'cpf_cnpj') {
      formattedValue = formatCpfCnpj(value);
    } else if (field === 'telefone') {
      formattedValue = formatTelefone(value);
    }

    setFormData(prev => ({ ...prev, [field]: formattedValue }));
  };

  const validateCpfCnpj = (cpfCnpj: string) => {
    const numbers = cpfCnpj.replace(/\D/g, '');
    return numbers.length === 11 || numbers.length === 14;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate with zod schema
    const validationResult = clienteSchema.safeParse(formData);
    
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast({
        title: "Erro de validação",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    try {
      const clienteData = {
        segurado: validationResult.data.segurado,
        cpf_cnpj: validationResult.data.cpf_cnpj,
        email: validationResult.data.email || null,
        telefone: validationResult.data.telefone || null,
        cidade: validationResult.data.cidade || null,
        uf: validationResult.data.uf || null,
        observacoes: validationResult.data.observacoes || null,
        captacao_id: validationResult.data.captacao_id || null,
      };

      if (cliente) {
        // Update existing client
        const { error } = await supabase
          .from('clientes')
          .update(clienteData)
          .eq('id', cliente.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Cliente atualizado com sucesso",
        });
      } else {
        // Create new client
        const { error } = await supabase
          .from('clientes')
          .insert([clienteData]);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Cliente criado com sucesso",
        });
      }

      onSuccess?.();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar cliente. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {cliente ? 'Editar Cliente' : 'Novo Cliente'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="segurado">Razão Social / Nome *</Label>
              <Input
                id="segurado"
                value={formData.segurado}
                onChange={(e) => handleInputChange('segurado', e.target.value)}
                placeholder="Nome da empresa ou pessoa física"
                required
              />
            </div>

            <div>
              <Label htmlFor="cpf_cnpj">CPF/CNPJ *</Label>
              <Input
                id="cpf_cnpj"
                value={formData.cpf_cnpj}
                onChange={(e) => handleInputChange('cpf_cnpj', e.target.value)}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="contato@empresa.com"
              />
            </div>

            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => handleInputChange('telefone', e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={formData.cidade}
                onChange={(e) => handleInputChange('cidade', e.target.value)}
                placeholder="Nome da cidade"
              />
            </div>

            <div>
              <Label htmlFor="uf">UF</Label>
              <Select value={formData.uf} onValueChange={(value) => handleInputChange('uf', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estado" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map(estado => (
                    <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="captacao_id">Captação</Label>
              <Select 
                value={formData.captacao_id} 
                onValueChange={(value) => handleInputChange('captacao_id', value)}
                disabled={loadingCaptacao}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a captação" />
                </SelectTrigger>
                <SelectContent>
                  {captacao
                    .filter(c => c.ativo)
                    .map(cap => (
                      <SelectItem key={cap.id} value={cap.id}>
                        {cap.descricao}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="observacoes">Informações Adicionais / Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => handleInputChange('observacoes', e.target.value)}
                placeholder="Lembretes ou observações sobre o cliente..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" />
              {cliente ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};