import { useState, useCallback, useEffect, useRef } from 'react';
import { Room, RoomEvent, Track, ConnectionState } from 'livekit-client';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * LiveKit Hook for The Stoop - Real-time audio rooms
 * Replaces custom WebRTC implementation with LiveKit SDK
 */
export function useLiveKit({ 
  stoopId, 
  userId,
  onParticipantJoined,
  onParticipantLeft,
  onSpeakingChange 
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [participants, setParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  
  const roomRef = useRef(null);
  const audioElementsRef = useRef({});
  const isConnectingRef = useRef(false);
  
  // Store callbacks in refs to avoid dependency issues
  const callbacksRef = useRef({
    onParticipantJoined,
    onParticipantLeft,
    onSpeakingChange
  });
  
  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = {
      onParticipantJoined,
      onParticipantLeft,
      onSpeakingChange
    };
  }, [onParticipantJoined, onParticipantLeft, onSpeakingChange]);
  
  // Clean up audio elements
  const cleanupAudioElements = useCallback(() => {
    Object.values(audioElementsRef.current).forEach(audio => {
      if (audio) {
        audio.srcObject = null;
        audio.remove();
      }
    });
    audioElementsRef.current = {};
  }, []);

  // Update participants list from room
  const updateParticipants = useCallback((room) => {
    if (!room) return;
    
    const participantList = [];
    
    // Add remote participants
    room.remoteParticipants.forEach((participant) => {
      participantList.push({
        identity: participant.identity,
        name: participant.name || participant.identity,
        isSpeaking: participant.isSpeaking,
        audioEnabled: participant.isMicrophoneEnabled,
        connectionQuality: participant.connectionQuality
      });
    });
    
    setParticipants(participantList);
  }, []);

  // Attach audio track to an audio element
  const attachAudioTrack = useCallback((track, participantId) => {
    // Create audio element if it doesn't exist
    if (!audioElementsRef.current[participantId]) {
      const audio = document.createElement('audio');
      audio.autoplay = true;
      audio.playsInline = true;  // Important for mobile
      audio.id = `audio-${participantId}`;
      // Set volume to max
      audio.volume = 1.0;
      document.body.appendChild(audio);
      audioElementsRef.current[participantId] = audio;
      console.log('[LiveKit] Created audio element for:', participantId);
    }
    
    // Attach the track
    const audio = audioElementsRef.current[participantId];
    track.attach(audio);
    console.log('[LiveKit] Attached audio track for:', participantId, 'track enabled:', track.isEnabled, 'track muted:', track.isMuted);
    
    // Explicitly play the audio (browsers may block autoplay)
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log('[LiveKit] Audio playing successfully for:', participantId);
        setAudioBlocked(false);
      }).catch((error) => {
        console.error('[LiveKit] Audio play failed for:', participantId, error);
        setAudioBlocked(true);
        // If autoplay fails, we may need user interaction
        // Add a click listener to retry
        const retryPlay = () => {
          audio.play().then(() => {
            console.log('[LiveKit] Audio playing after user interaction for:', participantId);
            setAudioBlocked(false);
            document.removeEventListener('click', retryPlay);
          }).catch(e => console.error('[LiveKit] Retry play failed:', e));
        };
        document.addEventListener('click', retryPlay, { once: true });
        console.log('[LiveKit] Added click listener to retry audio for:', participantId);
      });
    }
  }, []);

  // Detach audio track
  const detachAudioTrack = useCallback((track, participantId) => {
    const audio = audioElementsRef.current[participantId];
    if (audio) {
      track.detach(audio);
      audio.srcObject = null;
      audio.remove();
      delete audioElementsRef.current[participantId];
    }
    console.log('[LiveKit] Detached audio track for:', participantId);
  }, []);

  // Connect to LiveKit room - stable reference
  const connect = useCallback(async () => {
    if (!stoopId || !userId) {
      console.log('[LiveKit] Missing stoopId or userId');
      return;
    }
    
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      console.log('[LiveKit] Already connecting, skipping...');
      return;
    }
    
    // Don't reconnect if already connected
    if (roomRef.current && roomRef.current.state === ConnectionState.Connected) {
      console.log('[LiveKit] Already connected');
      return;
    }
    
    // If there's an existing room that's not connected, disconnect it first
    if (roomRef.current) {
      console.log('[LiveKit] Cleaning up previous room...');
      try {
        await roomRef.current.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      roomRef.current = null;
    }
    
    isConnectingRef.current = true;
    
    try {
      setConnectionError(null);
      setConnectionState('connecting');
      
      // MOBILE FIX: Resume AudioContext on connect (requires user gesture)
      // This must happen early, ideally from a user interaction
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          if (ctx.state === 'suspended') {
            await ctx.resume();
            console.log('[LiveKit] AudioContext resumed on connect');
          }
          // Close this temporary context - LiveKit will create its own
          await ctx.close();
        }
      } catch (e) {
        console.log('[LiveKit] AudioContext resume failed:', e);
      }
      
      // Get LiveKit token from backend
      console.log('[LiveKit] Fetching token for stoop:', stoopId);
      const response = await axios.get(
        `${API}/api/stoop/${stoopId}/livekit-token`,
        { withCredentials: true }
      );
      
      const { token, url, is_speaker } = response.data;
      setIsSpeaker(is_speaker);
      
      console.log('[LiveKit] Got token, connecting to:', url);
      
      // Create and configure room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        // MOBILE FIX: Use Web Audio API for better mobile compatibility
        webAudioMix: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        audioOutput: {
          // Don't specify deviceId - let browser pick default
        }
      });
      
      roomRef.current = room;
      
      // Set up event listeners
      room.on(RoomEvent.Connected, async () => {
        console.log('[LiveKit] Connected to room');
        console.log('[LiveKit] Room name:', room.name);
        console.log('[LiveKit] Local participant:', room.localParticipant?.identity);
        console.log('[LiveKit] Remote participants count:', room.remoteParticipants.size);
        
        // Wait for SID to be assigned
        try {
          const sid = await room.getSid();
          console.log('[LiveKit] Room SID:', sid);
        } catch (e) {
          console.log('[LiveKit] Could not get room SID:', e);
        }
        
        // Log all existing participants when we connect
        room.remoteParticipants.forEach((p) => {
          console.log('[LiveKit] Existing remote participant:', p.identity, p.name);
        });
        
        // MOBILE FIX: Start audio playback - this is the LiveKit recommended way
        // to handle mobile browsers that block audio autoplay
        try {
          await room.startAudio();
          console.log('[LiveKit] Audio started successfully');
          setAudioBlocked(false);
        } catch (e) {
          console.log('[LiveKit] startAudio failed (may need user gesture):', e);
          setAudioBlocked(true);
        }
        
        setIsConnected(true);
        setConnectionState('connected');
        setConnectionError(null);
        isConnectingRef.current = false;
        updateParticipants(room);
      });
      
      room.on(RoomEvent.Disconnected, (reason) => {
        console.log('[LiveKit] Disconnected:', reason);
        setIsConnected(false);
        setConnectionState('disconnected');
        isConnectingRef.current = false;
        cleanupAudioElements();
      });
      
      room.on(RoomEvent.Reconnecting, () => {
        console.log('[LiveKit] Reconnecting...');
        setConnectionState('reconnecting');
      });
      
      room.on(RoomEvent.Reconnected, () => {
        console.log('[LiveKit] Reconnected');
        setConnectionState('connected');
      });
      
      room.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log('[LiveKit] Participant connected:', participant.identity);
        updateParticipants(room);
        callbacksRef.current.onParticipantJoined?.({
          user_id: participant.identity,
          name: participant.name || participant.identity
        });
      });
      
      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log('[LiveKit] Participant disconnected:', participant.identity);
        // Clean up audio for this participant
        if (audioElementsRef.current[participant.identity]) {
          audioElementsRef.current[participant.identity].remove();
          delete audioElementsRef.current[participant.identity];
        }
        updateParticipants(room);
        callbacksRef.current.onParticipantLeft?.({
          user_id: participant.identity
        });
      });
      
      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('[LiveKit] Track subscribed:', track.kind, 'from:', participant.identity);
        if (track.kind === Track.Kind.Audio) {
          attachAudioTrack(track, participant.identity);
        }
        updateParticipants(room);
      });
      
      room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        console.log('[LiveKit] Track unsubscribed:', track.kind, 'from:', participant.identity);
        if (track.kind === Track.Kind.Audio) {
          detachAudioTrack(track, participant.identity);
        }
        updateParticipants(room);
      });
      
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const speakerIds = speakers.map(s => s.identity);
        callbacksRef.current.onSpeakingChange?.(speakerIds);
        updateParticipants(room);
      });
      
      room.on(RoomEvent.LocalTrackPublished, (publication) => {
        console.log('[LiveKit] Local track published:', publication.kind);
        if (publication.kind === Track.Kind.Audio) {
          setIsMuted(false);
        }
      });
      
      room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
        console.log('[LiveKit] Local track unpublished:', publication.kind);
        if (publication.kind === Track.Kind.Audio) {
          setIsMuted(true);
        }
      });
      
      room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        console.log('[LiveKit] Connection quality changed:', quality, 'for:', participant.identity);
      });
      
      // Connect to the room
      console.log('[LiveKit] Attempting to connect to room:', stoopId);
      console.log('[LiveKit] Using URL:', url);
      await room.connect(url, token);
      console.log('[LiveKit] Connection complete, room state:', room.state);
      console.log('[LiveKit] Room SID:', room.sid);
      console.log('[LiveKit] Room metadata:', room.metadata);
      
    } catch (error) {
      console.error('[LiveKit] Connection error:', error);
      setConnectionError(error.message || 'Failed to connect');
      setConnectionState('disconnected');
      setIsConnected(false);
      isConnectingRef.current = false;
    }
  }, [stoopId, userId, updateParticipants, attachAudioTrack, detachAudioTrack, cleanupAudioElements]);

  // Debug function to log room state - can be called periodically or on demand
  const debugRoomState = useCallback(() => {
    const room = roomRef.current;
    if (!room) {
      console.log('[LiveKit Debug] No room instance');
      return;
    }
    console.log('[LiveKit Debug] Room state:', room.state);
    console.log('[LiveKit Debug] Room name:', room.name);
    console.log('[LiveKit Debug] Room SID:', room.sid);
    console.log('[LiveKit Debug] Local participant:', room.localParticipant?.identity);
    console.log('[LiveKit Debug] Remote participants count:', room.remoteParticipants.size);
    room.remoteParticipants.forEach((p, key) => {
      console.log('[LiveKit Debug] Remote participant:', key, p.identity, p.name, 'speaking:', p.isSpeaking, 'audio:', p.isMicrophoneEnabled);
      p.audioTrackPublications.forEach((pub) => {
        console.log('[LiveKit Debug]   Audio track:', pub.trackSid, 'subscribed:', pub.isSubscribed, 'enabled:', pub.isEnabled);
      });
    });
  }, []);

  // Toggle microphone
  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) {
      console.log('[LiveKit] Room not connected');
      return;
    }
    
    if (!isSpeaker) {
      throw new Error('You need speaker permissions to use the microphone');
    }
    
    try {
      if (isMuted) {
        // Enable microphone - request permissions and publish
        console.log('[LiveKit] Enabling microphone...');
        await room.localParticipant.setMicrophoneEnabled(true);
        setIsMuted(false);
        console.log('[LiveKit] Microphone enabled');
      } else {
        // Disable microphone
        console.log('[LiveKit] Disabling microphone...');
        await room.localParticipant.setMicrophoneEnabled(false);
        setIsMuted(true);
        console.log('[LiveKit] Microphone disabled');
      }
    } catch (error) {
      console.error('[LiveKit] Microphone error:', error);
      throw error;
    }
  }, [isMuted, isSpeaker]);

  // Disconnect from room
  const disconnect = useCallback(async () => {
    console.log('[LiveKit] Disconnecting...');
    isConnectingRef.current = false;
    const room = roomRef.current;
    if (room) {
      await room.disconnect();
      roomRef.current = null;
    }
    cleanupAudioElements();
    setIsConnected(false);
    setConnectionState('disconnected');
    setParticipants([]);
    setIsMuted(true);
  }, [cleanupAudioElements]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      cleanupAudioElements();
    };
  }, [cleanupAudioElements]);

  // Manual function to resume audio (call after user interaction)
  const resumeAudio = useCallback(async () => {
    console.log('[LiveKit] Attempting to resume audio...');
    
    const room = roomRef.current;
    
    // Use LiveKit's startAudio - the recommended approach
    if (room) {
      try {
        await room.startAudio();
        console.log('[LiveKit] room.startAudio() successful');
      } catch (e) {
        console.log('[LiveKit] room.startAudio() failed:', e);
      }
    }
    
    // Also resume AudioContext as backup
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      try {
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') {
          await ctx.resume();
          console.log('[LiveKit] AudioContext resumed');
        }
        await ctx.close();
      } catch (e) {
        console.log('[LiveKit] AudioContext error:', e);
      }
    }
    
    // Try to play all audio elements as final fallback
    const audioElements = Object.values(audioElementsRef.current);
    for (const audio of audioElements) {
      try {
        await audio.play();
        console.log('[LiveKit] Resumed audio for element:', audio.id);
      } catch (e) {
        console.error('[LiveKit] Failed to resume audio:', audio.id, e);
      }
    }
    setAudioBlocked(false);
  }, []);

  return {
    isConnected,
    connectionState,
    participants,
    isMuted,
    isSpeaker,
    connectionError,
    audioBlocked,
    connect,
    disconnect,
    toggleMute,
    resumeAudio,
    debugRoomState
  };
}
