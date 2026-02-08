import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Send, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useThemeClasses } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { useNavigate, useParams } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Bonita's avatar URL
const BONITA_AVATAR = "/assets/bonita-profile.jpeg";

export default function SidebarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sidebarId } = useParams();
  const { isDark, textClass, textMutedClass, borderClass, hoverBgClass } = useThemeClasses();
  
  const [sidebars, setSidebars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSidebar, setActiveSidebar] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [waitingForBonita, setWaitingForBonita] = useState(false);
  
  const messagesEndRef = useRef(null);
  const pollingRef = useRef(null);

  useEffect(() => {
    fetchSidebars();
  }, []);

  useEffect(() => {
    if (sidebarId) {
      loadSidebar(sidebarId);
    }
    
    // Cleanup polling on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarId]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Polling for new messages when waiting for Bonita's response
  const pollForMessages = useCallback(async () => {
    if (!activeSidebar) return;
    
    try {
      const response = await axios.get(
        `${API}/sidebar/${activeSidebar.sidebar_id}/messages`,
        { withCredentials: true }
      );
      
      const newMessages = response.data;
      
      // Check if we got a new message from Bonita (handle both bonita and bonita_ai)
      if (newMessages.length > messages.length) {
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage.user_id === 'bonita_ai' || lastMessage.user_id === 'bonita') {
          setWaitingForBonita(false);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
        setMessages(newMessages);
      }
    } catch (error) {
      console.error('Error polling messages:', error);
    }
  }, [activeSidebar, messages.length]);

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

  const isBonita = (sidebar) => {
    if (!sidebar?.other_user) return false;
    return sidebar.other_user.user_id === 'bonita_ai' || 
           sidebar.other_user.username === 'bonita' ||
           sidebar.other_user.name === 'Bonita';
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeSidebar) return;

    const messageContent = newMessage.trim();
    setSending(true);
    
    try {
      const response = await axios.post(
        `${API}/sidebar/${activeSidebar.sidebar_id}/message?content=${encodeURIComponent(messageContent)}`,
        {},
        { withCredentials: true }
      );
      
      // Add message to list with user info
      setMessages(prev => [...prev, {
        ...response.data,
        user: { name: user.name, username: user.username, picture: user.picture }
      }]);
      setNewMessage('');
      
      // If chatting with Bonita, start polling for response
      if (isBonita(activeSidebar)) {
        setWaitingForBonita(true);
        
        // Start polling every 1.5 seconds
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
        pollingRef.current = setInterval(pollForMessages, 1500);
        
        // Stop polling after 30 seconds as a safety
        setTimeout(() => {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setWaitingForBonita(false);
          }
        }, 30000);
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const getOtherUser = (sidebar) => {
    // Return the user info of the other person in the sidebar
    if (!sidebar?.other_user) return { name: 'User', username: 'user' };
    
    // Ensure Bonita always has the correct avatar (handle both bonita and bonita_ai)
    if (sidebar.other_user.user_id === 'bonita_ai' || 
        sidebar.other_user.user_id === 'bonita' || 
        sidebar.other_user.username === 'bonita') {
      return {
        ...sidebar.other_user,
        name: 'Bonita',
        picture: sidebar.other_user.picture || BONITA_AVATAR
      };
    }
    
    return sidebar.other_user;
  };

  const getMessageUser = (msg) => {
    // Handle Bonita's messages specially (both bonita and bonita_ai)
    if (msg.user_id === 'bonita_ai' || msg.user_id === 'bonita') {
      return {
        name: 'Bonita',
        username: 'bonita',
        picture: msg.user?.picture || BONITA_AVATAR
      };
    }
    return msg.user || { name: 'User', username: 'user' };
  };

  // Start a chat with Bonita
  const startBonitaChat = async () => {
    try {
      const response = await axios.post(
        `${API}/sidebar/create?other_user_id=bonita_ai`,
        {},
        { withCredentials: true }
      );
      navigate(`/sidebar/${response.data.sidebar_id}`);
    } catch (error) {
      toast.error('Failed to start chat with Bonita');
    }
  };

  // If viewing a specific sidebar
  if (activeSidebar || sidebarId) {
    const otherUser = activeSidebar ? getOtherUser(activeSidebar) : null;
    const chattingWithBonita = activeSidebar && isBonita(activeSidebar);
    
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]" data-testid="sidebar-chat">
        {/* Chat Header */}
        <div className={cn("sticky top-14 md:top-0 z-30 glass border-b p-4", borderClass)}>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActiveSidebar(null);
                setWaitingForBonita(false);
                if (pollingRef.current) {
                  clearInterval(pollingRef.current);
                  pollingRef.current = null;
                }
                navigate('/sidebar');
              }}
              className={cn(isDark ? "text-white/60 hover:text-white" : "text-gray-500 hover:text-gray-900")}
              data-testid="sidebar-back-btn"
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
                  <div className="flex items-center gap-1.5">
                    <p className={cn("font-medium text-sm", textClass)}>{otherUser.name}</p>
                    {chattingWithBonita && (
                      <Sparkles className="h-3 w-3 text-amber-400" />
                    )}
                  </div>
                  <p className={cn("text-xs", isDark ? "text-white/40" : "text-gray-500")}>@{otherUser.username}</p>
                </div>
              </>
            )}
            <span className={cn("ml-auto text-[10px] uppercase tracking-wider", isDark ? "text-white/30" : "text-gray-400")}>The Sidebar</span>
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
              <MessageSquare className={cn("h-12 w-12 mx-auto mb-4", isDark ? "text-white/20" : "text-gray-300")} />
              <p className={cn("text-sm", isDark ? "text-white/50" : "text-gray-500")}>No messages yet</p>
              <p className={cn("text-xs", isDark ? "text-white/30" : "text-gray-400")}>
                {chattingWithBonita 
                  ? "Say hey to your AI auntie! She's ready to chat." 
                  : "Start the conversation"}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.user_id === user.user_id;
              const msgUser = getMessageUser(msg);
              
              return (
                <div
                  key={msg.message_id}
                  className={cn(
                    "flex gap-2",
                    isOwn ? "justify-end" : "justify-start"
                  )}
                  data-testid={`message-${msg.message_id}`}
                >
                  {!isOwn && (
                    <Avatar className="h-8 w-8 border border-white/20 flex-shrink-0">
                      <AvatarImage src={msgUser.picture} />
                      <AvatarFallback className="bg-white/10 text-xs">{msgUser.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-[75%] px-4 py-2",
                      isOwn
                        ? "bg-white text-black rounded-tl-xl rounded-tr-none rounded-b-xl"
                        : msg.user_id === 'bonita_ai'
                          ? "bg-amber-500/20 rounded-tl-none rounded-tr-xl rounded-b-xl border border-amber-500/30 " + (isDark ? "text-white" : "text-amber-900")
                          : (isDark ? "bg-white/10 text-white" : "bg-gray-100 text-gray-900") + " rounded-tl-none rounded-tr-xl rounded-b-xl"
                    )}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className={cn(
                      "text-[10px] mt-1",
                      isOwn ? "text-black/50" : (isDark ? "text-white/40" : "text-gray-500")
                    )}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          
          {/* Bonita typing indicator */}
          {waitingForBonita && (
            <div className="flex gap-2 justify-start" data-testid="bonita-typing">
              <Avatar className="h-8 w-8 border border-white/20 flex-shrink-0">
                <AvatarImage src={BONITA_AVATAR} />
                <AvatarFallback className="bg-white/10 text-xs">B</AvatarFallback>
              </Avatar>
              <div className="bg-amber-500/20 border border-amber-500/30 rounded-tl-none rounded-tr-xl rounded-b-xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className={cn("p-4 border-t glass", borderClass)}>
          <form onSubmit={sendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={chattingWithBonita ? "Ask Bonita anything..." : "Whisper something..."}
              className={cn("flex-1 rounded-full px-4", isDark ? "bg-white/10 border-white/20 focus:border-white text-white placeholder:text-white/40" : "bg-gray-100 border-gray-300 focus:border-gray-500 text-black placeholder:text-gray-400")}
              disabled={sending || waitingForBonita}
              data-testid="sidebar-message-input"
            />
            <Button
              type="submit"
              disabled={sending || !newMessage.trim() || waitingForBonita}
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
      <div className={cn("sticky top-14 md:top-0 z-30 glass border-b p-4", borderClass)}>
        <div className="flex items-center gap-3">
          <MessageSquare className={cn("h-5 w-5", textClass)} />
          <h1 className={cn("font-display text-sm tracking-widest uppercase", textClass)}>The Sidebar</h1>
        </div>
        <p className={cn("text-[10px] mt-2", isDark ? "text-white/40" : "text-gray-500")}>Private whispers. Just between y'all.</p>
      </div>

      {/* Chat with Bonita CTA */}
      <div 
        onClick={startBonitaChat}
        className="m-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 cursor-pointer hover:from-amber-500/30 hover:to-orange-500/30 transition-all"
        data-testid="start-bonita-chat"
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-amber-500/50">
            <AvatarImage src={BONITA_AVATAR} />
            <AvatarFallback className="bg-amber-500/20">B</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className={cn("font-medium", textClass)}>Chat with Bonita</p>
              <Sparkles className="h-4 w-4 text-amber-400" />
            </div>
            <p className={cn("text-xs", textMutedClass)}>Your AI auntie is always here for you</p>
          </div>
          <Send className="h-5 w-5 text-amber-400" />
        </div>
      </div>

      {/* Sidebars List */}
      {loading ? (
        <div className="p-4 space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : sidebars.length === 0 ? (
        <div className="text-center py-8 px-6">
          <MessageSquare className={cn("h-10 w-10 mx-auto mb-3", isDark ? "text-white/20" : "text-gray-300")} />
          <p className={cn("text-sm mb-1", isDark ? "text-white/50" : "text-gray-500")}>No other whispers yet</p>
          <p className={cn("text-xs", isDark ? "text-white/30" : "text-gray-400")}>Start a sidebar from someone's profile or a group chat</p>
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          {sidebars.map((sidebar) => {
            const otherUser = getOtherUser(sidebar);
            const isBoniChat = isBonita(sidebar);
            
            return (
              <div
                key={sidebar.sidebar_id}
                onClick={() => selectSidebar(sidebar)}
                className={cn(
                  "p-4 hover:bg-white/5 cursor-pointer transition-colors",
                  isBoniChat && "bg-amber-500/5"
                )}
                data-testid={`sidebar-${sidebar.sidebar_id}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className={cn(
                    "h-12 w-12 border",
                    isBoniChat ? "border-amber-500/50" : "border-white/20"
                  )}>
                    <AvatarImage src={otherUser?.picture} />
                    <AvatarFallback className="bg-white/10">{otherUser?.name?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={cn("font-medium text-sm truncate", textClass)}>{otherUser?.name || 'User'}</p>
                      {isBoniChat && <Sparkles className="h-3 w-3 text-amber-400 flex-shrink-0" />}
                    </div>
                    <p className={cn("text-xs truncate", isDark ? "text-white/40" : "text-gray-500")}>@{otherUser?.username || 'user'}</p>
                  </div>
                  <span className={cn("text-[10px]", isDark ? "text-white/30" : "text-gray-400")}>
                    {sidebar.source_gc_id ? 'From GC' : isBoniChat ? 'AI' : 'Direct'}
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
