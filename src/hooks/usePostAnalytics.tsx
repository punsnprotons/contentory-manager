
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Content } from '@/types';

// Sample data to use when no real data is available
const samplePosts: Content[] = [
  {
    id: "sample-1",
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
    id: "sample-2",
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
  {
    id: "sample-3",
    type: "image",
    intent: "poll", // Changed from "engagement" to "poll" which is a valid ContentIntent
    platform: "instagram",
    content: "What's your favorite product from our catalog? Let us know in the comments below!",
    mediaUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1770&q=80",
    status: "published",
    createdAt: new Date("2023-06-08"),
    publishedAt: new Date("2023-06-08"),
    metrics: {
      likes: 512,
      comments: 78,
      shares: 45,
      views: 3210,
    },
  }
];

export const usePostAnalytics = () => {
  const [posts, setPosts] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [usingSampleData, setUsingSampleData] = useState(false);
  const [platformData, setPlatformData] = useState<any[]>([]);
  const [engagementData, setEngagementData] = useState<any[]>([]);

  useEffect(() => {
    const fetchPostsWithAnalytics = async () => {
      try {
        setLoading(true);
        
        // Fetch published posts
        const { data: postsData, error: postsError } = await supabase
          .from('content')
          .select('*')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(10);
        
        if (postsError) throw postsError;
        
        // If no posts found, use sample data
        if (!postsData || postsData.length === 0) {
          console.log("No published posts found, using sample data");
          setPosts(samplePosts);
          setUsingSampleData(true);
          
          // Generate sample platform data for charts
          const samplePlatformData = [
            { name: "Jan", instagram: 400, twitter: 240 },
            { name: "Feb", instagram: 300, twitter: 139 },
            { name: "Mar", instagram: 200, twitter: 980 },
            { name: "Apr", instagram: 278, twitter: 390 },
            { name: "May", instagram: 189, twitter: 480 },
            { name: "Jun", instagram: 239, twitter: 380 },
            { name: "Jul", instagram: 349, twitter: 430 },
          ];
          
          // Generate sample engagement data for charts
          const sampleEngagementData = [
            { name: "Mon", likes: 140, comments: 24, shares: 18 },
            { name: "Tue", likes: 120, comments: 18, shares: 22 },
            { name: "Wed", likes: 180, comments: 36, shares: 31 },
            { name: "Thu", likes: 250, comments: 40, shares: 43 },
            { name: "Fri", likes: 190, comments: 28, shares: 34 },
            { name: "Sat", likes: 230, comments: 32, shares: 39 },
            { name: "Sun", likes: 210, comments: 26, shares: 37 },
          ];
          
          setPlatformData(samplePlatformData);
          setEngagementData(sampleEngagementData);
          setLoading(false);
          return;
        }
        
        // Fetch metrics for these posts
        const postIds = postsData.map(post => post.id);
        
        const { data: metricsData, error: metricsError } = await supabase
          .from('content_metrics')
          .select('*')
          .in('content_id', postIds);
        
        if (metricsError) throw metricsError;
        
        // Create a map of metrics by content ID
        const metricsMap = metricsData?.reduce((acc, metric) => {
          acc[metric.content_id] = {
            likes: metric.likes,
            comments: metric.comments,
            shares: metric.shares,
            views: metric.views
          };
          return acc;
        }, {} as Record<string, { likes: number, comments: number, shares: number, views: number }>) || {};
        
        // Transform posts data with metrics
        const transformedPosts: Content[] = postsData.map(post => ({
          id: post.id,
          type: post.type,
          intent: post.intent,
          platform: post.platform,
          content: post.content,
          mediaUrl: post.media_url,
          status: post.status,
          createdAt: new Date(post.created_at),
          scheduledFor: post.scheduled_for ? new Date(post.scheduled_for) : undefined,
          publishedAt: post.published_at ? new Date(post.published_at) : undefined,
          metrics: metricsMap[post.id] || { likes: 0, comments: 0, shares: 0, views: 0 }
        }));
        
        setPosts(transformedPosts);
        setUsingSampleData(false);
        
        // Fetch platform metrics data for charting
        const { data: performanceData, error: performanceError } = await supabase
          .from('performance_metrics')
          .select('*')
          .order('created_at', { ascending: true });
          
        if (performanceError) throw performanceError;
        
        // Generate real platform data for charts if available
        if (performanceData && performanceData.length > 0) {
          // Group by month and platform
          const monthlyData = performanceData.reduce((acc, item) => {
            const date = new Date(item.created_at);
            const month = date.toLocaleString('default', { month: 'short' });
            
            if (!acc[month]) {
              acc[month] = { name: month, instagram: 0, twitter: 0 };
            }
            
            if (item.platform === 'instagram') {
              acc[month].instagram += (item.total_likes + item.total_comments + item.total_shares);
            } else if (item.platform === 'twitter') {
              acc[month].twitter += (item.total_likes + item.total_comments + item.total_shares);
            }
            
            return acc;
          }, {} as Record<string, any>);
          
          setPlatformData(Object.values(monthlyData));
        } else {
          // Use sample data if no real data
          const samplePlatformData = [
            { name: "Jan", instagram: 400, twitter: 240 },
            { name: "Feb", instagram: 300, twitter: 139 },
            { name: "Mar", instagram: 200, twitter: 980 },
            { name: "Apr", instagram: 278, twitter: 390 },
            { name: "May", instagram: 189, twitter: 480 },
            { name: "Jun", instagram: 239, twitter: 380 },
            { name: "Jul", instagram: 349, twitter: 430 },
          ];
          setPlatformData(samplePlatformData);
        }
        
        // Fetch daily engagement data
        const { data: dailyData, error: dailyError } = await supabase
          .from('daily_engagement')
          .select('*')
          .order('day_of_week', { ascending: true });
          
        if (dailyError) throw dailyError;
        
        // Generate real engagement data for charts if available
        if (dailyData && dailyData.length > 0) {
          // Group by day of week
          const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
          
          // Initialize with 0 values
          const dailyEngagement = days.map(day => ({
            name: day,
            likes: 0,
            comments: 0,
            shares: 0
          }));
          
          // Sum engagement by day
          dailyData.forEach(item => {
            const dayIndex = days.indexOf(item.day_of_week);
            if (dayIndex !== -1) {
              // Distribute the engagement count across likes, comments, shares
              // This is just approximate since we don't have detailed breakdown
              dailyEngagement[dayIndex].likes += Math.floor(item.engagement_count * 0.6);
              dailyEngagement[dayIndex].comments += Math.floor(item.engagement_count * 0.2);
              dailyEngagement[dayIndex].shares += Math.floor(item.engagement_count * 0.2);
            }
          });
          
          setEngagementData(dailyEngagement);
        } else {
          // Use sample data if no real data
          const sampleEngagementData = [
            { name: "Mon", likes: 140, comments: 24, shares: 18 },
            { name: "Tue", likes: 120, comments: 18, shares: 22 },
            { name: "Wed", likes: 180, comments: 36, shares: 31 },
            { name: "Thu", likes: 250, comments: 40, shares: 43 },
            { name: "Fri", likes: 190, comments: 28, shares: 34 },
            { name: "Sat", likes: 230, comments: 32, shares: 39 },
            { name: "Sun", likes: 210, comments: 26, shares: 37 },
          ];
          setEngagementData(sampleEngagementData);
        }
      } catch (err) {
        console.error('Error fetching posts with analytics:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
        // Use sample data in case of error
        setPosts(samplePosts);
        setUsingSampleData(true);
        
        // Set sample chart data
        setPlatformData([
          { name: "Jan", instagram: 400, twitter: 240 },
          { name: "Feb", instagram: 300, twitter: 139 },
          { name: "Mar", instagram: 200, twitter: 980 },
          { name: "Apr", instagram: 278, twitter: 390 },
          { name: "May", instagram: 189, twitter: 480 },
          { name: "Jun", instagram: 239, twitter: 380 },
          { name: "Jul", instagram: 349, twitter: 430 },
        ]);
        
        setEngagementData([
          { name: "Mon", likes: 140, comments: 24, shares: 18 },
          { name: "Tue", likes: 120, comments: 18, shares: 22 },
          { name: "Wed", likes: 180, comments: 36, shares: 31 },
          { name: "Thu", likes: 250, comments: 40, shares: 43 },
          { name: "Fri", likes: 190, comments: 28, shares: 34 },
          { name: "Sat", likes: 230, comments: 32, shares: 39 },
          { name: "Sun", likes: 210, comments: 26, shares: 37 },
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPostsWithAnalytics();
    
    // Set up realtime subscription for metrics updates
    const channel = supabase
      .channel('public:content_metrics')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'content_metrics' 
      }, (payload) => {
        // Handle metrics update
        console.log('Metrics updated:', payload);
        // Refresh the data
        fetchPostsWithAnalytics();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  return { 
    posts, 
    loading, 
    error, 
    usingSampleData, 
    platformData, 
    engagementData 
  };
};
