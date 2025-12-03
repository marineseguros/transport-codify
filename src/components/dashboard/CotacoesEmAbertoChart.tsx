import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Sparkles, Loader2 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from 'recharts';
import type { Cotacao } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';

interface CotacoesEmAbertoChartProps {
  cotacoes: Cotacao[];
}

type ViewType = 'Recorrente' | 'Total';

// Classifica se o ramo é "Recorrente" ou "Total" baseado na regra
const getRegraRamo = (ramoDescricao: string | undefined): 'Recorrente' | 'Total' => {
  if (!ramoDescricao) return 'Total';
  const ramoUpper = ramoDescricao.toUpperCase();
  
  if (ramoUpper.includes('AVULSA') || ramoUpper.includes('GARANTIA ADUANEIRA') || ramoUpper.includes('AMBIENTAL')) {
    return 'Total';
  }
  
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
  dataCotacao: string | null;
}

interface SeguradoData {
  segurado: string;
  premioRecorrente: number;
  premioTotal: number;
  cotacoesRecorrente: QuoteDetail[];
  cotacoesTotal: QuoteDetail[];
  // For chart display
  premio: number;
  ramoRepresentativo: string;
  segmentoRepresentativo: string;
  dataInicio: string | null;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCurrencyShort = (value: number) => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return `R$ ${value}`;
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'Não informada';
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, viewType }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload as SeguradoData;
  if (!data) return null;

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg max-w-xs">
      <h4 className="font-semibold text-sm mb-2 text-foreground">{data.segurado}</h4>
      <div className="space-y-1 text-xs">
        <div>
          <span className="text-muted-foreground">Tipo: </span>
          <span className="font-medium text-foreground">{viewType}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Ramo: </span>
          <span className="font-medium text-foreground">{data.ramoRepresentativo}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Segmento: </span>
          <span className="font-medium text-foreground">{data.segmentoRepresentativo}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Data Início: </span>
          <span className="font-medium text-foreground">{formatDate(data.dataInicio)}</span>
        </div>
        <div className="pt-1 border-t mt-1">
          <span className="text-muted-foreground">Prêmio: </span>
          <span className="font-semibold text-primary">{formatCurrency(data.premio)}</span>
        </div>
      </div>
    </div>
  );
};

// Custom label for bar
const renderCustomLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  if (value === 0) return null;
  
  const labelX = x + width + 5;
  const labelY = y + height / 2;
  
  return (
    <text
      x={labelX}
      y={labelY}
      fill="hsl(var(--foreground))"
      fontSize={10}
      dominantBaseline="middle"
    >
      {formatCurrencyShort(value)}
    </text>
  );
};

export const CotacoesEmAbertoChart = ({ cotacoes }: CotacoesEmAbertoChartProps) => {
  const [viewType, setViewType] = useState<ViewType>('Recorrente');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Process all "Em cotação" data
  const allData = useMemo(() => {
    const emCotacao = cotacoes.filter(c => c.status === 'Em cotação');
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
          cotacoesRecorrente: [],
          cotacoesTotal: [],
          premio: 0,
          ramoRepresentativo: '',
          segmentoRepresentativo: '',
          dataInicio: null,
        });
      }
      
      const data = groupedBySegurado.get(segurado)!;
      
      const quoteDetail: QuoteDetail = {
        id: cotacao.id,
        ramo: ramoDescricao || 'Não informado',
        segmento,
        premio,
        regra,
        dataCotacao: cotacao.data_cotacao,
      };
      
      if (regra === 'Recorrente') {
        data.premioRecorrente += premio;
        data.cotacoesRecorrente.push(quoteDetail);
      } else {
        data.premioTotal += premio;
        data.cotacoesTotal.push(quoteDetail);
      }
    });
    
    return Array.from(groupedBySegurado.values());
  }, [cotacoes]);

  // Filter and sort based on viewType
  const chartData = useMemo(() => {
    return allData
      .map(item => {
        const cotacoes = viewType === 'Recorrente' ? item.cotacoesRecorrente : item.cotacoesTotal;
        const premio = viewType === 'Recorrente' ? item.premioRecorrente : item.premioTotal;
        
        // Get representative quote (highest premium)
        const representativo = cotacoes.sort((a, b) => b.premio - a.premio)[0];
        
        return {
          ...item,
          premio,
          ramoRepresentativo: representativo?.ramo || 'N/A',
          segmentoRepresentativo: representativo?.segmento || 'N/A',
          dataInicio: representativo?.dataCotacao || null,
        };
      })
      .filter(item => item.premio > 0)
      .sort((a, b) => b.premio - a.premio)
      .slice(0, 10);
  }, [allData, viewType]);

  // Calculate totals
  const totals = useMemo(() => {
    return allData.reduce(
      (acc, item) => ({
        recorrente: acc.recorrente + item.premioRecorrente,
        total: acc.total + item.premioTotal,
      }),
      { recorrente: 0, total: 0 }
    );
  }, [allData]);

  // Generate AI analysis
  const generateAIAnalysis = async () => {
    setIsLoadingAI(true);
    try {
      const analysisData = allData.map(d => ({
        segurado: d.segurado,
        premioRecorrente: d.premioRecorrente,
        premioTotal: d.premioTotal,
        qtdCotacoesRecorrente: d.cotacoesRecorrente.length,
        qtdCotacoesTotal: d.cotacoesTotal.length,
        ramosRecorrente: d.cotacoesRecorrente.map(c => c.ramo),
        ramosTotal: d.cotacoesTotal.map(c => c.ramo),
        datasMaisAntigas: [...d.cotacoesRecorrente, ...d.cotacoesTotal]
          .map(c => c.dataCotacao)
          .filter(Boolean)
          .sort()[0],
      }));

      const { data, error } = await supabase.functions.invoke('ai-analysis', {
        body: {
          type: 'open-quotes',
          data: analysisData,
          totals: {
            recorrente: totals.recorrente,
            total: totals.total,
            segurados: allData.length,
          },
        },
      });

      if (error) throw error;
      setAiAnalysis(data.analysis || 'Não foi possível gerar a análise.');
    } catch (err) {
      setAiAnalysis('Erro ao gerar análise. Tente novamente.');
    } finally {
      setIsLoadingAI(false);
    }
  };

  if (chartData.length === 0 && allData.length === 0) {
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
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            Cotações em Aberto
          </CardTitle>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewType === 'Recorrente' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => setViewType('Recorrente')}
            >
              Recorrente
            </Button>
            <Button
              variant={viewType === 'Total' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => setViewType('Total')}
            >
              Total
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {viewType === 'Recorrente' 
            ? `${formatCurrency(totals.recorrente)} em aberto`
            : `${formatCurrency(totals.total)} em aberto`
          }
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart Section */}
          <div className="min-h-[300px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(280, chartData.length * 40)}>
                <BarChart 
                  data={chartData} 
                  margin={{ top: 10, right: 60, left: 10, bottom: 10 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    className="text-muted-foreground"
                    tickFormatter={(value) => formatCurrencyShort(value)}
                  />
                  <YAxis 
                    type="category"
                    dataKey="segurado" 
                    tick={{ fontSize: 9 }}
                    tickLine={false}
                    className="text-muted-foreground"
                    width={100}
                  />
                  <Tooltip content={<CustomTooltip viewType={viewType} />} />
                  <Bar 
                    dataKey="premio" 
                    fill={viewType === 'Recorrente' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'} 
                    radius={[0, 4, 4, 0]}
                    name={viewType === 'Recorrente' ? 'Prêmio Recorrente' : 'Prêmio Total'}
                  >
                    <LabelList content={renderCustomLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                Nenhuma cotação {viewType.toLowerCase()} em aberto
              </div>
            )}
          </div>

          {/* AI Analysis Section */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Análise por IA
              </h4>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={generateAIAnalysis}
                disabled={isLoadingAI}
              >
                {isLoadingAI ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  'Gerar Análise'
                )}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground min-h-[220px] overflow-y-auto">
              {aiAnalysis ? (
                <div className="whitespace-pre-wrap leading-relaxed">{aiAnalysis}</div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] text-center">
                  <Sparkles className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p>Clique em "Gerar Análise" para obter insights sobre as cotações em aberto.</p>
                  <p className="mt-2 text-muted-foreground/70">
                    A IA identificará clientes com maior potencial, valores concentrados e oportunidades.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-xl font-bold">{allData.filter(d => viewType === 'Recorrente' ? d.premioRecorrente > 0 : d.premioTotal > 0).length}</p>
            <p className="text-xs text-muted-foreground">Segurados ({viewType})</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-primary">{formatCurrency(totals.recorrente)}</p>
            <p className="text-xs text-muted-foreground">Prêmio Recorrente</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{formatCurrency(totals.total)}</p>
            <p className="text-xs text-muted-foreground">Prêmio Total</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
