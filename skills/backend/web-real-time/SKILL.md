---
name: backend-web-real-time
description: >
  Use when the user asks about WebRTC, real-time video/audio, media streaming, SFU/MCU, signaling server, TURN/STUN, live streaming, WebSocket for media, or real-time communication infrastructure. Do NOT use for: basic WebSocket patterns (websocket-patterns), or general real-time updates (data-streaming).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, web-real-time, phase-3]
---

# Web Real-Time Communication

## Purpose
Build real-time communication systems: WebRTC signaling, media server architecture (SFU/MCU), TURN/STUN infrastructure, live streaming, and real-time data channels.

## Agent Protocol

### Trigger
User mentions WebRTC, real-time video/audio, media streaming, SFU, MCU, signaling server, TURN/STUN, live streaming, media server, coturn, or real-time communication infrastructure.

### Input Context
- Use case (video call, live streaming, conferencing, data channel)
- Expected participant count (1-1, small group <10, large group >10)
- Network conditions (NAT/firewall, mobile, enterprise)
- Media types (audio, video, screen share, data channel)
- Deployment model (self-hosted, hybrid, cloud)
- Latency requirements (real-time, near-real-time, low-latency streaming)

### Output Artifact
Architecture design with signaling protocol, media server topology, TURN/STUN config, client integration code, and deployment infrastructure.

### Response Format
No preamble. No postamble. No explanations. No filler/hedging/transitions. Strip articles a/an/the where unambiguous. Compress output.

### Completion Criteria
- [ ] Signaling server protocol selected (WebSocket, HTTP, SSE) and implemented
- [ ] Media server architecture chosen (SFU > MCU > P2P mesh) per scale requirements
- [ ] TURN/STUN infrastructure specified with credentials management
- [ ] ICE/STUN/TURN configuration working across target network topologies
- [ ] Media negotiation (SDP offer/answer) flow implemented
- [ ] Client SDK integration complete with reconnection logic
- [ ] Bandwidth estimation and adaptation strategy defined
- [ ] Recording/archiving strategy defined if required
- [ ] Fallback for restricted networks documented

### Max Response Length
4096 tokens

## Architecture Decision Trees

### Topology Selection

| Criterion | Mesh (P2P) | SFU (Selective Forwarding) | MCU (Multipoint Control) |
|-----------|-----------|---------------------------|--------------------------|
| Participants | 2-4 | 4-100+ | 4-50 |
| Server bandwidth | None | O(n) — one uplink per peer | O(1) — single mixed stream |
| Client bandwidth | O(n^2) — send to all peers | O(1) — send once, receive n-1 | O(1) — single stream |
| Latency | Lowest | Low (no mixing) | Higher (mixing delay) |
| CPU cost | Client-side | Server relays | Server transcodes |
| Complexity | Simplest | Moderate | High |
| Fallback | STUN only | STUN + TURN | STUN + TURN |

Decision: Always prefer SFU for multi-party. Mesh for 1-1 calls. MCU only when legacy client compatibility required.

### Signaling Protocol Decision

| Criterion | WebSocket | HTTP Long Polling | SSE |
|-----------|-----------|-------------------|-----|
| Latency | <50ms | 200-500ms | 100-300ms |
| Bidirectional | Yes | Yes | Server→Client only |
| NAT Traversal | Native ws:// wss:// | HTTP (always works) | HTTP (always works) |
| Browser Support | All modern | All | All (except IE) |
| Connection overhead | Upgrade handshake | New request per poll | Persistent connection |
| Reconnection | Built-in (some libs) | Stateless | Built-in (EventSource) |

Decision: WebSocket for production signaling. SSE for one-way broadcast. HTTP polling as last resort for restrictive networks.

### Codec Selection

| Codec | Bitrate | Quality | Licensing | Browser Support |
|-------|---------|---------|-----------|-----------------|
| VP8 | 200-1500 kbps | Good | Royalty-free | Chrome, Firefox, Safari 14.1+ |
| VP9 | 150-800 kbps | Better | Royalty-free | Chrome, Firefox |
| H.264 | 200-1500 kbps | Excellent | Patent-encumbered | Chrome, Firefox, Safari, Edge |
| AV1 | 100-500 kbps | Best | Royalty-free | Chrome (limited) |

Decision: H.264 for widest compatibility. VP9/AV1 for bandwidth-constrained environments.

## Workflow

### WebRTC Architecture
```
Peer A → Signaling Server ← Peer B
  |                            |
  ↓                            ↓
STUN/TURN Server ← → ICE Negotiation ← → STUN/TURN Server
  |                            |
  ↓                            ↓
  └─────── Media via SRTP/SCTP ────────┘
```

### Signaling Server Patterns
| Protocol | When to Use | Example |
|----------|-------------|---------|
| WebSocket | Low latency, bidirectional | Socket.io, ws |
| HTTP Long Polling | Simple, no WebSocket support | REST endpoints |
| Server-Sent Events | One-way server→client | Event notifications |

### Media Server Architecture
| Architecture | Description | Pros | Cons |
|-------------|-------------|------|------|
| Mesh (P2P) | Every peer connects to every other | No server cost | Bandwidth scales O(n^2) |
| MCU | Server mixes all streams into one | Low client bandwidth | Single point of failure |
| SFU | Server relays streams, selective forwarding | Scalable, flexible | Higher server bandwidth |

### SFU (Selective Forwarding Unit) - Recommended
- Each peer sends one stream to SFU
- SFU forwards to all other peers
- Peers can choose which streams to receive
- Scales to hundreds of participants

### TURN/STUN Server Setup
| Component | Purpose | Service |
|-----------|---------|---------|
| STUN | Discover public IP/port for NAT traversal | coturn (self-hosted), Google STUN |
| TURN | Relay media when P2P fails (NAT/firewall) | coturn (self-hosted), Twilio Network Traversal |

## Implementation Patterns

### Pattern: Signaling with WebSocket (Node.js)

```typescript
// server/signaling.ts
import { WebSocketServer, WebSocket } from 'ws';

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave' | 'room-info';
  roomId: string;
  senderId: string;
  payload: unknown;
}

const wss = new WebSocketServer({ port: 8080 });
const rooms = new Map<string, Map<string, WebSocket>>();

wss.on('connection', (ws) => {
  let userId: string;
  let currentRoom: string;

  ws.on('message', (data) => {
    const msg: SignalingMessage = JSON.parse(data.toString());

    switch (msg.type) {
      case 'join': {
        userId = msg.senderId;
        currentRoom = msg.roomId;
        if (!rooms.has(msg.roomId)) rooms.set(msg.roomId, new Map());
        rooms.get(msg.roomId)!.set(userId, ws);
        broadcastToRoom(msg.roomId, { type: 'room-info', roomId: msg.roomId, senderId: 'system', payload: { peers: Array.from(rooms.get(msg.roomId)!.keys()) } }, userId);
        break;
      }
      case 'offer':
      case 'answer':
      case 'ice-candidate': {
        const targetPeer = rooms.get(msg.roomId)?.get(msg.payload.targetId);
        if (targetPeer?.readyState === WebSocket.OPEN) targetPeer.send(JSON.stringify(msg));
        break;
      }
      case 'leave': {
        rooms.get(msg.roomId)?.delete(userId);
        broadcastToRoom(msg.roomId, { type: 'leave', roomId: msg.roomId, senderId: userId, payload: {} }, userId);
      }
    }
  });

  ws.on('close', () => {
    rooms.get(currentRoom)?.delete(userId);
    if (rooms.get(currentRoom)?.size === 0) rooms.delete(currentRoom);
    broadcastToRoom(currentRoom, { type: 'leave', roomId: currentRoom, senderId: userId, payload: {} }, userId);
  });
});

function broadcastToRoom(roomId: string, msg: SignalingMessage, excludeId?: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const [id, ws] of room) {
    if (id !== excludeId && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }
}
```

### Pattern: Client-Side WebRTC Peer Connection

```typescript
// client/webrtc.ts
export class WebRTCClient {
  private pc: RTCPeerConnection | null = null;
  private signaling: WebSocket;
  private localStream: MediaStream | null = null;
  private remoteStream = new MediaStream();

  constructor(serverUrl: string, private userId: string, private roomId: string) {
    this.signaling = new WebSocket(serverUrl);
    this.setupSignaling();
  }

  private setupSignaling() {
    this.signaling.onopen = () => {
      this.signaling.send(JSON.stringify({ type: 'join', roomId: this.roomId, senderId: this.userId, payload: {} }));
    };
    this.signaling.onmessage = async (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case 'offer': await this.handleOffer(msg); break;
        case 'answer': await this.pc!.setRemoteDescription(new RTCSessionDescription(msg.payload)); break;
        case 'ice-candidate': await this.pc!.addIceCandidate(new RTCIceCandidate(msg.payload)); break;
      }
    };
  }

  async startCall(constraints: MediaStreamConstraints = { audio: true, video: true }) {
    this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'turn:turn.example.com:3478', username: 'user', credential: 'pass' },
      ],
    });
    this.localStream.getTracks().forEach(t => this.pc!.addTrack(t, this.localStream!));
    this.pc.ontrack = (event) => { event.streams[0].getTracks().forEach(t => this.remoteStream.addTrack(t)); };
    this.pc.onicecandidate = (event) => {
      if (event.candidate) this.signaling.send(JSON.stringify({ type: 'ice-candidate', roomId: this.roomId, senderId: this.userId, payload: { targetId: 'peer-id', candidate: event.candidate } }));
    };
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.signaling.send(JSON.stringify({ type: 'offer', roomId: this.roomId, senderId: this.userId, payload: { targetId: 'peer-id', sdp: offer } }));
  }

  private async handleOffer(msg: any) {
    this.pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    this.pc.ontrack = (event) => { event.streams[0].getTracks().forEach(t => this.remoteStream.addTrack(t)); };
    this.pc.onicecandidate = (event) => {
      if (event.candidate) this.signaling.send(JSON.stringify({ type: 'ice-candidate', roomId: this.roomId, senderId: this.userId, payload: { targetId: msg.senderId, candidate: event.candidate } }));
    };
    await this.pc.setRemoteDescription(new RTCSessionDescription(msg.payload.sdp));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    this.signaling.send(JSON.stringify({ type: 'answer', roomId: this.roomId, senderId: this.userId, payload: { targetId: msg.senderId, sdp: answer } }));
  }
}
```

### Pattern: SFU Selective Forwarding (mediasoup)

```typescript
// sfu-server.ts
import * as mediasoup from 'mediasoup';
import { WebSocketServer } from 'ws';

async function createSfu() {
  const worker = await mediasoup.createWorker();
  const router = await worker.createRouter({
    mediaCodecs: [
      { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
      { kind: 'video', mimeType: 'video/VP8', clockRate: 90000 },
      { kind: 'video', mimeType: 'video/H264', clockRate: 90000, parameters: { 'level-asymmetry-allowed': 1, 'packetization-mode': 1, 'profile-level-id': '42e01f' } },
    ],
  });

  const wss = new WebSocketServer({ port: 8081 });
  const peers = new Map<string, { transport: mediasoup.types.WebRtcTransport; producer: mediasoup.types.Producer | null }>();

  wss.on('connection', (ws) => {
    ws.on('message', async (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'create-transport') {
        const transport = await router.createWebRtcTransport({
          listenIps: [{ ip: '0.0.0.0', announcedIp: process.env.PUBLIC_IP }],
          enableUdp: true, enableTcp: true, preferUdp: true,
          initialAvailableOutgoingBitrate: 1000000,
        });
        peers.set(msg.peerId, { transport, producer: null });
        ws.send(JSON.stringify({ type: 'transport-created', id: transport.id, iceParameters: transport.iceParameters, iceCandidates: transport.iceCandidates, dtlsParameters: transport.dtlsParameters }));
      }
      if (msg.type === 'connect-transport') {
        await peers.get(msg.peerId)!.transport.connect({ dtlsParameters: msg.dtlsParameters });
        ws.send(JSON.stringify({ type: 'transport-connected' }));
      }
      if (msg.type === 'produce') {
        const peer = peers.get(msg.peerId)!;
        const producer = await peer.transport.produce({ kind: msg.kind, rtpParameters: msg.rtpParameters });
        peer.producer = producer;
        // Forward to all other peers
        for (const [id, p] of peers) {
          if (id !== msg.peerId && p.transport) {
            const consumer = await p.transport.consume({ producerId: producer.id, rtpCapabilities: router.rtpCapabilities });
            ws.send(JSON.stringify({ type: 'new-consumer', peerId: id, producerId: producer.id, id: consumer.id, kind: consumer.kind, rtpParameters: consumer.rtpParameters }));
          }
        }
        ws.send(JSON.stringify({ type: 'produced', id: producer.id }));
      }
    });
  });
}
```

### Pattern: TURN Server with coturn

```bash
# docker-compose.yml
version: '3.8'
services:
  coturn:
    image: coturn/coturn:latest
    network_mode: host
    command: >
      -n --log-file=stdout
      --min-port=49152 --max-port=65535
      --fingerprint --lt-cred-mech
      --realm=example.com
      --user=appuser:securepassword
      --external-ip=YOUR_PUBLIC_IP
    ports:
      - "3478:3478/udp"
      - "3478:3478/tcp"
      - "5349:5349/tcp"
      - "49152-65535:49152-65535/udp"
```

```typescript
// TURN credential generation (time-limited)
import crypto from 'crypto';

function generateTurnCredentials(sharedSecret: string, username: string, ttl = 86400): { username: string; credential: string } {
  const timestamp = Math.floor(Date.now() / 1000) + ttl;
  const turnUser = `${timestamp}:${username}`;
  const hmac = crypto.createHmac('sha1', sharedSecret).update(turnUser).digest('base64');
  return { username: turnUser, credential: hmac };
}
```

## Production Considerations

### Scalability
- SFU horizontal scaling: use Redis pub/sub to share peer state across signaling server instances
- Media servers are CPU-bound — monitor packet loss and jitter; scale by concurrent rooms
- TURN bandwidth: budget 2-5 Mbps per active media stream; TURN egress costs dominate
- WebSocket signaling: one connection per peer; plan for 10K+ concurrent connections per node

### Deployment
- Separate signaling and media planes — signaling can scale independently from media
- Place TURN servers near users (edge locations) to minimize relay latency
- Use Kubernetes headless services for WebSocket signaling with session affinity
- Monitor: ICE failures, TURN bandwidth, packet loss, jitter, round-trip time

### Monitoring
- Key metrics: ICE connection time, call success rate, media bitrate, packet loss, jitter buffer delay
- Alerts: elevated ICE failure rate >5%, TURN bandwidth >80% capacity, signaling latency >200ms
- Logging: structured JSON logs for all signaling messages (type, roomId, peerId, duration)

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| Relying on P2P mesh for >4 participants | Bandwidth O(n^2) kills clients | Use SFU for any multi-party |
| Hardcoded STUN/TURN URLs | Rotate credentials; no auth on STUN | Use credential-generating TURN with time-limited tokens |
| No reconnection logic | WebRTC fails on network change; no recovery | Implement ICE restart + signaling reconnection |
| Sending raw RTP without congestion control | Network collapse under load | Use WebRTC built-in GCC or SCream congestion control |
| Single signaling server | SPOF for entire system | Load balance signaling; use Redis for room state |
| No simulcast/SVC encoding | All receive same quality regardless of bandwidth | VP9 SVC or VP8 simulcast with 3 spatial layers |
| Blocking TURN ports | Users behind symmetric NAT can't connect | Document required ports: 3478 (TURN), 49152-65535 (media) |

## Security Considerations

- Always use WSS (WebSocket Secure) and TURN over TLS (5349) — never plain WS/STUN
- TURN credentials: time-limited HMAC, never static passwords; rotate shared secret weekly
- Media encryption: SRTP with DTLS-SRTP key exchange (mandatory in WebRTC)
- Signaling authentication: verify JWT/token before allowing room join; reject unauthenticated offers
- Room access control: token must include roomId; validate on every signaling message
- Rate limit signaling messages per peer (e.g., 50/s) to prevent DoS via offer flooding
- Don't expose internal IPs via ICE candidates — use mDNS ICE candidate in browsers (private IPs hidden)
- Screen sharing: implement user consent dialog; never auto-share

## Testing Strategies

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocket } from 'ws';

describe('WebRTC Signaling Server', () => {
  let ws: WebSocket;

  beforeAll(() => { ws = new WebSocket('ws://localhost:8080'); });
  afterAll(() => ws.close());

  it('handles room join and broadcasts peer list', (done) => {
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'room-info') {
        expect(msg.payload.peers).toContain('peer-a');
        done();
      }
    });
    ws.send(JSON.stringify({ type: 'join', roomId: 'test-room', senderId: 'peer-a', payload: {} }));
  });

  it('relays offers between peers', (done) => {
    const ws2 = new WebSocket('ws://localhost:8080');
    ws2.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'offer') {
        expect(msg.payload.sdp.type).toBe('offer');
        ws2.close();
        done();
      }
    });
    ws2.on('open', () => {
      ws2.send(JSON.stringify({ type: 'join', roomId: 'test-room', senderId: 'peer-b', payload: {} }));
      ws.send(JSON.stringify({ type: 'offer', roomId: 'test-room', senderId: 'peer-a', payload: { targetId: 'peer-b', sdp: { type: 'offer', sdp: 'v=0...' } } }));
    });
  });
});
```

- Test ICE connectivity across simulated network conditions (packet loss, latency, NAT)
- Use test WebRTC peers (e.g., puppeteer with Chrome) for E2E media tests
- Load test signaling server with 1000+ concurrent connections
- Validate TURN allocation and deallocation under load
- Run connectivity matrix: test all combinations of client networks (public, NAT, symmetric NAT)

## Rules
- SFU for multi-party calls, P2P mesh for 1-1 only. Never use MCU without transcoding requirement.
- TURN credentials must be time-limited (max 24h TTL). Never use static passwords.
- Signaling must use WSS (not WS) in production. Certificates on first byte.
- Always implement ICE restart on connection loss. Reconnection is mandatory, not optional.
- Media codec negotiation: prefer H.264 for compatibility, VP9/AV1 for quality-per-bitrate.
- Bandwidth estimation must be enabled (REMBB or TWCC). Never send without congestion control.
- Monitor: ICE failures, call duration, packet loss, jitter, RTT per peer.
- Recording: don't record from client-side — record from SFU (server-side) for sync quality.
- Simulcast for multi-party: encode 3 layers (low/medium/high) so SFU can adapt per receiver.

## Metrics & SLAs
| Metric | Target | Critical |
|--------|--------|----------|
| ICE connection time | <3s | >10s |
| Call success rate | >98% | <95% |
| End-to-end latency (audio) | <150ms | >400ms |
| End-to-end latency (video) | <300ms | >500ms |
| Packet loss | <1% | >5% |
| Jitter | <30ms | >80ms |
| TURN relay bandwidth | <70% capacity | >90% capacity |
| Signaling latency | <100ms | >500ms |

## Handoff
- `backend/universal/websocket-patterns` — WebSocket fundamentals and optimizations
- `backend/universal/data-streaming` — Real-time data streaming patterns
- `backend/universal/load-testing` — Load testing signaling and media infrastructure
- `security/network` — TURN/STUN firewall and network security

## Edge Cases
- **Symmetric NAT + firewall**: TURN relay required; test with TURN-only clients before launch
- **Mobile network handoff**: ICE restart on IP change; implement with `connectionstatechange` listener
- **Browser tab backgrounding**: Chrome throttles timers; use `AudioContext` timer for audio sync
- **Multi-radio (WiFi + cellular)**: ICE may prefer wrong interface; set `iceTransportPolicy: 'relay'` for critical sessions
- **Simulcast with bandwidth drop**: SFU should signal layer switch via `RTCRtpSender.setParameters` dynamically

## References
