import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
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
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 md:hidden glass border-b border-white/10 pt-safe">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Logo */}
        <Link to="/home" className="font-display text-2xl font-bold tracking-wider" data-testid="header-logo">
          BLVX
        </Link>

        {/* Menu Button */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white" data-testid="header-menu-btn">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-black border-l border-white/10 w-[280px]">
            <SheetHeader className="text-left">
              <SheetTitle className="text-white font-display tracking-wide">MENU</SheetTitle>
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
                    <p className="text-sm text-white/60">@{user.username}</p>
                  </div>
                </div>
                
                <Separator className="bg-white/10 my-4" />
                
                <nav className="space-y-1">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-white hover:bg-white/10"
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
                    className="w-full justify-start text-white hover:bg-white/10"
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
                    className="w-full justify-start text-white/60 hover:text-white hover:bg-white/10"
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
    </header>
  );
};
