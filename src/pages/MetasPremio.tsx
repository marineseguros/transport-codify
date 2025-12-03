import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, DollarSign, Filter, Save, X } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useProdutores } from '@/hooks/useSupabaseData';
import { logger } from '@/lib/logger';

interface MetaPremio {
  id: string;
  produtor_id: string;
  ano: number;
  meta_jan: number;
  meta_fev: number;
  meta_mar: number;
  meta_abr: number;
  meta_mai: number;
  meta_jun: number;
  meta_jul: number;
  meta_ago: number;
  meta_set: number;
  meta_out: number;
  meta_nov: number;
  meta_dez: number;
  modulo: string;
  produtor?: { id: string; nome: string };
}

const MONTHS = [
  { key: 'meta_jan', label: 'Jan' },
  { key: 'meta_fev', label: 'Fev' },
  { key: 'meta_mar', label: 'Mar' },
  { key: 'meta_abr', label: 'Abr' },
  { key: 'meta_mai', label: 'Mai' },
  { key: 'meta_jun', label: 'Jun' },
  { key: 'meta_jul', label: 'Jul' },
  { key: 'meta_ago', label: 'Ago' },
  { key: 'meta_set', label: 'Set' },
  { key: 'meta_out', label: 'Out' },
  { key: 'meta_nov', label: 'Nov' },
  { key: 'meta_dez', label: 'Dez' },
] as const;

// Calculate accumulated meta (escadinha)
const calculateAccumulatedMetas = (meta: MetaPremio) => {
  const monthlyValues = MONTHS.map(m => meta[m.key as keyof MetaPremio] as number);
  
  // Step 1: Simple accumulation
  const simpleAccum: number[] = [];
  monthlyValues.forEach((value, index) => {
    if (index === 0) {
      simpleAccum.push(value);
    } else {
      simpleAccum.push(simpleAccum[index - 1] + value);
    }
  });
  
  // Step 2: Escadinha accumulation
  const escadinhaAccum: number[] = [];
  simpleAccum.forEach((value, index) => {
    if (index === 0) {
      escadinhaAccum.push(value);
    } else {
      escadinhaAccum.push(escadinhaAccum[index - 1] + value);
    }
  });
  
  return escadinhaAccum;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const MetasPremio = () => {
  const { user } = useAuth();
  const { produtores } = useProdutores();
  const [metas, setMetas] = useState<MetaPremio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProdutor, setFilterProdutor] = useState<string>('all');
  const [filterAno, setFilterAno] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [metaToDelete, setMetaToDelete] = useState<MetaPremio | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<MetaPremio | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAccumulated, setShowAccumulated] = useState(false);

  // Form state for new/edit
  const [formData, setFormData] = useState({
    produtor_id: '',
    ano: new Date().getFullYear(),
    meta_jan: 0,
    meta_fev: 0,
    meta_mar: 0,
    meta_abr: 0,
    meta_mai: 0,
    meta_jun: 0,
    meta_jul: 0,
    meta_ago: 0,
    meta_set: 0,
    meta_out: 0,
    meta_nov: 0,
    meta_dez: 0,
  });

  const canManage = user?.papel && ['Administrador', 'Gerente', 'CEO'].includes(user.papel);

  const fetchMetas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('metas_premio')
        .select(`
          *,
          produtor:produtores(id, nome)
        `)
        .order('ano', { ascending: false });

      if (error) throw error;
      setMetas((data as MetaPremio[]) || []);
    } catch (error) {
      logger.error('Erro ao carregar metas de prêmio:', error);
      toast.error('Erro ao carregar metas de prêmio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetas();
  }, []);

  const handleCreate = () => {
    setEditingMeta(null);
    setFormData({
      produtor_id: '',
      ano: new Date().getFullYear(),
      meta_jan: 0,
      meta_fev: 0,
      meta_mar: 0,
      meta_abr: 0,
      meta_mai: 0,
      meta_jun: 0,
      meta_jul: 0,
      meta_ago: 0,
      meta_set: 0,
      meta_out: 0,
      meta_nov: 0,
      meta_dez: 0,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (meta: MetaPremio) => {
    setEditingMeta(meta);
    setFormData({
      produtor_id: meta.produtor_id,
      ano: meta.ano,
      meta_jan: meta.meta_jan,
      meta_fev: meta.meta_fev,
      meta_mar: meta.meta_mar,
      meta_abr: meta.meta_abr,
      meta_mai: meta.meta_mai,
      meta_jun: meta.meta_jun,
      meta_jul: meta.meta_jul,
      meta_ago: meta.meta_ago,
      meta_set: meta.meta_set,
      meta_out: meta.meta_out,
      meta_nov: meta.meta_nov,
      meta_dez: meta.meta_dez,
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (meta: MetaPremio) => {
    setMetaToDelete(meta);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!metaToDelete) return;

    try {
      const { error } = await supabase
        .from('metas_premio')
        .delete()
        .eq('id', metaToDelete.id);

      if (error) throw error;

      toast.success('Meta de prêmio excluída com sucesso!');
      fetchMetas();
    } catch (error) {
      logger.error('Erro ao excluir meta:', error);
      toast.error('Erro ao excluir meta de prêmio');
    } finally {
      setDeleteDialogOpen(false);
      setMetaToDelete(null);
    }
  };

  const handleSave = async () => {
    if (!formData.produtor_id) {
      toast.error('Selecione um produtor');
      return;
    }

    setSaving(true);
    try {
      if (editingMeta) {
        // Update
        const { error } = await supabase
          .from('metas_premio')
          .update({
            meta_jan: formData.meta_jan,
            meta_fev: formData.meta_fev,
            meta_mar: formData.meta_mar,
            meta_abr: formData.meta_abr,
            meta_mai: formData.meta_mai,
            meta_jun: formData.meta_jun,
            meta_jul: formData.meta_jul,
            meta_ago: formData.meta_ago,
            meta_set: formData.meta_set,
            meta_out: formData.meta_out,
            meta_nov: formData.meta_nov,
            meta_dez: formData.meta_dez,
          })
          .eq('id', editingMeta.id);

        if (error) throw error;
        toast.success('Meta de prêmio atualizada com sucesso!');
      } else {
        // Insert
        const { error } = await supabase
          .from('metas_premio')
          .insert({
            produtor_id: formData.produtor_id,
            ano: formData.ano,
            meta_jan: formData.meta_jan,
            meta_fev: formData.meta_fev,
            meta_mar: formData.meta_mar,
            meta_abr: formData.meta_abr,
            meta_mai: formData.meta_mai,
            meta_jun: formData.meta_jun,
            meta_jul: formData.meta_jul,
            meta_ago: formData.meta_ago,
            meta_set: formData.meta_set,
            meta_out: formData.meta_out,
            meta_nov: formData.meta_nov,
            meta_dez: formData.meta_dez,
            modulo: user?.modulo || 'Transportes',
          });

        if (error) {
          if (error.code === '23505') {
            toast.error('Já existe uma meta para este produtor/ano');
            return;
          }
          throw error;
        }
        toast.success('Meta de prêmio criada com sucesso!');
      }

      setIsModalOpen(false);
      fetchMetas();
    } catch (error) {
      logger.error('Erro ao salvar meta:', error);
      toast.error('Erro ao salvar meta de prêmio');
    } finally {
      setSaving(false);
    }
  };

  const handleMonthChange = (month: string, value: string) => {
    const numValue = parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
    setFormData(prev => ({ ...prev, [month]: numValue }));
  };

  // Get unique years from metas
  const uniqueYears = useMemo(() => {
    const years = new Set<number>();
    metas.forEach(meta => years.add(meta.ano));
    // Add current year if not present
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [metas]);

  // Filtered metas
  const filteredMetas = useMemo(() => {
    return metas.filter(meta => {
      const matchesSearch = meta.produtor?.nome?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProdutor = filterProdutor === 'all' || meta.produtor_id === filterProdutor;
      const matchesAno = filterAno === 'all' || meta.ano.toString() === filterAno;

      return matchesSearch && matchesProdutor && matchesAno;
    });
  }, [metas, searchTerm, filterProdutor, filterAno]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterProdutor('all');
    setFilterAno('all');
  };

  const hasActiveFilters = searchTerm || filterProdutor !== 'all' || filterAno !== 'all';

  // Calculate form accumulated values for preview
  const formAccumulated = useMemo(() => {
    const tempMeta = {
      meta_jan: formData.meta_jan,
      meta_fev: formData.meta_fev,
      meta_mar: formData.meta_mar,
      meta_abr: formData.meta_abr,
      meta_mai: formData.meta_mai,
      meta_jun: formData.meta_jun,
      meta_jul: formData.meta_jul,
      meta_ago: formData.meta_ago,
      meta_set: formData.meta_set,
      meta_out: formData.meta_out,
      meta_nov: formData.meta_nov,
      meta_dez: formData.meta_dez,
    } as MetaPremio;
    return calculateAccumulatedMetas(tempMeta);
  }, [formData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Metas de Prêmio</h1>
            <p className="text-muted-foreground text-sm">
              Metas mensais de prêmio por produtor
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowAccumulated(!showAccumulated)}
          >
            {showAccumulated ? 'Ver Mensal' : 'Ver Acumulado'}
          </Button>
          {canManage && (
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Meta
            </Button>
          )}
        </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtor..."
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

            {/* Filter by Year */}
            <Select value={filterAno} onValueChange={setFilterAno}>
              <SelectTrigger>
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Anos</SelectItem>
                {uniqueYears.map(ano => (
                  <SelectItem key={ano} value={ano.toString()}>
                    {ano}
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
                  <TableHead className="sticky left-0 bg-background z-10">Produtor</TableHead>
                  <TableHead>Ano</TableHead>
                  {MONTHS.map(m => (
                    <TableHead key={m.key} className="text-center min-w-[80px]">
                      {showAccumulated ? `Acum ${m.label}` : m.label}
                    </TableHead>
                  ))}
                  {canManage && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 15 : 14} className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    </TableCell>
                  </TableRow>
                ) : filteredMetas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 15 : 14} className="text-center py-8 text-muted-foreground">
                      {hasActiveFilters ? 'Nenhuma meta encontrada com os filtros aplicados.' : 'Nenhuma meta de prêmio cadastrada.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMetas.map((meta) => {
                    const accumulated = calculateAccumulatedMetas(meta);
                    return (
                      <TableRow key={meta.id}>
                        <TableCell className="font-medium sticky left-0 bg-background z-10">
                          {meta.produtor?.nome || '-'}
                        </TableCell>
                        <TableCell>{meta.ano}</TableCell>
                        {MONTHS.map((m, index) => (
                          <TableCell key={m.key} className="text-center text-sm">
                            {showAccumulated 
                              ? formatCurrency(accumulated[index])
                              : formatCurrency(meta[m.key as keyof MetaPremio] as number)
                            }
                          </TableCell>
                        ))}
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
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {filteredMetas.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Exibindo {filteredMetas.length} de {metas.length} metas de prêmio
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMeta ? 'Editar Meta de Prêmio' : 'Nova Meta de Prêmio'}
            </DialogTitle>
            <DialogDescription>
              Defina as metas mensais de prêmio para o produtor
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Produtor and Year */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Produtor *</Label>
                <Select 
                  value={formData.produtor_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, produtor_id: value }))}
                  disabled={!!editingMeta}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produtor" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtores?.filter(p => p.ativo).map(produtor => (
                      <SelectItem key={produtor.id} value={produtor.id}>
                        {produtor.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ano *</Label>
                <Select 
                  value={formData.ano.toString()} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, ano: parseInt(value) }))}
                  disabled={!!editingMeta}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(5)].map((_, i) => {
                      const year = new Date().getFullYear() + 1 - i;
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Monthly Metas */}
            <div className="space-y-2">
              <Label>Metas Mensais (R$)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {MONTHS.map(m => (
                  <div key={m.key} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{m.label}</Label>
                    <Input
                      type="number"
                      value={formData[m.key as keyof typeof formData] || ''}
                      onChange={(e) => handleMonthChange(m.key, e.target.value)}
                      placeholder="0"
                      className="text-right"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Preview of Accumulated */}
            <div className="space-y-2">
              <Label>Preview - Meta Acumulada (Escadinha)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {MONTHS.map((m, index) => (
                  <div key={`acum-${m.key}`} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Acum {m.label}</Label>
                    <div className="p-2 bg-muted rounded-md text-right text-sm font-medium">
                      {formatCurrency(formAccumulated[index])}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta meta de prêmio?
              <br />
              <strong>{metaToDelete?.produtor?.nome}</strong> - {metaToDelete?.ano}
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

export default MetasPremio;
