/**
 * Centraliza a classificação de ramos como "Recorrente" ou "Total"
 * 
 * REGRA PRINCIPAL: Usar o campo "regra" armazenado no banco de dados.
 * Fallback: Para compatibilidade com dados antigos, usa descrição.
 * 
 * Conforme tabela de ramos (fallback):
 * Recorrente = RCTR-C, RC-DC, RC-V, Nacional (apenas esses 4)
 * Total = Ambiental, Importação, Exportação, Nacional Avulsa, Exportação Avulsa, 
 *         Importação Avulsa, Garantia Aduaneira, RCTA-C, RCTR-VI
 */

// Interface para ramo com campo regra do banco
interface RamoWithRegra {
  regra?: string | null;
  descricao?: string;
}

// Lista de ramos considerados recorrentes (case-insensitive, match exato) - FALLBACK
const RECURRENT_RAMOS_EXACT = ['RCTR-C', 'RC-DC', 'RC-V', 'NACIONAL'];

/**
 * Classifica se um ramo é "Recorrente" ou "Total"
 * 
 * PRIORIDADE:
 * 1. Se receber objeto com campo "regra", usa diretamente do banco
 * 2. Se receber string ou objeto sem "regra", usa fallback por descrição
 * 
 * @param ramo - Objeto ramo com campo regra, ou string com descrição
 * @returns 'Recorrente' ou 'Total'
 */
export const getRegraRamo = (
  ramo: RamoWithRegra | string | undefined | null
): 'Recorrente' | 'Total' => {
  // Se for nulo/undefined, retorna Total
  if (!ramo) return 'Total';
  
  // PRIORIDADE 1: Se for objeto com campo "regra" do banco, usar diretamente
  if (typeof ramo === 'object' && ramo.regra) {
    return ramo.regra === 'Recorrente' ? 'Recorrente' : 'Total';
  }
  
  // PRIORIDADE 2: Fallback - usar descrição (string ou objeto.descricao)
  const descricao = typeof ramo === 'string' ? ramo : ramo?.descricao;
  
  if (!descricao) return 'Total';
  
  const ramoUpper = descricao.toUpperCase().trim();
  
  // Verifica se é exatamente um dos ramos recorrentes
  // RCTR-C, RC-DC, RC-V ou Nacional (exato)
  // Importante: "Nacional" é recorrente, mas "Nacional Avulsa" é Total
  for (const recurrentRamo of RECURRENT_RAMOS_EXACT) {
    if (ramoUpper === recurrentRamo.toUpperCase()) {
      return 'Recorrente';
    }
  }
  
  // Para grupos combinados como "RCTR-C + RC-DC"
  if (ramoUpper === 'RCTR-C + RC-DC') {
    return 'Recorrente';
  }
  
  // Grupos que contêm ramos recorrentes
  if (ramoUpper.includes('GRUPO_RCTR')) {
    return 'Recorrente';
  }
  
  // Qualquer outro ramo é classificado como Total
  // Inclui: Ambiental, Importação, Exportação, Nacional Avulsa, Exportação Avulsa,
  //         Importação Avulsa, Garantia Aduaneira, RCTA-C, RCTR-VI
  return 'Total';
};

/**
 * Determina o grupo do ramo para agrupamento de cotações distintas
 * RCTR-C e RC-DC são combinados no mesmo grupo
 */
export const getRamoGroup = (ramoDescricao: string | undefined | null): string => {
  if (!ramoDescricao) return 'Não informado';
  const ramoUpper = ramoDescricao.toUpperCase().trim();
  
  // Grupo 1: RCTR-C e RC-DC são combinados
  if (ramoUpper === 'RCTR-C' || ramoUpper === 'RC-DC') {
    return 'RCTR-C + RC-DC';
  }
  
  return ramoDescricao;
};

/**
 * Lista de ramos recorrentes para referência
 */
export const RECURRENT_RAMOS = RECURRENT_RAMOS_EXACT;
