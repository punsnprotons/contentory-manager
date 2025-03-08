
import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { InstagramApiService } from '@/services/instagramApiService';
import { AuthProvider } from './hooks/useAuth';
import RequireAuth from './components/RequireAuth';
import Index from './pages/Index';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import ContentCalendar from './pages/ContentCalendar';
import ContentGeneration from './pages/ContentGeneration';
import PendingContent from './pages/PendingContent';
import Analytics from './pages/Analytics';
import AIAssistant from './pages/AIAssistant';
import './App.css';

function App() {
  const location = useLocation();

  useEffect(() => {
    // Handle Instagram OAuth redirect if URL contains a code parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('code')) {
      console.log('Detected auth code in URL, checking for Instagram redirect');
      InstagramApiService.handleAuthRedirect();
    }
  }, [location]);

  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <Settings />
            </RequireAuth>
          }
        />
        <Route
          path="/calendar"
          element={
            <RequireAuth>
              <ContentCalendar />
            </RequireAuth>
          }
        />
        <Route
          path="/content/generate"
          element={
            <RequireAuth>
              <ContentGeneration />
            </RequireAuth>
          }
        />
        <Route
          path="/content/pending"
          element={
            <RequireAuth>
              <PendingContent />
            </RequireAuth>
          }
        />
        <Route
          path="/analytics"
          element={
            <RequireAuth>
              <Analytics />
            </RequireAuth>
          }
        />
        <Route
          path="/ai-assistant"
          element={
            <RequireAuth>
              <AIAssistant />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
