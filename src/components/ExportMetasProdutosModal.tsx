import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Meta {
  id: string;
  produtor_id: string;
  mes: string;
  tipo_meta_id: string;
  quantidade: number;
  modulo: string;
  produtor?: { id: string; nome: string };
  tipo_meta?: { id: string; descricao: string };
}

interface ExportMetasProdutosModalProps {
  isOpen: boolean;
  onClose: () => void;
  metas: Meta[];
}

const ALL_COLUMNS = [
  { key: 'produtor', label: 'Produtor', category: 'Informações' },
  { key: 'mes', label: 'Mês', category: 'Informações' },
  { key: 'tipo_meta', label: 'Tipo de Meta', category: 'Informações' },
  { key: 'quantidade', label: 'Quantidade', category: 'Meta' },
];

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

export const ExportMetasProdutosModal = ({ isOpen, onClose, metas }: ExportMetasProdutosModalProps) => {
  const [filterAno, setFilterAno] = useState<string>('all');
  const [filterProdutor, setFilterProdutor] = useState<string>('all');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    ALL_COLUMNS.map(c => c.key)
  );

  const uniqueYears = useMemo(() => {
    const years = new Set<number>();
    metas.forEach(m => {
      const year = parseInt(m.mes.split('-')[0]);
      if (!isNaN(year)) years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [metas]);

  const uniqueProdutores = useMemo(() => {
    const produtores = new Map<string, string>();
    metas.forEach(m => {
      if (m.produtor) {
        produtores.set(m.produtor.id, m.produtor.nome);
      }
    });
    return Array.from(produtores.entries()).map(([id, nome]) => ({ id, nome }));
  }, [metas]);

  const filteredMetas = useMemo(() => {
    return metas.filter(m => {
      const matchesAno = filterAno === 'all' || m.mes.startsWith(filterAno);
      const matchesProdutor = filterProdutor === 'all' || m.produtor_id === filterProdutor;
      return matchesAno && matchesProdutor;
    });
  }, [metas, filterAno, filterProdutor]);

  const columnsByCategory = useMemo(() => {
    const categories: Record<string, typeof ALL_COLUMNS> = {};
    ALL_COLUMNS.forEach(col => {
      if (!categories[col.category]) {
        categories[col.category] = [];
      }
      categories[col.category].push(col);
    });
    return categories;
  }, []);

  const handleToggleColumn = (columnKey: string) => {
    setSelectedColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(k => k !== columnKey)
        : [...prev, columnKey]
    );
  };

  const handleSelectAll = (category: string) => {
    const categoryColumns = columnsByCategory[category].map(c => c.key);
    const allSelected = categoryColumns.every(k => selectedColumns.includes(k));
    
    if (allSelected) {
      setSelectedColumns(prev => prev.filter(k => !categoryColumns.includes(k)));
    } else {
      setSelectedColumns(prev => [...new Set([...prev, ...categoryColumns])]);
    }
  };

  const handleExport = () => {
    if (filteredMetas.length === 0) {
      toast.error('Não há dados para exportar com os filtros selecionados');
      return;
    }

    if (selectedColumns.length === 0) {
      toast.error('Selecione pelo menos uma coluna para exportar');
      return;
    }

    const data = filteredMetas.map(meta => {
      const row: Record<string, unknown> = {};

      selectedColumns.forEach(colKey => {
        const column = ALL_COLUMNS.find(c => c.key === colKey);
        if (!column) return;

        if (colKey === 'produtor') {
          row[column.label] = meta.produtor?.nome || '-';
        } else if (colKey === 'mes') {
          row[column.label] = formatMonth(meta.mes);
        } else if (colKey === 'tipo_meta') {
          row[column.label] = meta.tipo_meta?.descricao || '-';
        } else if (colKey === 'quantidade') {
          row[column.label] = meta.quantidade;
        }
      });

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Metas de Produtos');

    const ano = filterAno === 'all' ? 'todos' : filterAno;
    const fileName = `metas_produtos_${ano}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    toast.success('Arquivo exportado com sucesso!');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Exportar Metas de Produtos
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ano</Label>
                <Select value={filterAno} onValueChange={setFilterAno}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os anos</SelectItem>
                    {uniqueYears.map(ano => (
                      <SelectItem key={ano} value={ano.toString()}>
                        {ano}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Produtor</Label>
                <Select value={filterProdutor} onValueChange={setFilterProdutor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produtor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os produtores</SelectItem>
                    {uniqueProdutores.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Column Selection */}
            <div className="space-y-4">
              <Label>Colunas para exportar</Label>
              
              {Object.entries(columnsByCategory).map(([category, columns]) => (
                <div key={category} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={columns.every(c => selectedColumns.includes(c.key))}
                      onCheckedChange={() => handleSelectAll(category)}
                    />
                    <span className="font-medium text-sm">{category}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 ml-6">
                    {columns.map(col => (
                      <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={selectedColumns.includes(col.key)}
                          onCheckedChange={() => handleToggleColumn(col.key)}
                        />
                        {col.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="p-3 bg-muted rounded-md text-sm">
              <p><strong>{filteredMetas.length}</strong> registro(s) serão exportados</p>
              <p><strong>{selectedColumns.length}</strong> coluna(s) selecionada(s)</p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportMetasProdutosModal;
