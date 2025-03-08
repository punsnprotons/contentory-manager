
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useEffect } from "react";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import ContentGeneration from "./pages/ContentGeneration";
import PendingContent from "./pages/PendingContent";
import ContentCalendar from "./pages/ContentCalendar";
import Analytics from "./pages/Analytics";
import AIAssistant from "./pages/AIAssistant";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import RequireAuth from "./components/RequireAuth";
import { handleInstagramAuthRedirect, checkInstagramConnection } from "./services/instagramApiService";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

// Separate routes component to use location hooks safely
function AppRoutes() {
  const location = useLocation();
  
  useEffect(() => {
    // Check if the current URL contains an Instagram authorization code
    const urlParams = new URLSearchParams(location.search);
    const code = urlParams.get('code');
    
    if (code) {
      console.log('Detected Instagram auth code in URL, handling redirect');
      handleInstagramAuthRedirect();
    } else {
      // Verify Instagram connection on app load (quietly in background)
      checkInstagramConnection().then(connected => {
        console.log('Instagram connection status on app load:', connected);
      });
    }
  }, [location]);

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<Index />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route 
          path="content-generation" 
          element={
            <RequireAuth>
              <ContentGeneration />
            </RequireAuth>
          } 
        />
        <Route 
          path="pending-content" 
          element={
            <RequireAuth>
              <PendingContent />
            </RequireAuth>
          } 
        />
        <Route 
          path="content-calendar" 
          element={
            <RequireAuth>
              <ContentCalendar />
            </RequireAuth>
          } 
        />
        <Route path="analytics" element={<Analytics />} />
        <Route path="chat" element={<AIAssistant />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
