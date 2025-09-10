export type UserRole = 'Administrador' | 'Gerente' | 'Produtor' | 'Somente-Leitura';

export interface UserProfile {
  id: string;
  nome: string;
  email: string;
  papel: UserRole;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Produtor {
  id: string;
  nome: string;
  email?: string;
  user_id?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

export interface Ramo {
  id: string;
  codigo: string;
  descricao: string;
  created_at: string;
  updated_at: string;
}

export interface Seguradora {
  id: string;
  nome: string;
  cnpj?: string;
  created_at: string;
  updated_at: string;
}

export type CotacaoStatus = 'Em cotação' | 'Negócio fechado' | 'Declinado';
export type CotacaoTipo = 'Novo' | 'Endosso' | 'Renovação';

export interface CotacaoTRN {
  id: string;
  cliente_id: string;
  produtor_id: string;
  seguradora_id: string;
  ramo_id: string;
  tipo: CotacaoTipo;
  data_cotacao: string;
  inicio_vigencia: string;
  fim_vigencia: string;
  valor_premio: number;
  status: CotacaoStatus;
  data_fechamento?: string;
  num_apolice?: string;
  observacoes?: string;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  
  // Relations (populated in queries)
  cliente?: Cliente;
  produtor?: Produtor;
  seguradora?: Seguradora;
  ramo?: Ramo;
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