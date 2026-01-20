import { useState, useRef } from 'react';
import { Image, Video, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GifPicker } from '@/components/GifPicker';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const MediaToolbar = ({ onMediaSelect, selectedMedia, onRemoveMedia }) => {
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const handleFileSelect = async (e, isVideo = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - expanded for mobile device formats
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/3gpp', 'video/3gpp2'];
    const validTypes = [...imageTypes, ...videoTypes];
    
    if (!validTypes.includes(file.type)) {
      toast.error('Unsupported file type. Use JPG, PNG, GIF, WebP, MP4, WebM, or MOV.');
      return;
    }

    // Validate file size (50MB for videos, 10MB for images)
    const isVideoFile = videoTypes.includes(file.type);
    const maxSize = isVideoFile ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    const maxSizeMB = maxSize / (1024 * 1024);
    
    if (file.size > maxSize) {
      toast.error(`File too large. Maximum size is ${maxSizeMB}MB.`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/upload`, formData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });

      onMediaSelect({
        url: response.data.url,
        type: isVideoFile ? 'video' : 'image',
        preview: URL.createObjectURL(file),
        width: response.data.width,
        height: response.data.height,
        duration: response.data.duration,
        storage: response.data.storage,
      });
      
      const storageText = response.data.storage === 'cloudinary' ? ' to cloud' : '';
      toast.success(`${isVideoFile ? 'Video' : 'Image'} uploaded${storageText}!`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset inputs
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';
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
          accept="image/*"
          onChange={(e) => handleFileSelect(e, false)}
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
          {uploading && !videoInputRef.current?.files?.length ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Image className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Receipts</span>
        </Button>

        {/* POV (Video Upload) */}
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={(e) => handleFileSelect(e, true)}
          className="hidden"
          id="video-upload"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => videoInputRef.current?.click()}
          disabled={uploading || !!selectedMedia}
          className="text-white/40 hover:text-white text-xs gap-2"
          data-testid="video-upload-btn"
        >
          {uploading && videoInputRef.current?.files?.length ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Video className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">POV</span>
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

      {/* Upload Progress */}
      {uploading && uploadProgress > 0 && (
        <div className="mt-2">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-[10px] text-white/40 mt-1 text-center">
            Uploading... {uploadProgress}%
          </p>
        </div>
      )}

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
