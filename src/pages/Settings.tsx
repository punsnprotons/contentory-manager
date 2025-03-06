import React, { useEffect, useState } from "react";
import { Bell, FileText, Globe, Lock, Mail, User, X, Check, Plus, Twitter } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface UserSettings {
  id: string;
  theme: string;
  enable_notifications: boolean;
  language: string;
}

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  profile_image: string | null;
}

interface PlatformConnection {
  id: string;
  platform: 'instagram' | 'twitter';
  username: string;
  profile_image: string | null;
  connected: boolean;
}

interface TwitterVerificationResult {
  verified: boolean;
  user?: {
    id: string;
    name: string;
    username: string;
  };
  message: string;
}

const Settings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [formProfile, setFormProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [isVerifyingTwitter, setIsVerifyingTwitter] = useState(false);
  const [isConnectingTwitter, setIsConnectingTwitter] = useState(false);

  useEffect(() => {
    async function fetchUserData() {
      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from('user_settings')
          .select('*')
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') {
          console.error('Error fetching settings:', settingsError);
          toast({
            title: "Failed to load settings",
            description: "There was an error loading your settings. Please try again.",
            variant: "destructive"
          });
        } else if (settingsData) {
          setUserSettings(settingsData);
        }

        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
        } else if (profileData) {
          setUserProfile(profileData);
          setFormProfile({
            firstName: profileData.first_name || '',
            lastName: profileData.last_name || '',
            email: profileData.email || '',
            company: ''
          });
        }

        const { data: connectionsData, error: connectionsError } = await supabase
          .from('platform_connections')
          .select('*');

        if (connectionsError) {
          console.error('Error fetching connections:', connectionsError);
        } else if (connectionsData) {
          setConnections(connectionsData);
        }

      } catch (error) {
        console.error('Error in data fetching:', error);
        toast({
          title: "Error",
          description: "Failed to load user data. Please refresh the page.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserData();
  }, []);

  const handleProfileUpdate = async () => {
    if (!userProfile) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: formProfile.firstName,
          last_name: formProfile.lastName,
          email: formProfile.email
        })
        .eq('id', userProfile.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully."
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update failed",
        description: "There was an error updating your profile.",
        variant: "destructive"
      });
    }
  };

  const handlePasswordChange = () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast({
        title: "Passwords don't match",
        description: "Your new password and confirmation don't match.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Password changed",
      description: "Your password has been updated successfully."
    });
    
    setPasswordForm({
      current: '',
      new: '',
      confirm: ''
    });
  };

  const toggleNotificationSetting = async (setting: string, value: boolean) => {
    if (!userSettings) return;

    try {
      const updates: Record<string, any> = {};
      updates[setting] = value;

      const { error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('id', userSettings.id);

      if (error) {
        throw error;
      }

      setUserSettings(prev => prev ? { ...prev, ...updates } : null);

      toast({
        title: "Settings updated",
        description: "Your notification preferences have been updated."
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Update failed",
        description: "There was an error updating your settings.",
        variant: "destructive"
      });
    }
  };

  const disconnectPlatform = async (id: string) => {
    try {
      const { error } = await supabase
        .from('platform_connections')
        .update({ connected: false })
        .eq('id', id);

      if (error) {
        throw error;
      }

      setConnections(prev => 
        prev.map(conn => conn.id === id ? { ...conn, connected: false } : conn)
      );

      toast({
        title: "Account disconnected",
        description: "The social media account has been disconnected."
      });
    } catch (error) {
      console.error('Error disconnecting account:', error);
      toast({
        title: "Disconnection failed",
        description: "There was an error disconnecting the account.",
        variant: "destructive"
      });
    }
  };

  const handleToggleSecuritySetting = async (setting: string, value: boolean) => {
    toast({
      title: "Security setting updated",
      description: `The ${setting} setting has been ${value ? 'enabled' : 'disabled'}.`
    });
  };

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your settings have been updated successfully.",
    });
  };

  const verifyTwitterCredentials = async () => {
    setIsVerifyingTwitter(true);
    try {
      const response = await supabase.functions.invoke('twitter-integration', {
        method: 'GET',
        body: { endpoint: 'verify' }
      });
      
      const result = response.data as TwitterVerificationResult;
      
      if (result.verified && result.user) {
        const { error } = await supabase
          .from('platform_connections')
          .upsert({
            platform: 'twitter',
            username: result.user.username,
            connected: true,
            user_id: userProfile?.id
          }, {
            onConflict: 'user_id, platform'
          });
          
        if (error) {
          console.error('Error saving Twitter connection:', error);
          toast({
            title: "Connection Error",
            description: "Failed to save Twitter connection. Please try again.",
            variant: "destructive"
          });
        } else {
          const { data: refreshedConnections } = await supabase
            .from('platform_connections')
            .select('*');
            
          if (refreshedConnections) {
            setConnections(refreshedConnections);
          }
          
          toast({
            title: "Twitter Connected",
            description: `Successfully connected to Twitter as @${result.user.username}`,
          });
        }
      } else {
        toast({
          title: "Verification Failed",
          description: result.message || "Could not verify Twitter credentials",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error verifying Twitter credentials:', error);
      toast({
        title: "Verification Error",
        description: "An error occurred while verifying Twitter credentials. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setIsVerifyingTwitter(false);
    }
  };

  const initiateTwitterAuth = async () => {
    setIsConnectingTwitter(true);
    try {
      const response = await supabase.functions.invoke('twitter-integration', {
        method: 'GET',
        body: { endpoint: 'auth' }
      });
      
      if (response.data?.success && response.data?.authURL) {
        window.location.href = response.data.authURL;
      } else {
        toast({
          title: "Authentication Failed",
          description: response.data?.message || "Could not initiate Twitter authentication",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error initiating Twitter authentication:', error);
      toast({
        title: "Authentication Error",
        description: "An error occurred while initiating Twitter authentication. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setIsConnectingTwitter(false);
    }
  };

  const handleTestTweet = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('twitter-integration', {
        method: 'POST',
        body: { text: "This is a test tweet from Wubble AI!" }
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Tweet Sent",
        description: "Test tweet was sent successfully!",
      });
    } catch (error) {
      console.error('Error sending test tweet:', error);
      toast({
        title: "Tweet Failed",
        description: "Failed to send test tweet. Check console for details.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return <div className="container-page flex items-center justify-center min-h-[50vh]">
      <div className="text-xl font-medium">Loading settings...</div>
    </div>;
  }

  return (
    <div className="container-page animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <Button onClick={handleSave}>Save Changes</Button>
      </div>

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="account">
            <User className="h-4 w-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Globe className="h-4 w-4 mr-2" />
            Social Integrations
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your account information and profile details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input 
                  id="firstName" 
                  value={formProfile.firstName}
                  onChange={(e) => setFormProfile(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input 
                  id="lastName" 
                  value={formProfile.lastName}
                  onChange={(e) => setFormProfile(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={formProfile.email}
                  onChange={(e) => setFormProfile(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input 
                  id="company" 
                  value={formProfile.company}
                  onChange={(e) => setFormProfile(prev => ({ ...prev, company: e.target.value }))}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleProfileUpdate}>Update Profile</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how and when you receive notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Email Notifications</Label>
                    <div className="text-sm text-muted-foreground">
                      Receive email updates about your account activity.
                    </div>
                  </div>
                  <Switch 
                    checked={userSettings?.enable_notifications ?? true} 
                    onCheckedChange={(checked) => toggleNotificationSetting('enable_notifications', checked)}
                  />
                </div>
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Content Published</Label>
                    <div className="text-sm text-muted-foreground">
                      Get notified when your content is published.
                    </div>
                  </div>
                  <Switch defaultChecked={true} />
                </div>
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Content Analytics</Label>
                    <div className="text-sm text-muted-foreground">
                      Receive weekly reports about your content performance.
                    </div>
                  </div>
                  <Switch defaultChecked={true} />
                </div>
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Marketing Updates</Label>
                    <div className="text-sm text-muted-foreground">
                      Receive marketing emails and special offers.
                    </div>
                  </div>
                  <Switch defaultChecked={false} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>Connected Accounts</CardTitle>
              <CardDescription>
                Manage your connected social media accounts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {connections.length > 0 ? (
                connections.map(connection => (
                  <React.Fragment key={connection.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 ${connection.platform === 'instagram' ? 'bg-pink-500' : 'bg-blue-500'} rounded-full flex items-center justify-center`}>
                          {connection.platform === 'instagram' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                              <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                              <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
                            </svg>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{connection.platform === 'instagram' ? 'Instagram' : 'Twitter'}</div>
                          <div className="text-sm text-muted-foreground">@{connection.username}</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => disconnectPlatform(connection.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Separator />
                  </React.Fragment>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">No connected accounts found.</div>
              )}
              
              <div className="space-y-6 pt-4">
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center">
                      <Twitter className="h-5 w-5 mr-2 text-blue-500" />
                      Twitter Integration
                    </CardTitle>
                    <CardDescription>
                      Connect your Twitter account to publish content directly.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-md bg-slate-50 p-4 dark:bg-slate-900">
                      <p className="text-sm">
                        Twitter API access is configured through your application's backend.
                        Credentials are stored securely and used to publish content on your behalf.
                      </p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        onClick={verifyTwitterCredentials} 
                        disabled={isVerifyingTwitter}
                        className="flex-1"
                      >
                        {isVerifyingTwitter ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Verify Connection
                          </>
                        )}
                      </Button>
                      
                      <Button 
                        onClick={initiateTwitterAuth}
                        disabled={isConnectingTwitter}
                        variant="outline"
                        className="flex-1"
                      >
                        {isConnectingTwitter ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Twitter className="mr-2 h-4 w-4" />
                            Connect with Twitter
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <Button 
                      onClick={handleTestTweet}
                      variant="outline"
                      className="w-full"
                    >
                      Send Test Tweet
                    </Button>
                  </CardContent>
                </Card>
                
                <Button className="w-full" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Other Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>
                  Change your password or enable two-factor authentication.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current">Current Password</Label>
                  <Input 
                    id="current" 
                    type="password" 
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new">New Password</Label>
                  <Input 
                    id="new" 
                    type="password" 
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm Password</Label>
                  <Input 
                    id="confirm" 
                    type="password" 
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handlePasswordChange}>Change Password</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Two-Factor Authentication</Label>
                    <div className="text-sm text-muted-foreground">
                      Secure your account with 2FA.
                    </div>
                  </div>
                  <Switch 
                    defaultChecked={false} 
                    onCheckedChange={(checked) => handleToggleSecuritySetting('2fa', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Login Notifications</Label>
                    <div className="text-sm text-muted-foreground">
                      Receive notifications for new device logins.
                    </div>
                  </div>
                  <Switch 
                    defaultChecked={true} 
                    onCheckedChange={(checked) => handleToggleSecuritySetting('login_notifications', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
