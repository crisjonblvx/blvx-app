import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, UserPlus, RefreshCw, Activity } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Theme hook
const useTheme = () => {
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  });
  
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  
  return isDark;
};

// Format relative time
const formatTime = (dateStr) => {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  const now = new Date();
  const diff = (now - date) / 1000; // seconds
  
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// Activity type icon and text
const getActivityInfo = (type) => {
  switch (type) {
    case 'like':
      return { 
        icon: Heart, 
        text: 'liked a post',
        color: 'text-pink-500'
      };
    case 'post':
      return { 
        icon: MessageCircle, 
        text: 'posted',
        color: 'text-blue-500'
      };
    case 'follow':
      return { 
        icon: UserPlus, 
        text: 'followed',
        color: 'text-green-500'
      };
    default:
      return { 
        icon: Activity, 
        text: 'was active',
        color: 'text-gray-500'
      };
  }
};

// Single activity item
const ActivityItem = ({ activity, isDark }) => {
  const { icon: Icon, text, color } = getActivityInfo(activity.type);
  
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const textMutedClass = isDark ? 'text-white/40' : 'text-gray-500';
  const borderClass = isDark ? 'border-white/10' : 'border-gray-200';
  const bgClass = isDark ? 'bg-white/5' : 'bg-gray-50';
  const hoverBgClass = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50';

  return (
    <div className={cn("py-3 border-b last:border-0", borderClass)}>
      <div className="flex items-start gap-3">
        {/* User avatar */}
        <Link to={`/profile/${activity.user?.username}`}>
          <Avatar className="h-10 w-10">
            <AvatarImage src={activity.user?.picture} alt={activity.user?.name} />
            <AvatarFallback className={isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-900'}>
              {(activity.user?.name || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          {/* Activity header */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link 
              to={`/profile/${activity.user?.username}`}
              className={cn("font-medium text-sm hover:underline", textClass)}
            >
              {activity.user?.name || activity.user?.username}
            </Link>
            <span className={cn("text-sm", textMutedClass)}>{text}</span>
            
            {/* For follows, show who they followed */}
            {activity.type === 'follow' && activity.target_user && (
              <Link 
                to={`/profile/${activity.target_user.username}`}
                className={cn("font-medium text-sm hover:underline", textClass)}
              >
                @{activity.target_user.username}
              </Link>
            )}
            
            <span className={cn("text-xs ml-auto", textMutedClass)}>
              {formatTime(activity.created_at)}
            </span>
          </div>

          {/* Post preview for likes and posts */}
          {(activity.type === 'like' || activity.type === 'post') && activity.post_preview && (
            <Link
              to={`/post/${activity.post_id}`}
              className={cn(
                "block mt-2 p-3 rounded text-sm line-clamp-2 transition-colors",
                bgClass, hoverBgClass, textMutedClass
              )}
            >
              "{activity.post_preview}"
              {activity.post_author && activity.type === 'like' && (
                <span className={cn("block mt-1 text-xs", textMutedClass)}>
                  — @{activity.post_author.username}
                </span>
              )}
            </Link>
          )}
        </div>

        {/* Activity type icon */}
        <div className={cn("p-2 rounded-full", bgClass)}>
          <Icon className={cn("h-4 w-4", color)} />
        </div>
      </div>
    </div>
  );
};

export const FriendActivity = ({ limit = 30, className }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isDark = useTheme();

  // Theme classes
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const textMutedClass = isDark ? 'text-white/40' : 'text-gray-500';
  const borderClass = isDark ? 'border-white/10' : 'border-gray-200';

  useEffect(() => {
    fetchActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const fetchActivity = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    
    try {
      const response = await axios.get(`${API}/users/activity/friends`, {
        params: { limit },
        withCredentials: true
      });
      setActivities(response.data || []);
    } catch (error) {
      console.error('Error fetching friend activity:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchActivity(true);
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className={cn("py-3 border-b", borderClass)}>
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-16 w-full rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 mb-4">
          <Activity className={cn("h-5 w-5", textClass)} />
          <h3 className={cn("font-display text-sm tracking-widest uppercase", textClass)}>
            Your People Are Moving
          </h3>
        </div>
        <div className={cn("text-center py-8", textMutedClass)}>
          <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No recent activity from your people</p>
          <p className="text-xs mt-1">Follow more people to see what's happening!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} data-testid="friend-activity">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className={cn("h-5 w-5", textClass)} />
          <h3 className={cn("font-display text-sm tracking-widest uppercase", textClass)}>
            Your People Are Moving
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className={textMutedClass}
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </Button>
      </div>

      {/* Activity list */}
      <div>
        {activities.map((activity, index) => (
          <ActivityItem 
            key={`${activity.type}-${activity.user_id}-${activity.created_at}-${index}`}
            activity={activity}
            isDark={isDark}
          />
        ))}
      </div>
    </div>
  );
};

export default FriendActivity;
