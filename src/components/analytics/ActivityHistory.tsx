
import React from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Heart, MessageCircle, Share2, UserPlus, Activity } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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

interface ActivityHistoryProps {
  activities: ActivityItem[];
}

const ActivityHistory: React.FC<ActivityHistoryProps> = ({ activities }) => {
  // Format date relative to now (e.g., "2 hours ago")
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    }
  };

  // Get icon for activity type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'new_like':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'new_comment':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'new_share':
        return <Share2 className="h-4 w-4 text-green-500" />;
      case 'new_follower':
        return <UserPlus className="h-4 w-4 text-violet-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Get color for platform badge
  const getPlatformColor = (platform: 'instagram' | 'twitter') => {
    return platform === 'instagram' 
      ? 'bg-pink-100 text-pink-800' 
      : 'bg-blue-100 text-blue-800';
  };

  // Get text description for activity
  const getActivityText = (activity: ActivityItem) => {
    const platform = activity.platform.charAt(0).toUpperCase() + activity.platform.slice(1);
    
    switch (activity.activityType) {
      case 'new_like':
        return `Received ${activity.activityDetail.count || 'some'} new likes on your ${platform} post`;
      case 'new_comment':
        return `New comment on your ${platform} post: "${activity.activityDetail.comment || 'Great content!'}"`;
      case 'new_share':
        return `Your ${platform} post was shared by ${activity.activityDetail.user || 'someone'}`;
      case 'new_follower':
        return `${activity.activityDetail.user || 'Someone'} followed you on ${platform}`;
      default:
        return `New activity on your ${platform} account`;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map(activity => (
            <div key={activity.id} className="flex space-x-3">
              <div className="mt-0.5">
                {getActivityIcon(activity.activityType)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{getActivityText(activity)}</p>
                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${getPlatformColor(activity.platform)}`}>
                    {activity.platform}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{formatRelativeTime(activity.occurredAt)}</p>
                
                {activity.contentPreview && (
                  <div className="mt-2 flex items-start space-x-2 p-2 bg-muted/40 rounded-md">
                    {activity.contentImage && (
                      <img 
                        src={activity.contentImage} 
                        alt="Content" 
                        className="w-8 h-8 object-cover rounded"
                      />
                    )}
                    <p className="text-xs line-clamp-1">{activity.contentPreview}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityHistory;
