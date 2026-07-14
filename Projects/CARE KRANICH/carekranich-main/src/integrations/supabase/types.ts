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
      agent_conversations: {
        Row: {
          agent_key: string
          created_at: string
          id: string
          resident_id: string | null
          tenant_id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_key: string
          created_at?: string
          id?: string
          resident_id?: string | null
          tenant_id: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_key?: string
          created_at?: string
          id?: string
          resident_id?: string | null
          tenant_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_memory: {
        Row: {
          agent_key: string
          created_at: string
          id: string
          key: string
          resident_id: string | null
          tenant_id: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          agent_key: string
          created_at?: string
          id?: string
          key: string
          resident_id?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
          value?: Json
        }
        Update: {
          agent_key?: string
          created_at?: string
          id?: string
          key?: string
          resident_id?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
      agent_messages: {
        Row: {
          confidence: number | null
          content: string
          conversation_id: string
          created_at: string
          evidence: Json
          id: string
          reasoning: string | null
          role: string
          tenant_id: string
        }
        Insert: {
          confidence?: number | null
          content: string
          conversation_id: string
          created_at?: string
          evidence?: Json
          id?: string
          reasoning?: string | null
          role: string
          tenant_id: string
        }
        Update: {
          confidence?: number | null
          content?: string
          conversation_id?: string
          created_at?: string
          evidence?: Json
          id?: string
          reasoning?: string | null
          role?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "agent_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_recommendations: {
        Row: {
          acted_at: string | null
          acted_by: string | null
          agent_key: string
          category: string
          confidence: number | null
          created_at: string
          created_by: string | null
          evidence: Json
          id: string
          reasoning: string | null
          resident_id: string | null
          status: string
          summary: string
          tenant_id: string
          title: string
          updated_at: string
          urgency: string
        }
        Insert: {
          acted_at?: string | null
          acted_by?: string | null
          agent_key: string
          category?: string
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          evidence?: Json
          id?: string
          reasoning?: string | null
          resident_id?: string | null
          status?: string
          summary: string
          tenant_id: string
          title: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          acted_at?: string | null
          acted_by?: string | null
          agent_key?: string
          category?: string
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          evidence?: Json
          id?: string
          reasoning?: string | null
          resident_id?: string | null
          status?: string
          summary?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          confidence: number | null
          created_at: string
          evidence: Json
          generated_by: string
          id: string
          module: string
          reasoning: string | null
          recommendations: Json
          resident_id: string | null
          severity: string
          summary: string
          tenant_id: string
          title: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          evidence?: Json
          generated_by?: string
          id?: string
          module: string
          reasoning?: string | null
          recommendations?: Json
          resident_id?: string | null
          severity?: string
          summary: string
          tenant_id: string
          title: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          evidence?: Json
          generated_by?: string
          id?: string
          module?: string
          reasoning?: string | null
          recommendations?: Json
          resident_id?: string | null
          severity?: string
          summary?: string
          tenant_id?: string
          title?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          assigned_to: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          resident_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          assigned_to?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          resident_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          assigned_to?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          resident_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      care_plans: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          priority: string
          resident_id: string
          start_date: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          priority?: string
          resident_id: string
          start_date?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          priority?: string
          resident_id?: string
          start_date?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      care_tasks: {
        Row: {
          assigned_to: string | null
          care_plan_id: string | null
          category: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          due_at: string | null
          id: string
          notes: string | null
          priority: string
          resident_id: string
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          care_plan_id?: string | null
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          notes?: string | null
          priority?: string
          resident_id: string
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          care_plan_id?: string | null
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          id?: string
          notes?: string | null
          priority?: string
          resident_id?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_tasks_care_plan_id_fkey"
            columns: ["care_plan_id"]
            isOneToOne: false
            referencedRelation: "care_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      cognitive_assessments: {
        Row: {
          assessed_at: string
          assessor_role: string
          attention_score: number | null
          created_at: string
          created_by: string | null
          emotional_stability_score: number | null
          executive_score: number | null
          id: string
          language_score: number | null
          memory_score: number | null
          notes: string | null
          reasoning_score: number | null
          resident_id: string
          source: string
          tenant_id: string
          updated_at: string
          vitality_score: number | null
        }
        Insert: {
          assessed_at?: string
          assessor_role?: string
          attention_score?: number | null
          created_at?: string
          created_by?: string | null
          emotional_stability_score?: number | null
          executive_score?: number | null
          id?: string
          language_score?: number | null
          memory_score?: number | null
          notes?: string | null
          reasoning_score?: number | null
          resident_id: string
          source?: string
          tenant_id: string
          updated_at?: string
          vitality_score?: number | null
        }
        Update: {
          assessed_at?: string
          assessor_role?: string
          attention_score?: number | null
          created_at?: string
          created_by?: string | null
          emotional_stability_score?: number | null
          executive_score?: number | null
          id?: string
          language_score?: number | null
          memory_score?: number | null
          notes?: string | null
          reasoning_score?: number | null
          resident_id?: string
          source?: string
          tenant_id?: string
          updated_at?: string
          vitality_score?: number | null
        }
        Relationships: []
      }
      events: {
        Row: {
          actor_id: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          occurred_at: string
          payload: Json
          resident_id: string | null
          severity: string
          tenant_id: string
          title: string
        }
        Insert: {
          actor_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          occurred_at?: string
          payload?: Json
          resident_id?: string | null
          severity?: string
          tenant_id: string
          title: string
        }
        Update: {
          actor_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          occurred_at?: string
          payload?: Json
          resident_id?: string | null
          severity?: string
          tenant_id?: string
          title?: string
        }
        Relationships: []
      }
      longevity_scores: {
        Row: {
          cognitive_score: number | null
          computed_at: string
          created_at: string
          emotional_score: number | null
          health_score: number | null
          id: string
          longevity_score: number | null
          methodology: Json
          mobility_score: number | null
          protective_factors: Json
          resident_id: string
          resilience_score: number | null
          risk_factors: Json
          social_score: number | null
          tenant_id: string
        }
        Insert: {
          cognitive_score?: number | null
          computed_at?: string
          created_at?: string
          emotional_score?: number | null
          health_score?: number | null
          id?: string
          longevity_score?: number | null
          methodology?: Json
          mobility_score?: number | null
          protective_factors?: Json
          resident_id: string
          resilience_score?: number | null
          risk_factors?: Json
          social_score?: number | null
          tenant_id: string
        }
        Update: {
          cognitive_score?: number | null
          computed_at?: string
          created_at?: string
          emotional_score?: number | null
          health_score?: number | null
          id?: string
          longevity_score?: number | null
          methodology?: Json
          mobility_score?: number | null
          protective_factors?: Json
          resident_id?: string
          resilience_score?: number | null
          risk_factors?: Json
          social_score?: number | null
          tenant_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          severity: string
          tenant_id: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          severity?: string
          tenant_id: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          severity?: string
          tenant_id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          preferred_name: string | null
          tenant_id: string | null
          time_zone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          preferred_name?: string | null
          tenant_id?: string | null
          time_zone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_name?: string | null
          tenant_id?: string | null
          time_zone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      residents: {
        Row: {
          bio: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          full_name: string
          hobbies: string[] | null
          id: string
          language: string | null
          photo_url: string | null
          preferred_name: string | null
          pronouns: string | null
          story: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          full_name: string
          hobbies?: string[] | null
          id?: string
          language?: string | null
          photo_url?: string | null
          preferred_name?: string | null
          pronouns?: string | null
          story?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          full_name?: string
          hobbies?: string[] | null
          id?: string
          language?: string | null
          photo_url?: string | null
          preferred_name?: string | null
          pronouns?: string | null
          story?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "residents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          branding: Json
          created_at: string
          id: string
          invite_code: string | null
          name: string
          slug: string
        }
        Insert: {
          branding?: Json
          created_at?: string
          id?: string
          invite_code?: string | null
          name: string
          slug: string
        }
        Update: {
          branding?: Json
          created_at?: string
          id?: string
          invite_code?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      twin_observations: {
        Row: {
          confidence: number | null
          created_at: string
          created_by: string | null
          domain: string
          id: string
          metric: string
          notes: string | null
          observed_at: string
          resident_id: string
          source: string
          tenant_id: string
          unit: string | null
          updated_at: string
          value_numeric: number | null
          value_text: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          domain: string
          id?: string
          metric: string
          notes?: string | null
          observed_at?: string
          resident_id: string
          source?: string
          tenant_id: string
          unit?: string | null
          updated_at?: string
          value_numeric?: number | null
          value_text?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          domain?: string
          id?: string
          metric?: string
          notes?: string | null
          observed_at?: string
          resident_id?: string
          source?: string
          tenant_id?: string
          unit?: string | null
          updated_at?: string
          value_numeric?: number | null
          value_text?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_tenant: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "family"
        | "caregiver"
        | "nurse"
        | "doctor"
        | "clinic_admin"
        | "super_admin"
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
        "family",
        "caregiver",
        "nurse",
        "doctor",
        "clinic_admin",
        "super_admin",
      ],
    },
  },
} as const
