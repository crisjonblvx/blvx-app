import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Configure axios to send auth token from localStorage
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('blvx-session-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const authCheckRef = useRef(false);

  // Check authentication on mount and when user state changes
  const checkAuth = useCallback(async (skipIfUser = false) => {
    // Skip if we just authenticated
    if (authCheckRef.current) {
      setLoading(false);
      return;
    }
    
    // If we already have user data passed from login, use it
    if (skipIfUser && user) {
      setLoading(false);
      return;
    }
    
    // If we're already authenticated with a user, skip
    if (isAuthenticated && user) {
      setLoading(false);
      return;
    }
    
    // Public routes that don't require authentication
    const publicRoutes = ['/', '/reset-password'];
    const isPublicRoute = publicRoutes.includes(location.pathname);
    
    // Skip auth check on public pages
    if (isPublicRoute) {
      setLoading(false);
      return;
    }

    // Check if we have a token in localStorage
    const savedToken = localStorage.getItem('blvx-session-token');
    if (!savedToken) {
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      if (!isPublicRoute) {
        navigate('/', { replace: true });
      }
      return;
    }

    try {
      const response = await axios.get(`${API}/auth/me`, {
        withCredentials: true
      });
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.log('Auth check failed:', error.response?.status);
      // Clear invalid token
      localStorage.removeItem('blvx-session-token');
      setSessionToken(null);
      setUser(null);
      setIsAuthenticated(false);
      // Only redirect if on a protected route
      if (!isPublicRoute) {
        navigate('/', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [location.pathname, navigate, user, isAuthenticated]);

  // Initial auth check on mount
  useEffect(() => {
    if (!authCheckRef.current) {
      authCheckRef.current = true;
      
      // Check if user was passed in location state (from login)
      if (location.state?.user) {
        setUser(location.state.user);
        setIsAuthenticated(true);
        setLoading(false);
        // Clear state to prevent issues on refresh
        window.history.replaceState({}, document.title);
      } else {
        checkAuth();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-check auth when location changes (but not for every tiny change)
  useEffect(() => {
    // Only re-check if we don't have a user and we're not on landing
    if (!user && !loading && location.pathname !== '/') {
      checkAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const login = () => {
    // Use current origin for OAuth redirect - works on all domains (preview, production, custom)
    const redirectUrl = window.location.origin + '/auth/callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const loginWithApple = async () => {
    try {
      // Get Apple configuration from backend
      const response = await axios.get(`${API}/auth/apple/config`);
      const config = response.data;
      
      // Build Apple authorization URL
      const params = new URLSearchParams({
        client_id: config.client_id,
        redirect_uri: config.redirect_uri,
        response_type: config.response_type,
        response_mode: config.response_mode,
        scope: config.scope,
        state: Math.random().toString(36).substring(7)
      });
      
      window.location.href = `https://appleid.apple.com/auth/authorize?${params.toString()}`;
    } catch (error) {
      console.error('Apple login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('blvx-session-token');
      setSessionToken(null);
      setUser(null);
      setIsAuthenticated(false);
      navigate('/', { replace: true });
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  // Expose a method to set user after successful login
  const setAuthenticatedUser = (userData, token = null) => {
    // Extract and save session token if present
    const tokenToSave = token || userData.session_token;
    if (tokenToSave) {
      localStorage.setItem('blvx-session-token', tokenToSave);
      setSessionToken(tokenToSave);
    }
    
    // Remove session_token from user object before storing
    const { session_token, ...userWithoutToken } = userData;
    setUser(userWithoutToken);
    setIsAuthenticated(true);
    setLoading(false);
    
    // Mark that we just authenticated to prevent checkAuth from running
    authCheckRef.current = true;
    setTimeout(() => {
      authCheckRef.current = false;
    }, 2000);
  };

  // Refresh user data from server
  const refreshUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to refresh user:', error);
      return null;
    }
  };

  // Load session token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('blvx-session-token');
    if (savedToken) {
      setSessionToken(savedToken);
    }
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated,
    sessionToken,
    login,
    loginWithApple,
    logout,
    updateUser,
    checkAuth,
    setAuthenticatedUser,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
