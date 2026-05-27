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

## References
  - references/live-streaming.md — WebRTC Signaling
  - references/real-time-architecture.md — Real-Time Web Architecture
  - references/real-time-delivery.md — Real-Time Delivery Strategies
  - references/sse-vs-websocket.md — SSE vs WebSocket vs Long Polling
  - references/web-real-time-advanced.md — Web Real Time Advanced Topics
  - references/web-real-time-fundamentals.md — Web Real Time Fundamentals
  - references/webrtc-architecture.md — WebRTC Architecture
  - references/websocket-optimization.md — WebSocket Optimization
