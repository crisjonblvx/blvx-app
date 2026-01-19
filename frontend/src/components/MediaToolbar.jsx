import { useState, useRef } from 'react';
import { Image, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GifPicker } from '@/components/GifPicker';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const MediaToolbar = ({ onMediaSelect, selectedMedia, onRemoveMedia }) => {
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      toast.error('Unsupported file type. Use JPG, PNG, GIF, WebP, MP4, or WebM.');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    setUploading(true);
    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/upload`, formData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onMediaSelect({
        url: response.data.url,
        type: file.type.startsWith('video/') ? 'video' : 'image',
        preview: URL.createObjectURL(file),
      });
      
      toast.success('Media uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
      // For MVP, create local preview URL
      onMediaSelect({
        url: URL.createObjectURL(file),
        type: file.type.startsWith('video/') ? 'video' : 'image',
        preview: URL.createObjectURL(file),
        isLocal: true, // Flag for local-only preview
      });
      toast.success('Media attached (local preview)');
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleGifSelect = (gif) => {
    onMediaSelect({
      url: gif.url,
      type: 'gif',
      width: gif.width,
      height: gif.height,
      alt: gif.title,
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Receipts (Image Upload) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
          id="media-upload"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !!selectedMedia}
          className="text-white/40 hover:text-white text-xs gap-2"
          data-testid="media-upload-btn"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Image className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Receipts</span>
        </Button>

        {/* The Reaction (GIF Picker) */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setGifPickerOpen(true)}
          disabled={!!selectedMedia}
          className="text-white/40 hover:text-white text-xs gap-2"
          data-testid="gif-picker-btn"
        >
          <span className="px-1.5 py-0.5 bg-white/10 text-[10px] font-bold rounded">GIF</span>
          <span className="hidden sm:inline">Reaction</span>
        </Button>
      </div>

      {/* Media Preview */}
      {selectedMedia && (
        <div className="relative mt-3 border border-white/20 rounded-sm overflow-hidden animate-fade-in">
          <button
            onClick={onRemoveMedia}
            className="absolute top-2 right-2 z-10 bg-black/80 p-1.5 rounded-full hover:bg-black transition-colors"
            data-testid="remove-media-btn"
          >
            <X className="h-4 w-4 text-white" />
          </button>
          
          {selectedMedia.type === 'video' ? (
            <video
              src={selectedMedia.preview || selectedMedia.url}
              controls
              className="w-full max-h-64 object-contain bg-black"
            />
          ) : (
            <img
              src={selectedMedia.preview || selectedMedia.url}
              alt={selectedMedia.alt || 'Attached media'}
              className="w-full max-h-64 object-contain bg-black"
            />
          )}
          
          {selectedMedia.type === 'gif' && (
            <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-1 text-[10px] text-white/60">
              GIF
            </div>
          )}
        </div>
      )}

      {/* GIF Picker Modal */}
      <GifPicker
        open={gifPickerOpen}
        onClose={() => setGifPickerOpen(false)}
        onSelect={handleGifSelect}
      />
    </>
  );
};
