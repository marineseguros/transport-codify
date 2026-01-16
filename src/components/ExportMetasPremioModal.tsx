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

interface ExportMetasPremioModalProps {
  isOpen: boolean;
  onClose: () => void;
  metas: MetaPremio[];
}

const MONTHS = [
  { key: 'meta_jan', label: 'Janeiro' },
  { key: 'meta_fev', label: 'Fevereiro' },
  { key: 'meta_mar', label: 'Março' },
  { key: 'meta_abr', label: 'Abril' },
  { key: 'meta_mai', label: 'Maio' },
  { key: 'meta_jun', label: 'Junho' },
  { key: 'meta_jul', label: 'Julho' },
  { key: 'meta_ago', label: 'Agosto' },
  { key: 'meta_set', label: 'Setembro' },
  { key: 'meta_out', label: 'Outubro' },
  { key: 'meta_nov', label: 'Novembro' },
  { key: 'meta_dez', label: 'Dezembro' },
] as const;

const calculateAccumulatedMetas = (meta: MetaPremio): number[] => {
  const monthlyValues = MONTHS.map(m => meta[m.key as keyof MetaPremio] as number);
  
  const simpleAccum: number[] = [];
  monthlyValues.forEach((value, index) => {
    if (index === 0) {
      simpleAccum.push(value);
    } else {
      simpleAccum.push(simpleAccum[index - 1] + value);
    }
  });
  
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

const ALL_COLUMNS = [
  { key: 'produtor', label: 'Produtor', category: 'Informações' },
  { key: 'ano', label: 'Ano', category: 'Informações' },
  ...MONTHS.map(m => ({ key: m.key, label: m.label, category: 'Metas Mensais' })),
  ...MONTHS.map((m, i) => ({ key: `acum_${m.key}`, label: `Acum. ${m.label}`, category: 'Metas Acumuladas' })),
  { key: 'total_mensal', label: 'Total Mensal', category: 'Totais' },
  { key: 'total_acumulado', label: 'Total Acumulado', category: 'Totais' },
];

export const ExportMetasPremioModal = ({ isOpen, onClose, metas }: ExportMetasPremioModalProps) => {
  const [filterAno, setFilterAno] = useState<string>('all');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'produtor', 'ano', ...MONTHS.map(m => m.key), 'total_mensal'
  ]);

  const uniqueYears = useMemo(() => {
    const years = new Set<number>();
    metas.forEach(m => years.add(m.ano));
    return Array.from(years).sort((a, b) => b - a);
  }, [metas]);

  const filteredMetas = useMemo(() => {
    if (filterAno === 'all') return metas;
    return metas.filter(m => m.ano.toString() === filterAno);
  }, [metas, filterAno]);

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
      const accumulated = calculateAccumulatedMetas(meta);
      const row: Record<string, unknown> = {};

      selectedColumns.forEach(colKey => {
        const column = ALL_COLUMNS.find(c => c.key === colKey);
        if (!column) return;

        if (colKey === 'produtor') {
          row[column.label] = meta.produtor?.nome || '-';
        } else if (colKey === 'ano') {
          row[column.label] = meta.ano;
        } else if (colKey.startsWith('meta_')) {
          row[column.label] = meta[colKey as keyof MetaPremio];
        } else if (colKey.startsWith('acum_')) {
          const monthIndex = MONTHS.findIndex(m => `acum_${m.key}` === colKey);
          row[column.label] = accumulated[monthIndex];
        } else if (colKey === 'total_mensal') {
          row[column.label] = MONTHS.reduce((sum, m) => sum + (meta[m.key as keyof MetaPremio] as number || 0), 0);
        } else if (colKey === 'total_acumulado') {
          row[column.label] = accumulated[11];
        }
      });

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Metas de Prêmio');

    const ano = filterAno === 'all' ? 'todos' : filterAno;
    const fileName = `metas_premio_${ano}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    
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
            Exportar Metas de Prêmio
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Ano Filter */}
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

export default ExportMetasPremioModal;
