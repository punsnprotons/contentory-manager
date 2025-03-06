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
import { PlusCircle, Twitter, Instagram, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

type SocialPlatform = 'twitter' | 'instagram';

interface Connection {
  platform: SocialPlatform;
  connected: boolean;
  username?: string;
  profile_image?: string;
}

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const { session } = useAuth();
  
  useEffect(() => {
    const hasAuthParam = window.location.search.includes('auth=success');

    if (hasAuthParam) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      toast.success("Successfully connected to Twitter!");
      
      if (session?.user) {
        loadConnections();
      }
    }
  }, [session]);
  
  useEffect(() => {
    if (session?.user) {
      console.log("Settings: Session user available, loading settings", session.user);
      setPageLoading(true);
      setError(null);
      
      Promise.all([
        loadUserSettings(),
        loadConnections()
      ])
      .catch(err => {
        console.error("Error initializing settings page:", err);
        setError("Failed to load settings. Please try again.");
      })
      .finally(() => {
        setPageLoading(false);
      });
    } else {
      console.log("Settings: No user session available");
      setPageLoading(false);
      setConnections([
        { platform: 'twitter', connected: false },
        { platform: 'instagram', connected: false }
      ]);
    }
  }, [session]);

  useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
      console.log("Settings: Received message event:", event);
      
      if (event.data && event.data.type === 'TWITTER_AUTH_SUCCESS') {
        console.log("Settings: Auth success message received, refreshing connections");
        
        if (event.data.data && event.data.data.success && session?.user) {
          const twitterService = new TwitterApiService(session.user.id);
          
          twitterService.fetchProfileData()
            .then(() => {
              toast.success("Successfully connected to Twitter!");
              loadConnections();
            })
            .catch(err => {
              console.error("Error storing Twitter connection:", err);
              toast.error("Failed to complete Twitter connection");
            });
        }
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    return () => {
      window.removeEventListener('message', messageHandler);
    };
  }, [session]);

  const loadUserSettings = async () => {
    try {
      console.log("Settings: Loading user settings");
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', session?.user.id)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          console.log("Settings: No user settings found, using defaults");
          return;
        }
        
        console.error('Error loading user settings:', error);
        throw error;
      }
      
      if (data) {
        console.log("Settings: User settings loaded", data);
        setNotifications(data.enable_notifications);
        setDarkMode(data.theme === 'dark');
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
      toast.error("Failed to load user settings");
    }
  };
  
  const loadConnections = async () => {
    try {
      console.log("Settings: Loading connections");
      
      if (!session?.user) {
        console.log("Settings: No session available, can't load connections");
        setConnections([
          { platform: 'twitter', connected: false },
          { platform: 'instagram', connected: false }
        ]);
        return;
      }
      
      const { data, error } = await supabase
        .from('platform_connections')
        .select('platform, connected, username')
        .eq('user_id', session.user.id);
        
      if (error) {
        console.error('Error loading connections:', error);
        throw error;
      }
      
      console.log("Settings: Connections data from database:", data);
      
      if (data && data.length > 0) {
        console.log("Settings: Connections loaded", data);
        const typedConnections = data.map(conn => ({
          ...conn,
          platform: conn.platform as SocialPlatform
        }));
        
        setConnections(typedConnections);
      } else {
        console.log("Settings: No connections found, using defaults");
        setConnections([
          { platform: 'twitter', connected: false },
          { platform: 'instagram', connected: false }
        ]);
      }
    } catch (error) {
      console.error('Error loading connections:', error);
      toast.error("Failed to load social media connections");
      setConnections([
        { platform: 'twitter', connected: false },
        { platform: 'instagram', connected: false }
      ]);
    }
  };
  
  const saveSettings = async () => {
    if (!session?.user) {
      toast.error("You must be logged in to save settings");
      return;
    }
    
    setLoading(true);
    try {
      console.log("Settings: Saving user settings");
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: session.user.id,
          enable_notifications: notifications,
          theme: darkMode ? 'dark' : 'light'
        });
        
      if (error) {
        console.error('Error saving settings:', error);
        throw error;
      }
      
      console.log("Settings: Settings saved successfully");
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
      console.log("Settings: Connecting Twitter");
      const twitterService = new TwitterApiService(session.user.id);
      toast.info('Setting up Twitter authentication...');
      
      try {
        const authURL = await twitterService.initiateAuth();
        
        console.log("Settings: Opening Twitter auth URL:", authURL);
        const authWindow = window.open(authURL, '_blank', 'width=600,height=600');
        
        if (!authWindow) {
          console.error("Settings: Failed to open Twitter auth window");
          throw new Error("Failed to open popup window. Please disable popup blockers and try again.");
        }
        
        toast.info('Please complete authentication in the opened window');
      } catch (authError) {
        console.error('Error getting Twitter auth URL:', authError);
        const errorMessage = authError instanceof Error ? authError.message : 'Failed to connect Twitter';
        
        if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
          toast.error('Twitter API rate limit exceeded. Please wait a few minutes before trying again.', {
            duration: 8000,
          });
        } else {
          toast.error(errorMessage);
        }
      }
    } catch (error) {
      console.error('Error connecting Twitter:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect Twitter';
      toast.error(errorMessage);
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
      console.log("Settings: Importing Twitter tweets");
      const twitterService = await TwitterApiService.create(session);
      
      if (!twitterService) {
        throw new Error('Could not initialize Twitter service');
      }
      
      const result = await twitterService.fetchUserTweets(50);
      
      console.log("Settings: Import result", result);
      if (result && Array.isArray(result)) {
        toast.success(`Successfully imported ${result.length} tweets from Twitter`);
      } else {
        toast.success('Twitter import completed');
      }
      
      await loadConnections();
    } catch (error) {
      console.error('Error importing tweets:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import tweets');
    } finally {
      setImportLoading(false);
    }
  };

  const fetchTwitterProfile = async () => {
    if (!session?.user) {
      toast.error('You must be logged in to fetch profile data');
      return;
    }
    
    setProfileLoading(true);
    try {
      console.log("Settings: Fetching Twitter profile data");
      const twitterService = await TwitterApiService.create(session);
      
      if (!twitterService) {
        throw new Error('Could not initialize Twitter service');
      }
      
      const profileData = await twitterService.fetchProfileData();
      
      console.log("Settings: Profile data fetched", profileData);
      toast.success('Successfully fetched and stored Twitter profile data');
      
      await loadConnections();
    } catch (error) {
      console.error('Error fetching Twitter profile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch profile data');
    } finally {
      setProfileLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        </div>
        
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <h2 className="text-xl font-semibold">Error Loading Settings</h2>
              <p>{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                Retry
              </Button>
            </div>
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
                        connection.profile_image ? (
                          <img 
                            src={connection.profile_image} 
                            alt="Twitter profile" 
                            className="h-10 w-10 rounded-full" 
                          />
                        ) : (
                          <Twitter className="h-8 w-8 text-blue-400" />
                        )
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
                            onClick={fetchTwitterProfile}
                            disabled={profileLoading || connection.platform !== 'twitter'}
                          >
                            {profileLoading && connection.platform === 'twitter' ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Update Profile
                              </>
                            )}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={connection.platform === 'twitter' ? importTwitterTweets : undefined}
                            disabled={importLoading || connection.platform !== 'twitter'}
                          >
                            {importLoading && connection.platform === 'twitter' ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Importing...
                              </>
                            ) : (
                              'Import Posts'
                            )}
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
                          {loading && connection.platform === 'twitter' ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <PlusCircle className="h-4 w-4 mr-2" />
                              Connect
                            </>
                          )}
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
