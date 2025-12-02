import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, Search, Target, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useProdutores } from '@/hooks/useSupabaseData';
import MetaModal from '@/components/MetaModal';
import { format, parse, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logger } from '@/lib/logger';

interface TipoMeta {
  id: string;
  descricao: string;
  ativo: boolean;
}

interface Meta {
  id: string;
  produtor_id: string;
  mes: string;
  tipo_meta_id: string;
  quantidade: number;
  modulo: string;
  created_at: string;
  produtor?: { id: string; nome: string };
  tipo_meta?: { id: string; descricao: string };
}

const Metas = () => {
  const { user } = useAuth();
  const { produtores } = useProdutores();
  const [metas, setMetas] = useState<Meta[]>([]);
  const [tiposMeta, setTiposMeta] = useState<TipoMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProdutor, setFilterProdutor] = useState<string>('all');
  const [filterTipoMeta, setFilterTipoMeta] = useState<string>('all');
  const [filterMes, setFilterMes] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMeta, setSelectedMeta] = useState<Meta | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [metaToDelete, setMetaToDelete] = useState<Meta | null>(null);

  const canManage = user?.papel && ['Administrador', 'Gerente', 'CEO'].includes(user.papel);

  const fetchTiposMeta = async () => {
    try {
      const { data, error } = await supabase
        .from('tipos_meta')
        .select('*')
        .eq('ativo', true)
        .order('descricao');

      if (error) throw error;
      setTiposMeta(data || []);
    } catch (error) {
      logger.error('Erro ao carregar tipos de meta:', error);
    }
  };

  const fetchMetas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('metas')
        .select(`
          *,
          produtor:produtores(id, nome),
          tipo_meta:tipos_meta(id, descricao)
        `)
        .order('mes', { ascending: false });

      if (error) throw error;
      setMetas(data || []);
    } catch (error) {
      logger.error('Erro ao carregar metas:', error);
      toast.error('Erro ao carregar metas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetas();
    fetchTiposMeta();
  }, []);

  const handleCreate = () => {
    setSelectedMeta(null);
    setIsModalOpen(true);
  };

  const handleEdit = (meta: Meta) => {
    setSelectedMeta(meta);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (meta: Meta) => {
    setMetaToDelete(meta);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!metaToDelete) return;

    try {
      const { error } = await supabase
        .from('metas')
        .delete()
        .eq('id', metaToDelete.id);

      if (error) throw error;

      toast.success('Meta excluída com sucesso!');
      fetchMetas();
    } catch (error) {
      logger.error('Erro ao excluir meta:', error);
      toast.error('Erro ao excluir meta');
    } finally {
      setDeleteDialogOpen(false);
      setMetaToDelete(null);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedMeta(null);
  };

  const handleModalSuccess = () => {
    fetchMetas();
    handleModalClose();
  };

  // Get unique months from metas for filter
  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    metas.forEach(meta => {
      if (meta.mes) {
        months.add(meta.mes);
      }
    });
    return Array.from(months).sort().reverse();
  }, [metas]);

  // Format month for display
  const formatMonth = (dateStr: string) => {
    try {
      const parts = dateStr.split('-').map(Number);
      const year = parts[0];
      const month = parts[1];
      const date = new Date(year, month - 1, 1);
      return format(date, 'MMMM/yyyy', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  // Filtered metas
  const filteredMetas = useMemo(() => {
    return metas.filter(meta => {
      const matchesSearch = 
        meta.produtor?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meta.tipo_meta?.descricao?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesProdutor = filterProdutor === 'all' || meta.produtor_id === filterProdutor;
      const matchesTipoMeta = filterTipoMeta === 'all' || meta.tipo_meta_id === filterTipoMeta;
      const matchesMes = filterMes === 'all' || meta.mes === filterMes;

      return matchesSearch && matchesProdutor && matchesTipoMeta && matchesMes;
    });
  }, [metas, searchTerm, filterProdutor, filterTipoMeta, filterMes]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterProdutor('all');
    setFilterTipoMeta('all');
    setFilterMes('all');
  };

  const hasActiveFilters = searchTerm || filterProdutor !== 'all' || filterTipoMeta !== 'all' || filterMes !== 'all';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Target className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Metas</h1>
            <p className="text-muted-foreground text-sm">
              Gerenciamento de metas por produtor
            </p>
          </div>
        </div>
        {canManage && (
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nova Meta
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filter by Produtor */}
            <Select value={filterProdutor} onValueChange={setFilterProdutor}>
              <SelectTrigger>
                <SelectValue placeholder="Produtor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Produtores</SelectItem>
                {produtores?.filter(p => p.ativo).map(produtor => (
                  <SelectItem key={produtor.id} value={produtor.id}>
                    {produtor.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter by Tipo Meta */}
            <Select value={filterTipoMeta} onValueChange={setFilterTipoMeta}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de Meta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Tipos</SelectItem>
                {tiposMeta.map(tipo => (
                  <SelectItem key={tipo.id} value={tipo.id}>
                    {tipo.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter by Month */}
            <Select value={filterMes} onValueChange={setFilterMes}>
              <SelectTrigger>
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Meses</SelectItem>
                {uniqueMonths.map(mes => (
                  <SelectItem key={mes} value={mes}>
                    {formatMonth(mes)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produtor</TableHead>
                  <TableHead>Mês</TableHead>
                  <TableHead>Tipo de Meta</TableHead>
                  <TableHead className="text-center">Quantidade</TableHead>
                  {canManage && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 5 : 4} className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    </TableCell>
                  </TableRow>
                ) : filteredMetas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 5 : 4} className="text-center py-8 text-muted-foreground">
                      {hasActiveFilters ? 'Nenhuma meta encontrada com os filtros aplicados.' : 'Nenhuma meta cadastrada.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMetas.map((meta) => (
                    <TableRow key={meta.id}>
                      <TableCell className="font-medium">
                        {meta.produtor?.nome || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {formatMonth(meta.mes)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {meta.tipo_meta?.descricao || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-primary">
                          {meta.quantidade}
                        </span>
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(meta)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(meta)}
                              title="Excluir"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {filteredMetas.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Exibindo {filteredMetas.length} de {metas.length} metas
        </div>
      )}

      {/* Modal */}
      <MetaModal
        meta={selectedMeta}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        tiposMeta={tiposMeta}
        onTiposMetaChange={fetchTiposMeta}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta meta?
              <br />
              <strong>{metaToDelete?.produtor?.nome}</strong> - {metaToDelete?.mes ? formatMonth(metaToDelete.mes) : ''} - {metaToDelete?.tipo_meta?.descricao}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Metas;
