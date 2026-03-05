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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          actor_id: string
          created_at: string | null
          data: Json | null
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          org_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string | null
          data?: Json | null
          entity_id: string
          entity_type: string
          event_type: string
          id?: string
          org_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string | null
          data?: Json | null
          entity_id?: string
          entity_type?: string
          event_type?: string
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          ai_summary: string | null
          company_industry: string | null
          company_name: string | null
          company_website: string | null
          created_at: string | null
          data: Json | null
          education: Json | null
          email: string | null
          experiences: Json | null
          facebook_url: string | null
          id: string
          instagram_url: string | null
          job_title: string | null
          linkedin_url: string | null
          name: string
          occupation: string | null
          org_id: string
          owner_id: string
          phone: string | null
          profile_picture_url: string | null
          source: string | null
          tags: string[] | null
          talking_points: Json | null
          tiktok_url: string | null
          updated_at: string | null
          updates: Json | null
        }
        Insert: {
          ai_summary?: string | null
          company_industry?: string | null
          company_name?: string | null
          company_website?: string | null
          created_at?: string | null
          data?: Json | null
          education?: Json | null
          email?: string | null
          experiences?: Json | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          name: string
          occupation?: string | null
          org_id: string
          owner_id: string
          phone?: string | null
          profile_picture_url?: string | null
          source?: string | null
          tags?: string[] | null
          talking_points?: Json | null
          tiktok_url?: string | null
          updated_at?: string | null
          updates?: Json | null
        }
        Update: {
          ai_summary?: string | null
          company_industry?: string | null
          company_name?: string | null
          company_website?: string | null
          created_at?: string | null
          data?: Json | null
          education?: Json | null
          email?: string | null
          experiences?: Json | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          name?: string
          occupation?: string | null
          org_id?: string
          owner_id?: string
          phone?: string | null
          profile_picture_url?: string | null
          source?: string | null
          tags?: string[] | null
          talking_points?: Json | null
          tiktok_url?: string | null
          updated_at?: string | null
          updates?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_attachments: {
        Row: {
          created_at: string | null
          deal_id: string
          file_name: string
          file_type: string
          id: string
          mime_type: string | null
          org_id: string
          size_bytes: number | null
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          deal_id: string
          file_name: string
          file_type?: string
          id?: string
          mime_type?: string | null
          org_id: string
          size_bytes?: number | null
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          deal_id?: string
          file_name?: string
          file_type?: string
          id?: string
          mime_type?: string | null
          org_id?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_attachments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_attachments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          client_id: string
          created_at: string | null
          data: Json | null
          expected_close_date: string | null
          id: string
          order_index: number | null
          org_id: string
          owner_id: string
          stage: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          data?: Json | null
          expected_close_date?: string | null
          id?: string
          order_index?: number | null
          org_id: string
          owner_id: string
          stage?: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          data?: Json | null
          expected_close_date?: string | null
          id?: string
          order_index?: number | null
          org_id?: string
          owner_id?: string
          stage?: string
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      links: {
        Row: {
          created_at: string | null
          created_by: string
          from_id: string
          from_type: string
          id: string
          org_id: string
          relation_type: string | null
          to_id: string
          to_type: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          from_id: string
          from_type: string
          id?: string
          org_id: string
          relation_type?: string | null
          to_id: string
          to_type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          from_id?: string
          from_type?: string
          id?: string
          org_id?: string
          relation_type?: string | null
          to_id?: string
          to_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "links_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string | null
          id: string
          org_id: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          author_id: string
          content: Json | null
          created_at: string | null
          data: Json | null
          id: string
          org_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content?: Json | null
          created_at?: string | null
          data?: Json | null
          id?: string
          org_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: Json | null
          created_at?: string | null
          data?: Json | null
          id?: string
          org_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          settings: Json | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          settings?: Json | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          settings?: Json | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          default_organization_id: string | null
          email: string | null
          full_name: string | null
          id: string
          settings: Json | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          default_organization_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          settings?: Json | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          default_organization_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          settings?: Json | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_org_fkey"
            columns: ["default_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          ai_metadata: Json | null
          ai_summary: string | null
          client_id: string
          created_at: string | null
          data: Json | null
          deal_id: string
          id: string
          link_source: string | null
          next_follow_up_at: string | null
          org_id: string
          owner_id: string
          proposal_date: string | null
          status: string
          storage_path: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          ai_metadata?: Json | null
          ai_summary?: string | null
          client_id: string
          created_at?: string | null
          data?: Json | null
          deal_id: string
          id?: string
          link_source?: string | null
          next_follow_up_at?: string | null
          org_id: string
          owner_id: string
          proposal_date?: string | null
          status?: string
          storage_path?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          ai_metadata?: Json | null
          ai_summary?: string | null
          client_id?: string
          created_at?: string | null
          data?: Json | null
          deal_id?: string
          id?: string
          link_source?: string | null
          next_follow_up_at?: string | null
          org_id?: string
          owner_id?: string
          proposal_date?: string | null
          status?: string
          storage_path?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string | null
          data: Json | null
          description: string | null
          due_at: string | null
          id: string
          org_id: string
          owner_id: string
          priority: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          data?: Json | null
          description?: string | null
          due_at?: string | null
          id?: string
          org_id: string
          owner_id: string
          priority?: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          data?: Json | null
          description?: string | null
          due_at?: string | null
          id?: string
          org_id?: string
          owner_id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
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
      is_org_admin: { Args: { p_org_id: string }; Returns: boolean }
      is_org_manager: { Args: { p_org_id: string }; Returns: boolean }
      is_org_member: { Args: { p_org_id: string }; Returns: boolean }
      is_org_non_viewer: { Args: { p_org_id: string }; Returns: boolean }
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
    Enums: {},
  },
} as const
