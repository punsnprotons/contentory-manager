import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Content } from '@/types';
import { useAuth } from '@/hooks/useAuth';

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
    instagram: { count: 0, change: "0.0%" },
    twitter: { count: 0, change: "0.0%" }
  });
  const [engagementRate, setEngagementRate] = useState({
    value: "0.0%",
    change: "0.0%",
    trend: "up" as "up" | "down"
  });
  const [postsThisMonth, setPostsThisMonth] = useState(0);
  const [avgReach, setAvgReach] = useState(0);
  const [platformDistribution, setPlatformDistribution] = useState({
    instagram: 50,
    twitter: 50
  });

  const { user } = useAuth();

  const getPreviousPeriodDateRange = (currentStart: Date, currentEnd: Date) => {
    const diffDays = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24));
    const prevEnd = new Date(currentStart);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - diffDays);
    return { prevStart, prevEnd };
  };

  const fetchPostsWithAnalytics = useCallback(async () => {
    if (!user) {
      console.log("No user logged in, skipping analytics fetch");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get the user's DB ID first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();
      
      if (userError) {
        console.error("Error fetching user data:", userError);
        throw userError;
      }
      
      if (!userData) {
        console.log("No user data found");
        setLoading(false);
        return;
      }

      // Fetch published posts
      const { data: postsData, error: postsError } = await supabase
        .from('content')
        .select('*')
        .eq('status', 'published')
        .eq('user_id', userData.id)
        .order('published_at', { ascending: false });
      
      if (postsError) throw postsError;
      
      // Calculate posts this month regardless of data source
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      // If no posts found, initialize with empty arrays and defaults
      if (!postsData || postsData.length === 0) {
        console.log("No published posts found, using empty data");
        setPosts([]);
        setUsingSampleData(false);
        
        // Generate empty platform data for charts
        const emptyPlatformData = [
          { name: "Jan", instagram: 0, twitter: 0 },
          { name: "Feb", instagram: 0, twitter: 0 },
          { name: "Mar", instagram: 0, twitter: 0 },
          { name: "Apr", instagram: 0, twitter: 0 },
          { name: "May", instagram: 0, twitter: 0 },
          { name: "Jun", instagram: 0, twitter: 0 },
          { name: "Jul", instagram: 0, twitter: 0 },
        ];
        
        // Generate empty engagement data for charts
        const emptyEngagementData = [
          { name: "Mon", likes: 0, comments: 0, shares: 0 },
          { name: "Tue", likes: 0, comments: 0, shares: 0 },
          { name: "Wed", likes: 0, comments: 0, shares: 0 },
          { name: "Thu", likes: 0, comments: 0, shares: 0 },
          { name: "Fri", likes: 0, comments: 0, shares: 0 },
          { name: "Sat", likes: 0, comments: 0, shares: 0 },
          { name: "Sun", likes: 0, comments: 0, shares: 0 },
        ];
        
        setPlatformData(emptyPlatformData);
        setEngagementData(emptyEngagementData);
        
        // Empty data for posts this month
        setPostsThisMonth(0);
        
        // Empty data for average reach
        setAvgReach(0);
        
        // Empty top performing content
        setTopPerformingContent([]);
        
        // Set default platform distribution
        setPlatformDistribution({
          instagram: 50,
          twitter: 50
        });
        
        // Fetch platform statistics data even if there are no posts
        await fetchAndSetPlatformStatistics(userData.id);
        
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
          likes: metric.likes || 0,
          comments: metric.comments || 0,
          shares: metric.shares || 0,
          views: metric.views || 0
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
      
      // Calculate posts this month from real data - count per platform
      const publishedPostsThisMonth = transformedPosts.filter(post => 
        post.publishedAt && 
        post.publishedAt.getMonth() === currentMonth &&
        post.publishedAt.getFullYear() === currentYear
      ).length;
      
      // Update total posts this month
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
      
      // Make sure we have stable top performing content that doesn't change on rerenders
      setTopPerformingContent(sortedPosts.slice(0, 3));
      
      // Fetch platform metrics data for charting
      const { data: performanceData, error: performanceError } = await supabase
        .from('performance_metrics')
        .select('*')
        .eq('user_id', userData.id)
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
        // Use empty data if no real data
        const emptyPlatformData = [
          { name: "Jan", instagram: 0, twitter: 0 },
          { name: "Feb", instagram: 0, twitter: 0 },
          { name: "Mar", instagram: 0, twitter: 0 },
          { name: "Apr", instagram: 0, twitter: 0 },
          { name: "May", instagram: 0, twitter: 0 },
          { name: "Jun", instagram: 0, twitter: 0 },
          { name: "Jul", instagram: 0, twitter: 0 },
        ];
        setPlatformData(emptyPlatformData);
      }
      
      // Fetch daily engagement data
      const { data: dailyData, error: dailyError } = await supabase
        .from('daily_engagement')
        .select('*')
        .eq('user_id', userData.id)
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
        // Use empty data if no real data
        const emptyEngagementData = [
          { name: "Mon", likes: 0, comments: 0, shares: 0 },
          { name: "Tue", likes: 0, comments: 0, shares: 0 },
          { name: "Wed", likes: 0, comments: 0, shares: 0 },
          { name: "Thu", likes: 0, comments: 0, shares: 0 },
          { name: "Fri", likes: 0, comments: 0, shares: 0 },
          { name: "Sat", likes: 0, comments: 0, shares: 0 },
          { name: "Sun", likes: 0, comments: 0, shares: 0 },
        ];
        setEngagementData(emptyEngagementData);
      }
      
      // Fetch platform statistics even when we have posts
      await fetchAndSetPlatformStatistics(userData.id);
      
      // Calculate platform distribution based on post counts rather than relying on engagement
      const instagramPosts = transformedPosts.filter(post => post.platform === 'instagram').length;
      const twitterPosts = transformedPosts.filter(post => post.platform === 'twitter').length;
      const totalPosts = instagramPosts + twitterPosts;
      
      if (totalPosts > 0) {
        const instagramPercentage = Math.round((instagramPosts / totalPosts) * 100);
        setPlatformDistribution({
          instagram: instagramPercentage,
          twitter: 100 - instagramPercentage
        });
      } else {
        setPlatformDistribution({
          instagram: 50,
          twitter: 50
        });
      }
      
      // Directly query content metrics table to get total likes, comments, shares, and views
      const { data: aggregateMetrics, error: aggregateError } = await supabase
        .from('content_metrics')
        .select('likes, comments, shares, views')
        .in('content_id', transformedPosts.map(post => post.id));
        
      if (aggregateError) {
        console.error("Error fetching aggregate metrics:", aggregateError);
      } else if (aggregateMetrics && aggregateMetrics.length > 0) {
        // Calculate total engagement metrics from actual metrics data
        const totalLikes = aggregateMetrics.reduce((total, metric) => total + (metric.likes || 0), 0);
        const totalComments = aggregateMetrics.reduce((total, metric) => total + (metric.comments || 0), 0);
        const totalShares = aggregateMetrics.reduce((total, metric) => total + (metric.shares || 0), 0);
        const totalViews = aggregateMetrics.reduce((total, metric) => total + (metric.views || 0), 0);
        
        console.log(`Total engagement metrics: Likes: ${totalLikes}, Comments: ${totalComments}, Shares: ${totalShares}, Views: ${totalViews}`);
      }
      
    } catch (err) {
      console.error('Error fetching posts with analytics:', err);
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      
      // Use empty data in case of error
      setPosts([]);
      setUsingSampleData(false);
      
      // Set empty chart data
      setPlatformData([
        { name: "Jan", instagram: 0, twitter: 0 },
        { name: "Feb", instagram: 0, twitter: 0 },
        { name: "Mar", instagram: 0, twitter: 0 },
        { name: "Apr", instagram: 0, twitter: 0 },
        { name: "May", instagram: 0, twitter: 0 },
        { name: "Jun", instagram: 0, twitter: 0 },
        { name: "Jul", instagram: 0, twitter: 0 },
      ]);
      
      setEngagementData([
        { name: "Mon", likes: 0, comments: 0, shares: 0 },
        { name: "Tue", likes: 0, comments: 0, shares: 0 },
        { name: "Wed", likes: 0, comments: 0, shares: 0 },
        { name: "Thu", likes: 0, comments: 0, shares: 0 },
        { name: "Fri", likes: 0, comments: 0, shares: 0 },
        { name: "Sat", likes: 0, comments: 0, shares: 0 },
        { name: "Sun", likes: 0, comments: 0, shares: 0 },
      ]);
      
      // Empty data for top performing content
      setTopPerformingContent([]);
    } finally {
      setLoading(false);
    }
  }, [user]);
    
  const fetchAndSetPlatformStatistics = async (userId: string) => {
    try {
      // Get current month date range
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      // Get previous month date range
      const { prevStart, prevEnd } = getPreviousPeriodDateRange(firstDay, lastDay);
      
      // Fetch current month statistics
      const { data: currentStats, error: currentStatsError } = await supabase
        .from('platform_statistics')
        .select('*')
        .eq('user_id', userId)
        .gte('period_start', firstDay.toISOString().split('T')[0])
        .lte('period_end', lastDay.toISOString().split('T')[0])
        .order('created_at', { ascending: false });
      
      if (currentStatsError) {
        console.error("Error fetching current platform statistics:", currentStatsError);
        throw currentStatsError;
      }
      
      // Fetch previous month statistics
      const { data: prevStats, error: prevStatsError } = await supabase
        .from('platform_statistics')
        .select('*')
        .eq('user_id', userId)
        .gte('period_start', prevStart.toISOString().split('T')[0])
        .lte('period_end', prevEnd.toISOString().split('T')[0])
        .order('created_at', { ascending: false });
      
      if (prevStatsError) {
        console.error("Error fetching previous platform statistics:", prevStatsError);
        throw prevStatsError;
      }
      
      console.log("Current platform statistics:", currentStats);
      console.log("Previous platform statistics:", prevStats);
      
      // Process follower metrics
      const currentInstagramStats = currentStats?.find(stat => stat.platform === 'instagram');
      const prevInstagramStats = prevStats?.find(stat => stat.platform === 'instagram');
      const currentTwitterStats = currentStats?.find(stat => stat.platform === 'twitter');
      const prevTwitterStats = prevStats?.find(stat => stat.platform === 'twitter');
      
      // Calculate Instagram follower change
      const instagramFollowerCount = currentInstagramStats?.total_followers || 0;
      let instagramFollowerChange = "0.0%";
      if (prevInstagramStats && prevInstagramStats.total_followers > 0) {
        const changePercent = ((instagramFollowerCount - prevInstagramStats.total_followers) / prevInstagramStats.total_followers) * 100;
        instagramFollowerChange = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`;
      }
      
      // Calculate Twitter follower change
      const twitterFollowerCount = currentTwitterStats?.total_followers || 0;
      let twitterFollowerChange = "0.0%";
      if (prevTwitterStats && prevTwitterStats.total_followers > 0) {
        const changePercent = ((twitterFollowerCount - prevTwitterStats.total_followers) / prevTwitterStats.total_followers) * 100;
        twitterFollowerChange = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`;
      }
      
      // Update follower metrics state
      setFollowerMetrics({
        instagram: { 
          count: instagramFollowerCount, 
          change: instagramFollowerChange 
        },
        twitter: { 
          count: twitterFollowerCount, 
          change: twitterFollowerChange 
        }
      });
      
      // Calculate average engagement rate and its change
      const currentInstagramEngagement = currentInstagramStats?.engagement_rate || 0;
      const currentTwitterEngagement = currentTwitterStats?.engagement_rate || 0;
      const avgEngagementRate = (currentInstagramEngagement + currentTwitterEngagement) / 2;
      
      const prevInstagramEngagement = prevInstagramStats?.engagement_rate || 0;
      const prevTwitterEngagement = prevTwitterStats?.engagement_rate || 0;
      const prevAvgEngagementRate = (prevInstagramEngagement + prevTwitterEngagement) / 2;
      
      let engagementRateChange = "0.0%";
      let engagementRateTrend: "up" | "down" = "up";
      
      if (prevAvgEngagementRate > 0) {
        const changePercent = ((avgEngagementRate - prevAvgEngagementRate) / prevAvgEngagementRate) * 100;
        engagementRateChange = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`;
        engagementRateTrend = changePercent >= 0 ? "up" : "down";
      }
      
      // Update engagement rate state
      setEngagementRate({
        value: `${avgEngagementRate.toFixed(1)}%`,
        change: engagementRateChange,
        trend: engagementRateTrend
      });
      
      // For postsThisMonth, directly query the content table 
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      // Query for posts this month
      const { data: monthlyPosts, error: monthlyPostsError } = await supabase
        .from('content')
        .select('id, platform')
        .eq('user_id', userId)
        .eq('status', 'published')
        .gte('published_at', new Date(currentYear, currentMonth, 1).toISOString())
        .lte('published_at', new Date(currentYear, currentMonth + 1, 0).toISOString());
        
      if (monthlyPostsError) {
        console.error("Error fetching monthly posts:", monthlyPostsError);
      } else if (monthlyPosts) {
        // Calculate instagram vs twitter posts
        const instagramPostCount = monthlyPosts.filter(post => post.platform === 'instagram').length;
        const twitterPostCount = monthlyPosts.filter(post => post.platform === 'twitter').length;
        const totalPosts = monthlyPosts.length;
        
        console.log(`Monthly posts count: Instagram: ${instagramPostCount}, Twitter: ${twitterPostCount}, Total: ${totalPosts}`);
        
        setPostsThisMonth(totalPosts);
        
        // Update platform distribution based on post counts
        if (totalPosts > 0) {
          const instagramPercentage = Math.round((instagramPostCount / totalPosts) * 100);
          setPlatformDistribution({
            instagram: instagramPercentage,
            twitter: 100 - instagramPercentage
          });
        }
      }
      
      // Fetch metrics for all user's content to get aggregate stats
      const { data: allContentMetrics, error: allMetricsError } = await supabase
        .from('content_metrics')
        .select('content_id, likes, comments, shares, views')
        .eq('content_id', userId);
        
      if (allMetricsError) {
        console.error("Error fetching all content metrics:", allMetricsError);
      } else if (allContentMetrics && allContentMetrics.length > 0) {
        // Calculate total engagement metrics from actual metrics data
        const totalLikes = allContentMetrics.reduce((total, metric) => total + (metric.likes || 0), 0);
        const totalComments = allContentMetrics.reduce((total, metric) => total + (metric.comments || 0), 0);
        const totalShares = allContentMetrics.reduce((total, metric) => total + (metric.shares || 0), 0);
        const totalViews = allContentMetrics.reduce((total, metric) => total + (metric.views || 0), 0);
        
        console.log(`Aggregate metrics from DB: Likes: ${totalLikes}, Comments: ${totalComments}, Shares: ${totalShares}, Views: ${totalViews}`);
      }
      
    } catch (err) {
      console.error('Error fetching platform statistics:', err);
      // We don't need to reset all states here since this is supplementary data
      // The main fetch function will handle setting defaults
    }
  };

  // Add a function to refresh data that can be called from components
  const refreshData = useCallback(() => {
    fetchPostsWithAnalytics();
  }, [fetchPostsWithAnalytics]);
  
  useEffect(() => {
    fetchPostsWithAnalytics();
    
    // Set up realtime subscription for metrics updates
    const metricsChannel = supabase
      .channel('public:content_metrics')
      .on('postgres_changes', { 
        event: '*', 
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
    const contentChannel = supabase
      .channel('public:content')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'content' 
      }, () => {
        console.log('Content table changed, refreshing data');
        fetchPostsWithAnalytics();
      })
      .subscribe();
      
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
      
    const platformStatsChannel = supabase
      .channel('public:platform_statistics')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'platform_statistics' 
      }, () => {
        fetchPostsWithAnalytics();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(metricsChannel);
      supabase.removeChannel(contentChannel);
      supabase.removeChannel(followersChannel);
      supabase.removeChannel(performanceChannel);
      supabase.removeChannel(dailyEngagementChannel);
      supabase.removeChannel(platformStatsChannel);
    };
  }, [fetchPostsWithAnalytics]);
  
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
    platformDistribution,
    refreshData
  };
};
