import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ChevronRight, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { UserCard } from './UserCard';
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

export const PeopleDiscover = ({ 
  limit = 6, 
  compact = false,  // Sidebar widget mode
  fullWidth = false, // Full page mode
  className 
}) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isDark = useTheme();

  // Theme classes
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const textMutedClass = isDark ? 'text-white/40' : 'text-gray-500';
  const borderClass = isDark ? 'border-white/10' : 'border-gray-200';
  const hoverBgClass = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50';

  useEffect(() => {
    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const fetchSuggestions = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    
    try {
      const response = await axios.get(`${API}/users/discover`, {
        params: { limit },
        withCredentials: true
      });
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchSuggestions(true);
  };

  // Get suggestion reason display info
  const getMutualConnection = async (user) => {
    if (user.mutual_connection) {
      try {
        const response = await axios.get(`${API}/users/profile/${user.mutual_connection}`, {
          withCredentials: true
        });
        return response.data;
      } catch {
        return null;
      }
    }
    return null;
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className={fullWidth ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
          {[...Array(compact ? 3 : limit)].map((_, i) => (
            <div key={i} className={cn("p-4 border", borderClass)}>
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className={cn("h-5 w-5", textClass)} />
          <h3 className={cn("font-display text-sm tracking-widest uppercase", textClass)}>
            People You Might Know
          </h3>
        </div>
        <p className={cn("text-sm", textMutedClass)}>
          Follow more people to get personalized suggestions!
        </p>
      </div>
    );
  }

  // Compact sidebar widget
  if (compact) {
    return (
      <div className={className} data-testid="people-discover-compact">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className={cn("h-4 w-4", textClass)} />
            <h3 className={cn("text-xs font-medium uppercase tracking-wider", textClass)}>
              Suggested
            </h3>
          </div>
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className={cn("p-1 rounded transition-colors", hoverBgClass, textMutedClass)}
          >
            <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
          </button>
        </div>

        <div className="space-y-1">
          {users.slice(0, 3).map((user) => (
            <UserCard 
              key={user.user_id}
              user={user}
              compact
              showActivityStatus
            />
          ))}
        </div>

        <Link 
          to="/search?tab=discover"
          className={cn(
            "flex items-center gap-1 mt-3 pt-3 border-t text-xs transition-colors",
            borderClass,
            textMutedClass,
            isDark ? "hover:text-white" : "hover:text-gray-900"
          )}
        >
          See more suggestions
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  // Full width grid mode
  return (
    <div className={className} data-testid="people-discover">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Sparkles className={cn("h-5 w-5", textClass)} />
          <div>
            <h3 className={cn("font-display text-sm tracking-widest uppercase", textClass)}>
              People You Might Know
            </h3>
            <p className={cn("text-xs mt-0.5", textMutedClass)}>
              Based on who you follow and your community
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className={textMutedClass}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* User grid */}
      <div className={cn(
        fullWidth 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          : "space-y-3"
      )}>
        {users.map((user) => (
          <UserCard
            key={user.user_id}
            user={user}
            reason={user.suggestion_reason}
            mutualConnection={user.mutual_connection ? { username: user.mutual_connection } : null}
            showActivityStatus
            showSuggestionReason
          />
        ))}
      </div>
    </div>
  );
};

export default PeopleDiscover;
