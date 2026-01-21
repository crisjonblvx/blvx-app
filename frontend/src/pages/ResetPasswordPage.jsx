import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, ArrowLeft, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Give URL params time to initialize
    const timer = setTimeout(() => {
      setInitialized(true);
      if (!token) {
        toast.error('Invalid reset link');
        navigate('/');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [token, navigate]);

  // Show loading while initializing
  if (!initialized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password?token=${token}&new_password=${encodeURIComponent(password)}`);
      setSuccess(true);
      toast.success('Password reset successful!');
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-display text-white mb-2">You're back in!</h1>
          <p className="text-white/60 text-sm">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="/assets/logo-white.png" 
            alt="BLVX" 
            className="h-8 mx-auto mb-6"
          />
          <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <KeyRound className="h-6 w-6 text-amber-500" />
          </div>
          <h1 className="text-xl font-display text-white mb-2">Reset Your Password</h1>
          <p className="text-white/60 text-sm">Enter a new password to secure your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/5 border-white/20 h-12"
              required
              minLength={8}
              data-testid="new-password-input"
            />
          </div>
          
          <div>
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-white/5 border-white/20 h-12"
              required
              minLength={8}
              data-testid="confirm-password-input"
            />
          </div>
          
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-white text-black hover:bg-white/90 font-medium"
            data-testid="reset-password-btn"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              'Reset Password'
            )}
          </Button>
        </form>

        {/* Back Link */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-white/40 hover:text-white text-sm mt-6 mx-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </button>
      </div>
    </div>
  );
}
