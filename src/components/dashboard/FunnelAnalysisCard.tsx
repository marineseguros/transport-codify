import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Filter, ExternalLink, AlertTriangle, ArrowDown, TrendingUp, Flame, Thermometer, Snowflake } from 'lucide-react';
import { type Cotacao } from '@/hooks/useSupabaseData';
import { FunnelDetailModal } from './FunnelDetailModal';

interface FunnelAnalysisCardProps {
  cotacoes: Cotacao[];
}

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function FunnelAnalysisCard({ cotacoes }: FunnelAnalysisCardProps) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  // Stage counts based on cotações with each role filled
  const stages = useMemo(() => {
    const comOrigem = cotacoes.filter(c => !!c.produtor_origem?.nome).length;
    const comNegociador = cotacoes.filter(c => !!c.produtor_negociador?.nome).length;
    const comCotador = cotacoes.filter(c => !!c.produtor_cotador?.nome).length;

    return [
      { key: 'origem', label: 'Origem', value: comOrigem, color: 'hsl(210, 50%, 25%)' },
      { key: 'negociador', label: 'Negociador', value: comNegociador, color: 'hsl(210, 55%, 45%)' },
      { key: 'cotador', label: 'Cotador', value: comCotador, color: 'hsl(200, 60%, 55%)' },
    ];
  }, [cotacoes]);

  // Stage-to-stage conversion rates
  const conversions = useMemo(() => {
    const total = cotacoes.length;
    const comOrigem = stages[0].value;
    const comNegociador = stages[1].value;
    const comCotador = stages[2].value;
    const fechados = cotacoes.filter(c => c.status === 'Negócio fechado' || c.status === 'Fechamento congênere').length;

    return {
      origemToNeg: comOrigem > 0 ? (comNegociador / comOrigem * 100) : 0,
      negToCot: comNegociador > 0 ? (comCotador / comNegociador * 100) : 0,
      cotToFechado: comCotador > 0 ? (fechados / comCotador * 100) : 0,
    };
  }, [cotacoes, stages]);

  // Bottleneck detection
  const bottleneck = useMemo(() => {
    const rates = [
      { label: 'Negociação', rate: conversions.origemToNeg },
      { label: 'Cotação', rate: conversions.negToCot },
      { label: 'Fechamento', rate: conversions.cotToFechado },
    ];
    const worst = rates.reduce((min, r) => r.rate < min.rate ? r : min, rates[0]);
    return worst.rate < 80 ? worst : null;
  }, [conversions]);

  // Forecast
  const forecast = useMemo(() => {
    const emAberto = cotacoes.filter(c => c.status === 'Em cotação');
    const pipeline = emAberto.reduce((s, c) => s + (c.valor_premio || 0), 0);
    const total = cotacoes.length;
    const fechados = cotacoes.filter(c => c.status === 'Negócio fechado' || c.status === 'Fechamento congênere').length;
    const taxaHist = total > 0 ? fechados / total : 0;
    return {
      pipeline,
      provavel: pipeline * taxaHist,
    };
  }, [cotacoes]);

  // Opportunity score summary
  const scores = useMemo(() => {
    let quente = 0, morno = 0, frio = 0;
    cotacoes.forEach(c => {
      if (c.status === 'Negócio fechado' || c.status === 'Fechamento congênere' || c.status === 'Declinado') return;
      const dias = (Date.now() - new Date(c.data_cotacao).getTime()) / (1000 * 60 * 60 * 24);
      const valor = c.valor_premio || 0;
      if (dias <= 15 && valor > 0) quente++;
      else if (dias <= 45) morno++;
      else frio++;
    });
    return { quente, morno, frio };
  }, [cotacoes]);

  const rates = useMemo(() => {
    const total = cotacoes.length;
    const fechados = cotacoes.filter(c => c.status === 'Negócio fechado' || c.status === 'Fechamento congênere').length;
    const declinados = cotacoes.filter(c => c.status === 'Declinado').length;
    return {
      conversao: total > 0 ? ((fechados / total) * 100).toFixed(1) : '0.0',
      declinio: total > 0 ? ((declinados / total) * 100).toFixed(1) : '0.0',
      total,
    };
  }, [cotacoes]);

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted/30">
                <Filter className="h-4.5 w-4.5 text-foreground" />
              </div>
              <div>
                <span>Funil Comercial</span>
                <p className="text-[11px] font-normal text-muted-foreground">
                  Análise estratégica do pipeline • Clique para drill-down
                </p>
              </div>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedStage('origem')}
            >
              Ver análise completa
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-stretch gap-5">
            {/* Funnel + conversions */}
            <div className="flex-1 flex flex-col items-center gap-0 py-2">
              {stages.map((stage, i) => {
                const widthPct = 100 - i * 18;
                const convRate = i === 0 ? conversions.origemToNeg : i === 1 ? conversions.negToCot : conversions.cotToFechado;
                const pctOfTotal = rates.total > 0 ? (stage.value / rates.total * 100).toFixed(0) : '0';
                return (
                  <div key={stage.key} className="w-full flex flex-col items-center">
                    <button
                      onClick={() => setSelectedStage(stage.key)}
                      className="relative flex items-center justify-center transition-all duration-300 cursor-pointer hover:opacity-90 group"
                      style={{
                        width: `${widthPct}%`,
                        height: '58px',
                        backgroundColor: stage.color,
                        clipPath: i === stages.length - 1
                          ? 'polygon(5% 0%, 95% 0%, 85% 100%, 15% 100%)'
                          : 'polygon(0% 0%, 100% 0%, 95% 100%, 5% 100%)',
                        borderRadius: i === 0 ? '6px 6px 0 0' : undefined,
                      }}
                    >
                      <div className="flex items-center gap-2 text-white z-10">
                        <span className="text-sm font-semibold">{stage.label}</span>
                        <span className="text-lg font-bold">{stage.value}</span>
                        <span className="text-[10px] opacity-70">({pctOfTotal}%)</span>
                      </div>
                    </button>
                    {/* Conversion arrow between stages */}
                    {i < stages.length - 1 && (
                      <div className="flex items-center gap-1 py-0.5">
                        <ArrowDown className="h-3 w-3 text-muted-foreground/50" />
                        <span className={`text-[10px] font-bold ${convRate >= 70 ? 'text-success' : convRate >= 40 ? 'text-warning' : 'text-destructive'}`}>
                          {convRate.toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right panel */}
            <div className="w-[165px] shrink-0 space-y-2.5 py-2">
              {/* Pipeline */}
              <div className="text-center pb-2 border-b">
                <span className="text-2xl font-bold text-foreground">{rates.total}</span>
                <p className="text-[10px] text-muted-foreground">cotações no pipeline</p>
              </div>

              {/* Conversion / Decline */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Conversão</span>
                  <span className="text-xs font-bold text-success">{rates.conversao}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Declínio</span>
                  <span className="text-xs font-bold text-destructive">{rates.declinio}%</span>
                </div>
              </div>

              {/* Bottleneck alert */}
              {bottleneck && (
                <div className="flex items-start gap-1.5 p-2 rounded-md bg-warning/10 border border-warning/20">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-warning">Gargalo</p>
                    <p className="text-[9px] text-muted-foreground">{bottleneck.label}: {bottleneck.rate.toFixed(0)}%</p>
                  </div>
                </div>
              )}

              {/* Opportunity Score */}
              <div className="pt-1.5 border-t space-y-1">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Score</p>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[10px]"><Flame className="h-3 w-3 text-destructive" />Quente</span>
                  <span className="text-xs font-bold text-destructive">{scores.quente}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[10px]"><Thermometer className="h-3 w-3 text-warning" />Morno</span>
                  <span className="text-xs font-bold text-warning">{scores.morno}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[10px]"><Snowflake className="h-3 w-3 text-primary" />Frio</span>
                  <span className="text-xs font-bold text-primary">{scores.frio}</span>
                </div>
              </div>

              {/* Forecast mini */}
              <div className="pt-1.5 border-t">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Forecast</p>
                <p className="text-sm font-bold text-success">{formatCurrency(forecast.provavel)}</p>
                <p className="text-[9px] text-muted-foreground">receita provável</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <FunnelDetailModal
        open={!!selectedStage}
        onOpenChange={(open) => !open && setSelectedStage(null)}
        cotacoes={cotacoes}
        initialStage={selectedStage || 'origem'}
      />
    </>
  );
}
