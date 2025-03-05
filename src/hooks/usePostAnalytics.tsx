
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Content } from '@/types';

export const usePostAnalytics = () => {
  const [posts, setPosts] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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
        
        // Fetch metrics for these posts
        const postIds = postsData.map(post => post.id);
        
        const { data: metricsData, error: metricsError } = await supabase
          .from('content_metrics')
          .select('*')
          .in('content_id', postIds);
        
        if (metricsError) throw metricsError;
        
        // Create a map of metrics by content ID
        const metricsMap = metricsData.reduce((acc, metric) => {
          acc[metric.content_id] = {
            likes: metric.likes,
            comments: metric.comments,
            shares: metric.shares,
            views: metric.views
          };
          return acc;
        }, {} as Record<string, { likes: number, comments: number, shares: number, views: number }>);
        
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
      } catch (err) {
        console.error('Error fetching posts with analytics:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
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
        // You could refresh the data or update the specific post's metrics
        fetchPostsWithAnalytics();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  return { posts, loading, error };
};
