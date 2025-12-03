import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import type { Cotacao } from '@/hooks/useSupabaseData';

interface CotacoesEmAbertoChartProps {
  cotacoes: Cotacao[];
}

// Classifica se o ramo é "Recorrente" ou "Total" baseado na regra
const getRegraRamo = (ramoDescricao: string | undefined): 'Recorrente' | 'Total' => {
  if (!ramoDescricao) return 'Total';
  const ramoUpper = ramoDescricao.toUpperCase();
  
  // Total (Avulso): Nacional Avulsa, Importação Avulsa, Exportação Avulsa, Garantia Aduaneira, Ambiental
  if (ramoUpper.includes('AVULSA') || ramoUpper.includes('GARANTIA ADUANEIRA') || ramoUpper.includes('AMBIENTAL')) {
    return 'Total';
  }
  
  // Recorrente: Nacional, Exportação, Importação, RCTR-C, RC-DC, RCTR-VI, RCTA-C, RC-V
  return 'Recorrente';
};

// Get Segmento based on ramo
const getSegmento = (ramoDescricao: string | undefined): string => {
  if (!ramoDescricao) return 'Outros';
  const ramoUpper = ramoDescricao.toUpperCase();
  
  if (ramoUpper.includes('AVULSA') || ramoUpper.includes('GARANTIA ADUANEIRA')) {
    return 'Avulso';
  }
  if (ramoUpper.includes('AMBIENTAL')) {
    return 'Ambiental';
  }
  if (ramoUpper.includes('RC-V')) {
    return 'RC-V';
  }
  return 'Transportes';
};

interface QuoteDetail {
  id: string;
  ramo: string;
  segmento: string;
  premio: number;
  regra: 'Recorrente' | 'Total';
}

interface SeguradoData {
  segurado: string;
  premioRecorrente: number;
  premioTotal: number;
  premioGeral: number; // Sum of all for sorting
  cotacoesRecorrente: QuoteDetail[];
  cotacoesTotal: QuoteDetail[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload as SeguradoData;
  if (!data) return null;

  const activeDataKey = payload[0]?.dataKey;
  const isRecorrente = activeDataKey === 'premioRecorrente';
  const cotacoes = isRecorrente ? data.cotacoesRecorrente : data.cotacoesTotal;
  const tipoLabel = isRecorrente ? 'Recorrente' : 'Total';

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg max-w-sm max-h-64 overflow-y-auto">
      <h4 className="font-semibold text-sm mb-2 text-foreground">{data.segurado}</h4>
      <div className="text-xs mb-2">
        <span className="text-muted-foreground">Tipo: </span>
        <span className="font-medium text-foreground">{tipoLabel}</span>
      </div>
      
      {cotacoes.length > 0 && (
        <div className="border-t pt-2 mt-2">
          <p className="text-xs font-medium text-muted-foreground mb-1">Detalhes:</p>
          <div className="space-y-1.5">
            {cotacoes.slice(0, 5).map((cotacao, idx) => (
              <div key={cotacao.id} className="text-xs border-l-2 border-primary/30 pl-2">
                <div className="font-medium text-foreground">{cotacao.ramo}</div>
                <div className="text-muted-foreground">
                  Segmento: {cotacao.segmento} | {formatCurrency(cotacao.premio)}
                </div>
              </div>
            ))}
            {cotacoes.length > 5 && (
              <p className="text-xs text-muted-foreground italic">
                E mais {cotacoes.length - 5} cotação(ões)...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const CotacoesEmAbertoChart = ({ cotacoes }: CotacoesEmAbertoChartProps) => {
  // Filter ALL "Em cotação" status (ignore date filters) and group by Segurado
  const chartData = useMemo(() => {
    // Filter quotes with status "Em cotação" - ALL quotes, not filtered by date
    const emCotacao = cotacoes.filter(c => c.status === 'Em cotação');
    
    // Group by Segurado
    const groupedBySegurado = new Map<string, SeguradoData>();
    
    emCotacao.forEach(cotacao => {
      const segurado = cotacao.segurado || 'Não informado';
      const ramoDescricao = cotacao.ramo?.descricao;
      const regra = getRegraRamo(ramoDescricao);
      const segmento = getSegmento(ramoDescricao);
      const premio = cotacao.valor_premio || 0;
      
      if (!groupedBySegurado.has(segurado)) {
        groupedBySegurado.set(segurado, {
          segurado,
          premioRecorrente: 0,
          premioTotal: 0,
          premioGeral: 0,
          cotacoesRecorrente: [],
          cotacoesTotal: [],
        });
      }
      
      const data = groupedBySegurado.get(segurado)!;
      data.premioGeral += premio;
      
      const quoteDetail: QuoteDetail = {
        id: cotacao.id,
        ramo: ramoDescricao || 'Não informado',
        segmento,
        premio,
        regra,
      };
      
      if (regra === 'Recorrente') {
        data.premioRecorrente += premio;
        data.cotacoesRecorrente.push(quoteDetail);
      } else {
        data.premioTotal += premio;
        data.cotacoesTotal.push(quoteDetail);
      }
    });
    
    // Convert to array and sort by premioGeral descending
    return Array.from(groupedBySegurado.values())
      .sort((a, b) => b.premioGeral - a.premioGeral)
      .slice(0, 10); // Top 10 segurados
  }, [cotacoes]);

  // Calculate totals
  const totals = useMemo(() => {
    return chartData.reduce(
      (acc, item) => ({
        recorrente: acc.recorrente + item.premioRecorrente,
        total: acc.total + item.premioTotal,
        geral: acc.geral + item.premioGeral,
      }),
      { recorrente: 0, total: 0, geral: 0 }
    );
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Cotações em Aberto – Recorrente x Total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
            Nenhuma cotação em aberto
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Cotações em Aberto – Recorrente x Total
          </div>
          <div className="text-sm font-normal text-muted-foreground">
            Recorrente: <span className="font-semibold text-primary">{formatCurrency(totals.recorrente)}</span>
            {' | '}
            Total: <span className="font-semibold text-foreground">{formatCurrency(totals.total)}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(350, chartData.length * 50)}>
          <BarChart 
            data={chartData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
            <XAxis 
              type="number"
              tick={{ fontSize: 11 }}
              tickLine={false}
              className="text-muted-foreground"
              tickFormatter={(value) => formatCurrency(value)}
            />
            <YAxis 
              type="category"
              dataKey="segurado" 
              tick={{ fontSize: 10 }}
              tickLine={false}
              className="text-muted-foreground"
              width={120}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="premioRecorrente" 
              fill="hsl(var(--primary))" 
              radius={[0, 4, 4, 0]}
              name="Prêmio Recorrente"
            />
            <Bar 
              dataKey="premioTotal" 
              fill="hsl(var(--muted-foreground))" 
              radius={[0, 4, 4, 0]}
              name="Prêmio Total"
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold">{chartData.length}</p>
            <p className="text-xs text-muted-foreground">Segurados</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{formatCurrency(totals.recorrente)}</p>
            <p className="text-xs text-muted-foreground">Prêmio Recorrente</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{formatCurrency(totals.total)}</p>
            <p className="text-xs text-muted-foreground">Prêmio Total</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
