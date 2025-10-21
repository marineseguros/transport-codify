export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      captacao: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string
          id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao: string
          id?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          id?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          ativo: boolean
          cep: string | null
          cidade: string | null
          cpf_cnpj: string
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          segurado: string
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cpf_cnpj: string
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          segurado: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cpf_cnpj?: string
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          segurado?: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cotacoes: {
        Row: {
          captacao_id: string | null
          cliente_id: string | null
          comentarios: string | null
          cpf_cnpj: string
          created_at: string
          data_cotacao: string
          data_fechamento: string | null
          id: string
          motivo_recusa: string | null
          num_proposta: string | null
          numero_cotacao: string
          observacoes: string | null
          produtor_cotador_id: string | null
          produtor_negociador_id: string | null
          produtor_origem_id: string | null
          ramo_id: string | null
          segmento: string | null
          segurado: string
          seguradora_id: string | null
          status: string
          status_seguradora_id: string | null
          tipo: string | null
          unidade_id: string | null
          updated_at: string
          updated_by: string | null
          valor_premio: number | null
        }
        Insert: {
          captacao_id?: string | null
          cliente_id?: string | null
          comentarios?: string | null
          cpf_cnpj: string
          created_at?: string
          data_cotacao?: string
          data_fechamento?: string | null
          id?: string
          motivo_recusa?: string | null
          num_proposta?: string | null
          numero_cotacao: string
          observacoes?: string | null
          produtor_cotador_id?: string | null
          produtor_negociador_id?: string | null
          produtor_origem_id?: string | null
          ramo_id?: string | null
          segmento?: string | null
          segurado: string
          seguradora_id?: string | null
          status?: string
          status_seguradora_id?: string | null
          tipo?: string | null
          unidade_id?: string | null
          updated_at?: string
          updated_by?: string | null
          valor_premio?: number | null
        }
        Update: {
          captacao_id?: string | null
          cliente_id?: string | null
          comentarios?: string | null
          cpf_cnpj?: string
          created_at?: string
          data_cotacao?: string
          data_fechamento?: string | null
          id?: string
          motivo_recusa?: string | null
          num_proposta?: string | null
          numero_cotacao?: string
          observacoes?: string | null
          produtor_cotador_id?: string | null
          produtor_negociador_id?: string | null
          produtor_origem_id?: string | null
          ramo_id?: string | null
          segmento?: string | null
          segurado?: string
          seguradora_id?: string | null
          status?: string
          status_seguradora_id?: string | null
          tipo?: string | null
          unidade_id?: string | null
          updated_at?: string
          updated_by?: string | null
          valor_premio?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cotacoes_captacao_id_fkey"
            columns: ["captacao_id"]
            isOneToOne: false
            referencedRelation: "captacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes_restricted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_produtor_cotador_id_fkey"
            columns: ["produtor_cotador_id"]
            isOneToOne: false
            referencedRelation: "produtores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_produtor_negociador_id_fkey"
            columns: ["produtor_negociador_id"]
            isOneToOne: false
            referencedRelation: "produtores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_produtor_origem_id_fkey"
            columns: ["produtor_origem_id"]
            isOneToOne: false
            referencedRelation: "produtores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_ramo_id_fkey"
            columns: ["ramo_id"]
            isOneToOne: false
            referencedRelation: "ramos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_seguradora_id_fkey"
            columns: ["seguradora_id"]
            isOneToOne: false
            referencedRelation: "seguradoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_status_seguradora_id_fkey"
            columns: ["status_seguradora_id"]
            isOneToOne: false
            referencedRelation: "status_seguradora"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacoes_historico: {
        Row: {
          captacao_id: string | null
          change_type: string
          changed_at: string
          changed_by: string | null
          cliente_id: string | null
          comentarios: string | null
          cotacao_id: string
          cpf_cnpj: string
          data_cotacao: string
          data_fechamento: string | null
          id: string
          motivo_recusa: string | null
          num_proposta: string | null
          numero_cotacao: string
          observacoes: string | null
          produtor_cotador_id: string | null
          produtor_negociador_id: string | null
          produtor_origem_id: string | null
          ramo_id: string | null
          segmento: string | null
          segurado: string
          seguradora_id: string | null
          status: string
          status_seguradora_id: string | null
          tipo: string | null
          unidade_id: string | null
          valor_premio: number | null
        }
        Insert: {
          captacao_id?: string | null
          change_type?: string
          changed_at?: string
          changed_by?: string | null
          cliente_id?: string | null
          comentarios?: string | null
          cotacao_id: string
          cpf_cnpj: string
          data_cotacao: string
          data_fechamento?: string | null
          id?: string
          motivo_recusa?: string | null
          num_proposta?: string | null
          numero_cotacao: string
          observacoes?: string | null
          produtor_cotador_id?: string | null
          produtor_negociador_id?: string | null
          produtor_origem_id?: string | null
          ramo_id?: string | null
          segmento?: string | null
          segurado: string
          seguradora_id?: string | null
          status: string
          status_seguradora_id?: string | null
          tipo?: string | null
          unidade_id?: string | null
          valor_premio?: number | null
        }
        Update: {
          captacao_id?: string | null
          change_type?: string
          changed_at?: string
          changed_by?: string | null
          cliente_id?: string | null
          comentarios?: string | null
          cotacao_id?: string
          cpf_cnpj?: string
          data_cotacao?: string
          data_fechamento?: string | null
          id?: string
          motivo_recusa?: string | null
          num_proposta?: string | null
          numero_cotacao?: string
          observacoes?: string | null
          produtor_cotador_id?: string | null
          produtor_negociador_id?: string | null
          produtor_origem_id?: string | null
          ramo_id?: string | null
          segmento?: string | null
          segurado?: string
          seguradora_id?: string | null
          status?: string
          status_seguradora_id?: string | null
          tipo?: string | null
          unidade_id?: string | null
          valor_premio?: number | null
        }
        Relationships: []
      }
      produtores: {
        Row: {
          ativo: boolean
          codigo_prod: string | null
          created_at: string
          email: string
          id: string
          nome: string
          papel: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo_prod?: string | null
          created_at?: string
          email: string
          id?: string
          nome: string
          papel?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo_prod?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          papel?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          id: string
          nome: string
          papel: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          id?: string
          nome: string
          papel?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          id?: string
          nome?: string
          papel?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ramos: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string
          id: string
          ramo_agrupado: string | null
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao: string
          id?: string
          ramo_agrupado?: string | null
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string
          id?: string
          ramo_agrupado?: string | null
        }
        Relationships: []
      }
      seguradoras: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      status_seguradora: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string
          id: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao: string
          id?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string
          id?: string
        }
        Relationships: []
      }
      unidades: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string
          id: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao: string
          id?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string
          id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      clientes_restricted: {
        Row: {
          ativo: boolean | null
          cidade: string | null
          cpf_cnpj: string | null
          id: string | null
          segurado: string | null
          uf: string | null
        }
        Insert: {
          ativo?: boolean | null
          cidade?: string | null
          cpf_cnpj?: string | null
          id?: string | null
          segurado?: string | null
          uf?: string | null
        }
        Update: {
          ativo?: boolean | null
          cidade?: string | null
          cpf_cnpj?: string | null
          id?: string | null
          segurado?: string | null
          uf?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_cotacao_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "produtor" | "faturamento"
      user_role: "admin" | "faturamento" | "produtor" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "produtor", "faturamento"],
      user_role: ["admin", "faturamento", "produtor", "viewer"],
    },
  },
} as const
