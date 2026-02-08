import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loginWithApple, isAuthenticated, loading: authLoading, setAuthenticatedUser } = useAuth();
  const { isDark, assets } = useTheme();
  const [authMode, setAuthMode] = useState('landing'); // landing, login, signup, verify, forgot
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  
  // Invite code handling
  const [inviteCode, setInviteCode] = useState('');
  const [isFounderInvite, setIsFounderInvite] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    rememberMe: false,
    marketingConsent: false
  });

  // Check for invite code in URL
  useEffect(() => {
    const invite = searchParams.get('invite');
    const founder = searchParams.get('founder');
    if (invite) {
      setInviteCode(invite);
      setIsFounderInvite(founder === 'true');
      setAuthMode('signup'); // Go straight to signup if they have an invite
    }
  }, [searchParams]);

  // Theme-aware classes
  const bgClass = isDark ? 'bg-black' : 'bg-white';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const textMutedClass = isDark ? 'text-white/80' : 'text-gray-600';
  const textVeryMutedClass = isDark ? 'text-white/50' : 'text-gray-400';
  const textSuperMutedClass = isDark ? 'text-white/30' : 'text-gray-300';
  const borderClass = isDark ? 'border-white/10' : 'border-gray-200';
  const borderInputClass = isDark ? 'border-white/20' : 'border-gray-300';
  const iconMutedClass = isDark ? 'text-white/30' : 'text-gray-400';
  const inputBgClass = isDark ? 'bg-transparent' : 'bg-gray-50';
  const primaryBtnClass = isDark 
    ? 'bg-white text-black hover:bg-white/90' 
    : 'bg-black text-white hover:bg-black/90';
  const outlineBtnClass = isDark 
    ? 'border-white/30 text-white hover:bg-white/10' 
    : 'border-gray-300 text-gray-700 hover:bg-gray-100';
  const ghostBtnClass = isDark 
    ? 'border-white/20 text-white/70 hover:text-white hover:bg-white/5' 
    : 'border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100';

  // Redirect if already authenticated
  if (!authLoading && isAuthenticated) {
    navigate('/home', { replace: true });
    return null;
  }

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.name) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/signup`, {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        marketing_consent: formData.marketingConsent
      }, { withCredentials: true });
      
      setVerificationEmail(formData.email);
      setAuthMode('verify');
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, {
        email: formData.email,
        password: formData.password,
        remember_me: formData.rememberMe
      }, { withCredentials: true });
      
      // Set authenticated user and navigate
      setAuthenticatedUser(response.data);
      // If they came from an invite, take them to redeem it
      if (inviteCode) {
        navigate(`/vouch?redeem=${inviteCode}`, { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    if (!verificationCode) {
      toast.error('Please enter the verification code');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/verify-email`, {
        email: verificationEmail,
        code: verificationCode
      }, { withCredentials: true });
      
      toast.success('Email verified!');
      // Set authenticated user and navigate
      setAuthenticatedUser(response.data.user);
      // If they came from an invite, take them to redeem it
      if (inviteCode) {
        navigate(`/vouch?redeem=${inviteCode}`, { replace: true });
      } else {
        navigate('/home', { replace: true });
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/resend-verification`, null, {
        params: { email: verificationEmail }
      });
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error('Please enter your email');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, null, {
        params: { email: forgotEmail }
      });
      setResetSent(true);
      toast.success('Check your inbox for the reset link');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Landing view
  if (authMode === 'landing') {
    return (
      <div className={`min-h-screen ${bgClass} flex flex-col`}>
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
          <div className={`absolute inset-0 ${bgClass}`} />
          
          <div className="relative z-10 text-center max-w-md mx-auto">
            <img 
              src={assets.logo}
              alt="BLVX"
              className="h-16 sm:h-20 mx-auto mb-8 animate-fade-in"
              data-testid="landing-logo"
            />
            
            <p className={`font-display text-base sm:text-lg ${textMutedClass} mb-3 tracking-wider uppercase animate-fade-in stagger-1`}>
              High-Context Social
            </p>
            
            <p className={`text-sm ${textVeryMutedClass} max-w-sm mx-auto mb-10 animate-fade-in stagger-2`}>
              The world's first culture-native network. Not a town square. A group chat with standards.
            </p>
            
            <div className="space-y-3 animate-fade-in stagger-3">
              {/* Apple Sign-In - Primary */}
              <Button
                onClick={() => {
                  // Save invite code before OAuth redirect
                  if (inviteCode) localStorage.setItem('blvx-pending-invite', inviteCode);
                  loginWithApple();
                }}
                size="lg"
                className={`w-full ${primaryBtnClass} rounded-none px-8 py-6 text-sm`}
                data-testid="apple-signin-landing"
              >
                <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continue with Apple
              </Button>
              
              {/* Google Sign-In */}
              <Button
                onClick={() => {
                  // Save invite code before OAuth redirect
                  if (inviteCode) localStorage.setItem('blvx-pending-invite', inviteCode);
                  login();
                }}
                variant="outline"
                size="lg"
                className={`w-full ${outlineBtnClass} rounded-none px-8 py-6 text-sm`}
                data-testid="google-signin-landing"
              >
                <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
              
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full border-t ${borderClass}`} />
                </div>
                <div className="relative flex justify-center">
                  <span className={`${bgClass} px-4 text-xs ${textSuperMutedClass} uppercase tracking-wider`}>or</span>
                </div>
              </div>
              
              {/* Email Sign Up */}
              <Button
                onClick={() => setAuthMode('signup')}
                variant="outline"
                size="lg"
                className={`w-full ${ghostBtnClass} rounded-none px-8 py-5 text-sm`}
                data-testid="signup-btn"
              >
                <Mail className="h-4 w-4 mr-3" />
                Sign up with Email
              </Button>
              
              <p className={`text-center ${textVeryMutedClass} text-xs mt-4`}>
                Already have an account?{' '}
                <button onClick={() => setAuthMode('login')} className={`${textClass} hover:underline`}>
                  Sign in with email
                </button>
              </p>
            </div>
          </div>
        </div>

        <div className={`border-t ${borderClass} py-6 px-6`}>
          <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 text-center">
            <div>
              <p className={`font-display text-[10px] ${textSuperMutedClass} tracking-widest uppercase mb-1`}>The Block</p>
              <p className={`text-[9px] ${textSuperMutedClass}`}>Public Feed</p>
            </div>
            <div>
              <p className={`font-display text-[10px] ${textSuperMutedClass} tracking-widest uppercase mb-1`}>The Cookout</p>
              <p className={`text-[9px] ${textSuperMutedClass}`}>Vetted Circles</p>
            </div>
            <div>
              <p className={`font-display text-[10px] ${textSuperMutedClass} tracking-widest uppercase mb-1`}>The Stoop</p>
              <p className={`text-[9px] ${textSuperMutedClass}`}>Live Audio</p>
            </div>
          </div>
        </div>

        <footer className={`border-t ${borderClass} py-3 px-6`}>
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className={`text-[9px] ${textSuperMutedClass}`}>© 2025 BLVX</p>
            <div className={`flex items-center gap-1.5 text-[9px] ${textSuperMutedClass}`}>
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Bonita Online
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Signup view
  if (authMode === 'signup') {
    return (
      <div className={`min-h-screen ${bgClass} flex flex-col items-center justify-center px-6 py-12`}>
        <div className="w-full max-w-sm">
          <img 
            src={assets.logo}
            alt="BLVX"
            className="h-10 mx-auto mb-8"
          />
          
          <h1 className={`font-display text-lg tracking-widest uppercase text-center mb-8 ${textClass}`}>Create Account</h1>
          
          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className={`${textVeryMutedClass} text-xs uppercase tracking-wider`}>Name</Label>
              <div className="relative">
                <User className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconMutedClass}`} />
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Your name"
                  className={`pl-10 ${inputBgClass} ${borderInputClass} focus:border-amber-500 rounded-none`}
                  data-testid="signup-name"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className={`${textVeryMutedClass} text-xs uppercase tracking-wider`}>Email</Label>
              <div className="relative">
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconMutedClass}`} />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="you@example.com"
                  className={`pl-10 ${inputBgClass} ${borderInputClass} focus:border-amber-500 rounded-none`}
                  data-testid="signup-email"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className={`${textVeryMutedClass} text-xs uppercase tracking-wider`}>Password</Label>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconMutedClass}`} />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Min. 8 characters"
                  className={`pl-10 pr-10 ${inputBgClass} ${borderInputClass} focus:border-amber-500 rounded-none`}
                  data-testid="signup-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${iconMutedClass} hover:${textClass}`}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="marketing-consent"
                checked={formData.marketingConsent}
                onChange={(e) => setFormData({...formData, marketingConsent: e.target.checked})}
                className="w-4 h-4 mt-0.5 bg-transparent border-gray-300 rounded accent-amber-500"
                data-testid="marketing-consent-checkbox"
              />
              <label htmlFor="marketing-consent" className={`${textVeryMutedClass} text-xs cursor-pointer leading-snug`}>
                Keep me updated on new features and ContentCreators.life projects
              </label>
            </div>
            
            <Button
              type="submit"
              disabled={loading}
              className={`w-full ${primaryBtnClass} rounded-none py-6 font-display tracking-widest uppercase`}
              data-testid="signup-submit"
            >
              {loading ? 'Creating...' : 'Create Account'}
            </Button>
          </form>
          
          <p className={`text-center ${textVeryMutedClass} text-xs mt-6`}>
            Already have an account?{' '}
            <button onClick={() => setAuthMode('login')} className={`${textClass} hover:underline`}>
              Sign in
            </button>
          </p>
          
          <button 
            onClick={() => setAuthMode('landing')}
            className={`block w-full text-center ${textSuperMutedClass} text-xs mt-4 hover:${textClass}`}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // Login view
  if (authMode === 'login') {
    return (
      <div className={`min-h-screen ${bgClass} flex flex-col items-center justify-center px-6 py-12`}>
        <div className="w-full max-w-sm">
          <img 
            src={assets.logo}
            alt="BLVX"
            className="h-10 mx-auto mb-8"
          />
          
          <h1 className={`font-display text-lg tracking-widest uppercase text-center mb-8 ${textClass}`}>Sign In</h1>
          
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email" className={`${textVeryMutedClass} text-xs uppercase tracking-wider`}>Email</Label>
              <div className="relative">
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconMutedClass}`} />
                <Input
                  id="login-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="you@example.com"
                  className={`pl-10 ${inputBgClass} ${borderInputClass} focus:border-amber-500 rounded-none`}
                  data-testid="login-email"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password" className={`${textVeryMutedClass} text-xs uppercase tracking-wider`}>Password</Label>
                <button
                  type="button"
                  onClick={() => setAuthMode('forgot')}
                  className="text-amber-500 text-xs hover:text-amber-400 transition-colors"
                  data-testid="forgot-password-link"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconMutedClass}`} />
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Your password"
                  className={`pl-10 pr-10 ${inputBgClass} ${borderInputClass} focus:border-amber-500 rounded-none`}
                  data-testid="login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${iconMutedClass} hover:${textClass}`}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember-me"
                checked={formData.rememberMe}
                onChange={(e) => setFormData({...formData, rememberMe: e.target.checked})}
                className="w-4 h-4 bg-transparent border-gray-300 rounded accent-amber-500"
                data-testid="remember-me-checkbox"
              />
              <label htmlFor="remember-me" className={`${textVeryMutedClass} text-xs cursor-pointer`}>
                Remember me for 30 days
              </label>
            </div>
            
            <Button
              type="submit"
              disabled={loading}
              className={`w-full ${primaryBtnClass} rounded-none py-6 font-display tracking-widest uppercase`}
              data-testid="login-submit"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          
          <div className="relative py-6">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${borderClass}`} />
            </div>
            <div className="relative flex justify-center">
              <span className={`${bgClass} px-4 text-xs ${textSuperMutedClass} uppercase tracking-wider`}>or</span>
            </div>
          </div>
          
          <Button
            onClick={loginWithApple}
            variant="outline"
            className={`w-full ${primaryBtnClass} rounded-none py-5 mb-3`}
            data-testid="apple-signin-btn"
          >
            <svg className="h-4 w-4 mr-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Continue with Apple
          </Button>
          
          <Button
            onClick={login}
            variant="outline"
            className={`w-full ${outlineBtnClass} rounded-none py-5`}
            data-testid="google-signin-btn"
          >
            <svg className="h-4 w-4 mr-3" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>
          
          <p className={`text-center ${textVeryMutedClass} text-xs mt-6`}>
            Don't have an account?{' '}
            <button onClick={() => setAuthMode('signup')} className={`${textClass} hover:underline`}>
              Create one
            </button>
          </p>
          
          <button 
            onClick={() => setAuthMode('landing')}
            className={`block w-full text-center ${textSuperMutedClass} text-xs mt-4 hover:${textClass}`}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // Verify email view
  if (authMode === 'verify') {
    return (
      <div className={`min-h-screen ${bgClass} flex flex-col items-center justify-center px-6 py-12`}>
        <div className="w-full max-w-sm">
          <img 
            src={assets.logo}
            alt="BLVX"
            className="h-10 mx-auto mb-8"
          />
          
          <h1 className={`font-display text-lg tracking-widest uppercase text-center mb-4 ${textClass}`}>Verify Email</h1>
          <p className={`${textVeryMutedClass} text-sm text-center mb-8`}>
            Enter the 6-digit code sent to<br />
            <span className={textClass}>{verificationEmail}</span>
          </p>
          
          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <Input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className={`text-center text-2xl tracking-[0.5em] ${inputBgClass} ${borderInputClass} focus:border-amber-500 rounded-none py-6 font-mono`}
              maxLength={6}
              data-testid="verify-code"
            />
            
            <Button
              type="submit"
              disabled={loading || verificationCode.length !== 6}
              className={`w-full ${primaryBtnClass} rounded-none py-6 font-display tracking-widest uppercase`}
              data-testid="verify-submit"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
          </form>
          
          <button
            onClick={handleResendCode}
            disabled={loading}
            className={`block w-full text-center ${textVeryMutedClass} text-xs mt-6 hover:${textClass}`}
          >
            Resend code
          </button>
          
          <button 
            onClick={() => setAuthMode('signup')}
            className={`block w-full text-center ${textSuperMutedClass} text-xs mt-4 hover:${textClass}`}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // Forgot password view
  if (authMode === 'forgot') {
    return (
      <div className={`min-h-screen ${bgClass} flex flex-col items-center justify-center px-6 py-12`}>
        <div className="w-full max-w-sm">
          <img 
            src={assets.logo}
            alt="BLVX"
            className="h-10 mx-auto mb-8"
          />
          
          {resetSent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="h-8 w-8 text-amber-500" />
              </div>
              <h1 className={`font-display text-xl ${textClass} mb-3`}>Check your inbox</h1>
              <p className={`${textVeryMutedClass} text-sm mb-6`}>
                We sent a reset link to<br />
                <span className={textClass}>{forgotEmail}</span>
              </p>
              <p className={`${textSuperMutedClass} text-xs mb-8`}>
                The link expires in 1 hour. Check your spam folder if you don't see it.
              </p>
              <button 
                onClick={() => {
                  setAuthMode('login');
                  setResetSent(false);
                  setForgotEmail('');
                }}
                className="text-amber-500 text-sm hover:text-amber-400 transition-colors"
              >
                ← Back to login
              </button>
            </div>
          ) : (
            <>
              <h1 className={`font-display text-lg tracking-widest uppercase text-center mb-4 ${textClass}`}>Reset Password</h1>
              <p className={`${textVeryMutedClass} text-sm text-center mb-8`}>
                No stress. Enter your email and we'll send you a reset link.
              </p>
              
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className={`${textVeryMutedClass} text-xs uppercase tracking-wider`}>Email</Label>
                  <div className="relative">
                    <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconMutedClass}`} />
                    <Input
                      id="forgot-email"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={`pl-10 ${inputBgClass} ${borderInputClass} focus:border-amber-500 rounded-none`}
                      data-testid="forgot-email"
                    />
                  </div>
                </div>
                
                <Button
                  type="submit"
                  disabled={loading}
                  className={`w-full ${primaryBtnClass} rounded-none py-6 font-display tracking-widest uppercase`}
                  data-testid="forgot-submit"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Send Reset Link'}
                </Button>
              </form>
              
              <button 
                onClick={() => setAuthMode('login')}
                className={`block w-full text-center ${textSuperMutedClass} text-xs mt-6 hover:${textClass}`}
              >
                ← Back to login
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}
