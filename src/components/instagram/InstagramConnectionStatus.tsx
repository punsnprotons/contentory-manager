import { useState, useEffect } from 'react';
import { checkInstagramConnection, InstagramApiService } from '@/services/instagramApiService';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Instagram, AlertCircle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface InstagramConnectionStatusProps {
  onConnected?: () => void;
  minimal?: boolean;
}

const InstagramConnectionStatus = ({ onConnected, minimal = false }: InstagramConnectionStatusProps) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const checkConnection = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const connected = await checkInstagramConnection();
        setIsConnected(connected);
        setConnectionError(null);
        
        if (connected && onConnected) {
          onConnected();
        }
      } catch (error) {
        console.error('Error checking Instagram connection:', error);
        setConnectionError('Failed to verify Instagram connection status');
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();
  }, [user, onConnected]);

  const handleConnect = async () => {
    if (!user) {
      toast.error('You need to be logged in to connect to Instagram');
      return;
    }

    try {
      setIsConnecting(true);
      setConnectionError(null);
      const instagramService = await InstagramApiService.create({ user: { id: user.id } });
      
      if (!instagramService) {
        throw new Error('Failed to initialize Instagram service');
      }
      
      const success = await instagramService.connect();
      
      if (success) {
        setIsConnected(true);
        if (onConnected) onConnected();
      } else {
        setConnectionError('Instagram connection failed. Please check app permissions and try again.');
        toast.error('Failed to connect to Instagram. Please try again.');
      }
    } catch (error) {
      console.error('Error connecting to Instagram:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Check for specific Instagram scope errors
      if (errorMessage.includes('Invalid scope') || errorMessage.toLowerCase().includes('scope')) {
        setConnectionError('Instagram API scope error. Please check the Instagram API permissions in your Meta Developer Portal.');
      } else {
        setConnectionError(`Instagram connection error: ${errorMessage}`);
      }
      toast.error('Error connecting to Instagram');
    } finally {
      setIsConnecting(false);
    }
  };

  if (minimal) {
    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    
    if (isConnected) {
      return <Instagram className="h-4 w-4 text-green-500" />;
    }
    
    return (
      <Button size="sm" variant="outline" onClick={handleConnect} disabled={isConnecting}>
        {isConnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Instagram className="h-4 w-4 mr-2" />}
        Connect
      </Button>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span>Checking Instagram connection...</span>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-md">
        <Instagram className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
        <span className="text-green-700 dark:text-green-300">Connected to Instagram</span>
      </div>
    );
  }

  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md">
      <div className="flex flex-col">
        <div className="flex items-center mb-2">
          <Instagram className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
          <span className="text-gray-700 dark:text-gray-300">Not connected to Instagram</span>
        </div>
        
        {connectionError && (
          <Alert variant="destructive" className="mb-3">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>{connectionError}</AlertDescription>
            
            <div className="mt-2 text-xs">
              <p>Possible solutions:</p>
              <ul className="list-disc ml-5 mt-1">
                <li>Make sure your Instagram App has "Instagram Basic Display" product added</li>
                <li>Ensure the correct permission scopes are configured in Meta Developer Portal</li>
                <li>For Instagram Basic Display API, use <code>instagram_graph_user_profile</code> and <code>instagram_graph_user_media</code> as scopes</li>
                <li>Verify your redirect URI matches exactly in both Supabase and Meta Developer Portal</li>
                <li>Check that your app is in "Live" mode in the Meta Developer Portal</li>
                <li>Make sure your Instagram test users are properly configured if in development mode</li>
              </ul>
              <a 
                href="https://developers.facebook.com/apps/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-500 hover:text-blue-700 mt-2"
              >
                Open Meta Developer Portal <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>
          </Alert>
        )}
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Connect your Instagram account to publish content directly from this app.
        </p>
        <Button onClick={handleConnect} disabled={isConnecting}>
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Connecting...
            </>
          ) : (
            <>
              <Instagram className="h-4 w-4 mr-2" />
              Connect Instagram
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default InstagramConnectionStatus;
