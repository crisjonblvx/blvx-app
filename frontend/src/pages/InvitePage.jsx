import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Ticket, Crown, Loader2 } from 'lucide-react';

export default function InvitePage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [redirecting, setRedirecting] = useState(true);
  
  // Check if this is a founder invite based on the URL path
  const isFounderInvite = location.pathname.startsWith('/founder/');

  useEffect(() => {
    if (loading) return;
    
    // Small delay to show the invite screen
    const timer = setTimeout(() => {
      if (user) {
        // User is logged in - go to vouch page with code
        navigate(`/vouch?redeem=${code}`, { replace: true });
      } else {
        // User is not logged in - go to landing with invite code
        navigate(`/?invite=${code}${isFounderInvite ? '&founder=true' : ''}`, { replace: true });
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [user, loading, code, navigate, isFounderInvite]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center">
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
        <div className={`inline-block px-6 py-3 mb-6 ${isFounderInvite ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-white/5 border border-white/10'}`}>
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Invite Code</p>
          <p className={`font-mono text-2xl tracking-widest ${isFounderInvite ? 'text-amber-500' : 'text-white'}`}>
            {code}
          </p>
        </div>
        
        {/* Loading */}
        <div className="flex items-center justify-center gap-2 text-white/40">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs uppercase tracking-wider">Preparing your welcome...</span>
        </div>
      </div>
    </div>
  );
}
