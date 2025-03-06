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
    console.log(`TwitterApiService: Constructor initialized with userId: ${userId}`);
  }

  /**
   * Initialize the Twitter service by loading credentials from the database
   */
  async initialize(): Promise<TwitterApiService> {
    console.log(`TwitterApiService: Initializing service for userId: ${this.userId}`);
    
    // Get user's Twitter connection from the database
    const { data: connection, error } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', this.userId)
      .eq('platform', 'twitter')
      .eq('connected', true)
      .single();
    
    console.log(`TwitterApiService: Query results - connection:`, connection, "error:", error);
    
    if (error || !connection) {
      this.isInitialized = false;
      console.error(`TwitterApiService: Initialization failed - ${error?.message || 'No connected Twitter account found'}`);
      throw new Error('No connected Twitter account found');
    }
    
    this.username = connection.username;
    this.accessToken = connection.access_token || undefined;
    this.accessTokenSecret = connection.refresh_token || undefined;
    this.isInitialized = true;
    
    console.log(`TwitterApiService: Successfully initialized for ${this.username}`);
    
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
    console.log(`TwitterApiService: fetchProfileData - isInitialized: ${this.isInitialized}`);
    
    if (!this.isInitialized) {
      console.error("TwitterApiService: Cannot fetch profile data - service not initialized");
      throw new Error('Twitter service not initialized');
    }
    
    try {
      console.log("TwitterApiService: Fetching profile data via edge function");
      // Get user profile via the edge function
      const response = await supabase.functions.invoke('twitter-integration', {
        method: 'POST',
        body: { endpoint: 'profile' }
      });
      
      console.log("TwitterApiService: Profile response:", response);
      
      if (response.error) {
        console.error("TwitterApiService: Error from edge function:", response.error);
        throw new Error(response.error.message);
      }
      
      const profileData = response.data;
      
      if (profileData && profileData.data) {
        // Store follower count in the database
        if (profileData.data.public_metrics && profileData.data.public_metrics.followers_count) {
          console.log(`TwitterApiService: Storing follower count: ${profileData.data.public_metrics.followers_count}`);
          
          const { error: followerError } = await supabase
            .from('follower_metrics')
            .insert({
              user_id: this.userId,
              platform: 'twitter',
              follower_count: profileData.data.public_metrics.followers_count,
              recorded_at: new Date().toISOString().split('T')[0] // Convert Date to string in ISO format
            });
            
          if (followerError) {
            console.error('TwitterApiService: Error storing follower metrics:', followerError);
          }
        }
        
        // Update platform connection with profile image if available
        if (profileData.data.profile_image_url) {
          console.log(`TwitterApiService: Updating profile image URL: ${profileData.data.profile_image_url}`);
          
          const { error: updateError } = await supabase
            .from('platform_connections')
            .update({
              profile_image: profileData.data.profile_image_url,
              updated_at: new Date().toISOString() // Convert Date to string for updated_at field
            })
            .eq('user_id', this.userId)
            .eq('platform', 'twitter');
            
          if (updateError) {
            console.error('TwitterApiService: Error updating profile image:', updateError);
          }
        }
      }
      
      console.log("TwitterApiService: Successfully fetched and processed profile data");
      return profileData.data;
    } catch (error) {
      console.error('TwitterApiService: Error fetching and storing profile data:', error);
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
      console.log("TwitterApiService: No session available for service creation");
      return null;
    }
    
    try {
      console.log(`TwitterApiService: Creating service for user ID: ${session.user.id}`);
      const service = new TwitterApiService(session.user.id);
      await service.initialize();
      console.log("TwitterApiService: Service successfully created and initialized");
      return service;
    } catch (error) {
      console.error('TwitterApiService: Error creating service:', error);
      return null;
    }
  }

  /**
   * Verify if the service can be initialized with the given user ID
   */
  static async verifyServiceInitialization(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`TwitterApiService: Verifying initialization for userId: ${userId}`);
      const service = new TwitterApiService(userId);
      await service.initialize();
      console.log(`TwitterApiService: Verification successful for user: ${userId}`);
      
      return {
        success: true,
        message: `Twitter service successfully initialized with username: ${service.username}`
      };
    } catch (error) {
      console.error('TwitterApiService: Verification failed:', error);
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
    console.log("TwitterApiService: No session provided to getTwitterApiService");
    return null;
  }
  
  return TwitterApiService.create(session);
}
