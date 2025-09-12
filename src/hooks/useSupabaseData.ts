import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  nome: string;
  email: string;
  papel: string;
}

export interface Seguradora {
  id: string;
  nome: string;
  codigo: string;
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
}

export interface Produtor {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  papel: string;
  ativo: boolean;
}

export interface Ramo {
  id: string;
  codigo: string;
  descricao: string;
  ativo: boolean;
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
  num_apolice?: string;
  motivo_recusa?: string;
  comentarios?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  // Related data - these come from joins
  produtor_origem?: Produtor | null;
  produtor_negociador?: Produtor | null;
  produtor_cotador?: Produtor | null;
  seguradora?: Seguradora | null;
  cliente?: Cliente | null;
  ramo?: Ramo | null;
  captacao?: Captacao | null;
  status_seguradora?: StatusSeguradora | null;
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
        .eq('ativo', true)
        .order('nome');

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

  useEffect(() => {
    fetchProdutores();
  }, []);

  const fetchProdutores = async () => {
    try {
      const { data, error } = await supabase
        .from('produtores')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setProdutores(data || []);
    } catch (error) {
      console.error('Error fetching produtores:', error);
    } finally {
      setLoading(false);
    }
  };

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
        .eq('ativo', true)
        .order('descricao');

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

  useEffect(() => {
    fetchCotacoes();
  }, []);

  const fetchCotacoes = async () => {
    try {
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
          status_seguradora:status_seguradora_id(id, descricao, codigo, ativo)
        `)
        .order('created_at', { ascending: false })
        .limit(2000);

      if (error) throw error;
      setCotacoes((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching cotacoes:', error);
    } finally {
      setLoading(false);
    }
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
        status: cotacaoData.status || 'Em análise',
        data_fechamento: cotacaoData.data_fechamento,
        num_apolice: cotacaoData.num_apolice,
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
        num_apolice: updates.num_apolice,
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

  return { 
    cotacoes, 
    loading, 
    refetch: fetchCotacoes,
    createCotacao,
    updateCotacao
  };
}