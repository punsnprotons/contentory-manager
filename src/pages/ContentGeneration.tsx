
import React, { useState } from "react";
import { Sparkles, LayoutGrid, Image, Video, AlignLeft, Send } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContentType, ContentIntent, SocialPlatform } from "@/types";
import ContentCard from "@/components/ui/ContentCard";
import { toast } from "@/hooks/use-toast";

const ContentGeneration: React.FC = () => {
  const [selectedContentType, setSelectedContentType] = useState<ContentType>("text");
  const [selectedIntent, setSelectedIntent] = useState<ContentIntent>("promotional");
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>("instagram");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string>("");

  const contentTypes: { value: ContentType; label: string; icon: React.ReactNode }[] = [
    { value: "text", label: "Text Post", icon: <AlignLeft size={18} /> },
    { value: "image", label: "Image Post", icon: <Image size={18} /> },
    { value: "video", label: "Video Post", icon: <Video size={18} /> },
  ];

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a prompt to generate content.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    // Simulate AI generation - in a real app this would call an API
    setTimeout(() => {
      let content = "";

      switch (selectedIntent) {
        case "promotional":
          content = "🚀 Exciting news! Our latest collection just dropped and it's already getting rave reviews. Limited quantities available, so don't miss out! #NewLaunch #LimitedEdition";
          break;
        case "feature":
          content = "We've listened to your feedback! Our app now includes the most requested feature: dark mode. Update now to experience it! #NewFeature #DarkMode";
          break;
        case "news":
          content = "We're thrilled to announce our partnership with @partnerbrand! Together, we'll be bringing you exclusive content and special offers. Stay tuned for more details!";
          break;
        case "poll":
          content = "We're considering adding new features to our service. Which would you prefer to see first?\n\n- Extended customer support hours\n- More payment options\n- Loyalty rewards program\n\nLet us know in the comments!";
          break;
      }

      setGeneratedContent(content);
      setIsGenerating(false);

      toast({
        title: "Content generated",
        description: "Your content has been successfully generated!",
      });
    }, 2000);
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
              {!generatedContent ? (
                <div className="text-center text-muted-foreground">
                  <p>Your generated content will appear here</p>
                </div>
              ) : (
                <div className="w-full">
                  <ContentCard
                    content={{
                      id: "preview",
                      type: selectedContentType,
                      intent: selectedIntent,
                      platform: selectedPlatform,
                      content: generatedContent,
                      status: "draft",
                      createdAt: new Date(),
                      mediaUrl: selectedContentType !== "text" ? "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1770&q=80" : undefined,
                    }}
                    onSchedule={() => {
                      toast({
                        title: "Content scheduled",
                        description: "Your content has been scheduled for posting.",
                      });
                    }}
                    onPublish={() => {
                      toast({
                        title: "Content published",
                        description: "Your content has been published successfully.",
                      });
                    }}
                  />
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              {generatedContent && (
                <>
                  <Button variant="outline">
                    Regenerate
                  </Button>
                  <Button variant="outline">
                    Save as Draft
                  </Button>
                  <Button className="flex items-center">
                    <Send size={16} className="mr-1" />
                    Schedule
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ContentGeneration;
