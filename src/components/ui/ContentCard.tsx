import React, { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Heart, MessageCircle, Share2, Eye, BarChart, Users } from "lucide-react";
import { Content } from "@/types";
import { cn } from "@/lib/utils";

interface ContentCardProps {
  content: Content;
  onSchedule?: (content: Content) => void;
  onPublish?: (content: Content) => void;
  className?: string;
}

const ContentCard: React.FC<ContentCardProps> = ({
  content,
  onSchedule,
  onPublish,
  className,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const sampleComments = [
    { id: "1", user: "Alex Johnson", comment: "Love this content! Very insightful.", avatar: "https://i.pravatar.cc/150?u=a042581f4e2" },
    { id: "2", user: "Maria Garcia", comment: "Great post! Looking forward to more.", avatar: "https://i.pravatar.cc/150?u=a042581f4e3" },
    { id: "3", user: "Sam Wilson", comment: "This is exactly what I needed to see today.", avatar: "https://i.pravatar.cc/150?u=a042581f4e4" },
  ];

  const detailedAnalytics = {
    impressions: content.metrics?.views || 0,
    reach: Math.floor((content.metrics?.views || 0) * 0.8),
    engagement: {
      likes: content.metrics?.likes || 0,
      comments: content.metrics?.comments || 0,
      shares: content.metrics?.shares || 0
    },
    demographics: {
      age: [
        { group: "18-24", percentage: 35 },
        { group: "25-34", percentage: 42 },
        { group: "35-44", percentage: 15 },
        { group: "45+", percentage: 8 },
      ],
      gender: [
        { group: "Female", percentage: 58 },
        { group: "Male", percentage: 39 },
        { group: "Other", percentage: 3 },
      ]
    }
  };

  return (
    <>
      <Card 
        className={cn("overflow-hidden card-hover cursor-pointer", className)}
        onClick={() => setDialogOpen(true)}
      >
        <div className="relative">
          {content.mediaUrl && (
            <div className="h-48 overflow-hidden">
              {content.type === 'video' ? (
                <video 
                  src={content.mediaUrl}
                  controls
                  className="w-full h-full object-cover"
                  preload="metadata"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <img
                  src={content.mediaUrl}
                  alt="Content preview"
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
              )}
            </div>
          )}
          <div className="absolute top-2 right-2 flex space-x-2">
            <span className={`
              text-xs font-medium px-2 py-1 rounded-full
              ${content.platform === "instagram" ? "bg-pink-100 text-pink-800" : "bg-blue-100 text-blue-800"}
            `}>
              {content.platform === "instagram" ? "Instagram" : "Twitter"}
            </span>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
              {content.type}
            </span>
          </div>
        </div>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <span className={`
              inline-block px-2 py-0.5 rounded-full text-xs mr-2
              ${content.intent === "promotional" ? "bg-purple-100 text-purple-800" :
                content.intent === "feature" ? "bg-green-100 text-green-800" :
                content.intent === "news" ? "bg-yellow-100 text-yellow-800" : 
                "bg-blue-100 text-blue-800"}
            `}>
              {content.intent}
            </span>
            {formatDate(content.createdAt)}
          </p>
          <p className={`mt-2 ${!content.mediaUrl ? "text-lg font-medium" : "text-base"}`}>
            {content.content}
          </p>
          
          {content.status === "published" && content.metrics && (
            <div className="mt-4 grid grid-cols-4 gap-2">
              <div className="flex flex-col items-center">
                <div className="flex items-center text-red-500">
                  <Heart size={14} className="mr-1" />
                  <span className="text-xs font-medium">{content.metrics.likes}</span>
                </div>
                <span className="text-xs text-muted-foreground mt-1">Likes</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center text-blue-500">
                  <MessageCircle size={14} className="mr-1" />
                  <span className="text-xs font-medium">{content.metrics.comments}</span>
                </div>
                <span className="text-xs text-muted-foreground mt-1">Comments</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center text-green-500">
                  <Share2 size={14} className="mr-1" />
                  <span className="text-xs font-medium">{content.metrics.shares}</span>
                </div>
                <span className="text-xs text-muted-foreground mt-1">Shares</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center text-purple-500">
                  <Eye size={14} className="mr-1" />
                  <span className="text-xs font-medium">{content.metrics.views}</span>
                </div>
                <span className="text-xs text-muted-foreground mt-1">Views</span>
              </div>
            </div>
          )}
        </CardContent>

        {(content.status === "draft" || content.status === "scheduled") && (
          <CardFooter className="flex justify-between p-4 pt-0">
            {content.scheduledFor ? (
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar size={14} className="mr-1" />
                <span>Scheduled for {formatDate(content.scheduledFor)}</span>
              </div>
            ) : onSchedule ? (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center"
                onClick={() => onSchedule(content)}
              >
                <Calendar size={14} className="mr-1" />
                <span>Schedule</span>
              </Button>
            ) : (
              <div />
            )}
          
          {onPublish && content.status === "draft" && (
            <Button
              variant="default"
              size="sm"
              className="flex items-center"
              onClick={() => onPublish(content)}
            >
              <Clock size={14} className="mr-1" />
              <span>Publish Now</span>
            </Button>
          )}
        </CardFooter>
      )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className={`
                inline-block px-2 py-0.5 rounded-full text-xs
                ${content.platform === "instagram" ? "bg-pink-100 text-pink-800" : "bg-blue-100 text-blue-800"}
              `}>
                {content.platform === "instagram" ? "Instagram" : "Twitter"}
              </span>
              <span>Post Details</span>
            </DialogTitle>
            <DialogDescription>
              {formatDate(content.publishedAt || content.createdAt)}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="post" className="mt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="post">Post</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="post" className="pt-4">
              <div className="space-y-4">
                {content.mediaUrl && (
                  <div className="overflow-hidden rounded-md">
                    {content.type === 'video' ? (
                      <video 
                        src={content.mediaUrl}
                        controls
                        className="w-full"
                        preload="metadata"
                      >
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <img
                        src={content.mediaUrl}
                        alt="Content"
                        className="w-full object-cover"
                      />
                    )}
                  </div>
                )}
                <p className="text-base">{content.content}</p>
                
                {content.status === "published" && content.metrics && (
                  <div className="flex justify-between border-t pt-4 mt-4">
                    <div className="flex items-center text-red-500">
                      <Heart size={16} className="mr-1" />
                      <span className="text-sm font-medium">{content.metrics.likes}</span>
                    </div>
                    <div className="flex items-center text-blue-500">
                      <MessageCircle size={16} className="mr-1" />
                      <span className="text-sm font-medium">{content.metrics.comments}</span>
                    </div>
                    <div className="flex items-center text-green-500">
                      <Share2 size={16} className="mr-1" />
                      <span className="text-sm font-medium">{content.metrics.shares}</span>
                    </div>
                    <div className="flex items-center text-purple-500">
                      <Eye size={16} className="mr-1" />
                      <span className="text-sm font-medium">{content.metrics.views}</span>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="comments" className="pt-4">
              <div className="space-y-4">
                {sampleComments.map(comment => (
                  <div key={comment.id} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/40">
                    <img 
                      src={comment.avatar} 
                      alt={comment.user} 
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <p className="font-medium">{comment.user}</p>
                      <p className="text-sm mt-1">{comment.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="analytics" className="pt-4">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">Impressions</span>
                      </div>
                      <div className="text-2xl font-bold mt-2">{detailedAnalytics.impressions.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">Reach</span>
                      </div>
                      <div className="text-2xl font-bold mt-2">{detailedAnalytics.reach.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Engagement Breakdown</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="w-24 text-sm">Likes</div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div 
                          className="bg-red-400 h-2.5 rounded-full" 
                          style={{ width: `${(detailedAnalytics.engagement.likes / (detailedAnalytics.impressions || 1)) * 100}%` }}
                        ></div>
                      </div>
                      <div className="w-16 text-sm text-right">{detailedAnalytics.engagement.likes}</div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-24 text-sm">Comments</div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div 
                          className="bg-blue-400 h-2.5 rounded-full" 
                          style={{ width: `${(detailedAnalytics.engagement.comments / (detailedAnalytics.impressions || 1)) * 100}%` }}
                        ></div>
                      </div>
                      <div className="w-16 text-sm text-right">{detailedAnalytics.engagement.comments}</div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-24 text-sm">Shares</div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div 
                          className="bg-green-400 h-2.5 rounded-full" 
                          style={{ width: `${(detailedAnalytics.engagement.shares / (detailedAnalytics.impressions || 1)) * 100}%` }}
                        ></div>
                      </div>
                      <div className="w-16 text-sm text-right">{detailedAnalytics.engagement.shares}</div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContentCard;
