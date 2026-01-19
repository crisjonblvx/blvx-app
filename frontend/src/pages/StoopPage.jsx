import { useState, useEffect, useCallback } from 'react';
import { Radio, Users, Plus, Mic, MicOff, PhoneOff, AlertCircle, Wifi, WifiOff, Volume2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { useWebRTC } from '@/hooks/useWebRTC';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function StoopPage() {
  const { user } = useAuth();
  const [stoops, setStoops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newStoopTitle, setNewStoopTitle] = useState('');
  const [activeStoopId, setActiveStoopId] = useState(null);
  const [activeStoopData, setActiveStoopData] = useState(null);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [micError, setMicError] = useState(null);
  const [peerMicStatus, setPeerMicStatus] = useState({}); // Track who is speaking
  const [localMicStream, setLocalMicStream] = useState(null); // Local mic fallback when WebSocket fails

  // WebRTC hook for real-time audio
  const {
    isConnected: wsConnected,
    peers,
    isMuted,
    connectionError,
    connect: connectWebRTC,
    disconnect: disconnectWebRTC,
    toggleMute
  } = useWebRTC({
    stoopId: activeStoopId,
    userId: user?.user_id,
    onPeerJoined: (data) => {
      console.log('[Stoop] Peer joined:', data);
      toast.success(`${data.name || data.username} joined the Stoop`);
      // Refresh stoop data
      if (activeStoopId) {
        fetchStoopData(activeStoopId);
      }
    },
    onPeerLeft: (data) => {
      console.log('[Stoop] Peer left:', data.user_id);
      // Refresh stoop data
      if (activeStoopId) {
        fetchStoopData(activeStoopId);
      }
    },
    onMicStatusChange: (data) => {
      console.log('[Stoop] Mic status change:', data);
      setPeerMicStatus(prev => ({
        ...prev,
        [data.user_id]: !data.is_muted
      }));
    }
  });

  useEffect(() => {
    fetchStoops();
  }, []);

  // Connect WebRTC when joining a stoop
  useEffect(() => {
    if (activeStoopId && user?.user_id) {
      console.log('[Stoop] Connecting WebRTC for stoop:', activeStoopId);
      connectWebRTC();
    }
  }, [activeStoopId, user?.user_id, connectWebRTC]);

  const fetchStoops = async () => {
    try {
      const response = await axios.get(`${API}/stoop/live`, { withCredentials: true });
      setStoops(response.data);
    } catch (error) {
      console.error('Error fetching stoops:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStoopData = async (stoopId) => {
    try {
      const response = await axios.get(`${API}/stoop/${stoopId}`, { withCredentials: true });
      setActiveStoopData(response.data);
      setIsSpeaker(response.data.speakers.includes(user.user_id));
    } catch (error) {
      console.error('Error fetching stoop data:', error);
    }
  };

  const createStoop = async () => {
    if (!newStoopTitle.trim()) return;
    
    try {
      const response = await axios.post(`${API}/stoop/create`, {
        title: newStoopTitle.trim()
      }, { withCredentials: true });
      
      setStoops([response.data, ...stoops]);
      setCreateOpen(false);
      setNewStoopTitle('');
      toast.success('Stoop started!');
      
      // Auto-join the stoop
      joinStoop(response.data.stoop_id);
    } catch (error) {
      toast.error('Failed to create Stoop');
    }
  };

  const joinStoop = async (stoopId) => {
    try {
      await axios.post(`${API}/stoop/${stoopId}/join`, {}, { withCredentials: true });
      const response = await axios.get(`${API}/stoop/${stoopId}`, { withCredentials: true });
      setActiveStoopId(stoopId);
      setActiveStoopData(response.data);
      setIsSpeaker(response.data.speakers.includes(user.user_id));
      setMicError(null);
    } catch (error) {
      toast.error('Failed to join Stoop');
    }
  };

  const leaveStoop = async () => {
    if (!activeStoopId) return;
    
    // Disconnect WebRTC
    disconnectWebRTC();
    
    // Stop local mic if active
    if (localMicStream) {
      localMicStream.getTracks().forEach(track => track.stop());
      setLocalMicStream(null);
    }
    
    try {
      await axios.post(`${API}/stoop/${activeStoopId}/leave`, {}, { withCredentials: true });
      setActiveStoopId(null);
      setActiveStoopData(null);
      setIsSpeaker(false);
      setPeerMicStatus({});
      fetchStoops();
    } catch (error) {
      toast.error('Failed to leave Stoop');
    }
  };

  const endStoop = async () => {
    if (!activeStoopId || activeStoopData?.host_id !== user.user_id) return;
    
    // Disconnect WebRTC
    disconnectWebRTC();
    
    // Stop local mic if active
    if (localMicStream) {
      localMicStream.getTracks().forEach(track => track.stop());
      setLocalMicStream(null);
    }
    
    try {
      await axios.post(`${API}/stoop/${activeStoopId}/end`, {}, { withCredentials: true });
      setActiveStoopId(null);
      setActiveStoopData(null);
      fetchStoops();
      toast.success('Stoop ended');
    } catch (error) {
      toast.error('Failed to end Stoop');
    }
  };

  const handleToggleMic = useCallback(async () => {
    if (!isSpeaker) {
      toast.error('You need to be a speaker to use the mic');
      return;
    }
    
    setMicError(null);
    
    try {
      // Always try WebRTC first - it handles everything
      await toggleMute();
      
      if (isMuted) {
        toast.success('Microphone activated - You\'re live!');
      } else {
        toast.success('Microphone muted');
      }
    } catch (error) {
      console.error('[Stoop] Mic toggle error:', error);
      let errorMsg = 'Microphone access denied. Check your browser settings.';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMsg = 'Microphone access denied. Check your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMsg = 'No microphone found. Please connect a microphone.';
      } else if (error.name === 'NotReadableError') {
        errorMsg = 'Microphone is already in use by another application.';
      }
      
      setMicError(errorMsg);
      toast.error(errorMsg, {
        icon: <AlertCircle className="h-4 w-4" />,
        duration: 5000,
      });
    }
  }, [isSpeaker, isMuted, toggleMute]);

  // Check if a speaker is currently live
  const isSpeakerLive = (speakerUserId) => {
    if (speakerUserId === user.user_id) {
      return !isMuted;
    }
    return peerMicStatus[speakerUserId] || false;
  };
  
  // Determine if local user has mic active
  const isLocalMicActive = !isMuted;

  return (
    <div className="mb-safe" data-testid="stoop-page">
      {/* Header */}
      <div className="sticky top-14 md:top-0 z-30 glass border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio className="h-5 w-5 text-white" />
            <h1 className="font-display text-sm tracking-widest uppercase">The Stoop</h1>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            size="sm"
            className="bg-white text-black hover:bg-white/90 rounded-none text-xs font-display tracking-wider"
            data-testid="create-stoop-btn"
          >
            <Plus className="h-3.5 w-3.5 mr-2" />
            Start
          </Button>
        </div>
        <p className="text-[10px] text-white/40 mt-2">Live audio rooms anchored to the culture</p>
      </div>

      {/* Active Stoop */}
      {activeStoopData && (
        <div className="p-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Live Now</p>
              <h2 className="font-display text-lg">{activeStoopData.title}</h2>
            </div>
            <div className="flex items-center gap-2">
              {wsConnected ? (
                <Wifi className="h-3 w-3 text-green-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-500" />
              )}
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs text-white/50">LIVE</span>
            </div>
          </div>
          
          {/* Connection Status */}
          {connectionError && (
            <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>Connection error: {connectionError}</span>
            </div>
          )}
          
          {/* Speakers */}
          <div className="mb-4">
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Speakers</p>
            <div className="flex flex-wrap gap-3">
              {activeStoopData.speaker_details?.map((speaker) => (
                <div key={speaker.user_id} className="flex flex-col items-center">
                  <div className="relative">
                    <Avatar className={cn(
                      "h-12 w-12 border-2 transition-all duration-300",
                      isSpeakerLive(speaker.user_id)
                        ? "border-green-500 shadow-lg shadow-green-500/30 ring-2 ring-green-500/20" 
                        : "border-white/30"
                    )}>
                      <AvatarImage src={speaker.picture} />
                      <AvatarFallback className="bg-white/10 text-sm">{speaker.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {isSpeakerLive(speaker.user_id) && (
                      <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
                        <Volume2 className="h-2.5 w-2.5 text-black" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-white/60 mt-1">{speaker.name?.split(' ')[0]}</span>
                  {isSpeakerLive(speaker.user_id) && (
                    <span className="text-[8px] text-green-500 mt-0.5 animate-pulse">LIVE</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Listeners */}
          {activeStoopData.listeners?.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">
                Listening ({activeStoopData.listeners?.length || 0})
              </p>
              <div className="flex -space-x-2">
                {activeStoopData.listeners?.slice(0, 8).map((listenerId, idx) => (
                  <Avatar key={listenerId} className="h-8 w-8 border-2 border-black">
                    <AvatarFallback className="bg-white/10 text-xs">{idx + 1}</AvatarFallback>
                  </Avatar>
                ))}
                {activeStoopData.listeners?.length > 8 && (
                  <div className="h-8 w-8 rounded-full bg-white/10 border-2 border-black flex items-center justify-center text-[10px]">
                    +{activeStoopData.listeners.length - 8}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Mic Error Message */}
          {micError && (
            <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{micError}</span>
            </div>
          )}
          
          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleMic}
              disabled={!isSpeaker}
              className={cn(
                "flex-1 text-xs transition-all",
                isLocalMicActive
                  ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                  : isSpeaker 
                    ? "bg-white/10 text-white hover:bg-white/20" 
                    : "text-white/50"
              )}
              data-testid="stoop-mic-btn"
            >
              {isLocalMicActive ? (
                <>
                  <Mic className="h-4 w-4 mr-2 animate-pulse" />
                  On Mic
                </>
              ) : (
                <>
                  <MicOff className="h-4 w-4 mr-2" />
                  {isSpeaker ? 'Turn On Mic' : 'Listening'}
                </>
              )}
            </Button>
            <Button
              onClick={leaveStoop}
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-400 text-xs"
              data-testid="stoop-leave-btn"
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              Leave
            </Button>
            {activeStoopData.host_id === user.user_id && (
              <Button
                onClick={endStoop}
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-400 text-xs"
                data-testid="stoop-end-btn"
              >
                End Stoop
              </Button>
            )}
          </div>
          
          {/* WebRTC Status Debug */}
          <div className="mt-3 text-[10px] text-white/30">
            {wsConnected ? '🟢 Connected' : '🔴 Disconnected'} • 
            {Object.keys(peers).length} peer(s) • 
            {isSpeaker ? 'Speaker' : 'Listener'}
          </div>
        </div>
      )}

      {/* Stoop List */}
      {loading ? (
        <div className="p-4 space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : stoops.length === 0 ? (
        <div className="text-center py-16 px-6">
          <Radio className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50 text-sm mb-2">No Stoops live right now</p>
          <p className="text-white/30 text-xs">Start one and gather the people</p>
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          {stoops.map((stoop) => (
            <div 
              key={stoop.stoop_id}
              className="p-4 hover:bg-white/5 cursor-pointer transition-colors"
              onClick={() => joinStoop(stoop.stoop_id)}
              data-testid={`stoop-${stoop.stoop_id}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-white text-sm">{stoop.title}</h3>
                  <p className="text-xs text-white/50">Hosted by {stoop.host?.name}</p>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-white/40">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  LIVE
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-white/40">
                <span className="flex items-center gap-1">
                  <Mic className="h-3 w-3" />
                  {stoop.speaker_count || 1} speaking
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {stoop.listener_count || 0} listening
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Stoop Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-black border border-white/20 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-display text-sm tracking-widest uppercase">Start a Stoop</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              value={newStoopTitle}
              onChange={(e) => setNewStoopTitle(e.target.value)}
              placeholder="What's the topic?"
              className="bg-transparent border-white/20 focus:border-white rounded-none"
              data-testid="stoop-title-input"
            />
            <Button
              onClick={createStoop}
              disabled={!newStoopTitle.trim()}
              className="w-full bg-white text-black hover:bg-white/90 rounded-none font-display tracking-wider"
              data-testid="create-stoop-submit"
            >
              Go Live
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
