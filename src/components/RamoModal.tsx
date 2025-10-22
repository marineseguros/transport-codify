import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Ramo } from '@/types';

interface RamoModalProps {
  ramo: Ramo | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RamoModal({ ramo, isOpen, onClose, onSuccess }: RamoModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    codigo: '',
    descricao: '',
  });

  useEffect(() => {
    if (ramo) {
      setFormData({
        codigo: ramo.codigo || '',
        descricao: ramo.descricao || '',
      });
    } else {
      setFormData({
        codigo: '',
        descricao: '',
      });
    }
  }, [ramo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (ramo) {
        // Update existing
        const { error } = await supabase
          .from('ramos')
          .update({
            codigo: formData.codigo,
            descricao: formData.descricao,
          })
          .eq('id', ramo.id);

        if (error) throw error;
        toast.success('Ramo atualizado com sucesso!');
      } else {
        // Create new
        const { error } = await supabase
          .from('ramos')
          .insert({
            codigo: formData.codigo,
            descricao: formData.descricao,
            ativo: true,
          });

        if (error) throw error;
        toast.success('Ramo criado com sucesso!');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving ramo:', error);
      toast.error(error.message || 'Erro ao salvar ramo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{ramo ? 'Editar' : 'Novo'} Ramo</DialogTitle>
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
            <Label htmlFor="descricao">Descrição *</Label>
            <Input
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
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
