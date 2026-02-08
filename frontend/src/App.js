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
import AuthCallbackPage from "@/pages/AuthCallbackPage";
import InvitePage from "@/pages/InvitePage";
import AIStooopPage from "@/pages/AIStooopPage";
import AIStooopSettingsPage from "@/pages/AIStooopSettingsPage";
import BlockedUsersPage from "@/pages/BlockedUsersPage";
import LearnPage from "@/pages/LearnPage";
import MutedWordsPage from "@/pages/MutedWordsPage";

// Components
import { NoiseOverlay } from "@/components/NoiseOverlay";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";
import ErrorBoundary from "@/components/ErrorBoundary";

// Context
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Default avatar for users without a profile picture
const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/initials/svg?seed=User&backgroundColor=1a1a1a&textColor=ffffff";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH

// Auth Callback Handler - processes session_id from URL hash
const AuthCallbackHandler = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setAuthenticatedUser } = useAuth();
  const hasProcessed = useRef(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Check for session tokens in URL hash OR query params
    const hash = window.location.hash;
    const search = window.location.search;
    const queryParams = new URLSearchParams(search);
    const hashParams = hash ? new URLSearchParams(hash.replace('#', '')) : null;
    
    // Check hash first (Apple), then query params (Google)
    const sessionIdFromHash = hashParams?.get('session_id');
    const sessionTokenFromHash = hashParams?.get('session_token');
    const tokenFromQuery = queryParams.get('token'); // Google OAuth uses ?token=
    
    const hasAuthParams = sessionIdFromHash || sessionTokenFromHash || tokenFromQuery;
    
    if (hasAuthParams && !hasProcessed.current) {
      hasProcessed.current = true;
      setProcessing(true);

      const processAuth = async () => {
        try {
          const sessionId = sessionIdFromHash;
          const sessionToken = sessionTokenFromHash || tokenFromQuery;

          console.log('Processing OAuth callback');

          if (sessionId) {
            // Google OAuth flow
            const response = await axios.get(`${API}/auth/session`, {
              params: { session_id: sessionId },
              withCredentials: true
            });

            console.log('OAuth successful, user:', response.data.email);
            console.log('Session token received:', !!response.data.session_token);

            // CRITICAL: Save token to localStorage IMMEDIATELY before anything else
            if (response.data.session_token) {
              localStorage.setItem('blvx-session-token', response.data.session_token);
              console.log('Token saved to localStorage');
            } else {
              console.error('No session_token in response!');
            }

            // Clear hash from URL
            window.history.replaceState(null, '', window.location.pathname);
            
            // Set authenticated user in context
            setAuthenticatedUser(response.data);
            
            // Small delay to ensure localStorage is written before navigation
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Navigate to home
            navigate('/home', { replace: true });
          } else if (sessionToken) {
            // Direct token flow (Google OAuth or Apple Sign-In)
            console.log('Processing OAuth callback with direct token');
            
            // Store the token first
            localStorage.setItem('blvx-session-token', sessionToken);
            
            // Validate by calling /auth/me
            const response = await axios.get(`${API}/auth/me`, {
              headers: { Authorization: `Bearer ${sessionToken}` },
              withCredentials: true
            });

            console.log('OAuth successful, user:', response.data.email);

            // Clear hash AND query params from URL
            window.history.replaceState(null, '', window.location.pathname);
            
            // Set authenticated user in context
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-border border-t-foreground rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm font-display tracking-wider">ENTERING THE CULTURE...</p>
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
        <Route path="/invite/:code" element={<InvitePage />} />
        <Route path="/founder/:code" element={<InvitePage />} />
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
        <Route path="/settings/blocked" element={<AppShell><BlockedUsersPage /></AppShell>} />
        <Route path="/settings/muted" element={<AppShell><BlockedUsersPage /></AppShell>} />
        <Route path="/learn" element={<AppShell><LearnPage /></AppShell>} />
        <Route path="/settings/muted-words" element={<AppShell><MutedWordsPage /></AppShell>} />
        <Route path="/calendar" element={<AppShell><CalendarPage /></AppShell>} />
        <Route path="/admin" element={<AppShell><AdminPage /></AppShell>} />
        <Route path="/ai-stoop/:username" element={<AppShell><AIStooopPage /></AppShell>} />
        <Route path="/ai-stoop/session/:sessionId" element={<AppShell><AIStooopPage /></AppShell>} />
        <Route path="/ai-stoop-settings" element={<AppShell><AIStooopSettingsPage /></AppShell>} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
      </Routes>
    </AuthCallbackHandler>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <div className="app-container min-h-screen bg-background text-foreground">
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
            className: 'bg-card border-border text-foreground font-sans',
          }}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;
