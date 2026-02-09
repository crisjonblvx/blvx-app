import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, ChevronRight, Flame } from 'lucide-react';
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

export const TrendingPeople = ({ limit = 5, className }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const isDark = useTheme();

  // Theme classes
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const textMutedClass = isDark ? 'text-white/40' : 'text-gray-500';
  const borderClass = isDark ? 'border-white/10' : 'border-gray-200';
  const hoverBgClass = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50';

  useEffect(() => {
    fetchTrending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const fetchTrending = async () => {
    try {
      const response = await axios.get(`${API}/users/trending`, {
        params: { limit },
        withCredentials: true
      });
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching trending users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format the trending score for display
  const formatScore = (score) => {
    if (!score) return '';
    return `+${score}`;
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-28" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-20 flex-1" />
            <Skeleton className="h-3 w-8" />
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className={cn("h-4 w-4", textMutedClass)} />
          <h3 className={cn("text-xs font-medium uppercase tracking-wider", textMutedClass)}>
            Rising Voices
          </h3>
        </div>
        <p className={cn("text-xs", textMutedClass)}>
          Check back later for trending users
        </p>
      </div>
    );
  }

  return (
    <div className={className} data-testid="trending-people-widget">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className={cn("h-4 w-4", textClass)} />
        <h3 className={cn("text-xs font-medium uppercase tracking-wider", textClass)}>
          Rising Voices
        </h3>
      </div>
      <p className={cn("text-[10px] mb-3 uppercase tracking-wider", textMutedClass)}>
        Who's getting love this week
      </p>

      {/* Trending list */}
      <div className="space-y-1">
        {users.map((user, index) => (
          <Link
            key={user.user_id}
            to={`/profile/${user.username}`}
            className={cn(
              "flex items-center gap-3 py-2 px-2 -mx-2 rounded transition-colors group",
              hoverBgClass
            )}
          >
            {/* Rank */}
            <span className={cn(
              "w-4 text-center font-mono text-sm",
              index === 0 ? "text-amber-500" : textMutedClass
            )}>
              {index + 1}
            </span>

            {/* Avatar */}
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.picture} alt={user.name} />
              <AvatarFallback className={isDark ? 'bg-white/10 text-white text-xs' : 'bg-gray-100 text-gray-900 text-xs'}>
                {(user.name || user.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm truncate group-hover:underline", textClass)}>
                {user.name || user.username}
              </p>
              <p className={cn("text-xs truncate", textMutedClass)}>
                @{user.username}
              </p>
            </div>

            {/* Score indicator */}
            <div className="flex items-center gap-1">
              {index < 3 && <Flame className="h-3 w-3 text-amber-500" />}
              <span className={cn(
                "text-xs font-mono",
                index < 3 ? "text-amber-500" : textMutedClass
              )}>
                {formatScore(user.trending_score)}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* See all link */}
      <Link 
        to="/search?tab=trending"
        className={cn(
          "flex items-center gap-1 mt-3 pt-3 border-t text-xs transition-colors",
          borderClass,
          textMutedClass,
          isDark ? "hover:text-white" : "hover:text-gray-900"
        )}
      >
        See all rising voices
        <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
};

export default TrendingPeople;
