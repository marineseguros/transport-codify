import { useMemo, useState, useEffect } from 'react';
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
  LabelList } from
'recharts';
import type { Cotacao } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import DOMPurify from 'dompurify';

interface CotacoesEmAbertoChartProps {
  cotacoes: Cotacao[];
  produtorFilter?: string[];
}

type ViewType = 'Recorrente' | 'Total';

// Import centralized classification
import { getRegraRamo, getRamoGroup as getRamoGroupFromLib } from '@/lib/ramoClassification';

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

// Usa a função importada para agrupar ramos
const getRamoGroup = (ramo: any): string => {
  return getRamoGroupFromLib(ramo);
};

interface QuoteDetail {
  id: string;
  ramo: string;
  ramoGroup: string; // Grupo do ramo (ex: "RCTR-C + RC-DC")
  segmento: string;
  premio: number;
  regra: 'Recorrente' | 'Total';
  dataCotacao: string | null;
  produtorCotador: string | null;
}

// Estrutura para agrupar cotações por segurado E por grupo de ramo
interface RamoGroupData {
  ramoGroup: string;
  segmento: string;
  premioTotal: number;
  dataMaisAntiga: string | null;
  produtorCotador: string | null;
  cotacoes: QuoteDetail[];
}

interface SeguradoData {
  segurado: string;
  premioRecorrente: number;
  premioTotal: number;
  cotacoesRecorrente: QuoteDetail[];
  cotacoesTotal: QuoteDetail[];
  // Grupos de ramo agrupados
  ramoGroupsRecorrente: Map<string, RamoGroupData>;
  ramoGroupsTotal: Map<string, RamoGroupData>;
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
    maximumFractionDigits: 0
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

  // Get the ramoGroups based on viewType
  const ramoGroups = viewType === 'Recorrente' ? data.ramoGroupsRecorrente : data.ramoGroupsTotal;

  // Find the representative ramo group (highest premium)
  let representativeGroup: RamoGroupData | null = null;
  if (ramoGroups) {
    let maxPremio = 0;
    ramoGroups.forEach((group) => {
      if (group.premioTotal > maxPremio) {
        maxPremio = group.premioTotal;
        representativeGroup = group;
      }
    });
  }

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
        {representativeGroup?.produtorCotador &&
        <div>
            <span className="text-muted-foreground">Produtor Cotador: </span>
            <span className="font-medium text-foreground">{representativeGroup.produtorCotador}</span>
          </div>
        }
        {representativeGroup &&
        <div className="pt-1 border-t mt-1">
            <span className="text-muted-foreground">Prêmio Cotação: </span>
            <span className="font-semibold text-primary">{formatCurrency(representativeGroup.premioTotal)}</span>
          </div>
        }
      </div>
    </div>);

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
      dominantBaseline="middle">
      
      {formatCurrencyShort(value)}
    </text>);

};

export const CotacoesEmAbertoChart = ({ cotacoes, produtorFilter = [] }: CotacoesEmAbertoChartProps) => {
  const [viewType, setViewType] = useState<ViewType>('Recorrente');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Clear AI analysis when cotacoes or produtorFilter changes (refresh/update)
  useEffect(() => {
    setAiAnalysis('');
  }, [cotacoes, produtorFilter]);

  // Process all "Em cotação" data - SEM filtro de data, apenas filtro de produtor
  const allData = useMemo(() => {
    let emCotacao = cotacoes.filter((c) => c.status === 'Em cotação');

    // Aplicar filtro de produtor_cotador (para "Em cotação" usa produtor_cotador)
    if (produtorFilter.length > 0) {
      emCotacao = emCotacao.filter((c) => c.produtor_cotador?.nome && produtorFilter.includes(c.produtor_cotador.nome));
    }
    const groupedBySegurado = new Map<string, SeguradoData>();

    emCotacao.forEach((cotacao) => {
      const segurado = cotacao.segurado || 'Não informado';
      const ramoDescricao = cotacao.ramo?.descricao;
      const regra = getRegraRamo(cotacao.ramo);
      const segmento = getSegmento(ramoDescricao);
      const ramoGroup = getRamoGroup(cotacao.ramo);
      const premio = cotacao.valor_premio || 0;

      if (!groupedBySegurado.has(segurado)) {
        groupedBySegurado.set(segurado, {
          segurado,
          premioRecorrente: 0,
          premioTotal: 0,
          cotacoesRecorrente: [],
          cotacoesTotal: [],
          ramoGroupsRecorrente: new Map<string, RamoGroupData>(),
          ramoGroupsTotal: new Map<string, RamoGroupData>(),
          premio: 0,
          ramoRepresentativo: '',
          segmentoRepresentativo: '',
          dataInicio: null
        });
      }

      const data = groupedBySegurado.get(segurado)!;

      const quoteDetail: QuoteDetail = {
        id: cotacao.id,
        ramo: ramoDescricao || 'Não informado',
        ramoGroup,
        segmento,
        premio,
        regra,
        dataCotacao: cotacao.data_cotacao,
        produtorCotador: cotacao.produtor_cotador?.nome || null
      };

      // Agrupar por ramoGroup para somar RCTR-C + RC-DC
      const ramoGroupsMap = regra === 'Recorrente' ? data.ramoGroupsRecorrente : data.ramoGroupsTotal;

      if (!ramoGroupsMap.has(ramoGroup)) {
        ramoGroupsMap.set(ramoGroup, {
          ramoGroup,
          segmento,
          premioTotal: 0,
          dataMaisAntiga: cotacao.data_cotacao,
          produtorCotador: cotacao.produtor_cotador?.nome || null,
          cotacoes: []
        });
      }

      const groupData = ramoGroupsMap.get(ramoGroup)!;
      groupData.premioTotal += premio;
      groupData.cotacoes.push(quoteDetail);

      // Atualizar data mais antiga
      if (cotacao.data_cotacao && (!groupData.dataMaisAntiga || cotacao.data_cotacao < groupData.dataMaisAntiga)) {
        groupData.dataMaisAntiga = cotacao.data_cotacao;
      }

      if (regra === 'Recorrente') {
        data.premioRecorrente += premio;
        data.cotacoesRecorrente.push(quoteDetail);
      } else {
        data.premioTotal += premio;
        data.cotacoesTotal.push(quoteDetail);
      }
    });

    return Array.from(groupedBySegurado.values());
  }, [cotacoes, produtorFilter]);

  // Filter and sort based on viewType
  const chartData = useMemo(() => {
    return allData.
    map((item) => {
      const ramoGroups = viewType === 'Recorrente' ? item.ramoGroupsRecorrente : item.ramoGroupsTotal;
      const premio = viewType === 'Recorrente' ? item.premioRecorrente : item.premioTotal;

      // Find the representative ramo group (highest premium)
      let representativeGroup: RamoGroupData | null = null;
      let maxPremio = 0;
      ramoGroups.forEach((group) => {
        if (group.premioTotal > maxPremio) {
          maxPremio = group.premioTotal;
          representativeGroup = group;
        }
      });

      return {
        ...item,
        premio,
        ramoRepresentativo: representativeGroup?.ramoGroup || 'N/A',
        segmentoRepresentativo: representativeGroup?.segmento || 'N/A',
        dataInicio: representativeGroup?.dataMaisAntiga || null
      };
    }).
    filter((item) => item.premio > 0).
    sort((a, b) => b.premio - a.premio).
    slice(0, 10);
  }, [allData, viewType]);

  // Calculate totals
  const totals = useMemo(() => {
    return allData.reduce(
      (acc, item) => ({
        recorrente: acc.recorrente + item.premioRecorrente,
        total: acc.total + item.premioTotal
      }),
      { recorrente: 0, total: 0 }
    );
  }, [allData]);

  // Generate AI analysis
  const generateAIAnalysis = async () => {
    setIsLoadingAI(true);
    try {
      const analysisData = allData.map((d) => ({
        segurado: d.segurado,
        premioRecorrente: d.premioRecorrente,
        premioTotal: d.premioTotal,
        qtdCotacoesRecorrente: d.cotacoesRecorrente.length,
        qtdCotacoesTotal: d.cotacoesTotal.length,
        ramosRecorrente: d.cotacoesRecorrente.map((c) => c.ramo),
        ramosTotal: d.cotacoesTotal.map((c) => c.ramo),
        datasMaisAntigas: [...d.cotacoesRecorrente, ...d.cotacoesTotal].
        map((c) => c.dataCotacao).
        filter(Boolean).
        sort()[0]
      }));

      const { data, error } = await supabase.functions.invoke('ai-analysis', {
        body: {
          type: 'open-quotes',
          data: analysisData,
          totals: {
            recorrente: totals.recorrente,
            total: totals.total,
            segurados: allData.length
          }
        }
      });

      if (error) throw error;
      if (data?.error) {
        setAiAnalysis(data.error);
      } else {
        setAiAnalysis(data.analysis || 'Não foi possível gerar a análise.');
      }
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
      </Card>);

  }

  return;

























































































































































};