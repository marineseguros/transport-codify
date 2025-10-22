import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search, History } from 'lucide-react';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HistoricoGeralModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auditLog: any[];
  loading: boolean;
}

export function HistoricoGeralModal({ open, onOpenChange, auditLog, loading }: HistoricoGeralModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar registros de auditoria com base no termo de pesquisa
  const filteredAuditLog = useMemo(() => {
    if (!searchTerm) return auditLog;

    const term = searchTerm.toLowerCase();
    return auditLog.filter(log => 
      log.numero_cotacao?.toLowerCase().includes(term) ||
      log.field_name?.toLowerCase().includes(term) ||
      log.old_value?.toLowerCase().includes(term) ||
      log.new_value?.toLowerCase().includes(term) ||
      log.changed_by_profile?.nome?.toLowerCase().includes(term)
    );
  }, [auditLog, searchTerm]);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico Completo de Alterações
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por número de cotação, campo alterado, usuário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            {filteredAuditLog.length} {filteredAuditLog.length === 1 ? 'alteração encontrada' : 'alterações encontradas'}
          </div>

          {/* Table */}
          <ScrollArea className="h-[calc(85vh-240px)] rounded-md border">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Carregando histórico...</p>
              </div>
            ) : filteredAuditLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <History className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? 'Nenhuma alteração encontrada com os filtros aplicados.' : 'Nenhuma alteração registrada ainda.'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Nº Cotação</TableHead>
                    <TableHead className="w-[120px]">Campo</TableHead>
                    <TableHead>Valor Anterior</TableHead>
                    <TableHead>Valor Novo</TableHead>
                    <TableHead className="w-[180px]">Data/Hora</TableHead>
                    <TableHead className="w-[150px]">Alterado Por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAuditLog.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {log.numero_cotacao}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {log.field_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="max-w-[200px] truncate" title={log.old_value || '-'}>
                          {log.old_value || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="max-w-[200px] truncate" title={log.new_value || '-'}>
                          {log.new_value || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(log.changed_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.changed_by_profile?.nome || 'Sistema'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
