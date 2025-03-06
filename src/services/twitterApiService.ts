import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

/**
 * Twitter API Service for making authenticated Twitter API calls
 */
export class TwitterApiService {
  private userId: string;
  private username?: string;
  private accessToken?: string;
  private accessTokenSecret?: string;
  private isInitialized = false;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Initialize the Twitter service by loading credentials from the database
   */
  async initialize(): Promise<TwitterApiService> {
    // Get user's Twitter connection from the database
    const { data: connection, error } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', this.userId)
      .eq('platform', 'twitter')
      .eq('connected', true)
      .single();
    
    if (error || !connection) {
      this.isInitialized = false;
      throw new Error('No connected Twitter account found');
    }
    
    this.username = connection.username;
    this.accessToken = connection.access_token || undefined;
    this.accessTokenSecret = connection.refresh_token || undefined;
    this.isInitialized = true;
    
    return this;
  }

  /**
   * Checks if the service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Send a tweet
   */
  async sendTweet(text: string): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Twitter service not initialized');
    }
    
    try {
      const response = await supabase.functions.invoke('twitter-integration', {
        method: 'POST',
        body: { 
          endpoint: 'tweet',
          text
        }
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error sending tweet:', error);
      throw error;
    }
  }

  /**
   * Get the current user profile
   */
  async getUserProfile(): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Twitter service not initialized');
    }
    
    try {
      const response = await supabase.functions.invoke('twitter-integration', {
        method: 'POST',
        body: { endpoint: 'user' }
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Fetch and store Twitter profile data
   */
  async fetchProfileData(): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Twitter service not initialized');
    }
    
    try {
      // Get user profile via the edge function
      const response = await supabase.functions.invoke('twitter-integration', {
        method: 'POST',
        body: { endpoint: 'profile' }
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      const profileData = response.data;
      
      if (profileData && profileData.data) {
        // Store follower count in the database
        if (profileData.data.public_metrics && profileData.data.public_metrics.followers_count) {
          const { error: followerError } = await supabase
            .from('follower_metrics')
            .insert({
              user_id: this.userId,
              platform: 'twitter',
              follower_count: profileData.data.public_metrics.followers_count,
              recorded_at: new Date().toISOString().split('T')[0] // Convert Date to string in ISO format
            });
            
          if (followerError) {
            console.error('Error storing follower metrics:', followerError);
          }
        }
        
        // Update platform connection with profile image if available
        if (profileData.data.profile_image_url) {
          const { error: updateError } = await supabase
            .from('platform_connections')
            .update({
              profile_image: profileData.data.profile_image_url,
              updated_at: new Date().toISOString() // Convert Date to string for updated_at field
            })
            .eq('user_id', this.userId)
            .eq('platform', 'twitter');
            
          if (updateError) {
            console.error('Error updating profile image:', updateError);
          }
        }
      }
      
      return profileData.data;
    } catch (error) {
      console.error('Error fetching and storing Twitter profile data:', error);
      throw error;
    }
  }

  /**
   * Verify the Twitter credentials
   */
  async verifyCredentials(): Promise<any> {
    try {
      const response = await supabase.functions.invoke('twitter-integration', {
        method: 'POST',
        body: { endpoint: 'verify' }
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error verifying credentials:', error);
      throw error;
    }
  }

  /**
   * Initialize Twitter OAuth flow
   */
  async initiateAuth(): Promise<string> {
    try {
      const response = await supabase.functions.invoke('twitter-integration', {
        method: 'POST',
        body: { endpoint: 'auth' }
      });
      
      if (response.error || !response.data?.success || !response.data?.authURL) {
        throw new Error(response.error?.message || 'Failed to initialize Twitter authentication');
      }
      
      return response.data.authURL;
    } catch (error) {
      console.error('Error initiating Twitter auth:', error);
      throw error;
    }
  }

  /**
   * Factory method to create and initialize a TwitterApiService
   */
  static async create(session: Session | null): Promise<TwitterApiService | null> {
    if (!session?.user) {
      console.log("No session available for Twitter service creation");
      return null;
    }
    
    try {
      const service = new TwitterApiService(session.user.id);
      await service.initialize();
      return service;
    } catch (error) {
      console.error('Error creating Twitter service:', error);
      return null;
    }
  }

  /**
   * Verify if the service can be initialized with the given user ID
   */
  static async verifyServiceInitialization(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`Attempting to initialize TwitterApiService with userId: ${userId}`);
      const service = new TwitterApiService(userId);
      await service.initialize();
      console.log(`TwitterApiService successfully initialized for user: ${userId}`);
      
      return {
        success: true,
        message: `Twitter service successfully initialized with username: ${service.username}`
      };
    } catch (error) {
      console.error('Error initializing TwitterApiService:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error initializing Twitter service'
      };
    }
  }
}

// Utility function to get an instance of the Twitter API service
export async function getTwitterApiService(session: Session | null): Promise<TwitterApiService | null> {
  if (!session?.user) {
    return null;
  }
  
  return TwitterApiService.create(session);
}
