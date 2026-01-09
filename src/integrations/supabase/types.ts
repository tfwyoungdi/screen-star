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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
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
    }
    Enums: {
      app_role:
        | "cinema_admin"
        | "box_office"
        | "gate_staff"
        | "manager"
        | "accountant"
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
      ],
    },
  },
} as const
