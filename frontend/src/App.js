import { useState, useEffect, useRef } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";

// Pages
import LandingPage from "@/pages/LandingPage";
import AuthCallback from "@/pages/AuthCallback";
import HomePage from "@/pages/HomePage";
import SearchPage from "@/pages/SearchPage";
import BonitaPage from "@/pages/BonitaPage";
import NotificationsPage from "@/pages/NotificationsPage";
import ProfilePage from "@/pages/ProfilePage";
import ThreadPage from "@/pages/ThreadPage";
import SettingsPage from "@/pages/SettingsPage";

// Components
import { NoiseOverlay } from "@/components/NoiseOverlay";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";

// Context
import { AuthProvider } from "@/context/AuthContext";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH

function AppRouter() {
  const location = useLocation();
  
  // Check URL fragment for session_id SYNCHRONOUSLY during render
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/home" element={<AppShell><HomePage /></AppShell>} />
      <Route path="/search" element={<AppShell><SearchPage /></AppShell>} />
      <Route path="/bonita" element={<AppShell><BonitaPage /></AppShell>} />
      <Route path="/notifications" element={<AppShell><NotificationsPage /></AppShell>} />
      <Route path="/profile/:username" element={<AppShell><ProfilePage /></AppShell>} />
      <Route path="/post/:postId" element={<AppShell><ThreadPage /></AppShell>} />
      <Route path="/settings" element={<AppShell><SettingsPage /></AppShell>} />
    </Routes>
  );
}

function App() {
  return (
    <div className="app-container bg-black min-h-screen">
      <NoiseOverlay />
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </BrowserRouter>
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: '#000',
            border: '1px solid #333',
            color: '#fff',
          },
        }}
      />
    </div>
  );
}

export default App;
