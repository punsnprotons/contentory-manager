
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      activity_history: {
        Row: {
          activity_detail: Json | null;
          activity_type: string;
          content_id: string | null;
          created_at: string;
          id: string;
          occurred_at: string;
          platform: "instagram" | "twitter";
          user_id: string;
        };
        Insert: {
          activity_detail?: Json | null;
          activity_type: string;
          content_id?: string | null;
          created_at?: string;
          id?: string;
          occurred_at?: string;
          platform: "instagram" | "twitter";
          user_id: string;
        };
      };
      content: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          intent: "promotional" | "feature" | "news" | "poll";
          media_url: string | null;
          platform: "instagram" | "twitter";
          published_at: string | null;
          scheduled_for: string | null;
          status: "draft" | "scheduled" | "published";
          type: "text" | "image" | "video";
          updated_at: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          intent: "promotional" | "feature" | "news" | "poll";
          media_url?: string | null;
          platform: "instagram" | "twitter";
          published_at?: string | null;
          scheduled_for?: string | null;
          status: "draft" | "scheduled" | "published";
          type: "text" | "image" | "video";
          updated_at?: string;
          user_id: string;
        };
      };
      daily_engagement: {
        Row: {
          created_at: string;
          day_of_week: string;
          engagement_count: number;
          id: string;
          platform: "instagram" | "twitter";
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          day_of_week: string;
          engagement_count: number;
          id?: string;
          platform: "instagram" | "twitter";
          updated_at?: string;
          user_id: string;
        };
      };
      engagement_metrics: {
        Row: {
          created_at: string;
          engagement_rate: number;
          id: string;
          platform: "instagram" | "twitter";
          recorded_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          engagement_rate: number;
          id?: string;
          platform: "instagram" | "twitter";
          recorded_at?: string;
          user_id: string;
        };
      };
      follower_metrics: {
        Row: {
          created_at: string;
          follower_count: number;
          id: string;
          platform: "instagram" | "twitter";
          recorded_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          follower_count: number;
          id?: string;
          platform: "instagram" | "twitter";
          recorded_at?: string;
          user_id: string;
        };
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          read: boolean | null;
          related_content_id: string | null;
          type: "info" | "success" | "warning" | "error";
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          read?: boolean | null;
          related_content_id?: string | null;
          type: "info" | "success" | "warning" | "error";
          user_id: string;
        };
      };
      platform_statistics: {
        Row: {
          avg_reach_per_post: number;
          created_at: string;
          engagement_rate: number;
          id: string;
          period_end: string;
          period_start: string;
          platform: "instagram" | "twitter";
          post_count: number;
          total_followers: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          avg_reach_per_post?: number;
          created_at?: string;
          engagement_rate?: number;
          id?: string;
          period_end: string;
          period_start: string;
          platform: "instagram" | "twitter";
          post_count?: number;
          total_followers?: number;
          updated_at?: string;
          user_id: string;
        };
      };
      users: {
        Row: {
          auth_id: string | null;
          created_at: string;
          email: string;
          first_name: string | null;
          id: string;
          last_name: string | null;
          profile_image: string | null;
          updated_at: string;
        };
        Insert: {
          auth_id?: string | null;
          created_at?: string;
          email: string;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          profile_image?: string | null;
          updated_at?: string;
        };
      };
    };
  };
}
