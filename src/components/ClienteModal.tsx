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

interface ClienteModalProps {
  cliente?: Cliente | null;
  isOpen: boolean;
  onClose: () => void;
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
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    segurado: '',
    cpf_cnpj: '',
    email: '',
    telefone: '',
    inscricao_estadual: '',
    cidade: '',
    uf: '',
  });

  useEffect(() => {
    if (cliente) {
      setFormData({
        segurado: cliente.segurado,
        cpf_cnpj: cliente.cpf_cnpj,
        email: cliente.email || '',
        telefone: cliente.telefone || '',
        inscricao_estadual: cliente.inscricao_estadual || '',
        cidade: cliente.cidade || '',
        uf: cliente.uf || '',
      });
    } else {
      setFormData({
        segurado: '',
        cpf_cnpj: '',
        email: '',
        telefone: '',
        inscricao_estadual: '',
        cidade: '',
        uf: '',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.segurado.trim()) {
      toast({
        title: "Erro",
        description: "Nome do segurado é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!formData.cpf_cnpj.trim()) {
      toast({
        title: "Erro",
        description: "CPF/CNPJ é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!validateCpfCnpj(formData.cpf_cnpj)) {
      toast({
        title: "Erro",
        description: "CPF/CNPJ inválido",
        variant: "destructive",
      });
      return;
    }

    // Here you would typically save to your backend or state management
    toast({
      title: "Sucesso",
      description: cliente ? "Cliente atualizado com sucesso" : "Cliente criado com sucesso",
    });
    
    onClose();
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
              <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
              <Input
                id="inscricao_estadual"
                value={formData.inscricao_estadual}
                onChange={(e) => handleInputChange('inscricao_estadual', e.target.value)}
                placeholder="Número da IE"
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