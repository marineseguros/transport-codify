import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, Search, Filter, Download, Eye, Edit, 
  Copy, FileText, MessageSquare, History 
} from "lucide-react";
import { getCotacoesWithRelations, MOCK_SEGURADORAS, MOCK_RAMOS, MOCK_PRODUTORES } from "@/data/mockData";
import { CotacaoTRN, CotacaoStatus } from "@/types";
import { CotacaoModal } from "@/components/CotacaoModal";

const Cotacoes = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [seguradoraFilter, setSeguradoraFilter] = useState<string>("todas");
  const [ramoFilter, setRamoFilter] = useState<string>("todos");
  const [produtorFilter, setProdutorFilter] = useState<string>("todos");
  const [selectedCotacao, setSelectedCotacao] = useState<CotacaoTRN | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  const cotacoes = getCotacoesWithRelations();

  // Filtros aplicados
  const filteredCotacoes = useMemo(() => {
    return cotacoes.filter((cotacao) => {
      const matchesSearch = 
        cotacao.cliente?.segurado.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cotacao.seguradora?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cotacao.produtor_origem?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cotacao.num_apolice?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "todos" || cotacao.status === statusFilter;
      const matchesSeguradora = seguradoraFilter === "todas" || cotacao.seguradora_id === seguradoraFilter;
      const matchesRamo = ramoFilter === "todos" || cotacao.ramo_id === ramoFilter;
      const matchesProdutor = produtorFilter === "todos" || cotacao.produtor_origem_id === produtorFilter;

      return matchesSearch && matchesStatus && matchesSeguradora && matchesRamo && matchesProdutor;
    });
  }, [cotacoes, searchTerm, statusFilter, seguradoraFilter, ramoFilter, produtorFilter]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);

  const formatDate = (dateStr: string) => 
    new Date(dateStr).toLocaleDateString('pt-BR');

  const getStatusBadgeVariant = (status: CotacaoStatus) => {
    switch (status) {
      case 'Negócio fechado': return 'default';
      case 'Em cotação': return 'secondary';
      case 'Declinado': return 'destructive';
      default: return 'secondary';
    }
  };

  const handleNewCotacao = () => {
    setSelectedCotacao(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEditCotacao = (cotacao: CotacaoTRN) => {
    setSelectedCotacao(cotacao);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleViewCotacao = (cotacao: CotacaoTRN) => {
    setSelectedCotacao(cotacao);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDuplicateCotacao = (cotacao: CotacaoTRN) => {
    // Duplicar cotação - limpar alguns campos e ajustar datas
    const hoje = new Date();
    const inicioVigencia = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
    const fimVigencia = new Date(inicioVigencia.getTime() + 365 * 24 * 60 * 60 * 1000);

    const cotacaoDuplicada: CotacaoTRN = {
      ...cotacao,
      id: '', // Será gerado no salvamento
      status: 'Em cotação',
      data_cotacao: hoje.toISOString().split('T')[0],
      inicio_vigencia: inicioVigencia.toISOString().split('T')[0],
      fim_vigencia: fimVigencia.toISOString().split('T')[0],
      data_fechamento: undefined,
      num_apolice: undefined,
      observacoes: `Duplicada de: ${cotacao.num_apolice || cotacao.id}\n${cotacao.observacoes || ''}`,
    };

    setSelectedCotacao(cotacaoDuplicada);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("todos");
    setSeguradoraFilter("todas");
    setRamoFilter("todos");
    setProdutorFilter("todos");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cotações</h1>
          <p className="text-muted-foreground">
            Gerencie suas cotações de seguro de transportes
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button onClick={handleNewCotacao} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Cotação
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, seguradora, produtor ou apólice..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="w-40">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Em cotação">Em cotação</SelectItem>
                  <SelectItem value="Negócio fechado">Negócio fechado</SelectItem>
                  <SelectItem value="Declinado">Declinado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-48">
              <label className="text-sm font-medium mb-2 block">Seguradora</label>
              <Select value={seguradoraFilter} onValueChange={setSeguradoraFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Seguradora" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {MOCK_SEGURADORAS.map(seguradora => (
                    <SelectItem key={seguradora.id} value={seguradora.id}>
                      {seguradora.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-32">
              <label className="text-sm font-medium mb-2 block">Ramo</label>
              <Select value={ramoFilter} onValueChange={setRamoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Ramo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {MOCK_RAMOS.map(ramo => (
                    <SelectItem key={ramo.id} value={ramo.id}>
                      {ramo.codigo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={clearFilters}>
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
                <TableHead>Cliente</TableHead>
                <TableHead>Produtor</TableHead>
                <TableHead>Seguradora</TableHead>
                <TableHead>Ramo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Prêmio</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCotacoes.map((cotacao) => (
                <TableRow key={cotacao.id}>
                  <TableCell className="font-medium">
                    <div>
                      <p>{cotacao.cliente?.segurado}</p>
                      <p className="text-xs text-muted-foreground">
                        {cotacao.cliente?.cidade}, {cotacao.cliente?.uf}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{cotacao.produtor_origem?.nome}</TableCell>
                  <TableCell>{cotacao.seguradora?.nome}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{cotacao.ramo?.codigo}</Badge>
                  </TableCell>
                  <TableCell>{cotacao.tipo}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(cotacao.status)}>
                      {cotacao.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(cotacao.valor_premio)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{formatDate(cotacao.inicio_vigencia)}</div>
                      <div className="text-xs text-muted-foreground">
                        até {formatDate(cotacao.fim_vigencia)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleViewCotacao(cotacao)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleEditCotacao(cotacao)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleDuplicateCotacao(cotacao)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal */}
      <CotacaoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cotacao={selectedCotacao}
        mode={modalMode}
        onSave={() => {
          setIsModalOpen(false);
          // Aqui seria a lógica de refresh da lista
        }}
      />
    </div>
  );
};

export default Cotacoes;