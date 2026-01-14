import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { logger } from '@/lib/logger';
import { Plus, X, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

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
}

interface MetaModalProps {
  meta: Meta | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tiposMeta: TipoMeta[];
  onTiposMetaChange: () => void;
}

const MetaModal = ({ meta, isOpen, onClose, onSuccess, tiposMeta, onTiposMetaChange }: MetaModalProps) => {
  const { user } = useAuth();
  const { produtores } = useProdutores();
  const [loading, setLoading] = useState(false);
  const [showNewTipoInput, setShowNewTipoInput] = useState(false);
  const [newTipoMeta, setNewTipoMeta] = useState('');
  const [creatingTipo, setCreatingTipo] = useState(false);

  // Single edit mode form data
  const [formData, setFormData] = useState({
    produtor_id: '',
    mes: '',
    tipo_meta_id: '',
    quantidade: 0,
  });

  // Batch creation mode data
  const [selectedProdutores, setSelectedProdutores] = useState<string[]>([]);
  const [selectedAno, setSelectedAno] = useState<number>(new Date().getFullYear());
  const [selectedMeses, setSelectedMeses] = useState<string[]>([]);
  const [quantidadesPorTipo, setQuantidadesPorTipo] = useState<Record<string, number>>({});

  const isEditMode = !!meta;

  // Generate available years (current year - 1 to current year + 2)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
  }, []);

  // Generate months for the selected year
  const monthsForYear = useMemo(() => {
    const months = [
      { value: '01', label: 'Janeiro', shortLabel: 'Jan' },
      { value: '02', label: 'Fevereiro', shortLabel: 'Fev' },
      { value: '03', label: 'Março', shortLabel: 'Mar' },
      { value: '04', label: 'Abril', shortLabel: 'Abr' },
      { value: '05', label: 'Maio', shortLabel: 'Mai' },
      { value: '06', label: 'Junho', shortLabel: 'Jun' },
      { value: '07', label: 'Julho', shortLabel: 'Jul' },
      { value: '08', label: 'Agosto', shortLabel: 'Ago' },
      { value: '09', label: 'Setembro', shortLabel: 'Set' },
      { value: '10', label: 'Outubro', shortLabel: 'Out' },
      { value: '11', label: 'Novembro', shortLabel: 'Nov' },
      { value: '12', label: 'Dezembro', shortLabel: 'Dez' },
    ];
    return months.map(m => ({
      ...m,
      fullValue: `${selectedAno}-${m.value}`,
    }));
  }, [selectedAno]);

  useEffect(() => {
    if (meta) {
      // Edit mode - single record
      let mesValue = '';
      if (meta.mes) {
        const parts = meta.mes.split('-');
        if (parts.length >= 2) {
          mesValue = `${parts[0]}-${parts[1]}`;
        }
      }
      setFormData({
        produtor_id: meta.produtor_id,
        mes: mesValue,
        tipo_meta_id: meta.tipo_meta_id,
        quantidade: meta.quantidade,
      });
    } else {
      // Create mode - batch
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      setFormData({
        produtor_id: '',
        mes: `${year}-${month}`,
        tipo_meta_id: '',
        quantidade: 0,
      });
      setSelectedProdutores([]);
      setSelectedAno(year);
      setSelectedMeses([`${year}-${month}`]);
      // Initialize quantities for all active tipos_meta
      const initialQuantities: Record<string, number> = {};
      tiposMeta.filter(t => t.ativo).forEach(tipo => {
        initialQuantities[tipo.id] = 0;
      });
      setQuantidadesPorTipo(initialQuantities);
    }
    setShowNewTipoInput(false);
    setNewTipoMeta('');
  }, [meta, isOpen, tiposMeta]);

  const handleCreateTipoMeta = async () => {
    if (!newTipoMeta.trim()) {
      toast.error('Digite um nome para o tipo de meta');
      return;
    }

    setCreatingTipo(true);
    try {
      const { data, error } = await supabase
        .from('tipos_meta')
        .insert({ descricao: newTipoMeta.trim() })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Este tipo de meta já existe');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Tipo de meta criado com sucesso!');
      onTiposMetaChange();
      
      if (isEditMode) {
        setFormData(prev => ({ ...prev, tipo_meta_id: data.id }));
      } else {
        setQuantidadesPorTipo(prev => ({ ...prev, [data.id]: 0 }));
      }
      
      setShowNewTipoInput(false);
      setNewTipoMeta('');
    } catch (error) {
      logger.error('Erro ao criar tipo de meta:', error);
      toast.error('Erro ao criar tipo de meta');
    } finally {
      setCreatingTipo(false);
    }
  };

  const handleToggleProdutor = (produtorId: string) => {
    setSelectedProdutores(prev => 
      prev.includes(produtorId) 
        ? prev.filter(id => id !== produtorId)
        : [...prev, produtorId]
    );
  };

  const handleToggleMes = (mes: string) => {
    setSelectedMeses(prev => 
      prev.includes(mes) 
        ? prev.filter(m => m !== mes)
        : [...prev, mes]
    );
  };

  const handleQuantidadeChange = (tipoId: string, quantidade: number) => {
    setQuantidadesPorTipo(prev => ({ ...prev, [tipoId]: quantidade }));
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.produtor_id) {
      toast.error('Selecione um produtor');
      return;
    }
    if (!formData.mes) {
      toast.error('Selecione o mês');
      return;
    }
    if (!formData.tipo_meta_id) {
      toast.error('Selecione o tipo de meta');
      return;
    }
    if (formData.quantidade < 0) {
      toast.error('A quantidade deve ser maior ou igual a zero');
      return;
    }

    setLoading(true);
    try {
      const mesDate = `${formData.mes}-01`;

      const dataToSave = {
        produtor_id: formData.produtor_id,
        mes: mesDate,
        tipo_meta_id: formData.tipo_meta_id,
        quantidade: formData.quantidade,
        modulo: user?.modulo || 'Transportes',
        created_by: user?.user_id,
      };

      const { error } = await supabase
        .from('metas')
        .update(dataToSave)
        .eq('id', meta!.id);

      if (error) throw error;
      toast.success('Meta atualizada com sucesso!');
      onSuccess();
    } catch (error) {
      logger.error('Erro ao salvar meta:', error);
      toast.error('Erro ao salvar meta');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBatch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedProdutores.length === 0) {
      toast.error('Selecione pelo menos um produtor');
      return;
    }
    if (selectedMeses.length === 0) {
      toast.error('Selecione pelo menos um mês');
      return;
    }

    // Get tipos with quantity > 0
    const tiposComQuantidade = Object.entries(quantidadesPorTipo)
      .filter(([_, qtd]) => qtd > 0)
      .map(([tipoId, qtd]) => ({ tipoId, quantidade: qtd }));

    if (tiposComQuantidade.length === 0) {
      toast.error('Defina a quantidade para pelo menos um tipo de meta');
      return;
    }

    setLoading(true);
    try {
      // Create all combinations
      const modulo = (user?.modulo || 'Transportes') as 'Transportes' | 'Ramos Elementares';
      const metasToInsert: Array<{
        produtor_id: string;
        mes: string;
        tipo_meta_id: string;
        quantidade: number;
        modulo: 'Transportes' | 'Ramos Elementares';
        created_by: string | undefined;
      }> = [];

      for (const produtorId of selectedProdutores) {
        for (const mes of selectedMeses) {
          for (const { tipoId, quantidade } of tiposComQuantidade) {
            metasToInsert.push({
              produtor_id: produtorId,
              mes: `${mes}-01`,
              tipo_meta_id: tipoId,
              quantidade,
              modulo,
              created_by: user?.user_id,
            });
          }
        }
      }

      const { error } = await supabase
        .from('metas')
        .insert(metasToInsert);

      if (error) {
        if (error.code === '23505') {
          toast.error('Algumas metas já existem para a combinação selecionada');
        } else {
          throw error;
        }
        return;
      }

      toast.success(`${metasToInsert.length} meta(s) criada(s) com sucesso!`);
      onSuccess();
    } catch (error) {
      logger.error('Erro ao salvar metas:', error);
      toast.error('Erro ao salvar metas');
    } finally {
      setLoading(false);
    }
  };

  const activeProdutores = produtores?.filter(p => p.ativo) || [];
  const activeTiposMeta = tiposMeta.filter(t => t.ativo);

  // Edit mode - single record form
  if (isEditMode) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Meta</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="produtor_id">Produtor *</Label>
                <Select
                  value={formData.produtor_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, produtor_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produtor" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeProdutores.map(produtor => (
                      <SelectItem key={produtor.id} value={produtor.id}>
                        {produtor.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mes">Mês *</Label>
                <Input
                  id="mes"
                  type="month"
                  value={formData.mes}
                  onChange={(e) => setFormData(prev => ({ ...prev, mes: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo_meta_id">Tipo de Meta *</Label>
                <Select
                  value={formData.tipo_meta_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_meta_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de meta" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposMeta.map(tipo => (
                      <SelectItem key={tipo.id} value={tipo.id}>
                        {tipo.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantidade *</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min="0"
                  value={formData.quantidade}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantidade: parseInt(e.target.value) || 0 }))}
                  required
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // Create mode - batch form with improved UI
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Nova Meta (Criação em Lote)</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmitBatch}>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-5 py-4">
              {/* Produtores - Badge Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Produtores *</Label>
                <div className="flex flex-wrap gap-2">
                  {activeProdutores.map(produtor => {
                    const isSelected = selectedProdutores.includes(produtor.id);
                    return (
                      <Badge
                        key={produtor.id}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-all px-3 py-1.5 text-sm",
                          isSelected 
                            ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                            : "hover:bg-accent"
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
                  <p className="text-xs text-muted-foreground">
                    {selectedProdutores.length} selecionado(s)
                  </p>
                )}
              </div>

              {/* Ano Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Ano *</Label>
                <div className="flex flex-wrap gap-2">
                  {availableYears.map(year => {
                    const isSelected = selectedAno === year;
                    return (
                      <Badge
                        key={year}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-all px-3 py-1.5 text-sm",
                          isSelected 
                            ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                            : "hover:bg-accent"
                        )}
                        onClick={() => {
                          setSelectedAno(year);
                          // Clear selected months when year changes
                          setSelectedMeses([]);
                        }}
                      >
                        {isSelected && <Check className="h-3 w-3 mr-1" />}
                        {year}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Meses - Badge Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Meses *</Label>
                <div className="flex flex-wrap gap-1.5">
                  {monthsForYear.map(({ fullValue, shortLabel }) => {
                    const isSelected = selectedMeses.includes(fullValue);
                    return (
                      <Badge
                        key={fullValue}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-all px-2 py-1 text-xs capitalize",
                          isSelected 
                            ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                            : "hover:bg-accent"
                        )}
                        onClick={() => handleToggleMes(fullValue)}
                      >
                        {isSelected && <Check className="h-2.5 w-2.5 mr-0.5" />}
                        {shortLabel}
                      </Badge>
                    );
                  })}
                </div>
                {selectedMeses.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedMeses.length} mês(es) selecionado(s)
                  </p>
                )}
              </div>

              {/* Tipos de Meta com Quantidade Individual */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Quantidade por Tipo *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewTipoInput(true)}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Novo Tipo
                  </Button>
                </div>

                {showNewTipoInput && (
                  <div className="flex gap-2 p-2 border rounded-lg bg-muted/50">
                    <Input
                      value={newTipoMeta}
                      onChange={(e) => setNewTipoMeta(e.target.value)}
                      placeholder="Nome do novo tipo"
                      disabled={creatingTipo}
                      className="flex-1 h-8 text-sm"
                    />
                    <Button
                      type="button"
                      onClick={handleCreateTipoMeta}
                      disabled={creatingTipo}
                      size="sm"
                      className="h-8"
                    >
                      {creatingTipo ? 'Salvando...' : 'Salvar'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setShowNewTipoInput(false);
                        setNewTipoMeta('');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {activeTiposMeta.map(tipo => (
                    <div 
                      key={tipo.id} 
                      className="flex items-center justify-between p-2 border rounded-lg bg-card"
                    >
                      <span className="text-sm font-medium truncate mr-2">{tipo.descricao}</span>
                      <Input
                        type="number"
                        min="0"
                        value={quantidadesPorTipo[tipo.id] || 0}
                        onChange={(e) => handleQuantidadeChange(tipo.id, parseInt(e.target.value) || 0)}
                        className="w-16 h-8 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Apenas tipos com quantidade {'>'}  0 serão criados
                </p>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Metas'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MetaModal;
