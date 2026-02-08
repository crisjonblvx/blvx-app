import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useThemeClasses } from '@/hooks/useTheme';
import { Ticket, Copy, CheckCircle, Users, Gift, AlertCircle, Loader2, Share2, Link } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '@/lib/utils';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function VouchPage() {
  const { user, checkAuth } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [plates, setPlates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const { isDark, textClass, textMutedClass, textVeryMutedClass, borderClass, hoverBgClass } = useThemeClasses();

  useEffect(() => {
    fetchPlates();
  }, []);

  // Check for redeem code in URL
  useEffect(() => {
    const redeemParam = searchParams.get('redeem');
    if (redeemParam) {
      setRedeemCode(redeemParam.toUpperCase());
      // Clear the URL param
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const fetchPlates = async () => {
    try {
      const response = await axios.get(`${API}/vouch/plate/my-plates`, { withCredentials: true });
      setPlates(response.data);
    } catch (error) {
      console.error('Error fetching plates:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPlate = async () => {
    if (user.plates_remaining <= 0) {
      toast.error('No plates remaining. You need to earn more vouches!');
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post(`${API}/vouch/plate/create`, {}, { withCredentials: true });
      toast.success('Plate created! Share the code to invite someone.');
      setPlates([response.data, ...plates]);
      checkAuth(); // Refresh user to update plates_remaining
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create plate');
    } finally {
      setCreating(false);
    }
  };

  const redeemPlate = async (e) => {
    e.preventDefault();
    if (!redeemCode.trim()) {
      toast.error('Please enter a plate code');
      return;
    }

    setRedeeming(true);
    try {
      await axios.post(`${API}/vouch/plate/redeem?code=${encodeURIComponent(redeemCode.toUpperCase())}`, {}, { withCredentials: true });
      toast.success('Plate redeemed! You\'re now vouched for.');
      setRedeemCode('');
      checkAuth(); // Refresh user
    } catch (error) {
      // Handle error message - could be string or object
      const errorDetail = error.response?.data?.detail;
      const errorMessage = typeof errorDetail === 'string' ? errorDetail : 'Invalid plate code';
      toast.error(errorMessage);
    } finally {
      setRedeeming(false);
    }
  };

  const isFounder = user?.is_admin || false;
  
  const getInviteLink = (code) => {
    // Founder gets special invite link
    if (isFounder) {
      return `https://blvx.social/founder/${code}`;
    }
    return `https://blvx.social/invite/${code}`;
  };

  const copyLink = (code) => {
    const link = getInviteLink(code);
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    toast.success(isFounder ? 'Founder invite link copied!' : 'Invite link copied!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const shareLink = async (code) => {
    const link = getInviteLink(code);
    const shareText = isFounder 
      ? `You've been personally invited to BLVX by the founder. Join the culture: ${link}`
      : `You're invited to BLVX — a high-context social network built for the culture. Join with my invite: ${link}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: isFounder ? 'Founder Invite to BLVX' : 'Join BLVX',
          text: shareText,
          url: link
        });
      } catch (err) {
        // User cancelled or error - fall back to copy
        copyLink(code);
      }
    } else {
      // No native share - just copy
      copyLink(code);
    }
  };

  const activePlates = plates.filter(p => !p.used);
  const usedPlates = plates.filter(p => p.used);

  return (
    <div className="pb-safe px-4 py-6 max-w-2xl mx-auto" data-testid="vouch-page">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Ticket className={cn("h-6 w-6", textClass)} />
          <h1 className={cn("font-display text-2xl tracking-widest uppercase", textClass)}>
            {isFounder ? 'Founder Invites' : 'The Vouch'}
          </h1>
          {isFounder && (
            <span className="bg-amber-500 text-black text-[10px] px-2 py-0.5 font-display tracking-wider">
              FOUNDER
            </span>
          )}
        </div>
        <p className={cn("text-sm", textMutedClass)}>
          {isFounder 
            ? "Your personal invites carry the founder's stamp. Those you invite become Day Ones."
            : "BLVX is invite-only. Use your plates to bring people into the culture."}
        </p>
      </div>

      {/* Plates Balance */}
      <Card className={cn("mb-6", isFounder ? "bg-amber-500/10 border-amber-500/30" : isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200")}>
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className={cn("text-xs uppercase tracking-wider mb-1", isFounder ? "text-amber-500" : textVeryMutedClass)}>
              {isFounder ? 'Founder Invites' : 'Your Plates'}
            </p>
            <p className={cn("text-4xl font-display", isFounder ? "text-amber-500" : textClass)}>
              {isFounder ? '∞' : (user?.plates_remaining || 0)}
            </p>
            <p className={cn("text-xs mt-1", textMutedClass)}>
              {isFounder ? 'unlimited invites' : 'remaining to give'}
            </p>
          </div>
          <Button
            onClick={createPlate}
            disabled={creating || (!isFounder && (user?.plates_remaining || 0) <= 0)}
            className={cn("rounded-none font-display tracking-wider", isFounder ? "bg-amber-500 text-black hover:bg-amber-400" : isDark ? "bg-white text-black hover:bg-white/90" : "bg-black text-white hover:bg-black/90")}
            data-testid="create-plate-btn"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Gift className="h-4 w-4 mr-2" />
                {isFounder ? 'Create Founder Invite' : 'Create Plate'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Vouch Status */}
      {user?.vouched_by && (
        <Card className="bg-green-500/10 border-green-500/30 mb-6">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-green-400 text-sm">You've been vouched for</p>
              <p className={cn("text-xs", textMutedClass)}>Welcomed by the community</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Redeem Section */}
      {!user?.vouched_by && (
        <Card className={cn("mb-6", isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200")}>
          <CardHeader>
            <CardTitle className={cn("text-sm font-display tracking-widest uppercase", textClass)}>Got a Plate Code?</CardTitle>
            <CardDescription>Enter a code from someone who vouched for you</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={redeemPlate} className="flex gap-2">
              <Input
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX"
                className={cn("bg-transparent rounded-none uppercase tracking-widest", isDark ? "border-white/20 focus:border-white" : "border-gray-300 focus:border-gray-900")}
                maxLength={9}
                data-testid="redeem-code-input"
              />
              <Button
                type="submit"
                disabled={redeeming || !redeemCode.trim()}
                className={cn("rounded-none", isDark ? "bg-white text-black hover:bg-white/90" : "bg-black text-white hover:bg-black/90")}
                data-testid="redeem-btn"
              >
                {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Redeem'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Active Plates */}
      {activePlates.length > 0 && (
        <div className="mb-6">
          <h2 className={cn("font-display text-xs tracking-widest uppercase mb-3", isFounder ? "text-amber-500" : textVeryMutedClass)}>
            {isFounder ? `Active Founder Invites (${activePlates.length})` : `Active Plates (${activePlates.length})`}
          </h2>
          <div className="space-y-3">
            {activePlates.map((plate) => (
              <Card key={plate.code} className={cn(isFounder ? "bg-amber-500/5 border-amber-500/20" : isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200")}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded flex items-center justify-center", isFounder ? "bg-amber-500/20" : isDark ? "bg-white/10" : "bg-gray-200")}>
                        <Ticket className={cn("h-5 w-5", isFounder ? "text-amber-500" : isDark ? "text-white/60" : "text-gray-600")} />
                      </div>
                      <div>
                        <p className={cn("font-mono text-lg tracking-widest", textClass)}>{plate.code}</p>
                        <p className={cn("text-xs", textVeryMutedClass)}>
                          Created {new Date(plate.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {isFounder && (
                      <span className="bg-amber-500 text-black text-[9px] px-2 py-0.5 font-display tracking-wider">
                        FOUNDER
                      </span>
                    )}
                  </div>
                  
                  {/* Invite Link */}
                  <div className={cn("flex items-center gap-2 p-2 rounded text-xs font-mono mb-3", isDark ? "bg-black/50" : "bg-gray-100")}>
                    <Link className={cn("h-3 w-3 flex-shrink-0", textMutedClass)} />
                    <span className={cn("truncate", textMutedClass)}>{getInviteLink(plate.code)}</span>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyLink(plate.code)}
                      className={cn("flex-1 rounded-none text-xs", isFounder ? "border-amber-500/50 text-amber-500 hover:bg-amber-500/10" : "")}
                      data-testid={`copy-${plate.code}`}
                    >
                      {copiedCode === plate.code ? (
                        <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3 mr-2" />
                      )}
                      Copy Link
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => shareLink(plate.code)}
                      className={cn("flex-1 rounded-none text-xs", isFounder ? "bg-amber-500 text-black hover:bg-amber-400" : isDark ? "bg-white text-black hover:bg-white/90" : "bg-black text-white hover:bg-black/90")}
                      data-testid={`share-${plate.code}`}
                    >
                      <Share2 className="h-3 w-3 mr-2" />
                      Share
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Used Plates */}
      {usedPlates.length > 0 && (
        <div>
          <h2 className={cn("font-display text-xs tracking-widest uppercase mb-3", textVeryMutedClass)}>
            Redeemed Plates ({usedPlates.length})
          </h2>
          <div className="space-y-2">
            {usedPlates.map((plate) => (
              <Card key={plate.code} className={cn("opacity-60", isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200")}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className={cn("h-10 w-10 border", isDark ? "border-white/20" : "border-gray-300")}>
                      <AvatarFallback className={cn("text-xs", isDark ? "bg-white/10" : "bg-gray-200")}>
                        {plate.redeemed_by?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className={cn("text-sm line-through", isDark ? "text-white/60" : "text-gray-500")}>{plate.code}</p>
                      <p className={cn("text-xs", textVeryMutedClass)}>
                        Redeemed {plate.redeemed_at ? new Date(plate.redeemed_at).toLocaleDateString() : 'recently'}
                      </p>
                    </div>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-500/50" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && plates.length === 0 && (
        <div className="text-center py-8">
          <Users className={cn("h-12 w-12 mx-auto mb-4", isDark ? "text-white/20" : "text-gray-300")} />
          <p className={cn("text-sm mb-2", textMutedClass)}>No plates created yet</p>
          <p className={cn("text-xs", isDark ? "text-white/30" : "text-gray-400")}>Create a plate to invite someone to BLVX</p>
        </div>
      )}

      {/* How It Works */}
      <Card className={cn("mt-8", isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200")}>
        <CardHeader>
          <CardTitle className={cn("text-xs font-display tracking-widest uppercase flex items-center gap-2", textClass)}>
            <AlertCircle className="h-4 w-4" />
            How The Vouch Works
          </CardTitle>
        </CardHeader>
        <CardContent className={cn("text-xs space-y-2", textMutedClass)}>
          <p>• You start with <strong className={textClass}>3 Plates</strong> to share</p>
          <p>• Create a plate and share the code with someone you trust</p>
          <p>• They redeem it to join BLVX with your vouch</p>
          <p>• Your reputation is tied to who you vouch for</p>
          <p>• Earn more plates by being an active, positive member</p>
        </CardContent>
      </Card>
    </div>
  );
}
