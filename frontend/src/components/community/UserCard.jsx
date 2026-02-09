import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Activity status indicator
const StatusDot = ({ status }) => {
  if (status === 'online') {
    return <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-black rounded-full" />;
  }
  if (status === 'recently') {
    return <span className="absolute bottom-0 right-0 w-3 h-3 bg-amber-500 border-2 border-black rounded-full" />;
  }
  return null;
};

// Suggestion reason text
const getSuggestionText = (reason, connection, isDark) => {
  const textClass = isDark ? 'text-white/40' : 'text-gray-500';
  
  switch (reason) {
    case 'mutual_connection':
      return (
        <span className={cn("text-xs", textClass)}>
          You both follow <span className={isDark ? 'text-white/60' : 'text-gray-600'}>@{connection?.username || 'someone'}</span>
        </span>
      );
    case 'same_voucher':
      return (
        <span className={cn("text-xs", textClass)}>
          Also vouched by <span className={isDark ? 'text-white/60' : 'text-gray-600'}>@{connection?.username || 'someone'}</span>
        </span>
      );
    case 'new_member':
      return <span className={cn("text-xs", textClass)}>New to The Block</span>;
    case 'active_now':
      return <span className={cn("text-xs", textClass)}>Active on The Block</span>;
    default:
      return null;
  }
};

export const UserCard = ({ 
  user, 
  reason, 
  mutualConnection,
  showActivityStatus = true,
  showSuggestionReason = true,
  compact = false,
  onFollowChange,
  className 
}) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
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

  // Theme classes
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const textMutedClass = isDark ? 'text-white/50' : 'text-gray-600';
  const borderClass = isDark ? 'border-white/10' : 'border-gray-200';
  const hoverBgClass = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50';
  const bgClass = isDark ? 'bg-white/5' : 'bg-gray-50';

  const handleFollow = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (loading) return;
    
    setLoading(true);
    try {
      if (isFollowing) {
        await axios.delete(`${API}/users/follow/${user.user_id}`, { withCredentials: true });
        setIsFollowing(false);
      } else {
        await axios.post(`${API}/users/follow/${user.user_id}`, {}, { withCredentials: true });
        setIsFollowing(true);
      }
      onFollowChange?.(user.user_id, !isFollowing);
    } catch (error) {
      console.error('Follow error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    // Compact inline version
    return (
      <Link
        to={`/profile/${user.username}`}
        className={cn("flex items-center gap-2 py-2 px-2 -mx-2 transition-colors", hoverBgClass, className)}
      >
        <div className="relative">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.picture} alt={user.name} />
            <AvatarFallback className={isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-900'}>
              {(user.name || user.username || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {showActivityStatus && <StatusDot status={user.activity_status} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium truncate", textClass)}>{user.name}</p>
          <p className={cn("text-xs truncate", textMutedClass)}>@{user.username}</p>
        </div>
      </Link>
    );
  }

  // Full card version
  return (
    <div className={cn("p-4 border transition-colors", borderClass, hoverBgClass, className)}>
      <Link to={`/profile/${user.username}`} className="block">
        <div className="flex items-start gap-3">
          {/* Avatar with status */}
          <div className="relative flex-shrink-0">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.picture} alt={user.name} />
              <AvatarFallback className={isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-900'}>
                {(user.name || user.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {showActivityStatus && <StatusDot status={user.activity_status} />}
          </div>

          {/* User info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={cn("font-medium truncate", textClass)}>{user.name}</p>
              {user.verified && (
                <span className="text-amber-500 text-xs">✓</span>
              )}
            </div>
            <p className={cn("text-sm truncate", textMutedClass)}>@{user.username}</p>
            
            {/* Bio preview */}
            {user.bio && (
              <p className={cn("text-sm mt-1 line-clamp-2", textMutedClass)}>{user.bio}</p>
            )}

            {/* Suggestion reason */}
            {showSuggestionReason && reason && (
              <div className="mt-2">
                {getSuggestionText(reason, mutualConnection, isDark)}
              </div>
            )}
          </div>

          {/* Follow button */}
          <Button
            size="sm"
            variant={isFollowing ? "outline" : "default"}
            onClick={handleFollow}
            disabled={loading}
            className={cn(
              "flex-shrink-0",
              isFollowing 
                ? (isDark ? 'border-white/20 text-white hover:bg-white/10' : 'border-gray-300')
                : (isDark ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90')
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isFollowing ? (
              <>
                <UserCheck className="h-4 w-4 mr-1" />
                Following
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-1" />
                Follow
              </>
            )}
          </Button>
        </div>
      </Link>
    </div>
  );
};

export default UserCard;
