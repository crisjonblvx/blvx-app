import { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Megaphone, MapPin, ThumbsUp, ThumbsDown, Plus, X, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ALERT_TYPES = {
  police: { label: 'Police Activity', icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  safety_hazard: { label: 'Safety Hazard', icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  protest: { label: 'Protest/Rally', icon: Megaphone, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  vibe_check: { label: 'Vibe Check', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  other: { label: 'Other', icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
};

// The Ticker - Shows at top of feed when there are verified alerts
export const LookoutTicker = ({ onOpenLookout }) => {
  const [activeData, setActiveData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveAlerts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchActiveAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveAlerts = async () => {
    try {
      const response = await axios.get(`${API}/lookout/active`, { withCredentials: true });
      setActiveData(response.data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !activeData || activeData.total_active === 0) {
    return null;
  }

  const locationText = Object.entries(activeData.by_location)
    .slice(0, 2)
    .map(([loc, count]) => `${count} in ${loc}`)
    .join(', ');

  return (
    <button
      onClick={onOpenLookout}
      className="w-full px-4 py-3 bg-yellow-500/10 border-b border-yellow-500/30 flex items-center gap-3 hover:bg-yellow-500/20 transition-colors animate-pulse-slow"
      data-testid="lookout-ticker"
    >
      <AlertTriangle className="h-5 w-5 text-yellow-400 animate-pulse" />
      <div className="flex-1 text-left">
        <span className="text-yellow-400 font-medium text-sm">
          ⚠️ {activeData.total_active} Verified Alert{activeData.total_active !== 1 ? 's' : ''}
        </span>
        {locationText && (
          <span className="text-yellow-400/60 text-xs ml-2">
            ({locationText})
          </span>
        )}
      </div>
      <span className="text-yellow-400/60 text-xs">Tap to view</span>
    </button>
  );
};

// Alert Card Component
export const AlertCard = ({ alert, onVouch, onCap }) => {
  const { user } = useAuth();
  const [vouchLoading, setVouchLoading] = useState(false);
  const [capLoading, setCapLoading] = useState(false);
  
  const alertConfig = ALERT_TYPES[alert.alert_type] || ALERT_TYPES.other;
  const Icon = alertConfig.icon;
  const isVerified = alert.status === 'verified';
  const isPending = alert.status === 'pending';

  const handleVouch = async () => {
    setVouchLoading(true);
    try {
      const response = await axios.post(`${API}/lookout/${alert.alert_id}/vouch`, {}, { withCredentials: true });
      toast.success(response.data.message);
      onVouch?.(alert.alert_id, response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to vouch');
    } finally {
      setVouchLoading(false);
    }
  };

  const handleCap = async () => {
    setCapLoading(true);
    try {
      const response = await axios.post(`${API}/lookout/${alert.alert_id}/cap`, {}, { withCredentials: true });
      toast.success(response.data.message);
      onCap?.(alert.alert_id, response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cap');
    } finally {
      setCapLoading(false);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(alert.created_at), { addSuffix: true });
  const expiresIn = formatDistanceToNow(new Date(alert.expires_at), { addSuffix: false });

  return (
    <div 
      className={cn(
        "p-4 border-b transition-colors",
        alertConfig.bg,
        alertConfig.border,
        isVerified && "border-l-4"
      )}
      data-testid={`alert-${alert.alert_id}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={cn("p-2 rounded-sm", alertConfig.bg)}>
          <Icon className={cn("h-5 w-5", alertConfig.color)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("font-display text-sm uppercase tracking-wider", alertConfig.color)}>
              {alertConfig.label}
            </span>
            {isVerified && (
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-medium rounded-sm flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                VERIFIED
              </span>
            )}
            {isPending && (
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] font-medium rounded-sm">
                PENDING
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-[10px] text-white/40 mt-1">
            <MapPin className="h-3 w-3" />
            <span>{alert.location}</span>
            <span>•</span>
            <span>{timeAgo}</span>
            <span>•</span>
            <Clock className="h-3 w-3" />
            <span>Expires in {expiresIn}</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-white text-sm mb-3 pl-11">
        {alert.description}
      </p>

      {/* User & Actions */}
      <div className="flex items-center justify-between pl-11">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={alert.user?.picture} />
            <AvatarFallback className="text-[10px] bg-white/10">
              {alert.user?.name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-white/50">@{alert.user?.username}</span>
        </div>

        {/* Vouch / Cap Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleVouch}
            disabled={vouchLoading}
            className="text-green-400 hover:text-green-300 hover:bg-green-500/10 text-xs gap-1.5"
            data-testid={`vouch-${alert.alert_id}`}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            <span>Vouch</span>
            <span className="text-white/40">({alert.vouches})</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCap}
            disabled={capLoading}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs gap-1.5"
            data-testid={`cap-${alert.alert_id}`}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            <span>Cap</span>
            <span className="text-white/40">({alert.caps})</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

// Create Alert Modal
export const CreateAlertModal = ({ open, onOpenChange, onCreated }) => {
  const [alertType, setAlertType] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!alertType || !description.trim() || !location.trim()) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/lookout`, {
        alert_type: alertType,
        description: description.trim(),
        location: location.trim(),
      }, { withCredentials: true });

      toast.success('Alert posted!');
      onCreated?.(response.data);
      onOpenChange(false);
      setAlertType('');
      setDescription('');
      setLocation('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create alert');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border border-yellow-500/30 sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="font-display text-sm tracking-widest uppercase flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            Post Alert
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Alert Type */}
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block">Alert Type</label>
            <Select value={alertType} onValueChange={setAlertType}>
              <SelectTrigger className="bg-transparent border-white/20 rounded-none">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/20">
                {Object.entries(ALERT_TYPES).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <config.icon className={cn("h-4 w-4", config.color)} />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block">Location</label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City or neighborhood (e.g., Downtown Atlanta)"
              className="bg-transparent border-white/20 rounded-none"
              data-testid="alert-location-input"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider mb-2 block">What's happening?</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the situation..."
              className="bg-transparent border-white/20 rounded-none min-h-[100px] resize-none"
              maxLength={500}
              data-testid="alert-description-input"
            />
            <p className="text-[10px] text-white/30 mt-1 text-right">{description.length}/500</p>
          </div>

          {/* Warning */}
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-400/80">
            <AlertTriangle className="h-4 w-4 inline mr-2" />
            Alerts require 3 vouches to become verified. False reports may affect your reputation.
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={loading || !alertType || !description.trim() || !location.trim()}
            className="w-full bg-yellow-500 text-black hover:bg-yellow-400 rounded-none font-display tracking-wider"
            data-testid="submit-alert-btn"
          >
            {loading ? 'Posting...' : 'Post Alert'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main Lookout Page/Modal
export const LookoutPanel = ({ open, onOpenChange }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // all, verified, pending

  useEffect(() => {
    if (open) {
      fetchAlerts();
    }
  }, [open, filter]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await axios.get(`${API}/lookout`, { 
        params,
        withCredentials: true 
      });
      setAlerts(response.data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVouch = (alertId, data) => {
    setAlerts(prev => prev.map(a => 
      a.alert_id === alertId 
        ? { ...a, vouches: data.vouches, status: data.status }
        : a
    ));
  };

  const handleCap = (alertId, data) => {
    setAlerts(prev => prev.map(a => 
      a.alert_id === alertId 
        ? { ...a, caps: data.caps, status: data.status }
        : a
    ).filter(a => a.status !== 'dismissed'));
  };

  const handleCreated = (newAlert) => {
    setAlerts(prev => [newAlert, ...prev]);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-black border border-yellow-500/30 sm:max-w-[600px] max-h-[80vh] p-0 overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-black border-b border-yellow-500/30 p-4">
            <div className="flex items-center justify-between mb-4">
              <DialogTitle className="font-display text-sm tracking-widest uppercase flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                The Lookout
              </DialogTitle>
              <Button
                onClick={() => setCreateOpen(true)}
                size="sm"
                className="bg-yellow-500 text-black hover:bg-yellow-400 rounded-none text-xs font-display"
                data-testid="new-alert-btn"
              >
                <Plus className="h-3.5 w-3.5 mr-2" />
                Alert
              </Button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'verified', label: 'Verified' },
                { key: 'pending', label: 'Pending' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium transition-colors",
                    filter === key 
                      ? "bg-yellow-500 text-black" 
                      : "bg-white/5 text-white/60 hover:text-white"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Alerts List */}
          <div className="overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mx-auto" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="p-8 text-center">
                <AlertTriangle className="h-12 w-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/50 text-sm mb-2">No active alerts</p>
                <p className="text-white/30 text-xs">Stay safe out there</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <AlertCard 
                  key={alert.alert_id} 
                  alert={alert} 
                  onVouch={handleVouch}
                  onCap={handleCap}
                />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CreateAlertModal 
        open={createOpen} 
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </>
  );
};
