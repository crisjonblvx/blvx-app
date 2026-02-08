import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, Loader2, DoorOpen, Share2, Clock, X, Settings, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useThemeClasses } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AIStooopPage() {
  const { username, sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark, textClass, textMutedClass, borderClass } = useThemeClasses();
  
  const [session, setSession] = useState(null);
  const [ownerInfo, setOwnerInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [endSummary, setEndSummary] = useState(null);
  const [allowSharing, setAllowSharing] = useState(true);
  const [shareRequested, setShareRequested] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start or resume a stoop session
  useEffect(() => {
    const initSession = async () => {
      if (!user) {
        navigate('/');
        return;
      }

      try {
        if (sessionId) {
          // Resume existing session
          const response = await axios.get(
            `${API}/ai-stoop/session/${sessionId}`,
            { withCredentials: true }
          );
          setSession(response.data);
          setMessages(response.data.messages || []);
          setSessionEnded(response.data.status === 'ended');
          
          // Fetch owner info
          const ownerRes = await axios.get(
            `${API}/ai-stoop/config/${response.data.owner_username}`,
            { withCredentials: true }
          );
          setOwnerInfo(ownerRes.data);
        } else if (username) {
          // Start new session
          const response = await axios.post(
            `${API}/ai-stoop/visit/${username}`,
            {},
            { withCredentials: true }
          );
          setSession(response.data);
          setOwnerInfo({
            username: response.data.owner_username,
            name: response.data.owner_name,
            greeting: response.data.greeting,
            personality: response.data.personality
          });
          setAllowSharing(response.data.allow_sharing);
          
          // Add greeting as first AI message
          setMessages([{
            role: 'ai',
            content: response.data.greeting,
            timestamp: new Date().toISOString()
          }]);
          
          // Update URL to include session ID
          navigate(`/ai-stoop/session/${response.data.session_id}`, { replace: true });
        }
      } catch (error) {
        console.error('Error starting stoop session:', error);
        toast.error(error.response?.data?.detail || 'Could not start stoop session');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, [username, sessionId, user, navigate]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || sessionEnded) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Optimistically add user message
    const userMsg = {
      role: 'visitor',
      content: messageText,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await axios.post(
        `${API}/ai-stoop/session/${session.session_id}/message`,
        { content: messageText },
        { withCredentials: true }
      );

      // Add AI response
      setMessages(prev => [...prev, response.data.ai_response]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      // Remove the optimistic message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const endSession = async () => {
    if (ending) return;
    setEnding(true);

    try {
      const response = await axios.post(
        `${API}/ai-stoop/session/${session.session_id}/end`,
        {},
        { withCredentials: true }
      );

      setSessionEnded(true);
      setEndSummary(response.data);
      setAllowSharing(response.data.allow_sharing);
      setShowEndModal(true);
    } catch (error) {
      console.error('Error ending session:', error);
      toast.error('Failed to end session');
    } finally {
      setEnding(false);
    }
  };

  const requestShare = async () => {
    try {
      await axios.post(
        `${API}/ai-stoop/session/${session.session_id}/share`,
        {},
        { withCredentials: true }
      );
      setShareRequested(true);
      toast.success('Share request sent to owner!');
    } catch (error) {
      console.error('Error requesting share:', error);
      toast.error(error.response?.data?.detail || 'Failed to request share');
    }
  };

  const deleteSession = async () => {
    // Visitors hide, owners delete
    const isOwner = session?.owner_id === user?.user_id;
    const message = isOwner 
      ? 'Delete this session? This cannot be undone.'
      : 'Hide this session from your history?';
    
    if (!confirm(message)) return;
    
    setDeleting(true);
    try {
      await axios.delete(
        `${API}/ai-stoop/session/${session.session_id}`,
        { withCredentials: true }
      );
      toast.success(isOwner ? 'Session deleted' : 'Session hidden from your history');
      navigate(-1);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong');
    } finally {
      setDeleting(false);
    }
  };

  const formatTime = (dateStr) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: false });
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className={cn("sticky top-0 z-40 glass border-b p-4", borderClass)}>
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
              <Skeleton className="h-16 w-64 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-safe">
      {/* Header */}
      <div className={cn("sticky top-14 md:top-0 z-40 glass border-b p-4", borderClass)}>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <Link to={`/profile/${ownerInfo?.username}`} className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-10 w-10 border border-white/20">
              <AvatarImage src={ownerInfo?.picture} alt={ownerInfo?.name} />
              <AvatarFallback className="bg-amber-500/20 text-amber-500">
                {ownerInfo?.name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className={cn("font-semibold truncate", textClass)}>
                {ownerInfo?.name || ownerInfo?.username}'s Stoop
              </h2>
              <p className={cn("text-xs", textMutedClass)}>
                <DoorOpen className="h-3 w-3 inline mr-1" />
                AI Stoop Session
              </p>
            </div>
          </Link>

          {!sessionEnded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEndModal(true)}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <X className="h-4 w-4 mr-1" />
              End
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              "flex animate-fade-in",
              msg.role === 'visitor' ? "justify-end" : "justify-start"
            )}
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3",
                msg.role === 'visitor'
                  ? "bg-white text-black rounded-br-md"
                  : cn("bg-amber-500/20 rounded-bl-md border border-amber-500/30", isDark ? "text-amber-100" : "text-amber-900")
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <p className={cn(
                "text-[10px] mt-1 opacity-50",
                msg.role === 'visitor' ? "text-gray-600" : (isDark ? "text-amber-300" : "text-amber-700")
              )}>
                {formatTime(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}
        
        {sending && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-amber-500/20 rounded-2xl rounded-bl-md px-4 py-3 border border-amber-500/30">
              <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
            </div>
          </div>
        )}

        {sessionEnded && (
          <div className="text-center py-4">
            <p className={cn("text-sm", textMutedClass)}>
              Session ended • {endSummary?.duration_minutes || 0} min
            </p>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!sessionEnded ? (
        <div className={cn("sticky bottom-0 glass border-t p-4", borderClass)}>
          <form onSubmit={sendMessage} className="flex gap-2">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Say something..."
              className={cn(
                "flex-1 bg-white/5 border-white/10",
                isDark ? "text-white placeholder:text-white/40" : "text-black placeholder:text-gray-400"
              )}
              disabled={sending}
              autoComplete="off"
            />
            <Button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      ) : (
        <div className={cn("sticky bottom-0 glass border-t p-4", borderClass)}>
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex-1"
            >
              Leave Stoop
            </Button>
            {allowSharing && !shareRequested && (
              <Button
                onClick={requestShare}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share to Block
              </Button>
            )}
            {shareRequested && (
              <Button disabled className="flex-1">
                ✓ Share Requested
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={deleteSession}
              disabled={deleting}
              className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
              title="Delete session"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* End Session Modal */}
      {showEndModal && !sessionEnded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className={cn(
            "w-full max-w-sm rounded-xl p-6 space-y-4",
            isDark ? "bg-zinc-900 border border-white/10" : "bg-white border border-gray-200"
          )}>
            <h3 className={cn("text-lg font-semibold", textClass)}>End Session?</h3>
            <p className={cn("text-sm", textMutedClass)}>
              This will end your visit to {ownerInfo?.name || ownerInfo?.username}'s stoop.
              You'll have the option to share this conversation to The Block.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowEndModal(false)}
                className="flex-1"
              >
                Keep Chatting
              </Button>
              <Button
                onClick={endSession}
                disabled={ending}
                className="flex-1 bg-red-500 hover:bg-red-600"
              >
                {ending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'End Session'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Share Prompt Modal */}
      {showEndModal && sessionEnded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className={cn(
            "w-full max-w-sm rounded-xl p-6 space-y-4",
            isDark ? "bg-zinc-900 border border-white/10" : "bg-white border border-gray-200"
          )}>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                <DoorOpen className="h-8 w-8 text-amber-400" />
              </div>
              <h3 className={cn("text-lg font-semibold mb-2", textClass)}>Thanks for stopping by!</h3>
              {endSummary?.summary && (
                <p className={cn("text-sm mb-4", textMutedClass)}>
                  {endSummary.summary}
                </p>
              )}
              <p className={cn("text-xs flex items-center justify-center gap-1", textMutedClass)}>
                <Clock className="h-3 w-3" />
                {endSummary?.duration_minutes || 0} minutes
              </p>
            </div>
            
            {allowSharing && !shareRequested ? (
              <div className="space-y-2">
                <p className={cn("text-sm text-center", textMutedClass)}>
                  Want to share this conversation to {ownerInfo?.name}'s Block?
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEndModal(false);
                      navigate(-1);
                    }}
                    className="flex-1"
                  >
                    Keep Private
                  </Button>
                  <Button
                    onClick={() => {
                      requestShare();
                      setShowEndModal(false);
                    }}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => {
                  setShowEndModal(false);
                  navigate(-1);
                }}
                className="w-full"
              >
                {shareRequested ? '✓ Share Request Sent — Leave' : 'Leave Stoop'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
