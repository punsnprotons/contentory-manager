
export type SocialPlatform = 'instagram' | 'twitter';

export type ContentType = 'text' | 'image' | 'video';

export type ContentIntent = 'promotional' | 'feature' | 'news' | 'poll';

export type ContentStatus = 'draft' | 'scheduled' | 'published';

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  username: string;
  profileImage: string;
  connected: boolean;
}

export interface Metric {
  id: string;
  label: string;
  value: number;
  change: number;
  platform: SocialPlatform;
  icon?: string;
}

export interface Content {
  id: string;
  type: ContentType;
  intent: ContentIntent;
  platform: SocialPlatform;
  content: string;
  mediaUrl?: string;
  status: ContentStatus;
  createdAt: Date;
  scheduledFor?: Date;
  publishedAt?: Date;
  metrics?: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  createdAt: Date;
  read: boolean;
  relatedContentId?: string;
}
