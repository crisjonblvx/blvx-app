import { useEffect, useState } from 'react';
import { useThemeClasses } from '@/hooks/useTheme';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Repeat2, UserPlus, Check, DoorOpen, Share2 } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const { notifications, loading, fetchNotifications, markAllRead } = useNotifications();
  const { refetch: refetchCount } = useNotificationCount();
  const [marking, setMarking] = useState(false);
  const { isDark, textClass, textMutedClass, textVeryMutedClass, borderClass, hoverBgClass } = useThemeClasses();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    setMarking(true);
    try {
      await markAllRead();
      await refetchCount();
    } finally {
      setMarking(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-red-500 fill-red-500" />;
      case 'reply':
        return <MessageCircle className="h-4 w-4 text-blue-400" />;
      case 'repost':
        return <Repeat2 className="h-4 w-4 text-green-400" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-purple-400" />;
      case 'stoop_visit':
        return <DoorOpen className="h-4 w-4 text-amber-400" />;
      case 'stoop_share_request':
        return <Share2 className="h-4 w-4 text-amber-400" />;
      default:
        return null;
    }
  };

  const getNotificationText = (notif) => {
    switch (notif.type) {
      case 'like':
        return 'liked your post';
      case 'reply':
        return 'replied to your post';
      case 'repost':
        return 'reposted your post';
      case 'follow':
        return 'followed you';
      case 'mention':
        return 'mentioned you';
      case 'stoop_visit':
        return 'stopped by your stoop';
      case 'stoop_share_request':
        return 'wants to share a stoop conversation';
      default:
        return 'interacted with your post';
    }
  };

  const getNotificationLink = (notif) => {
    switch (notif.type) {
      case 'stoop_visit':
      case 'stoop_share_request':
        return '/ai-stoop-settings';
      default:
        return notif.post_id ? `/post/${notif.post_id}` : `/profile/${notif.from_user?.username}`;
    }
  };

  const formatTime = (dateStr) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: false });
    } catch {
      return '';
    }
  };

  const hasUnread = notifications.some(n => !n.read);

  return (
    <div className="mb-safe" data-testid="notifications-page">
      {/* Header */}
      <div className={cn("sticky top-14 md:top-0 z-30 glass border-b p-4", borderClass)}>
        <div className="flex items-center justify-between">
          <h1 className={cn("font-display text-xl font-semibold tracking-wide uppercase", textClass)}>Notifications</h1>
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={marking}
              className={cn(isDark ? "text-white/60 hover:text-white" : "text-gray-600 hover:text-gray-900")}
              data-testid="mark-all-read"
            >
              <Check className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="p-4 space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 px-6">
          <p className={cn("text-lg mb-2", textMutedClass)}>No notifications yet</p>
          <p className={cn("text-sm", isDark ? "text-white/30" : "text-gray-400")}>When people interact with your posts, you'll see it here</p>
        </div>
      ) : (
        <div className={cn("divide-y", borderClass)}>
          {notifications.map((notif, index) => (
            <Link
              key={notif.notification_id}
              to={getNotificationLink(notif)}
              className={cn(
                "flex items-start gap-3 p-4 transition-colors animate-fade-in",
                hoverBgClass,
                !notif.read && (isDark ? "bg-white/5" : "bg-gray-50")
              )}
              style={{ animationDelay: `${index * 50}ms` }}
              data-testid={`notification-${notif.notification_id}`}
            >
              {/* Icon */}
              <div className="mt-1">
                {getNotificationIcon(notif.type)}
              </div>

              {/* Avatar */}
              <Avatar className="h-10 w-10 border border-white/20">
                <AvatarImage src={notif.from_user?.picture} alt={notif.from_user?.name} />
                <AvatarFallback className="bg-white/10 text-white">
                  {notif.from_user?.name?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-semibold text-white">{notif.from_user?.name}</span>
                  <span className="text-white/60"> {getNotificationText(notif)}</span>
                </p>
                
                {notif.post && (
                  <p className="text-sm text-white/40 line-clamp-1 mt-1">
                    {notif.post.content}
                  </p>
                )}
                
                <p className="text-xs text-white/30 font-mono mt-1">
                  {formatTime(notif.created_at)}
                </p>
              </div>

              {/* Unread indicator */}
              {!notif.read && (
                <span className="w-2 h-2 bg-white rounded-full flex-shrink-0 mt-2" />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
