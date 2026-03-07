import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, Search, Target, Download, BarChart3, X, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useProdutores } from '@/hooks/useSupabaseData';
import MetaModal from '@/components/MetaModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logger } from '@/lib/logger';
import MetasProdutosComparison from '@/components/dashboard/MetasProdutosComparison';
import ExportMetasProdutosModal from '@/components/ExportMetasProdutosModal';

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
  const [showVisualization, setShowVisualization] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

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
      const { error } = await supabase.from('metas').delete().eq('id', metaToDelete.id);
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

  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    metas.forEach(meta => { if (meta.mes) months.add(meta.mes); });
    return Array.from(months).sort().reverse();
  }, [metas]);

  const formatMonth = (dateStr: string) => {
    try {
      const parts = dateStr.split('-').map(Number);
      const date = new Date(parts[0], parts[1] - 1, 1);
      return format(date, 'MMM/yyyy', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

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

  // Summary stats
  const totalQuantidade = useMemo(() => filteredMetas.reduce((sum, m) => sum + m.quantidade, 0), [filteredMetas]);
  const uniqueProdutores = useMemo(() => new Set(filteredMetas.map(m => m.produtor_id)).size, [filteredMetas]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Metas de Produtos</h1>
            <p className="text-sm text-muted-foreground">
              Coleta, Visita, Vídeo, Indicação, Cotação e Fechamento
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showVisualization ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowVisualization(!showVisualization)}
            className="gap-1.5"
          >
            <BarChart3 className="h-4 w-4" />
            {showVisualization ? 'Tabela' : 'Análise'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsExportModalOpen(true)} className="gap-1.5">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          {canManage && (
            <Button size="sm" onClick={handleCreate} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Nova Meta
            </Button>
          )}
        </div>
      </div>

      {/* Compact Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/30">
        <div className="relative flex-1 min-w-[160px] max-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-sm bg-background"
          />
        </div>

        <Select value={filterProdutor} onValueChange={setFilterProdutor}>
          <SelectTrigger className="h-8 w-auto min-w-[140px] text-sm bg-background">
            <SelectValue placeholder="Produtor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Produtores</SelectItem>
            {produtores?.filter(p => p.ativo).map(p => (
              <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterTipoMeta} onValueChange={setFilterTipoMeta}>
          <SelectTrigger className="h-8 w-auto min-w-[130px] text-sm bg-background">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Tipos</SelectItem>
            {tiposMeta.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.descricao}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterMes} onValueChange={setFilterMes}>
          <SelectTrigger className="h-8 w-auto min-w-[120px] text-sm bg-background">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Meses</SelectItem>
            {uniqueMonths.map(mes => (
              <SelectItem key={mes} value={mes}>{formatMonth(mes)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs text-muted-foreground">
            <X className="h-3.5 w-3.5 mr-1" />
            Limpar
          </Button>
        )}

        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span><strong className="text-foreground">{filteredMetas.length}</strong> metas</span>
          <Separator orientation="vertical" className="h-3.5" />
          <span><strong className="text-foreground">{uniqueProdutores}</strong> produtores</span>
          <Separator orientation="vertical" className="h-3.5" />
          <span>Total: <strong className="text-foreground">{totalQuantidade.toLocaleString('pt-BR')}</strong></span>
        </div>
      </div>

      {/* Visualization or Table */}
      {showVisualization ? (
        <MetasProdutosComparison
          filterAno={filterMes !== 'all' ? filterMes.split('-')[0] : 'all'}
          filterProdutor={filterProdutor}
          metas={metas}
          tiposMeta={tiposMeta}
          produtorNome={produtores?.find(p => p.id === filterProdutor)?.nome || ''}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produtor</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    {canManage && <TableHead className="text-right w-[80px]">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={canManage ? 5 : 4} className="text-center py-12">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto"></div>
                      </TableCell>
                    </TableRow>
                  ) : filteredMetas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canManage ? 5 : 4} className="text-center py-12 text-muted-foreground">
                        {hasActiveFilters ? 'Nenhuma meta encontrada com os filtros aplicados.' : 'Nenhuma meta cadastrada.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMetas.map((meta) => (
                      <TableRow key={meta.id} className="group">
                        <TableCell className="font-medium">{meta.produtor?.nome || '—'}</TableCell>
                        <TableCell>
                          <span className="text-sm capitalize">{formatMonth(meta.mes)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal text-xs">
                            {meta.tipo_meta?.descricao || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold tabular-nums">{meta.quantidade}</span>
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <div className="flex gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(meta)} title="Editar">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteClick(meta)} title="Excluir">
                                <Trash2 className="h-3.5 w-3.5" />
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

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta meta?
              <br />
              <strong>{metaToDelete?.produtor?.nome}</strong> — {metaToDelete?.mes ? formatMonth(metaToDelete.mes) : ''} — {metaToDelete?.tipo_meta?.descricao}
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

      {/* Export Modal */}
      <ExportMetasProdutosModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        metas={metas}
      />
    </div>
  );
};

export default Metas;
