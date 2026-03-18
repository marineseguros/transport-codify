import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Filter, ExternalLink, AlertTriangle, TrendingUp, Flame, Snowflake, ThermometerSun } from 'lucide-react';
import { type Cotacao } from '@/hooks/useSupabaseData';
import { FunnelDetailModal } from './FunnelDetailModal';

interface FunnelAnalysisCardProps {
  cotacoes: Cotacao[];
}

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function FunnelAnalysisCard({ cotacoes }: FunnelAnalysisCardProps) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  // Stage-based pipeline: Origem → Negociação → Cotação → Fechado
  const pipeline = useMemo(() => {
    const total = cotacoes.length;
    const withOrigem = cotacoes.filter(c => c.produtor_origem?.nome).length;
    const withNegociador = cotacoes.filter(c => c.produtor_negociador?.nome).length;
    const withCotador = cotacoes.filter(c => c.produtor_cotador?.nome).length;
    const fechados = cotacoes.filter(c => c.status === 'Negócio fechado' || c.status === 'Fechamento congênere').length;
    const declinados = cotacoes.filter(c => c.status === 'Declinado').length;

    const stages = [
      { key: 'origem', label: 'Origem', value: withOrigem, color: 'hsl(210, 50%, 25%)' },
      { key: 'negociador', label: 'Negociador', value: withNegociador, color: 'hsl(210, 55%, 45%)' },
      { key: 'cotador', label: 'Cotador', value: withCotador, color: 'hsl(200, 60%, 55%)' },
    ];

    // Conversion between stages
    const conversions = stages.map((s, i) => {
      if (i === 0) return 100;
      const prev = stages[i - 1].value;
      return prev > 0 ? (s.value / prev) * 100 : 0;
    });

    // Final conversion
    const convFechamento = withCotador > 0 ? (fechados / withCotador) * 100 : 0;

    return { stages, conversions, total, fechados, declinados, convFechamento };
  }, [cotacoes]);

  // Gargalo detection
  const gargalo = useMemo(() => {
    const { stages } = pipeline;
    let maxDrop = 0;
    let gargaloStage = '';
    for (let i = 1; i < stages.length; i++) {
      const drop = stages[i - 1].value - stages[i].value;
      if (drop > maxDrop) { maxDrop = drop; gargaloStage = stages[i].label; }
    }
    // Also check cotador → fechado
    const dropFinal = stages[2].value - pipeline.fechados;
    if (dropFinal > maxDrop) { gargaloStage = 'Fechamento'; }
    return gargaloStage;
  }, [pipeline]);

  // Forecast
  const forecast = useMemo(() => {
    const emAberto = cotacoes.filter(c => c.status === 'Em cotação');
    const pipelineValue = emAberto.reduce((s, c) => s + (c.valor_premio || 0), 0);
    const total = cotacoes.length;
    const fechados = cotacoes.filter(c => c.status === 'Negócio fechado' || c.status === 'Fechamento congênere').length;
    const conv = total > 0 ? fechados / total : 0;
    return {
      pessimista: pipelineValue * Math.max(conv * 0.6, 0.05),
      provavel: pipelineValue * Math.max(conv, 0.1),
      otimista: pipelineValue * Math.min(conv * 1.5, 0.95),
    };
  }, [cotacoes]);

  // Score summary
  const scores = useMemo(() => {
    let quente = 0, morno = 0, frio = 0;
    cotacoes.forEach(c => {
      if (c.status !== 'Em cotação') return;
      const dias = (Date.now() - new Date(c.data_cotacao).getTime()) / (1000 * 60 * 60 * 24);
      const premio = c.valor_premio || 0;
      if (dias <= 15 && premio > 5000) quente++;
      else if (dias <= 45) morno++;
      else frio++;
    });
    return { quente, morno, frio };
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
                  Pipeline por etapa • Conversão • Forecast
                </p>
              </div>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedStage('origem')}
            >
              Análise completa
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-start gap-5">
            {/* Funnel shape */}
            <div className="flex-1 flex flex-col items-center gap-1 py-2">
              {pipeline.stages.map((stage, i) => {
                const widthPct = 100 - i * 14;
                const conv = pipeline.conversions[i];
                return (
                  <div key={stage.key} className="w-full flex flex-col items-center">
                    {i > 0 && (
                      <div className="flex items-center gap-1 py-0.5">
                        <TrendingUp className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className={`text-[9px] font-bold ${conv >= 80 ? 'text-success' : conv >= 50 ? 'text-warning' : 'text-destructive'}`}>
                          {conv.toFixed(0)}%
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => setSelectedStage(stage.key)}
                      className="relative flex items-center justify-center transition-all duration-300 cursor-pointer hover:opacity-90 hover:scale-[1.01]"
                      style={{
                        width: `${widthPct}%`,
                        height: '56px',
                        backgroundColor: stage.color,
                        clipPath: i === pipeline.stages.length - 1
                          ? 'polygon(4% 0%, 96% 0%, 88% 100%, 12% 100%)'
                          : 'polygon(0% 0%, 100% 0%, 96% 100%, 4% 100%)',
                        borderRadius: i === 0 ? '4px 4px 0 0' : undefined,
                      }}
                    >
                      <div className="flex items-center gap-2.5 text-white z-10">
                        <span className="text-sm font-semibold">{stage.label}</span>
                        <span className="text-lg font-bold">{stage.value}</span>
                        <span className="text-[9px] opacity-70">({pipeline.total > 0 ? ((stage.value / pipeline.total) * 100).toFixed(0) : 0}%)</span>
                      </div>
                    </button>
                  </div>
                );
              })}
              {/* Final conversion arrow */}
              <div className="flex items-center gap-1 py-0.5">
                <TrendingUp className="h-2.5 w-2.5 text-muted-foreground" />
                <span className={`text-[9px] font-bold ${pipeline.convFechamento >= 40 ? 'text-success' : 'text-destructive'}`}>
                  {pipeline.convFechamento.toFixed(0)}%
                </span>
              </div>
              {/* Fechado bar */}
              <div
                className="flex items-center justify-center text-white text-xs font-bold rounded"
                style={{ width: '50%', height: '36px', backgroundColor: 'hsl(156, 62%, 40%)' }}
              >
                ✓ {pipeline.fechados} Fechados
              </div>
            </div>

            {/* Analytics sidebar */}
            <div className="w-[155px] shrink-0 space-y-2.5 pt-1">
              {/* Gargalo */}
              {gargalo && (
                <div className="p-2 rounded-md bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-1 mb-0.5">
                    <AlertTriangle className="h-3 w-3 text-destructive" />
                    <span className="text-[9px] font-bold text-destructive uppercase">Gargalo atual</span>
                  </div>
                  <p className="text-[10px] text-destructive/80">{gargalo}</p>
                </div>
              )}

              {/* Score */}
              <div className="space-y-1">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Score Pipeline</p>
                <div className="flex items-center gap-1.5">
                  <Flame className="h-3 w-3 text-destructive" />
                  <span className="text-[10px] text-foreground font-semibold">{scores.quente}</span>
                  <ThermometerSun className="h-3 w-3 text-warning ml-1" />
                  <span className="text-[10px] text-foreground font-semibold">{scores.morno}</span>
                  <Snowflake className="h-3 w-3 text-blue-400 ml-1" />
                  <span className="text-[10px] text-foreground font-semibold">{scores.frio}</span>
                </div>
              </div>

              {/* Forecast */}
              <div className="space-y-1 pt-1 border-t">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Forecast</p>
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pessimista</span>
                    <span className="font-semibold text-destructive">{formatCurrency(forecast.pessimista)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Provável</span>
                    <span className="font-bold text-foreground">{formatCurrency(forecast.provavel)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Otimista</span>
                    <span className="font-semibold text-success">{formatCurrency(forecast.otimista)}</span>
                  </div>
                </div>
              </div>

              {/* Pipeline total */}
              <div className="pt-1 border-t">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Pipeline</span>
                  <span className="font-bold text-foreground">{pipeline.total}</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Declinados</span>
                  <span className="font-bold text-destructive">{pipeline.declinados}</span>
                </div>
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
