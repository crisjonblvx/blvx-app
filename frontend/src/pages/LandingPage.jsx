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
        {/* Background texture */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1763311159952-3afa0ee330c2?crop=entropy&cs=srgb&fm=jpg&q=85')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-black" />
        
        <div className="relative z-10 text-center max-w-2xl mx-auto">
          {/* Logo */}
          <h1 
            className="font-display text-6xl sm:text-7xl lg:text-8xl font-bold tracking-wider mb-6 animate-fade-in"
            data-testid="landing-logo"
          >
            BLVX
          </h1>
          
          {/* Tagline */}
          <p className="text-lg sm:text-xl text-white/60 mb-4 animate-fade-in stagger-1">
            The Digital Neighborhood
          </p>
          
          <p className="text-sm sm:text-base text-white/40 max-w-md mx-auto mb-12 animate-fade-in stagger-2">
            A Black-first, culture-native social network. Context over virality. Community over algorithms.
          </p>
          
          {/* CTA */}
          <div className="animate-fade-in stagger-3">
            <Button
              onClick={login}
              size="lg"
              className="bg-white text-black hover:bg-white/90 rounded-sm px-8 py-6 text-base font-display tracking-wider uppercase btn-hover-effect"
              data-testid="landing-login-btn"
            >
              Enter the Neighborhood
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
          
          <p className="text-xs text-white/30 mt-6 animate-fade-in stagger-4">
            Sign in with Google to get started
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">
            © 2025 BLVX. Culture first. Scale second.
          </p>
          <div className="flex items-center gap-4 text-xs text-white/30">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Bonita Online
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
