import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Settings, LogOut, User, Ticket, Bell, Sun, Moon, Radio, MessageCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export const Header = () => {
  const { user, logout } = useAuth();
  const { assets, isDark, toggleTheme } = useTheme();
  const { count: unreadCount } = useNotificationCount();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Theme-aware classes
  const borderClass = isDark ? 'border-white/10' : 'border-black/10';
  const textClass = isDark ? 'text-white' : 'text-black';
  const textMutedClass = isDark ? 'text-white/60' : 'text-black/60';
  const textVeryMutedClass = isDark ? 'text-white/50' : 'text-black/50';
  const bgClass = isDark ? 'bg-black' : 'bg-white';
  const hoverBgClass = isDark ? 'hover:bg-white/5' : 'hover:bg-black/5';

  const handleLogout = async () => {
    setOpen(false);
    await logout();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 md:hidden pt-safe">
      {/* Main header bar */}
      <div className={`glass border-b ${borderClass}`}>
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo - More prominent */}
          <Link to="/home" data-testid="header-logo" className="flex items-center gap-2">
            <img 
              src={assets.logo}
              alt="BLVX"
              className="h-9"
            />
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              className={textMutedClass}
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to cinematic mode'}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            
            {/* Notifications */}
            <Button 
              variant="ghost" 
              size="icon" 
              className={`${textMutedClass} relative`}
              onClick={() => navigate('/notifications')}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
              )}
            </Button>
            
            {/* Menu Button */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className={textMutedClass} data-testid="header-menu-btn">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className={`${bgClass} border-l ${borderClass} w-[280px]`}>
                <SheetHeader className="text-left">
                  <SheetTitle className={`${textClass} font-display tracking-widest text-sm`}>MENU</SheetTitle>
                </SheetHeader>
                
                {user && (
                  <div className="mt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className={`h-12 w-12 border ${borderClass}`}>
                        <AvatarImage src={user.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name || 'U'}&backgroundColor=${isDark ? '1a1a1a' : 'f5f5f5'}&textColor=${isDark ? 'ffffff' : '111111'}`} alt={user.name || 'User'} />
                        <AvatarFallback className={isDark ? 'bg-white/10 text-white' : 'bg-black/10 text-black'}>
                          {(user.name || user.username || 'U')?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className={`font-medium ${textClass}`}>{user.name || user.username || 'User'}</p>
                        <p className={`text-sm ${textVeryMutedClass}`}>@{user.username || 'user'}</p>
                      </div>
                    </div>
                    
                    {/* Plates */}
                    <div className="flex items-center gap-2 text-xs text-amber-500/80 mb-4 px-1">
                      <Ticket className="h-4 w-4" />
                      <span>{user.plates_remaining || 0} Plates remaining</span>
                    </div>
                    
                    <Separator className={isDark ? 'bg-white/10' : 'bg-black/10'} />
                    
                    <nav className="space-y-1 mt-4">
                      <Button
                        variant="ghost"
                        className={`w-full justify-start ${textClass} ${hoverBgClass}`}
                        onClick={() => {
                          setOpen(false);
                          navigate(`/profile/${user.username || 'me'}`);
                        }}
                        data-testid="menu-profile-btn"
                      >
                        <User className="mr-3 h-5 w-5" />
                        Profile
                      </Button>
                      <Button
                        variant="ghost"
                        className={`w-full justify-start ${textClass} ${hoverBgClass}`}
                        onClick={() => {
                          setOpen(false);
                          navigate('/settings');
                        }}
                        data-testid="menu-settings-btn"
                      >
                        <Settings className="mr-3 h-5 w-5" />
                        Settings
                      </Button>

                      <Separator className={`my-4 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />

                      <p className={`px-4 text-[10px] font-display tracking-widest uppercase mb-2 ${textVeryMutedClass}`}>More</p>
                      <Button
                        variant="ghost"
                        className={`w-full justify-start ${textMutedClass} ${hoverBgClass}`}
                        onClick={() => {
                          setOpen(false);
                          navigate('/stoop');
                        }}
                      >
                        <Radio className="mr-3 h-5 w-5" />
                        The Stoop
                      </Button>
                      <Button
                        variant="ghost"
                        className={`w-full justify-start ${textMutedClass} ${hoverBgClass}`}
                        onClick={() => {
                          setOpen(false);
                          navigate('/gc');
                        }}
                      >
                        <MessageCircle className="mr-3 h-5 w-5" />
                        The GC
                      </Button>
                      <Button
                        variant="ghost"
                        className={`w-full justify-start ${textMutedClass} ${hoverBgClass}`}
                        onClick={() => {
                          setOpen(false);
                          navigate('/vouch');
                        }}
                      >
                        <Ticket className="mr-3 h-5 w-5" />
                        The Vouch
                      </Button>

                      <Separator className={`my-4 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />

                      <Button
                        variant="ghost"
                        className={`w-full justify-start ${textVeryMutedClass} hover:${textClass} ${hoverBgClass}`}
                        onClick={handleLogout}
                        data-testid="menu-logout-btn"
                      >
                        <LogOut className="mr-3 h-5 w-5" />
                        Log out
                      </Button>
                    </nav>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
      
      {/* Amber accent bar - BLVX brand signature */}
      <div className="h-0.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600" />
    </header>
  );
};
