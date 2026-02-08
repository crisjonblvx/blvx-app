import { useEffect, useState } from 'react';
import { useThemeClasses } from '@/hooks/useTheme';
import { useParams, useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { Calendar, MapPin, Link as LinkIcon, Edit2, MessageSquare, Loader2, DoorOpen, Flag, MoreHorizontal, Ban, VolumeX, Volume2, UserX } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUsers } from '@/hooks/useUsers';
import { usePosts } from '@/hooks/usePosts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PostCard } from '@/components/PostCard';
import { EditProfileModal } from '@/components/EditProfileModal';
import { ReportModal } from '@/components/ReportModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, updateUser } = useAuth();
  const { fetchProfile, followUser, unfollowUser, checkFollowing, loading: userLoading } = useUsers();
  const { posts, fetchUserPosts, loading: postsLoading } = usePosts();
  const { isDark, textClass, textMutedClass, textVeryMutedClass, borderClass, hoverBgClass } = useThemeClasses();
  
  const [profile, setProfile] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [whisperLoading, setWhisperLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [muteLoading, setMuteLoading] = useState(false);

  const isOwnProfile = currentUser?.username === username;

  const startWhisper = async () => {
    if (!profile || whisperLoading) return;
    
    setWhisperLoading(true);
    try {
      const response = await axios.post(
        `${API}/sidebar/create?other_user_id=${profile.user_id}`,
        {},
        { withCredentials: true }
      );
      toast.success('Starting sidebar...');
      navigate(`/sidebar/${response.data.sidebar_id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start sidebar');
    } finally {
      setWhisperLoading(false);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userData = await fetchProfile(username);
        setProfile(userData);
        
        if (!isOwnProfile && currentUser) {
          const following = await checkFollowing(userData.user_id);
          setIsFollowing(following);
        }
        
        await fetchUserPosts(username);
      } catch (error) {
        toast.error('User not found');
        navigate('/home');
      }
    };

    loadProfile();
  }, [username, fetchProfile, fetchUserPosts, checkFollowing, isOwnProfile, currentUser, navigate]);

  const handleFollow = async () => {
    if (!profile || followLoading) return;
    
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(profile.user_id);
        setIsFollowing(false);
        setProfile(prev => ({
          ...prev,
          followers_count: prev.followers_count - 1
        }));
      } else {
        await followUser(profile.user_id);
        setIsFollowing(true);
        setProfile(prev => ({
          ...prev,
          followers_count: prev.followers_count + 1
        }));
      }
    } catch (error) {
      toast.error('Action failed. Try again.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleProfileUpdate = (updatedProfile) => {
    setProfile(updatedProfile);
    if (isOwnProfile) {
      updateUser(updatedProfile);
    }
  };

  const handleBlock = async () => {
    if (!profile || blockLoading) return;
    
    setBlockLoading(true);
    try {
      if (isBlocked) {
        await axios.delete(`${API}/users/${profile.user_id}/block`, { withCredentials: true });
        setIsBlocked(false);
        toast.success(`Unblocked @${profile.username}`);
      } else {
        await axios.post(`${API}/users/${profile.user_id}/block`, {}, { withCredentials: true });
        setIsBlocked(true);
        setIsFollowing(false); // Blocking also unfollows
        toast.success(`Blocked @${profile.username}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Action failed');
    } finally {
      setBlockLoading(false);
    }
  };

  const handleMute = async () => {
    if (!profile || muteLoading) return;
    
    setMuteLoading(true);
    try {
      if (isMuted) {
        await axios.delete(`${API}/users/${profile.user_id}/mute`, { withCredentials: true });
        setIsMuted(false);
        toast.success(`Unmuted @${profile.username}`);
      } else {
        await axios.post(`${API}/users/${profile.user_id}/mute`, {}, { withCredentials: true });
        setIsMuted(true);
        toast.success(`Muted @${profile.username}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Action failed');
    } finally {
      setMuteLoading(false);
    }
  };

  const formatJoinDate = (dateStr) => {
    try {
      return format(new Date(dateStr), 'MMMM yyyy');
    } catch {
      return '';
    }
  };

  if (userLoading && !profile) {
    return (
      <div className="mb-safe" data-testid="profile-loading">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="mb-safe" data-testid="profile-page">
      {/* Profile Header */}
      <div className={cn("profile-header border-b", borderClass)}>
        {/* Cover area */}
        <div className={cn("h-24", isDark ? "bg-white/5" : "bg-gray-100")} />
        
        {/* Profile info */}
        <div className="px-4 pb-4">
          {/* Avatar row */}
          <div className="flex items-end justify-between -mt-12 mb-4">
            <Avatar className={cn("h-24 w-24 border-4", isDark ? "border-black" : "border-white")}>
              <AvatarImage src={profile.picture} alt={profile.name} />
              <AvatarFallback className={cn("text-2xl", isDark ? "bg-white/10 text-white" : "bg-gray-100 text-gray-700")}>
                {profile.name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            {isOwnProfile ? (
              <Button
                variant="outline"
                className={cn("rounded-sm", isDark ? "border-white/30 text-white hover:bg-white hover:text-black" : "border-gray-300 text-gray-900 hover:bg-black hover:text-white")}
                onClick={() => setEditOpen(true)}
                data-testid="edit-profile-btn"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(`/ai-stoop/${profile.username}`)}
                  className={cn("border rounded-sm", isDark ? "border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300" : "border-amber-500/50 text-amber-600 hover:bg-amber-50 hover:text-amber-700")}
                  data-testid="stoop-btn"
                  title="Visit their AI stoop"
                >
                  <DoorOpen className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={startWhisper}
                  disabled={whisperLoading}
                  className={cn("border rounded-sm", isDark ? "border-white/20 text-white/70 hover:bg-white/10 hover:text-white" : "border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900")}
                  data-testid="whisper-btn"
                  title="Start a sidebar"
                >
                  {whisperLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={cn(
                    "rounded-sm px-6",
                    isFollowing
                      ? (isDark ? "bg-transparent border border-white/30 text-white hover:bg-white/10 hover:border-red-500 hover:text-red-500" : "bg-transparent border border-gray-300 text-gray-900 hover:bg-gray-100 hover:border-red-500 hover:text-red-500")
                      : (isDark ? "bg-white text-black hover:bg-white/90" : "bg-black text-white hover:bg-black/90")
                  )}
                  data-testid="follow-btn"
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
                
                {/* More options dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("border rounded-sm", isDark ? "border-white/20 text-white/70 hover:bg-white/10 hover:text-white" : "border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900")}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-border">
                    <DropdownMenuItem 
                      onClick={handleMute}
                      disabled={muteLoading}
                      className={cn("cursor-pointer text-xs", isDark ? "text-white/70 hover:text-white focus:text-white" : "text-gray-600 hover:text-gray-900 focus:text-gray-900")}
                    >
                      {isMuted ? (
                        <>
                          <Volume2 className="h-3.5 w-3.5 mr-2" />
                          Unmute
                        </>
                      ) : (
                        <>
                          <VolumeX className="h-3.5 w-3.5 mr-2" />
                          Mute
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleBlock}
                      disabled={blockLoading}
                      className={cn("cursor-pointer text-xs", isBlocked ? "text-green-500 hover:text-green-400" : "text-red-500 hover:text-red-400")}
                    >
                      {isBlocked ? (
                        <>
                          <UserX className="h-3.5 w-3.5 mr-2" />
                          Unblock
                        </>
                      ) : (
                        <>
                          <Ban className="h-3.5 w-3.5 mr-2" />
                          Block
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setReportOpen(true)}
                      className={cn("cursor-pointer text-xs", isDark ? "text-white/70 hover:text-white focus:text-white" : "text-gray-600 hover:text-gray-900 focus:text-gray-900")}
                    >
                      <Flag className="h-3.5 w-3.5 mr-2" />
                      Report User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Name and username */}
          <div className="mb-3">
            <h1 className={cn("text-xl font-bold", textClass)}>{profile.name}</h1>
            <p className={textMutedClass}>@{profile.username}</p>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className={cn("mb-3", isDark ? "text-white/80" : "text-gray-700")}>{profile.bio}</p>
          )}

          {/* Meta info */}
          <div className={cn("flex flex-wrap gap-4 text-sm mb-4", textMutedClass)}>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Joined {formatJoinDate(profile.created_at)}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6">
            <div className="text-sm">
              <span className={cn("font-semibold", textClass)}>{profile.following_count}</span>
              <span className={cn("ml-1", textMutedClass)}>Following</span>
            </div>
            <div className="text-sm">
              <span className={cn("font-semibold", textClass)}>{profile.followers_count}</span>
              <span className={cn("ml-1", textMutedClass)}>Followers</span>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Tab */}
      <div className={cn("border-b", borderClass)}>
        <div className="flex">
          <button className="flex-1 py-4 text-sm font-medium text-white relative">
            Posts
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-white" />
          </button>
        </div>
      </div>

      {/* User's Posts */}
      {postsLoading && posts.length === 0 ? (
        <div className="p-4 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 px-6">
          <p className="text-white/50 text-lg mb-2">No posts yet</p>
          <p className="text-white/30 text-sm">
            {isOwnProfile ? "You haven't posted anything yet" : `@${profile.username} hasn't posted yet`}
          </p>
        </div>
      ) : (
        <div>
          {posts.map((post) => (
            <PostCard key={post.post_id} post={post} />
          ))}
        </div>
      )}

      {/* Edit Profile Modal */}
      {isOwnProfile && (
        <EditProfileModal
          open={editOpen}
          onOpenChange={setEditOpen}
          profile={profile}
          onUpdate={handleProfileUpdate}
        />
      )}

      {/* Report Modal */}
      {!isOwnProfile && (
        <ReportModal
          open={reportOpen}
          onOpenChange={setReportOpen}
          targetType="user"
          targetId={profile.user_id}
          targetName={`@${profile.username}`}
        />
      )}
    </div>
  );
}
