import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Download, Upload, Edit, Trash2, FileText, TrendingUp, Users, DollarSign, RefreshCw } from 'lucide-react';
import { CotacaoModal } from '@/components/CotacaoModal';
import { useAuth } from '@/contexts/AuthContext';
import { useCotacoes, type Cotacao } from '@/hooks/useSupabaseData';
import { parseCsvFile } from '@/utils/csvUtils';
import { toast } from 'sonner';

const Cotacoes = () => {
  const { user } = useAuth();
  const { cotacoes, loading, createCotacao, refetch } = useCotacoes();
  const [selectedCotacao, setSelectedCotacao] = useState<Cotacao | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [produtorFilter, setProdutorFilter] = useState('');

  // Filter cotacoes based on search and filters
  const filteredCotacoes = useMemo(() => {
    return cotacoes.filter(cotacao => {
      const matchesSearch = 
        cotacao.segurado.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cotacao.numero_cotacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cotacao.produtor_origem?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cotacao.seguradora?.nome?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'todos' || !statusFilter || cotacao.status === statusFilter;
      const matchesProdutor = produtorFilter === 'todos' || !produtorFilter || cotacao.produtor_origem?.nome === produtorFilter;
      
      return matchesSearch && matchesStatus && matchesProdutor;
    });
  }, [cotacoes, searchTerm, statusFilter, produtorFilter]);

  // Get unique produtores for filter
  const produtores = [...new Set(cotacoes.map(c => c.produtor_origem?.nome).filter(Boolean))];

  // Calculate stats
  const stats = useMemo(() => {
    const total = filteredCotacoes.length;
    const emAnalise = filteredCotacoes.filter(c => c.status === 'Em análise').length;
    const fechados = filteredCotacoes.filter(c => c.status === 'Negócio fechado').length;
    const valorTotal = filteredCotacoes
      .filter(c => c.status === 'Negócio fechado')
      .reduce((sum, c) => sum + c.valor_premio, 0);
    
    return { total, emAnalise, fechados, valorTotal };
  }, [filteredCotacoes]);

  const handleEdit = (cotacao: Cotacao) => {
    setSelectedCotacao(cotacao);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    // TODO: Implement delete functionality
    toast.success('Cotação excluída com sucesso!');
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Negócio fechado':
        return 'bg-green-100 text-green-800';
      case 'Em análise':
        return 'bg-blue-100 text-blue-800';
      case 'Aguardando cliente':
        return 'bg-yellow-100 text-yellow-800';
      case 'Cancelada':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
            Gerencie suas cotações de seguro
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" onClick={refetch} className="gap-2" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={handleImportCSV} className="gap-2">
            <Upload className="h-4 w-4" />
            Importar CSV
          </Button>
          {canEdit && (
            <Button onClick={handleNewCotacao} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Cotação
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Cotações</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Análise</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emAnalise}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Negócios Fechados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.fechados}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.valorTotal)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-64">
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por segurado, número, produtor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="w-48">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="Em análise">Em análise</SelectItem>
                  <SelectItem value="Aguardando cliente">Aguardando cliente</SelectItem>
                  <SelectItem value="Negócio fechado">Negócio fechado</SelectItem>
                  <SelectItem value="Cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-48">
              <label className="text-sm font-medium mb-2 block">Produtor</label>
              <Select value={produtorFilter} onValueChange={setProdutorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os produtores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os produtores</SelectItem>
                  {produtores.map((produtor) => (
                    <SelectItem key={produtor} value={produtor!}>
                      {produtor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setProdutorFilter('');
              }}
            >
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filteredCotacoes.length} cotação{filteredCotacoes.length !== 1 ? 'ões' : ''} encontrada{filteredCotacoes.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Segurado</TableHead>
                <TableHead>Produtor Origem</TableHead>
                <TableHead>Seguradora</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                {canEdit && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCotacoes.map((cotacao) => (
                <TableRow key={cotacao.id}>
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
                    {cotacao.produtor_origem?.nome || '-'}
                  </TableCell>
                  <TableCell>
                    {cotacao.seguradora ? (
                      <div>
                        <div className="font-medium">{cotacao.seguradora.nome}</div>
                        <div className="text-sm text-muted-foreground">
                          {cotacao.seguradora.codigo}
                        </div>
                      </div>
                    ) : '-'}
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
                    <Badge className={getStatusColor(cotacao.status)}>
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

          {!loading && filteredCotacoes.length === 0 && (
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
      />
    </div>
  );
};

export default Cotacoes;