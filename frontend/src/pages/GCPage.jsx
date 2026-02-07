import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Plus, Send, Users, Sparkles, Wifi, WifiOff, Search, Check, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
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
  
  // User selection for new GC
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  
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

  // Fetch available users when create dialog opens
  useEffect(() => {
    if (createOpen) {
      fetchAvailableUsers();
    } else {
      // Reset state when dialog closes
      setSelectedUsers([]);
      setNewGCName('');
      setUserSearch('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOpen]);

  const fetchAvailableUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await axios.get(`${API}/gc/available-users`, { withCredentials: true });
      setAvailableUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

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
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        content: messageContent
      }));
      setSendingMessage(false);
      return;
    }
    
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
      setNewMessage(messageContent);
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
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(sendTypingIndicator, 500);
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const createGC = async () => {
    if (!newGCName.trim()) {
      toast.error('Please enter a name for the chat');
      return;
    }
    
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one person to chat with');
      return;
    }
    
    try {
      const response = await axios.post(`${API}/gc/create`, {
        name: newGCName.trim(),
        member_ids: selectedUsers
      }, { withCredentials: true });
      
      toast.success('Chat started!');
      setCreateOpen(false);
      fetchGCs();
      selectGC(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create chat');
    }
  };

  const formatTime = (dateStr) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: false });
    } catch {
      return '';
    }
  };

  // Filter users by search
  const filteredUsers = availableUsers.filter(u => 
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.username?.toLowerCase().includes(userSearch.toLowerCase())
  );

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
            Start Chat
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
              <p className="text-white/50 text-sm mb-2">No chats yet</p>
              <p className="text-white/30 text-xs">Start a chat to connect with someone</p>
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
              <p className="text-white/40 text-sm">Select a chat to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Create GC Dialog - with User Selection */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border border-border sm:max-w-[450px] max-h-[80vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-white/10">
            <DialogTitle className="font-display text-sm tracking-widest uppercase">Start Chat</DialogTitle>
          </DialogHeader>
          
          <div className="p-4 space-y-4">
            {/* Chat Name */}
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block">Chat Name</label>
              <Input
                value={newGCName}
                onChange={(e) => setNewGCName(e.target.value)}
                placeholder="Name this conversation..."
                className="bg-transparent border-white/20 focus:border-white rounded-none"
                data-testid="gc-name-input"
              />
            </div>
            
            {/* User Search */}
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block">
                Add People {selectedUsers.length > 0 && `(${selectedUsers.length} selected)`}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search people..."
                  className="bg-transparent border-white/20 focus:border-white rounded-none pl-10"
                  data-testid="gc-user-search"
                />
              </div>
            </div>
            
            {/* Selected Users Chips */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(userId => {
                  const u = availableUsers.find(au => au.user_id === userId);
                  return (
                    <div 
                      key={userId}
                      className="flex items-center gap-1.5 px-2 py-1 bg-white/10 text-xs"
                    >
                      <span>@{u?.username || userId}</span>
                      <button 
                        onClick={() => toggleUserSelection(userId)}
                        className="text-white/50 hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* User List */}
            <ScrollArea className="h-48 border border-white/10">
              {loadingUsers ? (
                <div className="p-4 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-white/40 text-sm">
                  {userSearch ? 'No users found' : 'No other users yet'}
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.user_id}
                      onClick={() => toggleUserSelection(u.user_id)}
                      className={cn(
                        "flex items-center gap-3 p-3 cursor-pointer transition-colors",
                        selectedUsers.includes(u.user_id) ? "bg-white/10" : "hover:bg-white/5"
                      )}
                      data-testid={`gc-user-${u.user_id}`}
                    >
                      <div className={cn(
                        "w-5 h-5 border flex items-center justify-center transition-colors",
                        selectedUsers.includes(u.user_id) 
                          ? "bg-white border-white" 
                          : "border-white/30"
                      )}>
                        {selectedUsers.includes(u.user_id) && (
                          <Check className="h-3 w-3 text-black" />
                        )}
                      </div>
                      <Avatar className="h-10 w-10 border border-white/20">
                        <AvatarImage src={u.picture} />
                        <AvatarFallback className="bg-white/10 text-sm">
                          {u.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white text-sm truncate">{u.name}</p>
                        <p className="text-xs text-white/40 truncate">@{u.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            
            {/* Submit Button */}
            <Button
              onClick={createGC}
              disabled={!newGCName.trim() || selectedUsers.length === 0}
              className="w-full bg-white text-black hover:bg-white/90 rounded-none font-display tracking-wider"
              data-testid="create-gc-submit"
            >
              Start Chat with {selectedUsers.length} {selectedUsers.length === 1 ? 'Person' : 'People'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
