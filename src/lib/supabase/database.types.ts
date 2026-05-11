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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      child_badges: {
        Row: {
          badge_id: string
          child_id: string
          earned_at: string
          earned_in_session: string | null
          parent_user_id: string
        }
        Insert: {
          badge_id: string
          child_id: string
          earned_at?: string
          earned_in_session?: string | null
          parent_user_id: string
        }
        Update: {
          badge_id?: string
          child_id?: string
          earned_at?: string
          earned_in_session?: string | null
          parent_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_badges_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "child_progress_summary"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "child_badges_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_badges_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_badges_earned_in_session_fkey"
            columns: ["earned_in_session"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          age_years: number
          avatar_emoji: string | null
          created_at: string
          display_name: string
          height_cm: number | null
          id: string
          parent_user_id: string
          sex: string
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          age_years: number
          avatar_emoji?: string | null
          created_at?: string
          display_name: string
          height_cm?: number | null
          id?: string
          parent_user_id: string
          sex: string
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          age_years?: number
          avatar_emoji?: string | null
          created_at?: string
          display_name?: string
          height_cm?: number | null
          id?: string
          parent_user_id?: string
          sex?: string
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      coach_chats: {
        Row: {
          cost_usd: number | null
          created_at: string
          id: string
          message_count: number
          messages: Json
          parent_user_id: string
          session_id: string
          tokens_used: number | null
          updated_at: string
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string
          id?: string
          message_count?: number
          messages?: Json
          parent_user_id: string
          session_id: string
          tokens_used?: number | null
          updated_at?: string
        }
        Update: {
          cost_usd?: number | null
          created_at?: string
          id?: string
          message_count?: number
          messages?: Json
          parent_user_id?: string
          session_id?: string
          tokens_used?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_chats_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          is_anonymous: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          is_anonymous?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_anonymous?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          app_version: string | null
          child_id: string
          completed_at: string | null
          completed_test_count: number
          created_at: string
          device_info: Json | null
          id: string
          injury_warning_count: number
          injury_warnings: string[] | null
          overall_score: number | null
          parent_user_id: string
          recommendations: Json | null
          started_at: string
          summary: Json
          top_sport: string | null
          top_sport_confidence_pct: number | null
        }
        Insert: {
          app_version?: string | null
          child_id: string
          completed_at?: string | null
          completed_test_count?: number
          created_at?: string
          device_info?: Json | null
          id?: string
          injury_warning_count?: number
          injury_warnings?: string[] | null
          overall_score?: number | null
          parent_user_id: string
          recommendations?: Json | null
          started_at: string
          summary: Json
          top_sport?: string | null
          top_sport_confidence_pct?: number | null
        }
        Update: {
          app_version?: string | null
          child_id?: string
          completed_at?: string | null
          completed_test_count?: number
          created_at?: string
          device_info?: Json | null
          id?: string
          injury_warning_count?: number
          injury_warnings?: string[] | null
          overall_score?: number | null
          parent_user_id?: string
          recommendations?: Json | null
          started_at?: string
          summary?: Json
          top_sport?: string | null
          top_sport_confidence_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "child_progress_summary"
            referencedColumns: ["child_id"]
          },
          {
            foreignKeyName: "sessions_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      child_progress_summary: {
        Row: {
          age_years: number | null
          avatar_emoji: string | null
          badge_count: number | null
          child_id: string | null
          display_name: string | null
          last_tested_at: string | null
          parent_user_id: string | null
          session_count: number | null
          sex: string | null
          streak_days: number | null
        }
        Insert: {
          age_years?: number | null
          avatar_emoji?: string | null
          badge_count?: never
          child_id?: string | null
          display_name?: string | null
          last_tested_at?: never
          parent_user_id?: string | null
          session_count?: never
          sex?: string | null
          streak_days?: never
        }
        Update: {
          age_years?: number | null
          avatar_emoji?: string | null
          badge_count?: never
          child_id?: string | null
          display_name?: string | null
          last_tested_at?: never
          parent_user_id?: string | null
          session_count?: never
          sex?: string | null
          streak_days?: never
        }
        Relationships: []
      }
      children_with_stats: {
        Row: {
          age_years: number | null
          avatar_emoji: string | null
          created_at: string | null
          display_name: string | null
          height_cm: number | null
          id: string | null
          last_tested_at: string | null
          parent_user_id: string | null
          session_count: number | null
          sex: string | null
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          age_years?: number | null
          avatar_emoji?: string | null
          created_at?: string | null
          display_name?: string | null
          height_cm?: number | null
          id?: string | null
          last_tested_at?: never
          parent_user_id?: string | null
          session_count?: never
          sex?: string | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          age_years?: number | null
          avatar_emoji?: string | null
          created_at?: string | null
          display_name?: string | null
          height_cm?: number | null
          id?: string | null
          last_tested_at?: never
          parent_user_id?: string | null
          session_count?: never
          sex?: string | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "parent" | "coach" | "admin"
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
      app_role: ["parent", "coach", "admin"],
    },
  },
} as const
