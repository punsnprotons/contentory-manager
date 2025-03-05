
import { useState } from 'react';
import { ContentType, ContentIntent, SocialPlatform } from '@/types';

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

export const useGenerateContent = () => {
  const [isGenerating, setIsGenerating] = useState(false);

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
      // Generate prompt for DALL-E
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
      
      // Also generate a caption for the image
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
      // First generate a text description using GPT
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
      
      // Simulate Replicate API call (in a real app, you would call the actual API)
      // Using a timeout to simulate the API call
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // For demo purposes, return a placeholder video URL
      // In a real implementation, you would call the Replicate API and get the actual URL
      const videoUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
      
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
    isGenerating
  };
};
