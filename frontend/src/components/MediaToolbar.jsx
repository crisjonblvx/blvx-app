import { useState, useRef } from 'react';
import { Image, Video, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GifPicker } from '@/components/GifPicker';
import { VideoRecorder } from '@/components/VideoRecorder';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const MediaToolbar = ({ onMediaSelect, selectedMedia, onRemoveMedia }) => {
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [videoRecorderOpen, setVideoRecorderOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - images only (videos go through recorder)
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    
    if (!imageTypes.includes(file.type)) {
      toast.error('Unsupported file type. Use JPG, PNG, GIF, or WebP for images. Use POV button to record video.');
      return;
    }

    // Validate file size (10MB for images)
    const maxSize = 10 * 1024 * 1024;
    
    if (file.size > maxSize) {
      toast.error('Image too large. Maximum size is 10MB.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    
    try {
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
        type: 'image',
        preview: URL.createObjectURL(file),
        width: response.data.width,
        height: response.data.height,
        storage: response.data.storage,
      });
      
      const storageText = response.data.storage === 'cloudinary' ? ' to cloud' : '';
      toast.success(`Image uploaded${storageText}!`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
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

  // Handle recorded video from VideoRecorder
  const handleRecordedVideo = async (file, previewUrl) => {
    setUploading(true);
    setUploadProgress(0);
    
    try {
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
        type: 'video',
        preview: previewUrl,
        width: response.data.width,
        height: response.data.height,
        duration: response.data.duration,
        storage: response.data.storage,
      });
      
      toast.success('Video uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
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

        {/* POV (Record Video with 60s limit) */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setVideoRecorderOpen(true)}
          disabled={uploading || !!selectedMedia}
          className="text-white/40 hover:text-white text-xs gap-2"
          data-testid="record-video-btn"
        >
          <Video className="h-4 w-4" />
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

      {/* Video Recorder Modal */}
      <VideoRecorder
        open={videoRecorderOpen}
        onClose={() => setVideoRecorderOpen(false)}
        onVideoRecorded={handleRecordedVideo}
      />
    </>
  );
};
