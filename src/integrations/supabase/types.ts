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
      admin_goals: {
        Row: {
          conversion_goal_percent: number | null
          created_at: string
          daily_contacts_goal: number | null
          deals_goal: number | null
          forwarded_leads_goal: number | null
          id: string
          month_year: string
          monthly_contacts_goal: number | null
          qualified_leads_goal: number | null
          updated_at: string
        }
        Insert: {
          conversion_goal_percent?: number | null
          created_at?: string
          daily_contacts_goal?: number | null
          deals_goal?: number | null
          forwarded_leads_goal?: number | null
          id?: string
          month_year: string
          monthly_contacts_goal?: number | null
          qualified_leads_goal?: number | null
          updated_at?: string
        }
        Update: {
          conversion_goal_percent?: number | null
          created_at?: string
          daily_contacts_goal?: number | null
          deals_goal?: number | null
          forwarded_leads_goal?: number | null
          id?: string
          month_year?: string
          monthly_contacts_goal?: number | null
          qualified_leads_goal?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      budget_followups: {
        Row: {
          budget_number: string
          completed: boolean
          created_at: string
          description: string | null
          followup_date: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_number: string
          completed?: boolean
          created_at?: string
          description?: string | null
          followup_date: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_number?: string
          completed?: boolean
          created_at?: string
          description?: string | null
          followup_date?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cancelamentos: {
        Row: {
          cliente_id: string | null
          created_at: string
          data_cancelamento: string
          id: string
          motivo: string
          numero_pedido: string
          observacoes: string | null
          pedido_id: string | null
          valor: number
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data_cancelamento?: string
          id?: string
          motivo: string
          numero_pedido: string
          observacoes?: string | null
          pedido_id?: string | null
          valor: number
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          data_cancelamento?: string
          id?: string
          motivo?: string
          numero_pedido?: string
          observacoes?: string | null
          pedido_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "cancelamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancelamentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      client_budget_comments: {
        Row: {
          budget_number: string
          comment: string
          created_at: string
          id: string
          user_id: string
          user_name: string
        }
        Insert: {
          budget_number: string
          comment: string
          created_at?: string
          id?: string
          user_id: string
          user_name: string
        }
        Update: {
          budget_number?: string
          comment?: string
          created_at?: string
          id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      client_budget_ratings: {
        Row: {
          budget_number: string
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_name: string | null
        }
        Insert: {
          budget_number: string
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_name?: string | null
        }
        Update: {
          budget_number?: string
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_name?: string | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          cidade: string | null
          classificacao_abc: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          segmento: string | null
          telefone: string | null
          updated_at: string
          vendedor_id: string | null
        }
        Insert: {
          cidade?: string | null
          classificacao_abc?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          segmento?: string | null
          telefone?: string | null
          updated_at?: string
          vendedor_id?: string | null
        }
        Update: {
          cidade?: string | null
          classificacao_abc?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          segmento?: string | null
          telefone?: string | null
          updated_at?: string
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      devolucoes: {
        Row: {
          cliente_id: string | null
          created_at: string
          data_devolucao: string
          id: string
          motivo: string
          numero_pedido: string
          observacoes: string | null
          pedido_id: string | null
          valor: number
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data_devolucao?: string
          id?: string
          motivo: string
          numero_pedido: string
          observacoes?: string | null
          pedido_id?: string | null
          valor: number
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          data_devolucao?: string
          id?: string
          motivo?: string
          numero_pedido?: string
          observacoes?: string | null
          pedido_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "devolucoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devolucoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      excluded_orders: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          motivo: string
          numero_pedido: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          motivo: string
          numero_pedido: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          motivo?: string
          numero_pedido?: string
        }
        Relationships: [
          {
            foreignKeyName: "excluded_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          concluido: boolean
          created_at: string
          data_agendada: string
          descricao: string | null
          id: string
          lead_id: string | null
          orcamento_id: string | null
          tipo: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          concluido?: boolean
          created_at?: string
          data_agendada: string
          descricao?: string | null
          id?: string
          lead_id?: string | null
          orcamento_id?: string | null
          tipo: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          concluido?: boolean
          created_at?: string
          data_agendada?: string
          descricao?: string | null
          id?: string
          lead_id?: string | null
          orcamento_id?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_articles: {
        Row: {
          article_type: string | null
          ativo: boolean
          author_id: string | null
          category_id: string | null
          content: string | null
          conteudo: string
          created_at: string
          difficulty_level: string | null
          helpful_count: number | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          keywords: string[] | null
          priority: number | null
          search_terms: string[] | null
          summary: string | null
          tags: string[] | null
          title: string | null
          titulo: string
          unhelpful_count: number | null
          updated_at: string
          view_count: number | null
          views: number | null
        }
        Insert: {
          article_type?: string | null
          ativo?: boolean
          author_id?: string | null
          category_id?: string | null
          content?: string | null
          conteudo: string
          created_at?: string
          difficulty_level?: string | null
          helpful_count?: number | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          keywords?: string[] | null
          priority?: number | null
          search_terms?: string[] | null
          summary?: string | null
          tags?: string[] | null
          title?: string | null
          titulo: string
          unhelpful_count?: number | null
          updated_at?: string
          view_count?: number | null
          views?: number | null
        }
        Update: {
          article_type?: string | null
          ativo?: boolean
          author_id?: string | null
          category_id?: string | null
          content?: string | null
          conteudo?: string
          created_at?: string
          difficulty_level?: string | null
          helpful_count?: number | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          keywords?: string[] | null
          priority?: number | null
          search_terms?: string[] | null
          summary?: string | null
          tags?: string[] | null
          title?: string | null
          titulo?: string
          unhelpful_count?: number | null
          updated_at?: string
          view_count?: number | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "knowledge_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_categories: {
        Row: {
          ativo: boolean
          color: string | null
          created_at: string
          descricao: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          icone: string | null
          id: string
          is_active: boolean | null
          name: string | null
          nome: string
          ordem: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          color?: string | null
          created_at?: string
          descricao?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          icone?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          nome: string
          ordem?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          color?: string | null
          created_at?: string
          descricao?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          icone?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          nome?: string
          ordem?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      lead_activities: {
        Row: {
          activity_type: string
          conversation_started: boolean | null
          created_at: string
          description: string
          id: string
          lead_id: string
          next_action: string | null
          next_contact_date: string | null
          result: string | null
          sdr_id: string | null
          sdr_name: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          conversation_started?: boolean | null
          created_at?: string
          description: string
          id?: string
          lead_id: string
          next_action?: string | null
          next_contact_date?: string | null
          result?: string | null
          sdr_id?: string | null
          sdr_name?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          conversation_started?: boolean | null
          created_at?: string
          description?: string
          id?: string
          lead_id?: string
          next_action?: string | null
          next_contact_date?: string | null
          result?: string | null
          sdr_id?: string | null
          sdr_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lead_business_types: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean
          label: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          label: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          label?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_dispositions: {
        Row: {
          created_at: string
          custom_reason: string | null
          disposed_by: string | null
          disposed_by_name: string | null
          disposition_type: string
          id: string
          lead_client_code: string | null
          lead_client_name: string | null
          lead_id: string
          notes: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_reason?: string | null
          disposed_by?: string | null
          disposed_by_name?: string | null
          disposition_type: string
          id?: string
          lead_client_code?: string | null
          lead_client_name?: string | null
          lead_id: string
          notes?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          custom_reason?: string | null
          disposed_by?: string | null
          disposed_by_name?: string | null
          disposition_type?: string
          id?: string
          lead_client_code?: string | null
          lead_client_name?: string | null
          lead_id?: string
          notes?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lead_history: {
        Row: {
          acao: string
          created_at: string
          id: string
          lead_id: string
          observacao: string | null
          status_anterior: Database["public"]["Enums"]["lead_status"] | null
          status_novo: Database["public"]["Enums"]["lead_status"] | null
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          id?: string
          lead_id: string
          observacao?: string | null
          status_anterior?: Database["public"]["Enums"]["lead_status"] | null
          status_novo?: Database["public"]["Enums"]["lead_status"] | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          id?: string
          lead_id?: string
          observacao?: string | null
          status_anterior?: Database["public"]["Enums"]["lead_status"] | null
          status_novo?: Database["public"]["Enums"]["lead_status"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_product_interests: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean
          label: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          label: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          label?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_qualification_config: {
        Row: {
          ativo: boolean
          created_at: string
          criterio: string
          id: string
          ordem: number | null
          peso: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          criterio: string
          id?: string
          ordem?: number | null
          peso: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          criterio?: string
          id?: string
          ordem?: number | null
          peso?: number
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          budget_number: string | null
          client_code: string | null
          cliente_cnpj: string | null
          cliente_email: string | null
          cliente_nome: string
          cliente_telefone: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          data_abertura: string
          data_fechamento: string | null
          empresa: string | null
          especialista_id: string | null
          id: string
          numero_lead: string | null
          observacoes: string | null
          origem: string | null
          produto_interesse: string | null
          qualificacao_score: number | null
          status: Database["public"]["Enums"]["lead_status"]
          temperatura: number | null
          updated_at: string
          valor_estimado: number | null
          vendedor_id: string | null
        }
        Insert: {
          budget_number?: string | null
          client_code?: string | null
          cliente_cnpj?: string | null
          cliente_email?: string | null
          cliente_nome: string
          cliente_telefone?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          data_abertura?: string
          data_fechamento?: string | null
          empresa?: string | null
          especialista_id?: string | null
          id?: string
          numero_lead?: string | null
          observacoes?: string | null
          origem?: string | null
          produto_interesse?: string | null
          qualificacao_score?: number | null
          status?: Database["public"]["Enums"]["lead_status"]
          temperatura?: number | null
          updated_at?: string
          valor_estimado?: number | null
          vendedor_id?: string | null
        }
        Update: {
          budget_number?: string | null
          client_code?: string | null
          cliente_cnpj?: string | null
          cliente_email?: string | null
          cliente_nome?: string
          cliente_telefone?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          data_abertura?: string
          data_fechamento?: string | null
          empresa?: string | null
          especialista_id?: string | null
          id?: string
          numero_lead?: string | null
          observacoes?: string | null
          origem?: string | null
          produto_interesse?: string | null
          qualificacao_score?: number | null
          status?: Database["public"]["Enums"]["lead_status"]
          temperatura?: number | null
          updated_at?: string
          valor_estimado?: number | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_especialista_id_fkey"
            columns: ["especialista_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_vendas: {
        Row: {
          ano: number
          created_at: string
          id: string
          mes: number
          meta_diaria: number | null
          meta_mensal: number
          updated_at: string
          vendedor_id: string | null
        }
        Insert: {
          ano: number
          created_at?: string
          id?: string
          mes: number
          meta_diaria?: number | null
          meta_mensal: number
          updated_at?: string
          vendedor_id?: string | null
        }
        Update: {
          ano?: number
          created_at?: string
          id?: string
          mes?: number
          meta_diaria?: number | null
          meta_mensal?: number
          updated_at?: string
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metas_vendas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          lida: boolean
          link: string | null
          mensagem: string
          priority: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem: string
          priority?: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem?: string
          priority?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_itens: {
        Row: {
          created_at: string
          id: string
          observacoes: string | null
          orcamento_id: string
          preco_total: number
          preco_unitario: number
          produto_codigo: string
          produto_id: string | null
          produto_nome: string
          quantidade: number
        }
        Insert: {
          created_at?: string
          id?: string
          observacoes?: string | null
          orcamento_id: string
          preco_total: number
          preco_unitario: number
          produto_codigo: string
          produto_id?: string | null
          produto_nome: string
          quantidade: number
        }
        Update: {
          created_at?: string
          id?: string
          observacoes?: string | null
          orcamento_id?: string
          preco_total?: number
          preco_unitario?: number
          produto_codigo?: string
          produto_id?: string | null
          produto_nome?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_itens_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos: {
        Row: {
          cliente_id: string | null
          created_at: string
          data_aprovacao: string | null
          data_emissao: string
          data_validade: string | null
          desconto_percentual: number | null
          id: string
          lead_id: string | null
          numero_orcamento: string
          observacoes: string | null
          status: Database["public"]["Enums"]["orcamento_status"]
          updated_at: string
          validade_dias: number | null
          valor_desconto: number | null
          valor_final: number
          valor_total: number
          vendedor_id: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data_aprovacao?: string | null
          data_emissao?: string
          data_validade?: string | null
          desconto_percentual?: number | null
          id?: string
          lead_id?: string | null
          numero_orcamento: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["orcamento_status"]
          updated_at?: string
          validade_dias?: number | null
          valor_desconto?: number | null
          valor_final: number
          valor_total: number
          vendedor_id: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          data_aprovacao?: string | null
          data_emissao?: string
          data_validade?: string | null
          desconto_percentual?: number | null
          id?: string
          lead_id?: string | null
          numero_orcamento?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["orcamento_status"]
          updated_at?: string
          validade_dias?: number | null
          valor_desconto?: number | null
          valor_final?: number
          valor_total?: number
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_producao: {
        Row: {
          created_at: string
          data_fim_prevista: string | null
          data_fim_realizada: string | null
          data_inicio: string | null
          id: string
          numero_op: string
          observacoes: string | null
          pedido_id: string | null
          produto_id: string | null
          quantidade: number
          status: Database["public"]["Enums"]["producao_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_fim_prevista?: string | null
          data_fim_realizada?: string | null
          data_inicio?: string | null
          id?: string
          numero_op: string
          observacoes?: string | null
          pedido_id?: string | null
          produto_id?: string | null
          quantidade: number
          status?: Database["public"]["Enums"]["producao_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_fim_prevista?: string | null
          data_fim_realizada?: string | null
          data_inicio?: string | null
          id?: string
          numero_op?: string
          observacoes?: string | null
          pedido_id?: string | null
          produto_id?: string | null
          quantidade?: number
          status?: Database["public"]["Enums"]["producao_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_producao_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_producao_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_itens: {
        Row: {
          created_at: string
          id: string
          pedido_id: string
          preco_total: number
          preco_unitario: number
          produto_codigo: string
          produto_id: string | null
          produto_nome: string
          quantidade: number
        }
        Insert: {
          created_at?: string
          id?: string
          pedido_id: string
          preco_total: number
          preco_unitario: number
          produto_codigo: string
          produto_id?: string | null
          produto_nome: string
          quantidade: number
        }
        Update: {
          created_at?: string
          id?: string
          pedido_id?: string
          preco_total?: number
          preco_unitario?: number
          produto_codigo?: string
          produto_id?: string | null
          produto_nome?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          cliente_id: string
          created_at: string
          data_entrega_prevista: string | null
          data_entrega_realizada: string | null
          data_pedido: string
          id: string
          numero_pedido: string
          observacoes: string | null
          orcamento_id: string | null
          status: Database["public"]["Enums"]["pedido_status"]
          updated_at: string
          valor_total: number
          vendedor_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_entrega_prevista?: string | null
          data_entrega_realizada?: string | null
          data_pedido?: string
          id?: string
          numero_pedido: string
          observacoes?: string | null
          orcamento_id?: string | null
          status?: Database["public"]["Enums"]["pedido_status"]
          updated_at?: string
          valor_total: number
          vendedor_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_entrega_prevista?: string | null
          data_entrega_realizada?: string | null
          data_pedido?: string
          id?: string
          numero_pedido?: string
          observacoes?: string | null
          orcamento_id?: string | null
          status?: Database["public"]["Enums"]["pedido_status"]
          updated_at?: string
          valor_total?: number
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      politica_descontos: {
        Row: {
          ativo: boolean
          categoria_cliente: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          percentual_desconto: number | null
          produto_categoria: string | null
          requires_approval: boolean
          tipo: string
          updated_at: string
          valido_ate: string | null
          valido_de: string
          valor_desconto: number | null
          volume_minimo: number | null
        }
        Insert: {
          ativo?: boolean
          categoria_cliente?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          percentual_desconto?: number | null
          produto_categoria?: string | null
          requires_approval?: boolean
          tipo: string
          updated_at?: string
          valido_ate?: string | null
          valido_de?: string
          valor_desconto?: number | null
          volume_minimo?: number | null
        }
        Update: {
          ativo?: boolean
          categoria_cliente?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          percentual_desconto?: number | null
          produto_categoria?: string | null
          requires_approval?: boolean
          tipo?: string
          updated_at?: string
          valido_ate?: string | null
          valido_de?: string
          valor_desconto?: number | null
          volume_minimo?: number | null
        }
        Relationships: []
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria: string | null
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          preco_base: number | null
          unidade: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          preco_base?: number | null
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          preco_base?: number | null
          unidade?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      report_configs: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          destinatarios: string[]
          frequencia: string
          hora_envio: string | null
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          destinatarios: string[]
          frequencia: string
          hora_envio?: string | null
          id?: string
          nome: string
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          destinatarios?: string[]
          frequencia?: string
          hora_envio?: string | null
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_configs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_history: {
        Row: {
          config_id: string | null
          destinatarios: string[] | null
          erro_mensagem: string | null
          id: string
          sent_at: string
          status: string
          tipo: string
        }
        Insert: {
          config_id?: string | null
          destinatarios?: string[] | null
          erro_mensagem?: string | null
          id?: string
          sent_at?: string
          status: string
          tipo: string
        }
        Update: {
          config_id?: string | null
          destinatarios?: string[] | null
          erro_mensagem?: string | null
          id?: string
          sent_at?: string
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_history_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "report_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      tabela_precos: {
        Row: {
          ativo: boolean
          categoria_cliente: string | null
          created_at: string
          id: string
          preco: number
          produto_id: string
          updated_at: string
          valido_ate: string | null
          valido_de: string
          volume_maximo: number | null
          volume_minimo: number | null
        }
        Insert: {
          ativo?: boolean
          categoria_cliente?: string | null
          created_at?: string
          id?: string
          preco: number
          produto_id: string
          updated_at?: string
          valido_ate?: string | null
          valido_de?: string
          volume_maximo?: number | null
          volume_minimo?: number | null
        }
        Update: {
          ativo?: boolean
          categoria_cliente?: string | null
          created_at?: string
          id?: string
          preco?: number
          produto_id?: string
          updated_at?: string
          valido_ate?: string | null
          valido_de?: string
          volume_maximo?: number | null
          volume_minimo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tabela_precos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["user_role"]
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["user_role"]
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["user_role"]
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          access_type: Database["public"]["Enums"]["access_type"]
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          page_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_type: Database["public"]["Enums"]["access_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          page_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_type?: Database["public"]["Enums"]["access_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          page_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          invited_by: string | null
          is_external: boolean
          last_login: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email: string
          full_name: string
          id: string
          invited_by?: string | null
          is_external?: boolean
          last_login?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          invited_by?: string | null
          is_external?: boolean
          last_login?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      leads_view: {
        Row: {
          budget_number: string | null
          client_code: string | null
          client_name: string | null
          cliente_cnpj: string | null
          cliente_email: string | null
          cliente_telefone: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          data_abertura: string | null
          data_fechamento: string | null
          empresa: string | null
          especialista_id: string | null
          id: string | null
          notes: string | null
          numero_lead: string | null
          produto_interesse: string | null
          qualificacao_score: number | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          temperatura: number | null
          updated_at: string | null
          valor_estimado: number | null
          vendedor_id: string | null
        }
        Insert: {
          budget_number?: string | null
          client_code?: string | null
          client_name?: string | null
          cliente_cnpj?: string | null
          cliente_email?: string | null
          cliente_telefone?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          data_abertura?: string | null
          data_fechamento?: string | null
          empresa?: string | null
          especialista_id?: string | null
          id?: string | null
          notes?: string | null
          numero_lead?: string | null
          produto_interesse?: string | null
          qualificacao_score?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          temperatura?: number | null
          updated_at?: string | null
          valor_estimado?: number | null
          vendedor_id?: string | null
        }
        Update: {
          budget_number?: string | null
          client_code?: string | null
          client_name?: string | null
          cliente_cnpj?: string | null
          cliente_email?: string | null
          cliente_telefone?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          data_abertura?: string | null
          data_fechamento?: string | null
          empresa?: string | null
          especialista_id?: string | null
          id?: string | null
          notes?: string | null
          numero_lead?: string | null
          produto_interesse?: string | null
          qualificacao_score?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          temperatura?: number | null
          updated_at?: string | null
          valor_estimado?: number | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_especialista_id_fkey"
            columns: ["especialista_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_invitation_rate_limit: {
        Args: { user_id: string }
        Returns: boolean
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      access_type: "view" | "edit"
      lead_status:
        | "novo"
        | "qualificado"
        | "contatado"
        | "proposta"
        | "negociacao"
        | "ganho"
        | "perdido"
      orcamento_status:
        | "aberto"
        | "enviado"
        | "aprovado"
        | "perdido"
        | "cancelado"
      pedido_status:
        | "pendente"
        | "producao"
        | "finalizado"
        | "entregue"
        | "cancelado"
      producao_status: "aguardando" | "em_producao" | "finalizado" | "pausado"
      user_role: "admin" | "comercial" | "operacional" | "visitante" | "sdr"
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
      access_type: ["view", "edit"],
      lead_status: [
        "novo",
        "qualificado",
        "contatado",
        "proposta",
        "negociacao",
        "ganho",
        "perdido",
      ],
      orcamento_status: [
        "aberto",
        "enviado",
        "aprovado",
        "perdido",
        "cancelado",
      ],
      pedido_status: [
        "pendente",
        "producao",
        "finalizado",
        "entregue",
        "cancelado",
      ],
      producao_status: ["aguardando", "em_producao", "finalizado", "pausado"],
      user_role: ["admin", "comercial", "operacional", "visitante", "sdr"],
    },
  },
} as const
