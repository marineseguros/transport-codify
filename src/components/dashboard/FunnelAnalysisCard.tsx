import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Filter, ExternalLink } from 'lucide-react';
import { type Cotacao } from '@/hooks/useSupabaseData';
import { FunnelDetailModal } from './FunnelDetailModal';
import { getRamoGroup } from '@/lib/ramoClassification';
import type { DashboardFilterValues } from './DashboardFilters';

interface FunnelAnalysisCardProps {
  cotacoes: Cotacao[];
  allCotacoes: Cotacao[];
  dashboardFilters: DashboardFilterValues;
  totalDistinct?: number;
  dashboardCounts?: {
    emCotacao: number;
    fechados: number;
    declinados: number;
  };
}

const CLOSED_STATUSES = ['Negócio fechado', 'Fechamento congênere'];

const getDistinctQuoteKey = (cotacao: Cotacao) => `${cotacao.cpf_cnpj}_${getRamoGroup(cotacao.ramo)}`;

const countDistinctByStatus = (cotacoes: Cotacao[], statuses: string[]) => {
  const keys = new Set<string>();

  cotacoes.forEach((cotacao) => {
    if (statuses.includes(cotacao.status)) {
      keys.add(getDistinctQuoteKey(cotacao));
    }
  });

  return keys.size;
};

export function FunnelAnalysisCard({ cotacoes, allCotacoes, dashboardFilters, totalDistinct, dashboardCounts }: FunnelAnalysisCardProps) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  // Distinct producer counts per role (meaningful differentiation)
  const stages = useMemo(() => {
    const total = cotacoes.length;
    const roles = [
      { key: 'origem', label: 'Origem', roleKey: 'produtor_origem' as const, toneClass: 'bg-primary/45' },
      { key: 'negociador', label: 'Negociador', roleKey: 'produtor_negociador' as const, toneClass: 'bg-primary/65' },
      { key: 'cotador', label: 'Cotador', roleKey: 'produtor_cotador' as const, toneClass: 'bg-primary' },
    ];

    return roles.map((role) => {
      const names = new Set<string>();
      cotacoes.forEach((c) => { if (c[role.roleKey]?.nome) names.add(c[role.roleKey]!.nome); });
      return { ...role, value: names.size };
    });
  }, [cotacoes]);

  // Conversion & decline rates using distinct counting
  const rates = useMemo(() => {
    const total = totalDistinct ?? cotacoes.length;
    const fechados = dashboardCounts?.fechados ?? countDistinctByStatus(cotacoes, CLOSED_STATUSES);
    const declinados = dashboardCounts?.declinados ?? countDistinctByStatus(cotacoes, ['Declinado']);
    return {
      conversao: total > 0 ? ((fechados / total) * 100).toFixed(1) : '0.0',
      declinio: total > 0 ? ((declinados / total) * 100).toFixed(1) : '0.0',
      total,
    };
  }, [cotacoes, totalDistinct, dashboardCounts]);

  const maxValue = Math.max(...stages.map(s => s.value), 1);

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
                  Produtores distintos por papel comercial • Clique para análise detalhada
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
            <div className="flex flex-1 flex-col items-center gap-2 py-3">
              {stages.map((stage, i) => {
                const widthPct = 100 - i * 16;
                return (
                  <button
                    key={stage.key}
                    onClick={() => setSelectedStage(stage.key)}
                    className={`group relative flex items-center justify-center overflow-hidden ring-1 ring-white/10 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${stage.toneClass}`}
                    style={{
                      width: `${widthPct}%`,
                      height: '62px',
                      clipPath: i === stages.length - 1
                        ? 'polygon(4% 0%, 96% 0%, 88% 100%, 12% 100%)'
                        : 'polygon(0% 0%, 100% 0%, 96% 100%, 4% 100%)',
                      borderRadius: i === 0 ? '4px 4px 0 0' : undefined,
                    }}
                  >
                    <div className="absolute inset-x-0 top-0 h-px bg-white/25" />
                    <div className="flex items-center gap-3 text-white z-10">
                      <span className="text-sm font-semibold">{stage.label}</span>
                      <span className="text-xs opacity-60">—</span>
                      <span className="text-xl font-bold">{stage.value}</span>
                      <span className="text-[10px] opacity-70">produtores</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Summary sidebar */}
            <div className="w-[148px] shrink-0 space-y-3 rounded-2xl border border-border/60 bg-muted/15 p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total Pipeline</p>
              <div className="text-center">
                <span className="text-2xl font-bold text-foreground">{rates.total}</span>
                <p className="text-[10px] text-muted-foreground">cotações</p>
              </div>
              <div className="pt-2 border-t space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Conversão</span>
                  <span className="text-xs font-bold text-success">{rates.conversao}%</span>
                </div>
                <div className="flex items-center justify-between">
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
        allCotacoes={allCotacoes}
        dashboardFilters={dashboardFilters}
        totalDistinct={totalDistinct}
        dashboardCounts={dashboardCounts}
        initialStage={selectedStage || 'origem'}
      />
    </>
  );
}
