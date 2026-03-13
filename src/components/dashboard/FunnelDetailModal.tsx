import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Filter, Users, TrendingUp, Percent } from 'lucide-react';
import { type Cotacao } from '@/hooks/useSupabaseData';
import { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';

const getBranchGroup = (ramo: { descricao?: string; ramo_agrupado?: string | null } | undefined | null): string => {
  if (!ramo) return 'Outros';
  if (ramo.ramo_agrupado) return ramo.ramo_agrupado;
  const ramoUpper = (ramo.descricao || '').toUpperCase();
  if (ramoUpper.includes('RCTR-C') || ramoUpper.includes('RC-DC')) return 'RCTR-C + RC-DC';
  return ramo.descricao || 'Outros';
};

const countDistinct = (cotacoes: Cotacao[], statuses: string[]): number => {
  const keys = new Set<string>();
  cotacoes.forEach((c) => {
    if (statuses.includes(c.status)) {
      const bg = getBranchGroup(c.ramo);
      keys.add(`${c.cpf_cnpj}_${bg}`);
    }
  });
  return keys.size;
};

interface FunnelDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cotacoes: Cotacao[];
}

interface ProducerRow {
  nome: string;
  emCotacao: number;
  fechados: number;
  declinados: number;
  total: number;
  taxaConversao: number;
  premio: number;
}

const ROLE_CONFIGS = [
  { key: 'produtor_origem' as const, label: 'Produtor Origem', description: 'Responsável comercial pela captação' },
  { key: 'produtor_negociador' as const, label: 'Produtor Negociador', description: 'Responsável pela negociação' },
  { key: 'produtor_cotador' as const, label: 'Produtor Cotador', description: 'Responsável operacional pela cotação' },
];

export function FunnelDetailModal({ open, onOpenChange, cotacoes }: FunnelDetailModalProps) {
  const producerDataByRole = useMemo(() => {
    const result: Record<string, ProducerRow[]> = {};

    ROLE_CONFIGS.forEach(({ key, label }) => {
      const byProducer = new Map<string, Cotacao[]>();
      cotacoes.forEach((c) => {
        const prod = c[key];
        if (prod?.nome) {
          if (!byProducer.has(prod.nome)) byProducer.set(prod.nome, []);
          byProducer.get(prod.nome)!.push(c);
        }
      });

      const rows: ProducerRow[] = [];
      byProducer.forEach((cots, nome) => {
        const emCotacao = countDistinct(cots, ['Em cotação']);
        const fechados = countDistinct(cots, ['Negócio fechado', 'Fechamento congênere']);
        const declinados = countDistinct(cots, ['Declinado']);
        const total = emCotacao + fechados + declinados;
        const premio = cots
          .filter((c) => c.status === 'Negócio fechado' || c.status === 'Fechamento congênere')
          .reduce((s, c) => s + (c.valor_premio || 0), 0);
        rows.push({ nome, emCotacao, fechados, declinados, total, taxaConversao: total > 0 ? (fechados / total) * 100 : 0, premio });
      });

      rows.sort((a, b) => b.total - a.total);
      result[label] = rows;
    });

    return result;
  }, [cotacoes]);

  const conversionChartData = useMemo(() =>
    ROLE_CONFIGS.map(({ label }) => {
      const rows = producerDataByRole[label] || [];
      const totalAll = rows.reduce((s, r) => s + r.total, 0);
      const fechadosAll = rows.reduce((s, r) => s + r.fechados, 0);
      return {
        papel: label.replace('Produtor ', ''),
        'Taxa Conversão': totalAll > 0 ? +((fechadosAll / totalAll) * 100).toFixed(1) : 0,
        'Em Cotação': rows.reduce((s, r) => s + r.emCotacao, 0),
        Fechados: fechadosAll,
        Declinados: rows.reduce((s, r) => s + r.declinados, 0),
      };
    }),
  [producerDataByRole]);

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5 text-primary" />
            Análise de Funil por Papel Comercial
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Performance detalhada de cada papel no pipeline comercial
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <Tabs defaultValue="por_papel" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="por_papel">Por Papel Comercial</TabsTrigger>
              <TabsTrigger value="comparativo">Comparativo</TabsTrigger>
            </TabsList>

            {/* Tab 1: Por Papel Comercial */}
            <TabsContent value="por_papel" className="space-y-4">
              {ROLE_CONFIGS.map(({ label, description }) => {
                const rows = producerDataByRole[label] || [];
                return (
                  <Card key={label}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-semibold">{label}</h4>
                        <Badge variant="secondary" className="text-[10px]">{rows.length} produtores</Badge>
                        <span className="text-[10px] text-muted-foreground ml-auto">{description}</span>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produtor</TableHead>
                            <TableHead className="text-center">Em Cotação</TableHead>
                            <TableHead className="text-center">Fechados</TableHead>
                            <TableHead className="text-center">Declinados</TableHead>
                            <TableHead className="text-center">Total</TableHead>
                            <TableHead className="text-center">Conversão</TableHead>
                            <TableHead className="text-right">Prêmio</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((row) => (
                            <TableRow key={`${label}-${row.nome}`}>
                              <TableCell className="font-medium">{row.nome}</TableCell>
                              <TableCell className="text-center text-primary font-semibold">{row.emCotacao}</TableCell>
                              <TableCell className="text-center text-success font-semibold">{row.fechados}</TableCell>
                              <TableCell className="text-center text-destructive font-semibold">{row.declinados}</TableCell>
                              <TableCell className="text-center font-semibold">{row.total}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={row.taxaConversao >= 50 ? 'default' : row.taxaConversao >= 25 ? 'secondary' : 'outline'} className="text-[10px]">
                                  {row.taxaConversao.toFixed(1)}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground text-xs">{formatCurrency(row.premio)}</TableCell>
                            </TableRow>
                          ))}
                          {rows.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-muted-foreground py-6">Nenhum dado disponível.</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            {/* Tab 2: Comparativo */}
            <TabsContent value="comparativo" className="space-y-4">
              {/* Distribution by role chart */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Percent className="h-4 w-4 text-primary" />
                    Distribuição e Conversão por Papel
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Volume por status</p>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={conversionChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                          <XAxis dataKey="papel" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} iconType="square" iconSize={10} />
                          <Bar dataKey="Em Cotação" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Fechados" fill="hsl(156, 72%, 40%)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Declinados" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Taxa de conversão</p>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={conversionChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                          <XAxis dataKey="papel" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} unit="%" />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} formatter={(v: number) => [`${v}%`, 'Conversão']} />
                          <Bar dataKey="Taxa Conversão" radius={[6, 6, 0, 0]}>
                            {conversionChartData.map((entry, i) => (
                              <Cell key={i} fill={entry['Taxa Conversão'] >= 50 ? 'hsl(156, 72%, 40%)' : entry['Taxa Conversão'] >= 25 ? 'hsl(35, 95%, 55%)' : 'hsl(0, 84%, 60%)'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top performers */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    Top Performers (por fechamentos)
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Produtor</TableHead>
                        <TableHead>Papel</TableHead>
                        <TableHead className="text-center">Fechados</TableHead>
                        <TableHead className="text-center">Conversão</TableHead>
                        <TableHead className="text-right">Prêmio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(producerDataByRole)
                        .flatMap(([role, rows]) => rows.map((r) => ({ ...r, role })))
                        .filter((r) => r.fechados > 0)
                        .sort((a, b) => b.fechados - a.fechados)
                        .slice(0, 10)
                        .map((row, i) => (
                          <TableRow key={`${row.role}-${row.nome}-${i}`}>
                            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                            <TableCell className="font-medium">{row.nome}</TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px]">{row.role.replace('Produtor ', '')}</Badge></TableCell>
                            <TableCell className="text-center text-success font-semibold">{row.fechados}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={row.taxaConversao >= 50 ? 'default' : 'secondary'} className="text-[10px]">{row.taxaConversao.toFixed(1)}%</Badge>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground text-xs">{formatCurrency(row.premio)}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
