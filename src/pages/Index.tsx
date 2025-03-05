
import { Outlet } from "react-router-dom";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <SidebarProvider>
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </SidebarProvider>
      </div>
    </div>
  );
};

export default Index;
