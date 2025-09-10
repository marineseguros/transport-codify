import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, Shield, User, Mail, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserProfile } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

// Mock users data - in a real app this would come from your backend
const MOCK_USERS: UserProfile[] = [
  {
    id: '1',
    nome: 'João Silva',
    email: 'admin@cotacoes.com',
    papel: 'Administrador',
    ativo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    nome: 'Maria Santos',
    email: 'gerente@cotacoes.com',
    papel: 'Gerente',
    ativo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    nome: 'Carlos Oliveira',
    email: 'produtor@cotacoes.com',
    papel: 'Produtor',
    ativo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    nome: 'Ana Costa',
    email: 'usuario@cotacoes.com',
    papel: 'Somente-Leitura',
    ativo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    nome: 'Pedro Souza',
    email: 'pedro@cotacoes.com',
    papel: 'Produtor',
    ativo: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const Usuarios = () => {
  const { user } = useAuth();
  const [users] = useState(MOCK_USERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Only Administrators can access this page
  if (user?.papel !== 'Administrador') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Acesso Restrito</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Apenas administradores podem acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !roleFilter || user.papel === roleFilter;
    const matchesStatus = statusFilter === '' || 
                         (statusFilter === 'ativo' && user.ativo) ||
                         (statusFilter === 'inativo' && !user.ativo);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Administrador': return 'destructive';
      case 'Gerente': return 'default';
      case 'Produtor': return 'secondary';
      case 'Somente-Leitura': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Administrador': return <Shield className="h-3 w-3" />;
      case 'Gerente': return <User className="h-3 w-3" />;
      case 'Produtor': return <User className="h-3 w-3" />;
      case 'Somente-Leitura': return <User className="h-3 w-3" />;
      default: return <User className="h-3 w-3" />;
    }
  };

  const activeUsers = users.filter(u => u.ativo).length;
  const inactiveUsers = users.filter(u => !u.ativo).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie usuários e suas permissões no sistema
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuários</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <User className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Inativos</CardTitle>
            <User className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{inactiveUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.papel === 'Administrador').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value === "todos-papeis" ? "" : value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos os papéis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="" value="todos-papeis">Todos os papéis</SelectItem>
                <SelectItem value="Administrador">Administrador</SelectItem>
                <SelectItem value="Gerente">Gerente</SelectItem>
                <SelectItem value="Produtor">Produtor</SelectItem>
                <SelectItem value="Somente-Leitura">Somente-Leitura</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value === "todos-status-users" ? "" : value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="" value="todos-status-users">Todos os status</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Criação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-medium">{user.nome}</div>
                        <div className="text-sm text-muted-foreground">ID: {user.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleColor(user.papel)} className="flex items-center gap-1 w-fit">
                      {getRoleIcon(user.papel)}
                      {user.papel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.ativo ? 'default' : 'secondary'}>
                      {user.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <User className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-sm font-semibold">Nenhum usuário encontrado</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {searchTerm || roleFilter || statusFilter
                  ? 'Tente ajustar os filtros para encontrar usuários.'
                  : 'Comece criando seu primeiro usuário.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Usuarios;