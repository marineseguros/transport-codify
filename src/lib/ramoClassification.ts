/**
 * Centraliza a classificação de ramos como "Recorrente" ou "Total"
 * 
 * Recorrente = negócios dos ramos RCTR-C, RC-DC, RC-V e NACIONAL (exato)
 * Total = negócios dos demais ramos (avulsos, ambiental, garantia, Exportação, Importação, etc.)
 */

// Lista de ramos considerados recorrentes (case-insensitive, match exato)
const RECURRENT_RAMOS_EXACT = ['RCTR-C', 'RC-DC', 'RC-V', 'NACIONAL'];

/**
 * Classifica se um ramo é "Recorrente" ou "Total"
 * @param ramoDescricao - A descrição do ramo
 * @returns 'Recorrente' se for um dos ramos recorrentes, 'Total' caso contrário
 */
export const getRegraRamo = (ramoDescricao: string | undefined | null): 'Recorrente' | 'Total' => {
  if (!ramoDescricao) return 'Total';
  
  const ramoUpper = ramoDescricao.toUpperCase().trim();
  
  // Verifica se é exatamente um dos ramos recorrentes
  // RCTR-C, RC-DC, RC-V ou NACIONAL (exato, não "NACIONAL AVULSA", não "EXPORTAÇÃO", etc.)
  for (const recurrentRamo of RECURRENT_RAMOS_EXACT) {
    if (ramoUpper === recurrentRamo.toUpperCase()) {
      return 'Recorrente';
    }
  }
  
  // Qualquer outro ramo é classificado como Total
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
