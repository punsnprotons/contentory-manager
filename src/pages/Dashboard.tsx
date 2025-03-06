
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, LineChart } from 'recharts';
import ActivityHistory from '@/components/analytics/ActivityHistory';
import PostAnalytics from '@/components/analytics/PostAnalytics';
import RefreshDataButton from '@/components/ui/RefreshDataButton';
import { useActivityHistory } from '@/hooks/useActivityHistory';
import { usePostAnalytics } from '@/hooks/usePostAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const Dashboard = () => {
  const { activities } = useActivityHistory();
  const { user } = useAuth();
  const { 
    posts, 
    topPerformingContent, 
    followerMetrics,
    engagementRate,
    postsThisMonth,
    avgReach,
    loading,
    refreshData
  } = usePostAnalytics();
  
  const [activeUsers, setActiveUsers] = useState(0);

  useEffect(() => {
    // Simulated active users count - in a real app, this would be from real-time analytics
    const randomActiveUsers = Math.floor(Math.random() * 100) + 200;
    setActiveUsers(randomActiveUsers);
  }, []);

  // Get the top content for analytics
  const topContent = topPerformingContent && topPerformingContent.length > 0 
    ? topPerformingContent[0] 
    : null;

  const handleRefresh = async () => {
    try {
      toast.loading('Refreshing data...');
      await refreshData();
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    }
  };
  
  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <RefreshDataButton />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Followers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {followerMetrics.twitter.count + followerMetrics.instagram.count}
            </div>
            <p className="text-muted-foreground">Combined followers across platforms</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Posts This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{postsThisMonth}</div>
            <p className="text-muted-foreground">New posts this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Now</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <p className="text-muted-foreground">Real-time active users</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle>Engagement Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{engagementRate.value}</div>
            <p className="text-muted-foreground">Average engagement rate</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="history">Activity History</TabsTrigger>
        </TabsList>
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Platform Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgReach}</div>
                <p className="text-muted-foreground">Average reach per post</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                    { platform: 'Twitter', followers: followerMetrics.twitter.count },
                    { platform: 'Instagram', followers: followerMetrics.instagram.count }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="platform" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="followers" fill="#8884d8" name="Followers" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Engagement Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{engagementRate.value}</div>
                <p className="text-muted-foreground">
                  {engagementRate.trend === 'up' ? '↑ ' : '↓ '}
                  {engagementRate.change} from last period
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={[
                    { day: 'Mon', rate: Math.random() * 5 },
                    { day: 'Tue', rate: Math.random() * 5 },
                    { day: 'Wed', rate: Math.random() * 5 },
                    { day: 'Thu', rate: Math.random() * 5 },
                    { day: 'Fri', rate: Math.random() * 5 },
                    { day: 'Sat', rate: Math.random() * 5 },
                    { day: 'Sun', rate: Math.random() * 5 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="rate" stroke="#82ca9d" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Performing Posts</CardTitle>
              <CardDescription>Posts with the highest engagement</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <p className="text-muted-foreground">Loading top posts...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">ID</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Likes</TableHead>
                      <TableHead>Comments</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topPerformingContent.length > 0 ? (
                      topPerformingContent.map((post, index) => (
                        <TableRow key={post.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>{post.content.substring(0, 50)}...</TableCell>
                          <TableCell>{post.metrics?.views || 0}</TableCell>
                          <TableCell>{post.metrics?.likes || 0}</TableCell>
                          <TableCell>{post.metrics?.comments || 0}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          No posts found. Create some content to see analytics.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          {topContent && <PostAnalytics content={topContent} />}
        </TabsContent>
        <TabsContent value="history">
          <ActivityHistory activities={activities} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
