import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, VolumeX, Loader2, UserX } from 'lucide-react';
import { useThemeClasses } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function BlockedUsersPage() {
  const navigate = useNavigate();
  const { type } = useParams(); // 'blocked' or 'muted'
  const { isDark, textClass, textMutedClass, textVeryMutedClass, borderClass, hoverBgClass } = useThemeClasses();
  
  const [activeTab, setActiveTab] = useState(type || 'blocked');
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [mutedUsers, setMutedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    // Update URL when tab changes
    if (activeTab === 'blocked') {
      navigate('/settings/blocked', { replace: true });
    } else {
      navigate('/settings/muted', { replace: true });
    }
  }, [activeTab, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [blockedRes, mutedRes] = await Promise.all([
        axios.get(`${API}/users/blocked`, { withCredentials: true }),
        axios.get(`${API}/users/muted`, { withCredentials: true })
      ]);
      setBlockedUsers(blockedRes.data);
      setMutedUsers(mutedRes.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId) => {
    setActionLoading(userId);
    try {
      await axios.delete(`${API}/users/${userId}/block`, { withCredentials: true });
      setBlockedUsers(prev => prev.filter(u => u.user_id !== userId));
      toast.success('User unblocked');
    } catch (error) {
      toast.error('Failed to unblock user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnmute = async (userId) => {
    setActionLoading(userId);
    try {
      await axios.delete(`${API}/users/${userId}/mute`, { withCredentials: true });
      setMutedUsers(prev => prev.filter(u => u.user_id !== userId));
      toast.success('User unmuted');
    } catch (error) {
      toast.error('Failed to unmute user');
    } finally {
      setActionLoading(null);
    }
  };

  const UserCard = ({ user, onAction, actionLabel, actionIcon: ActionIcon }) => (
    <div className={cn("flex items-center justify-between p-4 border-b", borderClass)}>
      <Link 
        to={`/profile/${user.username}`}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <Avatar className={cn("h-12 w-12 border", isDark ? "border-white/20" : "border-gray-300")}>
          <AvatarImage src={user.picture} alt={user.name} />
          <AvatarFallback className={cn("text-sm", isDark ? "bg-white/10" : "bg-gray-100")}>
            {user.name?.charAt(0)?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className={cn("font-medium truncate", textClass)}>{user.name}</p>
          <p className={cn("text-sm truncate", textMutedClass)}>@{user.username}</p>
        </div>
      </Link>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onAction(user.user_id)}
        disabled={actionLoading === user.user_id}
        className={cn(
          "rounded-none text-xs",
          isDark ? "border-white/20 hover:bg-white/10" : "border-gray-300 hover:bg-gray-100"
        )}
      >
        {actionLoading === user.user_id ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <>
            <ActionIcon className="h-3.5 w-3.5 mr-1.5" />
            {actionLabel}
          </>
        )}
      </Button>
    </div>
  );

  const EmptyState = ({ icon: Icon, title, description }) => (
    <div className="text-center py-16 px-6">
      <Icon className={cn("h-12 w-12 mx-auto mb-4", isDark ? "text-white/20" : "text-gray-300")} />
      <p className={cn("text-lg mb-2", textMutedClass)}>{title}</p>
      <p className={cn("text-sm", textVeryMutedClass)}>{description}</p>
    </div>
  );

  return (
    <div className="mb-safe" data-testid="blocked-users-page">
      {/* Header */}
      <div className={cn("sticky top-14 md:top-0 z-30 glass border-b p-4", borderClass)}>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
            className={cn(isDark ? "text-white/60 hover:text-white" : "text-gray-600 hover:text-gray-900")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className={cn("font-display text-lg tracking-wide uppercase", textClass)}>
            Privacy
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={cn("w-full bg-transparent border-b rounded-none h-auto p-0", borderClass)}>
          <TabsTrigger 
            value="blocked" 
            className={cn(
              "flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent py-3 gap-2",
              isDark ? "text-white/60 data-[state=active]:text-white" : "text-gray-500 data-[state=active]:text-gray-900"
            )}
          >
            <Ban className="h-4 w-4" />
            Blocked ({blockedUsers.length})
          </TabsTrigger>
          <TabsTrigger 
            value="muted" 
            className={cn(
              "flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent py-3 gap-2",
              isDark ? "text-white/60 data-[state=active]:text-white" : "text-gray-500 data-[state=active]:text-gray-900"
            )}
          >
            <VolumeX className="h-4 w-4" />
            Muted ({mutedUsers.length})
          </TabsTrigger>
        </TabsList>

        {/* Blocked Users */}
        <TabsContent value="blocked" className="mt-0">
          {loading ? (
            <div className="p-4 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : blockedUsers.length === 0 ? (
            <EmptyState 
              icon={Ban}
              title="No blocked users"
              description="Users you block won't be able to see your content or interact with you"
            />
          ) : (
            <div>
              {blockedUsers.map(user => (
                <UserCard 
                  key={user.user_id}
                  user={user}
                  onAction={handleUnblock}
                  actionLabel="Unblock"
                  actionIcon={UserX}
                />
              ))}
            </div>
          )}
          
          {/* Info box */}
          <div className={cn("m-4 p-4 rounded-lg text-sm", isDark ? "bg-white/5" : "bg-gray-50")}>
            <p className={cn("font-medium mb-2", textClass)}>About blocking</p>
            <ul className={cn("space-y-1 text-xs", textMutedClass)}>
              <li>• Blocked users can't see your profile or posts</li>
              <li>• You won't see their posts in your feed</li>
              <li>• Existing follows are removed both ways</li>
              <li>• They won't be notified that you blocked them</li>
            </ul>
          </div>
        </TabsContent>

        {/* Muted Users */}
        <TabsContent value="muted" className="mt-0">
          {loading ? (
            <div className="p-4 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : mutedUsers.length === 0 ? (
            <EmptyState 
              icon={VolumeX}
              title="No muted users"
              description="Muted users' posts won't appear in your feed, but they can still interact with you"
            />
          ) : (
            <div>
              {mutedUsers.map(user => (
                <UserCard 
                  key={user.user_id}
                  user={user}
                  onAction={handleUnmute}
                  actionLabel="Unmute"
                  actionIcon={VolumeX}
                />
              ))}
            </div>
          )}
          
          {/* Info box */}
          <div className={cn("m-4 p-4 rounded-lg text-sm", isDark ? "bg-white/5" : "bg-gray-50")}>
            <p className={cn("font-medium mb-2", textClass)}>About muting</p>
            <ul className={cn("space-y-1 text-xs", textMutedClass)}>
              <li>• Muted users' posts won't appear in your feed</li>
              <li>• They can still follow you and see your content</li>
              <li>• You'll still see their replies to your posts</li>
              <li>• They won't know they're muted</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
