import { Link, useLocation } from 'react-router-dom';
import { Home, Radio, Search, MessageCircle, User, MessageSquare } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/home', icon: Home, label: 'Home' },
  { path: '/stoop', icon: Radio, label: 'Stoop' },
  { path: '/sidebar', icon: MessageSquare, label: 'DMs' },
  { path: '/search', icon: Search, label: 'Search' },
];

export const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { count: unreadCount } = useNotificationCount();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-safe">
      {/* Amber accent line at top */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
      <div className="glass border-t border-white/10">
        <div className="flex items-center justify-around h-16">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          const showBadge = path === '/gc' && unreadCount > 0;
          
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-full relative transition-colors duration-200",
                isActive ? "text-white" : "text-white/40 hover:text-white/70"
              )}
              data-testid={`nav-${label.toLowerCase()}`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.5} />
                {showBadge && (
                  <span className="absolute -top-1 -right-1.5 bg-white text-black text-[9px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[9px] mt-1 font-display tracking-wider uppercase">
                {label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 bg-white rounded-full" />
              )}
            </Link>
          );
        })}
        
        {/* Profile */}
        <Link
          to={user ? `/profile/${user.username}` : '/'}
          className={cn(
            "flex flex-col items-center justify-center w-16 h-full relative transition-colors duration-200",
            location.pathname.startsWith('/profile') ? "text-white" : "text-white/40 hover:text-white/70"
          )}
          data-testid="nav-profile"
        >
          <User className="h-5 w-5" strokeWidth={location.pathname.startsWith('/profile') ? 2 : 1.5} />
          <span className="text-[9px] mt-1 font-display tracking-wider uppercase">
            Profile
          </span>
          {location.pathname.startsWith('/profile') && (
            <span className="absolute bottom-1 w-1 h-1 bg-amber-500 rounded-full" />
          )}
        </Link>
        </div>
      </div>
    </nav>
  );
};
