import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TrendingUp, Target, Calendar } from 'lucide-react';

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
  produtor?: { id: string; nome: string };
}

const MONTHS = [
  { key: 'meta_jan', label: 'Jan', index: 0 },
  { key: 'meta_fev', label: 'Fev', index: 1 },
  { key: 'meta_mar', label: 'Mar', index: 2 },
  { key: 'meta_abr', label: 'Abr', index: 3 },
  { key: 'meta_mai', label: 'Mai', index: 4 },
  { key: 'meta_jun', label: 'Jun', index: 5 },
  { key: 'meta_jul', label: 'Jul', index: 6 },
  { key: 'meta_ago', label: 'Ago', index: 7 },
  { key: 'meta_set', label: 'Set', index: 8 },
  { key: 'meta_out', label: 'Out', index: 9 },
  { key: 'meta_nov', label: 'Nov', index: 10 },
  { key: 'meta_dez', label: 'Dez', index: 11 },
] as const;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

interface EscadinhaVisualizationProps {
  meta: MetaPremio;
}

const EscadinhaVisualization = ({ meta }: EscadinhaVisualizationProps) => {
  // Get monthly values
  const monthlyValues = useMemo(() => {
    return MONTHS.map(m => meta[m.key as keyof MetaPremio] as number);
  }, [meta]);

  // Calculate accumulated values (escadinha)
  const accumulatedValues = useMemo(() => {
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
  }, [monthlyValues]);

  // Generate escadinha table data (rows)
  const escadinhaRows = useMemo(() => {
    return MONTHS.map((month, rowIndex) => {
      const cells: (number | null)[] = [];
      for (let colIndex = 0; colIndex < 12; colIndex++) {
        if (colIndex >= rowIndex) {
          cells.push(monthlyValues[rowIndex]);
        } else {
          cells.push(null);
        }
      }
      return { month: month.label, cells };
    });
  }, [monthlyValues]);

  // Calculate insights
  const insights = useMemo(() => {
    const totalAnual = accumulatedValues[11];
    
    // Find biggest growth jump
    let maxGrowth = 0;
    let maxGrowthFrom = 0;
    let maxGrowthTo = 1;
    
    for (let i = 1; i < 12; i++) {
      const growth = accumulatedValues[i] - accumulatedValues[i - 1];
      if (growth > maxGrowth) {
        maxGrowth = growth;
        maxGrowthFrom = i - 1;
        maxGrowthTo = i;
      }
    }

    // Find when accumulated exceeds certain thresholds
    const thresholds = [100000, 250000, 500000];
    const crossings: { threshold: number; month: string }[] = [];
    
    thresholds.forEach(threshold => {
      for (let i = 0; i < 12; i++) {
        if (accumulatedValues[i] >= threshold) {
          crossings.push({ threshold, month: MONTHS[i].label });
          break;
        }
      }
    });

    return {
      totalAnual,
      maxGrowthFrom: MONTHS[maxGrowthFrom].label,
      maxGrowthTo: MONTHS[maxGrowthTo].label,
      maxGrowthValue: maxGrowth,
      crossings,
    };
  }, [accumulatedValues]);

  return (
    <div className="space-y-6">
      {/* Escadinha Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Visualização Escadinha - {meta.produtor?.nome || 'Produtor'} ({meta.ano})
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Cada linha mostra a meta mensal replicada até dezembro
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 font-semibold">Mês</TableHead>
                  {MONTHS.map(m => (
                    <TableHead key={m.key} className="text-center min-w-[80px]">
                      {m.label}
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-semibold bg-muted">Total Linha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {escadinhaRows.map((row, rowIndex) => {
                  const filledCells = row.cells.filter(c => c !== null).length;
                  const rowTotal = (monthlyValues[rowIndex] || 0) * filledCells;
                  
                  return (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium sticky left-0 bg-background z-10">
                        {row.month}
                      </TableCell>
                      {row.cells.map((cell, colIndex) => (
                        <TableCell 
                          key={colIndex} 
                          className={`text-center text-sm ${
                            cell !== null 
                              ? 'bg-primary/10 font-medium' 
                              : 'bg-muted/30'
                          }`}
                        >
                          {cell !== null ? formatCurrency(cell) : '-'}
                        </TableCell>
                      ))}
                      <TableCell className="text-center font-semibold bg-muted">
                        {formatCurrency(rowTotal)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Total row showing accumulated */}
                <TableRow className="border-t-2 border-primary">
                  <TableCell className="font-bold sticky left-0 bg-background z-10">
                    Acumulado
                  </TableCell>
                  {accumulatedValues.map((value, index) => (
                    <TableCell key={index} className="text-center font-bold bg-primary/20">
                      {formatCurrency(value)}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-bold bg-primary/30">
                    {formatCurrency(insights.totalAnual)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Insights Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Resumo Gerencial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <span className="text-lg">📌</span>
              <p className="text-sm">
                <strong>Meta anual total de prêmio para este produtor:</strong>{' '}
                <span className="text-primary font-semibold">{formatCurrency(insights.totalAnual)}</span>
              </p>
            </div>
            
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <span className="text-lg">📊</span>
              <p className="text-sm">
                <strong>O maior salto de crescimento de meta ocorre entre os meses:</strong>{' '}
                <span className="text-primary font-semibold">
                  {insights.maxGrowthFrom} e {insights.maxGrowthTo}
                </span>{' '}
                (aumento de {formatCurrency(insights.maxGrowthValue)})
              </p>
            </div>

            {insights.crossings.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                <span className="text-lg">🎯</span>
                <div className="text-sm">
                  <strong>Marcos de acúmulo de metas:</strong>
                  <ul className="mt-1 space-y-1">
                    {insights.crossings.map(({ threshold, month }) => (
                      <li key={threshold} className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        A partir de <span className="font-semibold text-primary">{month}</span>, 
                        o acúmulo supera <span className="font-semibold">{formatCurrency(threshold)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Monthly breakdown */}
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <span className="text-lg">💰</span>
              <div className="text-sm">
                <strong>Distribuição mensal das metas:</strong>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {MONTHS.map((month, index) => (
                    <div key={month.key} className="text-center p-2 bg-background rounded border">
                      <div className="text-xs text-muted-foreground">{month.label}</div>
                      <div className="font-medium text-sm">{formatCurrency(monthlyValues[index])}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EscadinhaVisualization;
