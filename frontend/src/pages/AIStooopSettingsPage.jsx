import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, DoorOpen, Save, Loader2, Eye, Clock, Share2, MessageSquare, Trash2, History } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useThemeClasses } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '@/lib/utils';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PERSONALITY_OPTIONS = [
  { value: 'warm', label: 'Warm', description: 'Friendly and welcoming' },
  { value: 'professional', label: 'Professional', description: 'Polished and business-like' },
  { value: 'playful', label: 'Playful', description: 'Fun and casual' },
  { value: 'chill', label: 'Chill', description: 'Laid back and relaxed' },
];

export default function AIStooopSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark, textClass, textMutedClass, borderClass } = useThemeClasses();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    enabled: true,
    greeting: '',
    personality: 'warm',
    topics_encouraged: [],
    topics_deflected: [],
    allow_sharing: true,
    max_session_minutes: 60
  });
  const [topicsInput, setTopicsInput] = useState('');
  const [deflectedInput, setDeflectedInput] = useState('');
  const [pendingShares, setPendingShares] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [showSessions, setShowSessions] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      if (!user) return;
      
      try {
        // Fetch stoop config
        const response = await axios.get(
          `${API}/ai-stoop/config/${user.username}`,
          { withCredentials: true }
        );
        
        setConfig(prev => ({
          ...prev,
          enabled: response.data.enabled ?? true,
          greeting: response.data.greeting || `Hey! Welcome to ${user.name || user.username}'s stoop. What brings you by?`,
          personality: response.data.personality || 'warm'
        }));

        // Fetch full config if available
        try {
          const fullConfig = await axios.get(
            `${API}/ai-stoop/config`,
            { withCredentials: true }
          );
          if (fullConfig.data) {
            setConfig(fullConfig.data);
            setTopicsInput((fullConfig.data.topics_encouraged || []).join(', '));
            setDeflectedInput((fullConfig.data.topics_deflected || []).join(', '));
          }
        } catch (e) {
          // Config might not exist yet, that's ok
        }

        // Fetch pending share requests
        const sharesRes = await axios.get(
          `${API}/ai-stoop/pending-shares`,
          { withCredentials: true }
        );
        setPendingShares(sharesRes.data || []);

        // Fetch sessions (as owner)
        const sessionsRes = await axios.get(
          `${API}/ai-stoop/sessions?role=owner`,
          { withCredentials: true }
        );
        setSessions(sessionsRes.data || []);
      } catch (error) {
        console.error('Error fetching stoop config:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [user]);

  const deleteSession = async (sessionId) => {
    if (!confirm('Delete this stoop session? This cannot be undone.')) return;
    
    try {
      await axios.delete(
        `${API}/ai-stoop/session/${sessionId}`,
        { withCredentials: true }
      );
      setSessions(prev => prev.filter(s => s.session_id !== sessionId));
      toast.success('Session deleted');
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    
    try {
      const topics_encouraged = topicsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
      
      const topics_deflected = deflectedInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      await axios.put(
        `${API}/ai-stoop/config`,
        {
          ...config,
          topics_encouraged,
          topics_deflected
        },
        { withCredentials: true }
      );

      toast.success('Stoop settings saved!');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleShareRequest = async (requestId, approved) => {
    try {
      await axios.post(
        `${API}/ai-stoop/share-request/${requestId}/${approved ? 'approve' : 'reject'}`,
        {},
        { withCredentials: true }
      );
      
      setPendingShares(prev => prev.filter(r => r.request_id !== requestId));
      toast.success(approved ? 'Posted to your Block!' : 'Share request declined');
    } catch (error) {
      console.error('Error handling share request:', error);
      toast.error('Failed to process request');
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-safe">
      {/* Header */}
      <div className={cn("sticky top-14 md:top-0 z-40 glass border-b p-4", borderClass)}>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className={cn("font-display text-xl font-semibold tracking-wide", textClass)}>
              <DoorOpen className="h-5 w-5 inline mr-2" />
              Your Stoop
            </h1>
          </div>
          <Button
            onClick={saveConfig}
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Enable/Disable */}
        <div className={cn("p-4 rounded-xl border", borderClass, isDark ? "bg-white/5" : "bg-gray-50")}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={cn("font-semibold", textClass)}>Stoop Open</h3>
              <p className={cn("text-sm", textMutedClass)}>Allow people to visit your stoop</p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
            />
          </div>
        </div>

        {/* Greeting */}
        <div className={cn("p-4 rounded-xl border space-y-3", borderClass, isDark ? "bg-white/5" : "bg-gray-50")}>
          <div>
            <h3 className={cn("font-semibold", textClass)}>Greeting Message</h3>
            <p className={cn("text-sm", textMutedClass)}>What visitors see when they arrive</p>
          </div>
          <Textarea
            value={config.greeting}
            onChange={(e) => setConfig(prev => ({ ...prev, greeting: e.target.value }))}
            placeholder="Hey! Welcome to my stoop..."
            className={cn(
              "min-h-[100px] bg-transparent border-white/10",
              isDark ? "text-white" : "text-black"
            )}
          />
        </div>

        {/* Personality */}
        <div className={cn("p-4 rounded-xl border space-y-3", borderClass, isDark ? "bg-white/5" : "bg-gray-50")}>
          <div>
            <h3 className={cn("font-semibold", textClass)}>AI Personality</h3>
            <p className={cn("text-sm", textMutedClass)}>How your AI talks to visitors</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PERSONALITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setConfig(prev => ({ ...prev, personality: option.value }))}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all",
                  config.personality === option.value
                    ? "border-amber-500 bg-amber-500/10"
                    : cn(borderClass, "hover:border-white/30")
                )}
              >
                <p className={cn("font-medium text-sm", textClass)}>{option.label}</p>
                <p className={cn("text-xs", textMutedClass)}>{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Topics */}
        <div className={cn("p-4 rounded-xl border space-y-3", borderClass, isDark ? "bg-white/5" : "bg-gray-50")}>
          <div>
            <h3 className={cn("font-semibold", textClass)}>Topics to Encourage</h3>
            <p className={cn("text-sm", textMutedClass)}>What you're happy to talk about (comma-separated)</p>
          </div>
          <Input
            value={topicsInput}
            onChange={(e) => setTopicsInput(e.target.value)}
            placeholder="music, tech, creative projects..."
            className={cn("bg-transparent border-white/10", isDark ? "text-white" : "text-black")}
          />
        </div>

        <div className={cn("p-4 rounded-xl border space-y-3", borderClass, isDark ? "bg-white/5" : "bg-gray-50")}>
          <div>
            <h3 className={cn("font-semibold", textClass)}>Topics to Deflect</h3>
            <p className={cn("text-sm", textMutedClass)}>Things your AI should steer away from</p>
          </div>
          <Input
            value={deflectedInput}
            onChange={(e) => setDeflectedInput(e.target.value)}
            placeholder="personal finances, family..."
            className={cn("bg-transparent border-white/10", isDark ? "text-white" : "text-black")}
          />
        </div>

        {/* Sharing */}
        <div className={cn("p-4 rounded-xl border", borderClass, isDark ? "bg-white/5" : "bg-gray-50")}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={cn("font-semibold flex items-center gap-2", textClass)}>
                <Share2 className="h-4 w-4" />
                Allow Sharing
              </h3>
              <p className={cn("text-sm", textMutedClass)}>Let visitors request to share conversations</p>
            </div>
            <Switch
              checked={config.allow_sharing}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, allow_sharing: checked }))}
            />
          </div>
        </div>

        {/* Session Duration */}
        <div className={cn("p-4 rounded-xl border space-y-3", borderClass, isDark ? "bg-white/5" : "bg-gray-50")}>
          <div>
            <h3 className={cn("font-semibold flex items-center gap-2", textClass)}>
              <Clock className="h-4 w-4" />
              Max Session Length
            </h3>
            <p className={cn("text-sm", textMutedClass)}>Maximum minutes per visit</p>
          </div>
          <Input
            type="number"
            value={config.max_session_minutes}
            onChange={(e) => setConfig(prev => ({ ...prev, max_session_minutes: parseInt(e.target.value) || 60 }))}
            min={5}
            max={180}
            className={cn("bg-transparent border-white/10 w-32", isDark ? "text-white" : "text-black")}
          />
        </div>

        {/* Pending Share Requests */}
        {pendingShares.length > 0 && (
          <div className={cn("p-4 rounded-xl border space-y-4", borderClass, "border-amber-500/50 bg-amber-500/10")}>
            <div>
              <h3 className={cn("font-semibold flex items-center gap-2", textClass)}>
                <MessageSquare className="h-4 w-4 text-amber-400" />
                Pending Share Requests ({pendingShares.length})
              </h3>
            </div>
            <div className="space-y-3">
              {pendingShares.map((request) => (
                <div
                  key={request.request_id}
                  className={cn("p-3 rounded-lg border", borderClass, isDark ? "bg-black/30" : "bg-white")}
                >
                  <p className={cn("font-medium text-sm", textClass)}>{request.visitor_name}</p>
                  {request.summary && (
                    <p className={cn("text-xs mt-1", textMutedClass)}>{request.summary}</p>
                  )}
                  <p className={cn("text-xs mt-1", textMutedClass)}>
                    {request.duration_minutes} min session
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleShareRequest(request.request_id, false)}
                      className="flex-1"
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleShareRequest(request.request_id, true)}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
                    >
                      Post to Block
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Session History */}
        <div className={cn("p-4 rounded-xl border space-y-3", borderClass, isDark ? "bg-white/5" : "bg-gray-50")}>
          <div className="flex items-center justify-between">
            <h3 className={cn("font-semibold flex items-center gap-2", textClass)}>
              <History className="h-4 w-4" />
              Session History ({sessions.length})
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSessions(!showSessions)}
              className={textMutedClass}
            >
              {showSessions ? 'Hide' : 'Show'}
            </Button>
          </div>
          
          {showSessions && sessions.length > 0 && (
            <div className="space-y-2 mt-3">
              {sessions.map((session) => (
                <div
                  key={session.session_id}
                  className={cn("p-3 rounded-lg border flex items-start justify-between", borderClass, isDark ? "bg-black/20" : "bg-white")}
                >
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-medium text-sm", textClass)}>
                      {session.visitor_name || 'Visitor'}
                    </p>
                    {session.summary && (
                      <p className={cn("text-xs mt-1 line-clamp-2", textMutedClass)}>{session.summary}</p>
                    )}
                    <p className={cn("text-xs mt-1", textMutedClass)}>
                      {session.duration_minutes || 0} min • {session.status === 'ended' ? 'Ended' : 'Active'}
                      {session.shared_to_block && ' • Shared'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSession(session.session_id)}
                    className="text-red-500 hover:text-red-400 hover:bg-red-500/10 ml-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          {showSessions && sessions.length === 0 && (
            <p className={cn("text-sm text-center py-4", textMutedClass)}>
              No sessions yet. Share your stoop link to get visitors!
            </p>
          )}
        </div>

        {/* Preview Link */}
        <div className={cn("p-4 rounded-xl border text-center space-y-3", borderClass, isDark ? "bg-white/5" : "bg-gray-50")}>
          <p className={cn("text-sm", textMutedClass)}>Your stoop link:</p>
          <code className={cn("text-sm font-mono", textClass)}>
            blvx.social/ai-stoop/{user?.username}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/ai-stoop/${user?.username}`);
              toast.success('Link copied!');
            }}
          >
            Copy Link
          </Button>
        </div>
      </div>
    </div>
  );
}
