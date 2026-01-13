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
      booked_seats: {
        Row: {
          booking_id: string
          id: string
          price: number
          row_label: string
          seat_number: number
          seat_type: string
          showtime_id: string
        }
        Insert: {
          booking_id: string
          id?: string
          price: number
          row_label: string
          seat_number: number
          seat_type?: string
          showtime_id: string
        }
        Update: {
          booking_id?: string
          id?: string
          price?: number
          row_label?: string
          seat_number?: number
          seat_type?: string
          showtime_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booked_seats_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booked_seats_showtime_id_fkey"
            columns: ["showtime_id"]
            isOneToOne: false
            referencedRelation: "showtimes"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_combos: {
        Row: {
          booking_id: string
          combo_deal_id: string
          created_at: string
          id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          booking_id: string
          combo_deal_id: string
          created_at?: string
          id?: string
          quantity?: number
          unit_price: number
        }
        Update: {
          booking_id?: string
          combo_deal_id?: string
          created_at?: string
          id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_combos_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_combos_combo_deal_id_fkey"
            columns: ["combo_deal_id"]
            isOneToOne: false
            referencedRelation: "combo_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_concessions: {
        Row: {
          booking_id: string
          concession_item_id: string
          created_at: string
          id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          booking_id: string
          concession_item_id: string
          created_at?: string
          id?: string
          quantity?: number
          unit_price: number
        }
        Update: {
          booking_id?: string
          concession_item_id?: string
          created_at?: string
          id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_concessions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_concessions_concession_item_id_fkey"
            columns: ["concession_item_id"]
            isOneToOne: false
            referencedRelation: "concession_items"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_reference: string
          created_at: string
          customer_email: string
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          discount_amount: number | null
          id: string
          organization_id: string
          promo_code_id: string | null
          reminder_sent: boolean
          showtime_id: string
          status: string
          total_amount: number
        }
        Insert: {
          booking_reference: string
          created_at?: string
          customer_email: string
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          discount_amount?: number | null
          id?: string
          organization_id: string
          promo_code_id?: string | null
          reminder_sent?: boolean
          showtime_id: string
          status?: string
          total_amount: number
        }
        Update: {
          booking_reference?: string
          created_at?: string
          customer_email?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          discount_amount?: number | null
          id?: string
          organization_id?: string
          promo_code_id?: string | null
          reminder_sent?: boolean
          showtime_id?: string
          status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_showtime_id_fkey"
            columns: ["showtime_id"]
            isOneToOne: false
            referencedRelation: "showtimes"
            referencedColumns: ["id"]
          },
        ]
      }
      cinema_jobs: {
        Row: {
          created_at: string
          department: string
          description: string | null
          id: string
          is_active: boolean
          location: string
          organization_id: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department: string
          description?: string | null
          id?: string
          is_active?: boolean
          location?: string
          organization_id: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string
          description?: string | null
          id?: string
          is_active?: boolean
          location?: string
          organization_id?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cinema_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cinema_subscriptions: {
        Row: {
          billing_email: string | null
          cancelled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          discount_expires_at: string | null
          discount_percentage: number | null
          id: string
          organization_id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_email?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end: string
          current_period_start?: string
          discount_expires_at?: string | null
          discount_percentage?: number | null
          id?: string
          organization_id: string
          plan_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_email?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          discount_expires_at?: string | null
          discount_percentage?: number | null
          id?: string
          organization_id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cinema_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cinema_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      combo_deal_items: {
        Row: {
          combo_deal_id: string
          concession_item_id: string
          id: string
          quantity: number
        }
        Insert: {
          combo_deal_id: string
          concession_item_id: string
          id?: string
          quantity?: number
        }
        Update: {
          combo_deal_id?: string
          concession_item_id?: string
          id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "combo_deal_items_combo_deal_id_fkey"
            columns: ["combo_deal_id"]
            isOneToOne: false
            referencedRelation: "combo_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_deal_items_concession_item_id_fkey"
            columns: ["concession_item_id"]
            isOneToOne: false
            referencedRelation: "concession_items"
            referencedColumns: ["id"]
          },
        ]
      }
      combo_deals: {
        Row: {
          available_days: number[] | null
          available_from: string | null
          available_until: string | null
          combo_price: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          original_price: number
          updated_at: string
        }
        Insert: {
          available_days?: number[] | null
          available_from?: string | null
          available_until?: string | null
          combo_price: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          original_price: number
          updated_at?: string
        }
        Update: {
          available_days?: number[] | null
          available_from?: string | null
          available_until?: string | null
          combo_price?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          original_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "combo_deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      concession_items: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_available: boolean
          low_stock_threshold: number | null
          name: string
          organization_id: string
          price: number
          stock_quantity: number | null
          track_inventory: boolean | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          low_stock_threshold?: number | null
          name: string
          organization_id: string
          price: number
          stock_quantity?: number | null
          track_inventory?: boolean | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          low_stock_threshold?: number | null
          name?: string
          organization_id?: string
          price?: number
          stock_quantity?: number | null
          track_inventory?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concession_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
          organization_id: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
          organization_id: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          organization_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_submissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string
          first_booking_at: string | null
          full_name: string
          id: string
          last_booking_at: string | null
          loyalty_points: number
          notes: string | null
          organization_id: string
          phone: string | null
          total_bookings: number
          total_spent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_booking_at?: string | null
          full_name: string
          id?: string
          last_booking_at?: string | null
          loyalty_points?: number
          notes?: string | null
          organization_id: string
          phone?: string | null
          total_bookings?: number
          total_spent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_booking_at?: string | null
          full_name?: string
          id?: string
          last_booking_at?: string | null
          loyalty_points?: number
          notes?: string | null
          organization_id?: string
          phone?: string | null
          total_bookings?: number
          total_spent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_records: {
        Row: {
          created_at: string
          dns_verification_token: string | null
          dns_verified: boolean | null
          domain: string
          domain_type: string
          error_message: string | null
          id: string
          is_primary: boolean | null
          last_checked_at: string | null
          organization_id: string
          ssl_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dns_verification_token?: string | null
          dns_verified?: boolean | null
          domain: string
          domain_type: string
          error_message?: string | null
          id?: string
          is_primary?: boolean | null
          last_checked_at?: string | null
          organization_id: string
          ssl_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dns_verification_token?: string | null
          dns_verified?: boolean | null
          domain?: string
          domain_type?: string
          error_message?: string | null
          id?: string
          is_primary?: boolean | null
          last_checked_at?: string | null
          organization_id?: string
          ssl_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_analytics: {
        Row: {
          booking_id: string | null
          clicked_at: string | null
          clicked_count: number | null
          created_at: string
          email_type: string
          id: string
          opened_at: string | null
          opened_count: number | null
          organization_id: string
          recipient_email: string
          sent_at: string
          subject: string | null
          tracking_id: string
        }
        Insert: {
          booking_id?: string | null
          clicked_at?: string | null
          clicked_count?: number | null
          created_at?: string
          email_type: string
          id?: string
          opened_at?: string | null
          opened_count?: number | null
          organization_id: string
          recipient_email: string
          sent_at?: string
          subject?: string | null
          tracking_id?: string
        }
        Update: {
          booking_id?: string | null
          clicked_at?: string | null
          clicked_count?: number | null
          created_at?: string
          email_type?: string
          id?: string
          opened_at?: string | null
          opened_count?: number | null
          organization_id?: string
          recipient_email?: string
          sent_at?: string
          subject?: string | null
          tracking_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_analytics_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_analytics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string
          html_body: string
          id: string
          is_active: boolean
          organization_id: string
          subject: string
          template_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          html_body: string
          id?: string
          is_active?: boolean
          organization_id: string
          subject: string
          template_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          html_body?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          subject?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_history: {
        Row: {
          change_amount: number
          change_type: string
          concession_item_id: string
          created_at: string
          created_by: string | null
          id: string
          new_quantity: number
          notes: string | null
          organization_id: string
          previous_quantity: number | null
        }
        Insert: {
          change_amount: number
          change_type: string
          concession_item_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          new_quantity: number
          notes?: string | null
          organization_id: string
          previous_quantity?: number | null
        }
        Update: {
          change_amount?: number
          change_type?: string
          concession_item_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          new_quantity?: number
          notes?: string | null
          organization_id?: string
          previous_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_history_concession_item_id_fkey"
            columns: ["concession_item_id"]
            isOneToOne: false
            referencedRelation: "concession_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          applicant_email: string
          applicant_name: string
          applicant_phone: string | null
          cover_letter: string | null
          created_at: string
          id: string
          job_id: string
          organization_id: string
          resume_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          applicant_email: string
          applicant_name: string
          applicant_phone?: string | null
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id: string
          organization_id: string
          resume_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_email?: string
          applicant_name?: string
          applicant_phone?: string | null
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id?: string
          organization_id?: string
          resume_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "cinema_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      low_stock_notifications: {
        Row: {
          created_at: string
          id: string
          items: Json
          notified_email: string | null
          organization_id: string
          sent_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          items: Json
          notified_email?: string | null
          organization_id: string
          sent_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          notified_email?: string | null
          organization_id?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "low_stock_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      movies: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          genre: string | null
          id: string
          is_active: boolean
          organization_id: string
          poster_url: string | null
          rating: string | null
          release_date: string | null
          status: string
          title: string
          trailer_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes: number
          genre?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          poster_url?: string | null
          rating?: string | null
          release_date?: string | null
          status?: string
          title: string
          trailer_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          genre?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          poster_url?: string | null
          rating?: string | null
          release_date?: string | null
          status?: string
          title?: string
          trailer_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "movies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          about_text: string | null
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          custom_domain: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          mission_text: string | null
          name: string
          payment_gateway: string | null
          payment_gateway_configured: boolean | null
          payment_gateway_public_key: string | null
          payment_gateway_secret_key: string | null
          primary_color: string | null
          secondary_color: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          social_facebook: string | null
          social_instagram: string | null
          social_twitter: string | null
          subscription_plan: string | null
          suspended_at: string | null
          suspended_reason: string | null
          updated_at: string
          values_json: Json | null
        }
        Insert: {
          about_text?: string | null
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          custom_domain?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          mission_text?: string | null
          name: string
          payment_gateway?: string | null
          payment_gateway_configured?: boolean | null
          payment_gateway_public_key?: string | null
          payment_gateway_secret_key?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          social_facebook?: string | null
          social_instagram?: string | null
          social_twitter?: string | null
          subscription_plan?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
          values_json?: Json | null
        }
        Update: {
          about_text?: string | null
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          custom_domain?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          mission_text?: string | null
          name?: string
          payment_gateway?: string | null
          payment_gateway_configured?: boolean | null
          payment_gateway_public_key?: string | null
          payment_gateway_secret_key?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          social_facebook?: string | null
          social_instagram?: string | null
          social_twitter?: string | null
          subscription_plan?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
          values_json?: Json | null
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          page_path: string
          referrer: string | null
          user_agent: string | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          page_path: string
          referrer?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          page_path?: string
          referrer?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_views_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_audit_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          enable_cinema_gateways: boolean | null
          enable_custom_domains: boolean | null
          enable_promotions: boolean | null
          enable_wallet_feature: boolean | null
          id: string
          logo_url: string | null
          maintenance_message: string | null
          maintenance_mode: boolean | null
          platform_name: string
          primary_color: string | null
          sla_email_html_body: string | null
          sla_email_subject: string | null
          sla_escalation_email: string | null
          sla_escalation_enabled: boolean | null
          sla_response_time_high: number | null
          sla_response_time_low: number | null
          sla_response_time_medium: number | null
          sla_response_time_urgent: number | null
          support_email: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enable_cinema_gateways?: boolean | null
          enable_custom_domains?: boolean | null
          enable_promotions?: boolean | null
          enable_wallet_feature?: boolean | null
          id?: string
          logo_url?: string | null
          maintenance_message?: string | null
          maintenance_mode?: boolean | null
          platform_name?: string
          primary_color?: string | null
          sla_email_html_body?: string | null
          sla_email_subject?: string | null
          sla_escalation_email?: string | null
          sla_escalation_enabled?: boolean | null
          sla_response_time_high?: number | null
          sla_response_time_low?: number | null
          sla_response_time_medium?: number | null
          sla_response_time_urgent?: number | null
          support_email?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enable_cinema_gateways?: boolean | null
          enable_custom_domains?: boolean | null
          enable_promotions?: boolean | null
          enable_wallet_feature?: boolean | null
          id?: string
          logo_url?: string | null
          maintenance_message?: string | null
          maintenance_mode?: boolean | null
          platform_name?: string
          primary_color?: string | null
          sla_email_html_body?: string | null
          sla_email_subject?: string | null
          sla_escalation_email?: string | null
          sla_escalation_enabled?: boolean | null
          sla_response_time_high?: number | null
          sla_response_time_low?: number | null
          sla_response_time_medium?: number | null
          sla_response_time_urgent?: number | null
          support_email?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_transactions: {
        Row: {
          booking_id: string | null
          commission_amount: number
          created_at: string
          gateway_transaction_id: string | null
          gross_amount: number
          id: string
          metadata: Json | null
          net_amount: number
          organization_id: string
          payment_gateway: string | null
          payment_status: string
          transaction_type: string
        }
        Insert: {
          booking_id?: string | null
          commission_amount?: number
          created_at?: string
          gateway_transaction_id?: string | null
          gross_amount: number
          id?: string
          metadata?: Json | null
          net_amount: number
          organization_id: string
          payment_gateway?: string | null
          payment_status?: string
          transaction_type: string
        }
        Update: {
          booking_id?: string | null
          commission_amount?: number
          created_at?: string
          gateway_transaction_id?: string | null
          gross_amount?: number
          id?: string
          metadata?: Json | null
          net_amount?: number
          organization_id?: string
          payment_gateway?: string | null
          payment_status?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean | null
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          current_uses: number | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_purchase_amount: number | null
          organization_id: string
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_purchase_amount?: number | null
          organization_id: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_purchase_amount?: number | null
          organization_id?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      screens: {
        Row: {
          columns: number
          created_at: string
          id: string
          name: string
          organization_id: string
          rows: number
          updated_at: string
        }
        Insert: {
          columns?: number
          created_at?: string
          id?: string
          name: string
          organization_id: string
          rows?: number
          updated_at?: string
        }
        Update: {
          columns?: number
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          rows?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "screens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_layouts: {
        Row: {
          id: string
          is_available: boolean
          row_label: string
          screen_id: string
          seat_number: number
          seat_type: string
        }
        Insert: {
          id?: string
          is_available?: boolean
          row_label: string
          screen_id: string
          seat_number: number
          seat_type?: string
        }
        Update: {
          id?: string
          is_available?: boolean
          row_label?: string
          screen_id?: string
          seat_number?: number
          seat_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_layouts_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          cash_difference: number | null
          closing_cash: number | null
          created_at: string
          ended_at: string | null
          expected_cash: number | null
          id: string
          notes: string | null
          opening_cash: number
          organization_id: string
          started_at: string
          status: string
          total_card_sales: number | null
          total_cash_sales: number | null
          total_transactions: number | null
          user_id: string
        }
        Insert: {
          cash_difference?: number | null
          closing_cash?: number | null
          created_at?: string
          ended_at?: string | null
          expected_cash?: number | null
          id?: string
          notes?: string | null
          opening_cash?: number
          organization_id: string
          started_at?: string
          status?: string
          total_card_sales?: number | null
          total_cash_sales?: number | null
          total_transactions?: number | null
          user_id: string
        }
        Update: {
          cash_difference?: number | null
          closing_cash?: number | null
          created_at?: string
          ended_at?: string | null
          expected_cash?: number | null
          id?: string
          notes?: string | null
          opening_cash?: number
          organization_id?: string
          started_at?: string
          status?: string
          total_card_sales?: number | null
          total_cash_sales?: number | null
          total_transactions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      showtimes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          movie_id: string
          organization_id: string
          price: number
          screen_id: string
          start_time: string
          vip_price: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          movie_id: string
          organization_id: string
          price: number
          screen_id: string
          start_time: string
          vip_price?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          movie_id?: string
          organization_id?: string
          price?: number
          screen_id?: string
          start_time?: string
          vip_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "showtimes_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showtimes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showtimes_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          allow_custom_domain: boolean | null
          allow_own_gateway: boolean | null
          commission_percentage: number | null
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_locations: number | null
          max_screens: number | null
          max_staff: number | null
          name: string
          per_ticket_fee: number | null
          price_monthly: number
          price_yearly: number | null
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          allow_custom_domain?: boolean | null
          allow_own_gateway?: boolean | null
          commission_percentage?: number | null
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_locations?: number | null
          max_screens?: number | null
          max_staff?: number | null
          name: string
          per_ticket_fee?: number | null
          price_monthly?: number
          price_yearly?: number | null
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          allow_custom_domain?: boolean | null
          allow_own_gateway?: boolean | null
          commission_percentage?: number | null
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_locations?: number | null
          max_screens?: number | null
          max_staff?: number | null
          name?: string
          per_ticket_fee?: number | null
          price_monthly?: number
          price_yearly?: number | null
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          description: string
          first_response_at: string | null
          id: string
          internal_notes: string | null
          organization_id: string | null
          priority: string
          resolved_at: string | null
          sla_breached: boolean | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          description: string
          first_response_at?: string | null
          id?: string
          internal_notes?: string | null
          organization_id?: string | null
          priority?: string
          resolved_at?: string | null
          sla_breached?: boolean | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          description?: string
          first_response_at?: string | null
          id?: string
          internal_notes?: string | null
          organization_id?: string | null
          priority?: string
          resolved_at?: string | null
          sla_breached?: boolean | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health_logs: {
        Row: {
          details: Json | null
          error_count: number | null
          id: string
          metric_type: string
          recorded_at: string
          response_time_ms: number | null
          status: string
        }
        Insert: {
          details?: Json | null
          error_count?: number | null
          id?: string
          metric_type: string
          recorded_at?: string
          response_time_ms?: number | null
          status: string
        }
        Update: {
          details?: Json | null
          error_count?: number | null
          id?: string
          metric_type?: string
          recorded_at?: string
          response_time_ms?: number | null
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_booking_reference: { Args: never; Returns: string }
      generate_unique_slug: { Args: { cinema_name: string }; Returns: string }
      get_invitation_by_token: {
        Args: { invitation_token: string }
        Returns: {
          accepted_at: string
          email: string
          expires_at: string
          id: string
          organization_id: string
          organization_name: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      get_user_organization: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_cinema_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id?: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "cinema_admin"
        | "box_office"
        | "gate_staff"
        | "manager"
        | "accountant"
        | "platform_admin"
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
      app_role: [
        "cinema_admin",
        "box_office",
        "gate_staff",
        "manager",
        "accountant",
        "platform_admin",
      ],
    },
  },
} as const
