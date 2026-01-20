import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, ArrowLeft, User, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { useNavigate, useParams } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SidebarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sidebarId } = useParams();
  
  const [sidebars, setSidebars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSidebar, setActiveSidebar] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchSidebars();
  }, []);

  useEffect(() => {
    if (sidebarId) {
      loadSidebar(sidebarId);
    }
  }, [sidebarId]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSidebars = async () => {
    try {
      const response = await axios.get(`${API}/sidebar/my-sidebars`, { withCredentials: true });
      setSidebars(response.data);
    } catch (error) {
      console.error('Error fetching sidebars:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSidebar = async (id) => {
    setMessagesLoading(true);
    try {
      const response = await axios.get(`${API}/sidebar/${id}/messages`, { withCredentials: true });
      setMessages(response.data);
      
      // Find the sidebar info from list, or fetch it directly
      let sb = sidebars.find(s => s.sidebar_id === id);
      if (!sb) {
        // Fetch sidebar info directly
        try {
          const sidebarResponse = await axios.get(`${API}/sidebar/${id}`, { withCredentials: true });
          sb = sidebarResponse.data;
        } catch (e) {
          // If that fails, create a minimal sidebar object
          sb = { sidebar_id: id };
        }
      }
      setActiveSidebar(sb);
    } catch (error) {
      toast.error('Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  };

  const selectSidebar = (sidebar) => {
    setActiveSidebar(sidebar);
    navigate(`/sidebar/${sidebar.sidebar_id}`);
    loadSidebar(sidebar.sidebar_id);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeSidebar) return;

    setSending(true);
    try {
      const response = await axios.post(
        `${API}/sidebar/${activeSidebar.sidebar_id}/message?content=${encodeURIComponent(newMessage)}`,
        {},
        { withCredentials: true }
      );
      
      // Add message to list with user info
      setMessages([...messages, {
        ...response.data,
        user: { name: user.name, username: user.username, picture: user.picture }
      }]);
      setNewMessage('');
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const getOtherUser = (sidebar) => {
    // Return the user info of the other person in the sidebar
    return sidebar.other_user || { name: 'User', username: 'user' };
  };

  // If viewing a specific sidebar
  if (activeSidebar || sidebarId) {
    const otherUser = activeSidebar ? getOtherUser(activeSidebar) : null;
    
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]" data-testid="sidebar-chat">
        {/* Chat Header */}
        <div className="sticky top-14 md:top-0 z-30 glass border-b border-white/10 p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActiveSidebar(null);
                navigate('/sidebar');
              }}
              className="text-white/60 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {otherUser && (
              <>
                <Avatar className="h-8 w-8 border border-white/20">
                  <AvatarImage src={otherUser.picture} />
                  <AvatarFallback className="bg-white/10 text-xs">{otherUser.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm text-white">{otherUser.name}</p>
                  <p className="text-xs text-white/40">@{otherUser.username}</p>
                </div>
              </>
            )}
            <span className="ml-auto text-[10px] text-white/30 uppercase tracking-wider">The Sidebar</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messagesLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-3/4" />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/50 text-sm">No messages yet</p>
              <p className="text-white/30 text-xs">Start the conversation</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.user_id === user.user_id;
              return (
                <div
                  key={msg.message_id}
                  className={cn(
                    "flex gap-2",
                    isOwn ? "justify-end" : "justify-start"
                  )}
                >
                  {!isOwn && (
                    <Avatar className="h-8 w-8 border border-white/20 flex-shrink-0">
                      <AvatarImage src={msg.user?.picture} />
                      <AvatarFallback className="bg-white/10 text-xs">{msg.user?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-[75%] px-4 py-2",
                      isOwn
                        ? "bg-white text-black rounded-tl-xl rounded-tr-none rounded-b-xl"
                        : "bg-white/10 text-white rounded-tl-none rounded-tr-xl rounded-b-xl"
                    )}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className={cn(
                      "text-[10px] mt-1",
                      isOwn ? "text-black/50" : "text-white/40"
                    )}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-white/10 glass">
          <form onSubmit={sendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Whisper something..."
              className="flex-1 bg-white/10 border-white/20 focus:border-white rounded-full px-4"
              disabled={sending}
              data-testid="sidebar-message-input"
            />
            <Button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="bg-white text-black hover:bg-white/90 rounded-full w-10 h-10 p-0"
              data-testid="sidebar-send-btn"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Sidebar List View
  return (
    <div className="pb-safe" data-testid="sidebar-page">
      {/* Header */}
      <div className="sticky top-14 md:top-0 z-30 glass border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-white" />
          <h1 className="font-display text-sm tracking-widest uppercase">The Sidebar</h1>
        </div>
        <p className="text-[10px] text-white/40 mt-2">Private whispers. Just between y'all.</p>
      </div>

      {/* Sidebars List */}
      {loading ? (
        <div className="p-4 space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : sidebars.length === 0 ? (
        <div className="text-center py-16 px-6">
          <MessageSquare className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50 text-sm mb-2">No whispers yet</p>
          <p className="text-white/30 text-xs">Start a sidebar from someone's profile or a group chat</p>
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          {sidebars.map((sidebar) => {
            const otherUser = getOtherUser(sidebar);
            return (
              <div
                key={sidebar.sidebar_id}
                onClick={() => selectSidebar(sidebar)}
                className="p-4 hover:bg-white/5 cursor-pointer transition-colors"
                data-testid={`sidebar-${sidebar.sidebar_id}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-white/20">
                    <AvatarImage src={otherUser?.picture} />
                    <AvatarFallback className="bg-white/10">{otherUser?.name?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm truncate">{otherUser?.name || 'User'}</p>
                    <p className="text-xs text-white/40 truncate">@{otherUser?.username || 'user'}</p>
                  </div>
                  <span className="text-[10px] text-white/30">
                    {sidebar.source_gc_id ? 'From GC' : 'Direct'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
