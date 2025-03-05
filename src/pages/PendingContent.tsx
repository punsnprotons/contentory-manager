
import React, { useState } from "react";
import { Clock, Filter, Plus, Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ContentCard from "@/components/ui/ContentCard";
import { Content, SocialPlatform, ContentType } from "@/types";
import { toast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const PendingContent: React.FC = () => {
  const [status, setStatus] = useState<"all" | "draft" | "scheduled">("all");
  const [platform, setPlatform] = useState<"all" | SocialPlatform>("all");
  const [type, setType] = useState<"all" | ContentType>("all");
  const [date, setDate] = useState<Date | undefined>(undefined);

  // Sample data - in a real app this would come from an API
  const sampleContent: Content[] = [
    {
      id: "1",
      type: "image",
      intent: "promotional",
      platform: "instagram",
      content: "Summer vibes! Our new collection is perfect for those sunny days. #SummerFashion #NewCollection",
      mediaUrl: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1770&q=80",
      status: "draft",
      createdAt: new Date("2023-06-15"),
    },
    {
      id: "2",
      type: "text",
      intent: "news",
      platform: "twitter",
      content: "We're thrilled to announce our new partnership with @brandname! Stay tuned for exciting collaborations.",
      status: "draft",
      createdAt: new Date("2023-06-10"),
    },
    {
      id: "3",
      type: "video",
      intent: "feature",
      platform: "instagram",
      content: "Check out the new features we just added to our app! Now you can organize your content even better.",
      mediaUrl: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1674&q=80",
      status: "scheduled",
      createdAt: new Date("2023-06-08"),
      scheduledFor: new Date("2023-07-01"),
    },
    {
      id: "4",
      type: "image",
      intent: "poll",
      platform: "twitter",
      content: "Which new product would you like to see next? Let us know in the comments! #CustomerFeedback",
      mediaUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1770&q=80",
      status: "scheduled",
      createdAt: new Date("2023-06-05"),
      scheduledFor: new Date("2023-06-25"),
    },
  ];

  // Filter content based on selected filters
  const filteredContent = sampleContent.filter((content) => {
    if (status !== "all" && content.status !== status) return false;
    if (platform !== "all" && content.platform !== platform) return false;
    if (type !== "all" && content.type !== type) return false;
    if (date && content.scheduledFor) {
      const contentDate = new Date(content.scheduledFor);
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

  const handleSchedule = (content: Content) => {
    // In a real app, this would open a date picker and then call an API
    toast({
      title: "Content scheduled",
      description: "Your content has been scheduled for posting.",
    });
  };

  const handlePublish = (content: Content) => {
    // In a real app, this would call an API to publish the content
    toast({
      title: "Content published",
      description: "Your content has been published successfully.",
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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
            {filteredContent.length === 0 ? (
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
            {filteredContent.length === 0 ? (
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
            {filteredContent.length === 0 ? (
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
