import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Download, Upload, Edit, Trash2, RefreshCw, FileText } from 'lucide-react';
import { CotacaoModal } from '@/components/CotacaoModal';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useAuth } from '@/contexts/AuthContext';
import { useCotacoes, type Cotacao } from '@/hooks/useSupabaseData';
import { parseCsvFile } from '@/utils/csvUtils';
import { toast } from 'sonner';

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Get unique produtores for filter from all loaded cotacoes
  const produtores = useMemo(() => {
    return [...new Set(cotacoes
      .map(c => c.produtor_cotador?.nome)
      .filter(Boolean)
    )] as string[];
  }, [cotacoes]);

  // Valid status options
  const validStatuses = ['Em cotação', 'Negócio fechado', 'Declinado', 'Alocada Outra'];

  const handleEdit = (cotacao: Cotacao) => {
    setSelectedCotacao(cotacao);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCotacao(id);
      toast.success('Cotação excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir cotação:', error);
      toast.error('Erro ao excluir cotação');
    }
  };

  const handleMassDelete = async () => {
    if (selectedIds.size === 0) {
      toast.error('Selecione ao menos uma cotação para excluir');
      return;
    }
    
    try {
      await deleteCotacoes(Array.from(selectedIds));
      toast.success(`${selectedIds.size} cotação(ões) excluída(s) com sucesso!`);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Erro ao excluir cotações:', error);
      toast.error('Erro ao excluir cotações');
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

        for (const row of csvData) {
          try {
            const cotacaoData = {
              segurado: row['Segurado'] || '',
              cpf_cnpj: row['CNPJ'] || '',
              segmento: row['Tipo'] || '',
              data_cotacao: row['Data Cotação'] || new Date().toISOString().split('T')[0],
              data_fechamento: row['Data Fechamento'] || null,
              inicio_vigencia: row['Início Vigência'] || '',
              fim_vigencia: row['Fim Vigência'] || '',
              valor_premio: parseFloat(row['Valor Prêmio']) || 0,
              status: row['Status'] || 'Em cotação',
              observacoes: row['Observações'] || '',
              num_apolice: row['Número Apólice'] || '',
              motivo_recusa: row['Motivo Recusa'] || '',
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
            console.error('Erro ao criar cotação:', error);
            errorCount++;
          }
        }

        if (successCount > 0) {
          toast.success(`${successCount} cotação(ões) importada(s) com sucesso!`);
          refetch();
        }
        
        if (errorCount > 0) {
          toast.error(`${errorCount} cotação(ões) falharam na importação.`);
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

  const canEdit = user?.papel !== 'Somente-Leitura';
  const canDelete = user?.papel === 'Administrador';

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
          {canDelete && selectedIds.size > 0 && (
            <Button 
              onClick={handleMassDelete} 
              variant="destructive" 
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Excluir Selecionadas ({selectedIds.size})
            </Button>
          )}
          {canEdit && (
            <Button onClick={handleNewCotacao} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Cotação
            </Button>
          )}
        </div>
      </div>



      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            {totalCount} {totalCount === 1 ? 'cotação encontrada' : 'cotações encontradas'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {canDelete && (
                  <TableHead className="w-12">
                    <div className="space-y-2">
                      <Checkbox 
                        checked={selectedIds.size === cotacoes.length && cotacoes.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                      <div className="h-8"></div>
                    </div>
                  </TableHead>
                )}
                <TableHead>
                  <div className="space-y-2">
                    <div>Número</div>
                    <Input
                      placeholder="Filtrar número..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-8"
                    />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="space-y-2">
                    <div>Segurado</div>
                    <Input 
                      placeholder="Filtrar segurado..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-8"
                    />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="space-y-2">
                    <div>Produtor Origem</div>
                    <Select value={produtorFilter} onValueChange={setProdutorFilter}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {produtores.map((produtor) => (
                          <SelectItem key={produtor} value={produtor!}>
                            {produtor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="space-y-2">
                    <div>Produtor Negociador</div>
                    <Select value={produtorFilter} onValueChange={setProdutorFilter}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {produtores.map((produtor) => (
                          <SelectItem key={produtor} value={produtor!}>
                            {produtor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="space-y-2">
                    <div>Produtor Cotador</div>
                    <Select value={produtorFilter} onValueChange={setProdutorFilter}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {produtores.map((produtor) => (
                          <SelectItem key={produtor} value={produtor!}>
                            {produtor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="space-y-2">
                    <div>Seguradora</div>
                    <Input 
                      placeholder="Filtrar seguradora..."
                      className="h-8"
                    />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="space-y-2">
                    <div>Ramo</div>
                    <Input 
                      placeholder="Filtrar ramo..."
                      className="h-8"
                    />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="space-y-2">
                    <div>Segmento</div>
                    <Input 
                      placeholder="Filtrar segmento..."
                      className="h-8"
                    />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="space-y-2">
                    <div>Valor</div>
                    <Input 
                      placeholder="Filtrar valor..."
                      className="h-8"
                    />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="space-y-2">
                    <div>Status</div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        {validStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="space-y-2">
                    <div>Data</div>
                    <Input 
                      placeholder="Filtrar data..."
                      className="h-8"
                    />
                  </div>
                </TableHead>
                {canEdit && (
                  <TableHead className="text-right">
                    <div className="space-y-2">
                      <div>Ações</div>
                      <div className="h-8"></div>
                    </div>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {cotacoes.map((cotacao) => (
                <TableRow key={cotacao.id}>
                  {canDelete && (
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
                    {cotacao.produtor_origem?.nome || 'Não informado'}
                  </TableCell>
                  <TableCell>
                    {cotacao.produtor_negociador?.nome || 'Não informado'}
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
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(cotacao)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(cotacao.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {loading && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Carregando cotações...</p>
            </div>
          )}

          {!loading && cotacoes.length === 0 && (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-sm font-semibold">Nenhuma cotação encontrada</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {searchTerm || statusFilter || produtorFilter
                  ? 'Tente ajustar os filtros para encontrar cotações.'
                  : 'Comece criando sua primeira cotação.'}
              </p>
            </div>
          )}
          
          {/* Pagination Controls */}
          {totalCount > 0 && (
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
        }}
        cotacao={selectedCotacao || undefined}
        mode={selectedCotacao ? 'edit' : 'create'}
        onSaved={() => refetch()}
      />
    </div>
  );
};

export default Cotacoes;