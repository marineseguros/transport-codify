import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, ExternalLink, ArrowRight, Users } from 'lucide-react';
import { type Cotacao } from '@/hooks/useSupabaseData';
import { FunnelDetailModal } from './FunnelDetailModal';

// Helper to get branch group
const getBranchGroup = (ramo: { descricao?: string; ramo_agrupado?: string | null } | undefined | null): string => {
  if (!ramo) return 'Outros';
  if (ramo.ramo_agrupado) return ramo.ramo_agrupado;
  const ramoUpper = (ramo.descricao || '').toUpperCase();
  if (ramoUpper.includes('RCTR-C') || ramoUpper.includes('RC-DC')) return 'RCTR-C + RC-DC';
  return ramo.descricao || 'Outros';
};

const countDistinct = (cotacoes: Cotacao[], statuses: string[]): number => {
  const keys = new Set<string>();
  let avulso = 0;
  cotacoes.forEach((c) => {
    if (statuses.includes(c.status)) {
      if (c.ramo?.segmento === 'Avulso') avulso++;
      else {
        const bg = getBranchGroup(c.ramo);
        keys.add(`${c.cpf_cnpj}_${bg}`);
      }
    }
  });
  return keys.size + avulso;
};

interface FunnelAnalysisCardProps {
  cotacoes: Cotacao[];
}

export function FunnelAnalysisCard({ cotacoes }: FunnelAnalysisCardProps) {
  const [showDetail, setShowDetail] = useState(false);

  const funnel = useMemo(() => {
    const emCotacao = countDistinct(cotacoes, ['Em cotação']);
    const fechados = countDistinct(cotacoes, ['Negócio fechado', 'Fechamento congênere']);
    const declinados = countDistinct(cotacoes, ['Declinado']);
    const total = emCotacao + fechados + declinados;
    const taxaConversao = total > 0 ? (fechados / total) * 100 : 0;
    const taxaDeclinio = total > 0 ? (declinados / total) * 100 : 0;
    return { emCotacao, fechados, declinados, total, taxaConversao, taxaDeclinio };
  }, [cotacoes]);

  // Per-role summary
  const roleSummary = useMemo(() => {
    const roles: { key: 'produtor_origem' | 'produtor_negociador' | 'produtor_cotador'; label: string }[] = [
      { key: 'produtor_origem', label: 'Origem' },
      { key: 'produtor_negociador', label: 'Negociador' },
      { key: 'produtor_cotador', label: 'Cotador' },
    ];

    return roles.map(({ key, label }) => {
      const names = new Set<string>();
      cotacoes.forEach((c) => {
        if (c[key]?.nome) names.add(c[key]!.nome);
      });
      return { label, count: names.size };
    });
  }, [cotacoes]);

  const stages = [
    { label: 'Total Pipeline', value: funnel.total, pct: 100, colorClass: 'bg-primary' },
    { label: 'Em Cotação', value: funnel.emCotacao, pct: funnel.total > 0 ? (funnel.emCotacao / funnel.total) * 100 : 0, colorClass: 'bg-warning' },
    { label: 'Fechados', value: funnel.fechados, pct: funnel.total > 0 ? (funnel.fechados / funnel.total) * 100 : 0, colorClass: 'bg-success' },
  ];

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
                  Pipeline comercial • Progressão entre etapas
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

        <CardContent className="space-y-4 pt-0">
          {/* KPI strip */}
          <div className="flex items-center justify-center gap-6 py-1">
            <div className="text-center">
              <p className="text-lg font-bold">{funnel.total}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pipeline</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{funnel.emCotacao}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Em Cotação</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-lg font-bold text-success">{funnel.fechados}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fechados</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-lg font-bold text-destructive">{funnel.declinados}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Declinados</p>
            </div>
          </div>

          {/* Funnel visualization */}
          <div className="space-y-2">
            {stages.map((stage) => (
              <div key={stage.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{stage.label}</span>
                  <span className="font-semibold">{stage.value} <span className="text-muted-foreground">({stage.pct.toFixed(0)}%)</span></span>
                </div>
                <div className="h-5 bg-muted/30 rounded overflow-hidden flex items-center relative">
                  <div
                    className={`absolute left-0 top-0 h-full ${stage.colorClass} rounded transition-all duration-500`}
                    style={{ width: `${Math.max(stage.pct, 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Conversion + Roles */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <ArrowRight className="h-3.5 w-3.5 text-success" />
                Conversão: <span className="font-semibold text-success">{funnel.taxaConversao.toFixed(1)}%</span>
              </span>
              <span className="flex items-center gap-1">
                <ArrowRight className="h-3.5 w-3.5 text-destructive" />
                Declínio: <span className="font-semibold text-destructive">{funnel.taxaDeclinio.toFixed(1)}%</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Users className="h-3 w-3" />
              {roleSummary.map((r) => (
                <span key={r.label}>{r.label}: <span className="font-semibold text-foreground">{r.count}</span></span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <FunnelDetailModal open={showDetail} onOpenChange={setShowDetail} cotacoes={cotacoes} />
    </>
  );
}
