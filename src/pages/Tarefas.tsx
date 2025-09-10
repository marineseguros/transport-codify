import React, { useState, useMemo } from 'react';
import { Plus, Search, Calendar, User, Flag, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tarefa } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

// Mock tasks data
const MOCK_TAREFAS: Tarefa[] = [
  {
    id: '1',
    titulo: 'Revisar documentação da cotação TRN-001',
    descricao: 'Verificar se todos os documentos estão em ordem antes do fechamento',
    responsavel_id: '1',
    prioridade: 'Alta',
    status: 'Em andamento',
    data_limite: '2024-02-15',
    relacionada_a: 'Cotacao',
    cotacao_id: 'cotacao-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    titulo: 'Atualizar dados do cliente Transportes Rápido',
    descricao: 'Cliente solicitou alteração no endereço e telefone',
    responsavel_id: '2',
    prioridade: 'Média',
    status: 'Aberta',
    data_limite: '2024-02-20',
    relacionada_a: 'Geral',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    titulo: 'Renovar apólice vencendo em março',
    descricao: 'Contatar cliente para renovação da apólice TRN-345',
    responsavel_id: '3',
    prioridade: 'Alta',
    status: 'Aberta',
    data_limite: '2024-02-28',
    relacionada_a: 'Cotacao',
    cotacao_id: 'cotacao-2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    titulo: 'Emitir relatório mensal de comissões',
    descricao: 'Gerar relatório de comissões do mês de janeiro',
    responsavel_id: '1',
    prioridade: 'Baixa',
    status: 'Concluída',
    data_limite: '2024-02-05',
    relacionada_a: 'Geral',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const Tarefas = () => {
  const { user } = useAuth();
  const [tarefas] = useState(MOCK_TAREFAS);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [prioridadeFilter, setPrioridadeFilter] = useState('');

  const filteredTarefas = useMemo(() => {
    return tarefas.filter(tarefa => {
      const matchesSearch = tarefa.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           tarefa.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || tarefa.status === statusFilter;
      const matchesPrioridade = !prioridadeFilter || tarefa.prioridade === prioridadeFilter;
      
      return matchesSearch && matchesStatus && matchesPrioridade;
    });
  }, [tarefas, searchTerm, statusFilter, prioridadeFilter]);

  const stats = useMemo(() => {
    const total = tarefas.length;
    const abertas = tarefas.filter(t => t.status === 'Aberta').length;
    const emAndamento = tarefas.filter(t => t.status === 'Em andamento').length;
    const concluidas = tarefas.filter(t => t.status === 'Concluída').length;
    const atrasadas = tarefas.filter(t => 
      t.status !== 'Concluída' && 
      t.data_limite && 
      new Date(t.data_limite) < new Date()
    ).length;

    return { total, abertas, emAndamento, concluidas, atrasadas };
  }, [tarefas]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aberta': return 'secondary';
      case 'Em andamento': return 'default';
      case 'Concluída': return 'outline';
      default: return 'secondary';
    }
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'Alta': return 'destructive';
      case 'Média': return 'default';
      case 'Baixa': return 'secondary';
      default: return 'secondary';
    }
  };

  const getPrioridadeIcon = (prioridade: string) => {
    switch (prioridade) {
      case 'Alta': return <AlertCircle className="h-3 w-3" />;
      case 'Média': return <Flag className="h-3 w-3" />;
      case 'Baixa': return <Clock className="h-3 w-3" />;
      default: return <Flag className="h-3 w-3" />;
    }
  };

  const isOverdue = (dataLimite: string | undefined, status: string) => {
    if (!dataLimite || status === 'Concluída') return false;
    return new Date(dataLimite) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
          <p className="text-muted-foreground">
            Gerencie suas tarefas e acompanhe o progresso da equipe
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova Tarefa
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abertas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.abertas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emAndamento}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.concluidas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.atrasadas}</div>
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
                placeholder="Buscar tarefas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value === "todos-status" ? "" : value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="" value="todos-status">Todos Status</SelectItem>
                <SelectItem value="Aberta">Aberta</SelectItem>
                <SelectItem value="Em andamento">Em andamento</SelectItem>
                <SelectItem value="Concluída">Concluída</SelectItem>
              </SelectContent>
            </Select>
            <Select value={prioridadeFilter} onValueChange={(value) => setPrioridadeFilter(value === "todas-prioridades" ? "" : value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="" value="todas-prioridades">Todas Prioridades</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Média">Média</SelectItem>
                <SelectItem value="Baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Tarefas ({filteredTarefas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarefa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Data Limite</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTarefas.map((tarefa) => (
                <TableRow key={tarefa.id}>
                  <TableCell>
                    <div>
                      <div className={`font-medium ${isOverdue(tarefa.data_limite, tarefa.status) ? 'text-destructive' : ''}`}>
                        {tarefa.titulo}
                      </div>
                      {tarefa.descricao && (
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {tarefa.descricao}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(tarefa.status)}>
                      {tarefa.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPrioridadeColor(tarefa.prioridade)} className="flex items-center gap-1 w-fit">
                      {getPrioridadeIcon(tarefa.prioridade)}
                      {tarefa.prioridade}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {tarefa.data_limite && (
                      <div className={`text-sm ${isOverdue(tarefa.data_limite, tarefa.status) ? 'text-destructive font-medium' : ''}`}>
                        {new Date(tarefa.data_limite).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {tarefa.relacionada_a}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredTarefas.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-sm font-semibold">Nenhuma tarefa encontrada</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {searchTerm || statusFilter || prioridadeFilter
                  ? 'Tente ajustar os filtros para encontrar tarefas.'
                  : 'Comece criando sua primeira tarefa.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Tarefas;