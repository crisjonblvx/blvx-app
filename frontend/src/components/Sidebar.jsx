import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Sparkles, Bell, User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/home', icon: Home, label: 'Home' },
  { path: '/search', icon: Search, label: 'Search' },
  { path: '/bonita', icon: Sparkles, label: 'Bonita' },
  { path: '/notifications', icon: Bell, label: 'Notifications' },
];

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { count: unreadCount } = useNotificationCount();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col border-r border-white/10 bg-black z-40">
      {/* Logo */}
      <div className="p-6">
        <Link to="/home" className="font-display text-3xl font-bold tracking-wider" data-testid="sidebar-logo">
          BLVX
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          const showBadge = path === '/notifications' && unreadCount > 0;
          
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-sm mb-1 transition-colors duration-200",
                isActive 
                  ? "bg-white text-black" 
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
              data-testid={`sidebar-${label.toLowerCase()}`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" strokeWidth={1.5} />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 bg-white text-black notification-badge rounded-full flex items-center justify-center text-[10px]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
        
        {/* Profile Link */}
        {user && (
          <Link
            to={`/profile/${user.username}`}
            className={cn(
              "flex items-center gap-4 px-4 py-3 rounded-sm mb-1 transition-colors duration-200",
              location.pathname.startsWith('/profile') 
                ? "bg-white text-black" 
                : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
            data-testid="sidebar-profile"
          >
            <User className="h-5 w-5" strokeWidth={1.5} />
            <span className="font-medium">Profile</span>
          </Link>
        )}
        
        <Link
          to="/settings"
          className={cn(
            "flex items-center gap-4 px-4 py-3 rounded-sm mb-1 transition-colors duration-200",
            location.pathname === '/settings' 
              ? "bg-white text-black" 
              : "text-white/70 hover:bg-white/10 hover:text-white"
          )}
          data-testid="sidebar-settings"
        >
          <Settings className="h-5 w-5" strokeWidth={1.5} />
          <span className="font-medium">Settings</span>
        </Link>
      </nav>

      {/* User Section */}
      {user && (
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-10 w-10 border border-white/20">
              <AvatarImage src={user.picture} alt={user.name} />
              <AvatarFallback className="bg-white/10 text-white">
                {user.name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{user.name}</p>
              <p className="text-sm text-white/50 truncate">@{user.username}</p>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            className="w-full justify-start text-white/50 hover:text-white hover:bg-white/10"
            onClick={handleLogout}
            data-testid="sidebar-logout"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Log out
          </Button>
        </div>
      )}
    </aside>
  );
};
