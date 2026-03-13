import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Filter, TrendingUp, TrendingDown, Minus, Users, ArrowRight, BarChart3, Percent } from 'lucide-react';
import { type Cotacao } from '@/hooks/useSupabaseData';
import { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, FunnelChart, Funnel, LabelList } from 'recharts';

// Helper to get branch group
const getBranchGroup = (ramo: { descricao?: string; ramo_agrupado?: string | null } | undefined | null): string => {
  if (!ramo) return 'Outros';
  if (ramo.ramo_agrupado) return ramo.ramo_agrupado;
  const ramoUpper = (ramo.descricao || '').toUpperCase();
  if (ramoUpper.includes('RCTR-C') || ramoUpper.includes('RC-DC')) return 'RCTR-C + RC-DC';
  return ramo.descricao || 'Outros';
};

const countDistinct = (cotacoes: Cotacao[], statuses: string[]): number => {
  const keys = new Set<string>();
  let avulso = 0;
  cotacoes.forEach((c) => {
    if (statuses.includes(c.status)) {
      if (c.ramo?.segmento === 'Avulso') avulso++;
      else {
        const bg = getBranchGroup(c.ramo);
        keys.add(`${c.cpf_cnpj}_${bg}`);
      }
    }
  });
  return keys.size + avulso;
};

interface FunnelDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cotacoes: Cotacao[];
}

interface ProducerFunnelRow {
  nome: string;
  role: string;
  emCotacao: number;
  fechados: number;
  declinados: number;
  total: number;
  taxaConversao: number;
  premio: number;
}

export function FunnelDetailModal({ open, onOpenChange, cotacoes }: FunnelDetailModalProps) {
  const funnelData = useMemo(() => {
    const emCotacao = countDistinct(cotacoes, ['Em cotação']);
    const fechados = countDistinct(cotacoes, ['Negócio fechado', 'Fechamento congênere']);
    const declinados = countDistinct(cotacoes, ['Declinado']);
    const total = emCotacao + fechados + declinados;
    return { emCotacao, fechados, declinados, total };
  }, [cotacoes]);

  // Per-producer data by role
  const producerData = useMemo(() => {
    const roles: { key: 'produtor_origem' | 'produtor_negociador' | 'produtor_cotador'; label: string }[] = [
      { key: 'produtor_origem', label: 'Produtor Origem' },
      { key: 'produtor_negociador', label: 'Produtor Negociador' },
      { key: 'produtor_cotador', label: 'Produtor Cotador' },
    ];

    const result: Record<string, ProducerFunnelRow[]> = {};

    roles.forEach(({ key, label }) => {
      const byProducer = new Map<string, Cotacao[]>();
      cotacoes.forEach((c) => {
        const prod = c[key];
        if (prod?.nome) {
          if (!byProducer.has(prod.nome)) byProducer.set(prod.nome, []);
          byProducer.get(prod.nome)!.push(c);
        }
      });

      const rows: ProducerFunnelRow[] = [];
      byProducer.forEach((cots, nome) => {
        const emCotacao = countDistinct(cots, ['Em cotação']);
        const fechados = countDistinct(cots, ['Negócio fechado', 'Fechamento congênere']);
        const declinados = countDistinct(cots, ['Declinado']);
        const total = emCotacao + fechados + declinados;
        const premio = cots
          .filter((c) => c.status === 'Negócio fechado' || c.status === 'Fechamento congênere')
          .reduce((s, c) => s + (c.valor_premio || 0), 0);
        rows.push({
          nome,
          role: label,
          emCotacao,
          fechados,
          declinados,
          total,
          taxaConversao: total > 0 ? (fechados / total) * 100 : 0,
          premio,
        });
      });

      rows.sort((a, b) => b.total - a.total);
      result[label] = rows;
    });

    return result;
  }, [cotacoes]);

  // Conversion rates comparison chart data
  const conversionChartData = useMemo(() => {
    const roles = ['Produtor Origem', 'Produtor Negociador', 'Produtor Cotador'] as const;
    return roles.map((role) => {
      const rows = producerData[role] || [];
      const totalAll = rows.reduce((s, r) => s + r.total, 0);
      const fechadosAll = rows.reduce((s, r) => s + r.fechados, 0);
      return {
        papel: role.replace('Produtor ', ''),
        'Taxa Conversão': totalAll > 0 ? +((fechadosAll / totalAll) * 100).toFixed(1) : 0,
        'Em Cotação': rows.reduce((s, r) => s + r.emCotacao, 0),
        Fechados: fechadosAll,
        Declinados: rows.reduce((s, r) => s + r.declinados, 0),
      };
    });
  }, [producerData]);

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const funnelChartData = useMemo(() => [
    { name: 'Em Cotação', value: funnelData.emCotacao + funnelData.fechados + funnelData.declinados, fill: 'hsl(var(--primary))' },
    { name: 'Em Negociação', value: funnelData.emCotacao + funnelData.fechados, fill: 'hsl(35, 95%, 55%)' },
    { name: 'Fechados', value: funnelData.fechados, fill: 'hsl(156, 72%, 40%)' },
  ], [funnelData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5 text-primary" />
            Análise Completa do Funil Comercial
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Visão detalhada da progressão do pipeline e performance por papel comercial
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <Tabs defaultValue="visao_geral" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="visao_geral">Visão Geral</TabsTrigger>
              <TabsTrigger value="por_papel">Por Papel Comercial</TabsTrigger>
              <TabsTrigger value="comparativo">Comparativo</TabsTrigger>
            </TabsList>

            {/* Tab 1: Visão Geral */}
            <TabsContent value="visao_geral" className="space-y-4">
              {/* KPIs */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Total Pipeline', value: funnelData.total, color: 'text-foreground' },
                  { label: 'Em Cotação', value: funnelData.emCotacao, color: 'text-primary' },
                  { label: 'Fechados', value: funnelData.fechados, color: 'text-success' },
                  { label: 'Declinados', value: funnelData.declinados, color: 'text-destructive' },
                ].map((kpi) => (
                  <Card key={kpi.label}>
                    <CardContent className="p-3 text-center">
                      <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Funnel + Conversion */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-3">Funil de Conversão</h4>
                    <div className="space-y-2">
                      {[
                        { label: 'Total no Pipeline', value: funnelData.total, pct: 100, color: 'bg-primary' },
                        { label: 'Em Cotação (ativos)', value: funnelData.emCotacao, pct: funnelData.total > 0 ? (funnelData.emCotacao / funnelData.total) * 100 : 0, color: 'bg-warning' },
                        { label: 'Fechados', value: funnelData.fechados, pct: funnelData.total > 0 ? (funnelData.fechados / funnelData.total) * 100 : 0, color: 'bg-success' },
                      ].map((stage) => (
                        <div key={stage.label} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{stage.label}</span>
                            <span className="font-semibold">{stage.value} ({stage.pct.toFixed(0)}%)</span>
                          </div>
                          <div className="h-6 bg-muted/30 rounded overflow-hidden flex items-center justify-center relative">
                            <div
                              className={`absolute left-0 top-0 h-full ${stage.color} rounded transition-all`}
                              style={{ width: `${Math.max(stage.pct, 2)}%` }}
                            />
                            <span className="relative text-[10px] font-semibold text-white mix-blend-difference">
                              {stage.pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Conversion arrows */}
                    <div className="mt-4 space-y-2 pt-3 border-t">
                      <div className="flex items-center gap-2 text-xs">
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Taxa de Conversão:</span>
                        <Badge variant="outline" className="text-success border-success">
                          {funnelData.total > 0 ? ((funnelData.fechados / funnelData.total) * 100).toFixed(1) : 0}%
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Taxa de Declínio:</span>
                        <Badge variant="outline" className="text-destructive border-destructive">
                          {funnelData.total > 0 ? ((funnelData.declinados / funnelData.total) * 100).toFixed(1) : 0}%
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-3">Distribuição por Papel</h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={conversionChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis dataKey="papel" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} iconType="square" iconSize={10} />
                        <Bar dataKey="Em Cotação" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Fechados" fill="hsl(156, 72%, 40%)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Declinados" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab 2: Por Papel Comercial */}
            <TabsContent value="por_papel" className="space-y-4">
              {['Produtor Origem', 'Produtor Negociador', 'Produtor Cotador'].map((role) => (
                <Card key={role}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-semibold">{role}</h4>
                      <Badge variant="secondary" className="text-[10px]">
                        {(producerData[role] || []).length} produtores
                      </Badge>
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
                        {(producerData[role] || []).map((row) => (
                          <TableRow key={`${role}-${row.nome}`}>
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
                        {(producerData[role] || []).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                              Nenhum dado disponível para este papel.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Tab 3: Comparativo */}
            <TabsContent value="comparativo" className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Percent className="h-4 w-4 text-primary" />
                    Taxa de Conversão por Papel
                  </h4>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={conversionChartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis dataKey="papel" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} unit="%" />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(value: number) => [`${value}%`, 'Taxa de Conversão']}
                      />
                      <Bar dataKey="Taxa Conversão" radius={[6, 6, 0, 0]}>
                        {conversionChartData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry['Taxa Conversão'] >= 50 ? 'hsl(156, 72%, 40%)' : entry['Taxa Conversão'] >= 25 ? 'hsl(35, 95%, 55%)' : 'hsl(0, 84%, 60%)'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top performers across roles */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    Top Performers (por volume de fechamentos)
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
                      {Object.entries(producerData)
                        .flatMap(([role, rows]) => rows.map((r) => ({ ...r, role })))
                        .filter((r) => r.fechados > 0)
                        .sort((a, b) => b.fechados - a.fechados)
                        .slice(0, 10)
                        .map((row, i) => (
                          <TableRow key={`${row.role}-${row.nome}-${i}`}>
                            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                            <TableCell className="font-medium">{row.nome}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">{row.role.replace('Produtor ', '')}</Badge>
                            </TableCell>
                            <TableCell className="text-center text-success font-semibold">{row.fechados}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={row.taxaConversao >= 50 ? 'default' : 'secondary'} className="text-[10px]">
                                {row.taxaConversao.toFixed(1)}%
                              </Badge>
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
