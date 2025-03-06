
// Import necessary modules
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export class TwitterApiService {
  userId: string;
  
  /**
   * Create a new instance of TwitterApiService with authentication
   */
  constructor(userId: string) {
    this.userId = userId;
  }
  
  /**
   * Factory method to create a new instance with session validation
   */
  static async create(session: Session | null): Promise<TwitterApiService | null> {
    if (!session?.user) {
      console.error('TwitterApiService: No session available');
      return null;
    }
    
    return new TwitterApiService(session.user.id);
  }
  
  /**
   * Initiate Twitter authentication flow
   */
  async initiateAuth(): Promise<string> {
    try {
      console.log('TwitterApiService: Initiating Twitter auth');
      
      // Call the Twitter API edge function with auth endpoint
      const { data, error } = await supabase.functions.invoke('twitter-api', {
        method: 'POST',
        headers: {
          'path': '/auth'
        },
        body: { timestamp: Date.now() } // Add timestamp to avoid caching
      });
      
      console.log('TwitterApiService: Auth response:', data);
      
      if (error) {
        console.error('TwitterApiService: Error initiating Twitter auth:', error);
        
        // Check for rate limiting
        if (error.message && error.message.includes('429')) {
          throw new Error('Twitter API rate limit exceeded. Please try again in a few minutes.');
        }
        
        throw new Error('Failed to initiate Twitter authentication');
      }
      
      if (!data || !data.success || !data.authURL) {
        console.error('TwitterApiService: Invalid response format:', data);
        throw new Error('Failed to get auth URL');
      }
      
      // Return the auth URL to redirect the user
      return data.authURL;
    } catch (error) {
      console.error('TwitterApiService: Error initiating Twitter auth:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get auth URL');
    }
  }
  
  /**
   * Verify Twitter credentials
   */
  async verifyCredentials(): Promise<boolean> {
    try {
      console.log('TwitterApiService: Verifying Twitter credentials');
      
      const { data, error } = await supabase.functions.invoke('twitter-api', {
        method: 'POST',
        headers: {
          'path': '/verify-credentials'
        },
        body: { timestamp: Date.now() } // Add timestamp to avoid caching
      });
      
      if (error) {
        // Check for rate limiting
        if (error.message && error.message.includes('429')) {
          console.error('TwitterApiService: Rate limit exceeded:', error);
          toast.error('Twitter API rate limit exceeded. Please try again in a few minutes.');
          return false;
        }
        
        console.error('TwitterApiService: Error verifying credentials:', error);
        return false;
      }
      
      if (!data || !data.verified) {
        console.log('TwitterApiService: Credentials not verified:', data);
        return false;
      }
      
      console.log('TwitterApiService: Credentials verified successfully');
      return true;
    } catch (error) {
      console.error('TwitterApiService: Error verifying credentials:', error);
      return false;
    }
  }
  
  /**
   * Store Twitter connection in database
   */
  async storeConnection(username: string): Promise<boolean> {
    try {
      console.log('TwitterApiService: Storing Twitter connection for user:', this.userId);
      
      const { error } = await supabase
        .from('platform_connections')
        .upsert({
          user_id: this.userId,
          platform: 'twitter',
          connected: true,
          username: username
        });
        
      if (error) {
        console.error('TwitterApiService: Error storing connection:', error);
        return false;
      }
      
      console.log('TwitterApiService: Connection stored successfully');
      return true;
    } catch (error) {
      console.error('TwitterApiService: Error storing connection:', error);
      return false;
    }
  }
  
  /**
   * Post a tweet
   */
  async postTweet(content: string): Promise<any> {
    try {
      console.log('TwitterApiService: Posting tweet');
      
      const { data, error } = await supabase.functions.invoke('twitter-api', {
        method: 'POST',
        headers: {
          'path': '/tweet'
        },
        body: { content }
      });
      
      if (error) {
        console.error('TwitterApiService: Error posting tweet:', error);
        throw error;
      }
      
      console.log('TwitterApiService: Tweet posted successfully:', data);
      return data;
    } catch (error) {
      console.error('TwitterApiService: Error posting tweet:', error);
      throw error;
    }
  }
  
  /**
   * Fetch user tweets
   */
  async fetchUserTweets(limit: number = 10): Promise<any> {
    try {
      console.log('TwitterApiService: Fetching user tweets');
      
      const { data, error } = await supabase.functions.invoke('twitter-api', {
        method: 'POST',
        headers: {
          'path': '/refresh'
        },
        body: { limit }
      });
      
      if (error) {
        console.error('TwitterApiService: Error fetching tweets:', error);
        throw error;
      }
      
      console.log('TwitterApiService: Tweets fetched successfully');
      return data;
    } catch (error) {
      console.error('TwitterApiService: Error fetching tweets:', error);
      throw error;
    }
  }
  
  /**
   * Fetch profile data
   */
  async fetchProfileData(): Promise<any> {
    try {
      console.log('TwitterApiService: Fetching profile data');
      
      const { data, error } = await supabase.functions.invoke('twitter-api', {
        method: 'POST',
        headers: {
          'path': '/verify-credentials'
        },
        body: {}
      });
      
      if (error) {
        console.error('TwitterApiService: Error fetching profile data:', error);
        throw error;
      }
      
      if (!data || !data.verified || !data.user) {
        console.error('TwitterApiService: Invalid profile data response:', data);
        throw new Error('Failed to fetch profile data');
      }
      
      // Store connection with username
      if (data.user.username) {
        await this.storeConnection(data.user.username);
      }
      
      console.log('TwitterApiService: Profile data fetched successfully');
      return data.user;
    } catch (error) {
      console.error('TwitterApiService: Error fetching profile data:', error);
      throw error;
    }
  }
}
