
import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Edit,
  Clock,
  Calendar,
  BarChart,
  Settings,
  MessageSquare,
  Instagram,
  Twitter
} from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface SidebarLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ to, icon: Icon, label }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-base transition-all duration-200",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )
      }
    >
      <Icon size={20} />
      <span>{label}</span>
    </NavLink>
  );
};

const SidebarComponent: React.FC = () => {
  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center justify-center">
          <h2 className="text-2xl font-bold tracking-tight">SocialPro</h2>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-4">
        <nav className="space-y-2">
          <SidebarLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <SidebarLink to="/content-generation" icon={Edit} label="Create Content" />
          <SidebarLink to="/pending-content" icon={Clock} label="Pending Content" />
          <SidebarLink to="/content-calendar" icon={Calendar} label="Content Calendar" />
          <SidebarLink to="/analytics" icon={BarChart} label="Analytics" />
          <SidebarLink to="/chat" icon={MessageSquare} label="AI Assistant" />
          <SidebarLink to="/settings" icon={Settings} label="Settings" />
        </nav>

        <div className="mt-8">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            Connected Accounts
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground">
              <Instagram size={20} className="text-pink-500" />
              <span>@yourusername</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground">
              <Twitter size={20} className="text-blue-500" />
              <span>@yourusername</span>
            </div>
          </div>
        </div>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground">© 2023 SocialPro</div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default SidebarComponent;
