import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Radio, Search, MessageCircle, User, Settings, LogOut, Sparkles, Ticket, Plus, Calendar, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ComposerModal } from '@/components/ComposerModal';
import { OnlineNow, TrendingPeople } from '@/components/community';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/home', icon: Home, label: 'The Block' },
  { path: '/stoop', icon: Radio, label: 'The Stoop' },
  { path: '/search', icon: Search, label: 'Search' },
  { path: '/gc', icon: MessageCircle, label: 'The GC' },
  { path: '/vouch', icon: Ticket, label: 'The Vouch' },
  { path: '/bonita', icon: Sparkles, label: 'Bonita' },
  { path: '/calendar', icon: Calendar, label: 'Culture Calendar' },
];

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { assets, isDark, toggleTheme } = useTheme();
  const { count: unreadCount } = useNotificationCount();
  const [composerOpen, setComposerOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  // Theme-aware classes
  const bgClass = isDark ? 'bg-black' : 'bg-white';
  const borderClass = isDark ? 'border-white/10' : 'border-black/10';
  const textClass = isDark ? 'text-white' : 'text-black';
  const textMutedClass = isDark ? 'text-white/60' : 'text-black/60';
  const textVeryMutedClass = isDark ? 'text-white/40' : 'text-black/40';
  const hoverBgClass = isDark ? 'hover:bg-white/5' : 'hover:bg-black/5';
  const activeBgClass = isDark ? 'bg-white text-black' : 'bg-black text-white';
  const badgeClass = isDark ? 'bg-white text-black' : 'bg-black text-white';

  return (
    <>
      <aside className={`hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col border-r ${borderClass} ${bgClass} z-40`}>
        {/* Logo with amber accent */}
        <div className={`p-6 border-b ${borderClass}`}>
          <Link to="/home" data-testid="sidebar-logo" className="block">
            <img 
              src={assets.logo}
              alt="BLVX"
              className="h-12"
            />
            <div className="mt-2 h-0.5 w-16 bg-gradient-to-r from-amber-500 to-transparent rounded-full" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pt-2 flex flex-col">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            const showBadge = path === '/gc' && unreadCount > 0;
            
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 mb-1 transition-colors duration-200",
                  isActive 
                    ? activeBgClass 
                    : `${textMutedClass} ${hoverBgClass} hover:${textClass}`
                )}
                data-testid={`sidebar-${label.toLowerCase().replace(' ', '-')}`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                  {showBadge && (
                    <span className={`absolute -top-1 -right-1 ${badgeClass} text-[9px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center`}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className="font-medium text-sm">{label}</span>
              </Link>
            );
          })}
          
          {/* Profile Link */}
          {user && (
            <Link
              to={`/profile/${user.username || 'me'}`}
              className={cn(
                "flex items-center gap-4 px-4 py-3 mb-1 transition-colors duration-200",
                location.pathname.startsWith('/profile') 
                  ? activeBgClass 
                  : `${textMutedClass} ${hoverBgClass} hover:${textClass}`
              )}
              data-testid="sidebar-profile"
            >
              <User className="h-5 w-5" strokeWidth={1.5} />
              <span className="font-medium text-sm">Profile</span>
            </Link>
          )}
          
          <Link
            to="/settings"
            className={cn(
              "flex items-center gap-4 px-4 py-3 mb-1 transition-colors duration-200",
              location.pathname === '/settings' 
                ? activeBgClass 
                : `${textMutedClass} ${hoverBgClass} hover:${textClass}`
            )}
            data-testid="sidebar-settings"
          >
            <Settings className="h-5 w-5" strokeWidth={1.5} />
            <span className="font-medium text-sm">Settings</span>
          </Link>
          
          {/* Theme Toggle - Cinematic Mode */}
          <button
            onClick={toggleTheme}
            className={cn(
              "flex items-center gap-4 px-4 py-3 mb-1 transition-colors duration-200 w-full text-left",
              `${textMutedClass} ${hoverBgClass} hover:${textClass}`
            )}
            data-testid="sidebar-theme-toggle"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to cinematic mode'}
          >
            {isDark ? <Sun className="h-5 w-5" strokeWidth={1.5} /> : <Moon className="h-5 w-5" strokeWidth={1.5} />}
            <span className="font-medium text-sm">{isDark ? 'Light Mode' : 'Cinematic Mode'}</span>
          </button>
          
          {/* New Post Button - below Settings, pushes down with margin */}
          <div className="mt-5 px-1">
            <Button
              onClick={() => setComposerOpen(true)}
              className={`w-full h-12 ${isDark ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90'} font-display tracking-wider text-sm`}
              data-testid="sidebar-new-post-btn"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Post
            </Button>
          </div>

          {/* Community Widgets */}
          <div className={`mt-4 pt-4 border-t ${borderClass} space-y-6 overflow-y-auto flex-1 px-1`}>
            <OnlineNow limit={5} />
            <TrendingPeople limit={5} />
          </div>
        </nav>

        {/* User Section */}
        {user && (
          <div className={`p-4 border-t ${borderClass}`}>
            {/* Plates remaining */}
            <div className={`flex items-center gap-2 text-xs ${textVeryMutedClass} mb-4 px-2`}>
              <Ticket className="h-4 w-4" />
              <span>{user.plates_remaining ?? 10} Plates</span>
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <Avatar className={`h-10 w-10 border ${borderClass}`}>
                <AvatarImage 
                  src={user.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name || 'U'}&backgroundColor=${isDark ? '1a1a1a' : 'f5f5f5'}&textColor=${isDark ? 'ffffff' : '111111'}`} 
                  alt={user.name || 'User'} 
                />
                <AvatarFallback className={`${isDark ? 'bg-white/10 text-white' : 'bg-black/10 text-black'} text-sm`}>
                  {(user.name || user.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${textClass} text-sm truncate`}>{user.name || 'User'}</p>
                <p className={`text-xs ${textVeryMutedClass} truncate`}>@{user.username || 'user'}</p>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              className={`w-full justify-start ${textVeryMutedClass} hover:${textClass} ${hoverBgClass} text-sm`}
              onClick={handleLogout}
              data-testid="sidebar-logout"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Log out
            </Button>
          </div>
        )}
      </aside>
      
      {/* Composer Modal - triggered by sidebar button */}
      <ComposerModal open={composerOpen} onOpenChange={setComposerOpen} />
    </>
  );
};
