# DAG-Based Consensus

## DAG Fundamentals

Directed Acyclic Graphs replace linear chains by allowing multiple blocks to be produced in parallel. Each block references multiple parents, forming a DAG structure.

**Parallel Block Production:** Validators produce blocks concurrently. Blocks reference one or more previous blocks (tips), resulting in a DAG instead of a chain. This increases throughput since blocks aren't serialized.

**GHOST Rule (Greedy Heaviest Observed Sub-tree):** In a DAG, the canonical order is determined by counting the weight of sub-DAGs. At each fork, pick the subtree with the most cumulative weight. This differs from Nakamoto consensus (longest chain) by considering orphaned blocks as contributing to their parent's weight.

**Topological Ordering:** DAGs require a total order of blocks for smart contract execution. A topological sort produces a linearization where parent blocks precede children. Common approaches: 
- `tsort` (BFS/DFS topological sort)
- Consensus-based ordering via virtual voting
- Lamport timestamps + hash comparison as tiebreaker

```
Block A───Block B───Block D
    └──Block C───────┘
                     └──Block E
Ordering: A → B → C → D → E
```

## Avalanche Consensus

Avalanche is a family of protocols built on metastable consensus via repeated random subsampling.

**Core Mechanism:** Each node repeatedly samples `k` random validators and asks their preference. If a threshold (`α`) agrees, the node updates its own preference. After `β` consecutive rounds with the same preference, finality is reached.

**Snowball:** Nodes track a confidence counter per color. Each round, if `α` of `k` samples agree, increment that color's counter. Prefer the color with the highest counter. Finalize when counter exceeds `β`.

**Snowflake:** Like Snowball but adds a termination counter per round. Nodes finalize after `β` consecutive rounds where the sampled threshold agrees. Stronger safety guarantees than Snowball.

**Snowman:** Linear chain protocol for smart contracts built on Avalanche. Uses a DAG for the mempool (transactions) and a linear chain for block proposals (vertices). Validators propose blocks from the DAG via Snowball consensus on the preferred tip.

```
┌──────────────────────────────┐
│         DAG (mempool)        │
│  Tx1 ── Tx3 ── Tx5          │
│    └── Tx2 ── Tx4 ── Tx6    │
└──────────┬───────────────────┘
           │ Snowman consensus selects
           ▼
┌──────────────────────────────┐
│    Linear Chain (blocks)     │
│  B1 ── B2 ── B3 ── B4       │
└──────────────────────────────┘
```

**Metastability:** The protocol converges to a single decision even though each node initially sees different preferences. The probability of disagreement decays exponentially with rounds.

| Property | Value |
|----------|-------|
| Sample size (k) | 20 |
| Quorum size (α) | 15 |
| Rounds (β) | 20 |
| Finality | ~1-2s |
| Fault tolerance | ≤ 50% Byzantine |

### Avalanche Subnet Configuration

```yaml
# avalanche-subnet-config.json
{
  "proposalDuration": 10000000000,
  "maxBlockSize": 2097152,
  "maxValidators": 100,
  "consensusParameters": {
    "k": 20,
    "alpha": 15,
    "beta": 20,
    "betaVirtuous": 15,
    "concurrentRepolls": 4,
    "optimalProcessing": 100,
    "maxOutstandingItems": 1024,
    "maxTimeCorrelation": 0.2,
    "maxUptimeCorrelation": 0.5
  },
  "validators": {
    "delegationFee": 2,
    "minValidatorStake": 2000000000000000,
    "maxValidatorStake": 3000000000000000000,
    "minDelegationStake": 100000000000000,
    "minDelegationFee": 2,
    "uptimeRequirement": 0.8
  }
}
```

### Node Setup

```bash
#!/bin/bash
# Avalanche Node Setup Script
# Build and configure an Avalanche node

AVALANCHE_VERSION=v1.11.12
DATA_DIR=/data/avalanche
NETWORK_ID=fuji

wget https://github.com/ava-labs/avalanchego/releases/download/$AVALANCHE_VERSION/avalanchego-linux-amd64-$AVALANCHE_VERSION.tar.gz
tar -xzf avalanchego-linux-amd64-$AVALANCHE_VERSION.tar.gz
sudo cp avalanchego-$AVALANCHE_VERSION/avalanchego /usr/local/bin/

cat > /etc/systemd/system/avalanche.service <<EOF
[Unit]
Description=Avalanche Node
After=network.target

[Service]
User=avalanche
ExecStart=/usr/local/bin/avalanchego \\
  --network-id=$NETWORK_ID \\
  --data-dir=$DATA_DIR \\
  --http-host=0.0.0.0 \\
  --snow-sample-size=20 \\
  --snow-quorum-size=15 \\
  --snow-virtuous-commit-threshold=15 \\
  --snow-rogue-commit-threshold=20
Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable avalanche
systemctl start avalanche
```

## Hedera Hashgraph

Hashgraph uses a gossip-about-gossip protocol where nodes share not just transactions, but the history of who gossiped to whom.

**Gossip-about-Gossip:** Each node gossips two things when connecting to a peer:
1. New transactions/events
2. The hashgraph structure — who has received which events

This creates a complete historical record of communication. Every node can reconstruct the exact same event graph.

**Virtual Voting:** Instead of exchanging votes, each node independently calculates the vote outcome for every other node by simulating their perspective. This is deterministic because all nodes share the same event graph.

```
Event ──→ Event ──→ Event (famous witness)
  │         │         │
  └── Event ──→ Event ──→ Event
       (witness)    (famous)
```

**ABFT (Asynchronous Byzantine Fault Tolerance):** Hashgraph guarantees both safety and liveness under asynchronous network conditions. No assumption about message delivery time. BFT with 1/3 Byzantine tolerance.

**1-Second Finality:** After the gossip protocol propagates events, virtual voting reaches a consensus timestamp within ~1-3 seconds. Finality is probabilistic but practically immediate.

**Gossip Protocol:** Each node repeatedly chooses a random peer and syncs. They exchange the full event history they know. The receiving node creates a new event with the synced data and broadcasts it.

## Fantom Lachesis

Lachesis is the consensus mechanism powering the Fantom Opera chain. It's an aBFT DAG-based protocol.

**Event Blocks:** Each validator creates event blocks that contain:
- Transactions
- References to two "self-parent" and "other-parent" events (or more in extensions)
- Timestamps

**aBFT (Asynchronous BFT):** Like Hashgraph, Lachesis achieves finality under asynchronous conditions. Operates without a leader. Uses a probabilistic fork-choice rule.

**Opera Chain:** The Lachesis DAG feeds into the Opera execution layer. Event blocks are ordered via Lachesis and then executed by the EVM. This separates consensus from execution.

```go
// Lachesis Event Block Structure
type Event struct {
    Body struct {
        Transactions []Transaction
        Parents      EventHashSet // self-parent + other-parents
        Creator      ValidatorID
        Timestamp    UnixTime
        GasLimit     uint64
        GasUsed      uint64
    }
    Signature Signature
    Hash      EventHash
}

// FlagTable tracks voting weight for frame selection
type FlagTable map[ValidatorID]Weight

// Frame represents a consensus round
type Frame struct {
    Events    []EventHash
    FlagTable FlagTable
    Atropos   EventHash // consensus time stamp
}
```

**Lachesis Consensus Flow:**
1. Validators gossip event blocks
2. Events are grouped into frames (consensus rounds)
3. Each frame selects an Atropos (consensus-decided event) via flag table voting
4. Frames are finalized in topological order
5. Finalized events are applied to the Opera EVM state

## Nano Block-Lattice

Nano replaces the single global chain with a per-account blockchain.

**Each Account Has Its Own Chain:** Instead of a single ledger, every account maintains its own blockchain (account-chain). Only the account owner can write to their chain. This eliminates global contention.

**Send Blocks:** Debit an account. Contains: previous hash, balance after send, destination account, work proof.

**Receive Blocks:** Credit an account. References the send block. Contains: previous hash, balance after receipt, source send hash, work proof.

```
Account A Chain:    ┌─────┐   ┌─────┐   ┌─────┐
                    │Send │──→│Send │──→│Recv │...
                    └──┬──┘   └──┬──┘   └──┬──┘
                       │         │         │
Account B Chain:    ┌──▼──┐   ┌──▼──┐   ┌──▼──┐
                    │Recv │──→│Send │──→│Recv │...
                    └─────┘   └─────┘   └─────┘
```

**Open Representative Voting (ORV):** Instead of Proof of Work (legacy) or Proof of Stake, Nano uses ORV. Account holders vote for representatives. Representatives vote on transaction validity. Weight is proportional to delegated balance.

```json
{
  "sendBlock": {
    "type": "send",
    "previous": "8B2C3...",
    "balance": "1000000000000000000000000",
    "destination": "nano_1q3hq...",
    "work": "0000000000000000",
    "signature": "E3B0C44298FC1C149AFBF4C8..."
  },
  "receiveBlock": {
    "type": "receive",
    "previous": "8B2C3...",
    "source": "A1B2C...",
    "work": "0000000000000001",
    "signature": "A1B2C3D4E5F6..."
  }
}
```

## Comparison Table

| Protocol | Finality | Throughput | Security Model | Energy | Consensus Type |
|----------|----------|------------|----------------|--------|----------------|
| Avalanche | ~1-2s | ~4,500 TPS | Metastable, ≤50% Byzantine | Low (PoS) | Probabilistic |
| Hashgraph | ~1-3s | ~10,000+ TPS | ABFT, ≤33% Byzantine | Low (gossip) | Deterministic |
| Fantom | ~1-2s | ~10,000 TPS | aBFT, ≤33% Byzantine | Low (PoS) | Deterministic |
| Nano | ~0.5s | ~7,000 TPS | ORV, delegated vote | Minimal | Deterministic |
| Bitcoin | ~10-60m | ~7 TPS | Nakamoto PoW, ≤50% hash | Very high | Probabilistic |
| Ethereum | ~12-15s | ~15-30 TPS | Gasper PoS, ≤33% stake | Low (PoS) | Probabilistic |

**Security Model Notes:**
- Avalanche requires ≥50% Byzantine stake for safety failure; ≥33% for liveness failure
- Hashgraph and Fantom tolerate ≤33% Byzantine in asynchronous model
- Nano's ORV is secure as long as ≥50% of delegated weight is honest
- All DAG protocols are energy-efficient by design (no PoW)

## References

- Team Rocket et al. "Scalable and Probabilistic Leaderless BFT Consensus through Metastability." Avalanche whitepaper, 2019.
- Baird, Leemon. "The Swirlds Hashgraph Consensus Algorithm: Fair, Fast, Byzantine Fault Tolerance." Swirlds Tech Report, 2016.
- "Nano: A Feeless Distributed XRP-like Cryptocurrency Protocol." Nano whitepaper, 2017.
- "Lachesis: Asynchronous Byzantine Fault Tolerant Consensus." Fantom Foundation, 2021.
