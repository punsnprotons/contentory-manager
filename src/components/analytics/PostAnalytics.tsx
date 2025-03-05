
import React from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Heart, MessageCircle, Share2, Eye } from "lucide-react";
import { Content } from "@/types";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Separator } from "@/components/ui/separator";

interface PostAnalyticsProps {
  content: Content;
}

const PostAnalytics: React.FC<PostAnalyticsProps> = ({ content }) => {
  // Sample daily analytics data for this post
  const dailyData = [
    { day: "Mon", likes: Math.floor(Math.random() * 50) + 10, views: Math.floor(Math.random() * 200) + 50, comments: Math.floor(Math.random() * 20) + 5, shares: Math.floor(Math.random() * 15) + 2 },
    { day: "Tue", likes: Math.floor(Math.random() * 50) + 10, views: Math.floor(Math.random() * 200) + 50, comments: Math.floor(Math.random() * 20) + 5, shares: Math.floor(Math.random() * 15) + 2 },
    { day: "Wed", likes: Math.floor(Math.random() * 50) + 10, views: Math.floor(Math.random() * 200) + 50, comments: Math.floor(Math.random() * 20) + 5, shares: Math.floor(Math.random() * 15) + 2 },
    { day: "Thu", likes: Math.floor(Math.random() * 50) + 10, views: Math.floor(Math.random() * 200) + 50, comments: Math.floor(Math.random() * 20) + 5, shares: Math.floor(Math.random() * 15) + 2 },
    { day: "Fri", likes: Math.floor(Math.random() * 50) + 10, views: Math.floor(Math.random() * 200) + 50, comments: Math.floor(Math.random() * 20) + 5, shares: Math.floor(Math.random() * 15) + 2 },
    { day: "Sat", likes: Math.floor(Math.random() * 50) + 10, views: Math.floor(Math.random() * 200) + 50, comments: Math.floor(Math.random() * 20) + 5, shares: Math.floor(Math.random() * 15) + 2 },
    { day: "Sun", likes: Math.floor(Math.random() * 50) + 10, views: Math.floor(Math.random() * 200) + 50, comments: Math.floor(Math.random() * 20) + 5, shares: Math.floor(Math.random() * 15) + 2 },
  ];

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">Post Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          {/* Post preview */}
          <div className="flex items-start space-x-4">
            {content.mediaUrl && (
              <div className="w-16 h-16 overflow-hidden rounded-md shrink-0">
                <img src={content.mediaUrl} alt="Content" className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <p className="font-medium truncate max-w-md">{content.content}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDate(content.publishedAt || content.createdAt)} · {content.platform}
              </p>
            </div>
          </div>

          <Separator />

          {/* Metrics overview */}
          <div className="grid grid-cols-4 gap-4">
            <div className="flex flex-col items-center">
              <div className="flex items-center text-red-500">
                <Heart className="mr-1 h-5 w-5" />
                <span className="text-xl font-bold">{content.metrics?.likes || 0}</span>
              </div>
              <span className="text-xs text-muted-foreground mt-1">Likes</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center text-blue-500">
                <MessageCircle className="mr-1 h-5 w-5" />
                <span className="text-xl font-bold">{content.metrics?.comments || 0}</span>
              </div>
              <span className="text-xs text-muted-foreground mt-1">Comments</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center text-green-500">
                <Share2 className="mr-1 h-5 w-5" />
                <span className="text-xl font-bold">{content.metrics?.shares || 0}</span>
              </div>
              <span className="text-xs text-muted-foreground mt-1">Shares</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center text-purple-500">
                <Eye className="mr-1 h-5 w-5" />
                <span className="text-xl font-bold">{content.metrics?.views || 0}</span>
              </div>
              <span className="text-xs text-muted-foreground mt-1">Views</span>
            </div>
          </div>

          <Separator />

          {/* Daily performance chart */}
          <div>
            <h3 className="text-sm font-medium mb-3">Daily Performance</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="likes" stackId="a" fill="#ef4444" name="Likes" />
                <Bar dataKey="comments" stackId="a" fill="#3b82f6" name="Comments" />
                <Bar dataKey="shares" stackId="a" fill="#22c55e" name="Shares" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Audience insights */}
          <div>
            <h3 className="text-sm font-medium mb-3">Audience Insights</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Demographics</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">18-24</span>
                    <div className="w-32 bg-muted rounded-full h-1.5">
                      <div className="bg-primary h-1.5 rounded-full" style={{ width: "35%" }}></div>
                    </div>
                    <span className="text-xs">35%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">25-34</span>
                    <div className="w-32 bg-muted rounded-full h-1.5">
                      <div className="bg-primary h-1.5 rounded-full" style={{ width: "42%" }}></div>
                    </div>
                    <span className="text-xs">42%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">35+</span>
                    <div className="w-32 bg-muted rounded-full h-1.5">
                      <div className="bg-primary h-1.5 rounded-full" style={{ width: "23%" }}></div>
                    </div>
                    <span className="text-xs">23%</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Reach</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Followers</span>
                    <div className="w-32 bg-muted rounded-full h-1.5">
                      <div className="bg-primary h-1.5 rounded-full" style={{ width: "78%" }}></div>
                    </div>
                    <span className="text-xs">78%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Non-followers</span>
                    <div className="w-32 bg-muted rounded-full h-1.5">
                      <div className="bg-primary h-1.5 rounded-full" style={{ width: "22%" }}></div>
                    </div>
                    <span className="text-xs">22%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PostAnalytics;
