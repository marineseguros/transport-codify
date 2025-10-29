import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Profile } from '@/hooks/useSupabaseData';

interface UsuarioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario: Profile | null;
  mode: 'view' | 'edit';
  onSave?: () => void;
}

export function UsuarioModal({ open, onOpenChange, usuario, mode, onSave }: UsuarioModalProps) {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    papel: 'Produtor',
    modulo: 'Transportes' as 'Transportes' | 'Ramos Elementares',
    ativo: true,
  });
  const [loading, setLoading] = useState(false);

  const isViewMode = mode === 'view';

  useEffect(() => {
    if (usuario) {
      setFormData({
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.papel,
        modulo: usuario.modulo as 'Transportes' | 'Ramos Elementares',
        ativo: usuario.ativo ?? true,
      });
    } else {
      setFormData({
        nome: '',
        email: '',
        papel: 'Produtor',
        modulo: 'Transportes',
        ativo: true,
      });
    }
  }, [usuario]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isViewMode) {
      onOpenChange(false);
      return;
    }

    if (!usuario) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nome: formData.nome,
          papel: formData.papel,
          modulo: formData.modulo,
          ativo: formData.ativo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', usuario.id);

      if (error) throw error;

      toast.success('Usuário atualizado com sucesso');
      onSave?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error('Erro ao atualizar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isViewMode ? 'Visualizar Usuário' : 'Editar Usuário'}
          </DialogTitle>
          <DialogDescription>
            {isViewMode 
              ? 'Visualize as informações do usuário.'
              : 'Atualize as informações do usuário.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                disabled={isViewMode}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled={true}
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O email não pode ser alterado
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="papel">Papel *</Label>
              <Select
                value={formData.papel}
                onValueChange={(value) => setFormData({ ...formData, papel: value })}
                disabled={isViewMode}
              >
                <SelectTrigger id="papel">
                  <SelectValue placeholder="Selecione o papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Administrador">Administrador</SelectItem>
                  <SelectItem value="Gerente">Gerente</SelectItem>
                  <SelectItem value="CEO">CEO</SelectItem>
                  <SelectItem value="Operacional">Operacional</SelectItem>
                  <SelectItem value="Produtor">Produtor</SelectItem>
                  <SelectItem value="Faturamento">Faturamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="modulo">Módulo *</Label>
              <Select
                value={formData.modulo}
                onValueChange={(value) => setFormData({ ...formData, modulo: value as 'Transportes' | 'Ramos Elementares' })}
                disabled={isViewMode}
              >
                <SelectTrigger id="modulo">
                  <SelectValue placeholder="Selecione o módulo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Transportes">Transportes</SelectItem>
                  <SelectItem value="Ramos Elementares">Ramos Elementares</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ativo">Status *</Label>
              <Select
                value={formData.ativo ? 'ativo' : 'inativo'}
                onValueChange={(value) => setFormData({ ...formData, ativo: value === 'ativo' })}
                disabled={isViewMode}
              >
                <SelectTrigger id="ativo">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {isViewMode ? 'Fechar' : 'Cancelar'}
            </Button>
            {!isViewMode && (
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
