import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Search, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as XLSX from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ProdutoModal from "@/components/ProdutoModal";

interface Produto {
  id: string;
  segurado: string;
  consultor: string;
  data_registro: string;
  tipo: string;
  observacao: string | null;
  tipo_indicacao?: string | null;
  cliente_indicado?: string | null;
  subtipo?: string | null;
  cidade?: string | null;
  data_realizada?: string | null;
}

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [produtoToDelete, setProdutoToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  // Filtros
  const [searchSegurado, setSearchSegurado] = useState("");
  const [searchConsultor, setSearchConsultor] = useState("");
  const [searchCidade, setSearchCidade] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("todos");

  useEffect(() => {
    fetchProdutos();
  }, []);

  const fetchProdutos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .order("data_registro", { ascending: false });

      if (error) throw error;
      setProdutos(data || []);
    } catch (error: any) {
      console.error("Error fetching produtos:", error);
      toast({
        title: "Erro ao carregar produtos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (produto: Produto) => {
    setSelectedProduto(produto);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!produtoToDelete) return;

    try {
      const { error } = await supabase
        .from("produtos")
        .delete()
        .eq("id", produtoToDelete);

      if (error) throw error;

      toast({
        title: "Produto excluído com sucesso",
      });

      fetchProdutos();
    } catch (error: any) {
      console.error("Error deleting produto:", error);
      toast({
        title: "Erro ao excluir produto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setProdutoToDelete(null);
    }
  };

  const openDeleteDialog = (id: string) => {
    setProdutoToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleModalClose = (shouldRefresh: boolean) => {
    setIsModalOpen(false);
    setSelectedProduto(null);
    if (shouldRefresh) {
      fetchProdutos();
    }
  };

  // Filtrar produtos
  const filteredProdutos = produtos.filter((produto) => {
    const matchSegurado = produto.segurado.toLowerCase().includes(searchSegurado.toLowerCase());
    const matchConsultor = produto.consultor.toLowerCase().includes(searchConsultor.toLowerCase());
    const matchCidade = !searchCidade || (produto.cidade && produto.cidade.toLowerCase().includes(searchCidade.toLowerCase()));
    const matchTipo = filterTipo === "todos" || produto.tipo === filterTipo;
    
    return matchSegurado && matchConsultor && matchCidade && matchTipo;
  });

  // Limpar filtros
  const handleClearFilters = () => {
    setSearchSegurado("");
    setSearchConsultor("");
    setSearchCidade("");
    setFilterTipo("todos");
  };

  // Exportar para Excel
  const handleExportToExcel = () => {
    try {
      // Preparar dados para exportação
      const dataToExport = filteredProdutos.map((produto, index) => ({
        "#": index + 1,
        "Segurado": produto.segurado,
        "Consultor": produto.consultor,
        "Data do Registro": format(new Date(produto.data_registro), "dd/MM/yyyy", { locale: ptBR }),
        "Tipo": produto.tipo,
        "Subtipo/Indicação": produto.tipo === "Indicação" && produto.tipo_indicacao
          ? produto.tipo_indicacao
          : produto.tipo === "Visita/Video" && produto.subtipo
          ? produto.subtipo
          : "-",
        "Detalhes": produto.tipo === "Indicação" && produto.cliente_indicado
          ? produto.cliente_indicado
          : produto.tipo === "Visita/Video" && produto.subtipo === "Visita" && produto.cidade
          ? produto.cidade
          : produto.tipo === "Visita/Video" && produto.subtipo === "Vídeo" && produto.data_realizada
          ? format(new Date(produto.data_realizada), "dd/MM/yyyy", { locale: ptBR })
          : "-",
        "Observação": produto.observacao || "-",
      }));

      // Criar workbook e worksheet
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Produtos");

      // Ajustar largura das colunas
      const colWidths = [
        { wch: 5 },  // #
        { wch: 30 }, // Segurado
        { wch: 20 }, // Consultor
        { wch: 15 }, // Data
        { wch: 15 }, // Tipo
        { wch: 20 }, // Subtipo/Indicação
        { wch: 25 }, // Detalhes
        { wch: 30 }, // Observação
      ];
      ws['!cols'] = colWidths;

      // Gerar arquivo
      const fileName = `produtos_${format(new Date(), "dd-MM-yyyy_HH-mm")}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Exportação concluída",
        description: `${filteredProdutos.length} registro(s) exportado(s)`,
      });
    } catch (error: any) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: "Erro ao exportar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Produtos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os registros de produtos
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleExportToExcel}
            disabled={filteredProdutos.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Registro
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 rounded-md border bg-card">
        <div className="space-y-2">
          <label className="text-sm font-medium">Segurado</label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por segurado..."
              value={searchSegurado}
              onChange={(e) => setSearchSegurado(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Consultor</label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por consultor..."
              value={searchConsultor}
              onChange={(e) => setSearchConsultor(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Cidade</label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cidade..."
              value={searchCidade}
              onChange={(e) => setSearchCidade(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo</label>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="Coleta">Coleta</SelectItem>
              <SelectItem value="Indicação">Indicação</SelectItem>
              <SelectItem value="Novos CRM">Novos CRM</SelectItem>
              <SelectItem value="Visita/Video">Visita/Video</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Ações</label>
          <div className="flex flex-col gap-2">
            <div className="flex items-center h-10 px-3 rounded-md border bg-muted">
              <span className="text-sm font-medium">
                {filteredProdutos.length} de {produtos.length}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="w-full"
            >
              <X className="mr-2 h-4 w-4" />
              Limpar Filtros
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Segurado</TableHead>
              <TableHead>Consultor</TableHead>
              <TableHead>Data do Registro</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Subtipo/Indicação</TableHead>
              <TableHead>Detalhes</TableHead>
              <TableHead>Observação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredProdutos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {produtos.length === 0 ? "Nenhum produto cadastrado" : "Nenhum produto encontrado com os filtros aplicados"}
                </TableCell>
              </TableRow>
            ) : (
              filteredProdutos.map((produto, index) => (
                <TableRow key={produto.id}>
                  <TableCell className="text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">{produto.segurado}</TableCell>
                  <TableCell>{produto.consultor}</TableCell>
                  <TableCell>
                    {format(new Date(produto.data_registro), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>{produto.tipo}</TableCell>
                  <TableCell>
                    {produto.tipo === "Indicação" && produto.tipo_indicacao
                      ? produto.tipo_indicacao
                      : produto.tipo === "Visita/Video" && produto.subtipo
                      ? produto.subtipo
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {produto.tipo === "Indicação" && produto.cliente_indicado
                      ? produto.cliente_indicado
                      : produto.tipo === "Visita/Video" && produto.subtipo === "Visita" && produto.cidade
                      ? produto.cidade
                      : produto.tipo === "Visita/Video" && produto.subtipo === "Vídeo" && produto.data_realizada
                      ? format(new Date(produto.data_realizada), "dd/MM/yyyy", { locale: ptBR })
                      : "-"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {produto.observacao || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(produto)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(produto.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProdutoModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        produto={selectedProduto}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}