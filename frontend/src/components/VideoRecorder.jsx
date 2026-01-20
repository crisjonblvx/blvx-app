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
  const [facingMode, setFacingMode] = useState('user');
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const isRecordingRef = useRef(false); // Use ref to avoid stale closure

  // Get supported mimeType
  const getSupportedMimeType = () => {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'video/webm'; // fallback
  };

  // Start camera preview
  const startCamera = useCallback(async () => {
    try {
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

  // Stop recording - defined before startRecording to avoid hoisting issues
  const stopRecording = useCallback(() => {
    console.log('[VideoRecorder] stopRecording called, isRecording:', isRecordingRef.current);
    
    if (!isRecordingRef.current) {
      console.log('[VideoRecorder] Not recording, ignoring stop');
      return;
    }
    
    // Clear timer first
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop the media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log('[VideoRecorder] Stopping MediaRecorder, state:', mediaRecorderRef.current.state);
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error('[VideoRecorder] Error stopping recorder:', e);
      }
    }
    
    isRecordingRef.current = false;
    setIsRecording(false);
  }, []);

  // Start recording
  const startRecording = useCallback(() => {
    if (!streamRef.current) {
      toast.error('Camera not ready');
      return;
    }

    console.log('[VideoRecorder] Starting recording...');
    
    chunksRef.current = [];
    setRecordedBlob(null);
    setRecordedUrl(null);
    setTimeElapsed(0);

    const mimeType = getSupportedMimeType();
    console.log('[VideoRecorder] Using mimeType:', mimeType);

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });

      mediaRecorder.ondataavailable = (e) => {
        console.log('[VideoRecorder] Data available:', e.data.size);
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('[VideoRecorder] MediaRecorder stopped, chunks:', chunksRef.current.length);
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: mimeType.split(';')[0] });
          console.log('[VideoRecorder] Created blob:', blob.size);
          setRecordedBlob(blob);
          setRecordedUrl(URL.createObjectURL(blob));
        } else {
          toast.error('No video data recorded');
        }
      };

      mediaRecorder.onerror = (e) => {
        console.error('[VideoRecorder] MediaRecorder error:', e);
        toast.error('Recording error occurred');
        stopRecording();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every 1 second for more reliable chunks
      
      isRecordingRef.current = true;
      setIsRecording(true);
      console.log('[VideoRecorder] Recording started');

      // Start timer
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => {
          const newTime = prev + 1;
          if (newTime >= MAX_RECORDING_SECONDS) {
            console.log('[VideoRecorder] Max time reached, stopping...');
            stopRecording();
            toast.info(`Recording stopped - ${MAX_RECORDING_SECONDS} second limit reached`);
          }
          return newTime;
        });
      }, 1000);
      
    } catch (err) {
      console.error('[VideoRecorder] Failed to start recording:', err);
      toast.error('Failed to start recording');
    }
  }, [stopRecording]);

  // Reset recording
  const resetRecording = useCallback(() => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedBlob(null);
    setRecordedUrl(null);
    setTimeElapsed(0);
    chunksRef.current = [];
  }, [recordedUrl]);

  // Flip camera
  const flipCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  // Use recorded video
  const useVideo = useCallback(() => {
    if (recordedBlob) {
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

  const progressPercent = (timeElapsed / MAX_RECORDING_SECONDS) * 100;

  // Handle dialog close
  const handleClose = useCallback(() => {
    if (isRecordingRef.current) {
      stopRecording();
    }
    onClose();
  }, [stopRecording, onClose]);

  // Start camera when dialog opens
  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      resetRecording();
      isRecordingRef.current = false;
      setIsRecording(false);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      stopCamera();
    };
  }, [open, startCamera, stopCamera, resetRecording]);

  // Restart camera when facing mode changes
  useEffect(() => {
    if (open && hasPermission && !isRecording) {
      startCamera();
    }
  }, [facingMode, open, hasPermission, isRecording, startCamera]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
          {recordedUrl ? (
            <video
              src={recordedUrl}
              controls
              className="w-full h-full object-contain"
              autoPlay
              playsInline
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={cn(
                "w-full h-full object-cover",
                facingMode === 'user' && "scale-x-[-1]"
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
