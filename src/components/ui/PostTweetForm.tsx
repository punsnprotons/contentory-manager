
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Image } from 'lucide-react';
import { toast } from 'sonner';
import { getTwitterApiService } from '@/services/twitterApiService';
import { getCurrentSession } from '@/integrations/supabase/client';

interface PostTweetFormProps {
  onSuccess?: () => void;
  className?: string;
}

const PostTweetForm: React.FC<PostTweetFormProps> = ({ onSuccess, className }) => {
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  
  // Track the character count (Twitter has a 280 character limit)
  const charCount = content.length;
  const maxChars = 280;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error('Please enter some content for your tweet');
      return;
    }
    
    if (charCount > maxChars) {
      toast.error(`Tweet is too long. Please reduce to ${maxChars} characters.`);
      return;
    }
    
    setIsPosting(true);
    
    try {
      // Get the Twitter API service
      const session = await getCurrentSession();
      const twitterService = await getTwitterApiService(session);
      
      if (!twitterService) {
        throw new Error('Failed to initialize Twitter service');
      }
      
      // Post the tweet
      const result = await twitterService.postTweet(content);
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      toast.success('Tweet posted successfully!');
      setContent('');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error posting tweet:', error);
      toast.error(`Failed to post tweet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPosting(false);
    }
  };
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Post a Tweet</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <Textarea
            placeholder="What's happening?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="resize-none min-h-[100px]"
          />
          <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
            <div>{charCount}/{maxChars}</div>
            {charCount > maxChars && (
              <div className="text-destructive font-medium">
                {charCount - maxChars} characters over limit
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            disabled={isPosting}
          >
            <Image className="h-4 w-4 mr-2" />
            Add Image
          </Button>
          <Button 
            type="submit" 
            size="sm"
            disabled={isPosting || !content.trim() || charCount > maxChars}
          >
            {isPosting ? 'Posting...' : 'Post Tweet'}
            <Send className="h-4 w-4 ml-2" />
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default PostTweetForm;
