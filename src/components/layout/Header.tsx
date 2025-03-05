
import React, { useState } from "react";
import { Bell, Search, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

interface HeaderProps {
  rightContent?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ rightContent }) => {
  const [showSearch, setShowSearch] = useState(false);
  const isMobile = useIsMobile();

  return (
    <header className="sticky top-0 z-50 w-full h-16 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 transition-all duration-300">
      <div className="flex items-center">
        {isMobile ? (
          <SidebarTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2">
              <Menu size={20} />
            </Button>
          </SidebarTrigger>
        ) : null}
        <div className="flex items-center">
          <span className="font-semibold text-lg text-foreground ml-2">SocialPro</span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {showSearch || !isMobile ? (
          <div className={`${isMobile ? 'absolute left-0 right-0 top-0 p-3 bg-background border-b' : 'relative'} animate-fade-in`}>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className={`pl-8 ${isMobile ? 'w-full pr-10' : 'w-[200px] focus:w-[300px]'} transition-all rounded-full`}
              />
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1"
                  onClick={() => setShowSearch(false)}
                >
                  <X size={18} />
                </Button>
              )}
            </div>
          </div>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => setShowSearch(true)}>
            <Search size={20} />
          </Button>
        )}

        <Button variant="ghost" size="icon" className="relative">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
        </Button>

        {rightContent ? (
          rightContent
        ) : (
          <Button variant="ghost" size="icon" className="rounded-full overflow-hidden">
            <img
              src="https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff"
              alt="Profile"
              className="w-8 h-8 object-cover"
            />
          </Button>
        )}
      </div>
    </header>
  );
};

export default Header;
