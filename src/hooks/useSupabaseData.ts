import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  nome: string;
  email: string;
  papel: string;
}

export interface Unidade {
  id: string;
  codigo: string;
  descricao: string;
  ativo: boolean;
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

export interface Cliente {
  id: string;
  segurado: string;
  cpf_cnpj: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  observacoes?: string;
  captacao_id?: string;
}

export interface Produtor {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  codigo_prod?: string;
  papel: string;
  ativo: boolean;
  ordem: number;
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

export interface Captacao {
  id: string;
  descricao: string;
  ativo: boolean;
}

export interface StatusSeguradora {
  id: string;
  descricao: string;
  codigo: string;
  ativo: boolean;
}

export interface Cotacao {
  id: string;
  numero_cotacao: string;
  cliente_id?: string;
  unidade_id?: string;
  segurado: string;
  cpf_cnpj: string;
  produtor_origem_id?: string;
  produtor_negociador_id?: string;
  produtor_cotador_id?: string;
  seguradora_id?: string;
  ramo_id?: string;
  captacao_id?: string;
  status_seguradora_id?: string;
  segmento?: string;
  tipo?: string;
  valor_premio: number;
  status: string;
  data_cotacao: string;
  data_fechamento?: string;
  num_proposta?: string;
  motivo_recusa?: string;
  comentarios?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  updated_by?: string;
  // Related data - these come from joins
  produtor_origem?: Produtor | null;
  produtor_negociador?: Produtor | null;
  produtor_cotador?: Produtor | null;
  seguradora?: Seguradora | null;
  cliente?: Cliente | null;
  ramo?: Ramo | null;
  captacao?: Captacao | null;
  status_seguradora?: StatusSeguradora | null;
  unidade?: Unidade | null;
  editor?: Profile | null;
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  return { profiles, loading, refetch: fetchProfiles };
}

export function useUnidades() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnidades();
  }, []);

  const fetchUnidades = async () => {
    try {
      const { data, error } = await supabase
        .from('unidades')
        .select('*')
        .eq('ativo', true)
        .order('descricao');

      if (error) throw error;
      setUnidades(data || []);
    } catch (error) {
      console.error('Error fetching unidades:', error);
    } finally {
      setLoading(false);
    }
  };

  return { unidades, loading, refetch: fetchUnidades };
}

export function useSeguradoras() {
  const [seguradoras, setSeguradoras] = useState<Seguradora[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSeguradoras();
  }, []);

  const fetchSeguradoras = async () => {
    try {
      const { data, error } = await supabase
        .from('seguradoras')
        .select('*')
        .order('ordem');

      if (error) throw error;
      setSeguradoras(data || []);
    } catch (error) {
      console.error('Error fetching seguradoras:', error);
    } finally {
      setLoading(false);
    }
  };

  return { seguradoras, loading, refetch: fetchSeguradoras };
}

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('ativo', true)
        .order('segurado');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Error fetching clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  return { clientes, loading, refetch: fetchClientes };
}

export function useProdutores() {
  const [produtores, setProdutores] = useState<Produtor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProdutores = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('produtores')
        .select('*')
        .order('ordem');

      if (error) {
        console.error('Error fetching produtores:', error);
        throw error;
      }
      
      setProdutores(data || []);
    } catch (error) {
      console.error('Error in fetchProdutores:', error);
      setProdutores([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProdutores();
  }, []);

  return { produtores, loading, refetch: fetchProdutores };
}

export function useRamos() {
  const [ramos, setRamos] = useState<Ramo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRamos();
  }, []);

  const fetchRamos = async () => {
    try {
      const { data, error } = await supabase
        .from('ramos')
        .select('*')
        .order('ordem');

      if (error) throw error;
      setRamos(data || []);
    } catch (error) {
      console.error('Error fetching ramos:', error);
    } finally {
      setLoading(false);
    }
  };

  return { ramos, loading, refetch: fetchRamos };
}

export function useCaptacao() {
  const [captacao, setCaptacao] = useState<Captacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCaptacao();
  }, []);

  const fetchCaptacao = async () => {
    try {
      const { data, error } = await supabase
        .from('captacao')
        .select('*')
        .eq('ativo', true)
        .order('descricao');

      if (error) throw error;
      setCaptacao(data || []);
    } catch (error) {
      console.error('Error fetching captacao:', error);
    } finally {
      setLoading(false);
    }
  };

  return { captacao, loading, refetch: fetchCaptacao };
}

export function useStatusSeguradora() {
  const [statusSeguradora, setStatusSeguradora] = useState<StatusSeguradora[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatusSeguradora();
  }, []);

  const fetchStatusSeguradora = async () => {
    try {
      const { data, error } = await supabase
        .from('status_seguradora')
        .select('*')
        .eq('ativo', true)
        .order('descricao');

      if (error) throw error;
      setStatusSeguradora(data || []);
    } catch (error) {
      console.error('Error fetching status_seguradora:', error);
    } finally {
      setLoading(false);
    }
  };

  return { statusSeguradora, loading, refetch: fetchStatusSeguradora };
}

export function useCotacoes() {
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [produtorFilter, setProdutorFilter] = useState('');
  const [sortBy, setSortBy] = useState('data_cotacao');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    getTotalCount();
    fetchCotacoes();
  }, [searchTerm, statusFilter, produtorFilter, currentPage, pageSize, sortBy, sortOrder]);

  const buildBaseQuery = () => {
    return supabase
      .from('cotacoes')
      .select(`
        *,
        produtor_origem:produtor_origem_id(id, nome, email),
        produtor_negociador:produtor_negociador_id(id, nome, email),
        produtor_cotador:produtor_cotador_id(id, nome, email),
        seguradora:seguradora_id(id, nome, codigo),
        cliente:cliente_id(id, segurado, cpf_cnpj, email, telefone, cidade, uf),
        ramo:ramo_id(id, codigo, descricao, ativo),
        captacao:captacao_id(id, descricao, ativo),
         status_seguradora:status_seguradora_id(id, descricao, codigo, ativo),
         unidade:unidade_id(id, codigo, descricao, ativo)
      `);
  };

  const applyFilters = (query: any) => {
    if (statusFilter && statusFilter !== 'todos') {
      query = query.eq('status', statusFilter);
    }
    return query;
  };

  const getTotalCount = async () => {
    try {
      let query = supabase
        .from('cotacoes')
        .select('*', { count: 'exact', head: true });
      
      query = applyFilters(query);
      
      // Apply search filter separately for text fields only
      if (searchTerm) {
        query = query.or(`segurado.ilike.%${searchTerm}%,numero_cotacao.ilike.%${searchTerm}%,cpf_cnpj.ilike.%${searchTerm}%`);
      }
      
      // If filtering by produtor, we need to do a more complex query
      if (produtorFilter && produtorFilter !== 'todos') {
        // Get produtor IDs that match the name
        const { data: produtorData } = await supabase
          .from('produtores')
          .select('id')
          .eq('nome', produtorFilter);
        
        if (produtorData && produtorData.length > 0) {
          const produtorIds = produtorData.map(p => p.id);
          query = query.in('produtor_cotador_id', produtorIds);
        } else {
          // No matching produtor found, return 0 count
          setTotalCount(0);
          return;
        }
      }
      
      const { count, error } = await query;
      
      if (error) throw error;
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error getting total count:', error);
      setTotalCount(0);
    }
  };

  const fetchCotacoes = async () => {
    try {
      setLoading(true);
      let query = buildBaseQuery()
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      query = applyFilters(query);
      
      // Apply search filter for basic text fields
      if (searchTerm) {
        query = query.or(`segurado.ilike.%${searchTerm}%,numero_cotacao.ilike.%${searchTerm}%,cpf_cnpj.ilike.%${searchTerm}%`);
      }
      
      // Handle produtor filter
      if (produtorFilter && produtorFilter !== 'todos') {
        const { data: produtorData } = await supabase
          .from('produtores')
          .select('id')
          .eq('nome', produtorFilter);
        
        if (produtorData && produtorData.length > 0) {
          const produtorIds = produtorData.map(p => p.id);
          query = query.in('produtor_cotador_id', produtorIds);
        } else {
          // No matching produtor found
          setCotacoes([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      
      let cotacoesData = (data as any[]) || [];
      
      // Apply search filter for joined fields (seguradora, produtor, ramo names)
      if (searchTerm && cotacoesData.length > 0) {
        const searchLower = searchTerm.toLowerCase();
        cotacoesData = cotacoesData.filter(cotacao => {
          // Campos já buscados no banco (segurado, numero_cotacao, cpf_cnpj)
          const basicMatch = 
            cotacao.segurado?.toLowerCase().includes(searchLower) ||
            cotacao.numero_cotacao?.toLowerCase().includes(searchLower) ||
            cotacao.cpf_cnpj?.toLowerCase().includes(searchLower);
          
          // Campos relacionados (joined)
          const seguradoraMatch = cotacao.seguradora?.nome?.toLowerCase().includes(searchLower);
          const produtorMatch = cotacao.produtor_cotador?.nome?.toLowerCase().includes(searchLower);
          const ramoMatch = cotacao.ramo?.descricao?.toLowerCase().includes(searchLower);
          
          return basicMatch || seguradoraMatch || produtorMatch || ramoMatch;
        });
      }
      
      setCotacoes(cotacoesData);
    } catch (error) {
      console.error('Error fetching cotacoes:', error);
      setCotacoes([]);
    } finally {
      setLoading(false);
    }
  };

  const getFirstPage = async () => {
    setCurrentPage(1);
    await fetchCotacoes();
  };

  const getNextPage = async () => {
    const totalPages = Math.ceil(totalCount / pageSize);
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const getPrevPage = async () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const refetch = async () => {
    await getTotalCount();
    await fetchCotacoes();
  };

  const createCotacao = async (cotacaoData: any) => {
    try {
      // Generate cotacao number
      const { data: numberData, error: numberError } = await supabase
        .rpc('generate_cotacao_number');

      if (numberError) throw numberError;

      const insertData = {
        segurado: cotacaoData.segurado,
        cpf_cnpj: cotacaoData.cpf_cnpj,
        numero_cotacao: numberData,
        cliente_id: cotacaoData.cliente_id,
        unidade_id: cotacaoData.unidade_id,
        produtor_origem_id: cotacaoData.produtor_origem_id,
        produtor_negociador_id: cotacaoData.produtor_negociador_id,
        produtor_cotador_id: cotacaoData.produtor_cotador_id,
        seguradora_id: cotacaoData.seguradora_id,
        ramo_id: cotacaoData.ramo_id,
        captacao_id: cotacaoData.captacao_id,
        status_seguradora_id: cotacaoData.status_seguradora_id,
        segmento: cotacaoData.segmento,
        tipo: cotacaoData.tipo || 'Nova',
        valor_premio: cotacaoData.valor_premio || 0,
        status: cotacaoData.status || 'Em cotação',
        data_fechamento: cotacaoData.data_fechamento,
        num_proposta: cotacaoData.num_proposta,
        motivo_recusa: cotacaoData.motivo_recusa,
        comentarios: cotacaoData.comentarios,
        observacoes: cotacaoData.observacoes
      };

      const { data, error } = await supabase
        .from('cotacoes')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      
      // Refresh the list
      await fetchCotacoes();
      
      return data;
    } catch (error) {
      console.error('Error creating cotacao:', error);
      throw error;
    }
  };

  const updateCotacao = async (id: string, updates: any) => {
    try {
      const updateData = {
        segurado: updates.segurado,
        cpf_cnpj: updates.cpf_cnpj,
        produtor_origem_id: updates.produtor_origem_id,
        produtor_negociador_id: updates.produtor_negociador_id,
        produtor_cotador_id: updates.produtor_cotador_id,
        seguradora_id: updates.seguradora_id,
        ramo_id: updates.ramo_id,
        captacao_id: updates.captacao_id,
        status_seguradora_id: updates.status_seguradora_id,
        segmento: updates.segmento,
        tipo: updates.tipo,
        valor_premio: updates.valor_premio || 0,
        status: updates.status,
        data_fechamento: updates.data_fechamento,
        num_proposta: updates.num_proposta,
        motivo_recusa: updates.motivo_recusa,
        comentarios: updates.comentarios,
        observacoes: updates.observacoes
      };

      const { data, error } = await supabase
        .from('cotacoes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Refresh the list
      await fetchCotacoes();
      
      return data;
    } catch (error) {
      console.error('Error updating cotacao:', error);
      throw error;
    }
  };

  const deleteCotacao = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cotacoes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Refresh the list
      await refetch();
    } catch (error) {
      console.error('Error deleting cotacao:', error);
      throw error;
    }
  };

  const deleteCotacoes = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('cotacoes')
        .delete()
        .in('id', ids);

      if (error) throw error;
      
      // Refresh the list
      await refetch();
    } catch (error) {
      console.error('Error deleting cotacoes:', error);
      throw error;
    }
  };

  return { 
    cotacoes, 
    loading, 
    totalCount,
    currentPage,
    pageSize,
    canGoNext: currentPage < Math.ceil(totalCount / pageSize),
    canGoPrev: currentPage > 1,
    refetch,
    createCotacao,
    updateCotacao,
    deleteCotacao,
    deleteCotacoes,
    getTotalCount,
    getFirstPage,
    getNextPage,
    getPrevPage,
    setPageSize: (newSize: number) => {
      setPageSize(newSize);
      setCurrentPage(1);
    },
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    produtorFilter,
    setProdutorFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder
  };
}

// Hook específico para Dashboard - busca apenas cotações recentes
export function useCotacoesRecentes(limit: number = 10) {
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCotacoesRecentes();
  }, [limit]);

  const fetchCotacoesRecentes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cotacoes')
        .select(`
          *,
          produtor_origem:produtor_origem_id(id, nome, email),
          produtor_negociador:produtor_negociador_id(id, nome, email),
          produtor_cotador:produtor_cotador_id(id, nome, email),
          seguradora:seguradora_id(id, nome, codigo),
          cliente:cliente_id(id, segurado, cpf_cnpj, email, telefone, cidade, uf),
          ramo:ramo_id(id, codigo, descricao, ativo),
          captacao:captacao_id(id, descricao, ativo),
           status_seguradora:status_seguradora_id(id, descricao, codigo, ativo),
           unidade:unidade_id(id, codigo, descricao, ativo)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setCotacoes((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching cotacoes recentes:', error);
    } finally {
      setLoading(false);
    }
  };

  return { cotacoes, loading, refetch: fetchCotacoesRecentes };
}

// Hook para buscar todas as cotações (para estatísticas)
export function useCotacoesTotais() {
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllCotacoes();
  }, []);

  const fetchAllCotacoes = async () => {
    try {
      setLoading(true);
      
      // First get the total count
      const { count } = await supabase
        .from('cotacoes')
        .select('*', { count: 'exact', head: true });

      // Fetch all data in batches to avoid timeout
      const batchSize = 1000;
      const totalBatches = Math.ceil((count || 0) / batchSize);
      let allCotacoes: any[] = [];

      for (let i = 0; i < totalBatches; i++) {
        const { data, error } = await supabase
          .from('cotacoes')
          .select(`
            *,
            produtor_origem:produtor_origem_id(id, nome, email),
            produtor_negociador:produtor_negociador_id(id, nome, email),
            produtor_cotador:produtor_cotador_id(id, nome, email),
            seguradora:seguradora_id(id, nome, codigo),
            cliente:cliente_id(id, segurado, cpf_cnpj, email, telefone, cidade, uf),
            ramo:ramo_id(id, codigo, descricao, ativo),
            captacao:captacao_id(id, descricao, ativo),
             status_seguradora:status_seguradora_id(id, descricao, codigo, ativo),
             unidade:unidade_id(id, codigo, descricao, ativo)
          `)
          .order('created_at', { ascending: false })
          .range(i * batchSize, (i + 1) * batchSize - 1);

        if (error) throw error;
        allCotacoes = [...allCotacoes, ...(data || [])];
      }

      setCotacoes(allCotacoes);
    } catch (error) {
      console.error('Error fetching all cotacoes:', error);
    } finally {
      setLoading(false);
    }
  };

  return { cotacoes, loading, refetch: fetchAllCotacoes };
}

// Hook para buscar histórico de uma cotação específica
export function useCotacaoHistorico(cotacaoId?: string) {
  const [historico, setHistorico] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cotacaoId) {
      fetchHistorico();
    } else {
      setHistorico([]);
    }
  }, [cotacaoId]);

  const fetchHistorico = async () => {
    if (!cotacaoId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cotacoes_historico')
        .select(`
          *,
          produtor_origem:produtor_origem_id(id, nome, email),
          produtor_negociador:produtor_negociador_id(id, nome, email),
          produtor_cotador:produtor_cotador_id(id, nome, email),
          seguradora:seguradora_id(id, nome, codigo),
          ramo:ramo_id(id, codigo, descricao),
          changed_by_profile:profiles!cotacoes_historico_changed_by_fkey(id, nome, email)
        `)
        .eq('cotacao_id', cotacaoId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setHistorico(data || []);
    } catch (error) {
      console.error('Error fetching cotacao historico:', error);
      setHistorico([]);
    } finally {
      setLoading(false);
    }
  };

  return { historico, loading, refetch: fetchHistorico };
}

// Hook para buscar audit log de uma cotação (histórico campo a campo)
export function useCotacaoAuditLog(cotacaoId?: string) {
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cotacaoId) {
      fetchAuditLog();
    } else {
      setAuditLog([]);
    }
  }, [cotacaoId]);

  const fetchAuditLog = async () => {
    if (!cotacaoId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cotacoes_audit_log')
        .select(`
          *,
          changed_by_profile:profiles!cotacoes_audit_log_changed_by_fkey(id, nome, email)
        `)
        .eq('cotacao_id', cotacaoId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setAuditLog(data || []);
    } catch (error) {
      console.error('Error fetching cotacao audit log:', error);
      setAuditLog([]);
    } finally {
      setLoading(false);
    }
  };

  return { auditLog, loading, refetch: fetchAuditLog };
}

// Hook para buscar TODO o audit log (de todas as cotações)
export function useAllCotacoesAuditLog() {
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAllAuditLog();
  }, []);

  const fetchAllAuditLog = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cotacoes_audit_log')
        .select(`
          *,
          changed_by_profile:profiles!cotacoes_audit_log_changed_by_fkey(id, nome, email)
        `)
        .order('changed_at', { ascending: false })
        .limit(1000); // Limitar a 1000 registros mais recentes

      if (error) throw error;
      setAuditLog(data || []);
    } catch (error) {
      console.error('Error fetching all audit logs:', error);
      setAuditLog([]);
    } finally {
      setLoading(false);
    }
  };

  return { auditLog, loading, refetch: fetchAllAuditLog };
}