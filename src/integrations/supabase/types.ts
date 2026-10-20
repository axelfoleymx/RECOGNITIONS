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
      award_categories: {
        Row: {
          active: boolean
          created_at: string
          description: string
          emoji: string
          id: string
          is_custom: boolean
          created_by: string | null
          name: string
          pillar: string
          slug: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          description: string
          emoji?: string
          id?: string
          is_custom?: boolean
          created_by?: string | null
          name: string
          pillar: string
          slug: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          emoji?: string
          id?: string
          is_custom?: boolean
          created_by?: string | null
          name?: string
          pillar?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [

        ]
      }
      award_votes: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_self: boolean
          nominee_person_id: string
          reason: string
          rockets: number
          voter_user_id: string
          week_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_self?: boolean
          nominee_person_id: string
          reason?: string
          rockets?: number
          voter_user_id: string
          week_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_self?: boolean
          nominee_person_id?: string
          reason?: string
          rockets?: number
          voter_user_id?: string
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "award_votes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "award_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_votes_nominee_person_id_fkey"
            columns: ["nominee_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "award_votes_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_participants: {
        Row: {
          milestone_id: string
          person_id: string
        }
        Insert: {
          milestone_id: string
          person_id: string
        }
        Update: {
          milestone_id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_participants_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_participants_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          impact: number
          kind: string
          title: string
          week_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          id?: string
          impact?: number
          kind?: string
          title: string
          week_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          impact?: number
          kind?: string
          title?: string
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          active: boolean
          approved: boolean
          birthday: string | null
          created_at: string
          id: string
          name: string
          photo_url: string | null
          song_url: string | null
          type: string
          user_id: string | null
          youtube_url: string | null
        }
        Insert: {
          active?: boolean
          approved?: boolean
          birthday?: string | null
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          song_url?: string | null
          type?: string
          user_id?: string | null
          youtube_url?: string | null
        }
        Update: {
          active?: boolean
          approved?: boolean
          birthday?: string | null
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          song_url?: string | null
          type?: string
          user_id?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      recognitions: {
        Row: {
          author_user_id: string | null
          created_at: string
          id: string
          is_anonymous: boolean
          message: string
          question_id: string | null
          rating: number | null
          pillar: string | null
          recognized_person_id: string
          week_id: string
        }
        Insert: {
          author_user_id?: string | null
          created_at?: string
          id?: string
          is_anonymous?: boolean
          message: string
          question_id?: string | null
          rating?: number | null
          pillar?: string | null
          recognized_person_id: string
          week_id: string
        }
        Update: {
          author_user_id?: string | null
          created_at?: string
          id?: string
          is_anonymous?: boolean
          message?: string
          question_id?: string | null
          rating?: number | null
          pillar?: string | null
          recognized_person_id?: string
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recognitions_recognized_person_id_fkey"
            columns: ["recognized_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognitions_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      self_checkins: {
        Row: {
          blockers: string[]
          created_at: string
          id: string
          milestone_ids: string[]
          mood: number | null
          next_step: string
          person_id: string | null
          ratings: Json
          reason: string
          speed: string
          updated_at: string
          user_id: string
          wants_support: boolean
          week_id: string
        }
        Insert: {
          blockers?: string[]
          created_at?: string
          id?: string
          milestone_ids?: string[]
          mood?: number | null
          next_step?: string
          person_id?: string | null
          ratings?: Json
          reason?: string
          speed: string
          updated_at?: string
          user_id: string
          wants_support?: boolean
          week_id: string
        }
        Update: {
          blockers?: string[]
          created_at?: string
          id?: string
          milestone_ids?: string[]
          mood?: number | null
          next_step?: string
          person_id?: string | null
          ratings?: Json
          reason?: string
          speed?: string
          updated_at?: string
          user_id?: string
          wants_support?: boolean
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "self_checkins_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      week_awards: {
        Row: {
          category_id: string
          id: string
          position: number
          week_id: string
        }
        Insert: {
          category_id: string
          id?: string
          position?: number
          week_id: string
        }
        Update: {
          category_id?: string
          id?: string
          position?: number
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "week_awards_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "award_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "week_awards_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string
          id: string
          reason: string
          voted_person_id: string
          voter_user_id: string
          week_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string
          voted_person_id: string
          voter_user_id: string
          week_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          voted_person_id?: string
          voter_user_id?: string
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_voted_person_id_fkey"
            columns: ["voted_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      weeks: {
        Row: {
          created_at: string
          diplomas_released: boolean
          end_date: string
          id: string
          start_date: string
          status: string
          winner_person_id: string | null
        }
        Insert: {
          created_at?: string
          diplomas_released?: boolean
          end_date: string
          id?: string
          start_date: string
          status?: string
          winner_person_id?: string | null
        }
        Update: {
          created_at?: string
          diplomas_released?: boolean
          end_date?: string
          id?: string
          start_date?: string
          status?: string
          winner_person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weeks_winner_person_id_fkey"
            columns: ["winner_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_week_awards: { Args: { _week_id: string }; Returns: undefined }
      get_or_create_current_week: { Args: never; Returns: string }
      get_mood_pulse: {
        Args: { _week_id: string }
        Returns: { mood: number; total: number }[]
      }
      get_checkin_pulse: {
        Args: { _week_id: string }
        Returns: { speed: string; total: number }[]
      }
      propose_week_award: {
        Args: { _week_id: string; _name: string; _description: string; _emoji: string; _pillar: string }
        Returns: string
      }
      get_recent_rocketers: {
        Args: { _week_id: string }
        Returns: { person_id: string; week_start: string }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member"
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
    Enums: {
      app_role: ["admin", "member"],
    },
  },
} as const
