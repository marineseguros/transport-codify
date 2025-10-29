import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, Download, Upload, Edit, Trash2, RefreshCw, FileText, History, CalendarIcon, Eye } from 'lucide-react';
import { CotacaoModal } from '@/components/CotacaoModal';
import { HistoricoGeralModal } from '@/components/HistoricoGeralModal';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useAuth } from '@/contexts/AuthContext';
import { useCotacoes, useAllCotacoesAuditLog, type Cotacao } from '@/hooks/useSupabaseData';
import { parseCsvFile } from '@/utils/csvUtils';
import { toast } from 'sonner';
import { csvRowSchema } from '@/lib/validations';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import { DateRange } from 'react-day-picker';

const Cotacoes = () => {
  const { user } = useAuth();
  const { 
    cotacoes, 
    loading, 
    totalCount,
    currentPage,
    pageSize,
    canGoPrev,
    canGoNext,
    createCotacao,
    deleteCotacao,
    deleteCotacoes,
    refetch,
    getFirstPage,
    getPrevPage,
    getNextPage,
    setPageSize: changePageSize,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    produtorFilter,
    setProdutorFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder
  } = useCotacoes();
  const [selectedCotacao, setSelectedCotacao] = useState<Cotacao | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cotacaoToDelete, setCotacaoToDelete] = useState<string | null>(null);
  const [massDeleteDialogOpen, setMassDeleteDialogOpen] = useState(false);
  const [historicoGeralOpen, setHistoricoGeralOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>('todos');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
  // Hook para buscar todo o histórico de alterações
  const { auditLog, loading: auditLogLoading } = useAllCotacoesAuditLog();

  // Get unique produtores for filter from all loaded cotacoes
  const produtores = useMemo(() => {
    return [...new Set(cotacoes
      .map(c => c.produtor_cotador?.nome)
      .filter(Boolean)
    )] as string[];
  }, [cotacoes]);

  // Filter cotacoes by date
  const dateFilteredCotacoes = useMemo(() => {
    if (dateFilter === 'todos') return cotacoes;

    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (dateFilter) {
      case 'hoje':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '7dias':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30dias':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90dias':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'mes_atual':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'mes_anterior':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'ano_atual':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case 'personalizado':
        if (!dateRange?.from) return cotacoes;
        startDate = dateRange.from;
        endDate = dateRange.to || dateRange.from;
        break;
      default:
        return cotacoes;
    }

    return cotacoes.filter(cotacao => {
      const cotacaoDate = new Date(cotacao.data_cotacao);
      return cotacaoDate >= startDate && cotacaoDate <= endDate;
    });
  }, [cotacoes, dateFilter, dateRange]);

  // Valid status options
  const validStatuses = ['Em cotação', 'Negócio fechado', 'Declinado', 'Alocada Outra'];

  const handleEdit = (cotacao: Cotacao) => {
    setSelectedCotacao(cotacao);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setCotacaoToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!cotacaoToDelete) return;
    
    try {
      await deleteCotacao(cotacaoToDelete);
      toast.success('Cotação excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir cotação:', error);
      toast.error('Erro ao excluir cotação');
    } finally {
      setDeleteDialogOpen(false);
      setCotacaoToDelete(null);
    }
  };

  const handleMassDeleteClick = () => {
    if (selectedIds.size === 0) {
      toast.error('Selecione ao menos uma cotação para excluir');
      return;
    }
    setMassDeleteDialogOpen(true);
  };

  const handleConfirmMassDelete = async () => {
    try {
      await deleteCotacoes(Array.from(selectedIds));
      toast.success(`${selectedIds.size} cotação(ões) excluída(s) com sucesso!`);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Erro ao excluir cotações:', error);
      toast.error('Erro ao excluir cotações');
    } finally {
      setMassDeleteDialogOpen(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === cotacoes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(cotacoes.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleNewCotacao = () => {
    setSelectedCotacao(null);
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleExportCSV = () => {
    toast.success('Funcionalidade de exportar CSV será implementada');
  };

  const handleImportCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        toast.info('Processando arquivo CSV...');
        const csvData = await parseCsvFile(file);
        
        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < csvData.length; i++) {
          const row = csvData[i];
          
          // Validate row data using zod schema
          const validation = csvRowSchema.safeParse(row);
          
          if (!validation.success) {
            errorCount++;
            const errorMessages = validation.error.errors.map(e => e.message).join(', ');
            errors.push(`Linha ${i + 2}: ${errorMessages}`);
            continue;
          }

          try {
            const cotacaoData = {
              segurado: validation.data.Segurado,
              cpf_cnpj: validation.data.CNPJ,
              segmento: validation.data.Tipo || '',
              data_cotacao: validation.data['Data Cotação'] || new Date().toISOString().split('T')[0],
              data_fechamento: validation.data['Data Fechamento'] || null,
              inicio_vigencia: validation.data['Início Vigência'] || '',
              fim_vigencia: validation.data['Fim Vigência'] || '',
              valor_premio: parseFloat(validation.data['Valor Prêmio'] || '0') || 0,
              status: validation.data.Status || 'Em cotação',
              observacoes: validation.data.Observações || '',
              num_apolice: validation.data['Número Apólice'] || '',
              motivo_recusa: validation.data['Motivo Recusa'] || '',
              // Campos opcionais que podem precisar de lookup
              produtor_origem_id: null,
              produtor_negociador_id: null,
              produtor_cotador_id: null,
              seguradora_id: null,
              ramo_id: null,
              captacao_id: null,
              status_seguradora_id: null,
            };

            await createCotacao(cotacaoData);
            successCount++;
          } catch (error) {
            errorCount++;
            errors.push(`Linha ${i + 2}: Erro ao salvar no banco de dados`);
          }
        }

        if (successCount > 0) {
          toast.success(`${successCount} cotação(ões) importada(s) com sucesso!`);
          refetch();
        }
        
        if (errorCount > 0) {
          toast.error(`${errorCount} cotação(ões) falharam na importação.`);
          
          // Show first few errors in console for debugging
          if (errors.length > 0) {
            console.warn('Erros de importação CSV:', errors.slice(0, 5));
          }
        }

      } catch (error) {
        console.error('Erro ao processar CSV:', error);
        toast.error('Erro ao processar o arquivo CSV. Verifique o formato.');
      }
    };
    
    input.click();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Negócio fechado': return 'success-alt';
      case 'Em cotação': return 'brand-orange';
      case 'Declinado': return 'destructive';
      case 'Alocada Outra': return 'secondary';
      default: return 'secondary';
    }
  };

  // Todos os usuários autenticados podem editar
  const canEdit = true;
  
  // Verifica se o usuário pode excluir qualquer cotação
  const canDeleteAny = ['Administrador', 'Gerente', 'CEO', 'Faturamento'].includes(user?.papel || '');
  
  // Função para verificar se o produtor pode excluir uma cotação específica
  const canProducerDeleteCotacao = (cotacao: Cotacao) => {
    if (user?.papel !== 'Produtor') return false;
    
    // Verifica se o produtor é o criador da cotação
    const userEmail = user?.email;
    return (
      cotacao.produtor_origem?.email === userEmail ||
      cotacao.produtor_negociador?.email === userEmail ||
      cotacao.produtor_cotador?.email === userEmail
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cotações</h1>
          <p className="text-muted-foreground">
            Listagem completa e filtros de cotações
          </p>
        </div>
        
        <div className="flex gap-3">
          {canDeleteAny && selectedIds.size > 0 && (
            <Button 
              onClick={handleMassDeleteClick} 
              variant="destructive" 
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Excluir Selecionadas ({selectedIds.size})
            </Button>
          )}
          <Button 
            onClick={() => setHistoricoGeralOpen(true)} 
            variant="outline"
            className="gap-2"
          >
            <History className="h-4 w-4" />
            Histórico Geral
          </Button>
          <Button onClick={handleNewCotacao} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Cotação
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          {/* Linha única com todos os filtros */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por número, segurado, CPF/CNPJ, seguradora, ramo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="lg:col-span-2">
              <Select
                value={`${sortBy}-${sortOrder}`}
                onValueChange={(value) => {
                  const [field, order] = value.split('-');
                  setSortBy(field);
                  setSortOrder(order as 'asc' | 'desc');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Classificar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="segurado-asc">Nome A-Z</SelectItem>
                  <SelectItem value="segurado-desc">Nome Z-A</SelectItem>
                  <SelectItem value="valor_premio-desc">Maior Valor</SelectItem>
                  <SelectItem value="valor_premio-asc">Menor Valor</SelectItem>
                  <SelectItem value="data_cotacao-desc">Data Mais Recente</SelectItem>
                  <SelectItem value="data_cotacao-asc">Data Mais Antiga</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="lg:col-span-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  {validStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-2">
              <Select value={produtorFilter} onValueChange={setProdutorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Produtor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os produtores</SelectItem>
                  {produtores.map((produtor) => (
                    <SelectItem key={produtor} value={produtor}>
                      {produtor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('todos');
                  setProdutorFilter('todos');
                  setSortBy('data_cotacao');
                  setSortOrder('desc');
                  setDateFilter('todos');
                  setDateRange(undefined);
                }}
                className="w-full"
              >
                Limpar filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            {dateFilteredCotacoes.length} {dateFilteredCotacoes.length === 1 ? 'cotação encontrada' : 'cotações encontradas'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {canDeleteAny && (
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedIds.size === dateFilteredCotacoes.length && dateFilteredCotacoes.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead>Número</TableHead>
                <TableHead>Segurado</TableHead>
                <TableHead>Produtor Cotador</TableHead>
                <TableHead>Seguradora</TableHead>
                <TableHead>Ramo</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dateFilteredCotacoes.map((cotacao) => {
                const canDeleteThisCotacao = canDeleteAny || canProducerDeleteCotacao(cotacao);
                
                return (
                  <TableRow key={cotacao.id}>
                    {canDeleteAny && (
                      <TableCell>
                        <Checkbox 
                          checked={selectedIds.has(cotacao.id)}
                          onCheckedChange={() => toggleSelect(cotacao.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-mono">
                      {cotacao.numero_cotacao}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{cotacao.segurado}</div>
                        <div className="text-sm text-muted-foreground">
                          {cotacao.cpf_cnpj}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {cotacao.produtor_cotador?.nome || 'Não informado'}
                    </TableCell>
                    <TableCell>
                      {cotacao.seguradora?.nome || '-'}
                    </TableCell>
                    <TableCell>
                      {cotacao.ramo?.descricao || '-'}
                    </TableCell>
                    <TableCell>
                      {cotacao.segmento ? (
                        <Badge variant="outline">{cotacao.segmento}</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(cotacao.valor_premio)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(cotacao.status)}>
                        {cotacao.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(cotacao.data_cotacao)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCotacao(cotacao);
                            setIsViewMode(true);
                            setIsModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(cotacao)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {canDeleteThisCotacao && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteClick(cotacao.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {loading && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Carregando cotações...</p>
            </div>
          )}

          {!loading && dateFilteredCotacoes.length === 0 && (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-sm font-semibold">Nenhuma cotação encontrada</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {searchTerm || statusFilter || produtorFilter || dateFilter !== 'todos'
                  ? 'Tente ajustar os filtros para encontrar cotações.'
                  : 'Comece criando sua primeira cotação.'}
              </p>
            </div>
          )}
          
          {/* Pagination Controls */}
          {dateFilteredCotacoes.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <PaginationControls
                currentPage={currentPage}
                totalCount={totalCount}
                pageSize={pageSize}
                canGoPrev={canGoPrev}
                canGoNext={canGoNext}
                onFirstPage={getFirstPage}
                onPrevPage={getPrevPage}
                onNextPage={getNextPage}
                onPageSizeChange={changePageSize}
                loading={loading}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <CotacaoModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCotacao(null);
          setIsViewMode(false);
        }}
        cotacao={selectedCotacao || undefined}
        mode={isViewMode ? 'view' : (selectedCotacao ? 'edit' : 'create')}
        onSaved={() => refetch()}
      />

      {/* Histórico Geral Modal */}
      <HistoricoGeralModal
        open={historicoGeralOpen}
        onOpenChange={setHistoricoGeralOpen}
        auditLog={auditLog}
        loading={auditLogLoading}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta cotação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mass Delete Confirmation Dialog */}
      <AlertDialog open={massDeleteDialogOpen} onOpenChange={setMassDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão em massa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedIds.size} cotação(ões) selecionada(s)? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmMassDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir Todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Cotacoes;