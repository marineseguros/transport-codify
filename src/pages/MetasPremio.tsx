import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, Search, DollarSign, Save, Check, Download, X } from 'lucide-react';
import EscadinhaVisualization from '@/components/EscadinhaVisualization';
import ExportMetasPremioModal from '@/components/ExportMetasPremioModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

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

const calculateAccumulatedMetas = (meta: MetaPremio) => {
  const monthlyValues = MONTHS.map(m => meta[m.key as keyof MetaPremio] as number);
  const simpleAccum: number[] = [];
  monthlyValues.forEach((value, index) => {
    simpleAccum.push(index === 0 ? value : simpleAccum[index - 1] + value);
  });
  const escadinhaAccum: number[] = [];
  simpleAccum.forEach((value, index) => {
    escadinhaAccum.push(index === 0 ? value : escadinhaAccum[index - 1] + value);
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
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    produtor_id: '',
    ano: new Date().getFullYear(),
    meta_jan: 0, meta_fev: 0, meta_mar: 0, meta_abr: 0,
    meta_mai: 0, meta_jun: 0, meta_jul: 0, meta_ago: 0,
    meta_set: 0, meta_out: 0, meta_nov: 0, meta_dez: 0,
  });

  const [selectedProdutores, setSelectedProdutores] = useState<string[]>([]);

  const canManage = user?.papel && ['Administrador', 'Gerente', 'CEO'].includes(user.papel);

  const fetchMetas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('metas_premio')
        .select(`*, produtor:produtores(id, nome)`)
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

  useEffect(() => { fetchMetas(); }, []);

  const handleCreate = () => {
    setEditingMeta(null);
    setSelectedProdutores([]);
    setFormData({
      produtor_id: '', ano: new Date().getFullYear(),
      meta_jan: 0, meta_fev: 0, meta_mar: 0, meta_abr: 0,
      meta_mai: 0, meta_jun: 0, meta_jul: 0, meta_ago: 0,
      meta_set: 0, meta_out: 0, meta_nov: 0, meta_dez: 0,
    });
    setIsModalOpen(true);
  };

  const handleToggleProdutor = (produtorId: string) => {
    setSelectedProdutores(prev =>
      prev.includes(produtorId) ? prev.filter(id => id !== produtorId) : [...prev, produtorId]
    );
  };

  const handleEdit = (meta: MetaPremio) => {
    setEditingMeta(meta);
    setFormData({
      produtor_id: meta.produtor_id, ano: meta.ano,
      meta_jan: meta.meta_jan, meta_fev: meta.meta_fev, meta_mar: meta.meta_mar, meta_abr: meta.meta_abr,
      meta_mai: meta.meta_mai, meta_jun: meta.meta_jun, meta_jul: meta.meta_jul, meta_ago: meta.meta_ago,
      meta_set: meta.meta_set, meta_out: meta.meta_out, meta_nov: meta.meta_nov, meta_dez: meta.meta_dez,
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
      const { error } = await supabase.from('metas_premio').delete().eq('id', metaToDelete.id);
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
    if (editingMeta) {
      if (!formData.produtor_id) { toast.error('Selecione um produtor'); return; }
    } else {
      if (selectedProdutores.length === 0) { toast.error('Selecione pelo menos um produtor'); return; }
    }

    setSaving(true);
    try {
      if (editingMeta) {
        const { error } = await supabase
          .from('metas_premio')
          .update({
            meta_jan: formData.meta_jan, meta_fev: formData.meta_fev, meta_mar: formData.meta_mar, meta_abr: formData.meta_abr,
            meta_mai: formData.meta_mai, meta_jun: formData.meta_jun, meta_jul: formData.meta_jul, meta_ago: formData.meta_ago,
            meta_set: formData.meta_set, meta_out: formData.meta_out, meta_nov: formData.meta_nov, meta_dez: formData.meta_dez,
          })
          .eq('id', editingMeta.id);
        if (error) throw error;
        toast.success('Meta de prêmio atualizada com sucesso!');
      } else {
        const metasToInsert = selectedProdutores.map(produtorId => ({
          produtor_id: produtorId, ano: formData.ano,
          meta_jan: formData.meta_jan, meta_fev: formData.meta_fev, meta_mar: formData.meta_mar, meta_abr: formData.meta_abr,
          meta_mai: formData.meta_mai, meta_jun: formData.meta_jun, meta_jul: formData.meta_jul, meta_ago: formData.meta_ago,
          meta_set: formData.meta_set, meta_out: formData.meta_out, meta_nov: formData.meta_nov, meta_dez: formData.meta_dez,
          modulo: user?.modulo || 'Transportes',
        }));
        const { error } = await supabase.from('metas_premio').insert(metasToInsert);
        if (error) {
          if (error.code === '23505') { toast.error('Já existe uma meta para algum produtor/ano selecionado'); return; }
          throw error;
        }
        toast.success(`${metasToInsert.length} meta(s) de prêmio criada(s) com sucesso!`);
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

  const uniqueYears = useMemo(() => {
    const years = new Set<number>();
    metas.forEach(meta => years.add(meta.ano));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [metas]);

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

  const formAccumulated = useMemo(() => {
    const tempMeta = { ...formData } as unknown as MetaPremio;
    return calculateAccumulatedMetas(tempMeta);
  }, [formData]);

  // Summary
  const totalAnual = useMemo(() => {
    return filteredMetas.reduce((sum, m) => {
      return sum + MONTHS.reduce((s, mo) => s + (Number(m[mo.key as keyof MetaPremio]) || 0), 0);
    }, 0);
  }, [filteredMetas]);

  const uniqueProdutoresCount = useMemo(() => new Set(filteredMetas.map(m => m.produtor_id)).size, [filteredMetas]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-success/10">
            <DollarSign className="h-5 w-5 text-success" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Metas de Prêmio</h1>
            <p className="text-sm text-muted-foreground">
              Metas mensais de prêmio com escadinha acumulativa
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showAccumulated ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowAccumulated(!showAccumulated)}
          >
            {showAccumulated ? 'Mensal' : 'Acumulado'}
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
            placeholder="Buscar produtor..."
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

        <Select value={filterAno} onValueChange={setFilterAno}>
          <SelectTrigger className="h-8 w-auto min-w-[90px] text-sm bg-background">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {uniqueYears.map(ano => (
              <SelectItem key={ano} value={ano.toString()}>{ano}</SelectItem>
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
          <span><strong className="text-foreground">{filteredMetas.length}</strong> registros</span>
          <Separator orientation="vertical" className="h-3.5" />
          <span><strong className="text-foreground">{uniqueProdutoresCount}</strong> produtores</span>
          <Separator orientation="vertical" className="h-3.5" />
          <span>Total: <strong className="text-foreground">{formatCurrency(totalAnual)}</strong></span>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10">Produtor</TableHead>
                  <TableHead className="text-center w-[60px]">Ano</TableHead>
                  {MONTHS.map(m => (
                    <TableHead key={m.key} className="text-center min-w-[75px] text-xs">
                      {showAccumulated ? `Ac.${m.label}` : m.label}
                    </TableHead>
                  ))}
                  {canManage && <TableHead className="text-right w-[80px]">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 15 : 14} className="text-center py-12">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto"></div>
                    </TableCell>
                  </TableRow>
                ) : filteredMetas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 15 : 14} className="text-center py-12 text-muted-foreground">
                      {hasActiveFilters ? 'Nenhuma meta encontrada.' : 'Nenhuma meta de prêmio cadastrada.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMetas.map((meta) => {
                    const accumulated = calculateAccumulatedMetas(meta);
                    return (
                      <TableRow key={meta.id} className="group">
                        <TableCell className="font-medium sticky left-0 bg-background z-10">
                          {meta.produtor?.nome || '—'}
                        </TableCell>
                        <TableCell className="text-center text-sm tabular-nums">{meta.ano}</TableCell>
                        {MONTHS.map((m, index) => (
                          <TableCell key={m.key} className="text-center text-xs tabular-nums">
                            {showAccumulated
                              ? formatCurrency(accumulated[index])
                              : formatCurrency(meta[m.key as keyof MetaPremio] as number)
                            }
                          </TableCell>
                        ))}
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
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Escadinha Visualization */}
      {filterProdutor !== 'all' && filteredMetas.length > 0 && (
        <EscadinhaVisualization meta={filteredMetas[0]} />
      )}

      {filterProdutor === 'all' && filteredMetas.length > 0 && (
        <EscadinhaVisualization
          meta={{
            id: 'total',
            produtor_id: 'total',
            ano: filterAno !== 'all' ? parseInt(filterAno) : new Date().getFullYear(),
            meta_jan: filteredMetas.reduce((sum, m) => sum + m.meta_jan, 0),
            meta_fev: filteredMetas.reduce((sum, m) => sum + m.meta_fev, 0),
            meta_mar: filteredMetas.reduce((sum, m) => sum + m.meta_mar, 0),
            meta_abr: filteredMetas.reduce((sum, m) => sum + m.meta_abr, 0),
            meta_mai: filteredMetas.reduce((sum, m) => sum + m.meta_mai, 0),
            meta_jun: filteredMetas.reduce((sum, m) => sum + m.meta_jun, 0),
            meta_jul: filteredMetas.reduce((sum, m) => sum + m.meta_jul, 0),
            meta_ago: filteredMetas.reduce((sum, m) => sum + m.meta_ago, 0),
            meta_set: filteredMetas.reduce((sum, m) => sum + m.meta_set, 0),
            meta_out: filteredMetas.reduce((sum, m) => sum + m.meta_out, 0),
            meta_nov: filteredMetas.reduce((sum, m) => sum + m.meta_nov, 0),
            meta_dez: filteredMetas.reduce((sum, m) => sum + m.meta_dez, 0),
            produtor: { id: 'total', nome: 'Total Geral (Todos Produtores)' }
          }}
        />
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingMeta ? 'Editar Meta de Prêmio' : 'Nova Meta de Prêmio'}</DialogTitle>
            <DialogDescription>
              {editingMeta
                ? 'Edite as metas mensais de prêmio para o produtor'
                : 'Defina as metas mensais de prêmio para os produtores selecionados'
              }
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 py-4">
              {editingMeta ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Produtor *</Label>
                    <Select value={formData.produtor_id} onValueChange={(value) => setFormData(prev => ({ ...prev, produtor_id: value }))} disabled>
                      <SelectTrigger><SelectValue placeholder="Selecione o produtor" /></SelectTrigger>
                      <SelectContent>
                        {produtores?.filter(p => p.ativo).map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ano *</Label>
                    <Select value={formData.ano.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, ano: parseInt(value) }))} disabled>
                      <SelectTrigger><SelectValue placeholder="Selecione o ano" /></SelectTrigger>
                      <SelectContent>
                        {[...Array(5)].map((_, i) => {
                          const year = new Date().getFullYear() + 1 - i;
                          return <SelectItem key={year} value={year.toString()}>{year}</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Produtores *</Label>
                    <div className="flex flex-wrap gap-2">
                      {produtores?.filter(p => p.ativo).map(produtor => {
                        const isSelected = selectedProdutores.includes(produtor.id);
                        return (
                          <Badge
                            key={produtor.id}
                            variant={isSelected ? "default" : "outline"}
                            className={cn(
                              "cursor-pointer transition-all px-3 py-1.5 text-sm",
                              isSelected ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-accent"
                            )}
                            onClick={() => handleToggleProdutor(produtor.id)}
                          >
                            {isSelected && <Check className="h-3 w-3 mr-1" />}
                            {produtor.nome}
                          </Badge>
                        );
                      })}
                    </div>
                    {selectedProdutores.length > 0 && (
                      <p className="text-xs text-muted-foreground">{selectedProdutores.length} produtor(es) selecionado(s)</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Ano *</Label>
                    <div className="flex flex-wrap gap-2">
                      {[...Array(5)].map((_, i) => {
                        const year = new Date().getFullYear() + 1 - i;
                        const isSelected = formData.ano === year;
                        return (
                          <Badge
                            key={year}
                            variant={isSelected ? "default" : "outline"}
                            className={cn(
                              "cursor-pointer transition-all px-3 py-1.5 text-sm",
                              isSelected ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-accent"
                            )}
                            onClick={() => setFormData(prev => ({ ...prev, ano: year }))}
                          >
                            {isSelected && <Check className="h-3 w-3 mr-1" />}
                            {year}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

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
                        className="text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Preview — Escadinha Acumulada</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {MONTHS.map((m, index) => (
                    <div key={`acum-${m.key}`} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Ac. {m.label}</Label>
                      <div className="p-2 bg-muted rounded-md text-right text-sm font-medium tabular-nums">
                        {formatCurrency(formAccumulated[index])}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancelar</Button>
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

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta meta de prêmio?
              <br />
              <strong>{metaToDelete?.produtor?.nome}</strong> — {metaToDelete?.ano}
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
      <ExportMetasPremioModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        metas={metas}
      />
    </div>
  );
};

export default MetasPremio;
