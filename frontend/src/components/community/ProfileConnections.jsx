import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Shield, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
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

// Status indicator
const ActivityIndicator = ({ status, lastSeen, isDark }) => {
  const textMutedClass = isDark ? 'text-white/40' : 'text-gray-500';
  
  if (status === 'online') {
    return (
      <span className="flex items-center gap-1 text-green-500 text-xs">
        <span className="w-2 h-2 bg-green-500 rounded-full" />
        Active now
      </span>
    );
  }
  if (status === 'recently') {
    return (
      <span className="flex items-center gap-1 text-amber-500 text-xs">
        <span className="w-2 h-2 bg-amber-500 rounded-full" />
        {lastSeen || 'Recently active'}
      </span>
    );
  }
  return (
    <span className={cn("text-xs", textMutedClass)}>
      {lastSeen || 'Away'}
    </span>
  );
};

export const ProfileConnections = ({ userId, className }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const isDark = useTheme();

  // Theme classes
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const textMutedClass = isDark ? 'text-white/40' : 'text-gray-500';
  const borderClass = isDark ? 'border-white/10' : 'border-gray-200';
  const bgClass = isDark ? 'bg-white/5' : 'bg-gray-50';
  const hoverBgClass = isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100';

  useEffect(() => {
    if (userId) {
      fetchConnections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchConnections = async () => {
    try {
      const response = await axios.get(`${API}/users/${userId}/connections`, {
        withCredentials: true
      });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format join date
  const formatJoinDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className={cn("p-4 border rounded-lg", borderClass, className)}>
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Collapsed summary view
  const Summary = () => (
    <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm">
      {/* Mutuals */}
      {data.mutual_followers_count > 0 && (
        <div className="flex items-center gap-2">
          {/* Stacked avatars */}
          <div className="flex -space-x-2">
            {data.sample_mutuals?.slice(0, 3).map((mutual, i) => (
              <Avatar key={mutual.user_id} className="h-6 w-6 border-2 border-black">
                <AvatarImage src={mutual.picture} alt={mutual.name} />
                <AvatarFallback className="text-[10px] bg-white/10">
                  {(mutual.name || 'U').charAt(0)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span className={textMutedClass}>
            {data.mutual_followers_count} mutual{data.mutual_followers_count !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Voucher */}
      {data.vouched_by && (
        <Link 
          to={`/profile/${data.vouched_by.username}`}
          className={cn("flex items-center gap-1", textMutedClass, isDark ? "hover:text-white" : "hover:text-gray-900")}
        >
          <Shield className="h-3 w-3" />
          Vouched by @{data.vouched_by.username}
        </Link>
      )}

      {/* Activity status */}
      <ActivityIndicator 
        status={data.activity_status} 
        lastSeen={data.last_seen}
        isDark={isDark}
      />
    </div>
  );

  // Expanded detail view
  const Details = () => (
    <div className={cn("mt-4 pt-4 border-t space-y-4", borderClass)}>
      {/* Mutual followers */}
      {data.mutual_followers_count > 0 && (
        <div>
          <h4 className={cn("text-xs uppercase tracking-wider mb-2", textMutedClass)}>
            <Users className="h-3 w-3 inline mr-1" />
            Mutuals ({data.mutual_followers_count})
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.sample_mutuals?.map((mutual) => (
              <Link
                key={mutual.user_id}
                to={`/profile/${mutual.username}`}
                className={cn(
                  "flex items-center gap-2 px-2 py-1 rounded-full transition-colors",
                  bgClass, hoverBgClass
                )}
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={mutual.picture} alt={mutual.name} />
                  <AvatarFallback className="text-[8px]">
                    {(mutual.name || 'U').charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className={cn("text-xs", textClass)}>@{mutual.username}</span>
              </Link>
            ))}
            {data.mutual_followers_count > 5 && (
              <span className={cn("text-xs self-center", textMutedClass)}>
                +{data.mutual_followers_count - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Voucher */}
      {data.vouched_by && (
        <div>
          <h4 className={cn("text-xs uppercase tracking-wider mb-2", textMutedClass)}>
            <Shield className="h-3 w-3 inline mr-1" />
            Vouched By
          </h4>
          <Link
            to={`/profile/${data.vouched_by.username}`}
            className={cn(
              "flex items-center gap-2 p-2 rounded transition-colors",
              bgClass, hoverBgClass
            )}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={data.vouched_by.picture} alt={data.vouched_by.name} />
              <AvatarFallback className="text-xs">
                {(data.vouched_by.name || 'U').charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className={cn("text-sm", textClass)}>{data.vouched_by.name}</p>
              <p className={cn("text-xs", textMutedClass)}>@{data.vouched_by.username}</p>
            </div>
          </Link>
        </div>
      )}

      {/* Join info */}
      <div>
        <h4 className={cn("text-xs uppercase tracking-wider mb-2", textMutedClass)}>
          <Calendar className="h-3 w-3 inline mr-1" />
          Joined
        </h4>
        <p className={cn("text-sm", textClass)}>
          {formatJoinDate(data.joined)}
          {data.is_day_one && (
            <span className="ml-2 text-amber-500 text-xs font-medium">
              Day One 🌟
            </span>
          )}
        </p>
      </div>
    </div>
  );

  return (
    <div 
      className={cn("p-4 border rounded-lg", borderClass, className)}
      data-testid="profile-connections"
    >
      <Summary />
      
      {/* Expand/collapse toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center gap-1 mt-3 text-xs transition-colors",
          textMutedClass,
          isDark ? "hover:text-white" : "hover:text-gray-900"
        )}
      >
        {expanded ? (
          <>
            <ChevronUp className="h-3 w-3" />
            Less
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3" />
            More
          </>
        )}
      </button>

      {expanded && <Details />}
    </div>
  );
};

export default ProfileConnections;
