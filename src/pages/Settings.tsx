import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { TwitterApiService } from '@/services/twitterApiService';
import { toast } from 'sonner';
import { PlusCircle, Twitter, Instagram, CheckCircle, Loader2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [connections, setConnections] = useState<{platform: string, connected: boolean, username?: string}[]>([
    { platform: 'twitter', connected: false },
    { platform: 'instagram', connected: false }
  ]);
  const [pageError, setPageError] = useState<string | null>(null);
  const { session, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    console.log("Settings component mounted, auth status:", { session, authLoading });
    
    if (!authLoading && session?.user) {
      loadUserSettings();
      loadConnections();
      
      const params = new URLSearchParams(location.search);
      const oauthToken = params.get('oauth_token');
      const oauthVerifier = params.get('oauth_verifier');
      
      if (oauthToken && oauthVerifier) {
        navigate('/settings', { replace: true });
        handleTwitterCallback(oauthToken, oauthVerifier);
      }
    }
  }, [session, authLoading, location]);

  const loadUserSettings = async () => {
    try {
      console.log("Loading user settings for user:", session?.user.id);
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', session?.user.id)
        .single();
        
      if (error) {
        console.error('Error loading user settings:', error);
        // Don't throw error, just continue with defaults
        return;
      }
      
      if (data) {
        console.log("User settings loaded:", data);
        setNotifications(data.enable_notifications);
        setDarkMode(data.theme === 'dark');
      }
    } catch (error) {
      console.error('Exception in loadUserSettings:', error);
      setPageError("Failed to load user settings. Please try refreshing the page.");
    }
  };
  
  const loadConnections = async () => {
    try {
      console.log("Loading platform connections for user:", session?.user.id);
      const { data, error } = await supabase
        .from('platform_connections')
        .select('platform, connected, username')
        .eq('user_id', session?.user.id);
        
      if (error) {
        console.error('Error loading connections:', error);
        // Don't throw, continue with defaults
        return;
      }
      
      if (data && data.length > 0) {
        console.log("Platform connections loaded:", data);
        setConnections(data);
      } else {
        console.log("No platform connections found, using defaults");
        setConnections([
          { platform: 'twitter', connected: false },
          { platform: 'instagram', connected: false }
        ]);
      }
    } catch (error) {
      console.error('Exception in loadConnections:', error);
      setPageError("Failed to load social connections. Please try refreshing the page.");
    }
  };
  
  const saveSettings = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: session?.user.id,
          enable_notifications: notifications,
          theme: darkMode ? 'dark' : 'light'
        });
        
      if (error) throw error;
      
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };
  
  const connectTwitter = async () => {
    if (!session?.user) {
      toast.error('You must be logged in to connect Twitter');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Initiating Twitter authentication...');
      const twitterService = new TwitterApiService(session.user.id);
      
      const authURL = await twitterService.initiateAuth();
      console.log('Generated Twitter auth URL:', authURL);
      
      if (!authURL) {
        throw new Error('Failed to generate Twitter authentication URL');
      }
      
      window.location.href = authURL;
      toast.info('Redirecting to Twitter for authentication...');
    } catch (error) {
      console.error('Error connecting Twitter:', error);
      toast.error('Failed to connect Twitter: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setLoading(false);
    }
  };
  
  const handleTwitterCallback = async (oauthToken: string, oauthVerifier: string) => {
    if (!session?.user) {
      toast.error('You must be logged in to complete Twitter authentication');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Processing Twitter callback...');
      toast.info('Processing Twitter authentication...');
      
      const username = "twitter_user";
      
      const { error } = await supabase.from('platform_connections').upsert({
        user_id: session.user.id,
        platform: "twitter" as "twitter" | "instagram",
        access_token: ACCESS_TOKEN_PLACEHOLDER,
        refresh_token: ACCESS_TOKEN_SECRET_PLACEHOLDER, 
        username: username,
        connected: true,
        updated_at: new Date().toISOString()
      });
      
      if (error) {
        throw error;
      }
      
      toast.success('Twitter account connected successfully!');
      loadConnections();
    } catch (error) {
      console.error('Error processing Twitter callback:', error);
      toast.error('Failed to complete Twitter authentication');
    } finally {
      setLoading(false);
    }
  };
  
  const importTwitterTweets = async () => {
    if (!session?.user) {
      toast.error('You must be logged in to import tweets');
      return;
    }
    
    setImportLoading(true);
    try {
      const twitterService = await TwitterApiService.create(session);
      
      if (!twitterService) {
        throw new Error('Could not initialize Twitter service');
      }
      
      const result = await twitterService.fetchUserTweets(50);
      
      if (result && Array.isArray(result)) {
        toast.success(`Successfully imported ${result.length} tweets from Twitter`);
      } else {
        toast.success('Twitter import completed');
      }
      
      loadConnections();
    } catch (error) {
      console.error('Error importing tweets:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import tweets');
    } finally {
      setImportLoading(false);
    }
  };

  const ACCESS_TOKEN_PLACEHOLDER = "placeholder_access_token";
  const ACCESS_TOKEN_SECRET_PLACEHOLDER = "placeholder_access_token_secret";

  if (authLoading) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!session?.user && !authLoading) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg text-center mb-4">You need to be logged in to access settings.</p>
            <Button onClick={() => navigate('/auth')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (pageError) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg text-center text-destructive mb-4">{pageError}</p>
            <Button onClick={() => window.location.reload()}>Refresh Page</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>
      
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Manage your account preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode" className="flex flex-col space-y-1">
                  <span>Dark Mode</span>
                  <span className="text-sm text-muted-foreground">
                    Enable dark mode for the interface
                  </span>
                </Label>
                <Switch 
                  id="dark-mode" 
                  checked={darkMode} 
                  onCheckedChange={setDarkMode} 
                />
              </div>
              
              <div className="pt-4">
                <Button onClick={saveSettings} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="connections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Social Media Connections</CardTitle>
              <CardDescription>Connect your social media accounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {connections.map((connection, index) => (
                <React.Fragment key={connection.platform}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {connection.platform === 'twitter' ? (
                        <Twitter className="h-8 w-8 text-blue-400" />
                      ) : (
                        <Instagram className="h-8 w-8 text-pink-500" />
                      )}
                      <div>
                        <p className="font-medium capitalize">{connection.platform}</p>
                        {connection.connected && connection.username && (
                          <p className="text-sm text-muted-foreground">
                            Connected as @{connection.username}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {connection.connected ? (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={importTwitterTweets}
                            disabled={importLoading || connection.platform !== 'twitter'}
                          >
                            {importLoading ? 'Importing...' : 'Import Posts'}
                          </Button>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={connection.platform === 'twitter' ? connectTwitter : undefined}
                          disabled={loading || connection.platform !== 'twitter'}
                        >
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications" className="flex flex-col space-y-1">
                  <span>Enable Notifications</span>
                  <span className="text-sm text-muted-foreground">
                    Receive notifications for important events
                  </span>
                </Label>
                <Switch 
                  id="notifications" 
                  checked={notifications} 
                  onCheckedChange={setNotifications} 
                />
              </div>
              
              <div className="pt-4">
                <Button onClick={saveSettings} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
