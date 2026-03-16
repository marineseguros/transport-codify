import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Filter, ExternalLink, ChevronRight } from 'lucide-react';
import { type Cotacao } from '@/hooks/useSupabaseData';
import { FunnelDetailModal } from './FunnelDetailModal';

export interface FunnelStage {
  key: string;
  label: string;
  value: number;
  pct: number;
  conversionToNext: number | null;
  color: string;
}

interface FunnelAnalysisCardProps {
  cotacoes: Cotacao[];
}

export function FunnelAnalysisCard({ cotacoes }: FunnelAnalysisCardProps) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const stages = useMemo((): FunnelStage[] => {
    // Count unique opportunities per role
    const origemSet = new Set<string>();
    const cotadorSet = new Set<string>();
    const negociadorSet = new Set<string>();
    const fechadoSet = new Set<string>();
    const declinadoSet = new Set<string>();

    cotacoes.forEach((c) => {
      const key = c.id;
      if (c.produtor_origem?.nome) origemSet.add(key);
      if (c.produtor_cotador?.nome) cotadorSet.add(key);
      if (c.produtor_negociador?.nome) negociadorSet.add(key);
      if (c.status === 'Negócio fechado' || c.status === 'Fechamento congênere') fechadoSet.add(key);
      if (c.status === 'Declinado') declinadoSet.add(key);
    });

    const origem = origemSet.size;
    const cotador = cotadorSet.size;
    const negociador = negociadorSet.size;
    const fechado = fechadoSet.size;
    const declinado = declinadoSet.size;
    const total = origem || cotacoes.length;

    const raw = [
      { key: 'origem', label: 'Origem', value: origem, color: 'hsl(var(--primary))' },
      { key: 'cotador', label: 'Cotador', value: cotador, color: 'hsl(210, 55%, 50%)' },
      { key: 'negociador', label: 'Negociador', value: negociador, color: 'hsl(200, 60%, 55%)' },
      { key: 'fechado', label: 'Fechado', value: fechado, color: 'hsl(156, 72%, 40%)' },
      { key: 'declinado', label: 'Declinado', value: declinado, color: 'hsl(0, 84%, 55%)' },
    ];

    return raw.map((s, i) => ({
      ...s,
      pct: total > 0 ? (s.value / total) * 100 : 0,
      conversionToNext: i < raw.length - 1 && s.value > 0
        ? (raw[i + 1].value / s.value) * 100
        : null,
    }));
  }, [cotacoes]);

  const overallConversion = useMemo(() => {
    const origem = stages.find(s => s.key === 'origem')?.value || 0;
    const fechado = stages.find(s => s.key === 'fechado')?.value || 0;
    return origem > 0 ? ((fechado / origem) * 100).toFixed(1) : '0.0';
  }, [stages]);

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted/30">
                <Filter className="h-4.5 w-4.5 text-foreground" />
              </div>
              <div>
                <span>Funil Comercial</span>
                <p className="text-[11px] font-normal text-muted-foreground">
                  Desempenho por papel comercial • Conversão: {overallConversion}%
                </p>
              </div>
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex flex-col items-center gap-1 py-2">
            {stages.map((stage, i) => {
              const widthPct = Math.max(30, 100 - i * 16);
              return (
                <button
                  key={stage.key}
                  onClick={() => setSelectedStage(stage.key)}
                  className="relative flex items-center justify-center transition-all duration-300 hover:opacity-90 hover:scale-[1.01] cursor-pointer group w-full"
                  style={{ maxWidth: `${widthPct}%` }}
                >
                  <div
                    className="w-full flex items-center justify-between px-4 py-3"
                    style={{
                      backgroundColor: stage.color,
                      clipPath: i === stages.length - 1
                        ? 'polygon(5% 0%, 95% 0%, 85% 100%, 15% 100%)'
                        : 'polygon(0% 0%, 100% 0%, 95% 100%, 5% 100%)',
                      borderRadius: i === 0 ? '6px 6px 0 0' : undefined,
                      minHeight: '46px',
                    }}
                  >
                    <div className="flex items-center gap-2 text-white z-10 ml-4">
                      <span className="text-sm font-semibold">{stage.label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white z-10 mr-4">
                      <span className="text-lg font-bold">{stage.value}</span>
                      <span className="text-[10px] opacity-70">({stage.pct.toFixed(0)}%)</span>
                      <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  {/* Conversion arrow between stages */}
                  {stage.conversionToNext !== null && (
                    <div className="absolute -bottom-1 right-4 z-20">
                      <span className="text-[9px] font-semibold text-muted-foreground bg-background/90 px-1.5 py-0.5 rounded-full border">
                        ↓ {stage.conversionToNext.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
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
