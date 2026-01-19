import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * WebRTC Hook for The Stoop - Real-time audio streaming
 * Fixed version with proper peer connection management
 */
export function useWebRTC({ 
  stoopId, 
  userId, 
  onPeerJoined, 
  onPeerLeft, 
  onMicStatusChange 
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [peers, setPeers] = useState({}); // Map of peerId -> { name, connectionState, isSpeaking }
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  
  const wsRef = useRef(null);
  const peerConnectionsRef = useRef({}); // Map of peerId -> RTCPeerConnection
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef({}); // Store ICE candidates until remote description is set
  
  // STUN servers for NAT traversal
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ]
  };

  // Send signaling message via WebSocket
  const sendSignal = useCallback((targetUserId, signalType, signalData) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        type: 'webrtc_signal',
        target_user_id: targetUserId,
        signal_type: signalType,
        signal_data: signalData
      };
      console.log('[WebRTC] Sending signal:', signalType, 'to:', targetUserId);
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.error('[WebRTC] WebSocket not open, cannot send signal');
    }
  }, []);

  // Create a peer connection for a specific user
  const createPeerConnection = useCallback((peerId, isInitiator = false) => {
    console.log('[WebRTC] Creating peer connection for:', peerId, 'isInitiator:', isInitiator);
    
    // Close existing connection if any
    if (peerConnectionsRef.current[peerId]) {
      peerConnectionsRef.current[peerId].close();
    }
    
    const pc = new RTCPeerConnection(iceServers);
    peerConnectionsRef.current[peerId] = pc;
    pendingCandidatesRef.current[peerId] = [];
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WebRTC] Got ICE candidate for:', peerId);
        sendSignal(peerId, 'ice_candidate', event.candidate.toJSON());
      }
    };

    // Handle ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state for', peerId, ':', pc.iceConnectionState);
      setPeers(prev => ({
        ...prev,
        [peerId]: { ...prev[peerId], iceState: pc.iceConnectionState }
      }));
      
      if (pc.iceConnectionState === 'failed') {
        console.log('[WebRTC] ICE failed, restarting...');
        pc.restartIce();
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state for', peerId, ':', pc.connectionState);
      setPeers(prev => ({
        ...prev,
        [peerId]: { ...prev[peerId], connectionState: pc.connectionState }
      }));
    };

    // Handle incoming audio tracks
    pc.ontrack = (event) => {
      console.log('[WebRTC] *** RECEIVED TRACK from:', peerId, 'streams:', event.streams.length);
      
      if (event.streams && event.streams[0]) {
        // Create audio element and play the remote stream
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.autoplay = true;
        audio.volume = 1.0;
        
        // Some browsers require user interaction - try to play
        audio.play().then(() => {
          console.log('[WebRTC] *** PLAYING AUDIO from:', peerId);
        }).catch(e => {
          console.log('[WebRTC] Audio play failed (may need user interaction):', e);
        });
        
        setPeers(prev => ({
          ...prev,
          [peerId]: { ...prev[peerId], hasAudio: true }
        }));
      }
    };

    // Add local tracks if we have them and we're the initiator
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log('[WebRTC] Adding local track to peer connection for:', peerId);
        pc.addTrack(track, localStreamRef.current);
      });
    }

    return pc;
  }, [sendSignal]);

  // Handle incoming WebRTC signaling messages
  const handleSignalingMessage = useCallback(async (data) => {
    const { from_user_id, signal_type, signal_data } = data;
    
    // Ignore our own signals
    if (from_user_id === userId) {
      console.log('[WebRTC] Ignoring own signal');
      return;
    }
    
    console.log('[WebRTC] Received signal:', signal_type, 'from:', from_user_id);
    
    let pc = peerConnectionsRef.current[from_user_id];
    
    try {
      if (signal_type === 'offer') {
        // Someone is offering to connect - we need to answer
        console.log('[WebRTC] Processing offer from:', from_user_id);
        
        // Create new peer connection (we are not the initiator)
        pc = createPeerConnection(from_user_id, false);
        
        await pc.setRemoteDescription(new RTCSessionDescription(signal_data));
        
        // Process any pending ICE candidates
        const pendingCandidates = pendingCandidatesRef.current[from_user_id] || [];
        for (const candidate of pendingCandidates) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidatesRef.current[from_user_id] = [];
        
        // Create and send answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        sendSignal(from_user_id, 'answer', pc.localDescription.toJSON());
        console.log('[WebRTC] Sent answer to:', from_user_id);
      } 
      else if (signal_type === 'answer') {
        // Our offer was answered
        console.log('[WebRTC] Processing answer from:', from_user_id);
        
        if (pc && pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal_data));
          
          // Process any pending ICE candidates
          const pendingCandidates = pendingCandidatesRef.current[from_user_id] || [];
          for (const candidate of pendingCandidates) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidatesRef.current[from_user_id] = [];
        } else {
          console.warn('[WebRTC] Received answer but not in have-local-offer state:', pc?.signalingState);
        }
      } 
      else if (signal_type === 'ice_candidate') {
        // ICE candidate received
        if (signal_data) {
          if (pc && pc.remoteDescription) {
            console.log('[WebRTC] Adding ICE candidate from:', from_user_id);
            await pc.addIceCandidate(new RTCIceCandidate(signal_data));
          } else {
            // Queue candidate until remote description is set
            console.log('[WebRTC] Queuing ICE candidate from:', from_user_id);
            if (!pendingCandidatesRef.current[from_user_id]) {
              pendingCandidatesRef.current[from_user_id] = [];
            }
            pendingCandidatesRef.current[from_user_id].push(signal_data);
          }
        }
      }
    } catch (error) {
      console.error('[WebRTC] Signaling error:', error);
    }
  }, [userId, createPeerConnection, sendSignal]);

  // Create offer to connect to a peer
  const createOfferToPeer = useCallback(async (peerId) => {
    console.log('[WebRTC] Creating offer to peer:', peerId);
    
    const pc = createPeerConnection(peerId, true);
    
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      await pc.setLocalDescription(offer);
      
      sendSignal(peerId, 'offer', pc.localDescription.toJSON());
      console.log('[WebRTC] Sent offer to:', peerId);
    } catch (error) {
      console.error('[WebRTC] Error creating offer:', error);
    }
  }, [createPeerConnection, sendSignal]);

  // Connect to signaling server
  const connect = useCallback(() => {
    if (!stoopId || !userId) {
      console.log('[WebRTC] Missing stoopId or userId');
      return;
    }
    
    // Build WebSocket URL
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const backendUrl = process.env.REACT_APP_BACKEND_URL.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}//${backendUrl}/ws/stoop/${stoopId}`;
    
    console.log('[WebRTC] Connecting to:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log('[WebRTC] *** WebSocket CONNECTED ***');
      setIsConnected(true);
      setConnectionError(null);
    };
    
    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[WebRTC] Message received:', data.type);
        
        switch (data.type) {
          case 'user_joined':
            if (data.user_id !== userId) {
              console.log('[WebRTC] *** PEER JOINED ***:', data.user_id, data.name);
              setPeers(prev => ({
                ...prev,
                [data.user_id]: { 
                  name: data.name,
                  username: data.username,
                  connectionState: 'new',
                  hasAudio: false
                }
              }));
              onPeerJoined?.(data);
              
              // If we have a local stream, initiate connection to new peer
              if (localStreamRef.current) {
                console.log('[WebRTC] We have local stream, creating offer to new peer');
                await createOfferToPeer(data.user_id);
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
            delete pendingCandidatesRef.current[data.user_id];
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
              console.log('[WebRTC] Mic status change:', data.user_id, data.is_muted);
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
      setConnectionError(`Disconnected: ${event.reason || 'Connection closed'}`);
    };
    
    ws.onerror = (error) => {
      console.error('[WebRTC] WebSocket error:', error);
      setConnectionError('Connection error');
    };
    
    return ws;
  }, [stoopId, userId, createOfferToPeer, handleSignalingMessage, onPeerJoined, onPeerLeft, onMicStatusChange]);

  // Start local audio stream and connect to all existing peers
  const startLocalStream = useCallback(async () => {
    try {
      console.log('[WebRTC] *** STARTING LOCAL AUDIO STREAM ***');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      });
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsMuted(false);
      
      console.log('[WebRTC] Got local stream with tracks:', stream.getAudioTracks().length);
      
      // Broadcast mic status
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'mic_status',
          is_muted: false
        }));
      }
      
      // Create offers to all existing peers
      const existingPeerIds = Object.keys(peers);
      console.log('[WebRTC] Creating offers to existing peers:', existingPeerIds);
      
      for (const peerId of existingPeerIds) {
        await createOfferToPeer(peerId);
      }
      
      return true;
    } catch (error) {
      console.error('[WebRTC] Failed to start local stream:', error);
      throw error;
    }
  }, [peers, createOfferToPeer]);

  // Stop local audio stream
  const stopLocalStream = useCallback(() => {
    console.log('[WebRTC] Stopping local stream...');
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('[WebRTC] Stopped track:', track.kind);
      });
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
    console.log('[WebRTC] *** DISCONNECTING ***');
    
    // Stop local stream
    stopLocalStream();
    
    // Close all peer connections
    Object.entries(peerConnectionsRef.current).forEach(([peerId, pc]) => {
      console.log('[WebRTC] Closing peer connection:', peerId);
      pc.close();
    });
    peerConnectionsRef.current = {};
    pendingCandidatesRef.current = {};
    
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
