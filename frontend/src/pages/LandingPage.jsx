import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function LandingPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading: authLoading, setAuthenticatedUser } = useAuth();
  const [authMode, setAuthMode] = useState('landing'); // landing, login, signup, verify
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

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
        name: formData.name
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
        password: formData.password
      }, { withCredentials: true });
      
      // Set authenticated user and navigate
      setAuthenticatedUser(response.data);
      navigate('/home', { replace: true });
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
      navigate('/home', { replace: true });
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

  // Landing view
  if (authMode === 'landing') {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-black" />
          
          <div className="relative z-10 text-center max-w-md mx-auto">
            <img 
              src="/assets/logo-white.png"
              alt="BLVX"
              className="h-16 sm:h-20 mx-auto mb-8 animate-fade-in"
              data-testid="landing-logo"
            />
            
            <p className="font-display text-base sm:text-lg text-white/80 mb-3 tracking-wider uppercase animate-fade-in stagger-1">
              High-Context Social
            </p>
            
            <p className="text-sm text-white/50 max-w-sm mx-auto mb-10 animate-fade-in stagger-2">
              The world's first culture-native network. Not a town square. A group chat with standards.
            </p>
            
            <div className="space-y-3 animate-fade-in stagger-3">
              <Button
                onClick={() => setAuthMode('signup')}
                size="lg"
                className="w-full bg-white text-black hover:bg-white/90 rounded-none px-8 py-6 text-sm font-display tracking-widest uppercase"
                data-testid="signup-btn"
              >
                Create Account
                <ArrowRight className="ml-3 h-4 w-4" />
              </Button>
              
              <Button
                onClick={() => setAuthMode('login')}
                variant="outline"
                size="lg"
                className="w-full border-white/30 text-white hover:bg-white/10 rounded-none px-8 py-6 text-sm font-display tracking-widest uppercase"
                data-testid="login-btn"
              >
                Sign In
              </Button>
              
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-black px-4 text-xs text-white/30 uppercase tracking-wider">or</span>
                </div>
              </div>
              
              <Button
                onClick={login}
                variant="ghost"
                size="lg"
                className="w-full text-white/60 hover:text-white hover:bg-white/5 rounded-none px-8 py-6 text-sm"
                data-testid="google-login-btn"
              >
                <svg className="h-4 w-4 mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 py-6 px-6">
          <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="font-display text-[10px] text-white/30 tracking-widest uppercase mb-1">The Block</p>
              <p className="text-[9px] text-white/20">Public Feed</p>
            </div>
            <div>
              <p className="font-display text-[10px] text-white/30 tracking-widest uppercase mb-1">The Cookout</p>
              <p className="text-[9px] text-white/20">Vetted Circles</p>
            </div>
            <div>
              <p className="font-display text-[10px] text-white/30 tracking-widest uppercase mb-1">The Stoop</p>
              <p className="text-[9px] text-white/20">Live Audio</p>
            </div>
          </div>
        </div>

        <footer className="border-t border-white/10 py-3 px-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-[9px] text-white/20">© 2025 BLVX</p>
            <div className="flex items-center gap-1.5 text-[9px] text-white/20">
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
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <img 
            src="/assets/logo-white.png"
            alt="BLVX"
            className="h-10 mx-auto mb-8"
          />
          
          <h1 className="font-display text-lg tracking-widest uppercase text-center mb-8">Create Account</h1>
          
          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white/60 text-xs uppercase tracking-wider">Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Your name"
                  className="pl-10 bg-transparent border-white/20 focus:border-white rounded-none"
                  data-testid="signup-name"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/60 text-xs uppercase tracking-wider">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="you@example.com"
                  className="pl-10 bg-transparent border-white/20 focus:border-white rounded-none"
                  data-testid="signup-email"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/60 text-xs uppercase tracking-wider">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Min. 8 characters"
                  className="pl-10 pr-10 bg-transparent border-white/20 focus:border-white rounded-none"
                  data-testid="signup-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black hover:bg-white/90 rounded-none py-6 font-display tracking-widest uppercase"
              data-testid="signup-submit"
            >
              {loading ? 'Creating...' : 'Create Account'}
            </Button>
          </form>
          
          <p className="text-center text-white/40 text-xs mt-6">
            Already have an account?{' '}
            <button onClick={() => setAuthMode('login')} className="text-white hover:underline">
              Sign in
            </button>
          </p>
          
          <button 
            onClick={() => setAuthMode('landing')}
            className="block w-full text-center text-white/30 text-xs mt-4 hover:text-white"
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
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <img 
            src="/assets/logo-white.png"
            alt="BLVX"
            className="h-10 mx-auto mb-8"
          />
          
          <h1 className="font-display text-lg tracking-widest uppercase text-center mb-8">Sign In</h1>
          
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-white/60 text-xs uppercase tracking-wider">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  id="login-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="you@example.com"
                  className="pl-10 bg-transparent border-white/20 focus:border-white rounded-none"
                  data-testid="login-email"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-white/60 text-xs uppercase tracking-wider">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Your password"
                  className="pl-10 pr-10 bg-transparent border-white/20 focus:border-white rounded-none"
                  data-testid="login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black hover:bg-white/90 rounded-none py-6 font-display tracking-widest uppercase"
              data-testid="login-submit"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          
          <div className="relative py-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-black px-4 text-xs text-white/30 uppercase tracking-wider">or</span>
            </div>
          </div>
          
          <Button
            onClick={login}
            variant="outline"
            className="w-full border-white/20 text-white/60 hover:text-white hover:bg-white/5 rounded-none py-5"
          >
            <svg className="h-4 w-4 mr-3" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>
          
          <p className="text-center text-white/40 text-xs mt-6">
            Don't have an account?{' '}
            <button onClick={() => setAuthMode('signup')} className="text-white hover:underline">
              Create one
            </button>
          </p>
          
          <button 
            onClick={() => setAuthMode('landing')}
            className="block w-full text-center text-white/30 text-xs mt-4 hover:text-white"
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
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <img 
            src="https://customer-assets.emergentagent.com/job_blackvoices-1/artifacts/vepdsom9_BLVX%20logo%20white.png"
            alt="BLVX"
            className="h-10 mx-auto mb-8"
          />
          
          <h1 className="font-display text-lg tracking-widest uppercase text-center mb-4">Verify Email</h1>
          <p className="text-white/50 text-sm text-center mb-8">
            Enter the 6-digit code sent to<br />
            <span className="text-white">{verificationEmail}</span>
          </p>
          
          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <Input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="text-center text-2xl tracking-[0.5em] bg-transparent border-white/20 focus:border-white rounded-none py-6 font-mono"
              maxLength={6}
              data-testid="verify-code"
            />
            
            <Button
              type="submit"
              disabled={loading || verificationCode.length !== 6}
              className="w-full bg-white text-black hover:bg-white/90 rounded-none py-6 font-display tracking-widest uppercase"
              data-testid="verify-submit"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
          </form>
          
          <button
            onClick={handleResendCode}
            disabled={loading}
            className="block w-full text-center text-white/40 text-xs mt-6 hover:text-white"
          >
            Resend code
          </button>
          
          <button 
            onClick={() => setAuthMode('signup')}
            className="block w-full text-center text-white/30 text-xs mt-4 hover:text-white"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return null;
}
