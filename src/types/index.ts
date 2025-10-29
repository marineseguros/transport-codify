export type UserRole = 'Administrador' | 'Gerente' | 'CEO' | 'Operacional' | 'Produtor' | 'Faturamento';
export type ModuloTipo = 'Transportes' | 'Ramos Elementares';

export interface UserProfile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  papel: UserRole;
  modulo: ModuloTipo;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Produtor {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  codigo_prod?: string;
  papel: string;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

// Cliente com estatísticas adicionais
export interface ClienteWithStats extends Cliente {
  totalCotacoes: number;
  cotacoesFechadas: number;
  premioTotal: number;
  ultimaCotacao: number;
}

export interface Cliente {
  id: string;
  segurado: string;
  cpf_cnpj: string;
  email?: string;
  telefone?: string;
  inscricao_estadual?: string;
  cidade?: string;
  uf?: string;
  observacoes?: string;
  captacao_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Ramo {
  id: string;
  codigo: string;
  descricao: string;
  ramo_agrupado?: string;
  ativo: boolean;
  ordem: number;
  created_at: string;
}

export interface Seguradora {
  id: string;
  nome: string;
  codigo: string;
  ativo: boolean;
  ordem: number;
  created_at: string;
}

export interface Captacao {
  id: string;
  codigo: string;
  descricao: string;
}

export interface StatusSeguradora {
  id: string;
  codigo: string;
  descricao: string;
}

export type CotacaoStatus = 'Em cotação' | 'Negócio fechado' | 'Declinado' | 'Alocada Outra';
export type CotacaoTipo = 'Novo' | 'Migração' | 'Renovação';

export interface CotacaoTRN {
  id: string;
  cliente_id: string;
  unidade: 'Matriz' | 'Filial';
  produtor_origem_id: string;
  produtor_negociador_id: string;
  produtor_cotador_id: string;
  cnpj: string;
  segurado: string;
  seguradora_id: string;
  ramo_id: string;
  captacao_id: string;
  status_seguradora_id: string;
  motivo_recusa?: string;
  tipo: CotacaoTipo;
  data_cotacao: string;
  data_fechamento?: string;
  inicio_vigencia: string;
  fim_vigencia: string;
  valor_premio: number;
  status: CotacaoStatus;
  num_apolice?: string;
  observacoes?: string;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  
  // Relations (populated in queries)
  cliente?: Cliente;
  produtor_origem?: Produtor;
  produtor_negociador?: Produtor;
  produtor_cotador?: Produtor;
  seguradora?: Seguradora;
  ramo?: Ramo;
  captacao?: Captacao;
  status_seguradora?: StatusSeguradora;
  created_user?: UserProfile;
}

export interface Anexo {
  id: string;
  cotacao_id: string;
  arquivo_url: string;
  nome_arquivo: string;
  tipo?: string;
  created_at: string;
  updated_at: string;
}

export interface Comentario {
  id: string;
  cotacao_id: string;
  autor_id: string;
  mensagem: string;
  created_at: string;
  updated_at: string;
  autor?: UserProfile;
}

export interface Tarefa {
  id: string;
  titulo: string;
  descricao?: string;
  responsavel_id?: string;
  prioridade: 'Baixa' | 'Média' | 'Alta';
  status: 'Aberta' | 'Em andamento' | 'Concluída';
  data_limite?: string;
  relacionada_a: 'Cotacao' | 'Geral';
  cotacao_id?: string;
  created_at: string;
  updated_at: string;
  responsavel?: UserProfile;
}

export interface AuditLog {
  id: string;
  entidade: string;
  entidade_id: string;
  acao: string;
  antes?: Record<string, any>;
  depois?: Record<string, any>;
  autor_id?: string;
  created_at: string;
  autor?: UserProfile;
}

export interface KPI {
  totalCotacoes: number;
  emAndamento: number;
  negocioFechado: number;
  declinado: number;
  ticketMedio: number;
  tempoMedioFechamento: number;
}

export interface AppConfig {
  modo_mock: boolean;
  tema: 'light' | 'dark';
  sla_dias_alerta: number;
}