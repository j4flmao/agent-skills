# WebRTC Architecture

WebRTC enables peer-to-peer real-time communication with audio, video, and data channels in the browser.

## Signaling

Signaling exchanges session metadata before peer connection:

```typescript
// Signaling server (Socket.IO)
import { Server } from 'socket.io'

const io = new Server(3000, {
  cors: { origin: '*' }
})

io.on('connection', (socket) => {
  socket.on('join-room', (roomId: string) => {
    socket.join(roomId)
    socket.to(roomId).emit('user-connected', socket.id)
  })

  socket.on('offer', (data: { to: string; offer: RTCSessionDescription }) => {
    socket.to(data.to).emit('offer', {
      from: socket.id,
      offer: data.offer,
    })
  })

  socket.on('answer', (data: { to: string; answer: RTCSessionDescription }) => {
    socket.to(data.to).emit('answer', {
      from: socket.id,
      answer: data.answer,
    })
  })

  socket.on('ice-candidate', (data: { to: string; candidate: RTCIceCandidate }) => {
    socket.to(data.to).emit('ice-candidate', {
      from: socket.id,
      candidate: data.candidate,
    })
  })

  socket.on('disconnecting', () => {
    socket.rooms.forEach((room) => {
      socket.to(room).emit('user-disconnected', socket.id)
    })
  })
})
```

### Client Signaling

```typescript
class PeerConnection {
  private pc: RTCPeerConnection
  private socket: Socket

  constructor(socket: Socket, config: RTCConfiguration) {
    this.socket = socket
    this.pc = new RTCPeerConnection(config)
    this.setupListeners()
  }

  private setupListeners() {
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', {
          to: this.remoteId,
          candidate: event.candidate,
        })
      }
    }

    this.pc.ontrack = (event) => {
      const video = document.createElement('video')
      video.srcObject = event.streams[0]
      video.autoplay = true
      document.getElementById('remote-video')?.appendChild(video)
    }
  }

  async createOffer() {
    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
    this.socket.emit('offer', { to: this.remoteId, offer })
  }

  async handleOffer(offer: RTCSessionDescription) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await this.pc.createAnswer()
    await this.pc.setLocalDescription(answer)
    this.socket.emit('answer', { to: this.remoteId, answer })
  }
}
```

## ICE / STUN / TURN

NAT traversal for peer-to-peer connections:

```typescript
const config: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:turn.example.com:3478',
      username: 'user',
      credential: 'pass',
    },
    {
      urls: 'turns:turn.example.com:5349',
      username: 'user',
      credential: 'pass',
    },
  ],
  iceTransportPolicy: 'all',  // 'relay' for TURN-only
}

this.pc = new RTCPeerConnection(config)
```

### Coturn Configuration

```ini
# /etc/coturn/turnserver.conf
listening-port=3478
tls-listening-port=5349
fingerprint
lt-cred-mech
user=user:pass
realm=example.com
total-quota=100
stale-nonce=600
max-bps=1024000
log-file=/var/log/turnserver.log
no-cli
use-auth-secret
static-auth-secret=secret-key-here
```

## Peer Connection

Managing media streams and connection state:

```typescript
class MediaPeer {
  private pc: RTCPeerConnection
  private localStream: MediaStream | null = null

  async startLocalMedia(constraints: MediaStreamConstraints = {
    video: { width: 1280, height: 720, frameRate: 30 },
    audio: { echoCancellation: true, noiseSuppression: true },
  }) {
    this.localStream = await navigator.mediaDevices.getUserMedia(constraints)
    this.localStream.getTracks().forEach((track) => {
      this.pc.addTrack(track, this.localStream!)
    })
    const localVideo = document.getElementById('local-video') as HTMLVideoElement
    localVideo.srcObject = this.localStream
  }

  async toggleMedia(kind: 'audio' | 'video') {
    if (!this.localStream) return
    const track = this.localStream.getTracks().find(t => t.kind === kind)
    if (track) {
      track.enabled = !track.enabled
    }
  }

  monitorConnection() {
    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState
      console.log('Connection state:', state)
      if (state === 'failed' || state === 'disconnected') {
        this.reconnect()
      }
    }

    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc.iceConnectionState
      console.log('ICE state:', state)
    }
  }

  private async reconnect() {
    this.pc.close()
    this.pc = new RTCPeerConnection(config)
    await this.startLocalMedia()
    await this.createOffer()
  }
}
```

## Data Channels

Peer-to-peer data transfer (text, files, game state):

```typescript
class DataChannel {
  private pc: RTCPeerConnection
  private channel: RTCDataChannel | null = null
  private channels: Map<string, RTCDataChannel> = new Map()

  createChannel(label: string, config: RTCDataChannelInit = {}) {
    const channel = this.pc.createDataChannel(label, {
      ordered: true,
      maxRetransmits: 3,
      ...config,
    })
    this.setupChannel(label, channel)
    return channel
  }

  onDataChannel(callback: (label: string, channel: RTCDataChannel) => void) {
    this.pc.ondatachannel = (event) => {
      const label = event.channel.label
      this.setupChannel(label, event.channel)
      callback(label, event.channel)
    }
  }

  private setupChannel(label: string, channel: RTCDataChannel) {
    this.channels.set(label, channel)

    channel.onopen = () => console.log(`Channel ${label} opened`)
    channel.onclose = () => console.log(`Channel ${label} closed`)

    channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        this.handleTextMessage(label, event.data)
      } else {
        this.handleBinaryMessage(label, event.data)
      }
    }

    channel.onerror = (error) => {
      console.error(`Channel ${label} error:`, error)
    }
  }

  send(label: string, data: string | ArrayBuffer) {
    const channel = this.channels.get(label)
    if (channel?.readyState === 'open') {
      channel.send(data)
    }
  }

  // File transfer via data channel
  async sendFile(file: File) {
    const channel = this.createChannel('file-transfer', {
      ordered: true,
      maxRetransmits: 0,
    })

    channel.onopen = async () => {
      const metadata = JSON.stringify({
        name: file.name,
        size: file.size,
        type: file.type,
      })
      channel.send(metadata)

      const buffer = await file.arrayBuffer()
      const chunkSize = 16384  // 16KB chunks
      for (let offset = 0; offset < buffer.byteLength; offset += chunkSize) {
        const chunk = buffer.slice(offset, offset + chunkSize)
        channel.send(chunk)
      }
    }
  }
}
```

## SFU / MCU Topologies

### SFU (Selective Forwarding Unit)

```typescript
// SFU server: relays streams selectively
class SFUServer {
  private peers: Map<string, RTCPeerConnection> = new Map()
  private rooms: Map<string, Set<string>> = new Map()

  handlePeer(peerId: string, roomId: string) {
    const pc = new RTCPeerConnection()
    this.peers.set(peerId, pc)

    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set())
    }
    this.rooms.get(roomId)!.add(peerId)

    pc.ontrack = (event) => {
      // Forward to all other peers in room
      this.rooms.get(roomId)?.forEach((otherId) => {
        if (otherId !== peerId) {
          const otherPc = this.peers.get(otherId)
          if (otherPc) {
            otherPc.addTrack(event.track, event.streams[0])
          }
        }
      })
    }

    return { peerId, roomId }
  }
}
```

### Topology Comparison

| Architecture | Bandwidth (Client) | Bandwidth (Server) | Max Participants | Complexity |
|-------------|-------------------|-------------------|------------------|------------|
| Mesh (P2P) | Upload: N-1 streams | None | ~6 | Low |
| MCU (Mixer) | Upload: 1 stream, Download: 1 mixed stream | Decode + Encode all | ~20 | High |
| SFU (Router) | Upload: 1 stream, Download: N-1 streams | Forward medially | Hundreds | Medium |

### SFU Advantage

```
Mesh (P2P)              SFU
Peer A → Peer B         Peer A → SFU → Peer B
Peer A → Peer C         Peer A → SFU → Peer C
Peer B → Peer C         Peer B → SFU → Peer C
                        Peer C → SFU → Peer A
                        Peer C → SFU → Peer B
Upload: (N-1) × bitrate  Upload: 1 × bitrate
Download: (N-1) × bitrate  Download: (N-1) × bitrate
```

## Media Streams

```typescript
// Screen sharing
async function startScreenShare() {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'always' },
      audio: false,
    })
    const videoTrack = screenStream.getVideoTracks()[0]
    const sender = pc.getSenders().find(s => s.track?.kind === 'video')
    await sender?.replaceTrack(videoTrack)

    videoTrack.onended = () => {
      // Restore camera
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true })
      const cameraTrack = cameraStream.getVideoTracks()[0]
      await sender?.replaceTrack(cameraTrack)
    }
  } catch (err) {
    console.error('Screen share failed:', err)
  }
}

// Bandwidth estimation
pc.onicecandidate = (event) => {
  if (event.candidate && event.candidate.candidate.includes('typ relay')) {
    console.log('Using TURN relay — high latency expected')
  }
}

// Set max bitrate
const sender = pc.getSenders()[0]
const parameters = sender.getParameters()
parameters.encodings = [{ maxBitrate: 500_000 }]  // 500kbps
await sender.setParameters(parameters)
```

WebRTC enables powerful real-time communication but requires careful consideration of signaling, NAT traversal, media topology, and connection state management.
