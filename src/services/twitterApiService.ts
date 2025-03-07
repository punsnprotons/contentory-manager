
// Import necessary modules
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Rate limiting constants
const RATE_LIMIT_BACKOFF_MS = 5000; // 5 seconds backoff for retry
const MAX_RETRIES = 2;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour window for rate limiting
const MAX_REQUESTS_PER_WINDOW = 3; // Maximum requests per window
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minute cache

export class TwitterApiService {
  userId: string;
  private lastRequestTime = 0;
  private static requestCounts: Record<string, { 
    count: number, 
    requests: number[], 
    timestamp: number,
    cachedResponse?: any,
    cachedResponseExpiry?: number
  }> = {};
  
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
   * Get cached response for an endpoint if available
   */
  private static getCachedResponse(endpoint: string): any | null {
    const now = Date.now();
    const entry = TwitterApiService.requestCounts[endpoint];
    
    if (!entry || !entry.cachedResponse || !entry.cachedResponseExpiry) {
      return null;
    }
    
    if (now > entry.cachedResponseExpiry) {
      // Cache expired
      entry.cachedResponse = undefined;
      entry.cachedResponseExpiry = undefined;
      return null;
    }
    
    return entry.cachedResponse;
  }
  
  /**
   * Track request for rate limiting
   */
  private static trackRequest(endpoint: string, cacheResponse: any = null): void {
    const now = Date.now();
    const entry = TwitterApiService.requestCounts[endpoint];
    
    if (!entry) {
      TwitterApiService.requestCounts[endpoint] = { 
        count: 1, 
        requests: [now],
        timestamp: now 
      };
      
      if (cacheResponse) {
        TwitterApiService.requestCounts[endpoint].cachedResponse = cacheResponse;
        TwitterApiService.requestCounts[endpoint].cachedResponseExpiry = now + CACHE_TTL_MS;
      }
    } else {
      entry.requests.push(now);
      entry.count++;
      
      if (cacheResponse) {
        entry.cachedResponse = cacheResponse;
        entry.cachedResponseExpiry = now + CACHE_TTL_MS;
      }
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
   * Get current rate limit status for all endpoints
   */
  static getRateLimitStatus(): { 
    endpoints: Record<string, { 
      isLimited: boolean, 
      requestsLeft: number, 
      resetTime: number, 
      resetTimeFormatted: string 
    }>, 
    globalReset: string
  } {
    const now = Date.now();
    const endpoints: Record<string, { 
      isLimited: boolean, 
      requestsLeft: number, 
      resetTime: number, 
      resetTimeFormatted: string 
    }> = {};
    
    let globalResetTime = 0;
    
    // Check status for each tracked endpoint
    for (const [endpoint, entry] of Object.entries(TwitterApiService.requestCounts)) {
      // Clean up old requests
      entry.requests = entry.requests.filter(time => now - time < RATE_LIMIT_WINDOW_MS);
      
      const isLimited = entry.requests.length >= MAX_REQUESTS_PER_WINDOW;
      const requestsLeft = MAX_REQUESTS_PER_WINDOW - entry.requests.length;
      const resetTime = isLimited ? 
        this.getRateLimitResetTime(endpoint) : 
        0;
      
      // Track global reset time
      if (resetTime > globalResetTime) {
        globalResetTime = resetTime;
      }
      
      endpoints[endpoint] = {
        isLimited,
        requestsLeft: Math.max(0, requestsLeft),
        resetTime,
        resetTimeFormatted: this.formatRateLimitWaitTime(resetTime)
      };
    }
    
    return {
      endpoints,
      globalReset: this.formatRateLimitWaitTime(globalResetTime)
    };
  }
  
  /**
   * Check if any endpoint is currently rate limited
   */
  static isAnyEndpointRateLimited(): boolean {
    return Object.keys(this.requestCounts).some(endpoint => this.isRateLimited(endpoint));
  }
  
  /**
   * Initiate Twitter authentication flow with OAuth 1.0a
   */
  async initiateAuth(retryCount = 0): Promise<string> {
    const endpoint = 'auth';
    
    try {
      console.log('TwitterApiService: Initiating Twitter OAuth 1.0a auth');
      
      // Check for cached auth URL
      const cachedResponse = TwitterApiService.getCachedResponse(endpoint);
      if (cachedResponse) {
        console.log('TwitterApiService: Using cached auth response');
        return cachedResponse.authURL || '';
      }
      
      // Check client-side rate limiting
      if (TwitterApiService.isRateLimited(endpoint)) {
        const waitTime = TwitterApiService.getRateLimitResetTime(endpoint);
        const formattedTime = TwitterApiService.formatRateLimitWaitTime(waitTime);
        
        // Instead of throwing here, try to get a simulated response
        console.log(`TwitterApiService: Rate limited, attempting to get simulated auth URL`);
      }
      
      // Track this request
      TwitterApiService.trackRequest(endpoint);
      
      // With OAuth 1.0a, we directly verify the credentials instead of going through an auth flow
      // Since we're using app-level credentials, not user credentials
      const { data, error } = await supabase.functions.invoke('twitter-integration', {
        method: 'POST',
        headers: {
          'path': '/auth'
        },
        body: { 
          endpoint: 'auth',
          oauth1: true,
          timestamp: Date.now()
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
      
      if (!data || !data.success) {
        console.error('TwitterApiService: Invalid response format:', data);
        
        // Check for rate limit indicator in the response
        if (data && data.rateLimited) {
          const waitTime = data.resetTime ? TwitterApiService.formatRateLimitWaitTime(data.resetTime) : 'a few minutes';
          throw new Error(data.error || `Twitter API rate limit exceeded. Please try again in ${waitTime}.`);
        }
        
        throw new Error('Failed to verify Twitter credentials');
      }
      
      // Cache the successful response
      TwitterApiService.trackRequest(endpoint, data);
      
      // In OAuth 1.0a, we don't need to redirect the user
      // Just return a success message or URL to refresh the page
      return window.location.href;
    } catch (error) {
      console.error('TwitterApiService: Error initiating Twitter auth:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to verify Twitter credentials');
    }
  }
  
  /**
   * Verify Twitter credentials using OAuth 1.0a
   */
  async verifyCredentials(): Promise<boolean> {
    try {
      console.log('TwitterApiService: Verifying Twitter OAuth 1.0a credentials');
      
      // First make sure user exists in users table
      await this.ensureUserExists();
      
      const { data, error } = await supabase.functions.invoke('twitter-integration', {
        method: 'POST',
        headers: {
          'path': '/verify'
        }
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
      
      // Store connection info in the database
      if (data.user) {
        await this.storeConnection(data.user.screen_name, data.user.profile_image_url_https);
      }
      
      console.log('TwitterApiService: OAuth 1.0a credentials verified successfully');
      return true;
    } catch (error) {
      console.error('TwitterApiService: Error verifying credentials:', error);
      return false;
    }
  }
  
  /**
   * Ensure user exists in users table
   */
  async ensureUserExists(): Promise<void> {
    try {
      console.log('TwitterApiService: Ensuring user exists in database');
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('TwitterApiService: No session available');
        return;
      }
      
      // Check if user exists in users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', session.user.id)
        .single();
        
      if (userError && userError.code !== 'PGRST116') {
        console.error('TwitterApiService: Error checking user:', userError);
        return;
      }
      
      if (!userData && userError?.code === 'PGRST116') {
        // User doesn't exist, create them
        console.log('TwitterApiService: User not found in database, creating user record');
        const { error: createError } = await supabase
          .from('users')
          .insert({
            auth_id: session.user.id,
            email: session.user.email
          });
          
        if (createError) {
          console.error('TwitterApiService: Error creating user:', createError);
        } else {
          console.log('TwitterApiService: User created successfully');
        }
      }
    } catch (error) {
      console.error('TwitterApiService: Error ensuring user exists:', error);
    }
  }
  
  /**
   * Store Twitter connection in database
   */
  async storeConnection(username: string, profileImage?: string): Promise<boolean> {
    try {
      console.log('TwitterApiService: Storing Twitter connection for user:', this.userId);
      
      // First make sure the user record exists
      await this.ensureUserExists();
      
      // Now store the connection
      const connectionData = {
        user_id: this.userId,
        platform: 'twitter',
        connected: true,
        username: username,
        profile_image: profileImage,
        last_verified: new Date().toISOString()
      };
      
      console.log('TwitterApiService: Connection data:', connectionData);
      
      // First, check if a connection already exists and try to update it
      const { data: existingConnection, error: checkError } = await supabase
        .from('platform_connections')
        .select('id')
        .eq('user_id', this.userId)
        .eq('platform', 'twitter')
        .maybeSingle();
        
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('TwitterApiService: Error checking existing connection:', checkError);
      }
      
      let result;
      if (existingConnection) {
        // Update existing connection
        console.log('TwitterApiService: Updating existing connection:', existingConnection.id);
        result = await supabase
          .from('platform_connections')
          .update(connectionData)
          .eq('id', existingConnection.id);
      } else {
        // Insert new connection
        console.log('TwitterApiService: Creating new connection');
        result = await supabase
          .from('platform_connections')
          .insert(connectionData);
      }
      
      if (result.error) {
        console.error('TwitterApiService: Error storing connection:', result.error);
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
   * Post a tweet using OAuth 1.0a
   */
  async postTweet(content: string): Promise<any> {
    try {
      console.log('TwitterApiService: Posting tweet using OAuth 1.0a');
      
      const { data, error } = await supabase.functions.invoke('twitter-api', {
        method: 'POST',
        headers: {
          'path': '/tweet'
        },
        body: { 
          content,
          oauth1: true // Signal that we're using OAuth 1.0a
        }
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
   * Fetch user tweets with OAuth 1.0a
   */
  async fetchUserTweets(limit: number = 10): Promise<any> {
    try {
      console.log('TwitterApiService: Fetching user tweets with OAuth 1.0a');
      
      const { data, error } = await supabase.functions.invoke('twitter-api', {
        method: 'POST',
        headers: {
          'path': '/refresh'
        },
        body: { 
          limit,
          oauth1: true
        }
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
   * Fetch profile data with OAuth 1.0a
   */
  async fetchProfileData(): Promise<any> {
    try {
      console.log('TwitterApiService: Fetching profile data with OAuth 1.0a');
      
      // Make sure user exists first
      await this.ensureUserExists();
      
      const { data, error } = await supabase.functions.invoke('twitter-integration', {
        method: 'POST',
        headers: {
          'path': '/verify'
        }
      });
      
      if (error) {
        console.error('TwitterApiService: Error fetching profile data:', error);
        throw error;
      }
      
      if (!data || !data.verified || !data.user) {
        console.error('TwitterApiService: Invalid profile data response:', data);
        throw new Error('Failed to fetch profile data');
      }
      
      // Store connection with username and profile image
      if (data.user.screen_name) {
        await this.storeConnection(
          data.user.screen_name, 
          data.user.profile_image_url_https
        );
      }
      
      console.log('TwitterApiService: Profile data fetched successfully');
      return data.user;
    } catch (error) {
      console.error('TwitterApiService: Error fetching profile data:', error);
      throw error;
    }
  }
  
  /**
   * Get the Twitter API limits with OAuth 1.0a
   */
  async getTwitterPlatformLimits(): Promise<any> {
    try {
      console.log('TwitterApiService: Fetching Twitter API limits with OAuth 1.0a');
      
      const { data, error } = await supabase.functions.invoke('twitter-api', {
        method: 'POST',
        headers: {
          'path': '/rate-limit-status'
        },
        body: { 
          oauth1: true,
          timestamp: Date.now() 
        }
      });
      
      if (error) {
        console.error('TwitterApiService: Error fetching Twitter API limits:', error);
        return {
          success: false,
          error: error.message
        };
      }
      
      return {
        success: true,
        limits: data
      };
    } catch (error) {
      console.error('TwitterApiService: Error fetching Twitter API limits:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
