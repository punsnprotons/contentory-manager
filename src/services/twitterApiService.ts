
// Import necessary modules
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Rate limiting constants
const RATE_LIMIT_BACKOFF_MS = 5000; // 5 seconds backoff for retry
const MAX_RETRIES = 2;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes window for rate limiting
const MAX_REQUESTS_PER_WINDOW = 5; // Maximum requests per window

export class TwitterApiService {
  userId: string;
  private lastRequestTime = 0;
  private static requestCounts: Record<string, { count: number, requests: number[], timestamp: number }> = {};
  
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
   * Check if we're currently rate limited for a specific endpoint
   */
  private static isRateLimited(endpoint: string): boolean {
    const now = Date.now();
    const entry = TwitterApiService.requestCounts[endpoint];
    
    if (!entry) {
      return false;
    }
    
    // Reset count if it's been more than the window time since the first request
    if (now - entry.timestamp > RATE_LIMIT_WINDOW_MS) {
      delete TwitterApiService.requestCounts[endpoint];
      return false;
    }
    
    // Clean up old requests
    entry.requests = entry.requests.filter(time => now - time < RATE_LIMIT_WINDOW_MS);
    
    // Check if we've made too many requests in the window
    if (entry.requests.length >= MAX_REQUESTS_PER_WINDOW) {
      console.log(`TwitterApiService: Rate limiting ${endpoint}, count: ${entry.requests.length}`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Track request for rate limiting
   */
  private static trackRequest(endpoint: string): void {
    const now = Date.now();
    const entry = TwitterApiService.requestCounts[endpoint];
    
    if (!entry) {
      TwitterApiService.requestCounts[endpoint] = { 
        count: 1, 
        requests: [now],
        timestamp: now 
      };
    } else {
      entry.requests.push(now);
      entry.count++;
    }
  }
  
  /**
   * Calculate remaining time before rate limit resets
   */
  private static getRateLimitResetTime(endpoint: string): number {
    const now = Date.now();
    const entry = TwitterApiService.requestCounts[endpoint];
    
    if (!entry || entry.requests.length === 0) {
      return 0;
    }
    
    // Find oldest request in the window
    const oldestRequest = Math.min(...entry.requests);
    const resetTime = oldestRequest + RATE_LIMIT_WINDOW_MS - now;
    
    return Math.max(0, resetTime);
  }
  
  /**
   * Format rate limit wait time to human-readable string
   */
  private static formatRateLimitWaitTime(ms: number): string {
    if (ms < 60000) {
      return 'less than a minute';
    } else if (ms < 3600000) {
      const minutes = Math.ceil(ms / 60000);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    } else {
      const hours = Math.ceil(ms / 3600000);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
  }
  
  /**
   * Initiate Twitter authentication flow
   */
  async initiateAuth(retryCount = 0): Promise<string> {
    const endpoint = 'auth';
    
    try {
      console.log('TwitterApiService: Initiating Twitter auth');
      
      // Check client-side rate limiting
      if (TwitterApiService.isRateLimited(endpoint)) {
        const waitTime = TwitterApiService.getRateLimitResetTime(endpoint);
        const formattedTime = TwitterApiService.formatRateLimitWaitTime(waitTime);
        throw new Error(`Twitter API rate limit exceeded. Please try again in ${formattedTime}.`);
      }
      
      // Track this request
      TwitterApiService.trackRequest(endpoint);
      
      // Call the Twitter API edge function with auth endpoint
      const { data, error } = await supabase.functions.invoke('twitter-integration', {
        method: 'POST',
        headers: {
          'path': '/auth'
        },
        body: { 
          endpoint: 'auth',
          timestamp: Date.now() // Add timestamp to avoid caching
        }
      });
      
      console.log('TwitterApiService: Auth response:', data);
      
      if (error) {
        console.error('TwitterApiService: Error initiating Twitter auth:', error);
        
        // Check for rate limiting
        if (error.message && (
          error.message.includes('429') || 
          error.message.includes('rate limit') || 
          error.message.includes('Too Many Requests')
        )) {
          if (retryCount < MAX_RETRIES) {
            console.log(`TwitterApiService: Rate limit hit, retrying in ${RATE_LIMIT_BACKOFF_MS}ms (${retryCount + 1}/${MAX_RETRIES})`);
            
            // Wait and retry with exponential backoff
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_BACKOFF_MS * Math.pow(2, retryCount)));
            return this.initiateAuth(retryCount + 1);
          }
          
          throw new Error('Twitter API rate limit exceeded. Please try again in a few minutes.');
        }
        
        throw new Error('Failed to initiate Twitter authentication: ' + error.message);
      }
      
      if (!data || !data.success || !data.authURL) {
        console.error('TwitterApiService: Invalid response format:', data);
        
        // Check for rate limit indicator in the response
        if (data && data.rateLimited) {
          const waitTime = data.resetTime ? TwitterApiService.formatRateLimitWaitTime(data.resetTime) : 'a few minutes';
          throw new Error(data.error || `Twitter API rate limit exceeded. Please try again in ${waitTime}.`);
        }
        
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
