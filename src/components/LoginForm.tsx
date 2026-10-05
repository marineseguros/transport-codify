import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import { ForgotPasswordModal } from '@/components/ForgotPasswordModal';

type PwCred = Credential & { id: string; password?: string };
type PwCredCtor = new (d: { id: string; password: string; name?: string }) => Credential;

export const LoginForm = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const { login } = useAuth();

  // Recupera e-mail + senha salvos no navegador (Chrome/Edge) e preenche os dois campos.
  useEffect(() => {
    let cancelled = false;
    const PC = (window as unknown as { PasswordCredential?: PwCredCtor }).PasswordCredential;
    if (!PC || !navigator.credentials?.get) return;
    (navigator.credentials.get({ password: true, mediation: 'optional' } as CredentialRequestOptions) as Promise<PwCred | null>)
      .then((cred) => {
        if (cancelled || !cred || cred.type !== 'password') return;
        if (cred.id) setEmail(cred.id);
        if (cred.password) setPassword(cred.password);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Lê também direto dos campos: o preenchimento automático do navegador
    // nem sempre dispara onChange, deixando o estado vazio.
    const finalEmail = (emailRef.current?.value || email).trim();
    const finalPassword = passwordRef.current?.value || password;
    setSubmitting(true);
    const success = await login(finalEmail, finalPassword);
    if (!success) {
      setSubmitting(false);
      toast({
        title: "Erro de autenticação",
        description: "Email ou senha inválidos. Verifique suas credenciais.",
        variant: "destructive"
      });
      return;
    }
    // Pede explicitamente ao navegador para salvar e-mail + senha (Chrome/Edge).
    try {
      const PC = (window as unknown as { PasswordCredential?: PwCredCtor }).PasswordCredential;
      if (PC && navigator.credentials?.store) {
        await navigator.credentials.store(new PC({ id: finalEmail, password: finalPassword, name: finalEmail }));
      }
    } catch {
      // navegador sem suporte ou usuário recusou
    }
    navigate('/');
  };
  const isLoading = submitting;
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img
              src="/marine-login-logo.png"
              alt="Marine Seguros Logo"
              className="h-32 w-auto dark:brightness-150 dark:contrast-125 dark:[filter:brightness(1.6)_contrast(1.15)_drop-shadow(0_0_8px_rgba(125,211,252,0.35))]"
            />
          </div>
          <p className="text-muted-foreground">Sistema de Gerenciamento</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" method="post" action="#" name="login-form">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input ref={emailRef} id="email" name="email" type="email" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
              </div>
              
              <div>
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input ref={passwordRef} id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Digite sua senha" required />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <ForgotPasswordModal>
                <Button variant="link" className="text-sm">
                  Esqueci minha senha
                </Button>
              </ForgotPasswordModal>
            </div>

            {/* Credenciais de teste para administrador */}
            
          </CardContent>
        </Card>
      </div>
    </div>;
};