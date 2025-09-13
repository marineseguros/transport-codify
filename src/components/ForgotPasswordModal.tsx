import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Mail } from 'lucide-react';

interface ForgotPasswordModalProps {
  children: React.ReactNode;
}

export const ForgotPasswordModal = ({ children }: ForgotPasswordModalProps) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const result = await resetPassword(email);
      
      if (result.success) {
        toast({
          title: "Email enviado!",
          description: `Enviamos um link de recuperação para ${email}. Verifique sua caixa de entrada.`,
        });
        setEmail('');
        setIsOpen(false);
      } else {
        toast({
          title: "Erro ao enviar email",
          description: result.error || "Não foi possível enviar o email de recuperação.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao solicitar a recuperação de senha.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Recuperar Senha
          </DialogTitle>
          <DialogDescription>
            Digite seu email para receber um link de recuperação de senha.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoFocus
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !email}>
              {isLoading ? "Enviando..." : "Enviar Link"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};