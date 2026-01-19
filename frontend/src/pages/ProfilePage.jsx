import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { Calendar, MapPin, Link as LinkIcon, Edit2, MessageSquare, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUsers } from '@/hooks/useUsers';
import { usePosts } from '@/hooks/usePosts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PostCard } from '@/components/PostCard';
import { EditProfileModal } from '@/components/EditProfileModal';
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
  
  const [profile, setProfile] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const isOwnProfile = currentUser?.username === username;

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
      <div className="profile-header border-b border-white/10">
        {/* Cover area */}
        <div className="h-24 bg-white/5" />
        
        {/* Profile info */}
        <div className="px-4 pb-4">
          {/* Avatar row */}
          <div className="flex items-end justify-between -mt-12 mb-4">
            <Avatar className="h-24 w-24 border-4 border-black">
              <AvatarImage src={profile.picture} alt={profile.name} />
              <AvatarFallback className="bg-white/10 text-white text-2xl">
                {profile.name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            {isOwnProfile ? (
              <Button
                variant="outline"
                className="border-white/30 text-white hover:bg-white hover:text-black rounded-sm"
                onClick={() => setEditOpen(true)}
                data-testid="edit-profile-btn"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <Button
                onClick={handleFollow}
                disabled={followLoading}
                className={cn(
                  "rounded-sm px-6",
                  isFollowing
                    ? "bg-transparent border border-white/30 text-white hover:bg-white/10 hover:border-red-500 hover:text-red-500"
                    : "bg-white text-black hover:bg-white/90"
                )}
                data-testid="follow-btn"
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
            )}
          </div>

          {/* Name and username */}
          <div className="mb-3">
            <h1 className="text-xl font-bold text-white">{profile.name}</h1>
            <p className="text-white/50">@{profile.username}</p>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-white/80 mb-3">{profile.bio}</p>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap gap-4 text-sm text-white/50 mb-4">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Joined {formatJoinDate(profile.created_at)}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6">
            <div className="text-sm">
              <span className="font-semibold text-white">{profile.following_count}</span>
              <span className="text-white/50 ml-1">Following</span>
            </div>
            <div className="text-sm">
              <span className="font-semibold text-white">{profile.followers_count}</span>
              <span className="text-white/50 ml-1">Followers</span>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Tab */}
      <div className="border-b border-white/10">
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
    </div>
  );
}
