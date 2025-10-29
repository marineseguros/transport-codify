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
import { useAuth } from '@/contexts/AuthContext';
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
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    papel: 'Produtor',
    modulo: 'Transportes' as 'Transportes' | 'Ramos Elementares',
    ativo: true,
  });
  const [loading, setLoading] = useState(false);

  const isViewMode = mode === 'view';
  const isCreateMode = !usuario;

  useEffect(() => {
    if (usuario) {
      setFormData({
        nome: usuario.nome,
        email: usuario.email,
        password: '',
        papel: usuario.papel,
        modulo: usuario.modulo as 'Transportes' | 'Ramos Elementares',
        ativo: usuario.ativo ?? true,
      });
    } else {
      setFormData({
        nome: '',
        email: '',
        password: '',
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

    setLoading(true);
    try {
      if (isCreateMode) {
        // Criar novo usuário
        if (!formData.password || formData.password.length < 6) {
          toast.error('Senha deve ter no mínimo 6 caracteres');
          setLoading(false);
          return;
        }

        const result = await signUp(
          formData.email,
          formData.password,
          formData.nome,
          formData.papel,
          formData.modulo
        );

        if (result.success) {
          toast.success('Usuário criado com sucesso! Um email de confirmação foi enviado.');
          onSave?.();
          onOpenChange(false);
        } else {
          toast.error(result.error || 'Erro ao criar usuário');
        }
      } else {
        // Atualizar usuário existente
        if (!usuario) return;

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
      }
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      toast.error('Erro ao salvar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isViewMode ? 'Visualizar Usuário' : (isCreateMode ? 'Criar Novo Usuário' : 'Editar Usuário')}
          </DialogTitle>
          <DialogDescription>
            {isViewMode 
              ? 'Visualize as informações do usuário.'
              : (isCreateMode 
                  ? 'Preencha os dados para criar um novo usuário.'
                  : 'Atualize as informações do usuário.')}
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
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isViewMode || !isCreateMode}
                className={!isCreateMode ? 'bg-muted' : ''}
                required
              />
              {!isCreateMode && (
                <p className="text-xs text-muted-foreground">
                  O email não pode ser alterado
                </p>
              )}
            </div>

            {isCreateMode && (
              <div className="grid gap-2">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={isViewMode}
                  required
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo de 6 caracteres
                </p>
              </div>
            )}

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
