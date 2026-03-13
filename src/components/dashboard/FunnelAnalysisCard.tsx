import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Filter, ExternalLink } from 'lucide-react';
import { type Cotacao } from '@/hooks/useSupabaseData';
import { FunnelDetailModal } from './FunnelDetailModal';

const getBranchGroup = (ramo: { descricao?: string; ramo_agrupado?: string | null } | undefined | null): string => {
  if (!ramo) return 'Outros';
  if (ramo.ramo_agrupado) return ramo.ramo_agrupado;
  const ramoUpper = (ramo.descricao || '').toUpperCase();
  if (ramoUpper.includes('RCTR-C') || ramoUpper.includes('RC-DC')) return 'RCTR-C + RC-DC';
  return ramo.descricao || 'Outros';
};

const countDistinct = (cotacoes: Cotacao[], statuses: string[]): number => {
  const keys = new Set<string>();
  cotacoes.forEach((c) => {
    if (statuses.includes(c.status)) {
      const bg = getBranchGroup(c.ramo);
      keys.add(`${c.cpf_cnpj}_${bg}`);
    }
  });
  return keys.size;
};

interface FunnelAnalysisCardProps {
  cotacoes: Cotacao[];
}

interface FunnelStage {
  label: string;
  value: number;
  pct: number;
  color: string;
}

export function FunnelAnalysisCard({ cotacoes }: FunnelAnalysisCardProps) {
  const [showDetail, setShowDetail] = useState(false);

  const stages = useMemo((): FunnelStage[] => {
    const total = countDistinct(cotacoes, ['Em cotação', 'Negócio fechado', 'Fechamento congênere', 'Declinado']);
    const emCotacao = countDistinct(cotacoes, ['Em cotação']);
    const fechados = countDistinct(cotacoes, ['Negócio fechado', 'Fechamento congênere']);
    const declinados = countDistinct(cotacoes, ['Declinado']);

    return [
      { label: 'Total no Pipeline', value: total, pct: 100, color: 'hsl(210, 50%, 25%)' },
      { label: 'Em Cotação', value: emCotacao, pct: total > 0 ? (emCotacao / total) * 100 : 0, color: 'hsl(210, 55%, 45%)' },
      { label: 'Fechados', value: fechados, pct: total > 0 ? (fechados / total) * 100 : 0, color: 'hsl(200, 60%, 55%)' },
      { label: 'Declinados', value: declinados, pct: total > 0 ? (declinados / total) * 100 : 0, color: 'hsl(195, 70%, 60%)' },
    ];
  }, [cotacoes]);

  // Role counts for footer
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
              onClick={() => setShowDetail(true)}
            >
              Ver análise completa
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Funnel visual */}
          <div className="flex items-center gap-6">
            {/* Funnel shape */}
            <div className="flex-1 flex flex-col items-center gap-1 py-2">
              {stages.map((stage, i) => {
                // Each stage gets progressively narrower to form a funnel
                const widthPct = 100 - i * 18; // 100%, 82%, 64%, 46%
                return (
                  <div
                    key={stage.label}
                    className="relative flex items-center justify-center transition-all duration-500"
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
                  </div>
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
                  <span className="text-xs font-bold text-success">
                    {stages[0].value > 0 ? ((stages[2].value / stages[0].value) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">Declínio</span>
                  <span className="text-xs font-bold text-destructive">
                    {stages[0].value > 0 ? ((stages[3].value / stages[0].value) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <FunnelDetailModal open={showDetail} onOpenChange={setShowDetail} cotacoes={cotacoes} />
    </>
  );
}
