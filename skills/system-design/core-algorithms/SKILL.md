---
name: core-algorithms-system-design
description: >
  Use this skill when the user says 'consistent hashing', 'hash ring', 'virtual nodes', 'rendezvous hashing', 'jump hash', 'bloom filter', 'false positive rate', 'count-min sketch', 'HyperLogLog', 'top-k', 'merkle tree', 'geohash', 'algorithms for system design interview'. Explains and sizes the probabilistic and partitioning algorithms used in distributed systems — consistent/rendezvous/jump hashing, Bloom and cuckoo filters, Count-Min Sketch, HyperLogLog, Merkle trees, geohash — with formulas, code and when to use each. Do NOT use for: rate limiting algorithms (use system-design-rate-limiting), shard topology and resharding (use system-design-database-sharding), consensus (use distributed-consensus).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [system-design, algorithms, consistent-hashing, bloom-filter, hyperloglog]
---

# Core Algorithms for System Design

## Purpose
A handful of algorithms keep appearing inside caches, databases and stream processors: ways to spread keys over changing node sets, and compact sketches that answer membership, frequency and cardinality questions approximately. This skill gives each algorithm's guarantees, sizing formulas and a decision table.

## Agent Protocol

### Trigger
"consistent hashing", "hash ring", "virtual nodes", "rendezvous hashing", "jump hash", "bloom filter", "count-min sketch", "HyperLogLog", "top-k", "merkle tree", "geohash".

### Input Context
- Problem: key placement, membership test, frequency, distinct count, data reconciliation, proximity search
- Scale (items, nodes), acceptable error, memory budget, update/delete needs

### Output Artifact
Algorithm choice with sizing math and a reference implementation. No file unless requested.

### Response Format
```
Problem: {what is asked}
Algorithm: {choice} because {property}
Sizing: {parameters and formula result}
Error/guarantee: {bound}
Code: {snippet}
```

## 1. Distributing Keys over Nodes
`hash(key) % N` remaps about (N-1)/N of keys when N changes — unusable for caches and storage that scale.

| Scheme | Keys moved when a node is added | Lookup | Notes |
|--------|-------------------------------|--------|-------|
| Consistent hashing (ring) | ~K/N (only the new node's arcs) | O(log(N·v)) binary search | needs virtual nodes for balance; supports weights via vnode counts |
| Rendezvous (HRW) hashing | ~K/N | O(N) per key (score every node) | no ring state; easy weights; good for small N |
| Jump consistent hash (Lamping & Veach) | ~K/N | O(log N), no memory | nodes must be numbered 0..N-1; only add/remove at the end |
| Maglev hashing | small, bounded disruption | O(1) table lookup | used in L4 load balancers |

Ring with virtual nodes:
```python
import bisect, hashlib

def h(s: str) -> int:
    return int.from_bytes(hashlib.blake2b(s.encode(), digest_size=8).digest(), "big")

class HashRing:
    def __init__(self, vnodes: int = 160):
        self.vnodes, self.points, self.owner = vnodes, [], {}

    def add(self, node: str) -> None:
        for i in range(self.vnodes):
            p = h(f"{node}#{i}")
            bisect.insort(self.points, p)
            self.owner[p] = node

    def remove(self, node: str) -> None:
        for i in range(self.vnodes):
            p = h(f"{node}#{i}")
            self.points.remove(p)
            del self.owner[p]

    def get(self, key: str) -> str:
        if not self.points:
            raise LookupError("ring is empty")
        i = bisect.bisect(self.points, h(key)) % len(self.points)   # first point clockwise
        return self.owner[self.points[i]]
```
- Without vnodes, one node's share of the ring varies widely (the largest arc is about ln N / N of the ring); with v vnodes per node the relative imbalance shrinks roughly like 1/√v — 100–200 vnodes per node is typical.
- Replication: walk clockwise to the next R distinct physical nodes (Dynamo/Cassandra style).
- Bounded-load variants cap any node at (1+ε)× average load for hot-key resilience.

## 2. Bloom Filter (membership, no false negatives)
- m bits, k hash functions, n inserted items. False-positive probability p ≈ (1 − e^(−kn/m))^k.
- Optimal k = (m/n)·ln 2; required bits m = −n·ln p / (ln 2)² ≈ 9.6 bits per item for 1%, 14.4 for 0.1%.
- Example: 10 million keys at 1% → m ≈ 95.9 Mbit ≈ 12 MB, k ≈ 7.
- Use: skip disk reads for absent keys (LSM-tree SSTables in RocksDB/Cassandra), CDN/cache admission, crawler "seen URL" sets.
- Cannot delete: use a counting Bloom filter (counters instead of bits) or a **cuckoo filter** (supports deletes, better space at low p).
- Implementation tip: derive k indexes from two hashes (Kirsch–Mitzenmacher: g_i = h1 + i·h2 mod m).

## 3. Count-Min Sketch (frequency)
- d rows × w counters; each item increments one counter per row; estimate = min over rows. Never underestimates; overestimates by at most ε·N with probability 1−δ when w = ⌈e/ε⌉, d = ⌈ln(1/δ)⌉.
- Use for heavy hitters / top-k (pair with a min-heap), rate of events per key in streams.

## 4. HyperLogLog (distinct count)
- m = 2^b registers storing the max leading-zero run of hashed items; standard error ≈ 1.04/√m. With m = 16384 (b = 14), ~0.81% error in ~12 KB (Redis `PFADD`/`PFCOUNT` uses this configuration).
- Mergeable: union of HLLs = register-wise max — great for daily/hourly unique users rolled up.

## 5. Merkle Trees (reconciliation)
Hash leaves (data blocks/key ranges), hash pairs upward to a root. Two replicas compare roots and descend only into differing subtrees — anti-entropy in Dynamo-style stores (Cassandra repair), Git, and certificate transparency logs. Cost: O(log n) hashes to locate each difference.

## 6. Geospatial Indexing
- Geohash: interleave latitude/longitude bits into a base-32 string; shared prefix ≈ nearby (but neighbours across cell edges have different prefixes — always query the 8 neighbouring cells).
- Alternatives: S2 cells (Google), H3 hexagons (Uber) with more uniform cell areas; PostGIS/R-trees inside databases.

## 7. Decision Table
| Question | Use |
|----------|-----|
| Which node owns this key, nodes change | consistent / rendezvous / jump hash |
| Is X possibly in the set? | Bloom filter (cuckoo if deletes) |
| How often has X occurred? | Count-Min Sketch |
| How many distinct X? | HyperLogLog |
| Which replicas disagree? | Merkle tree |
| What is near this point? | geohash / S2 / H3 / R-tree |

## 8. Anti-Patterns
- Modulo hashing for cache clusters that scale out.
- Using a cryptographic hash where speed matters and security does not (prefer xxHash/MurmurHash/BLAKE2/BLAKE3 by need; never MD5/SHA-1 where security matters).
- Bloom filters sized for today's n — p degrades quickly when n exceeds the design capacity; size for growth or use scalable Bloom filters.
- Treating sketch estimates as exact in billing or compliance paths.

## 9. Checklist
- [ ] Error bound and memory computed from the formulas, for projected n
- [ ] Hash function choice justified (speed, distribution, security)
- [ ] Rebalancing cost on node change quantified
- [ ] Sketches mergeable where data is sharded
