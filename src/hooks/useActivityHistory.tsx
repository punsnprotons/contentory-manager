
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Content } from '@/types';

interface ActivityItem {
  id: string;
  contentId?: string;
  platform: 'instagram' | 'twitter';
  activityType: string;
  activityDetail: any;
  occurredAt: Date;
  contentPreview?: string;
  contentImage?: string;
}

export const useActivityHistory = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [contentMap, setContentMap] = useState<Record<string, Content>>({});

  useEffect(() => {
    const fetchActivityHistory = async () => {
      try {
        setLoading(true);
        
        // Fetch activity history
        const { data: activityData, error: activityError } = await supabase
          .from('activity_history')
          .select('*')
          .order('occurred_at', { ascending: false })
          .limit(20);
        
        if (activityError) throw activityError;
        
        // Get content IDs from activities
        const contentIds = activityData
          .filter(activity => activity.content_id)
          .map(activity => activity.content_id);
        
        // If there are content IDs, fetch the related content
        let contentItems: Record<string, Content> = {};
        
        if (contentIds.length > 0) {
          const { data: contentData, error: contentError } = await supabase
            .from('content')
            .select('*')
            .in('id', contentIds);
          
          if (contentError) throw contentError;
          
          // Create a map of content items by ID
          contentItems = contentData.reduce((acc, item) => {
            acc[item.id] = {
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
            };
            return acc;
          }, {} as Record<string, Content>);
        }
        
        setContentMap(contentItems);
        
        // Transform activity data
        const transformedActivities: ActivityItem[] = activityData.map(activity => {
          const relatedContent = activity.content_id ? contentItems[activity.content_id] : undefined;
          
          return {
            id: activity.id,
            contentId: activity.content_id,
            platform: activity.platform,
            activityType: activity.activity_type,
            activityDetail: activity.activity_detail,
            occurredAt: new Date(activity.occurred_at),
            contentPreview: relatedContent?.content,
            contentImage: relatedContent?.mediaUrl,
          };
        });
        
        setActivities(transformedActivities);
      } catch (err) {
        console.error('Error fetching activity history:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchActivityHistory();
    
    // Set up realtime subscription for new activities
    const channel = supabase
      .channel('public:activity_history')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'activity_history' 
      }, (payload) => {
        // Handle new activity
        console.log('New activity:', payload);
        // You could refresh the data or append the new activity
        fetchActivityHistory();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  return { activities, loading, error, contentMap };
};
