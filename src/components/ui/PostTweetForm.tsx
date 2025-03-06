import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Loader2 } from 'lucide-react';
import { publishToTwitter } from '@/components/ui/RefreshDataButton';
import { TwitterApiService } from '@/services/twitterApiService';
import { useAuth } from '@/hooks/useAuth';

interface PostTweetFormProps {
  onSuccess?: () => void;
  className?: string;
}

const PostTweetForm: React.FC<PostTweetFormProps> = ({ onSuccess, className }) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { session } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error('Tweet content cannot be empty.');
      return;
    }

    setIsLoading(true);
    try {
      if (!session?.user) {
        toast.error('You must be logged in to post a tweet.');
        return;
      }

      const result = await publishToTwitter(content);

      if (result.success) {
        toast.success(result.message || 'Successfully posted to Twitter!');
        setContent('');
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(result.message || 'Failed to post to Twitter.');
      }
    } catch (error) {
      console.error('Error posting tweet:', error);
      toast.error('Failed to post to Twitter. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Post to Twitter</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Textarea
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                disabled={isLoading}
              />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="justify-between">
        <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Posting...
            </>
          ) : (
            <>
              Post <Send className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PostTweetForm;
