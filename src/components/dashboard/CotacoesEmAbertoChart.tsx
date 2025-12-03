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
} from 'recharts';
import type { Cotacao } from '@/hooks/useSupabaseData';

interface CotacoesEmAbertoChartProps {
  cotacoes: Cotacao[];
}

// Classifica se o ramo é "Recorrente" ou "Total" baseado na memória do sistema
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
  
  // Avulso
  if (ramoUpper.includes('AVULSA') || ramoUpper.includes('GARANTIA ADUANEIRA')) {
    return 'Avulso';
  }
  
  // Ambiental
  if (ramoUpper.includes('AMBIENTAL')) {
    return 'Ambiental';
  }
  
  // RC-V
  if (ramoUpper.includes('RC-V')) {
    return 'RC-V';
  }
  
  // Transportes
  return 'Transportes';
};

interface QuoteDetail {
  id: string;
  ramo: string;
  segmento: string;
  premio: number;
}

interface SeguradoData {
  segurado: string;
  premioTotal: number;
  premioRecorrente: number;
  cotacoes: QuoteDetail[];
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

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg max-w-sm max-h-64 overflow-y-auto">
      <h4 className="font-semibold text-sm mb-2 text-foreground">{label}</h4>
      <div className="space-y-1 mb-2">
        <div className="text-xs flex justify-between">
          <span className="text-muted-foreground">Prêmio Total:</span>
          <span className="font-medium text-foreground">{formatCurrency(data.premioTotal)}</span>
        </div>
        <div className="text-xs flex justify-between">
          <span className="text-muted-foreground">Prêmio Recorrente:</span>
          <span className="font-medium text-primary">{formatCurrency(data.premioRecorrente)}</span>
        </div>
      </div>
      
      {data.cotacoes.length > 0 && (
        <div className="border-t pt-2 mt-2">
          <p className="text-xs font-medium text-muted-foreground mb-1">Detalhes das Cotações:</p>
          <div className="space-y-1.5">
            {data.cotacoes.slice(0, 5).map((cotacao, idx) => (
              <div key={cotacao.id} className="text-xs border-l-2 border-primary/30 pl-2">
                <div className="font-medium text-foreground">{cotacao.ramo}</div>
                <div className="text-muted-foreground">
                  Segmento: {cotacao.segmento} | {formatCurrency(cotacao.premio)}
                </div>
              </div>
            ))}
            {data.cotacoes.length > 5 && (
              <p className="text-xs text-muted-foreground italic">
                E mais {data.cotacoes.length - 5} cotação(ões)...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const CotacoesEmAbertoChart = ({ cotacoes }: CotacoesEmAbertoChartProps) => {
  // Filter only "Em cotação" status and group by Segurado
  const chartData = useMemo(() => {
    // Filter quotes with status "Em cotação"
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
          premioTotal: 0,
          premioRecorrente: 0,
          cotacoes: [],
        });
      }
      
      const data = groupedBySegurado.get(segurado)!;
      data.premioTotal += premio;
      if (regra === 'Recorrente') {
        data.premioRecorrente += premio;
      }
      data.cotacoes.push({
        id: cotacao.id,
        ramo: ramoDescricao || 'Não informado',
        segmento,
        premio,
      });
    });
    
    // Convert to array and sort by premioTotal descending
    return Array.from(groupedBySegurado.values())
      .sort((a, b) => b.premioTotal - a.premioTotal)
      .slice(0, 10); // Top 10 segurados
  }, [cotacoes]);

  // Calculate totals
  const totals = useMemo(() => {
    return chartData.reduce(
      (acc, item) => ({
        total: acc.total + item.premioTotal,
        recorrente: acc.recorrente + item.premioRecorrente,
      }),
      { total: 0, recorrente: 0 }
    );
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Cotações em Aberto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
            Nenhuma cotação em aberto no período
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Cotações em Aberto
          </div>
          <div className="text-sm font-normal text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{formatCurrency(totals.total)}</span>
            {' | '}
            Recorrente: <span className="font-semibold text-primary">{formatCurrency(totals.recorrente)}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart 
            data={chartData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            layout="horizontal"
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="segurado" 
              tick={{ fontSize: 10 }}
              tickLine={false}
              className="text-muted-foreground"
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={false}
              className="text-muted-foreground"
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="premioTotal" 
              fill="hsl(var(--muted-foreground))" 
              radius={[4, 4, 0, 0]}
              name="Prêmio Total"
            />
            <Bar 
              dataKey="premioRecorrente" 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]}
              name="Prêmio Recorrente"
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
            <p className="text-2xl font-bold">{formatCurrency(totals.total)}</p>
            <p className="text-xs text-muted-foreground">Prêmio Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{formatCurrency(totals.recorrente)}</p>
            <p className="text-xs text-muted-foreground">Prêmio Recorrente</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
