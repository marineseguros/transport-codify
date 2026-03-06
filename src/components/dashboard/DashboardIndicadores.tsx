import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChartBig, ExternalLink, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/lib/logger';
import { PaginationControls } from '@/components/ui/pagination-controls';

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

interface DashboardIndicadoresProps {
  produtorFilter?: string[];
}

const PAGE_SIZE = 5;

export const DashboardIndicadores = ({ produtorFilter }: DashboardIndicadoresProps) => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [searchSegurado, setSearchSegurado] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProdutos = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('produtos')
          .select('*')
          .order('data_registro', { ascending: false })
          .limit(200);
        if (error) throw error;
        setProdutos(data || []);
      } catch (error: any) {
        logger.error('Error fetching produtos for dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProdutos();
  }, []);

  const filteredProdutos = useMemo(() => {
    let filtered = produtos;

    // Filter by produtor (consultor field)
    if (produtorFilter && produtorFilter.length > 0) {
      filtered = filtered.filter(p => produtorFilter.includes(p.consultor));
    }

    if (filterTipo !== 'todos') {
      filtered = filtered.filter(p => p.tipo === filterTipo);
    }

    if (searchSegurado) {
      filtered = filtered.filter(p =>
        p.segurado.toLowerCase().includes(searchSegurado.toLowerCase())
      );
    }

    return filtered;
  }, [produtos, produtorFilter, filterTipo, searchSegurado]);

  // Summary stats
  const stats = useMemo(() => {
    const currentMonth = new Date();
    const startCurrent = startOfMonth(currentMonth);
    const endCurrent = endOfMonth(currentMonth);
    const startPrev = startOfMonth(subMonths(currentMonth, 1));
    const endPrev = endOfMonth(subMonths(currentMonth, 1));

    const thisMonth = produtos.filter(p => {
      const d = new Date(p.data_registro);
      return d >= startCurrent && d <= endCurrent;
    });
    const lastMonth = produtos.filter(p => {
      const d = new Date(p.data_registro);
      return d >= startPrev && d <= endPrev;
    });

    const byTipo: Record<string, number> = {};
    thisMonth.forEach(p => {
      byTipo[p.tipo] = (byTipo[p.tipo] || 0) + 1;
    });

    return {
      thisMonth: thisMonth.length,
      lastMonth: lastMonth.length,
      byTipo,
      total: produtos.length,
    };
  }, [produtos]);

  // Pagination
  const totalPages = Math.ceil(filteredProdutos.length / PAGE_SIZE);
  const paginatedProdutos = filteredProdutos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [filterTipo, searchSegurado, produtorFilter]);

  const getSubtipoDisplay = (produto: Produto) => {
    if (produto.tipo === 'Indicação' && produto.tipo_indicacao) return produto.tipo_indicacao;
    if (produto.tipo === 'Visita/Video' && produto.subtipo) return produto.subtipo;
    return '-';
  };

  const getDetalhesDisplay = (produto: Produto) => {
    if (produto.tipo === 'Indicação' && produto.cliente_indicado) return produto.cliente_indicado;
    if (produto.tipo === 'Visita/Video' && produto.subtipo === 'Visita' && produto.cidade) return produto.cidade;
    if (produto.tipo === 'Visita/Video' && produto.subtipo === 'Vídeo' && produto.data_realizada) {
      return format(new Date(produto.data_realizada), 'dd/MM/yyyy', { locale: ptBR });
    }
    return '-';
  };

  const diff = stats.thisMonth - stats.lastMonth;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChartBig className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Indicadores</CardTitle>
            <Badge variant="outline" className="text-[10px] font-normal">
              {stats.thisMonth} este mês
              {diff !== 0 && (
                <span className={diff > 0 ? 'text-emerald-500 ml-1' : 'text-destructive ml-1'}>
                  {diff > 0 ? '+' : ''}{diff}
                </span>
              )}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {/* Compact filters */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Segurado..."
                value={searchSegurado}
                onChange={e => setSearchSegurado(e.target.value)}
                className="h-7 text-xs pl-7 w-[160px]"
              />
            </div>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="h-7 text-xs w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Coleta">Coleta</SelectItem>
                <SelectItem value="Indicação">Indicação</SelectItem>
                <SelectItem value="Novos CRM">Novos CRM</SelectItem>
                <SelectItem value="Visita/Video">Visita/Video</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => navigate('/produtos')}
            >
              Ver todos
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {Object.entries(stats.byTipo).map(([tipo, count]) => (
            <Badge key={tipo} variant="secondary" className="text-[10px] font-normal">
              {tipo}: {count}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Segurado</TableHead>
                <TableHead className="text-xs">Consultor</TableHead>
                <TableHead className="text-xs">Data</TableHead>
                <TableHead className="text-xs">Tipo</TableHead>
                <TableHead className="text-xs">Subtipo</TableHead>
                <TableHead className="text-xs">Detalhes</TableHead>
                <TableHead className="text-xs max-w-[150px]">Obs.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedProdutos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProdutos.map(produto => (
                  <TableRow key={produto.id} className="h-9">
                    <TableCell className="text-xs font-medium py-1.5">{produto.segurado}</TableCell>
                    <TableCell className="text-xs py-1.5">{produto.consultor}</TableCell>
                    <TableCell className="text-xs py-1.5">
                      {format(new Date(produto.data_registro), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge variant="outline" className="text-[10px] font-normal">{produto.tipo}</Badge>
                    </TableCell>
                    <TableCell className="text-xs py-1.5">{getSubtipoDisplay(produto)}</TableCell>
                    <TableCell className="text-xs py-1.5">{getDetalhesDisplay(produto)}</TableCell>
                    <TableCell className="text-xs py-1.5 max-w-[150px] truncate">
                      {produto.observacao || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-2 border-t">
            <span className="text-[10px] text-muted-foreground">
              {filteredProdutos.length} registro(s)
            </span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Anterior
              </Button>
              <span className="text-[10px] text-muted-foreground flex items-center px-2">
                {page}/{totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
