import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Settings, LogOut, User, Ticket, Bell } from 'lucide-react';
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
  const { assets } = useTheme();
  const { count: unreadCount } = useNotificationCount();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 md:hidden pt-safe">
      {/* Main header bar */}
      <div className="glass border-b border-white/10">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo - More prominent */}
          <Link to="/home" data-testid="header-logo" className="flex items-center gap-2">
            <img 
              src={assets.logo}
              alt="BLVX"
              className="h-7"
            />
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white/60 relative"
              onClick={() => navigate('/gc')}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
              )}
            </Button>
            
            {/* Menu Button */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white/60" data-testid="header-menu-btn">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-black border-l border-white/10 w-[280px]">
                <SheetHeader className="text-left">
                  <SheetTitle className="text-white font-display tracking-widest text-sm">MENU</SheetTitle>
                </SheetHeader>
                
                {user && (
                  <div className="mt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="h-12 w-12 border border-white/20">
                        <AvatarImage src={user.picture} alt={user.name} />
                        <AvatarFallback className="bg-white/10 text-white">
                          {user.name?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-white">{user.name}</p>
                        <p className="text-sm text-white/50">@{user.username}</p>
                      </div>
                    </div>
                    
                    {/* Plates */}
                    <div className="flex items-center gap-2 text-xs text-amber-500/80 mb-4 px-1">
                      <Ticket className="h-4 w-4" />
                      <span>{user.plates_remaining || 0} Plates remaining</span>
                    </div>
                    
                    <Separator className="bg-white/10 my-4" />
                    
                    <nav className="space-y-1">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-white hover:bg-white/5"
                        onClick={() => {
                          setOpen(false);
                          navigate(`/profile/${user.username}`);
                        }}
                        data-testid="menu-profile-btn"
                      >
                        <User className="mr-3 h-5 w-5" />
                        Profile
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-white hover:bg-white/5"
                        onClick={() => {
                          setOpen(false);
                          navigate('/settings');
                        }}
                        data-testid="menu-settings-btn"
                      >
                        <Settings className="mr-3 h-5 w-5" />
                        Settings
                      </Button>
                      
                      <Separator className="bg-white/10 my-4" />
                      
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-white/50 hover:text-white hover:bg-white/5"
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
