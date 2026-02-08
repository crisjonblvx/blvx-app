import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Ticket, Crown, Loader2, Copy, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function InvitePage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(5);
  
  // Check if this is a founder invite based on the URL path
  const isFounderInvite = location.pathname.startsWith('/founder/');

  // Copy code to clipboard
  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Continue to signup/redeem
  const handleContinue = () => {
    if (user) {
      navigate(`/vouch?redeem=${code}`, { replace: true });
    } else {
      navigate(`/?invite=${code}${isFounderInvite ? '&founder=true' : ''}`, { replace: true });
    }
  };

  // Countdown and auto-redirect
  useEffect(() => {
    if (loading) return;
    
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleContinue();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        {/* Icon */}
        <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${isFounderInvite ? 'bg-amber-500/20' : 'bg-white/10'}`}>
          {isFounderInvite ? (
            <Crown className="h-10 w-10 text-amber-500" />
          ) : (
            <Ticket className="h-10 w-10 text-white/60" />
          )}
        </div>
        
        {/* Message */}
        <h1 className="font-display text-2xl tracking-widest uppercase text-white mb-2">
          {isFounderInvite ? "Founder's Invite" : "You're Invited"}
        </h1>
        
        <p className="text-white/60 text-sm mb-6 max-w-xs mx-auto">
          {isFounderInvite 
            ? "You've been personally invited to BLVX by the founder."
            : "Someone vouched for you to join BLVX."
          }
        </p>
        
        {/* Code Display */}
        <div className={`inline-block px-6 py-4 mb-4 ${isFounderInvite ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-white/5 border border-white/10'}`}>
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Your Invite Code</p>
          <p className={`font-mono text-2xl tracking-widest ${isFounderInvite ? 'text-amber-500' : 'text-white'}`}>
            {code}
          </p>
        </div>

        {/* Copy Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyCode}
            className="text-white/50 hover:text-white hover:bg-white/10"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Code
              </>
            )}
          </Button>
        </div>

        {/* Info text */}
        <p className="text-white/30 text-xs mb-6">
          This code will be saved automatically. You can also copy it just in case.
        </p>
        
        {/* Continue Button */}
        <Button
          onClick={handleContinue}
          className={`w-full mb-4 rounded-none ${isFounderInvite ? 'bg-amber-500 hover:bg-amber-400 text-black' : 'bg-white hover:bg-white/90 text-black'}`}
        >
          {user ? 'Redeem Code' : 'Create Account'}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
        
        {/* Auto-redirect countdown */}
        <div className="flex items-center justify-center gap-2 text-white/30">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-xs">Auto-continuing in {countdown}s...</span>
        </div>
      </div>
    </div>
  );
}
