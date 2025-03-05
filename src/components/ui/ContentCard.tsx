
import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Heart, MessageCircle, Share2, Eye } from "lucide-react";
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
  // Format date to show only the date part
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card className={cn("overflow-hidden card-hover", className)}>
      <div className="relative">
        {content.mediaUrl && (
          <div className="h-48 overflow-hidden">
            <img
              src={content.mediaUrl}
              alt="Content preview"
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            />
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
  );
};

export default ContentCard;
