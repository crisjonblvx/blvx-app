import { useState, useEffect, useRef } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

// Pages
import LandingPage from "@/pages/LandingPage";
import HomePage from "@/pages/HomePage";
import SearchPage from "@/pages/SearchPage";
import StoopPage from "@/pages/StoopPage";
import GCPage from "@/pages/GCPage";
import ProfilePage from "@/pages/ProfilePage";
import ThreadPage from "@/pages/ThreadPage";
import SettingsPage from "@/pages/SettingsPage";
import BonitaPage from "@/pages/BonitaPage";
import VouchPage from "@/pages/VouchPage";
import SidebarPage from "@/pages/SidebarPage";
import AdminPage from "@/pages/AdminPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import CalendarPage from "@/pages/CalendarPage";

// Components
import { NoiseOverlay } from "@/components/NoiseOverlay";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";

// Context
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH

// Auth Callback Handler - processes session_id from URL hash
const AuthCallbackHandler = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setAuthenticatedUser } = useAuth();
  const hasProcessed = useRef(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Check for session_id or session_token in URL hash on ANY page (could be /home#session_id=...)
    const hash = window.location.hash;
    
    if (hash && (hash.includes('session_id=') || hash.includes('session_token=')) && !hasProcessed.current) {
      hasProcessed.current = true;
      setProcessing(true);

      const processAuth = async () => {
        try {
          const params = new URLSearchParams(hash.replace('#', ''));
          const sessionId = params.get('session_id');
          const sessionToken = params.get('session_token');

          console.log('Processing OAuth callback');

          if (sessionId) {
            // Google OAuth flow
            const response = await axios.get(`${API}/auth/session`, {
              params: { session_id: sessionId },
              withCredentials: true
            });

            console.log('OAuth successful, user:', response.data.email);

            // Clear hash from URL
            window.history.replaceState(null, '', window.location.pathname);
            
            // Set authenticated user in context
            setAuthenticatedUser(response.data);
            
            // Navigate to home
            navigate('/home', { replace: true });
          } else if (sessionToken) {
            // Apple Sign-In flow - token already created, just validate it
            console.log('Processing Apple Sign-In callback');
            
            // Store the token first
            localStorage.setItem('blvx-session-token', sessionToken);
            
            // Validate by calling /auth/me
            const response = await axios.get(`${API}/auth/me`, {
              headers: { Authorization: `Bearer ${sessionToken}` },
              withCredentials: true
            });

            console.log('Apple Sign-In successful, user:', response.data.email);

            // Clear hash from URL
            window.history.replaceState(null, '', window.location.pathname);
            
            // Set authenticated user in context (include the token)
            setAuthenticatedUser({ ...response.data, session_token: sessionToken });
            
            // Navigate to home
            navigate('/home', { replace: true });
          }
        } catch (error) {
          console.error('Auth callback error:', error);
          localStorage.removeItem('blvx-session-token');
          window.history.replaceState(null, '', window.location.pathname);
          navigate('/', { replace: true });
        } finally {
          setProcessing(false);
        }
      };

      processAuth();
    }
  }, [navigate, setAuthenticatedUser]);

  if (processing) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm font-display tracking-wider">ENTERING THE CULTURE...</p>
        </div>
      </div>
    );
  }

  return children;
};

function AppRouter() {
  return (
    <AuthCallbackHandler>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/home" element={<AppShell><HomePage /></AppShell>} />
        <Route path="/stoop" element={<AppShell><StoopPage /></AppShell>} />
        <Route path="/search" element={<AppShell><SearchPage /></AppShell>} />
        <Route path="/gc" element={<AppShell><GCPage /></AppShell>} />
        <Route path="/bonita" element={<AppShell><BonitaPage /></AppShell>} />
        <Route path="/vouch" element={<AppShell><VouchPage /></AppShell>} />
        <Route path="/sidebar" element={<AppShell><SidebarPage /></AppShell>} />
        <Route path="/sidebar/:sidebarId" element={<AppShell><SidebarPage /></AppShell>} />
        <Route path="/profile/:username" element={<AppShell><ProfilePage /></AppShell>} />
        <Route path="/post/:postId" element={<AppShell><ThreadPage /></AppShell>} />
        <Route path="/settings" element={<AppShell><SettingsPage /></AppShell>} />
        <Route path="/calendar" element={<AppShell><CalendarPage /></AppShell>} />
        <Route path="/admin" element={<AppShell><AdminPage /></AppShell>} />
      </Routes>
    </AuthCallbackHandler>
  );
}

function App() {
  return (
    <div className="app-container bg-black min-h-screen" style={{ backgroundColor: '#000000', color: '#ffffff' }}>
      <NoiseOverlay />
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: '#000',
            border: '1px solid #333',
            color: '#fff',
            fontFamily: 'Inter, sans-serif',
          },
        }}
      />
    </div>
  );
}

export default App;
