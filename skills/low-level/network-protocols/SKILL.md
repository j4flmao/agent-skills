---
name: network-protocols
description: >
  Use this skill when the user says 'TCP state', 'TIME_WAIT', 'three-way handshake', 'congestion control', 'CUBIC', 'BBR', 'Nagle', 'TCP_NODELAY', 'retransmission', 'MTU', 'QUIC', 'HTTP/3', 'UDP vs TCP', 'socket tuning', 'tcpdump', 'packet loss'. Explains transport-layer behaviour (TCP state machine, flow and congestion control, loss recovery, MTU) and QUIC, and turns it into socket options, kernel tuning and packet-capture diagnosis. Do NOT use for: HTTP API design (use backend/universal/api-design), service meshes (use devops/service-mesh), XDP/eBPF packet programs (use ebpf-engineering), game netcode (use multiplayer-netcode).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [low-level, networking, tcp, quic, congestion-control, sockets]
---

# Network Protocols (Transport Layer)

## Purpose
Latency spikes, stalled transfers, connection exhaustion and "slow on mobile" problems usually trace back to transport behaviour: handshakes, congestion windows, retransmission timers, Nagle/delayed-ACK interaction, MTU black holes, or TIME_WAIT. This skill explains the mechanisms with their RFCs and gives the knobs and captures to diagnose them.

## Agent Protocol

### Trigger
"TCP state", "TIME_WAIT", "handshake", "congestion control", "CUBIC", "BBR", "Nagle", "TCP_NODELAY", "retransmission", "MTU", "QUIC", "HTTP/3", "UDP vs TCP", "socket tuning", "tcpdump".

### Input Context
- Symptom and where it appears (client, server, load balancer), RTT and loss characteristics
- OS/kernel version, protocol stack (TCP+TLS, QUIC), traffic pattern (request/response, bulk, streaming)
- Available evidence: `ss -ti`, `netstat -s`, pcap

### Output Artifact
Diagnosis, socket/sysctl changes, capture/analysis commands. No file unless requested.

### Response Format
```
Symptom: {observed}
Mechanism: {protocol behaviour responsible}
Evidence: {ss/pcap/counter lines}
Fix: {socket option / sysctl / design change}
Verify: {metric to re-measure}
```

## 1. TCP Connection Lifecycle (RFC 9293, which obsoletes RFC 793)
```
Client: CLOSED → SYN_SENT → ESTABLISHED → FIN_WAIT_1 → FIN_WAIT_2 → TIME_WAIT → CLOSED
Server: LISTEN → SYN_RCVD → ESTABLISHED → CLOSE_WAIT → LAST_ACK → CLOSED
```
- Handshake costs 1 RTT before data (plus 1 RTT for TLS 1.3, 2 for TLS 1.2). TCP Fast Open and TLS 1.3 0-RTT can trim this with replay caveats.
- **TIME_WAIT** is held by the side that closes first for 2×MSL (Linux: fixed 60 s) so delayed segments cannot corrupt a new connection with the same 4-tuple. Many TIME_WAIT sockets on a client exhaust ephemeral ports: reuse connections (keep-alive/pooling), widen `net.ipv4.ip_local_port_range`, enable `net.ipv4.tcp_tw_reuse` (safe for outgoing connections with timestamps). Never use the removed `tcp_tw_recycle`.
- **CLOSE_WAIT** piling up means the application never calls `close()` — an app bug, not a kernel setting.
- Listen backlog: SYN queue + accept queue (`somaxconn`, `listen(fd, backlog)`); overflows show in `netstat -s` ("SYNs to LISTEN sockets dropped").

## 2. Flow Control and Throughput
- Receiver advertises a window; window scaling (RFC 7323) allows > 64 KB. Throughput ≤ window / RTT, so the bandwidth-delay product (BDP = bandwidth × RTT) must fit in socket buffers: 1 Gbit/s × 100 ms ≈ 12.5 MB.
- Linux auto-tunes buffers within `net.ipv4.tcp_rmem` / `tcp_wmem`; raise the max for long fat networks rather than setting `SO_RCVBUF` (which disables auto-tuning).

## 3. Congestion Control
| Algorithm | Signal | Behaviour |
|-----------|--------|-----------|
| Reno/NewReno | loss | AIMD: additive increase, halve on loss |
| CUBIC (RFC 9438; Linux default) | loss | window grows as a cubic function of time since last reduction; scales on high-BDP paths; fills buffers (bufferbloat) |
| BBR (v1 in mainline Linux; v3 developed by Google) | model: bottleneck bandwidth + min RTT | paces at estimated bandwidth, keeps queues short; v1 can be unfair to CUBIC and ignore loss up to high rates |
| DCTCP | ECN marks | data centres with ECN-capable switches |

- Slow start doubles cwnd per RTT from an initial window of 10 segments (RFC 6928) — short transfers are RTT-bound, not bandwidth-bound.
- Switch per host: `sysctl net.ipv4.tcp_congestion_control=bbr` (with `fq` qdisc for pacing on older kernels). Measure on your paths; BBR mainly helps lossy, long-RTT links.

## 4. Loss Recovery
- Fast retransmit on 3 duplicate ACKs; SACK (RFC 2018) tells the sender exactly what is missing; RACK-TLP (RFC 8985) is Linux's time-based loss detection.
- RTO: minimum 200 ms on Linux (RFC 6298 suggests 1 s), doubling on each timeout — a single tail loss on a short request can add hundreds of ms; this is a classic p99 latency source.
- Inspect with `ss -ti` (cwnd, rtt, retrans, pacing rate) and `nstat`/`netstat -s` retransmission counters.

## 5. Small-Message Latency: Nagle and Delayed ACK
- Nagle holds small segments while unacknowledged data is in flight; the peer's delayed ACK (up to ~40 ms on Linux, 200 ms on some stacks) waits for more data → write-write-read patterns stall.
- Fix: `TCP_NODELAY` for request/response and interactive protocols (most RPC/HTTP libraries set it), or coalesce writes (`writev`, `TCP_CORK`/`MSG_MORE` then flush).

## 6. MTU and Fragmentation
- Ethernet MTU 1500 → TCP MSS 1460 (IPv4) / 1440 (IPv6) without options. Tunnels (VXLAN, WireGuard, IPsec) reduce it.
- Path MTU discovery relies on ICMP "fragmentation needed"/"packet too big"; firewalls dropping ICMP create black holes (handshake works, large responses hang). Fixes: allow ICMP, MSS clamping on tunnel endpoints, PLPMTUD (`net.ipv4.tcp_mtu_probing=1`).
- UDP protocols should keep datagrams ≤ ~1200 bytes unless the path is known (QUIC's minimum is 1200).

## 7. QUIC and HTTP/3
- QUIC (RFC 9000, TLS 1.3 integrated per RFC 9001) runs over UDP: 1-RTT handshake (0-RTT resumption), independent streams without TCP head-of-line blocking, connection migration via connection IDs, encrypted transport headers, user-space congestion control (CUBIC/BBR in the library).
- HTTP/3 (RFC 9114) maps HTTP onto QUIC; discovered via `Alt-Svc` or HTTPS DNS records; clients fall back to HTTP/2 over TCP when UDP is blocked.
- Costs: higher CPU per byte than kernel TCP (use GSO/GRO, `UDP_SEGMENT`), middleboxes that rate-limit UDP.

## 8. UDP vs TCP Decision
| Need | Choose |
|------|--------|
| Reliable ordered byte stream, broad middlebox support | TCP (+TLS) |
| Many independent streams, mobility, fast setup | QUIC |
| Real-time media/games where late data is useless | UDP with app-level reliability (RTP/WebRTC, game netcode) |
| Multicast/discovery | UDP |

## 9. Diagnosis Toolkit
```bash
ss -tinp state established '( dport = :443 )'     # per-socket cwnd/rtt/retrans
nstat -az | grep -i -E 'retrans|timeout|listendrop' # counters
tcpdump -i eth0 -s 128 -w cap.pcap 'tcp port 443'   # then analyse in Wireshark (Statistics → TCP Stream Graphs)
mtr -rwzc 100 host                                  # per-hop loss/latency
```
In Wireshark look for retransmissions, zero windows, duplicate ACKs, long gaps after small segments (Nagle/delayed ACK) and missing large packets (MTU).

## 10. Anti-Patterns
- New TCP+TLS connection per request (handshake RTTs, TIME_WAIT churn) instead of pooling.
- Setting fixed `SO_RCVBUF/SO_SNDBUF` small values that cap throughput on high-BDP paths.
- Blocking all ICMP.
- Tuning sysctls from blog posts without measuring (e.g. `tcp_tw_recycle`, which broke NAT clients and was removed in Linux 4.12).
- Treating every timeout as packet loss without checking app-level stalls (CLOSE_WAIT, full accept queue).

## 11. Checklist
- [ ] Connections reused; idle timeouts aligned across client, LB and server
- [ ] Buffers allow the path's BDP; auto-tuning not disabled accidentally
- [ ] `TCP_NODELAY` or write coalescing for request/response traffic
- [ ] MTU/MSS correct through tunnels; ICMP PTB allowed
- [ ] Congestion control choice measured on real paths
- [ ] Retransmission/drop counters monitored
