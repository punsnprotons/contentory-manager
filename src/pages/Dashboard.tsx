import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, LineChart } from 'recharts';
import ActivityHistory from '@/components/analytics/ActivityHistory';
import PostAnalytics from '@/components/analytics/PostAnalytics';
import RefreshDataButton from '@/components/ui/RefreshDataButton';

// Mock data for demonstration
const dashboardData = {
  totalRevenue: 54050,
  newCustomers: 1240,
  activeNow: 321,
  totalPosts: 450,
  engagementRate: 3.2,
  averageReach: 2500,
  topPosts: [
    { id: 1, title: 'Engaging with AI', views: 5486, likes: 234, comments: 45 },
    { id: 2, title: 'The Future of AI', views: 4352, likes: 189, comments: 32 },
    { id: 3, title: 'AI and Marketing', views: 3210, likes: 156, comments: 22 },
  ],
  dailyRevenue: [
    { day: 'Mon', revenue: 3200 },
    { day: 'Tue', revenue: 4500 },
    { day: 'Wed', revenue: 5200 },
    { day: 'Thu', revenue: 5800 },
    { day: 'Fri', revenue: 6500 },
    { day: 'Sat', revenue: 7200 },
    { day: 'Sun', revenue: 6800 },
  ],
  engagementMetrics: [
    { platform: 'Instagram', rate: 2.5 },
    { platform: 'Twitter', rate: 3.8 },
    { platform: 'Facebook', rate: 1.9 },
  ],
};

const Dashboard = () => {
  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <RefreshDataButton />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${dashboardData.totalRevenue}</div>
            <p className="text-muted-foreground">From direct sales and subscriptions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>New Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.newCustomers}</div>
            <p className="text-muted-foreground">New customers this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Now</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.activeNow}</div>
            <p className="text-muted-foreground">Real-time active users</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle>Total Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalPosts}</div>
            <p className="text-muted-foreground">Total posts across platforms</p>
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
                <CardTitle>Engagement Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.engagementRate}%</div>
                <p className="text-muted-foreground">Overall engagement rate across all platforms</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dashboardData.engagementMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="platform" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="rate" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Average Reach</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData.averageReach}</div>
                <p className="text-muted-foreground">Average reach per post</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={dashboardData.dailyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="#82ca9d" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Performing Posts</CardTitle>
              <CardCaption>Posts with the highest engagement</CardCaption>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Likes</TableHead>
                    <TableHead>Comments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.topPosts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="font-medium">{post.id}</TableCell>
                      <TableCell>{post.title}</TableCell>
                      <TableCell>{post.views}</TableCell>
                      <TableCell>{post.likes}</TableCell>
                      <TableCell>{post.comments}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <PostAnalytics />
        </TabsContent>
        <TabsContent value="history">
          <ActivityHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
