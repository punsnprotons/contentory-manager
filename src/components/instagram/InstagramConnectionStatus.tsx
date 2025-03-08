
import { useState, useEffect } from 'react';
import { checkInstagramConnection, InstagramApiService } from '@/services/instagramApiService';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Instagram } from 'lucide-react';

interface InstagramConnectionStatusProps {
  onConnected?: () => void;
  minimal?: boolean;
}

const InstagramConnectionStatus = ({ onConnected, minimal = false }: InstagramConnectionStatusProps) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const checkConnection = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const connected = await checkInstagramConnection();
        setIsConnected(connected);
        
        if (connected && onConnected) {
          onConnected();
        }
      } catch (error) {
        console.error('Error checking Instagram connection:', error);
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
      const instagramService = await InstagramApiService.create({ user });
      
      if (!instagramService) {
        throw new Error('Failed to initialize Instagram service');
      }
      
      const success = await instagramService.connect();
      
      if (success) {
        setIsConnected(true);
        if (onConnected) onConnected();
      } else {
        toast.error('Failed to connect to Instagram. Please try again.');
      }
    } catch (error) {
      console.error('Error connecting to Instagram:', error);
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
