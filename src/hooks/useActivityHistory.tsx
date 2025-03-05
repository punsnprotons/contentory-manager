
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

// Sample activity data to use when no real data is available
const sampleActivities: ActivityItem[] = [
  {
    id: "sample-activity-1",
    contentId: "sample-1",
    platform: "instagram",
    activityType: "new_like",
    activityDetail: { count: 5, user: "fashion_lover42" },
    occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
    contentPreview: "Our new summer collection has arrived! Check it out now. #fashion #summer #newcollection",
    contentImage: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1770&q=80"
  },
  {
    id: "sample-activity-2",
    contentId: "sample-2",
    platform: "twitter",
    activityType: "new_comment",
    activityDetail: { comment: "Looking forward to this collaboration!", user: "tech_enthusiast" },
    occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
    contentPreview: "We're thrilled to announce our new partnership with @brandname! Stay tuned for exciting collaborations."
  },
  {
    id: "sample-activity-3",
    platform: "instagram",
    activityType: "new_follower",
    activityDetail: { user: "style_maven", profile: "https://i.pravatar.cc/150?u=123" },
    occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
  },
  {
    id: "sample-activity-4",
    contentId: "sample-3",
    platform: "instagram",
    activityType: "new_share",
    activityDetail: { user: "product_reviewer" },
    occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 24 hours ago
    contentPreview: "What's your favorite product from our catalog? Let us know in the comments below!",
    contentImage: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1770&q=80"
  },
  {
    id: "sample-activity-5",
    platform: "twitter",
    activityType: "new_follower",
    activityDetail: { user: "social_media_guru", profile: "https://i.pravatar.cc/150?u=456" },
    occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 36), // 36 hours ago
  }
];

export const useActivityHistory = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [contentMap, setContentMap] = useState<Record<string, Content>>({});
  const [usingSampleData, setUsingSampleData] = useState(false);

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
        
        // If no activities found, use sample data
        if (!activityData || activityData.length === 0) {
          console.log("No activity history found, using sample data");
          setActivities(sampleActivities);
          setContentMap({});
          setUsingSampleData(true);
          setLoading(false);
          return;
        }
        
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
        setUsingSampleData(false);
      } catch (err) {
        console.error('Error fetching activity history:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
        // Use sample data in case of error
        setActivities(sampleActivities);
        setContentMap({});
        setUsingSampleData(true);
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
  
  return { activities, loading, error, contentMap, usingSampleData };
};
