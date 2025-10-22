import { 
  Produtor, Cliente, Ramo, Seguradora, CotacaoTRN, UserProfile, 
  CotacaoStatus, CotacaoTipo, Captacao, StatusSeguradora 
} from '@/types';

// Função para gerar IDs únicos
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

// Mock data - Ramos
export const MOCK_RAMOS: Ramo[] = [
  { id: '7', codigo: 'NACIONAL', descricao: 'NACIONAL', ramo_agrupado: 'TRANSPORTE', ativo: true, ordem: 1, created_at: new Date().toISOString() },
  { id: '8', codigo: 'EXPORTAÇÃO', descricao: 'EXPORTAÇÃO', ramo_agrupado: 'TRANSPORTE', ativo: true, ordem: 2, created_at: new Date().toISOString() },
  { id: '9', codigo: 'IMPORTAÇÃO', descricao: 'IMPORTAÇÃO', ramo_agrupado: 'TRANSPORTE', ativo: true, ordem: 3, created_at: new Date().toISOString() },
  { id: '10', codigo: 'RCTR-C', descricao: 'RCTR-C', ramo_agrupado: 'RESPONSABILIDADE CIVIL', ativo: true, ordem: 4, created_at: new Date().toISOString() },
  { id: '11', codigo: 'RC-DC', descricao: 'RC-DC', ramo_agrupado: 'RESPONSABILIDADE CIVIL', ativo: true, ordem: 5, created_at: new Date().toISOString() },
  { id: '12', codigo: 'RCTR-VI', descricao: 'RCTR-VI', ramo_agrupado: 'RESPONSABILIDADE CIVIL', ativo: true, ordem: 6, created_at: new Date().toISOString() },
  { id: '14', codigo: 'GARANTIA', descricao: 'GARANTIA', ramo_agrupado: 'GARANTIA', ativo: true, ordem: 7, created_at: new Date().toISOString() },
  { id: '22', codigo: 'NACIONAL AVULSA', descricao: 'NACIONAL AVULSA', ramo_agrupado: 'TRANSPORTE', ativo: true, ordem: 8, created_at: new Date().toISOString() },
  { id: '23', codigo: 'IMPORTAÇÃO AVULSA', descricao: 'IMPORTAÇÃO AVULSA', ramo_agrupado: 'TRANSPORTE', ativo: true, ordem: 9, created_at: new Date().toISOString() },
  { id: '27', codigo: 'RCTA-C', descricao: 'RCTA-C', ramo_agrupado: 'RESPONSABILIDADE CIVIL', ativo: true, ordem: 10, created_at: new Date().toISOString() },
  { id: '29', codigo: 'EXPORTAÇÃO AVULSA', descricao: 'EXPORTAÇÃO AVULSA', ramo_agrupado: 'TRANSPORTE', ativo: true, ordem: 11, created_at: new Date().toISOString() },
  { id: '34', codigo: 'AMBIENTAL', descricao: 'AMBIENTAL', ramo_agrupado: 'RESPONSABILIDADE CIVIL', ativo: true, ordem: 12, created_at: new Date().toISOString() },
  { id: '254', codigo: 'RC-V', descricao: 'RC-V', ramo_agrupado: 'RESPONSABILIDADE CIVIL', ativo: true, ordem: 13, created_at: new Date().toISOString() }
];

// Mock data - Captação
export const MOCK_CAPTACAO: Captacao[] = [
  { id: '1', codigo: '1', descricao: 'PROSPECÇÃO' },
  { id: '2', codigo: '2', descricao: 'LEAD' },
  { id: '3', codigo: '3', descricao: 'PARCERIA/ CO CORRETAGEM' },
  { id: '4', codigo: '4', descricao: 'INDICAÇÃO INTERNA' },
  { id: '5', codigo: '5', descricao: 'INDICAÇÃO EXTERNA' },
  { id: '6', codigo: '6', descricao: 'INDICAÇÃO CLIENTE' },
  { id: '7', codigo: '7', descricao: 'CLIENTE' },
  { id: '8', codigo: '8', descricao: 'FILIAL SP' },
  { id: '9', codigo: '9', descricao: 'FEIRAS E EVENTOS' }
];

// Mock data - Status Seguradora
export const MOCK_STATUS_SEGURADORA: StatusSeguradora[] = [
  { id: '1', codigo: '1', descricao: 'ACEITOU' },
  { id: '2', codigo: '2', descricao: 'ACEITOU COM RESSALVAS' },
  { id: '3', codigo: '3', descricao: 'EM ANÁLISE' },
  { id: '4', codigo: '4', descricao: 'SEM RETORNO' },
  { id: '5', codigo: '5', descricao: 'RECUSA' }
];

// Mock data - Seguradoras  
export const MOCK_SEGURADORAS: Seguradora[] = [
  { id: '23', nome: 'TOKIO MARINE', codigo: 'TOKI', ativo: true, ordem: 1, created_at: new Date().toISOString() },
  { id: '45', nome: 'SOMPO', codigo: 'SOMP', ativo: true, ordem: 2, created_at: new Date().toISOString() },
  { id: '51', nome: 'FAIRFAX', codigo: 'FAIR', ativo: true, ordem: 3, created_at: new Date().toISOString() },
  { id: '5', nome: 'HDI', codigo: 'HDI', ativo: true, ordem: 4, created_at: new Date().toISOString() },
  { id: '12', nome: 'YELUM', codigo: 'YELU', ativo: true, ordem: 5, created_at: new Date().toISOString() },
  { id: '35', nome: 'AKAD', codigo: 'AKAD', ativo: true, ordem: 6, created_at: new Date().toISOString() },
  { id: '24', nome: 'BERKLEY', codigo: 'BERK', ativo: true, ordem: 7, created_at: new Date().toISOString() },
  { id: '3', nome: 'CHUBB', codigo: 'CHUB', ativo: true, ordem: 8, created_at: new Date().toISOString() },
  { id: '8', nome: 'MAPFRE', codigo: 'MAPF', ativo: true, ordem: 9, created_at: new Date().toISOString() },
  { id: '44', nome: 'AIG', codigo: 'AIG', ativo: true, ordem: 10, created_at: new Date().toISOString() },
  { id: '26', nome: 'EZZE', codigo: 'EZZE', ativo: true, ordem: 11, created_at: new Date().toISOString() },
  { id: '2', nome: 'BRADESCO SEGUROS', codigo: 'BRAD', ativo: true, ordem: 12, created_at: new Date().toISOString() },
  { id: '46', nome: 'AXA', codigo: 'AXA', ativo: true, ordem: 13, created_at: new Date().toISOString() }
];

// Mock data - Produtores
export const MOCK_PRODUTORES: Produtor[] = [
  { id: '1', nome: 'Luiz Fernando', email: 'luiz@marine.com', telefone: '(11) 99999-9999', codigo_prod: 'PROD001', papel: 'Produtor', ativo: true, ordem: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '38', nome: 'Thayla', email: 'thayla@marine.com', telefone: '(21) 88888-8888', codigo_prod: 'PROD038', papel: 'Produtor', ativo: true, ordem: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '42', nome: 'Leonardo', email: 'leonardo@marine.com', telefone: '(31) 77777-7777', codigo_prod: 'PROD042', papel: 'Produtor', ativo: true, ordem: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '44', nome: 'Marcelo Tadeu', email: 'marcelo@marine.com', telefone: '(41) 66666-6666', codigo_prod: 'PROD044', papel: 'Produtor', ativo: true, ordem: 4, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '45', nome: 'Helloisy', email: 'helloisy@marine.com', telefone: '(51) 55555-5555', codigo_prod: 'PROD045', papel: 'Produtor', ativo: true, ordem: 5, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '46', nome: 'Simone', email: 'simone@marine.com', telefone: '(61) 44444-4444', codigo_prod: 'PROD046', papel: 'Produtor', ativo: true, ordem: 6, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

// Mock data - Clientes
const empresas = [
  'Transportes Rápido Ltda', 'Logística Brasil S.A.', 'Cargo Express', 'TransNacional',
  'Rodoviária São Paulo', 'Mercadorias & Cia', 'Frete Seguro Transportes', 'Via Expressa Logística',
  'Rodovia Sul Transportes', 'Carga Pesada Ltda', 'Entrega Rápida S.A.', 'Transporte Total',
  'Logística Moderna', 'Cargo Direto', 'Frete Nacional', 'Transporte Seguro Ltda'
];

export const MOCK_CLIENTES: Cliente[] = empresas.map(empresa => ({
  id: generateId(),
  segurado: empresa,
  cpf_cnpj: `${Math.floor(Math.random() * 90000000) + 10000000}000100`,
  email: `contato@${empresa.toLowerCase().replace(/\s+/g, '').replace(/[^\w]/g, '')}.com.br`,
  telefone: `(11) 9${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
  cidade: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre'][Math.floor(Math.random() * 5)],
  uf: ['SP', 'RJ', 'MG', 'PR', 'RS'][Math.floor(Math.random() * 5)],
  created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString(),
}));

// Gerar cotações mock para os últimos 12 meses
const generateMockCotacoes = (): CotacaoTRN[] => {
  const cotacoes: CotacaoTRN[] = [];
  const hoje = new Date();
  const statusOptions: CotacaoStatus[] = ['Em cotação', 'Negócio fechado', 'Declinado'];
  const tipoOptions: CotacaoTipo[] = ['Novo', 'Migração', 'Renovação'];

  for (let i = 0; i < 300; i++) {
    const dataCotacao = new Date(hoje.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000);
    const inicioVigencia = new Date(dataCotacao.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);
    const fimVigencia = new Date(inicioVigencia.getTime() + 365 * 24 * 60 * 60 * 1000);
    
    const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
    const valorPremio = Math.floor(Math.random() * 50000) + 1000;
    const valorComissao = Math.floor(valorPremio * (0.10 + Math.random() * 0.15)); // 10-25% comissão

    const cotacao: CotacaoTRN = {
      id: generateId(),
      cliente_id: MOCK_CLIENTES[Math.floor(Math.random() * MOCK_CLIENTES.length)].id,
      unidade: Math.random() > 0.5 ? 'Matriz' : 'Filial',
      produtor_origem_id: MOCK_PRODUTORES[Math.floor(Math.random() * MOCK_PRODUTORES.length)].id,
      produtor_negociador_id: MOCK_PRODUTORES[Math.floor(Math.random() * MOCK_PRODUTORES.length)].id,
      produtor_cotador_id: MOCK_PRODUTORES[Math.floor(Math.random() * MOCK_PRODUTORES.length)].id,
      cnpj: `${Math.floor(Math.random() * 90000000) + 10000000}000100`,
      segurado: `Empresa ${Math.floor(Math.random() * 1000)} Ltda`,
      seguradora_id: MOCK_SEGURADORAS[Math.floor(Math.random() * MOCK_SEGURADORAS.length)].id,
      ramo_id: MOCK_RAMOS[Math.floor(Math.random() * MOCK_RAMOS.length)].id,
      captacao_id: MOCK_CAPTACAO[Math.floor(Math.random() * MOCK_CAPTACAO.length)].id,
      status_seguradora_id: MOCK_STATUS_SEGURADORA[Math.floor(Math.random() * MOCK_STATUS_SEGURADORA.length)].id,
      tipo: tipoOptions[Math.floor(Math.random() * tipoOptions.length)],
      data_cotacao: dataCotacao.toISOString().split('T')[0],
      inicio_vigencia: inicioVigencia.toISOString().split('T')[0],
      fim_vigencia: fimVigencia.toISOString().split('T')[0],
      valor_premio: valorPremio,
      status,
      created_by: '1', // Admin
      created_at: dataCotacao.toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Se status é "Negócio fechado", adicionar data de fechamento e número da apólice
    if (status === 'Negócio fechado') {
      cotacao.data_fechamento = new Date(dataCotacao.getTime() + Math.random() * 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      cotacao.num_apolice = `TRN${Math.floor(Math.random() * 900000) + 100000}`;
    }

    cotacoes.push(cotacao);
  }

  return cotacoes;
};

export const MOCK_COTACOES = generateMockCotacoes();

// Função para obter dados com relações populadas
export const getCotacoesWithRelations = (): CotacaoTRN[] => {
  return MOCK_COTACOES.map(cotacao => ({
    ...cotacao,
    cliente: MOCK_CLIENTES.find(c => c.id === cotacao.cliente_id),
    produtor_origem: MOCK_PRODUTORES.find(p => p.id === cotacao.produtor_origem_id),
    produtor_negociador: MOCK_PRODUTORES.find(p => p.id === cotacao.produtor_negociador_id),
    produtor_cotador: MOCK_PRODUTORES.find(p => p.id === cotacao.produtor_cotador_id),
    seguradora: MOCK_SEGURADORAS.find(s => s.id === cotacao.seguradora_id),
    ramo: MOCK_RAMOS.find(r => r.id === cotacao.ramo_id),
    captacao: MOCK_CAPTACAO.find(c => c.id === cotacao.captacao_id),
    status_seguradora: MOCK_STATUS_SEGURADORA.find(s => s.id === cotacao.status_seguradora_id),
  }));
};

// Funções para persistência local
export const saveMockData = () => {
  localStorage.setItem('mock_cotacoes', JSON.stringify(MOCK_COTACOES));
  localStorage.setItem('mock_clientes', JSON.stringify(MOCK_CLIENTES));
  localStorage.setItem('mock_produtores', JSON.stringify(MOCK_PRODUTORES));
  localStorage.setItem('mock_seguradoras', JSON.stringify(MOCK_SEGURADORAS));
  localStorage.setItem('mock_ramos', JSON.stringify(MOCK_RAMOS));
  localStorage.setItem('mock_captacao', JSON.stringify(MOCK_CAPTACAO));
  localStorage.setItem('mock_status_seguradora', JSON.stringify(MOCK_STATUS_SEGURADORA));
};

export const loadMockData = () => {
  const cotacoes = localStorage.getItem('mock_cotacoes');
  const clientes = localStorage.getItem('mock_clientes');
  const produtores = localStorage.getItem('mock_produtores');
  const seguradoras = localStorage.getItem('mock_seguradoras');
  const ramos = localStorage.getItem('mock_ramos');
  const captacao = localStorage.getItem('mock_captacao');
  const statusSeguradora = localStorage.getItem('mock_status_seguradora');

  return {
    cotacoes: cotacoes ? JSON.parse(cotacoes) : MOCK_COTACOES,
    clientes: clientes ? JSON.parse(clientes) : MOCK_CLIENTES,
    produtores: produtores ? JSON.parse(produtores) : MOCK_PRODUTORES,
    seguradoras: seguradoras ? JSON.parse(seguradoras) : MOCK_SEGURADORAS,
    ramos: ramos ? JSON.parse(ramos) : MOCK_RAMOS,
    captacao: captacao ? JSON.parse(captacao) : MOCK_CAPTACAO,
    statusSeguradora: statusSeguradora ? JSON.parse(statusSeguradora) : MOCK_STATUS_SEGURADORA,
  };
};