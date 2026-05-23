# WebRTC Signaling

## Signaling Message Types
| Message | Direction | Content |
|---------|-----------|---------|
| join_room | Client → Server | Room ID, user info |
| offer | Client → Server → Peer | SDP offer |
| answer | Client → Server → Peer | SDP answer |
| ice_candidate | Client → Server → Peer | ICE candidate |
| leave_room | Client → Server | Room ID |
| room_joined | Server → Client | Room info, peer list |
| peer_joined | Server → Client | New peer notification |
| peer_left | Server → Client | Peer disconnected |

## Signaling Server (Socket.io)
`	ypescript
io.on('connection', (socket) => {
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        socket.to(roomId).emit('peer-joined', userId);
    });

    socket.on('offer', (offer, targetId) => {
        socket.to(targetId).emit('offer', offer, socket.id);
    });

    socket.on('answer', (answer, targetId) => {
        socket.to(targetId).emit('answer', answer, socket.id);
    });

    socket.on('ice-candidate', (candidate, targetId) => {
        socket.to(targetId).emit('ice-candidate', candidate, socket.id);
    });
});
`

## WebRTC Client
`javascript
const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
pc.onicecandidate = (e) => socket.emit('ice-candidate', e.candidate, targetId);
pc.ontrack = (e) => videoElement.srcObject = e.streams[0];
`
"@ | Set-Content -Path "D:\j4flmao-org\skills\backend\web-real-time\references\webrtc-signaling.md" -Encoding UTF8

@"
# SFU Architecture

## Selective Forwarding Unit
`
Peer A ──→ SFU ──→ Peer B
               └──→ Peer C
Peer B ──→ SFU ──→ Peer A
               └──→ Peer C
Peer C ──→ SFU ──→ Peer A
               └──→ Peer B
`

## SFU Implementation Options
| Platform | Language | Scalability |
|----------|----------|-------------|
| mediasoup | C++/Node.js | High — production proven |
| Jitsi Videobridge | Java | High — conference tested |
| LiveKit | Go | High — modern, cloud-native |
| Janus | C | High — flexible plugin system |
| Ion-sfu | Go | Medium — newer project |

## Stream Selection Strategies
| Strategy | Description | Bandwidth Savings |
|----------|-------------|-------------------|
| Last N | Only send video from last N speakers | High |
| Audio-only | Only receive audio from non-speakers | Medium |
| Simulcast | Send multiple quality layers, receiver selects | High |
| SVC | Scalable Video Coding, server drops layers | Very High |
| Video mute | Stop sending video when not speaking | Low |

## Simulcast Layers
`javascript
// Sender configures simulcast
const sender = pc.addTrack(stream.getVideoTracks()[0], stream);
const params = sender.getParameters();
params.encodings = [
    { maxBitrate: 100000 },  // Low quality
    { maxBitrate: 300000 },  // Medium quality
    { maxBitrate: 900000 },  // High quality
];
sender.setParameters(params);
`
"@ | Set-Content -Path "D:\j4flmao-org\skills\backend\web-real-time\references\sfu-architecture.md" -Encoding UTF8

@"
# Live Streaming Infrastructure

## Streaming Protocols
| Protocol | Latency | Use Case |
|----------|---------|----------|
| HLS | 6-30s | Broadcast, wide compatibility |
| DASH | 6-30s | Broadcast, alternative to HLS |
| RTMP | 1-3s | Ingest from encoder |
| SRT | 1-3s | Reliable ingest over unstable networks |
| WebRTC | < 1s | Interactive live streaming |
| CMAF | 2-6s | Low-latency HLS/DASH |

## Live Streaming Pipeline
`
Encoder → Ingest (RTMP/SRT) → Transcoder (HLS/DASH)
    ↓                                               ↓
  Camera/Software                            CDN (CloudFront, Cloudflare)
                                                  ↓
                                              Player (HLS.js, Shaka)
`

## Video Encoding Settings
| Setting | 1080p | 720p | 480p |
|---------|-------|------|------|
| Bitrate | 4500-6000 kbps | 2500-4000 kbps | 1000-2000 kbps |
| Frame rate | 30/60 fps | 30 fps | 30 fps |
| Keyframe interval | 2 seconds | 2 seconds | 2 seconds |
| Codec | H.264 | H.264 | H.264 |
| Resolution | 1920x1080 | 1280x720 | 854x480 |

## CDN Configuration
- Edge caching for HLS segments (.ts, .m3u8)
- Origin shielding to reduce load on transcoder
- Geo-restriction for licensed content
- DDoS protection
- Signed URLs for private streams
