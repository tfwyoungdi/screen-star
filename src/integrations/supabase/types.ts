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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_activity_logs: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          description: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_activity_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_analytics: {
        Row: {
          campaign_id: string
          created_at: string
          date: string
          donations_amount: number
          donations_count: number
          hour: number | null
          id: string
          shares_count: number
          source: string | null
          unique_visitors: number
          views: number
        }
        Insert: {
          campaign_id: string
          created_at?: string
          date?: string
          donations_amount?: number
          donations_count?: number
          hour?: number | null
          id?: string
          shares_count?: number
          source?: string | null
          unique_visitors?: number
          views?: number
        }
        Update: {
          campaign_id?: string
          created_at?: string
          date?: string
          donations_amount?: number
          donations_count?: number
          hour?: number | null
          id?: string
          shares_count?: number
          source?: string | null
          unique_visitors?: number
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_updates: {
        Row: {
          campaign_id: string
          content: string
          created_at: string
          id: string
          image_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_updates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          category: string
          created_at: string
          creator_id: string
          currency: string
          current_amount: number
          custom_slug: string | null
          description: string | null
          donor_count: number
          end_date: string | null
          goal_amount: number
          id: string
          image_url: string | null
          is_featured: boolean
          short_description: string | null
          start_date: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          creator_id: string
          currency?: string
          current_amount?: number
          custom_slug?: string | null
          description?: string | null
          donor_count?: number
          end_date?: string | null
          goal_amount?: number
          id?: string
          image_url?: string | null
          is_featured?: boolean
          short_description?: string | null
          start_date?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          creator_id?: string
          currency?: string
          current_amount?: number
          custom_slug?: string | null
          description?: string | null
          donor_count?: number
          end_date?: string | null
          goal_amount?: number
          id?: string
          image_url?: string | null
          is_featured?: boolean
          short_description?: string | null
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_moderation: {
        Row: {
          content_type: string
          content_url: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string
          updated_at: string
        }
        Insert: {
          content_type: string
          content_url: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by: string
          updated_at?: string
        }
        Update: {
          content_type?: string
          content_url?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_moderation_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_moderation_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_analytics: {
        Row: {
          contest_id: string
          created_at: string
          date: string
          hour: number | null
          id: string
          unique_voters: number
          votes_count: number
          votes_revenue: number
        }
        Insert: {
          contest_id: string
          created_at?: string
          date?: string
          hour?: number | null
          id?: string
          unique_voters?: number
          votes_count?: number
          votes_revenue?: number
        }
        Update: {
          contest_id?: string
          created_at?: string
          date?: string
          hour?: number | null
          id?: string
          unique_voters?: number
          votes_count?: number
          votes_revenue?: number
        }
        Relationships: [
          {
            foreignKeyName: "contest_analytics_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_auto_posts: {
        Row: {
          contest_id: string
          created_at: string
          custom_message: string | null
          id: string
          is_active: boolean
          last_posted_at: string | null
          next_post_at: string | null
          organization_id: string
          platform: string
          post_type: string
          schedule_interval: string
          updated_at: string
        }
        Insert: {
          contest_id: string
          created_at?: string
          custom_message?: string | null
          id?: string
          is_active?: boolean
          last_posted_at?: string | null
          next_post_at?: string | null
          organization_id: string
          platform?: string
          post_type?: string
          schedule_interval?: string
          updated_at?: string
        }
        Update: {
          contest_id?: string
          created_at?: string
          custom_message?: string | null
          id?: string
          is_active?: boolean
          last_posted_at?: string | null
          next_post_at?: string | null
          organization_id?: string
          platform?: string
          post_type?: string
          schedule_interval?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contest_auto_posts_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_categories: {
        Row: {
          contest_id: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          contest_id: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          contest_id?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contest_categories_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      contestants: {
        Row: {
          bio: string | null
          category_id: string | null
          contest_id: string
          country: string | null
          created_at: string
          display_order: number | null
          id: string
          is_public_votes: boolean
          name: string
          performance: string | null
          photo_url: string | null
          state: string | null
          updated_at: string
          vote_count: number
        }
        Insert: {
          bio?: string | null
          category_id?: string | null
          contest_id: string
          country?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_public_votes?: boolean
          name: string
          performance?: string | null
          photo_url?: string | null
          state?: string | null
          updated_at?: string
          vote_count?: number
        }
        Update: {
          bio?: string | null
          category_id?: string | null
          contest_id?: string
          country?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_public_votes?: boolean
          name?: string
          performance?: string | null
          photo_url?: string | null
          state?: string | null
          updated_at?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "contestants_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "contest_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contestants_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      contests: {
        Row: {
          brand_logo_url: string | null
          brand_primary_color: string | null
          brand_secondary_color: string | null
          category: string
          commission_rate: number | null
          contest_type: string
          created_at: string
          custom_slug: string | null
          description: string | null
          end_date: string
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          is_live_voting: boolean
          organization_id: string | null
          start_date: string
          stream_platform: string | null
          stream_url: string | null
          title: string
          total_votes: number
          updated_at: string
          vote_currency: string
          vote_price: number
        }
        Insert: {
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          category: string
          commission_rate?: number | null
          contest_type?: string
          created_at?: string
          custom_slug?: string | null
          description?: string | null
          end_date: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_live_voting?: boolean
          organization_id?: string | null
          start_date: string
          stream_platform?: string | null
          stream_url?: string | null
          title: string
          total_votes?: number
          updated_at?: string
          vote_currency?: string
          vote_price?: number
        }
        Update: {
          brand_logo_url?: string | null
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          category?: string
          commission_rate?: number | null
          contest_type?: string
          created_at?: string
          custom_slug?: string | null
          description?: string | null
          end_date?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_live_voting?: boolean
          organization_id?: string | null
          start_date?: string
          stream_platform?: string | null
          stream_url?: string | null
          title?: string
          total_votes?: number
          updated_at?: string
          vote_currency?: string
          vote_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "contests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount: number
          campaign_id: string
          created_at: string
          currency: string
          donor_id: string | null
          donor_message: string | null
          guest_email: string | null
          guest_name: string | null
          id: string
          is_anonymous: boolean
          net_amount: number | null
          payment_method: string
          platform_commission: number | null
          status: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          campaign_id: string
          created_at?: string
          currency?: string
          donor_id?: string | null
          donor_message?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          is_anonymous?: boolean
          net_amount?: number | null
          payment_method: string
          platform_commission?: number | null
          status?: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          campaign_id?: string
          created_at?: string
          currency?: string
          donor_id?: string | null
          donor_message?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          is_anonymous?: boolean
          net_amount?: number | null
          payment_method?: string
          platform_commission?: number | null
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      event_auto_posts: {
        Row: {
          created_at: string
          custom_message: string | null
          event_id: string
          id: string
          is_active: boolean
          last_posted_at: string | null
          next_post_at: string | null
          organization_id: string
          platform: string
          post_type: string
          schedule_interval: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_message?: string | null
          event_id: string
          id?: string
          is_active?: boolean
          last_posted_at?: string | null
          next_post_at?: string | null
          organization_id: string
          platform?: string
          post_type?: string
          schedule_interval?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_message?: string | null
          event_id?: string
          id?: string
          is_active?: boolean
          last_posted_at?: string | null
          next_post_at?: string | null
          organization_id?: string
          platform?: string
          post_type?: string
          schedule_interval?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_auto_posts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_auto_posts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_templates: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          template_data: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          template_data: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          template_data?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          category: string
          commission_rate: number | null
          created_at: string
          currency: string
          custom_slug: string | null
          description: string | null
          event_date: string
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          logo_url: string | null
          organization_id: string | null
          stream_platform: string | null
          stream_url: string | null
          title: string
          updated_at: string
          venue: string
        }
        Insert: {
          address?: string | null
          category: string
          commission_rate?: number | null
          created_at?: string
          currency?: string
          custom_slug?: string | null
          description?: string | null
          event_date: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          logo_url?: string | null
          organization_id?: string | null
          stream_platform?: string | null
          stream_url?: string | null
          title: string
          updated_at?: string
          venue: string
        }
        Update: {
          address?: string | null
          category?: string
          commission_rate?: number | null
          created_at?: string
          currency?: string
          custom_slug?: string | null
          description?: string | null
          event_date?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          logo_url?: string | null
          organization_id?: string | null
          stream_platform?: string | null
          stream_url?: string | null
          title?: string
          updated_at?: string
          venue?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_contestants: {
        Row: {
          contestant_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          contestant_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          contestant_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_contestants_contestant_id_fkey"
            columns: ["contestant_id"]
            isOneToOne: false
            referencedRelation: "contestants"
            referencedColumns: ["id"]
          },
        ]
      }
      form_fields: {
        Row: {
          conditional_logic: Json | null
          created_at: string
          description: string | null
          display_order: number
          field_type: string
          form_id: string
          id: string
          is_required: boolean
          label: string
          options: Json | null
          page_number: number | null
          placeholder: string | null
          updated_at: string
          validation_rules: Json | null
        }
        Insert: {
          conditional_logic?: Json | null
          created_at?: string
          description?: string | null
          display_order?: number
          field_type: string
          form_id: string
          id?: string
          is_required?: boolean
          label: string
          options?: Json | null
          page_number?: number | null
          placeholder?: string | null
          updated_at?: string
          validation_rules?: Json | null
        }
        Update: {
          conditional_logic?: Json | null
          created_at?: string
          description?: string | null
          display_order?: number
          field_type?: string
          form_id?: string
          id?: string
          is_required?: boolean
          label?: string
          options?: Json | null
          page_number?: number | null
          placeholder?: string | null
          updated_at?: string
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_responses: {
        Row: {
          form_id: string
          id: string
          payment_amount: number | null
          payment_reference: string | null
          payment_status: string | null
          respondent_email: string | null
          respondent_name: string | null
          response_data: Json
          status: string
          submitted_at: string
        }
        Insert: {
          form_id: string
          id?: string
          payment_amount?: number | null
          payment_reference?: string | null
          payment_status?: string | null
          respondent_email?: string | null
          respondent_name?: string | null
          response_data: Json
          status?: string
          submitted_at?: string
        }
        Update: {
          form_id?: string
          id?: string
          payment_amount?: number | null
          payment_reference?: string | null
          payment_status?: string | null
          respondent_email?: string | null
          respondent_name?: string | null
          response_data?: Json
          status?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submission_rate_limits: {
        Row: {
          form_id: string
          id: string
          ip_hash: string
          submitted_at: string
        }
        Insert: {
          form_id: string
          id?: string
          ip_hash: string
          submitted_at?: string
        }
        Update: {
          form_id?: string
          id?: string
          ip_hash?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submission_rate_limits_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          fields_data: Json
          id: string
          is_public: boolean | null
          name: string
          template_data: Json
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields_data?: Json
          id?: string
          is_public?: boolean | null
          name: string
          template_data?: Json
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields_data?: Json
          id?: string
          is_public?: boolean | null
          name?: string
          template_data?: Json
          updated_at?: string
        }
        Relationships: []
      }
      forms: {
        Row: {
          allow_multiple_submissions: boolean
          confirmation_message: string | null
          created_at: string
          custom_slug: string | null
          description: string | null
          end_date: string | null
          id: string
          is_accepting_responses: boolean
          is_active: boolean
          logo_url: string | null
          payment_amount: number | null
          payment_currency: string | null
          requires_payment: boolean | null
          start_date: string | null
          title: string
          total_pages: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_multiple_submissions?: boolean
          confirmation_message?: string | null
          created_at?: string
          custom_slug?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_accepting_responses?: boolean
          is_active?: boolean
          logo_url?: string | null
          payment_amount?: number | null
          payment_currency?: string | null
          requires_payment?: boolean | null
          start_date?: string | null
          title: string
          total_pages?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_multiple_submissions?: boolean
          confirmation_message?: string | null
          created_at?: string
          custom_slug?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_accepting_responses?: boolean
          is_active?: boolean
          logo_url?: string | null
          payment_amount?: number | null
          payment_currency?: string | null
          requires_payment?: boolean | null
          start_date?: string | null
          title?: string
          total_pages?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fraud_alerts: {
        Row: {
          alert_type: string
          created_at: string
          description: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          description: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          description?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_rules: {
        Row: {
          auto_block: boolean
          auto_flag: boolean
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          rule_name: string
          rule_type: string
          severity: string
          threshold_unit: string | null
          threshold_value: number
          updated_at: string
        }
        Insert: {
          auto_block?: boolean
          auto_flag?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          rule_name: string
          rule_type: string
          severity?: string
          threshold_unit?: string | null
          threshold_value: number
          updated_at?: string
        }
        Update: {
          auto_block?: boolean
          auto_flag?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          rule_name?: string
          rule_type?: string
          severity?: string
          threshold_unit?: string | null
          threshold_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      influencer_clicks: {
        Row: {
          clicked_at: string
          conversion_amount: number | null
          converted: boolean
          converted_at: string | null
          id: string
          ip_hash: string | null
          link_id: string
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          clicked_at?: string
          conversion_amount?: number | null
          converted?: boolean
          converted_at?: string | null
          id?: string
          ip_hash?: string | null
          link_id: string
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          clicked_at?: string
          conversion_amount?: number | null
          converted?: boolean
          converted_at?: string | null
          id?: string
          ip_hash?: string | null
          link_id?: string
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "influencer_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "influencer_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "influencer_links_public"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_links: {
        Row: {
          code: string
          commission_currency: string | null
          commission_type: string
          commission_value: number
          contest_id: string | null
          created_at: string
          discount_type: string | null
          discount_value: number | null
          event_id: string | null
          id: string
          influencer_email: string | null
          influencer_user_id: string | null
          is_active: boolean
          name: string
          organization_id: string
          total_clicks: number
          total_commission: number
          total_conversions: number
          total_revenue: number
          updated_at: string
        }
        Insert: {
          code: string
          commission_currency?: string | null
          commission_type?: string
          commission_value?: number
          contest_id?: string | null
          created_at?: string
          discount_type?: string | null
          discount_value?: number | null
          event_id?: string | null
          id?: string
          influencer_email?: string | null
          influencer_user_id?: string | null
          is_active?: boolean
          name: string
          organization_id: string
          total_clicks?: number
          total_commission?: number
          total_conversions?: number
          total_revenue?: number
          updated_at?: string
        }
        Update: {
          code?: string
          commission_currency?: string | null
          commission_type?: string
          commission_value?: number
          contest_id?: string | null
          created_at?: string
          discount_type?: string | null
          discount_value?: number | null
          event_id?: string | null
          id?: string
          influencer_email?: string | null
          influencer_user_id?: string | null
          is_active?: boolean
          name?: string
          organization_id?: string
          total_clicks?: number
          total_commission?: number
          total_conversions?: number
          total_revenue?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencer_links_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_links_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_payouts: {
        Row: {
          account_name: string | null
          account_number: string | null
          amount: number
          bank_name: string | null
          created_at: string
          currency: string | null
          id: string
          influencer_user_id: string
          payment_method: string
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          status: string | null
          updated_at: string
          usdt_address: string | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          amount: number
          bank_name?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          influencer_user_id: string
          payment_method: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string
          usdt_address?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          amount?: number
          bank_name?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          influencer_user_id?: string
          payment_method?: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string
          usdt_address?: string | null
        }
        Relationships: []
      }
      influencer_profiles: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_name: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          paid_earnings: number | null
          payment_method: string | null
          pending_earnings: number | null
          total_earnings: number | null
          updated_at: string
          usdt_address: string | null
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          paid_earnings?: number | null
          payment_method?: string | null
          pending_earnings?: number | null
          total_earnings?: number | null
          updated_at?: string
          usdt_address?: string | null
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          paid_earnings?: number | null
          payment_method?: string | null
          pending_earnings?: number | null
          total_earnings?: number | null
          updated_at?: string
          usdt_address?: string | null
          user_id?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip_hash: string | null
          success: boolean
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip_hash?: string | null
          success?: boolean
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip_hash?: string | null
          success?: boolean
        }
        Relationships: []
      }
      nomination_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          name: string
          nomination_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          name: string
          nomination_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          name?: string
          nomination_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nomination_categories_nomination_id_fkey"
            columns: ["nomination_id"]
            isOneToOne: false
            referencedRelation: "nominations"
            referencedColumns: ["id"]
          },
        ]
      }
      nomination_submissions: {
        Row: {
          category_id: string
          created_at: string
          id: string
          nominee_name: string
          submitter_email: string | null
          submitter_name: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          nominee_name: string
          submitter_email?: string | null
          submitter_name?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          nominee_name?: string
          submitter_email?: string | null
          submitter_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nomination_submissions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "nomination_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      nominations: {
        Row: {
          created_at: string
          custom_slug: string | null
          description: string | null
          end_date: string
          id: string
          is_active: boolean
          logo_url: string | null
          organization_id: string
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_slug?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          organization_id: string
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_slug?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          organization_id?: string
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_campaign_milestones: boolean
          email_donation_updates: boolean
          email_new_donations: boolean
          email_weekly_summary: boolean
          id: string
          push_campaign_milestones: boolean
          push_donation_updates: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_campaign_milestones?: boolean
          email_donation_updates?: boolean
          email_new_donations?: boolean
          email_weekly_summary?: boolean
          id?: string
          push_campaign_milestones?: boolean
          push_donation_updates?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_campaign_milestones?: boolean
          email_donation_updates?: boolean
          email_new_donations?: boolean
          email_weekly_summary?: boolean
          id?: string
          push_campaign_milestones?: boolean
          push_donation_updates?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_approvals: {
        Row: {
          blacklist_reason: string | null
          blacklisted_at: string | null
          created_at: string
          id: string
          is_blacklisted: boolean
          organization_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          special_commission_rate: number | null
          status: string
          ticket_commission_rate: number | null
          updated_at: string
          vote_commission_rate: number | null
        }
        Insert: {
          blacklist_reason?: string | null
          blacklisted_at?: string | null
          created_at?: string
          id?: string
          is_blacklisted?: boolean
          organization_id: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          special_commission_rate?: number | null
          status?: string
          ticket_commission_rate?: number | null
          updated_at?: string
          vote_commission_rate?: number | null
        }
        Update: {
          blacklist_reason?: string | null
          blacklisted_at?: string | null
          created_at?: string
          id?: string
          is_blacklisted?: boolean
          organization_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          special_commission_rate?: number | null
          status?: string
          ticket_commission_rate?: number | null
          updated_at?: string
          vote_commission_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_approvals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_approvals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          account_name: string | null
          account_number: string | null
          account_number_encrypted: string | null
          bank_name: string | null
          company_address: string | null
          company_email: string | null
          company_name: string | null
          company_phone: string | null
          created_at: string
          default_currency: string
          id: string
          organization_id: string
          preferred_payout_method: string | null
          updated_at: string
          usdt_address: string | null
          usdt_address_encrypted: string | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          account_number_encrypted?: string | null
          bank_name?: string | null
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string
          default_currency?: string
          id?: string
          organization_id: string
          preferred_payout_method?: string | null
          updated_at?: string
          usdt_address?: string | null
          usdt_address_encrypted?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          account_number_encrypted?: string | null
          bank_name?: string | null
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string
          default_currency?: string
          id?: string
          organization_id?: string
          preferred_payout_method?: string | null
          updated_at?: string
          usdt_address?: string | null
          usdt_address_encrypted?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_social_accounts: {
        Row: {
          access_token: string | null
          account_name: string | null
          created_at: string
          id: string
          is_connected: boolean
          organization_id: string
          platform: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          account_name?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          organization_id: string
          platform: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          account_name?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          organization_id?: string
          platform?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_social_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_webhooks: {
        Row: {
          created_at: string
          events: string[]
          failure_count: number
          id: string
          is_active: boolean
          last_triggered_at: string | null
          name: string
          organization_id: string
          secret: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          failure_count?: number
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name: string
          organization_id: string
          secret?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          events?: string[]
          failure_count?: number
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name?: string
          organization_id?: string
          secret?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_webhooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          account_name: string | null
          account_number: string | null
          account_number_encrypted: string | null
          amount: number
          bank_name: string | null
          created_at: string
          currency: string
          id: string
          organization_id: string
          payment_method: string
          processed_at: string | null
          reference_id: string | null
          status: string
          updated_at: string
          usdt_address: string | null
          usdt_address_encrypted: string | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          account_number_encrypted?: string | null
          amount: number
          bank_name?: string | null
          created_at?: string
          currency?: string
          id?: string
          organization_id: string
          payment_method?: string
          processed_at?: string | null
          reference_id?: string | null
          status?: string
          updated_at?: string
          usdt_address?: string | null
          usdt_address_encrypted?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          account_number_encrypted?: string | null
          amount?: number
          bank_name?: string | null
          created_at?: string
          currency?: string
          id?: string
          organization_id?: string
          payment_method?: string
          processed_at?: string | null
          reference_id?: string | null
          status?: string
          updated_at?: string
          usdt_address?: string | null
          usdt_address_encrypted?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_type: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_type?: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_type?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type_selected: boolean
          avatar_url: string | null
          created_at: string
          email: string | null
          fraud_score: number
          full_name: string | null
          id: string
          is_suspended: boolean
          phone: string | null
          suspended_at: string | null
          suspended_reason: string | null
          updated_at: string
        }
        Insert: {
          account_type_selected?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          fraud_score?: number
          full_name?: string | null
          id: string
          is_suspended?: boolean
          phone?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
        }
        Update: {
          account_type_selected?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          fraud_score?: number
          full_name?: string | null
          id?: string
          is_suspended?: boolean
          phone?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promo_code_usage: {
        Row: {
          contest_id: string | null
          created_at: string
          discount_amount: number
          email: string | null
          event_id: string | null
          final_amount: number
          id: string
          order_amount: number
          order_type: string
          promo_code_id: string
          ticket_type_id: string | null
          transaction_reference: string | null
          user_id: string
        }
        Insert: {
          contest_id?: string | null
          created_at?: string
          discount_amount: number
          email?: string | null
          event_id?: string | null
          final_amount: number
          id?: string
          order_amount: number
          order_type: string
          promo_code_id: string
          ticket_type_id?: string | null
          transaction_reference?: string | null
          user_id: string
        }
        Update: {
          contest_id?: string | null
          created_at?: string
          discount_amount?: number
          email?: string | null
          event_id?: string | null
          final_amount?: number
          id?: string
          order_amount?: number
          order_type?: string
          promo_code_id?: string
          ticket_type_id?: string | null
          transaction_reference?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_usage_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_usage_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_usage_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_usage_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          applicable_to: string
          code: string
          contest_id: string | null
          created_at: string
          current_uses: number
          discount_type: string
          discount_value: number
          event_id: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          organization_id: string
          ticket_type_id: string | null
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applicable_to?: string
          code: string
          contest_id?: string | null
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value: number
          event_id?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          organization_id: string
          ticket_type_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          applicable_to?: string
          code?: string
          contest_id?: string | null
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value?: number
          event_id?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          organization_id?: string
          ticket_type_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_codes_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_scan_logs: {
        Row: {
          event_id: string
          id: string
          scan_result: string
          scanned_at: string
          scanned_by: string | null
          ticket_id: string
        }
        Insert: {
          event_id: string
          id?: string
          scan_result?: string
          scanned_at?: string
          scanned_by?: string | null
          ticket_id: string
        }
        Update: {
          event_id?: string
          id?: string
          scan_result?: string
          scanned_at?: string
          scanned_by?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_scan_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_scan_logs_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_scan_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_scan_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets_public"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          created_at: string
          id: string
          original_transaction_id: string
          original_transaction_type: string
          processed_at: string | null
          processed_by: string | null
          reason: string
          rejection_reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          original_transaction_id: string
          original_transaction_type: string
          processed_at?: string | null
          processed_by?: string | null
          reason: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          original_transaction_id?: string
          original_transaction_type?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      social_post_logs: {
        Row: {
          content: string | null
          contest_id: string
          engagement_clicks: number | null
          engagement_impressions: number | null
          error_message: string | null
          id: string
          organization_id: string
          platform: string
          post_type: string
          posted_at: string
          status: string
        }
        Insert: {
          content?: string | null
          contest_id: string
          engagement_clicks?: number | null
          engagement_impressions?: number | null
          error_message?: string | null
          id?: string
          organization_id: string
          platform: string
          post_type: string
          posted_at?: string
          status?: string
        }
        Update: {
          content?: string | null
          contest_id?: string
          engagement_clicks?: number | null
          engagement_impressions?: number | null
          error_message?: string | null
          id?: string
          organization_id?: string
          platform?: string
          post_type?: string
          posted_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_logs_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_staff_reply: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_staff_reply?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_staff_reply?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          description: string
          id: string
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description: string
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_at: string
          name: string | null
          organization_id: string
          permissions: Json | null
          role: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_at?: string
          name?: string | null
          organization_id: string
          permissions?: Json | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_at?: string
          name?: string | null
          organization_id?: string
          permissions?: Json | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_transfers: {
        Row: {
          completed_at: string | null
          created_at: string
          expires_at: string
          from_user_id: string
          id: string
          status: string
          ticket_id: string
          to_user_email: string
          to_user_id: string
          transfer_code: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          from_user_id: string
          id?: string
          status?: string
          ticket_id: string
          to_user_email: string
          to_user_id: string
          transfer_code: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          from_user_id?: string
          id?: string
          status?: string
          ticket_id?: string
          to_user_email?: string
          to_user_id?: string
          transfer_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_transfers_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_transfers_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_types: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          event_id: string
          id: string
          name: string
          price: number
          quantity_available: number
          quantity_sold: number
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          event_id: string
          id?: string
          name: string
          price: number
          quantity_available: number
          quantity_sold?: number
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          event_id?: string
          id?: string
          name?: string
          price?: number
          quantity_available?: number
          quantity_sold?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          amount_paid: number
          created_at: string
          event_id: string
          guest_email: string | null
          guest_name: string | null
          id: string
          net_amount: number | null
          payment_method: string
          payment_reference_id: string | null
          platform_commission: number | null
          qr_code: string
          quantity: number
          status: string
          ticket_type_id: string
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_paid: number
          created_at?: string
          event_id: string
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          net_amount?: number | null
          payment_method: string
          payment_reference_id?: string | null
          platform_commission?: number | null
          qr_code: string
          quantity?: number
          status?: string
          ticket_type_id: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_paid?: number
          created_at?: string
          event_id?: string
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          net_amount?: number | null
          payment_method?: string
          payment_reference_id?: string | null
          platform_commission?: number | null
          qr_code?: string
          quantity?: number
          status?: string
          ticket_type_id?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      user_vote_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_vote_date: string | null
          longest_streak: number
          total_streak_bonuses_earned: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_vote_date?: string | null
          longest_streak?: number
          total_streak_bonuses_earned?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_vote_date?: string | null
          longest_streak?: number
          total_streak_bonuses_earned?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          amount_paid: number
          contest_id: string
          contestant_id: string
          created_at: string
          currency: string | null
          guest_email: string | null
          guest_name: string | null
          id: string
          net_amount: number | null
          payment_method: string
          platform_commission: number | null
          quantity: number
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_paid: number
          contest_id: string
          contestant_id: string
          created_at?: string
          currency?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          net_amount?: number | null
          payment_method: string
          platform_commission?: number | null
          quantity?: number
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_paid?: number
          contest_id?: string
          contestant_id?: string
          created_at?: string
          currency?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          net_amount?: number | null
          payment_method?: string
          platform_commission?: number | null
          quantity?: number
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "votes_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_contestant_id_fkey"
            columns: ["contestant_id"]
            isOneToOne: false
            referencedRelation: "contestants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          amount: number
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_used: boolean
          used_by: string | null
        }
        Insert: {
          amount: number
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_used?: boolean
          used_by?: string | null
        }
        Update: {
          amount?: number
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_used?: boolean
          used_by?: string | null
        }
        Relationships: []
      }
      wallet_currency_balances: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          updated_at: string
          wallet_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency: string
          id?: string
          updated_at?: string
          wallet_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_currency_balances_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          reference_id: string | null
          status: string
          type: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string
          type: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string
          type?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          balance_currency: string
          created_at: string
          id: string
          low_balance_threshold: number | null
          referral_code: string | null
          referral_earnings: number
          referred_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          balance_currency?: string
          created_at?: string
          id?: string
          low_balance_threshold?: number | null
          referral_code?: string | null
          referral_earnings?: number
          referred_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          balance_currency?: string
          created_at?: string
          id?: string
          low_balance_threshold?: number | null
          referral_code?: string | null
          referral_earnings?: number
          referred_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          success: boolean
          webhook_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
          success?: boolean
          webhook_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          success?: boolean
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "organization_webhooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "organization_webhooks_safe"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      donations_public: {
        Row: {
          amount: number | null
          campaign_id: string | null
          created_at: string | null
          currency: string | null
          donor_id: string | null
          donor_message: string | null
          guest_email: string | null
          guest_name: string | null
          id: string | null
          is_anonymous: boolean | null
          payment_method: string | null
          status: string | null
        }
        Insert: {
          amount?: number | null
          campaign_id?: string | null
          created_at?: string | null
          currency?: string | null
          donor_id?: string | null
          donor_message?: string | null
          guest_email?: never
          guest_name?: never
          id?: string | null
          is_anonymous?: boolean | null
          payment_method?: string | null
          status?: string | null
        }
        Update: {
          amount?: number | null
          campaign_id?: string | null
          created_at?: string | null
          currency?: string | null
          donor_id?: string | null
          donor_message?: string | null
          guest_email?: never
          guest_name?: never
          id?: string | null
          is_anonymous?: boolean | null
          payment_method?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      donations_safe: {
        Row: {
          amount: number | null
          campaign_id: string | null
          created_at: string | null
          currency: string | null
          donor_id: string | null
          donor_message: string | null
          id: string | null
          is_anonymous: boolean | null
          payment_method: string | null
          status: string | null
          transaction_id: string | null
        }
        Insert: {
          amount?: number | null
          campaign_id?: string | null
          created_at?: string | null
          currency?: string | null
          donor_id?: never
          donor_message?: never
          id?: string | null
          is_anonymous?: boolean | null
          payment_method?: string | null
          status?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number | null
          campaign_id?: string | null
          created_at?: string | null
          currency?: string | null
          donor_id?: never
          donor_message?: never
          id?: string | null
          is_anonymous?: boolean | null
          payment_method?: string | null
          status?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_links_public: {
        Row: {
          code: string | null
          commission_currency: string | null
          commission_type: string | null
          commission_value: number | null
          contest_id: string | null
          created_at: string | null
          discount_type: string | null
          discount_value: number | null
          event_id: string | null
          id: string | null
          is_active: boolean | null
          organization_id: string | null
          total_clicks: number | null
          total_conversions: number | null
        }
        Insert: {
          code?: string | null
          commission_currency?: string | null
          commission_type?: string | null
          commission_value?: number | null
          contest_id?: string | null
          created_at?: string | null
          discount_type?: string | null
          discount_value?: number | null
          event_id?: string | null
          id?: string | null
          is_active?: boolean | null
          organization_id?: string | null
          total_clicks?: number | null
          total_conversions?: number | null
        }
        Update: {
          code?: string | null
          commission_currency?: string | null
          commission_type?: string | null
          commission_value?: number | null
          contest_id?: string | null
          created_at?: string | null
          discount_type?: string | null
          discount_value?: number | null
          event_id?: string | null
          id?: string | null
          is_active?: boolean | null
          organization_id?: string | null
          total_clicks?: number | null
          total_conversions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "influencer_links_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_links_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      influencer_payouts_safe: {
        Row: {
          account_name: string | null
          account_number: string | null
          amount: number | null
          bank_name: string | null
          created_at: string | null
          currency: string | null
          id: string | null
          influencer_user_id: string | null
          payment_method: string | null
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          status: string | null
          updated_at: string | null
          usdt_address: string | null
        }
        Insert: {
          account_name?: never
          account_number?: never
          amount?: number | null
          bank_name?: never
          created_at?: string | null
          currency?: string | null
          id?: string | null
          influencer_user_id?: string | null
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string | null
          usdt_address?: never
        }
        Update: {
          account_name?: never
          account_number?: never
          amount?: number | null
          bank_name?: never
          created_at?: string | null
          currency?: string | null
          id?: string | null
          influencer_user_id?: string | null
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string | null
          usdt_address?: never
        }
        Relationships: []
      }
      influencer_profiles_safe: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_name: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          paid_earnings: number | null
          payment_method: string | null
          pending_earnings: number | null
          total_earnings: number | null
          updated_at: string | null
          usdt_address: string | null
          user_id: string | null
        }
        Insert: {
          account_name?: never
          account_number?: never
          bank_name?: never
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          paid_earnings?: number | null
          payment_method?: string | null
          pending_earnings?: number | null
          total_earnings?: number | null
          updated_at?: string | null
          usdt_address?: never
          user_id?: string | null
        }
        Update: {
          account_name?: never
          account_number?: never
          bank_name?: never
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          paid_earnings?: number | null
          payment_method?: string | null
          pending_earnings?: number | null
          total_earnings?: number | null
          updated_at?: string | null
          usdt_address?: never
          user_id?: string | null
        }
        Relationships: []
      }
      organization_settings_admin: {
        Row: {
          account_name: string | null
          account_number: string | null
          account_number_decrypted: string | null
          account_number_encrypted: string | null
          bank_name: string | null
          company_address: string | null
          company_email: string | null
          company_name: string | null
          company_phone: string | null
          created_at: string | null
          default_currency: string | null
          id: string | null
          organization_id: string | null
          preferred_payout_method: string | null
          updated_at: string | null
          usdt_address: string | null
          usdt_address_decrypted: string | null
          usdt_address_encrypted: string | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          account_number_decrypted?: never
          account_number_encrypted?: string | null
          bank_name?: string | null
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string | null
          default_currency?: string | null
          id?: string | null
          organization_id?: string | null
          preferred_payout_method?: string | null
          updated_at?: string | null
          usdt_address?: string | null
          usdt_address_decrypted?: never
          usdt_address_encrypted?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          account_number_decrypted?: never
          account_number_encrypted?: string | null
          bank_name?: string | null
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string | null
          default_currency?: string | null
          id?: string | null
          organization_id?: string | null
          preferred_payout_method?: string | null
          updated_at?: string | null
          usdt_address?: string | null
          usdt_address_decrypted?: never
          usdt_address_encrypted?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings_safe: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_name: string | null
          company_address: string | null
          company_email: string | null
          company_name: string | null
          company_phone: string | null
          created_at: string | null
          default_currency: string | null
          id: string | null
          organization_id: string | null
          preferred_payout_method: string | null
          updated_at: string | null
          usdt_address: string | null
        }
        Insert: {
          account_name?: never
          account_number?: never
          bank_name?: never
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string | null
          default_currency?: string | null
          id?: string | null
          organization_id?: string | null
          preferred_payout_method?: string | null
          updated_at?: string | null
          usdt_address?: never
        }
        Update: {
          account_name?: never
          account_number?: never
          bank_name?: never
          company_address?: string | null
          company_email?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string | null
          default_currency?: string | null
          id?: string | null
          organization_id?: string | null
          preferred_payout_method?: string | null
          updated_at?: string | null
          usdt_address?: never
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_social_accounts_safe: {
        Row: {
          account_name: string | null
          created_at: string | null
          id: string | null
          is_connected: boolean | null
          organization_id: string | null
          platform: string | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          account_name?: string | null
          created_at?: string | null
          id?: string | null
          is_connected?: boolean | null
          organization_id?: string | null
          platform?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string | null
          created_at?: string | null
          id?: string | null
          is_connected?: boolean | null
          organization_id?: string | null
          platform?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_social_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_webhooks_safe: {
        Row: {
          created_at: string | null
          events: string[] | null
          failure_count: number | null
          id: string | null
          is_active: boolean | null
          last_triggered_at: string | null
          name: string | null
          organization_id: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          events?: string[] | null
          failure_count?: number | null
          id?: string | null
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string | null
          organization_id?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          events?: string[] | null
          failure_count?: number | null
          id?: string | null
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string | null
          organization_id?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_webhooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts_admin: {
        Row: {
          account_name: string | null
          account_number: string | null
          account_number_decrypted: string | null
          account_number_encrypted: string | null
          amount: number | null
          bank_name: string | null
          created_at: string | null
          currency: string | null
          id: string | null
          organization_id: string | null
          payment_method: string | null
          processed_at: string | null
          reference_id: string | null
          status: string | null
          updated_at: string | null
          usdt_address: string | null
          usdt_address_decrypted: string | null
          usdt_address_encrypted: string | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          account_number_decrypted?: never
          account_number_encrypted?: string | null
          amount?: number | null
          bank_name?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string | null
          organization_id?: string | null
          payment_method?: string | null
          processed_at?: string | null
          reference_id?: string | null
          status?: string | null
          updated_at?: string | null
          usdt_address?: string | null
          usdt_address_decrypted?: never
          usdt_address_encrypted?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          account_number_decrypted?: never
          account_number_encrypted?: string | null
          amount?: number | null
          bank_name?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string | null
          organization_id?: string | null
          payment_method?: string | null
          processed_at?: string | null
          reference_id?: string | null
          status?: string | null
          updated_at?: string | null
          usdt_address?: string | null
          usdt_address_decrypted?: never
          usdt_address_encrypted?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts_safe: {
        Row: {
          account_name: string | null
          account_number: string | null
          amount: number | null
          bank_name: string | null
          created_at: string | null
          currency: string | null
          id: string | null
          organization_id: string | null
          payment_method: string | null
          processed_at: string | null
          reference_id: string | null
          status: string | null
          updated_at: string | null
          usdt_address: string | null
        }
        Insert: {
          account_name?: never
          account_number?: never
          amount?: number | null
          bank_name?: never
          created_at?: string | null
          currency?: string | null
          id?: string | null
          organization_id?: string | null
          payment_method?: string | null
          processed_at?: string | null
          reference_id?: string | null
          status?: string | null
          updated_at?: string | null
          usdt_address?: never
        }
        Update: {
          account_name?: never
          account_number?: never
          amount?: number | null
          bank_name?: never
          created_at?: string | null
          currency?: string | null
          id?: string | null
          organization_id?: string | null
          payment_method?: string | null
          processed_at?: string | null
          reference_id?: string | null
          status?: string | null
          updated_at?: string | null
          usdt_address?: never
        }
        Relationships: [
          {
            foreignKeyName: "payouts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets_public: {
        Row: {
          amount_paid: number | null
          created_at: string | null
          event_id: string | null
          guest_email: string | null
          guest_name: string | null
          id: string | null
          net_amount: number | null
          payment_method: string | null
          payment_reference_id: string | null
          platform_commission: number | null
          qr_code: string | null
          quantity: number | null
          status: string | null
          ticket_type_id: string | null
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string | null
          event_id?: string | null
          guest_email?: never
          guest_name?: never
          id?: string | null
          net_amount?: number | null
          payment_method?: string | null
          payment_reference_id?: string | null
          platform_commission?: number | null
          qr_code?: string | null
          quantity?: number | null
          status?: string | null
          ticket_type_id?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_paid?: number | null
          created_at?: string | null
          event_id?: string | null
          guest_email?: never
          guest_name?: never
          id?: string | null
          net_amount?: number | null
          payment_method?: string | null
          payment_reference_id?: string | null
          platform_commission?: number | null
          qr_code?: string | null
          quantity?: number | null
          status?: string | null
          ticket_type_id?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      votes_public: {
        Row: {
          amount_paid: number | null
          contest_id: string | null
          contestant_id: string | null
          created_at: string | null
          currency: string | null
          guest_email: string | null
          guest_name: string | null
          id: string | null
          net_amount: number | null
          payment_method: string | null
          platform_commission: number | null
          quantity: number | null
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_paid?: number | null
          contest_id?: string | null
          contestant_id?: string | null
          created_at?: string | null
          currency?: string | null
          guest_email?: never
          guest_name?: never
          id?: string | null
          net_amount?: number | null
          payment_method?: string | null
          platform_commission?: number | null
          quantity?: number | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_paid?: number | null
          contest_id?: string | null
          contestant_id?: string | null
          created_at?: string | null
          currency?: string | null
          guest_email?: never
          guest_name?: never
          id?: string | null
          net_amount?: number | null
          payment_method?: string | null
          platform_commission?: number | null
          quantity?: number | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "votes_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_contestant_id_fkey"
            columns: ["contestant_id"]
            isOneToOne: false
            referencedRelation: "contestants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_login_rate_limit: {
        Args: { p_email: string; p_ip_hash?: string }
        Returns: Json
      }
      clear_login_attempts: { Args: { p_email: string }; Returns: undefined }
      decrypt_banking_data: {
        Args: { encrypted_data: string }
        Returns: string
      }
      encrypt_banking_data: { Args: { plain_text: string }; Returns: string }
      get_admin_statistics: { Args: never; Returns: Json }
      get_referral_leaderboard: {
        Args: { limit_count?: number }
        Returns: {
          avatar_url: string
          display_name: string
          referral_count: number
          total_earnings: number
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      record_login_attempt: {
        Args: { p_email: string; p_ip_hash?: string; p_success: boolean }
        Returns: undefined
      }
      redeem_voucher_safely: {
        Args: { p_user_id: string; p_voucher_id: string }
        Returns: Json
      }
      send_notification: {
        Args: {
          p_message: string
          p_reference_id?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      set_account_type: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      track_campaign_view: {
        Args: { p_campaign_id: string; p_source?: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "organization" | "influencer"
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
      app_role: ["admin", "moderator", "user", "organization", "influencer"],
    },
  },
} as const
