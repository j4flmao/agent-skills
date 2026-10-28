---
name: distributed-consensus
description: >
  Use this skill when the user says 'consensus', 'Raft', 'Paxos', 'leader election', 'split brain', 'quorum', 'etcd', 'ZooKeeper', 'KRaft', 'replicated log', 'linearizable', 'fencing token', 'how many nodes for fault tolerance'. Explains consensus and replication: quorums and failure tolerance, Raft (election, log replication, safety, membership changes), Paxos/Multi-Paxos and ZAB at a design level, leases and fencing, and how to use consensus systems (etcd, ZooKeeper, Consul, KRaft) correctly. Do NOT use for: application-level distributed locks API usage (use backend/universal/distributed-locking), CAP/consistency model selection for app data (use data/relational-database or architecture skills), blockchain consensus (use blockchain-core).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [system-design, consensus, raft, paxos, replication, etcd]
---

# Distributed Consensus

## Purpose
Consensus lets a group of machines agree on a sequence of values (a replicated log) despite crashes and network partitions, which is how etcd, ZooKeeper, Consul and Kafka's KRaft keep a single source of truth. This skill explains the guarantees and failure model, the Raft algorithm in enough detail to reason about edge cases, and the rules for using these systems safely.

## Agent Protocol

### Trigger
"consensus", "Raft", "Paxos", "leader election", "split brain", "quorum", "etcd", "ZooKeeper", "KRaft", "replicated log", "linearizable", "fencing token".

### Input Context
- What must be agreed (configuration, leadership, metadata, every write)
- Cluster size, zones/regions, latency between them
- Failure model (crash-stop vs Byzantine) and consistency requirement

### Output Artifact
Cluster sizing, protocol explanation, failure-scenario walkthrough, usage pattern. No file unless requested.

### Response Format
```
Need: {leader election | config store | replicated state machine}
Cluster: {N nodes over Z zones} tolerates {f} failures
Protocol/system: {Raft via etcd | ZooKeeper (ZAB) | ...}
Scenario: {failure} -> {behaviour}
Client rules: {timeouts, fencing, linearizable reads}
```

## 1. Fundamentals
- Crash-fault-tolerant consensus needs a majority quorum: N = 2f + 1 nodes tolerate f failures (3 → 1, 5 → 2). Even sizes add cost without tolerance (4 still tolerates 1).
- Two majorities always intersect, which is why only the side with a majority can make progress during a partition — this prevents split brain.
- FLP impossibility: no deterministic protocol guarantees termination in a fully asynchronous network with one faulty process; practical protocols guarantee safety always and liveness when timing is reasonable (timeouts, randomisation).
- Byzantine (malicious) faults need 3f + 1 nodes and different protocols (PBFT, HotStuff) — not covered by Raft/Paxos.

## 2. Raft
Raft decomposes consensus into leader election, log replication and safety (Ongaro & Ousterhout, 2014).

### Terms and roles
Time is divided into terms with at most one leader each. Nodes are follower, candidate or leader. Every message carries the sender's term; a node seeing a higher term steps down to follower and updates its term.

### Leader election
- Followers that hear no heartbeat (`AppendEntries`) within a randomised election timeout (the paper's example: 150–300 ms) become candidates, increment the term and send `RequestVote`.
- A node grants at most one vote per term, and only to a candidate whose log is at least as up to date (higher last term, or same term and longer log).
- Randomised timeouts make split votes rare. **PreVote** (implemented in etcd) stops a partitioned node from disrupting the cluster with ever-increasing terms when it rejoins.

### Log replication
- The leader appends client commands to its log and replicates via `AppendEntries` (with the previous index/term for the consistency check).
- An entry is **committed** once stored on a majority; the leader applies it to its state machine and replies to the client. Followers apply entries up to the leader's commit index.
- Log Matching: if two logs contain an entry with the same index and term, all preceding entries are identical. On a mismatch the leader backs up and overwrites the follower's conflicting, uncommitted suffix.

### Safety details
- A leader only counts replicas for entries from its **current term** when advancing the commit index (older-term entries become committed indirectly) — this closes the classic Figure 8 scenario.
- A deposed leader in a minority partition can still accept requests but can never commit them; when it sees the higher term it steps down and its uncommitted entries are replaced.

### Membership changes
Change one server at a time (single-server changes) or use joint consensus; add new members as non-voting learners first so they catch up before affecting quorum.

### Snapshots
Compact the log with state-machine snapshots; lagging followers receive `InstallSnapshot`.

## 3. Paxos Family and ZAB
- Paxos (Lamport): proposers, acceptors, learners; two phases (prepare/promise, accept/accepted) agree on one value; Multi-Paxos elects a stable leader to skip phase 1 for consecutive slots. Equivalent power to Raft; harder to implement fully (Raft specifies more of the system).
- ZAB (ZooKeeper Atomic Broadcast): leader-based, primary-backup ordering with epochs; ZooKeeper offers ordered writes and sequential/ephemeral znodes.
- Kafka 4.0 removed ZooKeeper; clusters use KRaft (a Raft-based metadata quorum).

## 4. Reads
- Reads served by any node can be stale. Linearizable reads need the leader to confirm it is still leader: a quorum round (ReadIndex) or a time-based leader lease (requires bounded clock drift).
- etcd: linearizable reads by default; `serializable` reads are faster but may be stale. ZooKeeper reads are local (sequentially consistent); call `sync()` first when you need the latest value.

## 5. Using Consensus Systems Correctly
- Keep the consensus store for small, critical metadata (leader election, configuration, service discovery, locks) — not bulk data. etcd's default storage quota is 2 GB (configurable, recommended max 8 GB).
- Leader election / locks: use leases with TTLs (etcd lease + `concurrency.Election`, ZooKeeper ephemeral sequential nodes). A process can pause (GC, VM stall) past its lease and still believe it is leader — protect downstream resources with **fencing tokens** (monotonic revision/zxid checked by the resource).
- Latency: each commit needs a majority round trip plus fsync; place members within low-latency links (one region, multiple zones). Cross-region clusters pay inter-region RTT on every write.
- Size: 3 or 5 voting members; more voters slow writes. Scale reads with learners/observers.
- Disks: consensus is fsync-latency bound — use fast SSDs and monitor WAL fsync duration (etcd `wal_fsync_duration_seconds`).

## 6. Failure Walkthroughs (5-node cluster)
| Event | Result |
|-------|--------|
| 1–2 nodes crash | majority (3) remains; progress continues; a new leader is elected if the leader was among them |
| Partition 3 / 2 | the 3-node side elects/keeps a leader and commits; the 2-node side cannot commit |
| Partition 2 / 2 / 1 | no majority anywhere: writes stop (safety over availability) |
| Leader paused 30 s then resumes | others elected a new leader with a higher term; old leader steps down on first contact; clients must handle the leadership change |

## 7. Anti-Patterns
- Two-node "clusters" or even-sized clusters expecting extra tolerance.
- Building your own consensus instead of using etcd/ZooKeeper/a Raft library (hashicorp/raft, etcd/raft, OpenRaft).
- Using a lock/lease without fencing for writes to external storage.
- Stretching a 3-node cluster across two regions (losing the region with two nodes stops writes).
- Storing large blobs or high-churn data in etcd/ZooKeeper.

## 8. Checklist
- [ ] N = 2f + 1 voters across independent failure domains
- [ ] Read consistency level chosen explicitly (linearizable vs stale)
- [ ] Leases + fencing tokens for leadership-guarded side effects
- [ ] Disk fsync latency and leader changes monitored
- [ ] Membership changes one at a time, learners first
- [ ] Failure scenarios tested (partition, leader pause, disk full)
