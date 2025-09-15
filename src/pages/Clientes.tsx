import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, FileText, Building2 } from 'lucide-react';
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
import { ClienteModal } from '@/components/ClienteModal';
import { useClientes, useCotacoes } from '@/hooks/useSupabaseData';
import { Cliente, ClienteWithStats } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const Clientes = () => {
  const { user } = useAuth();
  const { clientes, loading: clientesLoading } = useClientes();
  const { cotacoes, loading: cotacoesLoading } = useCotacoes();
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUF, setSelectedUF] = useState('');
  const [filtroUF, setFiltroUF] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  // Calculate stats for each client
  const clientesWithStats = useMemo(() => {
    return clientes.map(cliente => {
      const clienteCotacoes = cotacoes.filter(c => c.cliente_id === cliente.id);
      const cotacoesFechadas = clienteCotacoes.filter(c => c.status === 'Negócio fechado');
      const premioTotal = cotacoesFechadas.reduce((sum, c) => sum + c.valor_premio, 0);
      
      return {
        ...cliente,
        totalCotacoes: clienteCotacoes.length,
        cotacoesFechadas: cotacoesFechadas.length,
        premioTotal,
        ultimaCotacao: clienteCotacoes.length > 0 
          ? Math.max(...clienteCotacoes.map(c => new Date(c.created_at).getTime()))
          : 0,
      } as ClienteWithStats;
    });
  }, [clientes, cotacoes]);

  // Filter clients
  const filteredClientes = useMemo(() => {
    return clientesWithStats.filter(cliente => {
      const matchesSearch = cliente.segurado.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           cliente.cpf_cnpj.includes(searchTerm) ||
                           cliente.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesUF = !selectedUF || cliente.uf === selectedUF;
      const matchesTipo = filtroTipo === 'todos' || !filtroTipo || 
                         (filtroTipo === 'pf' && cliente.cpf_cnpj.length === 11) ||
                         (filtroTipo === 'pj' && cliente.cpf_cnpj.length === 14);
      const matchesStatus = filtroStatus === 'todos' || !filtroStatus || 
                           (filtroStatus === 'ativo' && cliente.totalCotacoes > 0) ||
                           (filtroStatus === 'inativo' && cliente.totalCotacoes === 0);
      
      return matchesSearch && matchesUF && matchesTipo && matchesStatus;
    });
  }, [clientesWithStats, searchTerm, selectedUF, filtroTipo, filtroStatus]);

  const ufs = [...new Set(clientes.map(c => c.uf).filter(Boolean))].sort();

  const canEdit = user?.papel !== 'Somente-Leitura';
  const canDelete = user?.papel === 'Administrador';

  const handleEdit = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsModalOpen(true);
  };

  const handleNewClient = () => {
    setSelectedCliente(null);
    setIsModalOpen(true);
  };

  const formatCpfCnpj = (cpfCnpj: string) => {
    const numbers = cpfCnpj.replace(/\D/g, '');
    if (numbers.length === 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (numbers.length === 14) {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return cpfCnpj;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie seus clientes e acompanhe o histórico de cotações
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleNewClient}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clientesWithStats.filter(c => c.totalCotacoes > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Com cotações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prêmio Total</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(clientesWithStats.reduce((sum, c) => sum + c.premioTotal, 0))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                clientesWithStats.reduce((sum, c) => sum + c.premioTotal, 0) / 
                Math.max(clientesWithStats.filter(c => c.premioTotal > 0).length, 1)
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros adicionais */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="min-w-[200px]">
          <Input
            placeholder="Buscar por nome, CPF/CNPJ, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        
        <Select value={filtroUF} onValueChange={setFiltroUF}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Todos os UFs" />
          </SelectTrigger>
          <SelectContent>
            {ufs.map(uf => (
              <SelectItem key={uf} value={uf}>{uf}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pf">Pessoa Física</SelectItem>
            <SelectItem value="pj">Pessoa Jurídica</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>

        {searchTerm && (
          <Button 
            variant="outline" 
            onClick={() => setSearchTerm('')}
            className="px-3"
          >
            Limpar
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Lista de Clientes ({filteredClientes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Cotações</TableHead>
                <TableHead>Prêmio Total</TableHead>
                <TableHead>Última Atividade</TableHead>
                {canEdit && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClientes.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{cliente.segurado}</div>
                      {cliente.email && (
                        <div className="text-sm text-muted-foreground">{cliente.email}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm">{formatCpfCnpj(cliente.cpf_cnpj)}</code>
                  </TableCell>
                  <TableCell>
                    {cliente.telefone && (
                      <div className="text-sm">{cliente.telefone}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {cliente.cidade && cliente.uf && (
                      <div className="text-sm">
                        {cliente.cidade}, {cliente.uf}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Badge variant="secondary">
                        {cliente.totalCotacoes}
                      </Badge>
                       {cliente.cotacoesFechadas > 0 && (
                         <Badge variant="success-alt">
                           {cliente.cotacoesFechadas} fechadas
                         </Badge>
                       )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {formatCurrency(cliente.premioTotal)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {cliente.ultimaCotacao && (
                      <div className="text-sm">
                        {new Date(cliente.ultimaCotacao).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(cliente)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredClientes.length === 0 && (
            <div className="text-center py-8">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-sm font-semibold">Nenhum cliente encontrado</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {searchTerm || selectedUF
                  ? 'Tente ajustar os filtros para encontrar clientes.'
                  : 'Comece criando seu primeiro cliente.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <ClienteModal
        cliente={selectedCliente}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCliente(null);
        }}
      />
    </div>
  );
};

export default Clientes;