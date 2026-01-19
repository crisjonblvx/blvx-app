import { useState } from 'react';
import { X } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

export const EditProfileModal = ({ open, onOpenChange, profile, onUpdate }) => {
  const { updateProfile, loading } = useUsers();
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    username: profile?.username || '',
    bio: profile?.bio || '',
    picture: profile?.picture || '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const updated = await updateProfile({
        name: formData.name,
        username: formData.username,
        bio: formData.bio,
        picture: formData.picture,
      });
      
      onUpdate(updated);
      onOpenChange(false);
      toast.success('Profile updated');
    } catch (error) {
      if (error.response?.data?.detail === 'Username already taken') {
        toast.error('Username is already taken');
      } else {
        toast.error('Failed to update profile');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border border-white/20 sm:max-w-[425px] p-0">
        <DialogHeader className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display text-lg tracking-wide uppercase">
              Edit Profile
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenChange(false)}
              className="text-white/60 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Avatar preview */}
          <div className="flex justify-center">
            <Avatar className="h-20 w-20 border border-white/20">
              <AvatarImage src={formData.picture} alt={formData.name} />
              <AvatarFallback className="bg-white/10 text-white text-xl">
                {formData.name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Picture URL */}
          <div className="space-y-2">
            <Label htmlFor="picture" className="text-white/60">Picture URL</Label>
            <Input
              id="picture"
              value={formData.picture}
              onChange={(e) => setFormData(prev => ({ ...prev, picture: e.target.value }))}
              placeholder="https://..."
              className="bg-transparent border-white/20 focus:border-white"
            />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white/60">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Your name"
              className="bg-transparent border-white/20 focus:border-white"
              data-testid="edit-name-input"
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-white/60">Username</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
              placeholder="username"
              className="bg-transparent border-white/20 focus:border-white"
              data-testid="edit-username-input"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-white/60">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell us about yourself..."
              className="bg-transparent border-white/20 focus:border-white min-h-[80px] resize-none"
              data-testid="edit-bio-input"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black hover:bg-white/90 rounded-sm"
            data-testid="save-profile-btn"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
