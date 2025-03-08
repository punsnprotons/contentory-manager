
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Twitter, Instagram, Loader2 } from "lucide-react";
import { toast } from "sonner"; // Update import to use sonner directly
import InstagramConnectionStatus from '@/components/instagram/InstagramConnectionStatus';
import { publishToInstagram, checkInstagramConnection } from '@/services/instagramApiService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PostTweetForm = ({ 
  onSubmit 
}: { 
  onSubmit: (content: string) => void 
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = content.length > 0 && content.length <= 280;

  // Add state for Instagram connection
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [checkingInstagram, setCheckingInstagram] = useState(true);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  
  // Check Instagram connection on mount
  useEffect(() => {
    const checkInsta = async () => {
      try {
        const connected = await checkInstagramConnection();
        setInstagramConnected(connected);
      } catch (error) {
        console.error('Error checking Instagram connection:', error);
      } finally {
        setCheckingInstagram(false);
      }
    };
    
    checkInsta();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    onSubmit(content);
    setContent('');
    setIsSubmitting(false);
  };

  const handleCheckCharCount = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  // Add Instagram publishing functionality
  const handleInstagramSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verify Instagram connection first
    const connected = await checkInstagramConnection();
    
    if (!connected) {
      setShowConnectDialog(true);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await publishToInstagram(content);
      
      if (result.success) {
        toast(result.message || 'Successfully published to Instagram!', {
          description: "Your content has been posted to Instagram",
          duration: 3000
        });
        setContent('');
      } else {
        toast(result.error || 'Failed to publish to Instagram', {
          description: "There was an error posting to Instagram",
          duration: 5000
        });
        
        // If connection issue, show connection dialog
        if (result.error?.includes('not connected')) {
          setShowConnectDialog(true);
        }
      }
    } catch (error) {
      console.error('Error publishing to Instagram:', error);
      toast('Failed to publish to Instagram', {
        description: "An unexpected error occurred",
        duration: 5000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInstagramConnected = () => {
    setInstagramConnected(true);
    setShowConnectDialog(false);
  };
  
  return (
    <div className="border rounded-lg p-4 shadow-sm">
      <div className="mb-4">
        <Label htmlFor="tweet">What's on your mind?</Label>
        <Textarea
          id="tweet"
          placeholder="Type your tweet here..."
          value={content}
          onChange={handleCheckCharCount}
          rows={4}
          className="resize-none mt-2"
        />
      </div>
      
      <div className="mt-4 flex flex-wrap gap-2 justify-between items-center">
        <div className="flex items-center text-sm text-gray-500">
          {content.length}/280
          {content.length > 280 && (
            <span className="text-red-500 ml-1"> - Character limit exceeded</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={isSubmitting || !canSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Twitter className="mr-2 h-4 w-4" />
                Post to Twitter
              </>
            )}
          </Button>
          
          {/* Add Instagram button */}
          <Button 
            type="button"
            variant="outline"
            onClick={handleInstagramSubmit}
            disabled={isSubmitting || !content || checkingInstagram}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Instagram className="mr-2 h-4 w-4" />
                Post to Instagram
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Instagram Connect Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect to Instagram</DialogTitle>
            <DialogDescription>
              You need to connect your Instagram account before posting.
            </DialogDescription>
          </DialogHeader>
          <InstagramConnectionStatus onConnected={handleInstagramConnected} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostTweetForm;
