import { useState, useRef } from 'react';
import { Camera, Loader2, User } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { useTheme } from '@/context/ThemeContext';
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
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const EditProfileModal = ({ open, onOpenChange, profile, onUpdate }) => {
  const { updateProfile, loading } = useUsers();
  const { isDark } = useTheme();
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    username: profile?.username || '',
    bio: profile?.bio || '',
    picture: profile?.picture || '',
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  // Theme-aware classes
  const bgClass = isDark ? 'bg-black' : 'bg-white';
  const borderClass = isDark ? 'border-white/20' : 'border-gray-200';
  const borderLightClass = isDark ? 'border-white/10' : 'border-gray-100';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const textMutedClass = isDark ? 'text-white/60' : 'text-gray-500';
  const textVeryMutedClass = isDark ? 'text-white/40' : 'text-gray-400';
  const inputClass = isDark ? 'bg-transparent border-white/20 focus:border-white' : 'bg-gray-50 border-gray-200 focus:border-amber-500';
  const avatarFallbackClass = isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-700';
  const primaryBtnClass = isDark ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90';

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a JPG, PNG, or WebP image');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    // Upload to server
    setUploadingAvatar(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await axios.post(`${API}/users/avatar`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });

      // Update form data with new picture URL
      setFormData(prev => ({ ...prev, picture: response.data.picture }));
      toast.success('Photo uploaded!');
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload photo');
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

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

  const displayPicture = avatarPreview || formData.picture;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${bgClass} border ${borderClass} sm:max-w-[425px] p-0`}>
        <DialogHeader className={`p-4 border-b ${borderLightClass}`}>
          <div className="flex items-center justify-between">
            <DialogTitle className={`font-display text-lg tracking-wide uppercase ${textClass}`}>
              Edit Profile
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Avatar with upload */}
          <div className="flex flex-col items-center gap-2">
            <div 
              className="relative cursor-pointer group"
              onClick={handleAvatarClick}
              data-testid="avatar-upload-trigger"
            >
              <Avatar className={`h-24 w-24 border-2 ${borderClass} group-hover:border-amber-500 transition-colors`}>
                <AvatarImage src={displayPicture} alt={formData.name} />
                <AvatarFallback className={`${avatarFallbackClass} text-2xl`}>
                  {formData.name?.charAt(0)?.toUpperCase() || <User className="w-8 h-8" />}
                </AvatarFallback>
              </Avatar>
              
              {/* Camera Overlay */}
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingAvatar ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </div>
              
              {/* Camera Badge */}
              <div className={`absolute -bottom-1 -right-1 w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center border-2 ${isDark ? 'border-black' : 'border-white'}`}>
                <Camera className="w-3.5 h-3.5 text-black" />
              </div>
            </div>
            
            <p className={`text-xs ${textVeryMutedClass}`}>Tap to change photo</p>
            
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

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className={textMutedClass}>Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Your name"
              className={inputClass}
              data-testid="edit-name-input"
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username" className={textMutedClass}>Username</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
              placeholder="username"
              className={inputClass}
              data-testid="edit-username-input"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio" className={textMutedClass}>Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell us about yourself..."
              className={`${inputClass} min-h-[80px] resize-none`}
              data-testid="edit-bio-input"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading || uploadingAvatar}
            className={`w-full ${primaryBtnClass} rounded-sm`}
            data-testid="save-profile-btn"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
