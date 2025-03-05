
import React, { useEffect } from "react";
import {
  BarChart as BarChartIcon,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  ArrowRight,
  Zap,
  Users,
  Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MetricCard from "@/components/ui/MetricCard";
import ContentCard from "@/components/ui/ContentCard";
import { Metric } from "@/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";
import { usePostAnalytics } from "@/hooks/usePostAnalytics";
import { useActivityHistory } from "@/hooks/useActivityHistory";
import ActivityHistory from "@/components/analytics/ActivityHistory";

const Dashboard: React.FC = () => {
  const { 
    topPerformingContent, 
    loading, 
    usingSampleData, 
    engagementData,
    followerMetrics,
    engagementRate,
    postsThisMonth,
    avgReach,
    platformDistribution,
    refreshData,
    posts
  } = usePostAnalytics();

  const { 
    activities, 
    loading: activitiesLoading, 
    comments
  } = useActivityHistory();

  useEffect(() => {
    console.log("Dashboard mounted, refreshing data");
    refreshData();
  }, [refreshData]);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const instagramPostsThisMonth = posts.filter(post => 
    post.publishedAt && 
    post.publishedAt.getMonth() === currentMonth &&
    post.publishedAt.getFullYear() === currentYear &&
    post.platform === 'instagram'
  ).length;
  
  const twitterPostsThisMonth = posts.filter(post => 
    post.publishedAt && 
    post.publishedAt.getMonth() === currentMonth &&
    post.publishedAt.getFullYear() === currentYear &&
    post.platform === 'twitter'
  ).length;
  
  console.log(`Dashboard client-side count: Instagram: ${instagramPostsThisMonth}, Twitter: ${twitterPostsThisMonth}`);

  const metrics: Metric[] = [
    {
      id: "1",
      label: "Total Followers",
      value: followerMetrics.instagram.count,
      change: parseFloat(followerMetrics.instagram.change),
      platform: "instagram",
    },
    {
      id: "2",
      label: "Engagement Rate",
      value: parseFloat(engagementRate.value),
      change: parseFloat(engagementRate.change),
      platform: "instagram",
    },
    {
      id: "3",
      label: "Total Followers",
      value: followerMetrics.twitter.count,
      change: parseFloat(followerMetrics.twitter.change),
      platform: "twitter",
    },
    {
      id: "4",
      label: "Posts This Month",
      value: postsThisMonth,
      change: postsThisMonth > 0 ? 
        parseFloat(((postsThisMonth - (postsThisMonth / 1.1)) / (postsThisMonth / 1.1) * 100).toFixed(1)) : 
        0,
      platform: "twitter",
    },
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
                  <Bar dataKey="likes" fill="#E1306C" radius={[4, 4, 0, 0]} name="Likes" />
                  <Bar dataKey="comments" fill="#1DA1F2" radius={[4, 4, 0, 0]} name="Comments" />
                  <Bar dataKey="shares" fill="#4CAF50" radius={[4, 4, 0, 0]} name="Shares" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Platform Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="mr-2 h-4 w-4 rounded-full bg-pink-400" />
                  <span className="text-sm font-medium">Instagram</span>
                </div>
                <span className="text-sm font-bold">{platformDistribution.instagram}%</span>
              </div>
              <div className="h-2 w-full bg-pink-100 rounded-full overflow-hidden">
                <div className="h-full bg-pink-400 rounded-full" style={{ width: `${platformDistribution.instagram}%` }} />
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="mr-2 h-4 w-4 rounded-full bg-blue-400" />
                  <span className="text-sm font-medium">Twitter</span>
                </div>
                <span className="text-sm font-bold">{platformDistribution.twitter}%</span>
              </div>
              <div className="h-2 w-full bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 rounded-full" style={{ width: `${platformDistribution.twitter}%` }} />
              </div>

              <div className="pt-1 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-pink-500 font-medium">Instagram Posts:</span>
                  <span className="font-bold">{instagramPostsThisMonth}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-500 font-medium">Twitter Posts:</span>
                  <span className="font-bold">{twitterPostsThisMonth}</span>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <div className="flex items-center text-sm">
                  <Heart size={16} className="mr-2 text-red-500" />
                  <span className="font-medium">
                    {(!topPerformingContent || topPerformingContent.length === 0) ? 
                      0 : 
                      topPerformingContent.reduce((total, content) => total + (content.metrics?.likes || 0), 0).toLocaleString()}
                  </span>
                  <span className="text-muted-foreground ml-1">total likes</span>
                </div>
                <div className="flex items-center text-sm">
                  <MessageCircle size={16} className="mr-2 text-blue-500" />
                  <span className="font-medium">
                    {(!topPerformingContent || topPerformingContent.length === 0) ? 
                      0 : 
                      topPerformingContent.reduce((total, content) => total + (content.metrics?.comments || 0), 0).toLocaleString()}
                  </span>
                  <span className="text-muted-foreground ml-1">comments</span>
                </div>
                <div className="flex items-center text-sm">
                  <Share2 size={16} className="mr-2 text-green-500" />
                  <span className="font-medium">
                    {(!topPerformingContent || topPerformingContent.length === 0) ? 
                      0 : 
                      topPerformingContent.reduce((total, content) => total + (content.metrics?.shares || 0), 0).toLocaleString()}
                  </span>
                  <span className="text-muted-foreground ml-1">shares</span>
                </div>
                <div className="flex items-center text-sm">
                  <Eye size={16} className="mr-2 text-purple-500" />
                  <span className="font-medium">
                    {(!topPerformingContent || topPerformingContent.length === 0) ? 
                      0 : 
                      topPerformingContent.reduce((total, content) => total + (content.metrics?.views || 0), 0).toLocaleString()}
                  </span>
                  <span className="text-muted-foreground ml-1">views</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Top Performing Content</h2>
            <Button variant="ghost" asChild className="flex items-center text-muted-foreground">
              <Link to="/pending-content?status=published">
                <span>View All</span>
                <ArrowRight size={16} className="ml-1" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-muted h-56 rounded-lg animate-pulse"></div>
              <div className="bg-muted h-56 rounded-lg animate-pulse"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {topPerformingContent && topPerformingContent.length > 0 ? (
                topPerformingContent.slice(0, 2).map((content) => (
                  <ContentCard key={content.id} content={content} />
                ))
              ) : (
                <div className="col-span-2 flex flex-col items-center justify-center p-6 border rounded-lg border-dashed">
                  <Users size={40} className="text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium mb-1">No Content Yet</h3>
                  <p className="text-center text-muted-foreground text-sm mb-4">
                    You don't have any published content to analyze
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-6">Recent Activity</h2>
          {activitiesLoading ? (
            <div className="bg-muted h-56 rounded-lg animate-pulse"></div>
          ) : (
            activities && activities.length > 0 ? (
              <div className="max-h-[400px] overflow-y-auto pr-2">
                <ActivityHistory 
                  activities={activities.slice(0, 5)} 
                  comments={comments} 
                />
              </div>
            ) : (
              <Card className="flex flex-col items-center justify-center p-6 border-dashed border-2">
                <Activity size={40} className="text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium mb-1">No Recent Activity</h3>
                <p className="text-center text-muted-foreground text-sm mb-4">
                  There's no recent activity to display
                </p>
              </Card>
            )
          )}
        </div>
      </div>

      <Card className="flex flex-col items-center justify-center p-6 border-dashed border-2 hover:border-primary/50 transition-colors">
        <Button variant="outline" className="rounded-full h-12 w-12 mb-3">
          <Plus size={20} />
        </Button>
        <h3 className="text-lg font-medium mb-1">Create New Content</h3>
        <p className="text-center text-muted-foreground text-sm mb-4">Generate new content for your social media platforms</p>
        <Button asChild>
          <Link to="/content-generation">Get Started</Link>
        </Button>
      </Card>
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
