import { 
  Produtor, Cliente, Ramo, Seguradora, CotacaoTRN, UserProfile, 
  CotacaoStatus, CotacaoTipo 
} from '@/types';

// Função para gerar IDs únicos
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

// Mock data - Ramos
export const MOCK_RAMOS: Ramo[] = [
  { id: generateId(), codigo: 'TRN', descricao: 'Transportes Nacionais', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: generateId(), codigo: 'RCTR-C', descricao: 'RC Transportador Rodoviário - Carga', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: generateId(), codigo: 'RC-DC', descricao: 'RC Desaparecimento de Carga', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: generateId(), codigo: 'RC-F', descricao: 'RC Facultativo', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: generateId(), codigo: 'TRI', descricao: 'Transportes Internacionais', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

// Mock data - Seguradoras  
export const MOCK_SEGURADORAS: Seguradora[] = [
  { id: generateId(), nome: 'Porto Seguro', cnpj: '61198164000160', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: generateId(), nome: 'Bradesco Seguros', cnpj: '92693118000191', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: generateId(), nome: 'Zurich Seguros', cnpj: '61294677000130', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: generateId(), nome: 'Liberty Seguros', cnpj: '42279363000115', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: generateId(), nome: 'Allianz Seguros', cnpj: '61099944000103', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: generateId(), nome: 'Mapfre Seguros', cnpj: '61074175000119', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: generateId(), nome: 'HDI Seguros', cnpj: '03003853000104', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: generateId(), nome: 'Tokio Marine', cnpj: '33173330000157', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

// Mock data - Produtores
export const MOCK_PRODUTORES: Produtor[] = [
  { id: generateId(), nome: 'Roberto Lima', email: 'roberto@cotacoes.com', user_id: '3', ativo: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: generateId(), nome: 'Patricia Mendes', email: 'patricia@cotacoes.com', ativo: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: generateId(), nome: 'Fernando Souza', email: 'fernando@cotacoes.com', ativo: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: generateId(), nome: 'Luciana Rocha', email: 'luciana@cotacoes.com', ativo: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: generateId(), nome: 'Carlos Pereira', email: 'carlos.p@cotacoes.com', ativo: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: generateId(), nome: 'Mariana Silva', email: 'mariana@cotacoes.com', ativo: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: generateId(), nome: 'Anderson Santos', email: 'anderson@cotacoes.com', ativo: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: generateId(), nome: 'Gabriela Costa', email: 'gabriela@cotacoes.com', ativo: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
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
  const tipoOptions: CotacaoTipo[] = ['Novo', 'Endosso', 'Renovação'];

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
      produtor_id: MOCK_PRODUTORES[Math.floor(Math.random() * MOCK_PRODUTORES.length)].id,
      seguradora_id: MOCK_SEGURADORAS[Math.floor(Math.random() * MOCK_SEGURADORAS.length)].id,
      ramo_id: MOCK_RAMOS[Math.floor(Math.random() * MOCK_RAMOS.length)].id,
      tipo: tipoOptions[Math.floor(Math.random() * tipoOptions.length)],
      data_cotacao: dataCotacao.toISOString().split('T')[0],
      inicio_vigencia: inicioVigencia.toISOString().split('T')[0],
      fim_vigencia: fimVigencia.toISOString().split('T')[0],
      valor_premio: valorPremio,
      valor_comissao: valorComissao,
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
    produtor: MOCK_PRODUTORES.find(p => p.id === cotacao.produtor_id),
    seguradora: MOCK_SEGURADORAS.find(s => s.id === cotacao.seguradora_id),
    ramo: MOCK_RAMOS.find(r => r.id === cotacao.ramo_id),
  }));
};

// Funções para persistência local
export const saveMockData = () => {
  localStorage.setItem('mock_cotacoes', JSON.stringify(MOCK_COTACOES));
  localStorage.setItem('mock_clientes', JSON.stringify(MOCK_CLIENTES));
  localStorage.setItem('mock_produtores', JSON.stringify(MOCK_PRODUTORES));
  localStorage.setItem('mock_seguradoras', JSON.stringify(MOCK_SEGURADORAS));
  localStorage.setItem('mock_ramos', JSON.stringify(MOCK_RAMOS));
};

export const loadMockData = () => {
  const cotacoes = localStorage.getItem('mock_cotacoes');
  const clientes = localStorage.getItem('mock_clientes');
  const produtores = localStorage.getItem('mock_produtores');
  const seguradoras = localStorage.getItem('mock_seguradoras');
  const ramos = localStorage.getItem('mock_ramos');

  return {
    cotacoes: cotacoes ? JSON.parse(cotacoes) : MOCK_COTACOES,
    clientes: clientes ? JSON.parse(clientes) : MOCK_CLIENTES,
    produtores: produtores ? JSON.parse(produtores) : MOCK_PRODUTORES,
    seguradoras: seguradoras ? JSON.parse(seguradoras) : MOCK_SEGURADORAS,
    ramos: ramos ? JSON.parse(ramos) : MOCK_RAMOS,
  };
};