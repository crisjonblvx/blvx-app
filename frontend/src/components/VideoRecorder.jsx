import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Video, Square, Circle, X, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MAX_RECORDING_SECONDS = 60; // 60 second limit

export const VideoRecorder = ({ open, onClose, onVideoRecorded }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [hasPermission, setHasPermission] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' = front, 'environment' = back
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // Start camera preview
  const startCamera = useCallback(async () => {
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
    } catch (err) {
      console.error('Camera error:', err);
      setHasPermission(false);
      toast.error('Camera access denied. Please enable camera permissions.');
    }
  }, [facingMode]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start recording
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    setRecordedBlob(null);
    setRecordedUrl(null);
    setTimeElapsed(0);

    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp9,opus'
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      setRecordedUrl(URL.createObjectURL(blob));
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(100); // Collect data every 100ms
    setIsRecording(true);

    // Start timer
    timerRef.current = setInterval(() => {
      setTimeElapsed(prev => {
        const newTime = prev + 1;
        // Auto-stop at max time
        if (newTime >= MAX_RECORDING_SECONDS) {
          stopRecording();
          toast.info(`Recording stopped - ${MAX_RECORDING_SECONDS} second limit reached`);
        }
        return newTime;
      });
    }, 1000);
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  // Reset recording
  const resetRecording = useCallback(() => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedBlob(null);
    setRecordedUrl(null);
    setTimeElapsed(0);
  }, [recordedUrl]);

  // Flip camera
  const flipCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  // Use recorded video
  const useVideo = useCallback(() => {
    if (recordedBlob) {
      // Create a File object from the blob
      const file = new File([recordedBlob], `pov_${Date.now()}.webm`, { type: 'video/webm' });
      onVideoRecorded(file, recordedUrl);
      onClose();
    }
  }, [recordedBlob, recordedUrl, onVideoRecorded, onClose]);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercent = (timeElapsed / MAX_RECORDING_SECONDS) * 100;

  // Start camera when dialog opens
  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      resetRecording();
    }
    
    return () => {
      stopCamera();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [open, startCamera, stopCamera, resetRecording]);

  // Restart camera when facing mode changes
  useEffect(() => {
    if (open && hasPermission) {
      startCamera();
    }
  }, [facingMode, open, hasPermission, startCamera]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-black border border-white/20 sm:max-w-[500px] p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-white/10">
          <DialogTitle className="font-display text-sm tracking-widest uppercase flex items-center gap-2">
            <Video className="h-4 w-4" />
            Record POV
            <span className="text-white/40 text-[10px] ml-2">
              {MAX_RECORDING_SECONDS}s max
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="relative aspect-[9/16] max-h-[60vh] bg-black">
          {/* Video Preview / Playback */}
          {recordedUrl ? (
            <video
              src={recordedUrl}
              controls
              className="w-full h-full object-contain"
              autoPlay
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={cn(
                "w-full h-full object-cover",
                facingMode === 'user' && "scale-x-[-1]" // Mirror front camera
              )}
            />
          )}

          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-white text-sm font-mono">{formatTime(timeElapsed)}</span>
              <span className="text-white/40 text-xs">/ {formatTime(MAX_RECORDING_SECONDS)}</span>
            </div>
          )}

          {/* Progress bar */}
          {isRecording && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
              <div 
                className={cn(
                  "h-full transition-all duration-1000",
                  progressPercent > 80 ? "bg-red-500" : "bg-white"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          {/* Camera flip button */}
          {!recordedUrl && !isRecording && (
            <button
              onClick={flipCamera}
              className="absolute top-4 right-4 bg-black/60 p-2 rounded-full hover:bg-black/80 transition-colors"
            >
              <RotateCcw className="h-5 w-5 text-white" />
            </button>
          )}

          {/* Permission denied message */}
          {hasPermission === false && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center p-6">
                <Video className="h-12 w-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/60 text-sm">Camera access required</p>
                <p className="text-white/40 text-xs mt-2">Please enable camera permissions in your browser settings</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-white/10">
          {!recordedUrl ? (
            <div className="flex items-center justify-center gap-4">
              {isRecording ? (
                <Button
                  onClick={stopRecording}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 p-0"
                  data-testid="stop-recording-btn"
                >
                  <Square className="h-6 w-6 text-white fill-white" />
                </Button>
              ) : (
                <Button
                  onClick={startRecording}
                  disabled={!hasPermission}
                  className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 border-4 border-white p-0"
                  data-testid="start-recording-btn"
                >
                  <Circle className="h-8 w-8 text-red-500 fill-red-500" />
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <Button
                onClick={resetRecording}
                variant="ghost"
                className="text-white/60 hover:text-white"
                data-testid="retake-btn"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Retake
              </Button>
              <Button
                onClick={useVideo}
                className="bg-white text-black hover:bg-white/90 px-6"
                data-testid="use-video-btn"
              >
                Use Video
              </Button>
            </div>
          )}
          
          <p className="text-center text-white/30 text-[10px] mt-3">
            {isRecording 
              ? `Recording will auto-stop at ${MAX_RECORDING_SECONDS} seconds`
              : recordedUrl 
                ? 'Preview your recording'
                : 'Tap the button to start recording'
            }
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
