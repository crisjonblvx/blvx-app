import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, User, Bell, Shield, HelpCircle, Sparkles, Zap, Moon, Sun, Loader2, Settings2, DoorOpen, Ban, VolumeX, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
  const { toggleTheme, isDark } = useTheme();
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    
    setDeleting(true);
    try {
      await axios.delete(`${API}/users/account`, { withCredentials: true });
      toast.success('Account deleted. We\'re sorry to see you go.');
      setDeleteModalOpen(false);
      await logout();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
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
      await axios.post(
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
          description: 'Update your name, bio, and photo',
          onClick: () => navigate(`/profile/${user?.username}`),
        },
        {
          icon: DoorOpen,
          label: 'Leave a Message',
          description: 'Configure your AI to chat with visitors when you\'re away',
          onClick: () => navigate('/ai-stoop-settings'),
          highlight: true,
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
          value: !isDark,
          onChange: toggleTheme,
        },
      ],
    },
    {
      title: 'Privacy',
      items: [
        {
          icon: Ban,
          label: 'Blocked Users',
          description: 'Manage users you\'ve blocked',
          onClick: () => navigate('/settings/blocked'),
        },
        {
          icon: VolumeX,
          label: 'Muted Users',
          description: 'Manage users you\'ve muted',
          onClick: () => navigate('/settings/muted'),
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
            <SelectContent className="bg-card border-border">
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
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${item.highlight ? 'hover:bg-amber-500/10 bg-amber-500/5' : 'hover:bg-white/5'}`}
                >
                  <Icon className={`h-5 w-5 ${item.highlight ? 'text-amber-400' : 'text-white/60'}`} />
                  <div>
                    <p className={item.highlight ? 'text-amber-300' : 'text-white'}>{item.label}</p>
                    {item.description && (
                      <p className={`text-sm ${item.highlight ? 'text-amber-400/60' : 'text-white/40'}`}>{item.description}</p>
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

        {/* Danger Zone */}
        <div className="p-4 border-t border-red-500/20">
          <h2 className="text-xs font-display uppercase tracking-wider text-red-500/60 mb-4">
            Danger Zone
          </h2>
          <Button
            variant="ghost"
            onClick={() => setDeleteModalOpen(true)}
            className="w-full justify-start text-red-500 hover:text-red-400 hover:bg-red-500/10 border border-red-500/30"
            data-testid="delete-account-btn"
          >
            <Trash2 className="h-5 w-5 mr-3" />
            Delete Account
          </Button>
          <p className="text-xs text-white/30 mt-2">
            Permanently delete your account and all associated data. This cannot be undone.
          </p>
        </div>
      </div>

      {/* Delete Account Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="bg-card border border-red-500/30 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-display text-sm tracking-widest uppercase text-red-500 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription className="text-white/60">
              This action cannot be undone. All your data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-sm text-red-400">
              <p className="font-medium mb-2">This will permanently delete:</p>
              <ul className="text-xs space-y-1 text-red-400/80">
                <li>• All your posts and replies</li>
                <li>• Your profile and settings</li>
                <li>• Your followers and following lists</li>
                <li>• Your messages and conversations</li>
                <li>• Your vouch plates</li>
              </ul>
            </div>
            
            <div>
              <p className="text-xs text-white/50 mb-2">
                Type <span className="font-mono text-red-400">DELETE</span> to confirm:
              </p>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                placeholder="DELETE"
                className="bg-transparent border-red-500/30 focus:border-red-500 font-mono uppercase"
                data-testid="delete-confirm-input"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteConfirmText('');
                }}
                className="flex-1"
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                data-testid="delete-confirm-btn"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Delete Forever'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* App Info */}
      <div className="p-4 text-center text-xs text-white/30">
        <p className="font-display tracking-wider">BLVX</p>
        <p>Version 1.0.0</p>
        <p className="mt-2">Culture first. Scale second.</p>
      </div>
    </div>
  );
}
