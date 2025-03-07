
-- Create platform_connections table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.platform_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  connected BOOLEAN DEFAULT FALSE,
  username TEXT,
  last_verified TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Create social_posts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  content TEXT NOT NULL,
  external_id TEXT,
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on platform_connections
ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;

-- Enable RLS on social_posts
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- Create policies for platform_connections
CREATE POLICY "Users can view their own platform connections"
  ON public.platform_connections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own platform connections"
  ON public.platform_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own platform connections"
  ON public.platform_connections
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policies for social_posts
CREATE POLICY "Users can view their own social posts"
  ON public.social_posts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own social posts"
  ON public.social_posts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social posts"
  ON public.social_posts
  FOR UPDATE
  USING (auth.uid() = user_id);
