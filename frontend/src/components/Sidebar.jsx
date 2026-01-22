import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Radio, Search, MessageCircle, User, Settings, LogOut, Sparkles, Ticket, Plus, Calendar } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ComposerModal } from '@/components/ComposerModal';
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
  const { assets } = useTheme();
  const { count: unreadCount } = useNotificationCount();
  const [composerOpen, setComposerOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col border-r border-white/10 bg-black z-40">
        {/* Logo */}
        <div className="p-6">
          <Link to="/home" data-testid="sidebar-logo">
            <img 
              src={assets.logo}
              alt="BLVX"
              className="h-8"
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 flex flex-col">
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
                    ? "bg-white text-black" 
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
                data-testid={`sidebar-${label.toLowerCase().replace(' ', '-')}`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 bg-white text-black text-[9px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center">
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
              to={`/profile/${user.username}`}
              className={cn(
                "flex items-center gap-4 px-4 py-3 mb-1 transition-colors duration-200",
                location.pathname.startsWith('/profile') 
                  ? "bg-white text-black" 
                  : "text-white/60 hover:bg-white/5 hover:text-white"
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
                ? "bg-white text-black" 
                : "text-white/60 hover:bg-white/5 hover:text-white"
            )}
            data-testid="sidebar-settings"
          >
            <Settings className="h-5 w-5" strokeWidth={1.5} />
            <span className="font-medium text-sm">Settings</span>
          </Link>
          
          {/* New Post Button - below Settings, pushes down with margin */}
          <div className="mt-5 mb-auto px-1">
            <Button
              onClick={() => setComposerOpen(true)}
              className="w-full h-12 bg-white text-black hover:bg-white/90 font-display tracking-wider text-sm"
              data-testid="sidebar-new-post-btn"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Post
            </Button>
          </div>
        </nav>

        {/* User Section */}
        {user && (
          <div className="p-4 border-t border-white/10">
            {/* Plates remaining */}
            <div className="flex items-center gap-2 text-xs text-white/40 mb-4 px-2">
              <Ticket className="h-4 w-4" />
              <span>{user.plates_remaining || 0} Plates</span>
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-10 w-10 border border-white/20">
                <AvatarImage src={user.picture} alt={user.name} />
                <AvatarFallback className="bg-white/10 text-white text-sm">
                  {user.name?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm truncate">{user.name}</p>
                <p className="text-xs text-white/40 truncate">@{user.username}</p>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start text-white/40 hover:text-white hover:bg-white/5 text-sm"
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
