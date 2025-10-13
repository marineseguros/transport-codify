import React, { useState } from 'react';
import { Save, Moon, Sun, Database, Bell, Shield, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const Configuracoes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [config, setConfig] = useState({
    modo_mock: true,
    tema: 'light' as 'light' | 'dark',
    sla_dias_alerta: 7,
    notificacoes_email: true,
    notificacoes_sistema: true,
    backup_automatico: false,
    auditoria_completa: true,
  });

  const handleConfigChange = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    // Here you would save the configuration
    toast({
      title: "Configurações salvas",
      description: "As configurações foram atualizadas com sucesso.",
    });
  };

  const canEdit = user?.papel === 'Administrador';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Configure as preferências e comportamentos do sistema
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Salvar Alterações
          </Button>
        )}
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Status do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Modo de Operação</span>
            <Badge variant={config.modo_mock ? 'secondary' : 'success-alt'}>
              {config.modo_mock ? 'Mock (Desenvolvimento)' : 'Produção (Supabase)'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Conexão com Banco</span>
            <Badge variant={config.modo_mock ? 'outline' : 'success-alt'}>
              {config.modo_mock ? 'Local Storage' : 'Conectado'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Autenticação</span>
            <Badge variant="success-alt">Ativa</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Auditoria</span>
            <Badge variant={config.auditoria_completa ? 'success-alt' : 'outline'}>
              {config.auditoria_completa ? 'Completa' : 'Básica'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Application Settings */}
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações da Aplicação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Database Mode */}
            <div className="space-y-2">
              <Label>Modo de Dados</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={config.modo_mock}
                  onCheckedChange={(checked) => handleConfigChange('modo_mock', checked)}
                />
                <span className="text-sm">
                  {config.modo_mock ? 'Modo Mock (dados locais)' : 'Modo Produção (Supabase)'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                No modo mock, os dados são armazenados localmente. No modo produção, conecta ao Supabase.
              </p>
            </div>

            <Separator />

            {/* Theme */}
            <div className="space-y-2">
              <Label>Tema da Interface</Label>
              <Select value={config.tema} onValueChange={(value: 'light' | 'dark') => handleConfigChange('tema', value)}>
                <SelectTrigger className="w-[200px]">
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
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* SLA Settings */}
            <div className="space-y-2">
              <Label htmlFor="sla">Alerta de SLA (dias)</Label>
              <Input
                id="sla"
                type="number"
                min="1"
                max="30"
                value={config.sla_dias_alerta}
                onChange={(e) => handleConfigChange('sla_dias_alerta', parseInt(e.target.value))}
                className="w-[200px]"
              />
              <p className="text-sm text-muted-foreground">
                Alertar quando uma cotação estiver há mais de X dias sem movimentação.
              </p>
            </div>

            <Separator />

            {/* Audit Settings */}
            <div className="space-y-4">
              <Label>Configurações de Auditoria</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={config.auditoria_completa}
                  onCheckedChange={(checked) => handleConfigChange('auditoria_completa', checked)}
                />
                <span className="text-sm">Auditoria completa (salvar todas as alterações)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={config.backup_automatico}
                  onCheckedChange={(checked) => handleConfigChange('backup_automatico', checked)}
                />
                <span className="text-sm">Backup automático diário</span>
              </div>
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
              <p className="text-sm text-muted-foreground">
                Receber alertas e updates por email
              </p>
            </div>
            <Switch
              checked={config.notificacoes_email}
              onCheckedChange={(checked) => handleConfigChange('notificacoes_email', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span>Notificações do Sistema</span>
              <p className="text-sm text-muted-foreground">
                Mostrar notificações no navegador
              </p>
            </div>
            <Switch
              checked={config.notificacoes_sistema}
              onCheckedChange={(checked) => handleConfigChange('notificacoes_sistema', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Autenticação de Dois Fatores</span>
            <Badge variant="outline">Em Desenvolvimento</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Sessão Automática</span>
            <Badge variant="success-alt">8 horas</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Política de Senhas</span>
            <Badge variant="success-alt">Forte</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Integration Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informações de Integração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Versão do Sistema:</span>
              <div className="text-muted-foreground">v1.0.0</div>
            </div>
            <div>
              <span className="font-medium">Última Atualização:</span>
              <div className="text-muted-foreground">
                {new Date().toLocaleDateString('pt-BR')}
              </div>
            </div>
            <div>
              <span className="font-medium">Ambiente:</span>
              <div className="text-muted-foreground">
                {config.modo_mock ? 'Desenvolvimento' : 'Produção'}
              </div>
            </div>
            <div>
              <span className="font-medium">Banco de Dados:</span>
              <div className="text-muted-foreground">
                {config.modo_mock ? 'Local Storage' : 'Supabase PostgreSQL'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Configuracoes;