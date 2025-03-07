
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
      platform_connections: {
        Row: {
          id: string;
          user_id: string;
          platform: string;
          connected: boolean;
          username: string | null;
          last_verified: string | null;
          created_at: string;
          updated_at: string;
          profile_image: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          platform: string;
          connected?: boolean;
          username?: string | null;
          last_verified?: string | null;
          created_at?: string;
          updated_at?: string;
          profile_image?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          platform?: string;
          connected?: boolean;
          username?: string | null;
          last_verified?: string | null;
          created_at?: string;
          updated_at?: string;
          profile_image?: string | null;
        };
      };
      social_posts: {
        Row: {
          id: string;
          user_id: string;
          platform: string;
          content: string;
          external_id: string | null;
          posted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          platform: string;
          content: string;
          external_id?: string | null;
          posted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          platform?: string;
          content?: string;
          external_id?: string | null;
          posted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
