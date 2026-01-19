import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Plus, Send, Users, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const WS_URL = process.env.REACT_APP_BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://');

export default function GCPage() {
  const { user, sessionToken } = useAuth();
  const [gcs, setGcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newGCName, setNewGCName] = useState('');
  const [activeGC, setActiveGC] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    fetchGCs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeGC) {
      fetchMessages(activeGC.gc_id);
      connectWebSocket(activeGC.gc_id);
    }
    
    return () => {
      disconnectWebSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGC]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // WebSocket Connection
  const connectWebSocket = useCallback((gcId) => {
    if (!sessionToken || !gcId) return;
    
    disconnectWebSocket();
    
    try {
      const wsUrl = `${WS_URL}/ws/gc/${gcId}?token=${sessionToken}`;
      console.log('[WS] Connecting to:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('[WS] Connected to GC:', gcId);
        setWsConnected(true);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WS] Received:', data);
          
          if (data.type === 'new_message') {
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.message_id === data.message.message_id)) {
                return prev;
              }
              return [...prev, data.message];
            });
          } else if (data.type === 'typing') {
            if (data.user_id !== user?.user_id) {
              setTypingUsers(prev => {
                if (!prev.includes(data.username)) {
                  return [...prev, data.username];
                }
                return prev;
              });
              // Clear typing indicator after 3 seconds
              setTimeout(() => {
                setTypingUsers(prev => prev.filter(u => u !== data.username));
              }, 3000);
            }
          }
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };
      
      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        setWsConnected(false);
      };
      
      ws.onclose = (event) => {
        console.log('[WS] Disconnected:', event.code, event.reason);
        setWsConnected(false);
        
        // Auto-reconnect after 3 seconds if not intentional close
        if (event.code !== 1000 && activeGC?.gc_id === gcId) {
          setTimeout(() => {
            console.log('[WS] Attempting reconnect...');
            connectWebSocket(gcId);
          }, 3000);
        }
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('[WS] Connection error:', error);
      setWsConnected(false);
    }
  }, [sessionToken, user?.user_id, activeGC?.gc_id]);

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User navigated away');
      wsRef.current = null;
    }
    setWsConnected(false);
  };

  const sendTypingIndicator = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing' }));
    }
  }, []);

  const fetchGCs = async () => {
    try {
      const response = await axios.get(`${API}/gc/my-gcs`, { withCredentials: true });
      setGcs(response.data);
      
      if (response.data.length > 0 && !activeGC) {
        selectGC(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching GCs:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectGC = async (gc) => {
    try {
      const response = await axios.get(`${API}/gc/${gc.gc_id}`, { withCredentials: true });
      setActiveGC(response.data);
    } catch (error) {
      toast.error('Failed to load GC');
    }
  };

  const fetchMessages = async (gcId) => {
    try {
      const response = await axios.get(`${API}/gc/${gcId}/messages`, { withCredentials: true });
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeGC || sendingMessage) return;
    
    const messageContent = newMessage.trim();
    setNewMessage('');
    setSendingMessage(true);
    
    // Send via WebSocket if connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        content: messageContent
      }));
      setSendingMessage(false);
      return;
    }
    
    // Fallback to HTTP
    try {
      const response = await axios.post(
        `${API}/gc/${activeGC.gc_id}/message`,
        null,
        { 
          params: { content: messageContent },
          withCredentials: true 
        }
      );
      
      setMessages([...messages, { ...response.data, user: { name: user.name, username: user.username, picture: user.picture } }]);
    } catch (error) {
      toast.error('Failed to send message');
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setSendingMessage(false);
    }
  };

  const askBonitaInGC = async () => {
    if (!newMessage.trim() || !activeGC) return;
    
    setSendingMessage(true);
    try {
      const response = await axios.post(
        `${API}/gc/${activeGC.gc_id}/bonita`,
        null,
        { 
          params: { question: newMessage.trim() },
          withCredentials: true 
        }
      );
      
      setMessages([...messages, { ...response.data, user: { name: 'Bonita', username: 'bonita' } }]);
      setNewMessage('');
    } catch (error) {
      toast.error('Bonita is unavailable');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleMessageChange = (e) => {
    setNewMessage(e.target.value);
    
    // Send typing indicator (debounced)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(sendTypingIndicator, 500);
  };

  const createGC = async () => {
    if (!newGCName.trim()) return;
    
    try {
      const response = await axios.post(`${API}/gc/create`, {
        name: newGCName.trim(),
        member_ids: []
      }, { withCredentials: true });
      
      toast.success('GC created! Invite members to start chatting.');
      setCreateOpen(false);
      setNewGCName('');
      fetchGCs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create GC');
    }
  };

  const formatTime = (dateStr) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: false });
    } catch {
      return '';
    }
  };

  return (
    <div className="mb-safe h-[calc(100vh-8rem)] md:h-screen flex flex-col" data-testid="gc-page">
      {/* Header */}
      <div className="sticky top-14 md:top-0 z-30 glass border-b border-white/10 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-white" />
            <h1 className="font-display text-sm tracking-widest uppercase">The GC</h1>
            {wsConnected ? (
              <span className="flex items-center gap-1 text-[10px] text-green-400">
                <Wifi className="h-3 w-3" />
                Live
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-white/30">
                <WifiOff className="h-3 w-3" />
              </span>
            )}
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            size="sm"
            className="bg-white text-black hover:bg-white/90 rounded-none text-xs font-display tracking-wider"
            data-testid="create-gc-btn"
          >
            <Plus className="h-3.5 w-3.5 mr-2" />
            New
          </Button>
        </div>
        <p className="text-[10px] text-white/40 mt-2">"The Chat Said..."</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* GC List */}
        <div className={cn(
          "border-r border-white/10 flex-shrink-0",
          activeGC ? "hidden md:block w-64" : "w-full md:w-64"
        )}>
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : gcs.length === 0 ? (
            <div className="text-center py-16 px-4">
              <MessageCircle className="h-10 w-10 text-white/20 mx-auto mb-4" />
              <p className="text-white/50 text-sm mb-2">No GCs yet</p>
              <p className="text-white/30 text-xs">Create one to start chatting</p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="divide-y divide-white/10">
                {gcs.map((gc) => (
                  <div
                    key={gc.gc_id}
                    onClick={() => selectGC(gc)}
                    className={cn(
                      "p-4 cursor-pointer transition-colors",
                      activeGC?.gc_id === gc.gc_id ? "bg-white/10" : "hover:bg-white/5"
                    )}
                    data-testid={`gc-${gc.gc_id}`}
                  >
                    <p className="font-medium text-white text-sm truncate">{gc.name}</p>
                    <p className="text-xs text-white/40 flex items-center gap-1 mt-1">
                      <Users className="h-3 w-3" />
                      {gc.members?.length || 1} members
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Chat Area */}
        {activeGC ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="font-medium text-white text-sm">{activeGC.name}</h2>
                <p className="text-[10px] text-white/40">{activeGC.members?.length} members</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden text-white/50"
                onClick={() => setActiveGC(null)}
              >
                Back
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-white/40 text-sm">No messages yet</p>
                  <p className="text-white/30 text-xs">Start the conversation</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div 
                      key={msg.message_id}
                      className={cn(
                        "flex gap-3",
                        msg.user_id === user?.user_id && "flex-row-reverse"
                      )}
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={msg.user?.picture} />
                        <AvatarFallback className="bg-white/10 text-[10px]">
                          {msg.user?.name?.charAt(0) || (msg.user_id === 'bonita' ? 'B' : '?')}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "max-w-[70%]",
                        msg.user_id === user?.user_id && "text-right"
                      )}>
                        <p className="text-[10px] text-white/40 mb-1">
                          {msg.user_id === 'bonita' ? 'Bonita' : msg.user?.name}
                          <span className="ml-2 font-mono">{formatTime(msg.created_at)}</span>
                        </p>
                        <div className={cn(
                          "p-3 text-sm",
                          msg.user_id === user?.user_id 
                            ? "bg-white text-black" 
                            : msg.user_id === 'bonita'
                            ? "bg-white/10 border border-white/20"
                            : "bg-white/5"
                        )}>
                          {msg.content}
                        </div>
                        
                        {msg.dropped_post && (
                          <div className="mt-2 p-2 border border-white/20 text-xs text-white/60">
                            <p className="text-[10px] text-white/40 mb-1">Dropped post from @{msg.dropped_post.user?.username}</p>
                            <p className="line-clamp-2">{msg.dropped_post.content}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
              
              {/* Typing Indicator */}
              {typingUsers.length > 0 && (
                <div className="text-[10px] text-white/40 italic mt-2">
                  {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-white/10 flex-shrink-0">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={handleMessageChange}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent border-white/20 focus:border-white rounded-none text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  data-testid="gc-message-input"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={askBonitaInGC}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="text-white/50 hover:text-white"
                  title="Ask Bonita"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="bg-white text-black hover:bg-white/90 rounded-none"
                  data-testid="gc-send-btn"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40 text-sm">Select a GC to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Create GC Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-black border border-white/20 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-display text-sm tracking-widest uppercase">New GC</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              value={newGCName}
              onChange={(e) => setNewGCName(e.target.value)}
              placeholder="Name your GC..."
              className="bg-transparent border-white/20 focus:border-white rounded-none"
              data-testid="gc-name-input"
            />
            <p className="text-[10px] text-white/40">You'll be able to add members after creating</p>
            <Button
              onClick={createGC}
              disabled={!newGCName.trim()}
              className="w-full bg-white text-black hover:bg-white/90 rounded-none font-display tracking-wider"
              data-testid="create-gc-submit"
            >
              Create GC
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
