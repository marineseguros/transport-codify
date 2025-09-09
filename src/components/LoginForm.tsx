import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, Truck } from 'lucide-react';

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = await login(email, password);
    if (!success) {
      toast({
        title: "Erro de autenticação",
        description: "Email ou senha inválidos. Tente: admin@cotacoes.com / senha: 123456",
        variant: "destructive",
      });
    }
  };

  const demoAccounts = [
    { email: 'admin@cotacoes.com', papel: 'Administrador' },
    { email: 'gerente@cotacoes.com', papel: 'Gerente' },
    { email: 'produtor@cotacoes.com', papel: 'Produtor' },
    { email: 'usuario@cotacoes.com', papel: 'Somente-Leitura' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary rounded-full p-3">
              <Truck className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Sistema de Cotações TRN</h1>
          <p className="text-muted-foreground">Faça login para acessar o sistema</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t">
              <p className="text-sm font-medium mb-3">Contas de demonstração:</p>
              <div className="space-y-2">
                {demoAccounts.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors text-sm"
                    onClick={() => {
                      setEmail(account.email);
                      setPassword('123456');
                    }}
                  >
                    <div className="font-medium">{account.email}</div>
                    <div className="text-muted-foreground text-xs">{account.papel}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Senha para todas as contas: <strong>123456</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};