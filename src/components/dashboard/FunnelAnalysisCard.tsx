import { useState, useMemo, useRef } from 'react';
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

export function FunnelAnalysisCard({ cotacoes, allCotacoes, dashboardFilters, totalDistinct, dashboardCounts }: FunnelAnalysisCardProps) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const stages = useMemo(() => {
    const roles = [
      { key: 'origem', label: 'Origem', roleKey: 'produtor_origem' as const },
      { key: 'negociador', label: 'Negociador', roleKey: 'produtor_negociador' as const },
      { key: 'cotador', label: 'Cotador', roleKey: 'produtor_cotador' as const },
    ];
    return roles.map((role) => {
      const names = new Set<string>();
      cotacoes.forEach((c) => { if (c[role.roleKey]?.nome) names.add(c[role.roleKey]!.nome); });
      return { ...role, value: names.size, producers: Array.from(names).sort((a, b) => a.localeCompare(b)) };
    });
  }, [cotacoes]);

  const rates = useMemo(() => {
    const total = totalDistinct ?? cotacoes.length;
    return { total };
  }, [cotacoes, totalDistinct]);

  const funnelColors = [
    { bg: 'hsl(var(--primary))', shadow: 'hsl(var(--primary) / 0.35)' },
    { bg: 'hsl(var(--primary) / 0.72)', shadow: 'hsl(var(--primary) / 0.25)' },
    { bg: 'hsl(var(--primary) / 0.48)', shadow: 'hsl(var(--primary) / 0.18)' },
  ];

  const hoveredData = hoveredStage ? stages.find(s => s.key === hoveredStage) : null;

  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

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
          <div className="flex items-center gap-6" ref={containerRef}>
            {/* Modern funnel */}
            <div className="flex flex-1 flex-col items-center gap-1.5 py-2">
              {stages.map((stage, i) => {
                const widthPct = 92 - i * 14;
                const color = funnelColors[i];
                return (
                  <button
                    key={stage.key}
                    onClick={() => setSelectedStage(stage.key)}
                    onMouseEnter={() => setHoveredStage(stage.key)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoveredStage(null)}
                    className="group relative flex items-center justify-center overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110"
                    style={{
                      width: `${widthPct}%`,
                      height: '56px',
                      background: color.bg,
                      borderRadius: i === 0 ? '16px 16px 12px 12px' : i === stages.length - 1 ? '12px 12px 16px 16px' : '12px',
                      boxShadow: `0 4px 16px -4px ${color.shadow}, inset 0 1px 0 rgba(255,255,255,0.15)`,
                    }}
                  >
                    <div
                      className="absolute inset-x-0 top-0 pointer-events-none"
                      style={{
                        height: '50%',
                        background: 'linear-gradient(to bottom, rgba(255,255,255,0.12), transparent)',
                        borderRadius: 'inherit',
                      }}
                    />
                    <div className="flex items-center gap-3 text-white z-10">
                      <span className="text-sm font-semibold tracking-wide">{stage.label}</span>
                      <span className="h-4 w-px bg-white/25" />
                      <span className="text-xl font-bold">{stage.value}</span>
                      <span className="text-[10px] opacity-70 font-medium">produtores</span>
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
            </div>
          </div>

          {/* Custom mouse-following tooltip */}
          {hoveredData && (
            <div
              className="fixed z-[9999] pointer-events-none animate-in fade-in-0 zoom-in-95 duration-150"
              style={{
                left: tooltipPos.x + 16,
                top: tooltipPos.y - 12,
              }}
            >
              <div className="rounded-xl border border-border/80 bg-popover px-4 py-3 shadow-xl backdrop-blur-sm min-w-[180px] max-w-[260px]">
                <p className="text-xs font-bold text-foreground mb-2">
                  {hoveredData.label} — {hoveredData.value} produtores
                </p>
                <div className="space-y-1">
                  {hoveredData.producers.map((name) => (
                    <p key={name} className="text-[11px] text-muted-foreground leading-relaxed">• {name}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
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
