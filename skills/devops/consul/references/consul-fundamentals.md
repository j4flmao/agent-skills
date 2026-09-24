# Consul Fundamentals

## Overview
Consul is HashiCorp's control plane for service discovery, health checking, the KV store, and the Connect service mesh. This reference covers its architecture, agent roles, cluster formation, ports, and the gossip (Serf) + Raft consensus protocols.

## Architecture Patterns

### Agents
| Agent Role | Runs | Responsibilities |
|------------|------|------------------|
| **Server** | 3 or 5 per DC | Raft quorum, catalog state, ACL evaluation, DNS, HTTP/API, WAN gossip |
| **Client** | Every node | Local service registration, health checking, proxies API/DNS to servers, LAN gossip |
| **Dev** | 1 node | Single-agent cluster for local testing; no persistence guarantees |

### Cluster Formation (Raft)
- Servers form a Raft quorum: needs majority (2 of 3, 3 of 5) for leader election.
- Data replicated to all servers; leader commits writes, reads are served by leader or followers (consistent vs stale).
- `-bootstrap` is only for the first node; production uses `bootstrap_expect` + `retry_join`.

### Gossip (Serf)
Two gossip pools:
- **LAN (Serf LAN, port 8301)**: members of a datacenter — agents, health of servers.
- **WAN (Serf WAN, port 8302)**: between datacenter servers only — datacenter reachability.
- All entries encrypted with AES-GCM using the `encrypt` key. Events propagate with `less than 1 sec` to a datacenter, `~2 sec` between datacenters.

### Raft vs Gossip division of labor
- Raft: consensus on the catalog, ACL policies, KV data, sessions, intentions.
- Gossip: membership, failure detection, and cross-DC health.

## Ports Summary
| Port | Protocol | Use |
|------|----------|-----|
| 8300 | TCP | Server RPC (`server` RPC) |
| 8301 | TCP + UDP | Serf LAN gossip |
| 8302 | TCP + UDP | Serf WAN gossip |
| 8500 | HTTP | HTTP API (plaintext by default) |
| 8501 | HTTPS | HTTP API TLS (if enabled) |
| 8502 | gRPC | xDS / gRPC for Envoy / connect |
| 8600 | TCP + UDP | DNS interface (service discovery) |
| 19000 | TCP | Envoy admin (per sidecar, local) |

Set ports to `-1` to disable. Keep the HTTP port internal if possible; expose HTTPS or use mTLS.

## Core Concepts

### Consensus
Each server has a replicated state machine. The term is incremented per election; a candidate requests votes from peers; a majority forms a leader. Leaders serve all transactional writes. A follower that receives a write forwards it to the leader.

**Quorum** (`3 of 5`, `2 of 3`):
```
5 servers: 3 up -> write allowed; 2 up -> read-only, no commit
```

### Raft Terms
- **Leader**: clock, handles all writes, replicates via AppendEntries.
- **Follower**: answers reads, votes.
- **Candidate**: asks for votes after election timeout.
- **Snapshot**: compaction of the log; on restore new node serves immediately.

### Data Persistence
`data_dir/` contains `raft/`, `serf/`, `acl/` (if enabled). Back up via `consul snapshot save`. Never back up a `data_dir` sync — use snapshots.

## Implementation Guide

### Step 1: Server bootstrap
```hcl
server = true
bootstrap_expect = 3
retry_join = ["10.0.1.11", "10.0.1.12", "10.0.1.13"]
```
`consul agent -config-dir=/etc/consul.d` on each node in parallel.

### Step 2: Encryption
```bash
consul keygen   # returns a 32-byte base64 key
```
Set `encrypt` in all agent configs. Rotate keys with `consul operator rotate` (LAN) — support in recent versions.

### Step 3: TLS everywhere
```hcl
verify_incoming = true
verify_outgoing = true
verify_server_hostname = true
ca_file   = "/etc/consul/tls/agent-ca.pem"
cert_file = "/etc/consul/tls/$HOSTNAME-cert.pem"
key_file  = "/etc/consul/tls/$HOSTNAME-key.pem"
```

### Step 4: Validate
```bash
consul operator raft list-peers
consul members -detailed
consul info
consul catalog datacenters
```

## Best Practices
| Practice | Why |
|----------|-----|
| 3 or 5 servers, spread across failure domains | Raft majority |
| Local SSD for data_dir | Synch writes latency |
| `retry_join` over static addresses | Autocluster |
| `autopilot { cleanup_dead_servers = true }` | Auto-remove dead peers |
| Separate `-config-dir` fragments | Clean CI/CD merge |
| `max_replicas` (consul ) >= servers | Autopilot enforcement |

## Pitfalls
- Bootstrapping two nodes → split brain on two "leaders".
- Raft timeouts on network storage → constant election loops.
- WAN gossip unencrypted → datacenter discovery leaked.
- Clients without `encrypt` in multi-DC → rejection loops.
- `bootstrap_expect = 3` but only 1 node started → node waits forever (check `consul members`).

## Checklist
- [ ] 3–5 servers per DC, odd number.
- [ ] Gossip encryption + TLS (in/out/hostname).
- [ ] `retry_join` with proper addresses, no `-bootstrap`.
- [ ] Authentication via ACLs at `default_policy = deny`.
- [ ] Snapshots scheduled + tested restore.
- [ ] Autopilot enabled and `raft list-peers` clean.