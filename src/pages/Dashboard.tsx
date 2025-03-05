
import React from "react";
import {
  BarChart as BarChartIcon,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  ArrowRight,
  Zap,
  Users
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MetricCard from "@/components/ui/MetricCard";
import ContentCard from "@/components/ui/ContentCard";
import { Metric, Content } from "@/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const Dashboard: React.FC = () => {
  // Sample data - in a real app this would come from an API
  const metrics: Metric[] = [
    {
      id: "1",
      label: "Total Followers",
      value: 12548,
      change: 2.5,
      platform: "instagram",
    },
    {
      id: "2",
      label: "Engagement Rate",
      value: 3.2,
      change: 0.8,
      platform: "instagram",
    },
    {
      id: "3",
      label: "Total Followers",
      value: 8423,
      change: 1.2,
      platform: "twitter",
    },
    {
      id: "4",
      label: "Engagement Rate",
      value: 2.7,
      change: -0.5,
      platform: "twitter",
    },
  ];

  const topPerformingContent: Content[] = [
    {
      id: "1",
      type: "image",
      intent: "promotional",
      platform: "instagram",
      content: "Our new summer collection has arrived! Check it out now. #fashion #summer #newcollection",
      mediaUrl: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1770&q=80",
      status: "published",
      createdAt: new Date("2023-06-15"),
      publishedAt: new Date("2023-06-15"),
      metrics: {
        likes: 423,
        comments: 56,
        shares: 28,
        views: 2890,
      },
    },
    {
      id: "2",
      type: "text",
      intent: "news",
      platform: "twitter",
      content: "We're thrilled to announce our new partnership with @brandname! Stay tuned for exciting collaborations.",
      status: "published",
      createdAt: new Date("2023-06-10"),
      publishedAt: new Date("2023-06-10"),
      metrics: {
        likes: 287,
        comments: 34,
        shares: 92,
        views: 1540,
      },
    },
  ];

  const engagementData = [
    { name: "Mon", instagram: 2400, twitter: 1398 },
    { name: "Tue", instagram: 1398, twitter: 3400 },
    { name: "Wed", instagram: 9800, twitter: 2400 },
    { name: "Thu", instagram: 3908, twitter: 5400 },
    { name: "Fri", instagram: 4800, twitter: 3400 },
    { name: "Sat", instagram: 3800, twitter: 1400 },
    { name: "Sun", instagram: 4300, twitter: 2400 },
  ];

  return (
    <div className="container-page animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button className="flex items-center">
          <Zap size={16} className="mr-1" />
          <span>Quick Actions</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2 overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Engagement Overview</CardTitle>
            <BarChartIcon size={20} className="text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-80 w-full p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engagementData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      border: 'none'
                    }} 
                  />
                  <Bar dataKey="instagram" fill="#E1306C" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="twitter" fill="#1DA1F2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="mr-2 h-4 w-4 rounded-full bg-pink-400" />
                  <span className="text-sm font-medium">Instagram</span>
                </div>
                <span className="text-sm font-bold">65%</span>
              </div>
              <div className="h-2 w-full bg-pink-100 rounded-full overflow-hidden">
                <div className="h-full bg-pink-400 rounded-full" style={{ width: "65%" }} />
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="mr-2 h-4 w-4 rounded-full bg-blue-400" />
                  <span className="text-sm font-medium">Twitter</span>
                </div>
                <span className="text-sm font-bold">35%</span>
              </div>
              <div className="h-2 w-full bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 rounded-full" style={{ width: "35%" }} />
              </div>

              <div className="pt-4 space-y-2">
                <div className="flex items-center text-sm">
                  <Heart size={16} className="mr-2 text-red-500" />
                  <span className="font-medium">4.2k</span>
                  <span className="text-muted-foreground ml-1">total likes</span>
                </div>
                <div className="flex items-center text-sm">
                  <MessageCircle size={16} className="mr-2 text-blue-500" />
                  <span className="font-medium">987</span>
                  <span className="text-muted-foreground ml-1">comments</span>
                </div>
                <div className="flex items-center text-sm">
                  <Share2 size={16} className="mr-2 text-green-500" />
                  <span className="font-medium">1.3k</span>
                  <span className="text-muted-foreground ml-1">shares</span>
                </div>
                <div className="flex items-center text-sm">
                  <Eye size={16} className="mr-2 text-purple-500" />
                  <span className="font-medium">24.8k</span>
                  <span className="text-muted-foreground ml-1">views</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Top Performing Content</h2>
        <Button variant="ghost" className="flex items-center text-muted-foreground">
          <span>View All</span>
          <ArrowRight size={16} className="ml-1" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {topPerformingContent.map((content) => (
          <ContentCard key={content.id} content={content} />
        ))}
        <Card className="flex flex-col items-center justify-center p-6 border-dashed border-2 hover:border-primary/50 transition-colors">
          <Button variant="outline" className="rounded-full h-12 w-12 mb-3">
            <Plus size={20} />
          </Button>
          <h3 className="text-lg font-medium mb-1">Create New Content</h3>
          <p className="text-center text-muted-foreground text-sm mb-4">Generate new content for your social media platforms</p>
          <Button asChild>
            <a href="/content-generation">Get Started</a>
          </Button>
        </Card>
      </div>
    </div>
  );
};

const Plus = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

export default Dashboard;
