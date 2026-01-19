import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, User, Bell, Shield, HelpCircle, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);

  const handleLogout = async () => {
    await logout();
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
          label: 'Notifications',
          toggle: true,
          value: notifications,
          onChange: setNotifications,
        },
      ],
    },
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
                      <span className="text-white">{item.label}</span>
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
