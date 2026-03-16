import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Filter, ExternalLink } from 'lucide-react';
import { type Cotacao } from '@/hooks/useSupabaseData';
import { FunnelDetailModal } from './FunnelDetailModal';

interface FunnelAnalysisCardProps {
  cotacoes: Cotacao[];
}

export function FunnelAnalysisCard({ cotacoes }: FunnelAnalysisCardProps) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const stages = useMemo(() => {
    const origemSet = new Set<string>();
    const negociadorSet = new Set<string>();
    const cotadorSet = new Set<string>();

    cotacoes.forEach((c) => {
      if (c.produtor_origem?.nome) origemSet.add(c.id);
      if (c.produtor_negociador?.nome) negociadorSet.add(c.id);
      if (c.produtor_cotador?.nome) cotadorSet.add(c.id);
    });

    const total = cotacoes.length;

    return [
      { key: 'origem', label: 'Origem', value: origemSet.size, pct: total > 0 ? (origemSet.size / total) * 100 : 0, color: 'hsl(210, 50%, 25%)' },
      { key: 'negociador', label: 'Negociador', value: negociadorSet.size, pct: total > 0 ? (negociadorSet.size / total) * 100 : 0, color: 'hsl(210, 55%, 45%)' },
      { key: 'cotador', label: 'Cotador', value: cotadorSet.size, pct: total > 0 ? (cotadorSet.size / total) * 100 : 0, color: 'hsl(200, 60%, 55%)' },
    ];
  }, [cotacoes]);

  // Distinct producer counts per role
  const roleCounts = useMemo(() => {
    const roles = [
      { key: 'produtor_origem' as const, label: 'Origem' },
      { key: 'produtor_negociador' as const, label: 'Negociador' },
      { key: 'produtor_cotador' as const, label: 'Cotador' },
    ];
    return roles.map(({ key, label }) => {
      const names = new Set<string>();
      cotacoes.forEach((c) => { if (c[key]?.nome) names.add(c[key]!.nome); });
      return { label, count: names.size };
    });
  }, [cotacoes]);

  // Conversion & decline rates
  const rates = useMemo(() => {
    const total = cotacoes.length;
    const fechados = cotacoes.filter(c => c.status === 'Negócio fechado' || c.status === 'Fechamento congênere').length;
    const declinados = cotacoes.filter(c => c.status === 'Declinado').length;
    return {
      conversao: total > 0 ? ((fechados / total) * 100).toFixed(1) : '0.0',
      declinio: total > 0 ? ((declinados / total) * 100).toFixed(1) : '0.0',
    };
  }, [cotacoes]);

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
                <span>Análise de Funil</span>
                <p className="text-[11px] font-normal text-muted-foreground">
                  Distribuição por papel comercial • Progressão do pipeline
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
          <div className="flex items-center gap-6">
            {/* Funnel shape */}
            <div className="flex-1 flex flex-col items-center gap-1 py-2">
              {stages.map((stage, i) => {
                const widthPct = 100 - i * 18;
                return (
                  <button
                    key={stage.key}
                    onClick={() => setSelectedStage(stage.key)}
                    className="relative flex items-center justify-center transition-all duration-500 cursor-pointer hover:opacity-90 group"
                    style={{
                      width: `${widthPct}%`,
                      height: '52px',
                      backgroundColor: stage.color,
                      clipPath: i === stages.length - 1
                        ? 'polygon(4% 0%, 96% 0%, 88% 100%, 12% 100%)'
                        : 'polygon(0% 0%, 100% 0%, 96% 100%, 4% 100%)',
                      borderRadius: i === 0 ? '4px 4px 0 0' : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2 text-white z-10">
                      <span className="text-sm font-semibold">{stage.label}</span>
                      <span className="text-xs opacity-80">—</span>
                      <span className="text-lg font-bold">{stage.value}</span>
                      <span className="text-[10px] opacity-70">({stage.pct.toFixed(0)}%)</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Role summary sidebar */}
            <div className="w-[140px] shrink-0 space-y-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Papéis Comerciais</p>
              {roleCounts.map((r) => (
                <div key={r.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{r.label}</span>
                  <span className="text-sm font-bold text-foreground">{r.count}</span>
                </div>
              ))}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Conversão</span>
                  <span className="text-xs font-bold text-success">{rates.conversao}%</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">Declínio</span>
                  <span className="text-xs font-bold text-destructive">{rates.declinio}%</span>
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
