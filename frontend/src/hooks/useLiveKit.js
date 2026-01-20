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
  
  const roomRef = useRef(null);
  const audioElementsRef = useRef({});
  
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
      audio.id = `audio-${participantId}`;
      document.body.appendChild(audio);
      audioElementsRef.current[participantId] = audio;
    }
    
    // Attach the track
    const audio = audioElementsRef.current[participantId];
    track.attach(audio);
    console.log('[LiveKit] Attached audio track for:', participantId);
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

  // Connect to LiveKit room
  const connect = useCallback(async () => {
    if (!stoopId || !userId) {
      console.log('[LiveKit] Missing stoopId or userId');
      return;
    }
    
    // Don't reconnect if already connected
    if (roomRef.current && roomRef.current.state === ConnectionState.Connected) {
      console.log('[LiveKit] Already connected');
      return;
    }
    
    try {
      setConnectionError(null);
      setConnectionState('connecting');
      
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
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      roomRef.current = room;
      
      // Set up event listeners
      room.on(RoomEvent.Connected, () => {
        console.log('[LiveKit] Connected to room');
        setIsConnected(true);
        setConnectionState('connected');
        setConnectionError(null);
        updateParticipants(room);
      });
      
      room.on(RoomEvent.Disconnected, (reason) => {
        console.log('[LiveKit] Disconnected:', reason);
        setIsConnected(false);
        setConnectionState('disconnected');
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
        onParticipantJoined?.({
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
        onParticipantLeft?.({
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
        onSpeakingChange?.(speakerIds);
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
      await room.connect(url, token);
      
    } catch (error) {
      console.error('[LiveKit] Connection error:', error);
      setConnectionError(error.message || 'Failed to connect');
      setConnectionState('disconnected');
      setIsConnected(false);
    }
  }, [stoopId, userId, updateParticipants, attachAudioTrack, detachAudioTrack, cleanupAudioElements, onParticipantJoined, onParticipantLeft, onSpeakingChange]);

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

  return {
    isConnected,
    connectionState,
    participants,
    isMuted,
    isSpeaker,
    connectionError,
    connect,
    disconnect,
    toggleMute
  };
}
