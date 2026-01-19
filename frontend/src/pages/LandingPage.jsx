import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading } = useAuth();

  // Redirect if already authenticated
  if (!loading && isAuthenticated) {
    navigate('/home', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
        {/* Background with film grain effect */}
        <div className="absolute inset-0 bg-black" />
        
        <div className="relative z-10 text-center max-w-2xl mx-auto">
          {/* Logo */}
          <img 
            src="https://customer-assets.emergentagent.com/job_blackvoices-1/artifacts/vepdsom9_BLVX%20logo%20white.png"
            alt="BLVX"
            className="h-20 sm:h-24 mx-auto mb-8 animate-fade-in"
            data-testid="landing-logo"
          />
          
          {/* Tagline */}
          <p className="font-display text-lg sm:text-xl text-white/80 mb-4 tracking-wider uppercase animate-fade-in stagger-1">
            High-Context Social
          </p>
          
          <p className="text-sm sm:text-base text-white/50 max-w-md mx-auto mb-12 animate-fade-in stagger-2">
            The world's first culture-native network. Not a town square. A group chat with standards.
          </p>
          
          {/* CTA */}
          <div className="animate-fade-in stagger-3">
            <Button
              onClick={login}
              size="lg"
              className="bg-white text-black hover:bg-white/90 rounded-none px-10 py-6 text-base font-display tracking-widest uppercase btn-hover-effect"
              data-testid="landing-login-btn"
            >
              Enter
              <ArrowRight className="ml-3 h-5 w-5" />
            </Button>
          </div>
          
          <p className="text-xs text-white/30 mt-8 animate-fade-in stagger-4">
            Sign in with Google • Invite-only community
          </p>
        </div>
      </div>

      {/* Culture Pillars */}
      <div className="border-t border-white/10 py-8 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 text-center">
          <div className="animate-fade-in stagger-2">
            <p className="font-display text-xs text-white/40 tracking-widest uppercase mb-1">The Block</p>
            <p className="text-[10px] text-white/20">Public Feed</p>
          </div>
          <div className="animate-fade-in stagger-3">
            <p className="font-display text-xs text-white/40 tracking-widest uppercase mb-1">The Cookout</p>
            <p className="text-[10px] text-white/20">Vetted Circles</p>
          </div>
          <div className="animate-fade-in stagger-4">
            <p className="font-display text-xs text-white/40 tracking-widest uppercase mb-1">The Stoop</p>
            <p className="text-[10px] text-white/20">Live Audio</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-4 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-white/20 tracking-wider">
            © 2025 BLVX. Culture first.
          </p>
          <div className="flex items-center gap-2 text-[10px] text-white/20">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span>Bonita Online</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
