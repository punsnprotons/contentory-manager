import React, { useState, useEffect } from "react";
import { Sparkles, LayoutGrid, Image, Video, AlignLeft, Send, RotateCw, Save } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContentType, ContentIntent, SocialPlatform } from "@/types";
import ContentCard from "@/components/ui/ContentCard";
import { toast } from "sonner";
import { useGenerateContent } from "@/hooks/useGenerateContent";
import ScheduleDialog from "@/components/ui/ScheduleDialog";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { publishToTwitter } from "@/components/ui/RefreshDataButton";

const ContentGeneration: React.FC = () => {
  const [selectedContentType, setSelectedContentType] = useState<ContentType>("text");
  const [selectedIntent, setSelectedIntent] = useState<ContentIntent>("promotional");
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>("instagram");
  const [prompt, setPrompt] = useState("");
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [mediaUrl, setMediaUrl] = useState<string | undefined>(undefined);
  const [contentId, setContentId] = useState<string | null>(null);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const { generateContent, saveContent, publishContent, scheduleContent, isGenerating, isSaving } = useGenerateContent();

  const contentTypes: { value: ContentType; label: string; icon: React.ReactNode }[] = [
    { value: "text", label: "Text Post", icon: <AlignLeft size={18} /> },
    { value: "image", label: "Image Post", icon: <Image size={18} /> },
    { value: "video", label: "Video Post", icon: <Video size={18} /> },
  ];

  const checkAuth = async () => {
    if (!user) {
      toast.error("Authentication required", {
        description: "You need to be logged in to save or publish content."
      });
      navigate('/auth');
      return false;
    }
    return true;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Missing information", {
        description: "Please enter a prompt to generate content."
      });
      return;
    }

    try {
      const result = await generateContent({
        contentType: selectedContentType,
        platform: selectedPlatform,
        intent: selectedIntent,
        prompt: prompt
      });
      
      setGeneratedContent(result.content);
      setMediaUrl(result.mediaUrl);
      setContentId(null); // Reset content ID when new content is generated
      
      toast.success("Content generated", {
        description: "Your content has been successfully generated!"
      });
    } catch (error) {
      console.error("Error generating content:", error);
      toast.error("Generation failed", {
        description: error instanceof Error ? error.message : "An unexpected error occurred."
      });
    }
  };

  const handleSaveAsDraft = async () => {
    if (!generatedContent || !await checkAuth()) return;
    
    try {
      const id = await saveContent({
        content: generatedContent,
        mediaUrl,
        contentType: selectedContentType,
        platform: selectedPlatform,
        intent: selectedIntent,
        status: 'draft'
      });
      
      setContentId(id);
      
      toast.success("Draft saved", {
        description: "Your content has been saved as a draft."
      });
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error("Saving failed", {
        description: error instanceof Error ? error.message : "An unexpected error occurred."
      });
    }
  };

  const handlePublish = async () => {
    if (!generatedContent || !await checkAuth()) return;
    
    try {
      console.log("Publishing content with user:", user?.id);
      
      if (selectedPlatform === 'twitter') {
        toast.loading('Publishing to Twitter...');
        const twitterResult = await publishToTwitter(generatedContent, mediaUrl);
        
        if (!twitterResult.success) {
          const errorMessage = twitterResult.error || twitterResult.message;
          
          if (errorMessage.includes('permission') || errorMessage.includes('Forbidden') || errorMessage.includes('403')) {
            toast.error('Twitter API Permission Error', {
              description: 'Your Twitter app needs "Read and write" permissions. Please update permissions in the Twitter Developer Portal, regenerate your access tokens, and update them in Supabase.',
              duration: 8000,
            });
          } else {
            toast.error('Failed to publish to Twitter', {
              description: errorMessage,
            });
          }
          return;
        }
        
        toast.success('Successfully published to Twitter!');
      }
      
      if (!contentId) {
        const id = await saveContent({
          content: generatedContent,
          mediaUrl,
          contentType: selectedContentType,
          platform: selectedPlatform,
          intent: selectedIntent,
          status: 'published'
        });
        setContentId(id);
      } else {
        await publishContent(contentId);
      }
      
      toast.success("Content published", {
        description: "Your content has been successfully published!"
      });
      
      navigate("/pending-content");
    } catch (error) {
      console.error("Error publishing content:", error);
      toast.error("Publishing failed", {
        description: error instanceof Error ? error.message : "An unexpected error occurred."
      });
    }
  };

  const handleScheduleClick = () => {
    if (!checkAuth()) return;
    setIsScheduleDialogOpen(true);
  };

  const handleScheduleConfirm = async (scheduledDate: Date) => {
    if (!generatedContent || !await checkAuth()) return;
    
    try {
      if (!contentId) {
        const id = await saveContent({
          content: generatedContent,
          mediaUrl,
          contentType: selectedContentType,
          platform: selectedPlatform,
          intent: selectedIntent,
          status: 'scheduled',
          scheduledFor: scheduledDate
        });
        setContentId(id);
      } else {
        await scheduleContent(contentId, scheduledDate);
      }
      
      setIsScheduleDialogOpen(false);
      
      toast.success("Content scheduled", {
        description: `Your content has been scheduled for ${scheduledDate.toLocaleString()}.`
      });
      
      navigate("/content-calendar");
    } catch (error) {
      console.error("Error scheduling content:", error);
      toast.error("Scheduling failed", {
        description: error instanceof Error ? error.message : "An unexpected error occurred."
      });
    }
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  return (
    <div className="container-page animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Content Generation</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sparkles size={20} className="mr-2 text-primary" />
                Content Generator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Platform</label>
                  <Select
                    value={selectedPlatform}
                    onValueChange={(value) => setSelectedPlatform(value as SocialPlatform)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="twitter">Twitter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium block mb-1">Content Type</label>
                  <Tabs 
                    defaultValue="text" 
                    value={selectedContentType}
                    onValueChange={(value) => setSelectedContentType(value as ContentType)}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-3">
                      {contentTypes.map((type) => (
                        <TabsTrigger key={type.value} value={type.value} className="flex items-center">
                          <span className="mr-1">{type.icon}</span>
                          <span>{type.label}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">Content Intent</label>
                  <Select
                    value={selectedIntent}
                    onValueChange={(value) => setSelectedIntent(value as ContentIntent)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select intent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="promotional">Promotional</SelectItem>
                      <SelectItem value="feature">Feature Launch</SelectItem>
                      <SelectItem value="news">News Update</SelectItem>
                      <SelectItem value="poll">Poll</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">Content Prompt</label>
                  <Textarea
                    placeholder="Describe what you want to generate..."
                    className="min-h-[100px]"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="flex items-center"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="mr-1" />
                    Generate Content
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {selectedContentType === "image" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Image Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">Image Style</label>
                    <Select defaultValue="modern">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="modern">Modern</SelectItem>
                        <SelectItem value="minimalist">Minimalist</SelectItem>
                        <SelectItem value="vibrant">Vibrant</SelectItem>
                        <SelectItem value="retro">Retro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Aspect Ratio</label>
                    <Select defaultValue="square">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select aspect ratio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="square">Square (1:1)</SelectItem>
                        <SelectItem value="portrait">Portrait (4:5)</SelectItem>
                        <SelectItem value="landscape">Landscape (16:9)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedContentType === "video" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Video Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">Video Style</label>
                    <Select defaultValue="cinematic">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cinematic">Cinematic</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="animated">Animated</SelectItem>
                        <SelectItem value="tutorial">Tutorial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Duration</label>
                    <Select defaultValue="medium">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short (15s)</SelectItem>
                        <SelectItem value="medium">Medium (30s)</SelectItem>
                        <SelectItem value="long">Long (60s)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center">
                <LayoutGrid size={20} className="mr-2 text-primary" />
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="min-h-[300px] flex items-center justify-center">
              {isGenerating ? (
                <div className="text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <svg className="animate-spin mb-4 h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p>Generating your content...</p>
                    <p className="text-sm mt-2">This may take a few moments</p>
                  </div>
                </div>
              ) : !generatedContent ? (
                <div className="text-center text-muted-foreground">
                  <p>Your generated content will appear here</p>
                </div>
              ) : (
                <div className="w-full">
                  <ContentCard
                    content={{
                      id: contentId || "preview",
                      type: selectedContentType,
                      intent: selectedIntent,
                      platform: selectedPlatform,
                      content: generatedContent,
                      status: "draft",
                      createdAt: new Date(),
                      mediaUrl: mediaUrl,
                    }}
                    onSchedule={handleScheduleClick}
                    onPublish={handlePublish}
                  />
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              {generatedContent && !isGenerating && (
                <>
                  <Button variant="outline" onClick={handleRegenerate} disabled={isGenerating || isSaving}>
                    <RotateCw size={16} className="mr-1" />
                    Regenerate
                  </Button>
                  <Button variant="outline" onClick={handleSaveAsDraft} disabled={isSaving}>
                    <Save size={16} className="mr-1" />
                    {isSaving ? "Saving..." : "Save as Draft"}
                  </Button>
                  <Button onClick={handleScheduleClick} disabled={isSaving} className="flex items-center">
                    <Send size={16} className="mr-1" />
                    {isSaving ? "Processing..." : "Schedule"}
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>

      <ScheduleDialog 
        open={isScheduleDialogOpen}
        onOpenChange={setIsScheduleDialogOpen}
        onSchedule={handleScheduleConfirm}
        isScheduling={isSaving}
      />
    </div>
  );
};

export default ContentGeneration;
