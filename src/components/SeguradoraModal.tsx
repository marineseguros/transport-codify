import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Seguradora } from '@/types';

interface SeguradoraModalProps {
  seguradora: Seguradora | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SeguradoraModal({ seguradora, isOpen, onClose, onSuccess }: SeguradoraModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
  });

  useEffect(() => {
    if (seguradora) {
      setFormData({
        nome: seguradora.nome || '',
        codigo: seguradora.codigo || '',
      });
    } else {
      setFormData({
        nome: '',
        codigo: '',
      });
    }
  }, [seguradora]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (seguradora) {
        // Update existing
        const { error } = await supabase
          .from('seguradoras')
          .update({
            nome: formData.nome,
            codigo: formData.codigo,
          })
          .eq('id', seguradora.id);

        if (error) throw error;
        toast.success('Seguradora atualizada com sucesso!');
      } else {
        // Create new
        const { error } = await supabase
          .from('seguradoras')
          .insert({
            nome: formData.nome,
            codigo: formData.codigo,
            ativo: true,
          });

        if (error) throw error;
        toast.success('Seguradora criada com sucesso!');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving seguradora:', error);
      toast.error(error.message || 'Erro ao salvar seguradora');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{seguradora ? 'Editar' : 'Nova'} Seguradora</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="codigo">Código *</Label>
            <Input
              id="codigo"
              value={formData.codigo}
              onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
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
