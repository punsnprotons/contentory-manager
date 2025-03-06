
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { triggerTwitterRefresh } from '@/services/twitterRefreshService';

interface RefreshDataButtonProps {
  className?: string;
}

const RefreshDataButton: React.FC<RefreshDataButtonProps> = ({ className }) => {
  return (
    <Button 
      onClick={triggerTwitterRefresh}
      variant="outline"
      size="sm"
      className={className}
    >
      <RefreshCw className="h-4 w-4 mr-2" />
      Refresh Data
    </Button>
  );
};

export default RefreshDataButton;
