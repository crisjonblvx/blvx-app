import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Auth Callback Page - Handles OAuth token handoff
 * URL: /auth/callback?token=xxx or /auth/callback?session_id=xxx
 * 
 * This page:
 * 1. Grabs token from URL params
 * 2. Validates it with the backend
 * 3. Saves to localStorage
 * 4. Redirects to /home
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuthenticatedUser } = useAuth();
  const { isDark, assets } = useTheme();
  const [status, setStatus] = useState('Processing...');
  const [error, setError] = useState(null);

  // Theme-aware classes
  const bgClass = isDark ? 'bg-black' : 'bg-white';
  const textClass = isDark ? 'text-white/70' : 'text-gray-600';
  const textMutedClass = isDark ? 'text-white/50' : 'text-gray-400';
  const textVeryMutedClass = isDark ? 'text-white/30' : 'text-gray-300';
  const spinnerClass = isDark ? 'border-white/30 border-t-white' : 'border-gray-300 border-t-gray-700';

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for token in URL params (Apple flow)
        const token = searchParams.get('token');
        // Check for session_id in URL params (Google/Emergent flow)
        const sessionId = searchParams.get('session_id');
        // Also check hash for backwards compatibility
        const hash = window.location.hash;
        const hashParams = new URLSearchParams(hash.replace('#', ''));
        const hashToken = hashParams.get('session_token') || hashParams.get('token');
        const hashSessionId = hashParams.get('session_id');

        console.log('Auth callback - token:', !!token, 'sessionId:', !!sessionId, 'hashToken:', !!hashToken, 'hashSessionId:', !!hashSessionId);

        if (token || hashToken) {
          // Direct token flow (Apple or new Google)
          const sessionToken = token || hashToken;
          setStatus('Validating session...');
          
          // Save token to localStorage FIRST
          localStorage.setItem('blvx-session-token', sessionToken);
          
          // Validate by calling /auth/me
          const response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${sessionToken}` }
          });

          console.log('Token validated, user:', response.data.email);
          
          // Set authenticated user in context
          setAuthenticatedUser({ ...response.data, session_token: sessionToken });
          
          // Clear URL and redirect
          setStatus('Success! Redirecting...');
          navigate('/home', { replace: true });
          
        } else if (sessionId || hashSessionId) {
          // Session ID flow (Google/Emergent) - exchange for token
          const sid = sessionId || hashSessionId;
          setStatus('Exchanging session...');
          
          const response = await axios.get(`${API}/auth/session`, {
            params: { session_id: sid }
          });

          console.log('Session exchanged, user:', response.data.email);
          
          // Extract and save the token
          const sessionToken = response.data.session_token;
          if (sessionToken) {
            localStorage.setItem('blvx-session-token', sessionToken);
          }
          
          // Set authenticated user in context
          setAuthenticatedUser(response.data);
          
          // Clear URL and redirect
          setStatus('Success! Redirecting...');
          navigate('/home', { replace: true });
          
        } else {
          throw new Error('No authentication token found in URL');
        }
        
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Authentication failed');
        localStorage.removeItem('blvx-session-token');
        
        // Redirect to landing after delay
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 2000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, setAuthenticatedUser]);

  return (
    <div className={`min-h-screen ${bgClass} flex items-center justify-center`}>
      <div className="text-center">
        <img 
          src={assets.logo} 
          alt="BLVX" 
          className="h-12 mx-auto mb-6"
        />
        {error ? (
          <div className="text-red-500">
            <p className="text-lg mb-2">Authentication Failed</p>
            <p className={`text-sm ${textMutedClass}`}>{error}</p>
            <p className={`text-xs ${textVeryMutedClass} mt-4`}>Redirecting to login...</p>
          </div>
        ) : (
          <div className={textClass}>
            <div className={`animate-spin h-8 w-8 border-2 ${spinnerClass} rounded-full mx-auto mb-4`}></div>
            <p>{status}</p>
          </div>
        )}
      </div>
    </div>
  );
}
