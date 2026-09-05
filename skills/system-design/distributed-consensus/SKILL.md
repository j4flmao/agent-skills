# Distributed Consensus (Raft & Paxos)

## 1. Skill Context
**Focus**: Understanding how distributed clusters (e.g., Kubernetes etcd, Kafka Kraft, MongoDB Replica Sets) maintain a single source of truth despite server crashes and network partitions.
**Triggers**: raft, paxos, consensus, split-brain, leader-election, distributed-systems.

## 2. The Split-Brain Problem
If you have a primary Database and a secondary Database, what happens if the network cable between them is cut? 
- Node A thinks Node B is dead. Node B thinks Node A is dead.
- If both decide to become the "Primary" and accept writes, the database will permanently corrupt its data (Split-Brain).
- **The Solution**: Distributed Consensus algorithms require a **Quorum** (Majority). In a 3-node cluster, you need 2 nodes to agree. If the network splits, only the side with the majority can accept writes.

## 3. Raft Algorithm (Understandable Consensus)
Raft is the industry standard (powering `etcd` and `Consul`). It decomposes consensus into 3 problems:

### A. Leader Election
- All nodes start as **Followers**.
- If a Follower stops receiving "Heartbeats" from a Leader, it becomes a **Candidate** and starts an election.
- *Crucial Innovation*: Randomized Election Timeouts (e.g., 150ms - 300ms). This prevents two nodes from calling an election at the exact same millisecond and endlessly splitting votes.

### B. Log Replication
- Only the Leader accepts write requests from clients.
- The Leader appends the command to its log and sends an `AppendEntries` RPC to all Followers.
- Only when the Leader receives a successful ACK from a *Quorum* (majority) of followers does it "Commit" the entry and return success to the client.

### C. Safety
If a network partition isolates the old Leader, it might try to keep serving writes. However, it cannot reach a Quorum, so all its writes remain uncommitted. When the partition heals, the old Leader sees a new Leader with a higher "Term Number" and immediately steps down, wiping its uncommitted logs.
