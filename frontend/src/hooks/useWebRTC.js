import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * WebRTC Hook for The Stoop - Real-time audio streaming
 * Handles peer connections, signaling, and audio tracks
 */
export function useWebRTC({ 
  stoopId, 
  userId, 
  onPeerJoined, 
  onPeerLeft, 
  onMicStatusChange 
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [peers, setPeers] = useState({}); // Map of userId -> connection state
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  
  const wsRef = useRef(null);
  const peerConnectionsRef = useRef({}); // Map of userId -> RTCPeerConnection
  const remoteAudioRefs = useRef({}); // Map of userId -> Audio element
  const localStreamRef = useRef(null);
  
  // STUN/TURN servers for NAT traversal
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ]
  };

  // Get session token from cookies (fallback - cookies may be httpOnly)
  const getSessionToken = () => {
    // Note: httpOnly cookies won't be accessible here
    // The WebSocket backend will read cookies directly
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'session_id') {
        return value;
      }
    }
    return null;
  };

  // Create a peer connection for a specific user
  const createPeerConnection = useCallback((targetUserId) => {
    console.log('[WebRTC] Creating peer connection for:', targetUserId);
    
    const pc = new RTCPeerConnection(iceServers);
    peerConnectionsRef.current[targetUserId] = pc;
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('[WebRTC] Sending ICE candidate to:', targetUserId);
        wsRef.current.send(JSON.stringify({
          type: 'webrtc_signal',
          target_user_id: targetUserId,
          signal_type: 'ice_candidate',
          signal_data: event.candidate
        }));
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state for', targetUserId, ':', pc.connectionState);
      setPeers(prev => ({
        ...prev,
        [targetUserId]: { ...prev[targetUserId], connectionState: pc.connectionState }
      }));
    };

    // Handle incoming audio tracks
    pc.ontrack = (event) => {
      console.log('[WebRTC] Received track from:', targetUserId);
      
      // Create or get audio element for this peer
      if (!remoteAudioRefs.current[targetUserId]) {
        const audio = new Audio();
        audio.autoplay = true;
        remoteAudioRefs.current[targetUserId] = audio;
      }
      
      remoteAudioRefs.current[targetUserId].srcObject = event.streams[0];
    };

    // Add local tracks if we have them
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log('[WebRTC] Adding local track to peer:', targetUserId);
        pc.addTrack(track, localStreamRef.current);
      });
    }

    return pc;
  }, []);

  // Handle WebRTC signaling messages
  const handleSignalingMessage = useCallback(async (data) => {
    const { from_user_id, signal_type, signal_data } = data;
    
    // Ignore our own signals
    if (from_user_id === userId) return;
    
    console.log('[WebRTC] Received signal:', signal_type, 'from:', from_user_id);
    
    // Get or create peer connection
    let pc = peerConnectionsRef.current[from_user_id];
    if (!pc) {
      pc = createPeerConnection(from_user_id);
    }
    
    try {
      if (signal_type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal_data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'webrtc_signal',
            target_user_id: from_user_id,
            signal_type: 'answer',
            signal_data: answer
          }));
        }
      } 
      else if (signal_type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal_data));
      } 
      else if (signal_type === 'ice_candidate') {
        if (signal_data) {
          await pc.addIceCandidate(new RTCIceCandidate(signal_data));
        }
      }
    } catch (error) {
      console.error('[WebRTC] Signaling error:', error);
    }
  }, [userId, createPeerConnection]);

  // Connect to signaling server
  const connect = useCallback(() => {
    if (!stoopId || !userId) {
      console.log('[WebRTC] Missing stoopId or userId');
      return;
    }
    
    const token = getSessionToken();
    if (!token) {
      setConnectionError('Not authenticated');
      return;
    }
    
    // Build WebSocket URL
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const backendUrl = process.env.REACT_APP_BACKEND_URL.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}//${backendUrl}/ws/stoop/${stoopId}?token=${token}`;
    
    console.log('[WebRTC] Connecting to:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log('[WebRTC] WebSocket connected');
      setIsConnected(true);
      setConnectionError(null);
    };
    
    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[WebRTC] Message:', data.type);
        
        switch (data.type) {
          case 'user_joined':
            if (data.user_id !== userId) {
              console.log('[WebRTC] Peer joined:', data.user_id);
              setPeers(prev => ({
                ...prev,
                [data.user_id]: { 
                  username: data.username, 
                  name: data.name,
                  connectionState: 'new'
                }
              }));
              onPeerJoined?.(data);
              
              // If we have a local stream, initiate connection
              if (localStreamRef.current) {
                const pc = createPeerConnection(data.user_id);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                
                ws.send(JSON.stringify({
                  type: 'webrtc_signal',
                  target_user_id: data.user_id,
                  signal_type: 'offer',
                  signal_data: offer
                }));
              }
            }
            break;
            
          case 'user_left':
            console.log('[WebRTC] Peer left:', data.user_id);
            // Cleanup peer connection
            if (peerConnectionsRef.current[data.user_id]) {
              peerConnectionsRef.current[data.user_id].close();
              delete peerConnectionsRef.current[data.user_id];
            }
            if (remoteAudioRefs.current[data.user_id]) {
              remoteAudioRefs.current[data.user_id].srcObject = null;
              delete remoteAudioRefs.current[data.user_id];
            }
            setPeers(prev => {
              const newPeers = { ...prev };
              delete newPeers[data.user_id];
              return newPeers;
            });
            onPeerLeft?.(data);
            break;
            
          case 'webrtc_signal':
            await handleSignalingMessage(data);
            break;
            
          case 'mic_status':
            if (data.user_id !== userId) {
              onMicStatusChange?.(data);
            }
            break;
            
          default:
            console.log('[WebRTC] Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('[WebRTC] Message parse error:', error);
      }
    };
    
    ws.onclose = (event) => {
      console.log('[WebRTC] WebSocket closed:', event.code, event.reason);
      setIsConnected(false);
    };
    
    ws.onerror = (error) => {
      console.error('[WebRTC] WebSocket error:', error);
      setConnectionError('Connection error');
    };
    
    return ws;
  }, [stoopId, userId, createPeerConnection, handleSignalingMessage, onPeerJoined, onPeerLeft, onMicStatusChange]);

  // Start local audio stream
  const startLocalStream = useCallback(async () => {
    try {
      console.log('[WebRTC] Starting local audio stream...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      
      // Add tracks to existing peer connections
      Object.keys(peerConnectionsRef.current).forEach(async (peerId) => {
        const pc = peerConnectionsRef.current[peerId];
        stream.getTracks().forEach(track => {
          console.log('[WebRTC] Adding track to existing peer:', peerId);
          pc.addTrack(track, stream);
        });
        
        // Renegotiate connection
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'webrtc_signal',
            target_user_id: peerId,
            signal_type: 'offer',
            signal_data: offer
          }));
        }
      });
      
      setIsMuted(false);
      
      // Broadcast mic status
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'mic_status',
          is_muted: false
        }));
      }
      
      return true;
    } catch (error) {
      console.error('[WebRTC] Failed to start local stream:', error);
      throw error;
    }
  }, []);

  // Stop local audio stream
  const stopLocalStream = useCallback(() => {
    console.log('[WebRTC] Stopping local stream...');
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    setIsMuted(true);
    
    // Broadcast mic status
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'mic_status',
        is_muted: true
      }));
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (isMuted) {
      await startLocalStream();
    } else {
      stopLocalStream();
    }
  }, [isMuted, startLocalStream, stopLocalStream]);

  // Disconnect and cleanup
  const disconnect = useCallback(() => {
    console.log('[WebRTC] Disconnecting...');
    
    // Stop local stream
    stopLocalStream();
    
    // Close all peer connections
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};
    
    // Close all remote audio
    Object.values(remoteAudioRefs.current).forEach(audio => {
      audio.srcObject = null;
    });
    remoteAudioRefs.current = {};
    
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setPeers({});
    setIsConnected(false);
  }, [stopLocalStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    peers,
    localStream,
    isMuted,
    connectionError,
    connect,
    disconnect,
    startLocalStream,
    stopLocalStream,
    toggleMute
  };
}
