# P2P Networking for Blockchain

## Node Discovery

### Bitcoin Discovery (Addr + DNS Seeds)

```cpp
// C++ — Bitcoin Core peer discovery
class PeerManager {
    std::vector<CAddress> GetAddrFromSeeds() {
        std::vector<CAddress> addresses;
        for (const auto& seed : dnsSeeds) {
            auto resolved = resolveDNSSeed(seed);
            for (const auto& addr : resolved) {
                addresses.push_back(CAddress(addr, NODE_NETWORK));
            }
        }
        return addresses;
    }

    void ProcessAddrMessage(CNode* peer, const std::vector<CAddress>& addrs) {
        for (const auto& addr : addrs) {
            if (addr.IsRoutable() && !addressManager.Contains(addr)) {
                addressManager.Add(addr, peer->addr);
            }
        }
    }
};
```

### Ethereum Discv5 (Node Discovery v5)

- **Protocol**: Kademlia DHT with UDP
- **Identity**: secp256k1 public key as node ID
- **Distance**: XOR metric (log2 distance)
- **Message types**: PING, PONG, FINDNODE, NEIGHBORS, ENR

```go
// Go — go-ethereum discv5
type Table struct {
    buckets [17]*bucket  // 256-bit keyspace, 17 buckets
    self    *Node         // local node record
    db      *enode.DB     // persistent node storage
}

func (t *Table) Lookup(targetID enode.ID) []*Node {
    // Returns k closest nodes using iterative Kademlia lookup
    return t.closest(targetID, bucketSize)
}
```

### Solana Cluster Discovery

```
Gossip protocol (push-pull):
1. New node sends PING to seed nodes
2. Seed returns its table of known validators
3. Node pushes its own contact info
4. Periodic PULL from random peers to sync tables
```

## Gossip Protocols

### Bitcoin Inventory Gossip

```
1. New transaction/block → INV message (txid/hash)
2. Peer checks if they already have it
3. If not → GETDATA request
4. Responder sends full data → BLOCK/TX message
```

```cpp
// C++ — Bitcoin Core inv relay
void PeerManager::HandleInv(CNode* peer, const std::vector<CInv>& invs) {
    std::vector<CInv> requests;
    for (const auto& inv : invs) {
        if (inv.type == MSG_TX && !mempool.exists(inv.hash))
            requests.push_back(inv);
        if (inv.type == MSG_BLOCK && !blockIndex.Contains(inv.hash))
            requests.push_back(inv);
    }
    if (!requests.empty())
        peer->SendMessage("getdata", requests);
}
```

### Ethereum DevP2P

- **RLPx**: Encrypted, authenticated TCP transport
- **Framing**: 16 KB frames, snappy compression
- **Sub-protocols**: eth (blockchain), snap (state sync), les (light)

```
Peer A                          Peer B
  │                                │
  │───── Hello (capabilities) ────>│
  │<──── Hello (capabilities) ─────│
  │───── Status (TD, hash, genesis)─>│
  │<──── Status ──────────────────│
  │───── BlockHeaders (sync) ────>│
  │<──── BlockBodies ────────────│
```

```go
// Go — DevP2P protocol handler
func (p *Peer) HandleMessage(msg *Message) error {
    switch msg.Code {
    case TransactionMsg:
        var txs []*Transaction
        if err := msg.Decode(&txs); err != nil { return err }
        for _, tx := range txs {
            p.txpool.Add(tx) // validate and broadcast
        }
    case BlockHeadersMsg:
        var headers []*Header
        if err := msg.Decode(&headers); err != nil { return err }
        p.downloader.DeliverHeaders(headers)
    }
    return nil
}
```

### Solana Turbine (Block Propagation)

```
Validator ──> 4 peers ──> 4 peers each ──> ... → O(log N) propagation
Block split into 64-byte fragments, erasure coded
Each peer responsible for forwarding specific fragments
```

```rust
// Rust — Solana turbine
struct Turbine {
    shred_version: u16,
    tree: WeightedPeers,  // tree structure for propagation
}

impl Turbine {
    fn propagate_block(&self, block: Vec<Shred>) {
        // 1. Erasure code shreds into FEC blocks
        let (data_shreds, coding_shreds) = erasure_encode(&block, &self.config);
        // 2. Send each peer subset of shreds
        for (peer, shreds) in self.tree.assign_peers(data_shreds) {
            self.transport.send(peer, shreds);
        }
    }
}
```

## Sync Strategies

### Full Sync (Bitcoin Core)

- **IBD (Initial Block Download)**: Download all blocks sequentially
- **Headers-first**: Download headers tree first, then fill blocks
- **Checkpoints**: Known-good block hashes to skip historical validation

### Fast Sync (Geth)

- **Snap sync**: Download state trie snapshots, heal with proofs
- **1. Download headers → 2. Download state snapshot → 3. Download recent blocks → 4. Full sync tail**

```go
// Go — geth snap sync
func (s *Syncer) SyncSnap(peer *Peer, root common.Hash) error {
    // Request flat account trie range
    accounts, err := peer.RequestAccountRange(root, 0, maxRange)
    if err != nil { return err }
    // Verify each account has merkle proof
    for _, acc := range accounts {
        if !s.VerifyAccountProof(root, acc) {
            return ErrBadProof
        }
    }
    return nil
}
```

### Solana Snapshot

- **Bank snapshots**: Full state snapshots every N slots
- **Incremental snapshots**: Diff-based between full snapshots
- **Download**: HTTP (faster) + gossip repair for missing slots

## Mempool & Transaction Relay

### Bitcoin Mempool

```cpp
// C++ — Bitcoin mempool
class CTxMemPool {
    std::map<uint256, CTxMemPoolEntry> mapTx; // all txs
    std::map<COutPoint, uint256> mapNextTx;   // UTXO → spend tx

    bool addUnchecked(const uint256& hash, const CTxMemPoolEntry& entry) {
        mapTx[hash] = entry;
        // Track UTXO consumption
        for (const auto& txin : entry.GetTx().vin)
            mapNextTx[txin.prevout] = hash;
        // Update descendant limits for CPFP
        UpdateAncestors(entry, 25, 100000); // limits
        return true;
    }
};
```

### Replacement Policies

| Policy | Bitcoin (RBF) | Ethereum | Solana |
|--------|--------------|----------|--------|
| Replacement rule | Higher fee rate, same inputs | Higher nonce, same account | Last CU-price wins |
| Fee bump | Replace-by-fee (opt-in) | Same-nonce replacement | Prioritization fee |
| Cancellation | RBF with 0 output | Send 0 ETH to self with higher gas | N/A (no mempool in same sense) |

## Network Security

### Eclipse Attack Protection

```cpp
// C++ — Bitcoin Core eviction
static constexpr int MAX_CONNECTIONS = 125;
static constexpr int MAX_OUTBOUND = 10;
static constexpr int MAX_FEELER = 1;

bool Node::IsAllowedPeer(const CAddress& addr) {
    // Ban private IP ranges in public networks
    if (addr.IsRFC1918() && !fDiscover) return false;
    // Prefer diverse /16 subnets
    return addrCount[addr.GetGroup()] < MAX_CONNECTIONS_PER_GROUP;
}
```

### Sybil Resistance

- **Proof-of-work**: Cost to create identities
- **Proof-of-stake**: Bonded stake, slashing for equivocation
- **Identity**: Peer scoring, trusted seed nodes (Bitcoin)
- **Reputation**: Longevity, past behavior, stake weight
