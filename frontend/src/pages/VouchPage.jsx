import { useState, useEffect } from 'react';
import { Ticket, Copy, CheckCircle, Users, Gift, AlertCircle, Loader2 } from 'lucide-react';
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
  const [plates, setPlates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    fetchPlates();
  }, []);

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

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const activePlates = plates.filter(p => !p.used);
  const usedPlates = plates.filter(p => p.used);

  return (
    <div className="pb-safe px-4 py-6 max-w-2xl mx-auto" data-testid="vouch-page">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Ticket className="h-6 w-6 text-white" />
          <h1 className="font-display text-2xl tracking-widest uppercase">The Vouch</h1>
        </div>
        <p className="text-white/50 text-sm">
          BLVX is invite-only. Use your plates to bring people into the culture.
        </p>
      </div>

      {/* Plates Balance */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Your Plates</p>
            <p className="text-4xl font-display text-white">{user?.plates_remaining || 0}</p>
            <p className="text-white/50 text-xs mt-1">remaining to give</p>
          </div>
          <Button
            onClick={createPlate}
            disabled={creating || (user?.plates_remaining || 0) <= 0}
            className="bg-white text-black hover:bg-white/90 rounded-none font-display tracking-wider"
            data-testid="create-plate-btn"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Gift className="h-4 w-4 mr-2" />
                Create Plate
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
              <p className="text-white/50 text-xs">Welcomed by the community</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Redeem Section */}
      {!user?.vouched_by && (
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-sm font-display tracking-widest uppercase">Got a Plate Code?</CardTitle>
            <CardDescription>Enter a code from someone who vouched for you</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={redeemPlate} className="flex gap-2">
              <Input
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX"
                className="bg-transparent border-white/20 focus:border-white rounded-none uppercase tracking-widest"
                maxLength={9}
                data-testid="redeem-code-input"
              />
              <Button
                type="submit"
                disabled={redeeming || !redeemCode.trim()}
                className="bg-white text-black hover:bg-white/90 rounded-none"
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
          <h2 className="font-display text-xs tracking-widest uppercase text-white/40 mb-3">
            Active Plates ({activePlates.length})
          </h2>
          <div className="space-y-2">
            {activePlates.map((plate) => (
              <Card key={plate.code} className="bg-white/5 border-white/10">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center">
                      <Ticket className="h-5 w-5 text-white/60" />
                    </div>
                    <div>
                      <p className="font-mono text-lg tracking-widest text-white">{plate.code}</p>
                      <p className="text-white/40 text-xs">
                        Created {new Date(plate.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyCode(plate.code)}
                    className="text-white/60 hover:text-white"
                    data-testid={`copy-${plate.code}`}
                  >
                    {copiedCode === plate.code ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Used Plates */}
      {usedPlates.length > 0 && (
        <div>
          <h2 className="font-display text-xs tracking-widest uppercase text-white/40 mb-3">
            Redeemed Plates ({usedPlates.length})
          </h2>
          <div className="space-y-2">
            {usedPlates.map((plate) => (
              <Card key={plate.code} className="bg-white/5 border-white/10 opacity-60">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-white/20">
                      <AvatarFallback className="bg-white/10 text-xs">
                        {plate.redeemed_by?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white/60 text-sm line-through">{plate.code}</p>
                      <p className="text-white/40 text-xs">
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
          <Users className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50 text-sm mb-2">No plates created yet</p>
          <p className="text-white/30 text-xs">Create a plate to invite someone to BLVX</p>
        </div>
      )}

      {/* How It Works */}
      <Card className="bg-white/5 border-white/10 mt-8">
        <CardHeader>
          <CardTitle className="text-xs font-display tracking-widest uppercase flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            How The Vouch Works
          </CardTitle>
        </CardHeader>
        <CardContent className="text-white/50 text-xs space-y-2">
          <p>• You start with <strong className="text-white">3 Plates</strong> to share</p>
          <p>• Create a plate and share the code with someone you trust</p>
          <p>• They redeem it to join BLVX with your vouch</p>
          <p>• Your reputation is tied to who you vouch for</p>
          <p>• Earn more plates by being an active, positive member</p>
        </CardContent>
      </Card>
    </div>
  );
}
