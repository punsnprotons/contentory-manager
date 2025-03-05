
import React, { useState, useEffect } from "react";
import { BarChart, Calendar, TrendingUp, Users, Activity, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, LineChart, Line } from "recharts";
import PostAnalytics from "@/components/analytics/PostAnalytics";
import ActivityHistory from "@/components/analytics/ActivityHistory";
import { usePostAnalytics } from "@/hooks/usePostAnalytics";
import { useActivityHistory } from "@/hooks/useActivityHistory";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Content } from "@/types";
import { Link } from "react-router-dom";

const MetricCard = ({ title, value, change, icon: Icon, trend = "up" }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className={`text-xs ${trend === "up" ? "text-green-500" : "text-red-500"} flex items-center mt-1`}>
        {trend === "up" ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingUp className="mr-1 h-3 w-3 rotate-180" />}
        {change} from last month
      </p>
    </CardContent>
  </Card>
);

const Analytics: React.FC = () => {
  const { 
    posts, 
    loading: postsLoading, 
    usingSampleData, 
    platformData, 
    engagementData 
  } = usePostAnalytics();
  
  const { activities, loading: activitiesLoading } = useActivityHistory();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [topContent, setTopContent] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followerMetrics, setFollowerMetrics] = useState({
    instagram: { count: 10800, change: "+12.3%" },
    twitter: { count: 8400, change: "+8.7%" }
  });
  const [engagementRate, setEngagementRate] = useState({
    value: "4.6%",
    change: "+2.1%",
    trend: "up"
  });

  const selectedPost = selectedPostId ? posts.find(post => post.id === selectedPostId) : null;

  useEffect(() => {
    const fetchTopContent = async () => {
      setIsLoading(true);
      try {
        // Fetch published content with metrics
        const { data, error } = await supabase
          .from('content')
          .select(`
            *,
            content_metrics(*)
          `)
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(3);
          
        if (error) {
          throw error;
        }
        
        if (data && data.length > 0) {
          const transformedData: Content[] = data.map(item => ({
            id: item.id,
            type: item.type,
            intent: item.intent,
            platform: item.platform,
            content: item.content,
            mediaUrl: item.media_url,
            status: item.status,
            createdAt: new Date(item.created_at),
            scheduledFor: item.scheduled_for ? new Date(item.scheduled_for) : undefined,
            publishedAt: item.published_at ? new Date(item.published_at) : undefined,
            metrics: item.content_metrics && item.content_metrics.length > 0 
              ? {
                  likes: item.content_metrics[0].likes,
                  comments: item.content_metrics[0].comments,
                  shares: item.content_metrics[0].shares,
                  views: item.content_metrics[0].views,
                }
              : { likes: 0, comments: 0, shares: 0, views: 0 }
          }));
          
          // Sort by engagement (sum of likes, comments, shares)
          transformedData.sort((a, b) => {
            const aEngagement = (a.metrics?.likes || 0) + (a.metrics?.comments || 0) + (a.metrics?.shares || 0);
            const bEngagement = (b.metrics?.likes || 0) + (b.metrics?.comments || 0) + (b.metrics?.shares || 0);
            return bEngagement - aEngagement;
          });
          
          setTopContent(transformedData);
        } else {
          // If no data, use the top posts from usePostAnalytics
          const sortedPosts = [...posts].sort((a, b) => {
            const aEngagement = (a.metrics?.likes || 0) + (a.metrics?.comments || 0) + (a.metrics?.shares || 0);
            const bEngagement = (b.metrics?.likes || 0) + (b.metrics?.comments || 0) + (b.metrics?.shares || 0);
            return bEngagement - aEngagement;
          });
          
          setTopContent(sortedPosts.slice(0, 3));
        }
        
        // Fetch follower metrics
        const { data: followerData, error: followerError } = await supabase
          .from('follower_metrics')
          .select('*')
          .order('recorded_at', { ascending: false })
          .limit(10);
          
        if (!followerError && followerData && followerData.length > 0) {
          // Group by platform and calculate growth
          const instagramFollowers = followerData.filter(item => item.platform === 'instagram');
          const twitterFollowers = followerData.filter(item => item.platform === 'twitter');
          
          if (instagramFollowers.length >= 2) {
            const current = instagramFollowers[0].follower_count;
            const previous = instagramFollowers[1].follower_count;
            const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
            
            setFollowerMetrics(prev => ({
              ...prev,
              instagram: {
                count: current,
                change: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
              }
            }));
          }
          
          if (twitterFollowers.length >= 2) {
            const current = twitterFollowers[0].follower_count;
            const previous = twitterFollowers[1].follower_count;
            const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
            
            setFollowerMetrics(prev => ({
              ...prev,
              twitter: {
                count: current,
                change: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
              }
            }));
          }
        }
        
        // Fetch engagement metrics
        const { data: engagementMetricsData, error: engagementError } = await supabase
          .from('engagement_metrics')
          .select('*')
          .order('recorded_at', { ascending: false })
          .limit(10);
          
        if (!engagementError && engagementMetricsData && engagementMetricsData.length > 0) {
          // Calculate average engagement rate
          const totalEngagement = engagementMetricsData.reduce((sum, item) => sum + item.engagement_rate, 0);
          const avgEngagement = totalEngagement / engagementMetricsData.length;
          
          // Calculate change if there are enough data points
          if (engagementMetricsData.length >= 2) {
            const recentAvg = engagementMetricsData.slice(0, 5).reduce((sum, item) => sum + item.engagement_rate, 0) / 5;
            const olderAvg = engagementMetricsData.slice(5, 10).reduce((sum, item) => sum + item.engagement_rate, 0) / 5;
            const change = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
            
            setEngagementRate({
              value: `${avgEngagement.toFixed(1)}%`,
              change: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
              trend: change >= 0 ? "up" : "down"
            });
          } else {
            setEngagementRate({
              value: `${avgEngagement.toFixed(1)}%`,
              change: "+0.0%",
              trend: "up"
            });
          }
        }
      } catch (error) {
        console.error("Error fetching analytics data:", error);
        
        // If error, use posts from usePostAnalytics
        const sortedPosts = [...posts].sort((a, b) => {
          const aEngagement = (a.metrics?.likes || 0) + (a.metrics?.comments || 0) + (a.metrics?.shares || 0);
          const bEngagement = (b.metrics?.likes || 0) + (b.metrics?.comments || 0) + (b.metrics?.shares || 0);
          return bEngagement - aEngagement;
        });
        
        setTopContent(sortedPosts.slice(0, 3));
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopContent();
    
    // Set up realtime subscriptions
    const metricsChannel = supabase
      .channel('content_metrics_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'content_metrics' }, 
        () => {
          fetchTopContent();
        }
      )
      .subscribe();
      
    const followerChannel = supabase
      .channel('follower_metrics_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'follower_metrics' }, 
        () => {
          fetchTopContent();
        }
      )
      .subscribe();
      
    const engagementChannel = supabase
      .channel('engagement_metrics_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'engagement_metrics' }, 
        () => {
          fetchTopContent();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(metricsChannel);
      supabase.removeChannel(followerChannel);
      supabase.removeChannel(engagementChannel);
    };
  }, [posts]);

  // Calculate total posts this month
  const currentMonth = new Date().getMonth();
  const postsThisMonth = posts.filter(post => 
    post.publishedAt && post.publishedAt.getMonth() === currentMonth
  ).length;
  
  // Calculate average reach per post
  const totalReach = posts.reduce((sum, post) => sum + (post.metrics?.views || 0), 0);
  const avgReach = posts.length > 0 ? Math.floor(totalReach / posts.length) : 0;

  return (
    <div className="container-page animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Analytics</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <MetricCard
          title="Total Followers"
          value={`${(followerMetrics.instagram.count + followerMetrics.twitter.count).toLocaleString()}`}
          change={followerMetrics.instagram.change}
          icon={Users}
          trend="up"
        />
        <MetricCard
          title="Engagement Rate"
          value={engagementRate.value}
          change={engagementRate.change}
          icon={BarChart}
          trend={engagementRate.trend}
        />
        <MetricCard
          title="Posts This Month"
          value={postsThisMonth.toString()}
          change={`+${Math.floor(postsThisMonth * 0.2)}`}
          icon={Calendar}
          trend="up"
        />
        <MetricCard
          title="Avg. Reach per Post"
          value={`${avgReach.toLocaleString()}`}
          change={avgReach > 0 ? `-1.8%` : "+0.0%"}
          icon={TrendingUp}
          trend={avgReach > 0 ? "down" : "up"}
        />
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="followers">Followers</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Growth Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <TabsContent value="overview">
              <ResponsiveContainer width="100%" height={350}>
                <RechartsBarChart data={platformData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="instagram" fill="hsl(var(--primary))" name="Instagram" />
                  <Bar dataKey="twitter" fill="hsl(var(--secondary))" name="Twitter" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </TabsContent>
            <TabsContent value="engagement">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="likes" stroke="#8884d8" name="Likes" />
                  <Line type="monotone" dataKey="comments" stroke="#82ca9d" name="Comments" />
                  <Line type="monotone" dataKey="shares" stroke="#ffc658" name="Shares" />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>
            <TabsContent value="followers">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={platformData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="instagram" stroke="#E1306C" name="Instagram" />
                  <Line type="monotone" dataKey="twitter" stroke="#1DA1F2" name="Twitter" />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>
            <TabsContent value="posts" className="space-y-4">
              {postsLoading ? (
                <div className="py-6 text-center text-muted-foreground">Loading posts analytics...</div>
              ) : posts.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground">No published posts found</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {posts.map(post => (
                      <Card 
                        key={post.id} 
                        className={`cursor-pointer transition-colors ${selectedPostId === post.id ? 'border-primary' : ''}`}
                        onClick={() => setSelectedPostId(post.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            {post.mediaUrl && (
                              <div className="w-12 h-12 rounded overflow-hidden shrink-0">
                                <img 
                                  src={post.mediaUrl} 
                                  alt="Post" 
                                  className="w-full h-full object-cover" 
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium line-clamp-2">{post.content}</p>
                              <div className="flex mt-2 justify-between">
                                <span className={`text-xs px-1.5 py-0.5 rounded-full 
                                  ${post.platform === 'instagram' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'}`}
                                >
                                  {post.platform}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {post.metrics?.views || 0} views
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  {selectedPost && <PostAnalytics content={selectedPost} />}
                </div>
              )}
            </TabsContent>
            <TabsContent value="activity">
              {activitiesLoading ? (
                <div className="py-6 text-center text-muted-foreground">Loading activity history...</div>
              ) : activities.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground">No activity found</div>
              ) : (
                <ActivityHistory activities={activities} />
              )}
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="py-4 text-center text-muted-foreground">Loading top content...</div>
              ) : topContent.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground">No published content found</div>
              ) : (
                topContent.map((content, index) => (
                  <div 
                    key={content.id} 
                    className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                      {content.mediaUrl ? (
                        <img 
                          src={content.mediaUrl} 
                          alt={`Content ${index + 1}`} 
                          className="w-full h-full object-cover rounded-md" 
                        />
                      ) : (
                        <BarChart className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium line-clamp-1">{content.content.substring(0, 60)}</div>
                      <div className="text-sm text-muted-foreground">
                        {content.metrics?.views || 0} impressions • {(content.metrics?.likes || 0) + (content.metrics?.comments || 0)} engagements
                      </div>
                    </div>
                    <div className={`px-2 py-1 text-xs rounded-full ${
                      content.platform === 'instagram' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {content.platform}
                    </div>
                  </div>
                ))
              )}
              {topContent.length > 0 && (
                <div className="pt-2">
                  <Button variant="ghost" asChild className="w-full text-sm">
                    <Link to="/pending-content?status=published">View all published content</Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audience Demographics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-1">Age Groups</div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="w-16 text-sm">18-24</div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: "35%" }}></div>
                    </div>
                    <div className="w-10 text-sm text-right">35%</div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-16 text-sm">25-34</div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: "42%" }}></div>
                    </div>
                    <div className="w-10 text-sm text-right">42%</div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-16 text-sm">35-44</div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: "15%" }}></div>
                    </div>
                    <div className="w-10 text-sm text-right">15%</div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-16 text-sm">45+</div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: "8%" }}></div>
                    </div>
                    <div className="w-10 text-sm text-right">8%</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-1">Gender</div>
                <div className="flex items-center">
                  <div className="w-16 text-sm">Female</div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div className="bg-primary h-2.5 rounded-full" style={{ width: "58%" }}></div>
                  </div>
                  <div className="w-10 text-sm text-right">58%</div>
                </div>
                <div className="flex items-center mt-2">
                  <div className="w-16 text-sm">Male</div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div className="bg-primary h-2.5 rounded-full" style={{ width: "39%" }}></div>
                  </div>
                  <div className="w-10 text-sm text-right">39%</div>
                </div>
                <div className="flex items-center mt-2">
                  <div className="w-16 text-sm">Other</div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div className="bg-primary h-2.5 rounded-full" style={{ width: "3%" }}></div>
                  </div>
                  <div className="w-10 text-sm text-right">3%</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
