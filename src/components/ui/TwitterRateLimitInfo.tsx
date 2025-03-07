import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import { TwitterApiService } from '@/services/twitterApiService';
import { getCurrentSession } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Define the constant here to keep it in sync with the service
const MAX_REQUESTS_PER_WINDOW = 3;

export function TwitterRateLimitInfo() {
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<any>(null);
  const [clientLimits, setClientLimits] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Get client-side rate limit info
  useEffect(() => {
    const clientLimits = TwitterApiService.getRateLimitStatus();
    setClientLimits(clientLimits);
    
    // Refresh client limits every 30 seconds
    const intervalId = setInterval(() => {
      const updatedLimits = TwitterApiService.getRateLimitStatus();
      setClientLimits(updatedLimits);
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Check if we're rate limited on any endpoint
  const isAnyEndpointLimited = clientLimits && 
    Object.values(clientLimits.endpoints).some((endpoint: any) => endpoint.isLimited);
  
  // Calculate next reset time
  let nextResetTime = '';
  if (clientLimits) {
    nextResetTime = clientLimits.globalReset;
  } else if (rateLimitInfo?.globalStatus?.nextResetTime) {
    const resetDate = new Date(rateLimitInfo.globalStatus.nextResetTime);
    nextResetTime = resetDate.toLocaleString();
  }
  
  const fetchRateLimitInfo = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const session = await getCurrentSession();
      if (!session) {
        setError('You must be logged in to check rate limits');
        return;
      }
      
      const twitterService = await TwitterApiService.create(session);
      if (!twitterService) {
        setError('Failed to initialize Twitter service');
        return;
      }
      
      const result = await twitterService.getTwitterPlatformLimits();
      if (!result.success) {
        setError(result.error || 'Failed to fetch Twitter rate limits');
        return;
      }
      
      setRateLimitInfo(result.limits);
      
      // Update client-side limits after fetching server-side info
      const updatedClientLimits = TwitterApiService.getRateLimitStatus();
      setClientLimits(updatedClientLimits);
      
      toast.success('Rate limit information refreshed');
    } catch (error) {
      console.error('Error fetching rate limit info:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Twitter API Rate Limits
        </CardTitle>
        <CardDescription>
          Check your current rate limit status for Twitter API endpoints
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isAnyEndpointLimited && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Rate Limited</AlertTitle>
            <AlertDescription>
              One or more Twitter API endpoints are currently rate limited. 
              Rate limits will reset in approximately {nextResetTime}.
            </AlertDescription>
          </Alert>
        )}
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error checking rate limits</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Client-Side Rate Limits:</h3>
            {clientLimits && (
              <div className="text-sm text-muted-foreground">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(clientLimits.endpoints).map(([endpoint, info]: [string, any]) => (
                    <div key={endpoint} className="border rounded p-2">
                      <p className="font-medium">{endpoint}</p>
                      <p>Status: {info.isLimited ? '🔴 Limited' : '🟢 OK'}</p>
                      <p>Requests remaining: {info.requestsLeft}/{MAX_REQUESTS_PER_WINDOW}</p>
                      {info.isLimited && (
                        <p>Resets in: {info.resetTimeFormatted}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {(!clientLimits || Object.keys(clientLimits.endpoints).length === 0) && (
              <p className="text-sm text-muted-foreground">No rate limit data available. Make some Twitter API requests first.</p>
            )}
          </div>
          
          {rateLimitInfo && (
            <div>
              <h3 className="font-medium mb-2">Twitter Platform Limits:</h3>
              <div className="text-sm text-muted-foreground">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(rateLimitInfo.twitterLimits || {}).map(([endpoint, info]: [string, any]) => (
                    <div key={endpoint} className="border rounded p-2">
                      <p className="font-medium">{info.description}</p>
                      <p>Remaining: {info.remaining}/{info.limit}</p>
                      <p>Resets at: {new Date(info.resetAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={fetchRateLimitInfo} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Checking rate limits...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Current Rate Limits
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default TwitterRateLimitInfo;
