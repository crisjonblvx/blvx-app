import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Sparkles, Bell, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/home', icon: Home, label: 'Home' },
  { path: '/search', icon: Search, label: 'Search' },
  { path: '/bonita', icon: Sparkles, label: 'Bonita' },
  { path: '/notifications', icon: Bell, label: 'Notifications' },
];

export const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { count: unreadCount } = useNotificationCount();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass border-t border-white/10 pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          const showBadge = path === '/notifications' && unreadCount > 0;
          
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-full relative transition-colors duration-200",
                isActive ? "text-white" : "text-white/50 hover:text-white/80"
              )}
              data-testid={`nav-${label.toLowerCase()}`}
            >
              <div className="relative">
                <Icon className="h-6 w-6" strokeWidth={isActive ? 2 : 1.5} />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 bg-white text-black notification-badge rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 font-medium tracking-wide uppercase">
                {label}
              </span>
              {isActive && (
                <span className="absolute bottom-2 w-1 h-1 bg-white rounded-full" />
              )}
            </Link>
          );
        })}
        
        {/* Profile */}
        <Link
          to={user ? `/profile/${user.username}` : '/'}
          className={cn(
            "flex flex-col items-center justify-center w-16 h-full relative transition-colors duration-200",
            location.pathname.startsWith('/profile') ? "text-white" : "text-white/50 hover:text-white/80"
          )}
          data-testid="nav-profile"
        >
          <User className="h-6 w-6" strokeWidth={location.pathname.startsWith('/profile') ? 2 : 1.5} />
          <span className="text-[10px] mt-1 font-medium tracking-wide uppercase">
            Profile
          </span>
          {location.pathname.startsWith('/profile') && (
            <span className="absolute bottom-2 w-1 h-1 bg-white rounded-full" />
          )}
        </Link>
      </div>
    </nav>
  );
};
