import { useState } from 'react';
import { ContentType, ContentIntent, SocialPlatform } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface GenerateContentParams {
  contentType: ContentType;
  platform: SocialPlatform;
  intent: ContentIntent;
  prompt: string;
}

interface GeneratedContent {
  content: string;
  mediaUrl?: string;
}

interface SaveContentParams {
  content: string;
  mediaUrl?: string;
  contentType: ContentType;
  platform: SocialPlatform;
  intent: ContentIntent;
  status: 'draft' | 'scheduled' | 'published';
  scheduledFor?: Date;
}

export const useGenerateContent = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const OPENAI_API_KEY = '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';
  const REPLICATE_API_TOKEN = 'r8_TBWJFh8CEY4K1S6BzI2E1EzGRXogHDS3sZ5aC';

  const generateContent = async (params: GenerateContentParams): Promise<GeneratedContent> => {
    setIsGenerating(true);
    
    try {
      switch(params.contentType) {
        case 'text':
          return await generateTextContent(params);
        case 'image':
          return await generateImageContent(params);
        case 'video':
          return await generateVideoContent(params);
        default:
          throw new Error(`Unsupported content type: ${params.contentType}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const ensureUserExists = async (userId: string, email: string): Promise<void> => {
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', userId)
      .maybeSingle();
    
    if (fetchError) {
      console.error("Error checking for user:", fetchError);
      throw fetchError;
    }
    
    if (!existingUser) {
      console.log("User not found in users table, creating entry for:", userId);
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          auth_id: userId,
          email: email
        });
      
      if (insertError) {
        console.error("Error creating user:", insertError);
        throw insertError;
      }
    }
  };

  const saveContent = async (params: SaveContentParams): Promise<string> => {
    setIsSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to save content");
      }
      
      console.log("Saving content with user ID:", user.id);
      
      await ensureUserExists(user.id, user.email || '');
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();
      
      if (userError) {
        console.error("Error fetching user ID:", userError);
        throw userError;
      }
      
      const { data, error } = await supabase
        .from('content')
        .insert({
          content: params.content,
          media_url: params.mediaUrl,
          type: params.contentType,
          platform: params.platform,
          intent: params.intent,
          status: params.status,
          scheduled_for: params.scheduledFor ? params.scheduledFor.toISOString() : null,
          published_at: params.status === 'published' ? new Date().toISOString() : null,
          user_id: userData.id
        })
        .select()
        .single();
      
      if (error) {
        console.error("Database error:", error);
        throw error;
      }
      
      return data.id;
    } finally {
      setIsSaving(false);
    }
  };

  const publishContent = async (contentId: string): Promise<void> => {
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('content')
        .update({
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', contentId);
      
      if (error) {
        console.error("Database error when publishing:", error);
        throw error;
      }
    } finally {
      setIsSaving(false);
    }
  };

  const scheduleContent = async (contentId: string, scheduledDate: Date): Promise<void> => {
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('content')
        .update({
          status: 'scheduled',
          scheduled_for: scheduledDate.toISOString()
        })
        .eq('id', contentId);
      
      if (error) {
        console.error("Database error when scheduling:", error);
        throw error;
      }
    } finally {
      setIsSaving(false);
    }
  };

  const generateTextContent = async (params: GenerateContentParams): Promise<GeneratedContent> => {
    try {
      const systemPrompt = `You are crafting high-impact social media content for Wubble, the fastest and most advanced AI-powered royalty-free music creation platform for businesses and creators. Wubble helps users generate custom, high-quality music in under 15 seconds using a multimodal chat interface that accepts text, audio, video, and images—perfect for ads, films, gaming, social media, podcasts, and more.

🎯 Your Goal:
Create engaging, visually compelling, and concise content tailored for ${params.platform === 'instagram' ? 'Instagram' : 'Twitter (X)'} that highlights Wubble's:
🎵 Instant AI music generation – Unique, royalty-free music in seconds
🛠 Customizable tracks – AI-powered chatbot helps refine music effortlessly
📹 Sync with any content type – Ads, videos, social posts, podcasts, and beyond
🌍 Global reach – Supports 40+ languages and 60+ music genres
🎶 Vast AI-generated song library – Fully editable via chat

🏆 Trusted by Industry Giants:
Wubble is used by Disney, Starbucks, HP, NBC Universal, and more. We are backed by Google, Antler, and NVIDIA, ensuring cutting-edge AI technology and innovation.

✨ Content Style & Tone:
${params.platform === 'instagram' ? 'Instagram: Engaging, visually dynamic, trend-driven, and interactive (Reels, carousels, bold captions).' : 'Twitter (X): Short, punchy, and conversational with strong CTAs, threads, and multimedia elements.'}
Overall Tone: Modern, energetic, innovative, and tailored for creators, marketers, and brands.

Content Intent: ${params.intent}
`;

      const userPrompt = `Create a ${params.platform} post about Wubble with focus on ${params.intent} content. Use this information: ${params.prompt}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return {
        content: data.choices[0].message.content
      };
    } catch (error) {
      console.error('Error generating text content:', error);
      throw new Error('Failed to generate text content. Please try again.');
    }
  };

  const generateImageContent = async (params: GenerateContentParams): Promise<GeneratedContent> => {
    try {
      const imagePrompt = `Create a visual for a ${params.platform} post about Wubble (an AI-powered music creation platform) that focuses on ${params.intent}. ${params.prompt}`;

      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: imagePrompt,
          n: 1,
          size: '1024x1024'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`DALL-E API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      const captionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { 
              role: 'system', 
              content: `You are crafting high-impact social media captions for ${params.platform} for Wubble, the AI-powered music creation platform. The content intent is ${params.intent}.` 
            },
            { 
              role: 'user', 
              content: `Write a caption for an image about: ${params.prompt}` 
            }
          ],
          max_tokens: 300
        })
      });

      if (!captionResponse.ok) {
        throw new Error('Failed to generate caption for image');
      }

      const captionData = await captionResponse.json();
      
      return {
        content: captionData.choices[0].message.content,
        mediaUrl: data.data[0].url
      };
    } catch (error) {
      console.error('Error generating image content:', error);
      throw new Error('Failed to generate image content. Please try again.');
    }
  };

  const generateVideoContent = async (params: GenerateContentParams): Promise<GeneratedContent> => {
    try {
      const descriptionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { 
              role: 'system', 
              content: `You are crafting high-impact social media captions for ${params.platform} for Wubble, the AI-powered music creation platform. The content intent is ${params.intent}.` 
            },
            { 
              role: 'user', 
              content: `Write a caption for a video about: ${params.prompt}` 
            }
          ],
          max_tokens: 300
        })
      });

      if (!descriptionResponse.ok) {
        throw new Error('Failed to generate caption for video');
      }

      const descriptionData = await descriptionResponse.json();
      const description = descriptionData.choices[0].message.content;
      
      let videoUrl = "";
      
      switch(params.intent) {
        case 'promotional':
          videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-small-waves-rushing-to-the-shore-2310-large.mp4";
          break;
        case 'feature':
          videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-smart-watch-from-different-views-32808-large.mp4";
          break;
        case 'news':
          videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-typing-on-smartphone-screen-4335-large.mp4";
          break;
        case 'poll':
          videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-woman-doing-yoga-in-a-forest-4897-large.mp4";
          break;
        default:
          videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-musician-playing-the-guitar-with-a-band-3386-large.mp4";
      }
      
      return {
        content: description,
        mediaUrl: videoUrl
      };
    } catch (error) {
      console.error('Error generating video content:', error);
      throw new Error('Failed to generate video content. Please try again.');
    }
  };

  return {
    generateContent,
    saveContent,
    publishContent,
    scheduleContent,
    isGenerating,
    isSaving
  };
};
