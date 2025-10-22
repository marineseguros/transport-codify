import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Produtor } from '@/types';

interface ProdutorModalProps {
  produtor: Produtor | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProdutorModal({ produtor, isOpen, onClose, onSuccess }: ProdutorModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    codigo_prod: '',
  });

  useEffect(() => {
    if (produtor) {
      setFormData({
        nome: produtor.nome || '',
        email: produtor.email || '',
        telefone: produtor.telefone || '',
        codigo_prod: produtor.codigo_prod || '',
      });
    } else {
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        codigo_prod: '',
      });
    }
  }, [produtor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (produtor) {
        // Update existing
        const { error } = await supabase
          .from('produtores')
          .update({
            nome: formData.nome,
            email: formData.email,
            telefone: formData.telefone,
            codigo_prod: formData.codigo_prod,
          })
          .eq('id', produtor.id);

        if (error) throw error;
        toast.success('Produtor atualizado com sucesso!');
      } else {
        // Create new
        const { error } = await supabase
          .from('produtores')
          .insert({
            nome: formData.nome,
            email: formData.email,
            telefone: formData.telefone,
            codigo_prod: formData.codigo_prod,
            papel: 'Produtor',
            ativo: true,
          });

        if (error) throw error;
        toast.success('Produtor criado com sucesso!');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving produtor:', error);
      toast.error(error.message || 'Erro ao salvar produtor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{produtor ? 'Editar' : 'Novo'} Produtor</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="codigo_prod">Código do Produtor</Label>
            <Input
              id="codigo_prod"
              value={formData.codigo_prod}
              onChange={(e) => setFormData({ ...formData, codigo_prod: e.target.value })}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
