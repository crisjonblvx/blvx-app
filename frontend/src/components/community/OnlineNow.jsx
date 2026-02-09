import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
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

// Status dot component
const StatusDot = ({ status, size = 'sm' }) => {
  const sizeClass = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';
  
  if (status === 'online') {
    return <span className={cn(sizeClass, "bg-green-500 rounded-full inline-block")} />;
  }
  if (status === 'recently') {
    return <span className={cn(sizeClass, "bg-amber-500 rounded-full inline-block")} />;
  }
  return <span className={cn(sizeClass, "bg-white/20 rounded-full inline-block")} />;
};

export const OnlineNow = ({ limit = 8, className }) => {
  const [data, setData] = useState({ total_online: 0, users: [] });
  const [loading, setLoading] = useState(true);
  const isDark = useTheme();

  // Theme classes
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const textMutedClass = isDark ? 'text-white/40' : 'text-gray-500';
  const borderClass = isDark ? 'border-white/10' : 'border-gray-200';
  const hoverBgClass = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50';

  useEffect(() => {
    fetchOnlineUsers();
    // Refresh every 2 minutes
    const interval = setInterval(fetchOnlineUsers, 120000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const fetchOnlineUsers = async () => {
    try {
      const response = await axios.get(`${API}/users/online`, {
        params: { limit },
        withCredentials: true
      });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching online users:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-2 py-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (data.users.length === 0) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 mb-3">
          <Users className={cn("h-4 w-4", textMutedClass)} />
          <h3 className={cn("text-xs font-medium uppercase tracking-wider", textMutedClass)}>Who's Here</h3>
        </div>
        <p className={cn("text-xs", textMutedClass)}>The Block is quiet right now...</p>
      </div>
    );
  }

  return (
    <div className={className} data-testid="online-now-widget">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className={cn("h-4 w-4", textClass)} />
          <h3 className={cn("text-xs font-medium uppercase tracking-wider", textClass)}>Who's Here</h3>
        </div>
        <span className={cn("text-xs", textMutedClass)}>
          {data.total_online} on The Block
        </span>
      </div>

      {/* User list */}
      <div className="space-y-1">
        {data.users.map((user) => (
          <Link
            key={user.user_id}
            to={`/profile/${user.username}`}
            className={cn(
              "flex items-center gap-2 py-2 px-2 -mx-2 rounded transition-colors",
              hoverBgClass
            )}
          >
            <div className="relative">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.picture} alt={user.name} />
                <AvatarFallback className={isDark ? 'bg-white/10 text-white text-xs' : 'bg-gray-100 text-gray-900 text-xs'}>
                  {(user.name || user.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-black rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm truncate", textClass)}>{user.username}</p>
            </div>
            <span className={cn("text-[10px]", textMutedClass)}>
              {user.last_seen?.replace('Active ', '') || 'now'}
            </span>
          </Link>
        ))}
      </div>

      {/* See all link */}
      {data.total_online > limit && (
        <Link 
          to="/search?tab=people&filter=online"
          className={cn(
            "flex items-center gap-1 mt-3 pt-3 border-t text-xs transition-colors",
            borderClass,
            textMutedClass,
            isDark ? "hover:text-white" : "hover:text-gray-900"
          )}
        >
          See all {data.total_online} people
          <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
};

export default OnlineNow;
