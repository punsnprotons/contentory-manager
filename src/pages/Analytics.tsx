
import React, { useState } from "react";
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

const data = [
  { name: "Jan", instagram: 400, twitter: 240 },
  { name: "Feb", instagram: 300, twitter: 139 },
  { name: "Mar", instagram: 200, twitter: 980 },
  { name: "Apr", instagram: 278, twitter: 390 },
  { name: "May", instagram: 189, twitter: 480 },
  { name: "Jun", instagram: 239, twitter: 380 },
  { name: "Jul", instagram: 349, twitter: 430 },
];

const engagementData = [
  { name: "Mon", likes: 140, comments: 24, shares: 18 },
  { name: "Tue", likes: 120, comments: 18, shares: 22 },
  { name: "Wed", likes: 180, comments: 36, shares: 31 },
  { name: "Thu", likes: 250, comments: 40, shares: 43 },
  { name: "Fri", likes: 190, comments: 28, shares: 34 },
  { name: "Sat", likes: 230, comments: 32, shares: 39 },
  { name: "Sun", likes: 210, comments: 26, shares: 37 },
];

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
  const { posts, loading: postsLoading } = usePostAnalytics();
  const { activities, loading: activitiesLoading } = useActivityHistory();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const selectedPost = selectedPostId ? posts.find(post => post.id === selectedPostId) : null;

  return (
    <div className="container-page animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Analytics</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <MetricCard
          title="Total Followers"
          value="10.8k"
          change="+12.3%"
          icon={Users}
          trend="up"
        />
        <MetricCard
          title="Engagement Rate"
          value="4.6%"
          change="+2.1%"
          icon={BarChart}
          trend="up"
        />
        <MetricCard
          title="Posts This Month"
          value="48"
          change="+8"
          icon={Calendar}
          trend="up"
        />
        <MetricCard
          title="Avg. Reach per Post"
          value="3.2k"
          change="-1.8%"
          icon={TrendingUp}
          trend="down"
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
                <RechartsBarChart data={data}>
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
                <LineChart data={data}>
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
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                    <BarChart className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">Summer collection promotion #{i}</div>
                    <div className="text-sm text-muted-foreground">
                      {4200 - i * 340} impressions • {320 - i * 30} engagements
                    </div>
                  </div>
                </div>
              ))}
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
