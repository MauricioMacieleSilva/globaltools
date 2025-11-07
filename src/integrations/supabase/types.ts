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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_goals: {
        Row: {
          conversion_goal_percent: number
          created_at: string
          created_by: string | null
          daily_contacts_goal: number | null
          forwarded_leads_goal: number | null
          id: string
          month_year: string
          monthly_contacts_goal: number | null
          qualified_leads_goal: number | null
          updated_at: string
        }
        Insert: {
          conversion_goal_percent?: number
          created_at?: string
          created_by?: string | null
          daily_contacts_goal?: number | null
          forwarded_leads_goal?: number | null
          id?: string
          month_year: string
          monthly_contacts_goal?: number | null
          qualified_leads_goal?: number | null
          updated_at?: string
        }
        Update: {
          conversion_goal_percent?: number
          created_at?: string
          created_by?: string | null
          daily_contacts_goal?: number | null
          forwarded_leads_goal?: number | null
          id?: string
          month_year?: string
          monthly_contacts_goal?: number | null
          qualified_leads_goal?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_session_resets: {
        Row: {
          created_at: string
          id: string
          performed_by: string | null
          reason: string | null
          reset_timestamp: string
          target_user_email: string
          target_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          performed_by?: string | null
          reason?: string | null
          reset_timestamp?: string
          target_user_email: string
          target_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          performed_by?: string | null
          reason?: string | null
          reset_timestamp?: string
          target_user_email?: string
          target_user_id?: string
        }
        Relationships: []
      }
      ai_notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          category: string
          created_at: string
          data: Json | null
          expires_at: string | null
          id: string
          is_read: boolean
          message: string
          priority: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          category: string
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          priority?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          category?: string
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          priority?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_followups: {
        Row: {
          budget_number: string | null
          client_code: string | null
          client_name: string | null
          created_at: string
          custom_type_text: string | null
          id: string
          is_completed: boolean
          lead_id: string | null
          scheduled_date: string
          sdr_id: string | null
          sdr_name: string | null
          show_today: boolean
          subject: string
          type: Database["public"]["Enums"]["followup_type"]
          updated_at: string
          user_id: string
          user_name: string
        }
        Insert: {
          budget_number?: string | null
          client_code?: string | null
          client_name?: string | null
          created_at?: string
          custom_type_text?: string | null
          id?: string
          is_completed?: boolean
          lead_id?: string | null
          scheduled_date: string
          sdr_id?: string | null
          sdr_name?: string | null
          show_today?: boolean
          subject: string
          type?: Database["public"]["Enums"]["followup_type"]
          updated_at?: string
          user_id: string
          user_name: string
        }
        Update: {
          budget_number?: string | null
          client_code?: string | null
          client_name?: string | null
          created_at?: string
          custom_type_text?: string | null
          id?: string
          is_completed?: boolean
          lead_id?: string | null
          scheduled_date?: string
          sdr_id?: string | null
          sdr_name?: string | null
          show_today?: boolean
          subject?: string
          type?: Database["public"]["Enums"]["followup_type"]
          updated_at?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_followups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          articles_used: string[] | null
          created_at: string | null
          feedback_text: string | null
          id: string
          message: string
          response: string | null
          response_time_ms: number | null
          response_type: string | null
          search_query: string | null
          session_id: string
          user_id: string | null
          was_helpful: boolean | null
        }
        Insert: {
          articles_used?: string[] | null
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          message: string
          response?: string | null
          response_time_ms?: number | null
          response_type?: string | null
          search_query?: string | null
          session_id: string
          user_id?: string | null
          was_helpful?: boolean | null
        }
        Update: {
          articles_used?: string[] | null
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          message?: string
          response?: string | null
          response_time_ms?: number | null
          response_type?: string | null
          search_query?: string | null
          session_id?: string
          user_id?: string | null
          was_helpful?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
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
          updated_at: string
          user_id: string
          user_name: string
        }
        Insert: {
          budget_number: string
          comment: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          user_name: string
        }
        Update: {
          budget_number?: string
          comment?: string
          created_at?: string
          id?: string
          updated_at?: string
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
          user_id: string
          user_name: string
        }
        Insert: {
          budget_number: string
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
          user_name: string
        }
        Update: {
          budget_number?: string
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      email_reports_config: {
        Row: {
          created_at: string
          created_by: string
          email: string
          frequency: string
          full_name: string | null
          id: string
          include_cancelamentos: boolean
          include_funil: boolean
          include_perdidos: boolean
          include_vendas: boolean
          is_active: boolean
          send_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          email: string
          frequency?: string
          full_name?: string | null
          id?: string
          include_cancelamentos?: boolean
          include_funil?: boolean
          include_perdidos?: boolean
          include_vendas?: boolean
          is_active?: boolean
          send_time?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string
          frequency?: string
          full_name?: string | null
          id?: string
          include_cancelamentos?: boolean
          include_funil?: boolean
          include_perdidos?: boolean
          include_vendas?: boolean
          is_active?: boolean
          send_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_reports_log: {
        Row: {
          config_id: string
          created_at: string
          email_subject: string | null
          error_message: string | null
          id: string
          recipient_email: string
          report_data: Json | null
          sent_at: string
          status: string
          updated_at: string
        }
        Insert: {
          config_id: string
          created_at?: string
          email_subject?: string | null
          error_message?: string | null
          id?: string
          recipient_email: string
          report_data?: Json | null
          sent_at?: string
          status: string
          updated_at?: string
        }
        Update: {
          config_id?: string
          created_at?: string
          email_subject?: string | null
          error_message?: string | null
          id?: string
          recipient_email?: string
          report_data?: Json | null
          sent_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_reports_log_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "email_reports_config"
            referencedColumns: ["id"]
          },
        ]
      }
      excluded_orders: {
        Row: {
          created_at: string
          excluded_at: string
          excluded_by: string
          id: string
          motivo: string | null
          numero_nf: string | null
          numero_pedido: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          excluded_at?: string
          excluded_by: string
          id?: string
          motivo?: string | null
          numero_nf?: string | null
          numero_pedido: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          excluded_at?: string
          excluded_by?: string
          id?: string
          motivo?: string | null
          numero_nf?: string | null
          numero_pedido?: string
          updated_at?: string
        }
        Relationships: []
      }
      invitation_rate_limit: {
        Row: {
          invitation_count: number | null
          user_id: string
          window_start: string | null
        }
        Insert: {
          invitation_count?: number | null
          user_id: string
          window_start?: string | null
        }
        Update: {
          invitation_count?: number | null
          user_id?: string
          window_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitation_rate_limit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_article_tags: {
        Row: {
          article_id: string
          tag_id: string
        }
        Insert: {
          article_id: string
          tag_id: string
        }
        Update: {
          article_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_article_tags_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "knowledge_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_article_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "knowledge_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_articles: {
        Row: {
          article_type: string | null
          category_id: string | null
          content: string
          created_at: string | null
          created_by: string | null
          difficulty_level: string | null
          expires_at: string | null
          helpful_count: number | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          keywords: string[] | null
          priority: number | null
          search_terms: string[] | null
          summary: string | null
          title: string
          unhelpful_count: number | null
          updated_at: string | null
          updated_by: string | null
          view_count: number | null
        }
        Insert: {
          article_type?: string | null
          category_id?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          difficulty_level?: string | null
          expires_at?: string | null
          helpful_count?: number | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          keywords?: string[] | null
          priority?: number | null
          search_terms?: string[] | null
          summary?: string | null
          title: string
          unhelpful_count?: number | null
          updated_at?: string | null
          updated_by?: string | null
          view_count?: number | null
        }
        Update: {
          article_type?: string | null
          category_id?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          difficulty_level?: string | null
          expires_at?: string | null
          helpful_count?: number | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          keywords?: string[] | null
          priority?: number | null
          search_terms?: string[] | null
          summary?: string | null
          title?: string
          unhelpful_count?: number | null
          updated_at?: string | null
          updated_by?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "knowledge_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_articles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_articles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_categories: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "knowledge_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_feedback: {
        Row: {
          article_id: string | null
          comment: string | null
          created_at: string | null
          feedback_type: string | null
          id: string
          is_suggestion: boolean | null
          rating: number | null
          suggested_improvement: string | null
          user_id: string | null
        }
        Insert: {
          article_id?: string | null
          comment?: string | null
          created_at?: string | null
          feedback_type?: string | null
          id?: string
          is_suggestion?: boolean | null
          rating?: number | null
          suggested_improvement?: string | null
          user_id?: string | null
        }
        Update: {
          article_id?: string | null
          comment?: string | null
          created_at?: string | null
          feedback_type?: string | null
          id?: string
          is_suggestion?: boolean | null
          rating?: number | null
          suggested_improvement?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_feedback_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "knowledge_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_response_templates: {
        Row: {
          category_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          placeholders: string[] | null
          template: string
          usage_count: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          placeholders?: string[] | null
          template: string
          usage_count?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          placeholders?: string[] | null
          template?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_response_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "knowledge_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_response_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_search_terms: {
        Row: {
          article_id: string | null
          created_at: string | null
          id: string
          synonyms: string[] | null
          term: string
          weight: number | null
        }
        Insert: {
          article_id?: string | null
          created_at?: string | null
          id?: string
          synonyms?: string[] | null
          term: string
          weight?: number | null
        }
        Update: {
          article_id?: string | null
          created_at?: string | null
          id?: string
          synonyms?: string[] | null
          term?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_search_terms_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "knowledge_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_tags: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
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
          sdr_name: string
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
          sdr_name: string
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
          sdr_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_business_types: {
        Row: {
          created_at: string
          created_by: string | null
          display_order: number | null
          id: string
          is_active: boolean
          label: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          label: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
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
          disposed_at: string
          disposed_by: string
          disposed_by_name: string
          id: string
          lead_client_code: string
          lead_client_name: string
          lead_id: string
          reason: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_reason?: string | null
          disposed_at?: string
          disposed_by: string
          disposed_by_name: string
          id?: string
          lead_client_code: string
          lead_client_name: string
          lead_id: string
          reason: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_reason?: string | null
          disposed_at?: string
          disposed_by?: string
          disposed_by_name?: string
          id?: string
          lead_client_code?: string
          lead_client_name?: string
          lead_id?: string
          reason?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_product_interests: {
        Row: {
          created_at: string
          created_by: string | null
          display_order: number | null
          id: string
          is_active: boolean
          label: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          label: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          label?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          assigned_at: string
          assigned_specialist_id: string | null
          assigned_specialist_name: string | null
          budget_number: string | null
          business_type: string | null
          business_type_custom: string | null
          cidade: string | null
          client_code: string
          client_name: string
          contact_attempts: number | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contacted_count: number | null
          conversation_started: boolean | null
          converted_at: string | null
          created_at: string
          current_pain: string | null
          current_pain_custom: string | null
          entry_channel: string | null
          estimated_volume: string | null
          estimated_volume_custom: string | null
          forwarded_at: string | null
          forwarded_to_specialist: boolean | null
          id: string
          is_qualified: boolean | null
          last_contact_at: string | null
          next_contact_at: string | null
          notes: string | null
          opportunity_identified: string | null
          opportunity_identified_custom: string | null
          pipeline_status: string | null
          product_interest: string | null
          product_interest_custom: string | null
          purchase_frequency: string | null
          purchase_frequency_custom: string | null
          qualification_criteria_met: string[] | null
          qualification_score: number | null
          sdr_id: string | null
          sdr_name: string
          source: string | null
          status: string
          uf: string | null
          unsuccessful_contacts_count: number | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_specialist_id?: string | null
          assigned_specialist_name?: string | null
          budget_number?: string | null
          business_type?: string | null
          business_type_custom?: string | null
          cidade?: string | null
          client_code: string
          client_name: string
          contact_attempts?: number | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contacted_count?: number | null
          conversation_started?: boolean | null
          converted_at?: string | null
          created_at?: string
          current_pain?: string | null
          current_pain_custom?: string | null
          entry_channel?: string | null
          estimated_volume?: string | null
          estimated_volume_custom?: string | null
          forwarded_at?: string | null
          forwarded_to_specialist?: boolean | null
          id?: string
          is_qualified?: boolean | null
          last_contact_at?: string | null
          next_contact_at?: string | null
          notes?: string | null
          opportunity_identified?: string | null
          opportunity_identified_custom?: string | null
          pipeline_status?: string | null
          product_interest?: string | null
          product_interest_custom?: string | null
          purchase_frequency?: string | null
          purchase_frequency_custom?: string | null
          qualification_criteria_met?: string[] | null
          qualification_score?: number | null
          sdr_id?: string | null
          sdr_name: string
          source?: string | null
          status?: string
          uf?: string | null
          unsuccessful_contacts_count?: number | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_specialist_id?: string | null
          assigned_specialist_name?: string | null
          budget_number?: string | null
          business_type?: string | null
          business_type_custom?: string | null
          cidade?: string | null
          client_code?: string
          client_name?: string
          contact_attempts?: number | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contacted_count?: number | null
          conversation_started?: boolean | null
          converted_at?: string | null
          created_at?: string
          current_pain?: string | null
          current_pain_custom?: string | null
          entry_channel?: string | null
          estimated_volume?: string | null
          estimated_volume_custom?: string | null
          forwarded_at?: string | null
          forwarded_to_specialist?: boolean | null
          id?: string
          is_qualified?: boolean | null
          last_contact_at?: string | null
          next_contact_at?: string | null
          notes?: string | null
          opportunity_identified?: string | null
          opportunity_identified_custom?: string | null
          pipeline_status?: string | null
          product_interest?: string | null
          product_interest_custom?: string | null
          purchase_frequency?: string | null
          purchase_frequency_custom?: string | null
          qualification_criteria_met?: string[] | null
          qualification_score?: number | null
          sdr_id?: string | null
          sdr_name?: string
          source?: string | null
          status?: string
          uf?: string | null
          unsuccessful_contacts_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      production_orders: {
        Row: {
          created_at: string
          id: string
          novo_prazo: string | null
          numero_pedido: string
          situacao: string | null
          updated_at: string
          updated_by: string | null
          updated_by_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          novo_prazo?: string | null
          numero_pedido: string
          situacao?: string | null
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          novo_prazo?: string | null
          numero_pedido?: string
          situacao?: string | null
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Relationships: []
      }
      revenue_goals: {
        Row: {
          created_at: string
          created_by: string | null
          daily_goal: number
          id: string
          month_year: string
          monthly_goal: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          daily_goal?: number
          id?: string
          month_year: string
          monthly_goal?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          daily_goal?: number
          id?: string
          month_year?: string
          monthly_goal?: number
          updated_at?: string
        }
        Relationships: []
      }
      sdr_goals: {
        Row: {
          conversion_goal_percent: number
          created_at: string
          daily_contacts_goal: number
          id: string
          month_year: string
          qualified_leads_goal: number
          sdr_id: string
          updated_at: string
        }
        Insert: {
          conversion_goal_percent?: number
          created_at?: string
          daily_contacts_goal?: number
          id?: string
          month_year: string
          qualified_leads_goal?: number
          sdr_id: string
          updated_at?: string
        }
        Update: {
          conversion_goal_percent?: number
          created_at?: string
          daily_contacts_goal?: number
          id?: string
          month_year?: string
          qualified_leads_goal?: number
          sdr_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
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
          access_type: Database["public"]["Enums"]["page_access_type"]
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          page_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_type?: Database["public"]["Enums"]["page_access_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          page_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_type?: Database["public"]["Enums"]["page_access_type"]
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
          role: string
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
          role?: string
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
          role?: string
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
      vendor_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          lead_client_name: string
          lead_id: string
          message: string
          sdr_name: string
          updated_at: string
          vendor_id: string
          vendor_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          lead_client_name: string
          lead_id: string
          message: string
          sdr_name: string
          updated_at?: string
          vendor_id: string
          vendor_name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          lead_client_name?: string
          lead_id?: string
          message?: string
          sdr_name?: string
          updated_at?: string
          vendor_id?: string
          vendor_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_invitation_rate_limit: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      clean_old_notifications: { Args: never; Returns: undefined }
      get_current_user_role: { Args: never; Returns: string }
      is_valid_email_domain: {
        Args: { email_address: string }
        Returns: boolean
      }
      search_knowledge: {
        Args: {
          category_filter?: string
          limit_results?: number
          search_query: string
        }
        Returns: {
          article_id: string
          category_name: string
          content: string
          relevance_score: number
          summary: string
          tags: string[]
          title: string
        }[]
      }
    }
    Enums: {
      followup_type:
        | "reforcar_proposta"
        | "enviar_nova_proposta"
        | "enviar_material_apoio"
        | "confirmar_recebimento"
        | "reuniao_apresentacao"
        | "visita_tecnica"
        | "solicitar_documentacao"
        | "reabrir_negociacao"
        | "reativar_cliente"
        | "ligar_followup"
        | "enviar_material"
        | "ajustar_proposta"
        | "agendar_reuniao"
        | "agendar_visita"
        | "cobrar_retorno"
        | "enviar_novo_orcamento"
        | "checar_status_decisao"
        | "agendar_nova_tentativa"
        | "solicitar_documentos"
        | "reabrir_negociacao_futura"
        | "outro"
      page_access_type: "view" | "edit"
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
      followup_type: [
        "reforcar_proposta",
        "enviar_nova_proposta",
        "enviar_material_apoio",
        "confirmar_recebimento",
        "reuniao_apresentacao",
        "visita_tecnica",
        "solicitar_documentacao",
        "reabrir_negociacao",
        "reativar_cliente",
        "ligar_followup",
        "enviar_material",
        "ajustar_proposta",
        "agendar_reuniao",
        "agendar_visita",
        "cobrar_retorno",
        "enviar_novo_orcamento",
        "checar_status_decisao",
        "agendar_nova_tentativa",
        "solicitar_documentos",
        "reabrir_negociacao_futura",
        "outro",
      ],
      page_access_type: ["view", "edit"],
    },
  },
} as const
