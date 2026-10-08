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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      expenses: {
        Row: {
          billing_cycle: string | null
          cancellation_kind: string | null
          category: string
          created_at: string | null
          deduct_from_asset: boolean
          discount_amount: number
          earned_points: number
          end_date: string | null
          final_amount: number
          game_id: string | null
          id: string
          memo: string | null
          original_price: number
          payment_method: string
          point_discount_amount: number
          point_platform: string | null
          schedule_id: string | null
          start_date: string | null
          status: string
          target_date: string
          template_id: string | null
          title: string
          used_points: number
          user_id: string
        }
        Insert: {
          billing_cycle?: string | null
          cancellation_kind?: string | null
          category: string
          created_at?: string | null
          deduct_from_asset?: boolean
          discount_amount?: number
          earned_points?: number
          end_date?: string | null
          final_amount?: number
          game_id?: string | null
          id?: string
          memo?: string | null
          original_price?: number
          payment_method?: string
          point_discount_amount?: number
          point_platform?: string | null
          schedule_id?: string | null
          start_date?: string | null
          status?: string
          target_date: string
          template_id?: string | null
          title: string
          used_points?: number
          user_id: string
        }
        Update: {
          billing_cycle?: string | null
          cancellation_kind?: string | null
          category?: string
          created_at?: string | null
          deduct_from_asset?: boolean
          discount_amount?: number
          earned_points?: number
          end_date?: string | null
          final_amount?: number
          game_id?: string | null
          id?: string
          memo?: string | null
          original_price?: number
          payment_method?: string
          point_discount_amount?: number
          point_platform?: string | null
          schedule_id?: string | null
          start_date?: string | null
          status?: string
          target_date?: string
          template_id?: string | null
          title?: string
          used_points?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "game_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "subscription_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      game_requests: {
        Row: {
          admin_memo: string | null
          approved_game_id: string | null
          created_at: string
          id: string
          memo: string | null
          name: string
          request_status: string
          user_id: string
        }
        Insert: {
          admin_memo?: string | null
          approved_game_id?: string | null
          created_at?: string
          id?: string
          memo?: string | null
          name: string
          request_status?: string
          user_id: string
        }
        Update: {
          admin_memo?: string | null
          approved_game_id?: string | null
          created_at?: string
          id?: string
          memo?: string | null
          name?: string
          request_status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_requests_approved_game_id_fkey"
            columns: ["approved_game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_schedules: {
        Row: {
          created_at: string | null
          end_date: string
          game_id: string
          id: string
          memo: string | null
          schedule_type: string
          start_date: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          game_id: string
          id?: string
          memo?: string | null
          schedule_type: string
          start_date: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          game_id?: string
          id?: string
          memo?: string | null
          schedule_type?: string
          start_date?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_schedules_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string | null
          created_by: string | null
          default_icon_url: string
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          default_icon_url: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          default_icon_url?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      monthly_budgets: {
        Row: {
          budget_amount: number
          created_at: string | null
          id: string
          month: number
          user_id: string
          year: number
        }
        Insert: {
          budget_amount?: number
          created_at?: string | null
          id?: string
          month: number
          user_id: string
          year: number
        }
        Update: {
          budget_amount?: number
          created_at?: string | null
          id?: string
          month?: number
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      personal_memos: {
        Row: {
          content: string
          created_at: string | null
          id: string
          memo_date: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          memo_date: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          memo_date?: string
          user_id?: string
        }
        Relationships: []
      }
      schedule_requests: {
        Row: {
          admin_memo: string | null
          created_at: string | null
          end_date: string
          game_id: string
          id: string
          memo: string | null
          request_status: string
          schedule_type: string
          start_date: string
          target_schedule_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          admin_memo?: string | null
          created_at?: string | null
          end_date: string
          game_id: string
          id?: string
          memo?: string | null
          request_status?: string
          schedule_type: string
          start_date: string
          target_schedule_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          admin_memo?: string | null
          created_at?: string | null
          end_date?: string
          game_id?: string
          id?: string
          memo?: string | null
          request_status?: string
          schedule_type?: string
          start_date?: string
          target_schedule_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_requests_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_requests_target_schedule_id_fkey"
            columns: ["target_schedule_id"]
            isOneToOne: false
            referencedRelation: "game_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      store_point_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          expense_id: string | null
          id: string
          memo: string | null
          platform: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          expense_id?: string | null
          id?: string
          memo?: string | null
          platform: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          expense_id?: string | null
          id?: string
          memo?: string | null
          platform?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_point_transactions_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      store_wallets: {
        Row: {
          current_balance: number
          earn_rate: number
          id: string
          platform: string
          updated_at: string | null
          user_id: string
          user_tier: string | null
        }
        Insert: {
          current_balance?: number
          earn_rate?: number
          id?: string
          platform: string
          updated_at?: string | null
          user_id: string
          user_tier?: string | null
        }
        Update: {
          current_balance?: number
          earn_rate?: number
          id?: string
          platform?: string
          updated_at?: string | null
          user_id?: string
          user_tier?: string | null
        }
        Relationships: []
      }
      subscription_templates: {
        Row: {
          billing_day: number
          category: string
          created_at: string | null
          default_price: number
          game_id: string | null
          id: string
          is_active: boolean
          payment_method: string
          title: string
          user_id: string
        }
        Insert: {
          billing_day: number
          category?: string
          created_at?: string | null
          default_price?: number
          game_id?: string | null
          id?: string
          is_active?: boolean
          payment_method?: string
          title: string
          user_id: string
        }
        Update: {
          billing_day?: number
          category?: string
          created_at?: string | null
          default_price?: number
          game_id?: string | null
          id?: string
          is_active?: boolean
          payment_method?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_templates_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      user_finances: {
        Row: {
          default_budget: number
          id: string
          total_asset: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          default_budget?: number
          id?: string
          total_asset?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          default_budget?: number
          id?: string
          total_asset?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_games: {
        Row: {
          created_at: string | null
          custom_icon_path: string | null
          game_id: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          custom_icon_path?: string | null
          game_id: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          custom_icon_path?: string | null
          game_id?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_games_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_wallet_balance: {
        Args: { p_memo: string; p_platform: string; p_target_balance: number }
        Returns: undefined
      }
      approve_game_request: {
        Args: { p_default_icon_url: string; p_request_id: string }
        Returns: string
      }
      approve_schedule_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      cancel_planned_expense: {
        Args: { p_expense_id: string }
        Returns: undefined
      }
      process_expense_payment: {
        Args: {
          p_deduct_asset: boolean
          p_discount_amount: number
          p_expense_id: string
          p_original_price: number
          p_payment_date: string
          p_payment_method: string
          p_point_discount_amount: number
          p_point_platform: string
          p_used_points: number
        }
        Returns: undefined
      }
      refund_expense_payment: {
        Args: { p_expense_id: string }
        Returns: undefined
      }
      reject_game_request: {
        Args: { p_admin_memo?: string; p_request_id: string }
        Returns: undefined
      }
      reject_schedule_request: {
        Args: { p_admin_memo?: string; p_request_id: string }
        Returns: undefined
      }
      restore_cancelled_expense: {
        Args: { p_expense_id: string }
        Returns: undefined
      }
      set_user_finance_settings: {
        Args: { p_default_budget: number; p_total_asset: number }
        Returns: undefined
      }
      update_store_wallet_settings: {
        Args: { p_earn_rate: number; p_platform: string; p_tier: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
