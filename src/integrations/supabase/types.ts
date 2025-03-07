export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activity_history: {
        Row: {
          activity_detail: Json | null
          activity_type: string
          content_id: string | null
          created_at: string
          id: string
          occurred_at: string
          platform: Database["public"]["Enums"]["social_platform"]
          user_id: string
        }
        Insert: {
          activity_detail?: Json | null
          activity_type: string
          content_id?: string | null
          created_at?: string
          id?: string
          occurred_at?: string
          platform: Database["public"]["Enums"]["social_platform"]
          user_id: string
        }
        Update: {
          activity_detail?: Json | null
          activity_type?: string
          content_id?: string | null
          created_at?: string
          id?: string
          occurred_at?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          is_user: boolean
          message: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_user: boolean
          message: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_user?: boolean
          message?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          content: string
          created_at: string
          id: string
          intent: Database["public"]["Enums"]["content_intent"]
          media_url: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          published_at: string | null
          scheduled_for: string | null
          status: Database["public"]["Enums"]["content_status"]
          type: Database["public"]["Enums"]["content_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          intent: Database["public"]["Enums"]["content_intent"]
          media_url?: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          published_at?: string | null
          scheduled_for?: string | null
          status: Database["public"]["Enums"]["content_status"]
          type: Database["public"]["Enums"]["content_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          intent?: Database["public"]["Enums"]["content_intent"]
          media_url?: string | null
          platform?: Database["public"]["Enums"]["social_platform"]
          published_at?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      content_comments: {
        Row: {
          comment: string
          content_id: string
          created_at: string
          id: string
          user_avatar: string | null
          user_name: string
        }
        Insert: {
          comment: string
          content_id: string
          created_at?: string
          id?: string
          user_avatar?: string | null
          user_name: string
        }
        Update: {
          comment?: string
          content_id?: string
          created_at?: string
          id?: string
          user_avatar?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_comments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      content_metrics: {
        Row: {
          comments: number
          content_id: string
          id: string
          impressions: number
          likes: number
          reach: number
          recorded_at: string
          shares: number
          updated_at: string
          views: number
        }
        Insert: {
          comments?: number
          content_id: string
          id?: string
          impressions?: number
          likes?: number
          reach?: number
          recorded_at?: string
          shares?: number
          updated_at?: string
          views?: number
        }
        Update: {
          comments?: number
          content_id?: string
          id?: string
          impressions?: number
          likes?: number
          reach?: number
          recorded_at?: string
          shares?: number
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_metrics_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_engagement: {
        Row: {
          created_at: string
          day_of_week: string
          engagement_count: number
          id: string
          platform: Database["public"]["Enums"]["social_platform"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: string
          engagement_count: number
          id?: string
          platform: Database["public"]["Enums"]["social_platform"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: string
          engagement_count?: number
          id?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_engagement_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_metrics: {
        Row: {
          created_at: string
          engagement_rate: number
          id: string
          platform: Database["public"]["Enums"]["social_platform"]
          recorded_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          engagement_rate: number
          id?: string
          platform: Database["public"]["Enums"]["social_platform"]
          recorded_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          engagement_rate?: number
          id?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          recorded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      follower_metrics: {
        Row: {
          created_at: string
          follower_count: number
          id: string
          platform: Database["public"]["Enums"]["social_platform"]
          recorded_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          follower_count: number
          id?: string
          platform: Database["public"]["Enums"]["social_platform"]
          recorded_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          follower_count?: number
          id?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          recorded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follower_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean | null
          related_content_id: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          related_content_id?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean | null
          related_content_id?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_content_id_fkey"
            columns: ["related_content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_metrics: {
        Row: {
          created_at: string
          id: string
          platform: Database["public"]["Enums"]["social_platform"]
          total_comments: number
          total_likes: number
          total_shares: number
          total_views: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: Database["public"]["Enums"]["social_platform"]
          total_comments?: number
          total_likes?: number
          total_shares?: number
          total_views?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          total_comments?: number
          total_likes?: number
          total_shares?: number
          total_views?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_connections: {
        Row: {
          access_token: string | null
          api_key: string | null
          api_secret: string | null
          connected: boolean
          created_at: string
          id: string
          last_verified: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          profile_image: string | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          access_token?: string | null
          api_key?: string | null
          api_secret?: string | null
          connected?: boolean
          created_at?: string
          id?: string
          last_verified?: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          profile_image?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          access_token?: string | null
          api_key?: string | null
          api_secret?: string | null
          connected?: boolean
          created_at?: string
          id?: string
          last_verified?: string | null
          platform?: Database["public"]["Enums"]["social_platform"]
          profile_image?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      platform_statistics: {
        Row: {
          avg_reach_per_post: number
          created_at: string
          engagement_rate: number
          id: string
          period_end: string
          period_start: string
          platform: Database["public"]["Enums"]["social_platform"]
          post_count: number
          total_followers: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_reach_per_post?: number
          created_at?: string
          engagement_rate?: number
          id?: string
          period_end: string
          period_start: string
          platform: Database["public"]["Enums"]["social_platform"]
          post_count?: number
          total_followers?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_reach_per_post?: number
          created_at?: string
          engagement_rate?: number
          id?: string
          period_end?: string
          period_start?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          post_count?: number
          total_followers?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          content: string
          created_at: string | null
          external_id: string | null
          id: string
          platform: string
          posted_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          external_id?: string | null
          id?: string
          platform: string
          posted_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          external_id?: string | null
          id?: string
          platform?: string
          posted_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          enable_notifications: boolean | null
          id: string
          language: string | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enable_notifications?: boolean | null
          id?: string
          language?: string | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enable_notifications?: boolean | null
          id?: string
          language?: string | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_id: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          profile_image: string | null
          updated_at: string
        }
        Insert: {
          auth_id?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          profile_image?: string | null
          updated_at?: string
        }
        Update: {
          auth_id?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          profile_image?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_publish_scheduled_content: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      collect_weekly_twitter_statistics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_all_twitter_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      content_intent: "promotional" | "feature" | "news" | "poll"
      content_status: "draft" | "scheduled" | "published"
      content_type: "text" | "image" | "video"
      notification_type: "info" | "success" | "warning" | "error"
      social_platform: "instagram" | "twitter"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
