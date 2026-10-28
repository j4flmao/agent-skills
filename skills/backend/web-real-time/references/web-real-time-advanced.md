# Advanced WebRTC: Simulcast/SVC, Congestion Control, SFU Scaling, WHIP/WHEP and E2EE

Techniques for production-grade real-time media: adapting quality per receiver, bandwidth estimation, scaling SFUs across regions, standardized ingest/egress, end-to-end encryption through SFUs, and media quality monitoring. Fundamentals in `web-real-time-fundamentals.md`.

## Simulcast vs SVC

| Technique | How | SFU behavior | Codec |
|---|---|---|---|
| Simulcast | Sender encodes several independent resolutions/bitrates | Forwards one encoding per receiver | VP8, H.264, VP9, AV1 |
| SVC (scalable video coding) | One stream with spatial/temporal layers | Drops layers per receiver | VP9, AV1 (L1T3, L3T3 etc.) |

Simulcast setup:

```ts
pc.addTransceiver(videoTrack, {
  direction: "sendonly",
  sendEncodings: [
    { rid: "q", scaleResolutionDownBy: 4, maxBitrate: 150_000 },
    { rid: "h", scaleResolutionDownBy: 2, maxBitrate: 500_000 },
    { rid: "f", maxBitrate: 1_500_000 },
  ],
});
```

SVC (where supported): `sendEncodings: [{ scalabilityMode: "L3T3" }]` with VP9/AV1. Check `RTCRtpSender.getCapabilities("video")` and browser support before relying on a mode.

Receivers request layers based on their viewport (thumbnail vs speaker view) and bandwidth; the SFU switches layers on keyframes (simulcast) or layer boundaries (SVC).

## Congestion Control

- Google Congestion Control (GCC) with transport-wide congestion control feedback (TWCC) is the de facto browser approach; receivers report packet arrival times, the sender estimates available bandwidth.
- REMB is an older receiver-side estimate still seen in some servers.
- The sender adapts encoder bitrate/resolution; with simulcast the SFU picks lower layers for constrained receivers.

Application levers:
- `RTCRtpSender.setParameters()` to cap bitrate (`encodings[i].maxBitrate`) or deactivate encodings no one consumes (`active: false`).
- `contentHint = "detail"` for screen share (favor sharpness) or `"motion"` for video.
- `degradationPreference` (`maintain-framerate`, `maintain-resolution`, `balanced`) where supported.

## Resilience Tools

| Tool | Purpose |
|---|---|
| NACK + retransmission (RTX) | Recover lost packets when RTT allows |
| FEC (Opus in-band FEC, FlexFEC/ULPFEC/RED) | Recover loss without retransmission delay |
| Opus DTX | Save bandwidth during silence |
| Jitter buffer | Smooths arrival variance; adds latency |
| PLI/FIR (keyframe requests) | Recover after heavy loss or layer switch |

## SFU Scaling

| Pattern | Description |
|---|---|
| Vertical | One SFU node per room; rooms placed by load |
| Cascading / relay | Rooms span multiple SFUs (by region); SFUs forward streams to each other so each participant connects to the nearest node |
| Media/signaling split | Stateless signaling tier, stateful media tier with a room-to-node registry |

Capacity planning inputs: forwarded streams (publishers × subscribers per room), egress bandwidth, packet rate (CPU), and recording/transcoding work. SFU servers commonly used: mediasoup, Janus, Jitsi Videobridge, LiveKit, Pion-based custom servers.

Room placement: route new rooms to the region of the first participant, then cascade to other regions as participants join. Keep TURN close to users (anycast or geo-DNS).

## WHIP and WHEP

- WHIP (WebRTC-HTTP Ingestion Protocol, RFC 9725): publisher POSTs an SDP offer to an HTTP endpoint and receives the answer; DELETE on the returned resource URL ends the session. Lets OBS, encoders and browsers publish to any compliant media server.
- WHEP (WebRTC-HTTP Egress Protocol): same pattern for playback; an IETF draft at the time of writing, implemented by several servers and players.

```http
POST /whip/endpoint/stream-42 HTTP/1.1
Authorization: Bearer <stream-key-token>
Content-Type: application/sdp

v=0 ...offer...

HTTP/1.1 201 Created
Location: /whip/resource/abc123
Content-Type: application/sdp

v=0 ...answer...
```

## End-to-End Encryption Through SFUs

DTLS-SRTP is hop-by-hop; the SFU sees plaintext media. For E2EE:
- Use encoded transforms (`RTCRtpScriptTransform`, standardized; Chrome's older Insertable Streams API is similar) to encrypt the encoded frame payload before packetization.
- SFrame (RFC 9605) defines a frame encryption format suitable for this, leaving headers the SFU needs readable.
- Key management is the hard part: keys distributed out of band, rotated on membership change (MLS, RFC 9420, is a fit for group keys).
- Trade-offs: server-side recording, transcription and compositing cannot see media.

## Monitoring with getStats

```ts
setInterval(async () => {
  const report = await pc.getStats();
  report.forEach((s) => {
    if (s.type === "inbound-rtp" && s.kind === "video") {
      metrics.push({
        packetsLost: s.packetsLost,
        jitter: s.jitter,
        framesDecoded: s.framesDecoded,
        framesDropped: s.framesDropped,
        freezeCount: s.freezeCount,
      });
    }
    if (s.type === "candidate-pair" && s.nominated) {
      metrics.push({ rtt: s.currentRoundTripTime, availableOutgoingBitrate: s.availableOutgoingBitrate });
    }
  });
}, 5000);
```

Aggregate per session server-side: join success rate, time to first frame, RTT, loss, freezes, relay (TURN) usage share, quality-limitation reasons (`qualityLimitationReason` on outbound RTP: `cpu`, `bandwidth`).

## Recording and Composition

- Record per-track (cheap; compose later) or composite in real time (MCU-style mixer or headless browser compositor; expensive).
- Store with timestamps to resynchronize tracks; handle simulcast layer switches in recordings.

## Pitfalls
- Simulcast layers no subscriber needs still encoded: wasted sender CPU and uplink; deactivate them.
- Single-region SFU for global calls: high RTT for distant participants.
- Assuming DTLS-SRTP means E2EE when routing through an SFU.
- Ignoring `qualityLimitationReason`; CPU-limited senders look like network issues.
- TURN only over UDP; enterprise users fail to connect.

## Checklist
- [ ] Simulcast or SVC with receiver-driven layer selection
- [ ] Bitrate caps and inactive encodings managed
- [ ] Loss recovery (NACK/RTX, FEC) enabled appropriately
- [ ] SFU cascading or regional placement for global rooms
- [ ] WHIP/WHEP for encoder ingest/playback where suitable
- [ ] E2EE via encoded transforms + key management if required
- [ ] getStats-based quality telemetry and alerts
