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
      activity_logs: {
        Row: {
          actor: string
          agent_id: string | null
          agent_label: string
          created_at: string
          description: string
          event_type: string
          id: string
          new_phone: string | null
          new_status: string | null
          old_phone: string | null
          old_status: string | null
          rotation_after: string | null
          rotation_before: string | null
        }
        Insert: {
          actor?: string
          agent_id?: string | null
          agent_label: string
          created_at?: string
          description: string
          event_type: string
          id?: string
          new_phone?: string | null
          new_status?: string | null
          old_phone?: string | null
          old_status?: string | null
          rotation_after?: string | null
          rotation_before?: string | null
        }
        Update: {
          actor?: string
          agent_id?: string | null
          agent_label?: string
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          new_phone?: string | null
          new_status?: string | null
          old_phone?: string | null
          old_status?: string | null
          rotation_after?: string | null
          rotation_before?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "cs_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          message_template: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          message_template?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          message_template?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          campaign_id: string | null
          click_id: string | null
          created_at: string
          id: string
          is_duplicate: boolean
          message: string
          ref_code: string | null
          routed_to: string | null
          sender: string | null
          source: string
        }
        Insert: {
          campaign_id?: string | null
          click_id?: string | null
          created_at?: string
          id?: string
          is_duplicate?: boolean
          message: string
          ref_code?: string | null
          routed_to?: string | null
          sender?: string | null
          source?: string
        }
        Update: {
          campaign_id?: string | null
          click_id?: string | null
          created_at?: string
          id?: string
          is_duplicate?: boolean
          message?: string
          ref_code?: string | null
          routed_to?: string | null
          sender?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: false
            referencedRelation: "clicks"
            referencedColumns: ["id"]
          },
        ]
      }
      clicks: {
        Row: {
          agent_id: string | null
          campaign_id: string | null
          created_at: string
          id: string
          phone: string
          ref_code: string
          routed_to: string
          user_agent: string | null
        }
        Insert: {
          agent_id?: string | null
          campaign_id?: string | null
          created_at?: string
          id?: string
          phone: string
          ref_code: string
          routed_to: string
          user_agent?: string | null
        }
        Update: {
          agent_id?: string | null
          campaign_id?: string | null
          created_at?: string
          id?: string
          phone?: string
          ref_code?: string
          routed_to?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clicks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "cs_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clicks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_agents: {
        Row: {
          banned_at: string | null
          created_at: string
          id: string
          last_action: string
          last_actor: string
          name: string
          phone: string
          portal_token: string
          previous_phone: string | null
          slot: number
          status: string
          updated_at: string
        }
        Insert: {
          banned_at?: string | null
          created_at?: string
          id?: string
          last_action?: string
          last_actor?: string
          name: string
          phone?: string
          portal_token?: string
          previous_phone?: string | null
          slot: number
          status?: string
          updated_at?: string
        }
        Update: {
          banned_at?: string | null
          created_at?: string
          id?: string
          last_action?: string
          last_actor?: string
          name?: string
          phone?: string
          portal_token?: string
          previous_phone?: string | null
          slot?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      rotator_settings: {
        Row: {
          backup_name: string
          backup_phone: string
          id: number
          last_slot: number
          updated_at: string
          webhook_secret: string
        }
        Insert: {
          backup_name?: string
          backup_phone?: string
          id?: number
          last_slot?: number
          updated_at?: string
          webhook_secret?: string
        }
        Update: {
          backup_name?: string
          backup_phone?: string
          id?: number
          last_slot?: number
          updated_at?: string
          webhook_secret?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      campaign_stats: {
        Args: never
        Returns: {
          campaign_id: string
          chats: number
          clicks: number
        }[]
      }
      cs_change_number: {
        Args: { p_phone: string; p_token: string }
        Returns: Json
      }
      cs_portal_get: { Args: { p_token: string }; Returns: Json }
      cs_report_banned: { Args: { p_token: string }; Returns: Json }
      cs_reuse_old: { Args: { p_token: string }; Returns: Json }
      cs_undo_report: { Args: { p_token: string }; Returns: Json }
      dashboard_stats: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      record_chat: {
        Args: {
          p_message: string
          p_secret: string
          p_sender: string
          p_source: string
        }
        Returns: Json
      }
      rotation_label: {
        Args: { a1: boolean; a2: boolean; b: boolean }
        Returns: string
      }
      route_click: {
        Args: { p_slug: string; p_user_agent: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
