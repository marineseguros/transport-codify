import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Ramo } from '@/types';
import { Switch } from '@/components/ui/switch';
import { logger } from '@/lib/logger';

const SEGMENTO_OPTIONS = ['Transportes', 'Avulso', 'Ambiental', 'RC-V', 'Outros'];
const REGRA_OPTIONS = ['Recorrente', 'Total'];

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
    segmento: '',
    regra: '',
    ativo: true,
  });

  useEffect(() => {
    if (ramo) {
      setFormData({
        codigo: ramo.codigo || '',
        descricao: ramo.descricao || '',
        segmento: (ramo as any).segmento || '',
        regra: (ramo as any).regra || '',
        ativo: ramo.ativo ?? true,
      });
    } else {
      setFormData({
        codigo: '',
        descricao: '',
        segmento: '',
        regra: '',
        ativo: true,
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
            segmento: formData.segmento,
            regra: formData.regra,
            ativo: formData.ativo,
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
            segmento: formData.segmento,
            regra: formData.regra,
            ativo: true,
          });

        if (error) throw error;
        toast.success('Ramo criado com sucesso!');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      logger.error('Error saving ramo:', error);
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

          <div className="space-y-2">
            <Label htmlFor="segmento">Segmento *</Label>
            <Select
              value={formData.segmento}
              onValueChange={(value) => setFormData({ ...formData, segmento: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o segmento" />
              </SelectTrigger>
              <SelectContent>
                {SEGMENTO_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="regra">Regra *</Label>
            <Select
              value={formData.regra}
              onValueChange={(value) => setFormData({ ...formData, regra: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a regra" />
              </SelectTrigger>
              <SelectContent>
                {REGRA_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="ativo">Ativo</Label>
            <Switch
              id="ativo"
              checked={formData.ativo}
              onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
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
