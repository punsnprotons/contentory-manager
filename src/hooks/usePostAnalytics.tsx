
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
    intent: "poll",
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
  const [audienceDemographics, setAudienceDemographics] = useState({
    ageGroups: [
      { group: '18-24', percentage: 35 },
      { group: '25-34', percentage: 42 },
      { group: '35-44', percentage: 15 },
      { group: '45+', percentage: 8 }
    ],
    gender: [
      { type: 'Female', percentage: 58 },
      { type: 'Male', percentage: 39 },
      { type: 'Other', percentage: 3 }
    ]
  });
  const [topPerformingContent, setTopPerformingContent] = useState<Content[]>([]);
  const [followerMetrics, setFollowerMetrics] = useState({
    instagram: { count: 10800, change: "+12.3%" },
    twitter: { count: 8400, change: "+8.7%" }
  });
  const [engagementRate, setEngagementRate] = useState({
    value: "4.6%",
    change: "+2.1%",
    trend: "up" as "up" | "down"
  });
  const [postsThisMonth, setPostsThisMonth] = useState(0);
  const [avgReach, setAvgReach] = useState(0);
  const [platformDistribution, setPlatformDistribution] = useState({
    instagram: 65,
    twitter: 35
  });

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
        
        // Calculate posts this month regardless of data source
        const currentMonth = new Date().getMonth();
        let publishedPostsThisMonth = 0;
        
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
          
          // Sample data for posts this month
          publishedPostsThisMonth = samplePosts.filter(post => 
            post.publishedAt && post.publishedAt.getMonth() === currentMonth
          ).length;
          
          setPostsThisMonth(publishedPostsThisMonth);
          
          // Sample data for average reach
          const sampleTotalReach = samplePosts.reduce((sum, post) => sum + (post.metrics?.views || 0), 0);
          setAvgReach(samplePosts.length > 0 ? Math.floor(sampleTotalReach / samplePosts.length) : 0);
          
          setTopPerformingContent(samplePosts);
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
        
        // Calculate posts this month from real data
        publishedPostsThisMonth = transformedPosts.filter(post => 
          post.publishedAt && post.publishedAt.getMonth() === currentMonth
        ).length;
        
        setPostsThisMonth(publishedPostsThisMonth);
        
        // Calculate average reach from real data
        const totalReach = transformedPosts.reduce((sum, post) => sum + (post.metrics?.views || 0), 0);
        setAvgReach(transformedPosts.length > 0 ? Math.floor(totalReach / transformedPosts.length) : 0);
        
        // Sort posts by engagement for top performing content
        const sortedPosts = [...transformedPosts].sort((a, b) => {
          const aEngagement = (a.metrics?.likes || 0) + (a.metrics?.comments || 0) + (a.metrics?.shares || 0);
          const bEngagement = (b.metrics?.likes || 0) + (b.metrics?.comments || 0) + (b.metrics?.shares || 0);
          return bEngagement - aEngagement;
        });
        
        setTopPerformingContent(sortedPosts.slice(0, 3));
        
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

          // Calculate platform distribution based on real engagement data
          const instagramTotal = performanceData
            .filter(item => item.platform === 'instagram')
            .reduce((sum, item) => sum + item.total_likes + item.total_comments + item.total_shares, 0);
          
          const twitterTotal = performanceData
            .filter(item => item.platform === 'twitter')
            .reduce((sum, item) => sum + item.total_likes + item.total_comments + item.total_shares, 0);
          
          const total = instagramTotal + twitterTotal;
          
          if (total > 0) {
            const instagramPercentage = Math.round((instagramTotal / total) * 100);
            setPlatformDistribution({
              instagram: instagramPercentage,
              twitter: 100 - instagramPercentage
            });
          }
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
          const totalEngagement = engagementMetricsData.reduce((sum, item) => sum + parseFloat(item.engagement_rate.toString()), 0);
          const avgEngagement = totalEngagement / engagementMetricsData.length;
          
          // Calculate change if there are enough data points
          if (engagementMetricsData.length >= 2) {
            const recentAvg = engagementMetricsData.slice(0, 5).reduce((sum, item) => sum + parseFloat(item.engagement_rate.toString()), 0) / 5;
            const olderAvg = engagementMetricsData.slice(5, 10).reduce((sum, item) => sum + parseFloat(item.engagement_rate.toString()), 0) / 5;
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
        
        // Fetch audience demographics data
        // This would typically come from a dedicated table, but since we don't have one,
        // we'll simulate it or use stored demographics if there is such a table
        // For now, we'll keep the default values set in state
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
        
        // Sample data for top performing content
        setTopPerformingContent(samplePosts);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPostsWithAnalytics();
    
    // Set up realtime subscription for metrics updates
    const metricsChannel = supabase
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
      
    // Set up subscriptions for other tables
    const followersChannel = supabase
      .channel('public:follower_metrics')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'follower_metrics' 
      }, () => {
        fetchPostsWithAnalytics();
      })
      .subscribe();
      
    const performanceChannel = supabase
      .channel('public:performance_metrics')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'performance_metrics' 
      }, () => {
        fetchPostsWithAnalytics();
      })
      .subscribe();
      
    const dailyEngagementChannel = supabase
      .channel('public:daily_engagement')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'daily_engagement' 
      }, () => {
        fetchPostsWithAnalytics();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(metricsChannel);
      supabase.removeChannel(followersChannel);
      supabase.removeChannel(performanceChannel);
      supabase.removeChannel(dailyEngagementChannel);
    };
  }, []);
  
  return { 
    posts, 
    loading, 
    error, 
    usingSampleData, 
    platformData, 
    engagementData,
    audienceDemographics,
    topPerformingContent,
    followerMetrics,
    engagementRate,
    postsThisMonth,
    avgReach,
    platformDistribution
  };
};
