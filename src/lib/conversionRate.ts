/**
 * Regra única de Taxa de Conversão (coorte / safra de origem).
 *
 * Denominador: cotações INICIADAS no período (data_cotacao dentro do período),
 * contadas de forma distinta (CPF/CNPJ + Grupo de Ramo; "Avulso" conta individualmente).
 * Numerador: dentre essas mesmas cotações, quantas atingiram "Negócio fechado"
 * (ou "Fechamento congênere"), independentemente da data de fechamento.
 *
 * Como o numerador é sempre um subconjunto do denominador, a taxa nunca ultrapassa 100%.
 */

export const CLOSED_STATUSES = ["Negócio fechado", "Fechamento congênere"] as const;

type RamoLike = { descricao?: string; ramo_agrupado?: string | null; segmento?: string | null } | null | undefined;

export interface ConversionQuote {
  cpf_cnpj: string;
  status: string;
  data_cotacao: string;
  data_fechamento?: string | null;
  valor_premio?: number | null;
  ramo?: RamoLike;
}

export const getBranchGroupKey = (ramo: RamoLike): string => {
  if (!ramo) return "Outros";
  if (ramo.ramo_agrupado) return ramo.ramo_agrupado;
  const ramoUpper = (ramo.descricao || "").toUpperCase();
  if (ramoUpper.includes("RCTR-C") || ramoUpper.includes("RC-DC")) return "RCTR-C + RC-DC";
  return ramo.descricao || "Outros";
};

/** Contagem distinta por CPF/CNPJ + grupo de ramo; "Avulso" conta cada registro. */
export const countDistinct = <T extends ConversionQuote>(cotacoes: T[]): number => {
  const keys = new Set<string>();
  let avulso = 0;
  cotacoes.forEach((c) => {
    if (c.ramo?.segmento === "Avulso") avulso++;
    else keys.add(`${c.cpf_cnpj}_${getBranchGroupKey(c.ramo)}`);
  });
  return keys.size + avulso;
};

export const isClosed = (c: ConversionQuote): boolean =>
  (CLOSED_STATUSES as readonly string[]).includes(c.status);

export interface CohortMetrics {
  /** Total distinto de cotações iniciadas no período (população da coorte) */
  iniciadas: number;
  /** Distintas da coorte que já foram fechadas (em qualquer data) */
  fechadas: number;
  /** Distintas da coorte que continuam em cotação */
  emCotacao: number;
  /** Distintas da coorte declinadas */
  declinadas: number;
  /** Prêmio dos negócios fechados pertencentes à coorte */
  premioFechado: number;
  /** Taxa de conversão da coorte (0-100) */
  taxa: number;
  /** Registros brutos da coorte */
  registros: ConversionQuote[];
}

/**
 * Calcula as métricas de coorte para um conjunto de cotações já iniciadas no período.
 * `cohortQuotes` deve conter TODAS as cotações cuja data_cotacao caiu no período,
 * independentemente do status atual.
 */
export const computeCohortMetrics = <T extends ConversionQuote>(cohortQuotes: T[]): CohortMetrics => {
  const fechadasList = cohortQuotes.filter(isClosed);
  const iniciadas = countDistinct(cohortQuotes);
  const fechadas = countDistinct(fechadasList);
  const emCotacao = countDistinct(cohortQuotes.filter((c) => c.status === "Em cotação"));
  const declinadas = countDistinct(cohortQuotes.filter((c) => c.status === "Declinado"));
  const premioFechado = fechadasList.reduce((sum, c) => sum + (c.valor_premio || 0), 0);
  const taxa = iniciadas > 0 ? Math.min(100, (fechadas / iniciadas) * 100) : 0;
  return { iniciadas, fechadas, emCotacao, declinadas, premioFechado, taxa, registros: cohortQuotes };
};

/** Filtra as cotações iniciadas dentro do intervalo (por data_cotacao). */
export const filterCohortByPeriod = <T extends ConversionQuote>(
  cotacoes: T[],
  start: Date,
  end: Date
): T[] => {
  const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime();
  return cotacoes.filter((c) => {
    if (!c.data_cotacao) return false;
    const raw = String(c.data_cotacao).slice(0, 10);
    const [y, m, d] = raw.split("-").map(Number);
    if (!y || !m || !d) return false;
    const t = new Date(y, m - 1, d).getTime();
    return t >= startTime && t <= endTime;
  });
};

/** Taxa de conversão de coorte para um período (atalho). */
export const cohortConversionRate = <T extends ConversionQuote>(
  cotacoes: T[],
  start: Date,
  end: Date
): number => computeCohortMetrics(filterCohortByPeriod(cotacoes, start, end)).taxa;
