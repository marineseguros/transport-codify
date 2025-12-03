import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Tags, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useRamos } from '@/hooks/useSupabaseData';
import { RamoModal } from '@/components/RamoModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Ramo } from '@/types';

// Helper function to get Segmento based on ramo description
const getSegmento = (descricao: string): string => {
  const transportes = ['Nacional', 'Exportação', 'Importação', 'RCTR-C', 'RC-DC', 'RCTR-VI', 'RCTA-C'];
  const avulso = ['Nacional Avulsa', 'Importação Avulsa', 'Exportação Avulsa', 'Garantia Aduaneira'];
  const ambiental = ['Ambiental'];
  const rcv = ['RC-V'];
  if (avulso.some(r => descricao === r)) return 'Avulso';
  if (ambiental.some(r => descricao === r)) return 'Ambiental';
  if (rcv.some(r => descricao === r)) return 'RC-V';
  if (transportes.some(r => descricao === r)) return 'Transportes';
  return 'Outros';
};

// Helper function to get Regra based on ramo description
const getRegra = (descricao: string): string => {
  const recorrente = ['Nacional', 'Exportação', 'Importação', 'RCTR-C', 'RC-DC', 'RCTR-VI', 'RCTA-C', 'RC-V'];
  const total = ['Nacional Avulsa', 'Importação Avulsa', 'Exportação Avulsa', 'Garantia Aduaneira', 'Ambiental'];
  if (recorrente.some(r => descricao === r)) return 'Recorrente';
  if (total.some(r => descricao === r)) return 'Total';
  return 'Outros';
};
const Ramos = () => {
  const {
    user
  } = useAuth();
  const {
    ramos,
    loading,
    refetch
  } = useRamos();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [selectedRamo, setSelectedRamo] = useState<Ramo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Only Administrators can access this page
  if (user?.papel !== 'Administrador') {
    return <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </div>;
  }
  const handleEdit = (ramo: Ramo) => {
    setSelectedRamo(ramo);
    setIsModalOpen(true);
  };
  const handleNew = () => {
    setSelectedRamo(null);
    setIsModalOpen(true);
  };
  const handleMoveUp = async (ramo: Ramo, currentIndex: number) => {
    if (currentIndex === 0) return;
    const prevRamo = filteredRamos[currentIndex - 1];
    try {
      await supabase.from('ramos').update({
        ordem: prevRamo.ordem
      }).eq('id', ramo.id);
      await supabase.from('ramos').update({
        ordem: ramo.ordem
      }).eq('id', prevRamo.id);
      toast.success('Ordem atualizada!');
      refetch();
    } catch (error: any) {
      toast.error('Erro ao atualizar ordem');
    }
  };
  const handleMoveDown = async (ramo: Ramo, currentIndex: number) => {
    if (currentIndex === filteredRamos.length - 1) return;
    const nextRamo = filteredRamos[currentIndex + 1];
    try {
      await supabase.from('ramos').update({
        ordem: nextRamo.ordem
      }).eq('id', ramo.id);
      await supabase.from('ramos').update({
        ordem: ramo.ordem
      }).eq('id', nextRamo.id);
      toast.success('Ordem atualizada!');
      refetch();
    } catch (error: any) {
      toast.error('Erro ao atualizar ordem');
    }
  };

  // Filter ramos based on search and filters
  const filteredRamos = useMemo(() => {
    return ramos.filter(ramo => {
      const matchesSearch = ramo.descricao.toLowerCase().includes(searchTerm.toLowerCase()) || ramo.codigo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === '' || statusFilter === 'todos' || statusFilter === 'ativo' && ramo.ativo || statusFilter === 'inativo' && !ramo.ativo;
      return matchesSearch && matchesStatus;
    });
  }, [ramos, searchTerm, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = ramos.length;
    const ativos = ramos.filter(r => r.ativo).length;
    const inativos = ramos.filter(r => !r.ativo).length;
    return {
      total,
      ativos,
      inativos
    };
  }, [ramos]);
  if (loading) {
    return <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <Tags className="h-7 w-7 md:h-8 md:w-8" />
              Ramos
            </h1>
            <p className="text-sm text-muted-foreground">Carregando ramos...</p>
          </div>
        </div>
      </div>;
  }
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Tags className="h-7 w-7 md:h-8 md:w-8" />
            Ramos
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os ramos de seguros
          </p>
        </div>
        
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Ramo
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Ramos</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Ramos cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ativos}</div>
            <p className="text-xs text-muted-foreground">Ramos ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inativos</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inativos}</div>
            <p className="text-xs text-muted-foreground">Ramos inativos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-64">
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <Input placeholder="Buscar por descrição ou código..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>

            <div className="w-48">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={() => {
            setSearchTerm('');
            setStatusFilter('');
          }}>
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filteredRamos.length} ramo{filteredRamos.length !== 1 ? 's' : ''} encontrado{filteredRamos.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Ramo</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead>Regra</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRamos.map((ramo, index) => <TableRow key={ramo.id}>
                  <TableCell>
                    <code className="text-sm">{ramo.codigo}</code>
                  </TableCell>
                  <TableCell className="font-medium">{ramo.descricao}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getSegmento(ramo.descricao)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRegra(ramo.descricao) === 'Recorrente' ? 'default' : 'secondary'}>
                      {getRegra(ramo.descricao)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ramo.ativo ? "success-alt" : "secondary"}>
                      {ramo.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => handleMoveUp(ramo, index)} disabled={index === 0}>
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleMoveDown(ramo, index)} disabled={index === filteredRamos.length - 1}>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(ramo)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>)}
            </TableBody>
          </Table>

          {filteredRamos.length === 0 && <div className="text-center py-8">
              <Tags className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-sm font-semibold">Nenhum ramo encontrado</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {searchTerm || statusFilter ? 'Tente ajustar os filtros para encontrar ramos.' : 'Comece criando seu primeiro ramo.'}
              </p>
            </div>}
        </CardContent>
      </Card>

      <RamoModal ramo={selectedRamo} isOpen={isModalOpen} onClose={() => {
      setIsModalOpen(false);
      setSelectedRamo(null);
    }} onSuccess={() => {
      refetch();
      setIsModalOpen(false);
      setSelectedRamo(null);
    }} />
    </div>;
};
export default Ramos;