
import React, { useState, useEffect } from "react";
import { Clock, Filter, Plus, Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ContentCard from "@/components/ui/ContentCard";
import { Content, SocialPlatform, ContentType, ContentStatus } from "@/types";
import { toast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

const PendingContent: React.FC = () => {
  const [status, setStatus] = useState<"all" | ContentStatus>("all");
  const [platform, setPlatform] = useState<"all" | SocialPlatform>("all");
  const [type, setType] = useState<"all" | ContentType>("all");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [content, setContent] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You need to be logged in to view your content.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }
    
    fetchContent();
  }, [user]);

  const fetchContent = async () => {
    setIsLoading(true);
    
    try {
      // First get the user's ID from the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user?.id)
        .single();
      
      if (userError) {
        console.error("Error fetching user data:", userError);
        throw userError;
      }
      
      // Then fetch content for that user
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('user_id', userData.id)
        .in('status', ['draft', 'scheduled'])
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching content:", error);
        throw error;
      }
      
      // Transform the data to match our Content type
      const transformedContent: Content[] = data.map(item => ({
        id: item.id,
        type: item.type as ContentType,
        intent: item.intent,
        platform: item.platform,
        content: item.content,
        mediaUrl: item.media_url,
        status: item.status as ContentStatus,
        createdAt: new Date(item.created_at),
        scheduledFor: item.scheduled_for ? new Date(item.scheduled_for) : undefined,
        publishedAt: item.published_at ? new Date(item.published_at) : undefined
      }));
      
      setContent(transformedContent);
    } catch (error) {
      console.error("Failed to fetch content:", error);
      toast({
        title: "Failed to load content",
        description: "There was an error loading your content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter content based on selected filters
  const filteredContent = content.filter((item) => {
    if (status !== "all" && item.status !== status) return false;
    if (platform !== "all" && item.platform !== platform) return false;
    if (type !== "all" && item.type !== type) return false;
    if (date && item.scheduledFor) {
      const contentDate = new Date(item.scheduledFor);
      if (
        contentDate.getDate() !== date.getDate() ||
        contentDate.getMonth() !== date.getMonth() ||
        contentDate.getFullYear() !== date.getFullYear()
      ) {
        return false;
      }
    }
    return true;
  });

  const handleSchedule = async (content: Content) => {
    navigate(`/content-generation?id=${content.id}`);
  };

  const handlePublish = async (content: Content) => {
    try {
      // First get the user's ID from the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user?.id)
        .single();
      
      if (userError) {
        console.error("Error fetching user data:", userError);
        throw userError;
      }
      
      // Update the content status to published
      const { error } = await supabase
        .from('content')
        .update({
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', content.id)
        .eq('user_id', userData.id);
      
      if (error) {
        console.error("Error publishing content:", error);
        throw error;
      }
      
      toast({
        title: "Content published",
        description: "Your content has been published successfully.",
      });
      
      // Refresh the content list
      fetchContent();
    } catch (error) {
      console.error("Failed to publish content:", error);
      toast({
        title: "Publishing failed",
        description: "There was an error publishing your content. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: Date) => {
    return format(date, "PPP");
  };

  return (
    <div className="container-page animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Pending Content</h1>
        <Button asChild>
          <a href="/content-generation" className="flex items-center">
            <Plus size={16} className="mr-1" />
            <span>Create New</span>
          </a>
        </Button>
      </div>

      <div className="mb-6">
        <Tabs defaultValue="all" value={status} onValueChange={(value) => setStatus(value as any)}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="draft">Drafts</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            </TabsList>

            <div className="flex items-center space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 flex items-center">
                    {date ? formatDate(date) : "Select date"}
                    <CalendarIcon size={16} className="ml-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <Filter size={16} className="mr-1" />
                    <span>Filter</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <div className="p-2">
                    <h4 className="text-xs font-semibold mb-1">Platform</h4>
                    <div className="grid grid-cols-3 gap-1 mb-2">
                      <Button 
                        variant={platform === "all" ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => setPlatform("all")}
                        className="h-8 text-xs"
                      >
                        All
                      </Button>
                      <Button 
                        variant={platform === "instagram" ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => setPlatform("instagram")}
                        className="h-8 text-xs"
                      >
                        Instagram
                      </Button>
                      <Button 
                        variant={platform === "twitter" ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => setPlatform("twitter")}
                        className="h-8 text-xs"
                      >
                        Twitter
                      </Button>
                    </div>

                    <h4 className="text-xs font-semibold mb-1">Content Type</h4>
                    <div className="grid grid-cols-4 gap-1">
                      <Button 
                        variant={type === "all" ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => setType("all")}
                        className="h-8 text-xs"
                      >
                        All
                      </Button>
                      <Button 
                        variant={type === "text" ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => setType("text")}
                        className="h-8 text-xs"
                      >
                        Text
                      </Button>
                      <Button 
                        variant={type === "image" ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => setType("image")}
                        className="h-8 text-xs"
                      >
                        Image
                      </Button>
                      <Button 
                        variant={type === "video" ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => setType("video")}
                        className="h-8 text-xs"
                      >
                        Video
                      </Button>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {(platform !== "all" || type !== "all" || date) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setPlatform("all");
                    setType("all");
                    setDate(undefined);
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="all" className="mt-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : filteredContent.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <Clock size={48} className="text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">No Content Found</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    No content matches your current filter settings.
                  </p>
                  <Button asChild>
                    <a href="/content-generation">Create New Content</a>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContent.map((content) => (
                  <ContentCard
                    key={content.id}
                    content={content}
                    onSchedule={handleSchedule}
                    onPublish={handlePublish}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="draft" className="mt-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : filteredContent.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <Clock size={48} className="text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">No Drafts Found</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    You don't have any draft content yet.
                  </p>
                  <Button asChild>
                    <a href="/content-generation">Create New Draft</a>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContent.map((content) => (
                  <ContentCard
                    key={content.id}
                    content={content}
                    onSchedule={handleSchedule}
                    onPublish={handlePublish}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="scheduled" className="mt-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : filteredContent.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <Clock size={48} className="text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">No Scheduled Content</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    You don't have any scheduled content yet.
                  </p>
                  <Button asChild>
                    <a href="/content-generation">Create Content to Schedule</a>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContent.map((content) => (
                  <ContentCard
                    key={content.id}
                    content={content}
                    onSchedule={handleSchedule}
                    onPublish={handlePublish}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PendingContent;
