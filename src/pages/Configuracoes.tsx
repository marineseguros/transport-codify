import React, { useState, useEffect } from 'react';
import { Save, Moon, Sun, Monitor, Database, Bell, Shield, Settings, User, Globe, Clock, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'marine-app-config';

interface AppConfig {
  sla_dias_alerta: number;
  notificacoes_email: boolean;
  notificacoes_sistema: boolean;
}

const defaultConfig: AppConfig = {
  sla_dias_alerta: 7,
  notificacoes_email: true,
  notificacoes_sistema: true,
};

const loadConfig = (): AppConfig => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...defaultConfig, ...JSON.parse(stored) } : defaultConfig;
  } catch {
    return defaultConfig;
  }
};

const Configuracoes = () => {
  const { user, session } = useAuth();
  const { theme, setTheme } = useTheme();
  const [config, setConfig] = useState<AppConfig>(loadConfig);
  const [dbStats, setDbStats] = useState<{ cotacoes: number; clientes: number; produtores: number } | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  const canEdit = user?.papel && ['Administrador', 'Gerente', 'CEO'].includes(user.papel);

  // Check Supabase connection & load stats
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const [cotRes, cliRes, prodRes] = await Promise.all([
          supabase.from('cotacoes').select('id', { count: 'exact', head: true }),
          supabase.from('clientes').select('id', { count: 'exact', head: true }),
          supabase.from('produtores').select('id', { count: 'exact', head: true }),
        ]);

        if (cotRes.error || cliRes.error || prodRes.error) {
          setSupabaseStatus('error');
        } else {
          setSupabaseStatus('connected');
          setDbStats({
            cotacoes: cotRes.count ?? 0,
            clientes: cliRes.count ?? 0,
            produtores: prodRes.count ?? 0,
          });
        }
      } catch {
        setSupabaseStatus('error');
      }
    };
    checkConnection();
  }, []);

  const handleConfigChange = (key: keyof AppConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    toast.success('Configurações salvas com sucesso.');
  };

  const supabaseProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'N/A';
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'N/A';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Settings className="h-7 w-7 md:h-8 md:w-8" />
            Configurações
          </h1>
          <p className="text-sm text-muted-foreground">
            Preferências do sistema e informações do ambiente
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Salvar Alterações
          </Button>
        )}
      </div>

      {/* User Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil do Usuário Logado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Nome</span>
              <div className="mt-0.5">{user?.nome || '—'}</div>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Email</span>
              <div className="mt-0.5">{user?.email || '—'}</div>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Papel</span>
              <div className="mt-0.5">
                <Badge variant="outline">{user?.papel || '—'}</Badge>
              </div>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Módulo</span>
              <div className="mt-0.5">
                <Badge variant="secondary">{user?.modulo || '—'}</Badge>
              </div>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Status</span>
              <div className="mt-0.5">
                <Badge variant={user?.ativo ? 'success-alt' : 'destructive'}>
                  {user?.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Sessão</span>
              <div className="mt-0.5">
                <Badge variant={session ? 'success-alt' : 'destructive'}>
                  {session ? 'Autenticado' : 'Sem sessão'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supabase Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Conexão Supabase
          </CardTitle>
          <CardDescription>Status em tempo real da conexão com o banco de dados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Status da Conexão</span>
            <Badge variant={supabaseStatus === 'connected' ? 'success-alt' : supabaseStatus === 'error' ? 'destructive' : 'outline'}>
              {supabaseStatus === 'checking' ? 'Verificando...' : supabaseStatus === 'connected' ? 'Conectado' : 'Erro'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Project ID</span>
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{supabaseProjectId}</code>
          </div>
          <div className="flex items-center justify-between">
            <span>URL</span>
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono max-w-[300px] truncate">{supabaseUrl}</code>
          </div>
          <div className="flex items-center justify-between">
            <span>Autenticação</span>
            <Badge variant="success-alt">Supabase Auth</Badge>
          </div>

          {dbStats && (
            <>
              <Separator />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{dbStats.cotacoes.toLocaleString('pt-BR')}</div>
                  <div className="text-xs text-muted-foreground">Cotações</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{dbStats.clientes.toLocaleString('pt-BR')}</div>
                  <div className="text-xs text-muted-foreground">Clientes</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{dbStats.produtores.toLocaleString('pt-BR')}</div>
                  <div className="text-xs text-muted-foreground">Produtores</div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Aparência
          </CardTitle>
          <CardDescription>Tema da interface do usuário</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Tema</Label>
            <Select value={theme} onValueChange={(value: 'light' | 'dark' | 'system') => setTheme(value)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    Claro
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Escuro
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Sistema
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A alteração de tema é aplicada imediatamente.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Application Settings (admin only) */}
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Parâmetros Operacionais
            </CardTitle>
            <CardDescription>Configurações que afetam o comportamento do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="sla">Alerta de SLA (dias)</Label>
              <Input
                id="sla"
                type="number"
                min="1"
                max="90"
                value={config.sla_dias_alerta}
                onChange={(e) => handleConfigChange('sla_dias_alerta', parseInt(e.target.value) || 7)}
                className="w-[200px]"
              />
              <p className="text-xs text-muted-foreground">
                Alertar quando uma cotação estiver há mais de X dias sem movimentação.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span>Notificações por Email</span>
              <p className="text-xs text-muted-foreground">Receber alertas por email</p>
            </div>
            <Switch
              checked={config.notificacoes_email}
              onCheckedChange={(checked) => handleConfigChange('notificacoes_email', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span>Notificações do Sistema</span>
              <p className="text-xs text-muted-foreground">Mostrar notificações no navegador</p>
            </div>
            <Switch
              checked={config.notificacoes_sistema}
              onCheckedChange={(checked) => handleConfigChange('notificacoes_sistema', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Timeout de Inatividade</span>
            <Badge variant="outline">15 minutos</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Política de Senhas</span>
            <Badge variant="success-alt">Mínimo 6 caracteres</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>RLS (Row Level Security)</span>
            <Badge variant="success-alt">Ativo</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Auditoria de Cotações</span>
            <Badge variant="success-alt">Triggers ativos</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Auditoria de Clientes</span>
            <Badge variant="success-alt">Triggers ativos</Badge>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Informações do Ambiente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Versão</span>
              <div className="mt-0.5">v1.0.0</div>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Framework</span>
              <div className="mt-0.5">React 18 + Vite</div>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">UI</span>
              <div className="mt-0.5">Tailwind CSS + shadcn/ui</div>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Backend</span>
              <div className="mt-0.5">Supabase (PostgreSQL)</div>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Ambiente</span>
              <div className="mt-0.5">
                <Badge variant="outline">{import.meta.env.MODE}</Badge>
              </div>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Última Atualização</span>
              <div className="mt-0.5">{new Date().toLocaleDateString('pt-BR')}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Configuracoes;
