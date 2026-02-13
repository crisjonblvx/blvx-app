import { useState, useCallback, useRef } from 'react';
import api from '@/lib/api';

export const useBonitaChat = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const currentAudioRef = useRef(null);

  const playAudio = useCallback((audioBase64, format = 'mp3') => {
    // Stop any currently playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    const audioBlob = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
    const blob = new Blob([audioBlob], { type: `audio/${format}` });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudioRef.current = audio;

    audio.play().catch(e => console.warn('Audio playback failed:', e));
    audio.onended = () => {
      URL.revokeObjectURL(url);
      currentAudioRef.current = null;
    };
  }, []);

  const stopAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
  }, []);

  const askBonita = useCallback(async (content, mode = 'conversation', context = 'block') => {
    setLoading(true);

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content }]);

    try {
      const response = await api.post(`/bonita/ask`, {
        mode,
        content,
        context
      }, {
        withCredentials: true
      });

      const bonitaResponse = response.data.response;

      // Add Bonita's response
      setMessages(prev => [...prev, { role: 'assistant', content: bonitaResponse }]);

      return bonitaResponse;
    } catch (err) {
      const errorMsg = "I'm having trouble connecting right now. Try again in a moment.";
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const askBonitaWithVoice = useCallback(async (content, mode = 'conversation', context = 'block') => {
    setLoading(true);

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content }]);

    try {
      const response = await api.post(`/bonita/speak`, {
        mode,
        content,
        context
      }, {
        withCredentials: true
      });

      const { response: bonitaResponse, audio, audio_format } = response.data;

      // Add Bonita's response with audio data
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: bonitaResponse,
        audio: audio,
        audioFormat: audio_format
      }]);

      // Auto-play the audio response
      if (audio) {
        playAudio(audio, audio_format);
      }

      return bonitaResponse;
    } catch (err) {
      const errorMsg = "I'm having trouble connecting right now. Try again in a moment.";
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [playAudio]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Determine supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(100); // Collect data every 100ms
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
      throw new Error('Microphone access denied');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        setRecording(false);
        resolve(null);
        return;
      }

      recorder.onstop = async () => {
        const mimeType = recorder.mimeType;
        const blob = new Blob(chunksRef.current, { type: mimeType });

        // Stop all tracks
        recorder.stream.getTracks().forEach(t => t.stop());
        mediaRecorderRef.current = null;
        setRecording(false);

        // Transcribe
        setTranscribing(true);
        try {
          const formData = new FormData();
          const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
          formData.append('audio', blob, `recording.${ext}`);

          const response = await api.post(`/bonita/transcribe`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            withCredentials: true
          });

          resolve(response.data.text || '');
        } catch (err) {
          console.error('Transcription failed:', err);
          resolve(null);
        } finally {
          setTranscribing(false);
        }
      };

      recorder.stop();
    });
  }, []);

  const clearMessages = useCallback(() => {
    stopAudio();
    setMessages([]);
  }, [stopAudio]);

  return {
    messages,
    loading,
    recording,
    transcribing,
    askBonita,
    askBonitaWithVoice,
    playAudio,
    stopAudio,
    startRecording,
    stopRecording,
    clearMessages
  };
};
