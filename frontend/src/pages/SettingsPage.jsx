import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, User, Bell, Shield, HelpCircle, Sparkles, Zap, Moon, Sun, Loader2, Settings2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Admin user IDs (should match backend)
const ADMIN_USERS = ["user_d940ef29bbb5"];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { 
    isSupported: pushSupported, 
    isSubscribed: pushSubscribed, 
    permission: pushPermission,
    loading: pushLoading,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    testNotification
  } = usePushNotifications();
  const [droppingSpark, setDroppingSpark] = useState(false);
  const [sparkCategory, setSparkCategory] = useState('random');

  const handleLogout = async () => {
    await logout();
  };

  const handlePushToggle = async () => {
    if (pushSubscribed) {
      const success = await unsubscribePush();
      if (success) {
        toast.success('Push notifications disabled');
      } else {
        toast.error('Failed to disable notifications');
      }
    } else {
      const success = await subscribePush();
      if (success) {
        toast.success('Push notifications enabled!');
        // Send a test notification
        await testNotification();
      } else {
        if (pushPermission === 'denied') {
          toast.error('Notification permission denied. Please enable in browser settings.');
        } else {
          toast.error('Failed to enable notifications');
        }
      }
    }
  };

  const handleDropSpark = async () => {
    setDroppingSpark(true);
    try {
      const response = await axios.post(
        `${API}/spark/drop`,
        null,
        { 
          params: sparkCategory !== 'random' ? { category: sparkCategory } : {},
          withCredentials: true 
        }
      );
      toast.success('Spark dropped to The Block!');
    } catch (error) {
      console.error('Spark error:', error);
      toast.error(error.response?.data?.detail || 'Failed to drop Spark');
    } finally {
      setDroppingSpark(false);
    }
  };

  const settingSections = [
    {
      title: 'Account',
      items: [
        {
          icon: User,
          label: 'Edit Profile',
          onClick: () => navigate(`/profile/${user?.username}`),
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: Bell,
          label: 'Push Notifications',
          description: pushSupported 
            ? (pushPermission === 'denied' ? 'Blocked in browser settings' : (pushSubscribed ? 'Enabled' : 'Disabled'))
            : 'Not supported in this browser',
          toggle: true,
          value: pushSubscribed,
          onChange: handlePushToggle,
          disabled: !pushSupported || pushLoading || pushPermission === 'denied',
        },
        {
          icon: isDark ? Moon : Sun,
          label: isDark ? 'Cinema Mode' : 'Editorial Mode',
          description: isDark ? 'Immersive dark theme (current)' : 'Light magazine aesthetic (current)',
          toggle: true,
          value: !isDark, // Toggle is OFF for dark mode, ON for light
          onChange: toggleTheme,
        },
      ],
    },
    // Admin section - only show for admin users
    ...(ADMIN_USERS.includes(user?.user_id) ? [{
      title: 'Admin',
      items: [
        {
          icon: Settings2,
          label: 'Admin Dashboard',
          description: 'Manage users, posts, and platform',
          onClick: () => navigate('/admin'),
        },
      ],
    }] : []),
    {
      title: 'About',
      items: [
        {
          icon: Sparkles,
          label: 'About Bonita',
          description: 'Learn about our AI companion',
        },
        {
          icon: Shield,
          label: 'Privacy & Safety',
          description: 'How we protect your data',
        },
        {
          icon: HelpCircle,
          label: 'Help & Support',
          description: 'Get help using BLVX',
        },
      ],
    },
  ];

  return (
    <div className="mb-safe" data-testid="settings-page">
      {/* Header */}
      <div className="sticky top-14 md:top-0 z-30 glass border-b border-white/10 p-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white/60 hover:text-white md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-lg tracking-wide uppercase">Settings</h1>
        </div>
      </div>

      {/* Profile Photo Section */}
      <div className="p-6 border-b border-white/10 flex flex-col items-center">
        <div 
          className="relative cursor-pointer group"
          onClick={handleAvatarClick}
          data-testid="avatar-upload-btn"
        >
          {/* Avatar Image */}
          <div className="w-24 h-24 rounded-full overflow-hidden bg-white/10 border-2 border-white/20 group-hover:border-amber-500 transition-colors">
            {(avatarPreview || user?.picture) ? (
              <img 
                src={avatarPreview || user?.picture} 
                alt={user?.name || 'Profile'} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/40">
                <User className="w-10 h-10" />
              </div>
            )}
          </div>
          
          {/* Camera Overlay */}
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {uploadingAvatar ? (
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            ) : (
              <Camera className="w-6 h-6 text-white" />
            )}
          </div>
          
          {/* Camera Badge */}
          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center border-2 border-black">
            <Camera className="w-4 h-4 text-black" />
          </div>
        </div>
        
        <p className="mt-3 font-medium">{user?.name || user?.username}</p>
        <p className="text-sm text-white/50">@{user?.username}</p>
        <p className="text-xs text-white/30 mt-2">Tap to change photo</p>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleAvatarChange}
          className="hidden"
          data-testid="avatar-file-input"
        />
      </div>

      {/* The Spark - Admin Tool */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-yellow-500" />
          <h2 className="font-display text-sm tracking-widest uppercase">The Spark</h2>
        </div>
        <p className="text-xs text-white/40 mb-4">
          Drop a Bonita-generated conversation starter to The Block
        </p>
        
        <div className="flex gap-2">
          <Select value={sparkCategory} onValueChange={setSparkCategory}>
            <SelectTrigger className="flex-1 bg-transparent border-white/20 focus:border-white rounded-none">
              <SelectValue placeholder="Select topic" />
            </SelectTrigger>
            <SelectContent className="bg-black border-white/20">
              <SelectItem value="random">Random</SelectItem>
              <SelectItem value="music">Music</SelectItem>
              <SelectItem value="tech">Tech</SelectItem>
              <SelectItem value="culture">Culture</SelectItem>
              <SelectItem value="politics">Politics</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            onClick={handleDropSpark}
            disabled={droppingSpark}
            className="bg-white text-black hover:bg-white/90 rounded-none font-display tracking-wider"
            data-testid="drop-spark-btn"
          >
            {droppingSpark ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Drop Spark
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Culture Calendar */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-red-500" />
          <h2 className="font-display text-sm tracking-widest uppercase">Culture Calendar</h2>
        </div>
        <p className="text-xs text-white/40 mb-4">
          Bonita posts for culturally significant dates (MLK Day, Juneteenth, Hispanic Heritage Month, etc.)
        </p>
        
        <Button
          onClick={handleDropCalendarPost}
          disabled={droppingCalendar}
          variant="outline"
          className="w-full border-white/20 text-white hover:bg-white hover:text-black rounded-none font-display tracking-wider"
          data-testid="drop-calendar-btn"
        >
          {droppingCalendar ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Calendar className="h-4 w-4 mr-2" />
              Post Today's Event
            </>
          )}
        </Button>
      </div>

      {/* Settings List */}
      <div className="divide-y divide-white/10">
        {settingSections.map((section) => (
          <div key={section.title} className="py-4">
            <h2 className="px-4 text-xs font-display uppercase tracking-wider text-white/40 mb-2">
              {section.title}
            </h2>
            
            {section.items.map((item) => {
              const Icon = item.icon;
              
              if (item.toggle) {
                return (
                  <div 
                    key={item.label}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-white/60" />
                      <div>
                        <span className="text-white">{item.label}</span>
                        {item.description && (
                          <p className="text-xs text-white/40">{item.description}</p>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={item.value}
                      onCheckedChange={item.onChange}
                    />
                  </div>
                );
              }
              
              return (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                >
                  <Icon className="h-5 w-5 text-white/60" />
                  <div>
                    <p className="text-white">{item.label}</p>
                    {item.description && (
                      <p className="text-sm text-white/40">{item.description}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}

        {/* Logout */}
        <div className="p-4">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-red-500 hover:text-red-400 hover:bg-red-500/10"
            data-testid="logout-btn"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Log out
          </Button>
        </div>
      </div>

      {/* App Info */}
      <div className="p-4 text-center text-xs text-white/30">
        <p className="font-display tracking-wider">BLVX</p>
        <p>Version 1.0.0</p>
        <p className="mt-2">Culture first. Scale second.</p>
      </div>
    </div>
  );
}
