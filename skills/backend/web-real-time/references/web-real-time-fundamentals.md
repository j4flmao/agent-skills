# WebRTC Fundamentals: Signaling, ICE, Media Security and the Peer Connection API

The building blocks of a WebRTC session: what signaling must carry, how SDP offer/answer works, how ICE with STUN/TURN establishes connectivity, how media is secured, and the browser APIs that tie it together. Topology choices (mesh/SFU/MCU) are in `webrtc-architecture.md`.

## Session Setup Overview

```
Caller                         Signaling server                      Callee
getUserMedia ─┐
createOffer ──┴─ SDP offer ──────────►  relay  ──────────────────────► setRemoteDescription
                                                                       createAnswer
setRemoteDescription ◄──────────────── relay ◄──────── SDP answer ──── setLocalDescription
ICE candidates  ◄──────────── trickled both ways via signaling ───────► ICE candidates
──────────────── ICE connectivity checks (STUN) / relay via TURN ────────────────
──────────────── DTLS handshake → SRTP media + SCTP data channels ────────────────
```

WebRTC does not define signaling; use WebSocket, HTTP, or standardized WHIP/WHEP for ingest/egress to media servers.

## Signaling Responsibilities

- Exchange SDP offers/answers and ICE candidates.
- Authenticate users and authorize room membership.
- Issue short-lived TURN credentials.
- Handle presence, joins/leaves, renegotiation messages.

Signaling must run over TLS (WSS/HTTPS); it carries the DTLS fingerprints that authenticate the media path.

## SDP Essentials

SDP describes media sections (`m=audio`, `m=video`, `m=application` for data channels), codecs and payload types, ICE credentials (`a=ice-ufrag`, `a=ice-pwd`), DTLS fingerprint (`a=fingerprint:sha-256 ...`), directions (`sendrecv`, `sendonly`, `recvonly`), and extensions (simulcast `a=simulcast`, RTP header extensions). Treat SDP as opaque in application code except for well-understood edits; prefer API methods (`setCodecPreferences`, transceiver directions) over string munging.

## ICE, STUN and TURN

| Candidate type | Source | Works when |
|---|---|---|
| host | Local interface address | Same network |
| srflx (server reflexive) | Public address learned via STUN | Most NATs (not symmetric NAT) |
| relay | Allocated on a TURN server | Always (if TURN reachable), at relay cost |

- STUN: lightweight; tells a client its public address.
- TURN: relays media when direct paths fail (symmetric NATs, restrictive firewalls). Provide TURN over UDP, TCP and TLS on 443 for corporate networks.
- Trickle ICE: send candidates as they are gathered to reduce setup time.
- ICE restart (`pc.restartIce()`) recovers from network changes (Wi-Fi → cellular).

TURN credentials: use time-limited credentials (the TURN REST API pattern with HMAC of `expiry:username`, supported by coturn's `use-auth-secret`), never static passwords in client code.

## Media Security

- All WebRTC media is encrypted: DTLS-SRTP for audio/video, DTLS for SCTP data channels. There is no unencrypted mode in browsers.
- Encryption is hop-by-hop with servers: an SFU decrypts SRTP to route it. End-to-end encryption through SFUs needs encoded transforms with SFrame-style payload encryption (see `web-real-time-advanced.md`).
- `getUserMedia` requires a secure context (HTTPS) and user permission.

## Codecs

| Media | Mandatory-to-implement | Common choices |
|---|---|---|
| Audio | Opus, G.711 | Opus (with in-band FEC, DTX) |
| Video | VP8, H.264 (Constrained Baseline) | VP8, VP9, H.264, AV1 (support varies by browser and hardware) |

Pick codecs per client support and hardware acceleration; AV1/VP9 give better compression with more CPU, mainly beneficial with SVC.

## Browser API Example

```ts
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: "stun:stun.example.com:3478" },
    { urls: ["turn:turn.example.com:3478?transport=udp", "turns:turn.example.com:443?transport=tcp"],
      username: turnCreds.username, credential: turnCreds.credential },
  ],
});

const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 1280, height: 720 } });
for (const track of stream.getTracks()) pc.addTrack(track, stream);

pc.onicecandidate = ({ candidate }) => { if (candidate) signaling.send({ type: "candidate", candidate }); };
pc.ontrack = ({ streams }) => { remoteVideo.srcObject = streams[0]; };
pc.onconnectionstatechange = () => {
  if (pc.connectionState === "failed") pc.restartIce();
};

const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
signaling.send({ type: "offer", sdp: pc.localDescription });

signaling.on("answer", async (msg) => pc.setRemoteDescription(msg.sdp));
signaling.on("candidate", async (msg) => pc.addIceCandidate(msg.candidate));
```

Use the "perfect negotiation" pattern (polite/impolite peers, `negotiationneeded` handler, rollback on glare) when both sides may renegotiate.

## Data Channels

```ts
const dc = pc.createDataChannel("chat", { ordered: true });                         // reliable, ordered
const telemetry = pc.createDataChannel("pos", { ordered: false, maxRetransmits: 0 }); // unreliable, low latency
```

Use unreliable channels for state that is superseded quickly (game positions, cursors).

## Connection States to Handle

| State | Meaning | Action |
|---|---|---|
| `iceConnectionState=disconnected` | Temporary loss | Wait briefly; UI "reconnecting" |
| `connectionState=failed` | No working path | ICE restart; check TURN reachability |
| `closed` | Ended | Release media tracks (`track.stop()`) |

## Checklist
- [ ] Signaling over TLS with authentication and room authorization
- [ ] STUN plus TURN (UDP, TCP, TLS/443) with time-limited credentials
- [ ] Trickle ICE and ICE restart on failure
- [ ] Perfect negotiation for renegotiation
- [ ] Codec choices matched to client/hardware support
- [ ] Media tracks stopped and connections closed on leave
