import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useProdutores } from '@/hooks/useSupabaseData';
import { logger } from '@/lib/logger';
import { Plus } from 'lucide-react';
// date-fns removed - using manual date parsing to avoid timezone issues

interface TipoMeta {
  id: string;
  descricao: string;
  ativo: boolean;
}

interface Meta {
  id: string;
  produtor_id: string;
  mes: string;
  tipo_meta_id: string;
  quantidade: number;
  modulo: string;
}

interface MetaModalProps {
  meta: Meta | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tiposMeta: TipoMeta[];
  onTiposMetaChange: () => void;
}

const MetaModal = ({ meta, isOpen, onClose, onSuccess, tiposMeta, onTiposMetaChange }: MetaModalProps) => {
  const { user } = useAuth();
  const { produtores } = useProdutores();
  const [loading, setLoading] = useState(false);
  const [showNewTipoInput, setShowNewTipoInput] = useState(false);
  const [newTipoMeta, setNewTipoMeta] = useState('');
  const [creatingTipo, setCreatingTipo] = useState(false);

  const [formData, setFormData] = useState({
    produtor_id: '',
    mes: '',
    tipo_meta_id: '',
    quantidade: 0,
  });

  useEffect(() => {
    if (meta) {
      // Parse the DATE string (YYYY-MM-DD) without timezone issues
      let mesValue = '';
      if (meta.mes) {
        const parts = meta.mes.split('-');
        if (parts.length >= 2) {
          mesValue = `${parts[0]}-${parts[1]}`;
        }
      }
      setFormData({
        produtor_id: meta.produtor_id,
        mes: mesValue,
        tipo_meta_id: meta.tipo_meta_id,
        quantidade: meta.quantidade,
      });
    } else {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      setFormData({
        produtor_id: '',
        mes: `${year}-${month}`,
        tipo_meta_id: '',
        quantidade: 0,
      });
    }
    setShowNewTipoInput(false);
    setNewTipoMeta('');
  }, [meta, isOpen]);

  const handleCreateTipoMeta = async () => {
    if (!newTipoMeta.trim()) {
      toast.error('Digite um nome para o tipo de meta');
      return;
    }

    setCreatingTipo(true);
    try {
      const { data, error } = await supabase
        .from('tipos_meta')
        .insert({ descricao: newTipoMeta.trim() })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Este tipo de meta já existe');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Tipo de meta criado com sucesso!');
      onTiposMetaChange();
      setFormData(prev => ({ ...prev, tipo_meta_id: data.id }));
      setShowNewTipoInput(false);
      setNewTipoMeta('');
    } catch (error) {
      logger.error('Erro ao criar tipo de meta:', error);
      toast.error('Erro ao criar tipo de meta');
    } finally {
      setCreatingTipo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.produtor_id) {
      toast.error('Selecione um produtor');
      return;
    }
    if (!formData.mes) {
      toast.error('Selecione o mês');
      return;
    }
    if (!formData.tipo_meta_id) {
      toast.error('Selecione o tipo de meta');
      return;
    }
    if (formData.quantidade < 0) {
      toast.error('A quantidade deve ser maior ou igual a zero');
      return;
    }

    setLoading(true);
    try {
      // Convert YYYY-MM to first day of month
      const mesDate = `${formData.mes}-01`;

      const dataToSave = {
        produtor_id: formData.produtor_id,
        mes: mesDate,
        tipo_meta_id: formData.tipo_meta_id,
        quantidade: formData.quantidade,
        modulo: user?.modulo || 'Transportes',
        created_by: user?.user_id,
      };

      if (meta) {
        const { error } = await supabase
          .from('metas')
          .update(dataToSave)
          .eq('id', meta.id);

        if (error) throw error;
        toast.success('Meta atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('metas')
          .insert(dataToSave);

        if (error) throw error;
        toast.success('Meta criada com sucesso!');
      }

      onSuccess();
    } catch (error) {
      logger.error('Erro ao salvar meta:', error);
      toast.error('Erro ao salvar meta');
    } finally {
      setLoading(false);
    }
  };

  const activeProdutores = produtores?.filter(p => p.ativo) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{meta ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Produtor */}
            <div className="space-y-2">
              <Label htmlFor="produtor_id">Produtor *</Label>
              <Select
                value={formData.produtor_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, produtor_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produtor" />
                </SelectTrigger>
                <SelectContent>
                  {activeProdutores.map(produtor => (
                    <SelectItem key={produtor.id} value={produtor.id}>
                      {produtor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mês */}
            <div className="space-y-2">
              <Label htmlFor="mes">Mês *</Label>
              <Input
                id="mes"
                type="month"
                value={formData.mes}
                onChange={(e) => setFormData(prev => ({ ...prev, mes: e.target.value }))}
                required
              />
            </div>

            {/* Tipo de Meta */}
            <div className="space-y-2">
              <Label htmlFor="tipo_meta_id">Tipo de Meta *</Label>
              {showNewTipoInput ? (
                <div className="flex gap-2">
                  <Input
                    value={newTipoMeta}
                    onChange={(e) => setNewTipoMeta(e.target.value)}
                    placeholder="Nome do novo tipo"
                    disabled={creatingTipo}
                  />
                  <Button
                    type="button"
                    onClick={handleCreateTipoMeta}
                    disabled={creatingTipo}
                    size="sm"
                  >
                    {creatingTipo ? 'Salvando...' : 'Salvar'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNewTipoInput(false);
                      setNewTipoMeta('');
                    }}
                    size="sm"
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select
                    value={formData.tipo_meta_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_meta_id: value }))}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione o tipo de meta" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposMeta.map(tipo => (
                        <SelectItem key={tipo.id} value={tipo.id}>
                          {tipo.descricao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowNewTipoInput(true)}
                    title="Adicionar novo tipo"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Quantidade */}
            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade *</Label>
              <Input
                id="quantidade"
                type="number"
                min="0"
                value={formData.quantidade}
                onChange={(e) => setFormData(prev => ({ ...prev, quantidade: parseInt(e.target.value) || 0 }))}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MetaModal;
