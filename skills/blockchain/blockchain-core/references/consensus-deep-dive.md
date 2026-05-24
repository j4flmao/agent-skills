# Consensus Mechanisms Deep Dive

## Nakamoto Consensus (Bitcoin)

```
Node ──(validate tx)──> Mempool ──(mine block)──> Broadcast ──> Other nodes
                                                              │
                                              ┌──────────────┴──────────────┐
                                              ▼                            ▼
                                        Accept longest            Reject / orphan
```

- **Mechanism**: Proof-of-Work, longest chain rule, probabilistic finality
- **Finality**: ~6 blocks (~60 min for Bitcoin) for high confidence
- **Security**: >51% hash power to overtake, cost-prohibitive at scale
- **Throughput**: 7 tps (Bitcoin), 15-30 tps (pre-merge Ethereum)
- **Energy**: High — SHA-256 ASIC mining

### C++ Implementation Pattern (Bitcoin Core style)

```cpp
class Consensus {
  bool ValidateBlock(const Block& block, const ChainState& state) {
    // 1. Verify block header hash meets target
    if (!CheckProofOfWork(block.header(), state.Bits())) return false;
    // 2. Validate all transactions
    for (const auto& tx : block.transactions()) {
      if (!ValidateTransaction(tx, state)) return false;
    }
    // 3. Check against fork choice rule
    return state.TotalWork(block) > state.TotalWork(state.BestBlock());
  }
};
```

## Gasper (Ethereum PoS — Post-Merge)

- **Consensus**: Casper FFG finality + LMD-GHOST fork choice
- **Finality**: ~12.8 min (two epochs), economic finality after finalization
- **Security**: >1/3 stake to stall, >2/3 to finalize maliciously, slashing for equivocation
- **Throughput**: ~100 ktps (execution + blob space with EIP-4844)
- **Energy**: Near-zero (proof-of-stake)

### Go Implementation Pattern (go-ethereum / prysm style)

```go
func ValidateBlock(state *State, block *BeaconBlock) error {
    // Verify attestations from validators
    if err := VerifyAttestations(block.Body.Attestations, state); err != nil {
        return fmt.Errorf("invalid attestations: %w", err)
    }
    // Apply fork choice rule (LMD-GHOST)
    head := state.Head()
    for _, block := range GetDescendants(head) {
        if block.Slot > head.Slot {
            head = block // heaviest observed
        }
    }
    return nil
}
```

## Practical Byzantine Fault Tolerance (PBFT)

Used in Hyperledger Fabric, Zilliqa, NEO.

- **Phases**: Pre-Prepare → Prepare → Commit → Execute
- **Finality**: Instant (no forks in same view)
- **Fault Tolerance**: n = 3f + 1 nodes (f = faulty)
- **Throughput**: Thousands tps, low latency
- **Communication**: O(n²) messages per round

```
Client ──Request──> Primary ──PrePrepare──> Replicas
                    │                        │
                    │<───────Prepare─────────│
                    │<───────Commit──────────│
                    │                        │
                    └───────Reply────────────┘
```

## Delegated Proof of Stake (DPoS)

Used in EOS, TRON, BitShares, Cosmos (with modifications).

- **Mechanism**: Token holders vote for block producers (21-100 validators)
- **Finality**: Near-instant (2-3 seconds blocks)
- **Throughput**: Thousands tps
- **Trade-off**: More centralized, but faster and more scalable

## HotStuff / LibraBFT

Facebook Diem/Libra BFT, used in Aptos, Sui.

- **Mechanism**: Chained BFT with threshold signatures, linear communication
- **Finality**: 3-chain confirmation (3 network rounds)
- **Throughput**: >100k tps (theoretical), low latency
- **Implementation**: Rust (Diem/Aptos core)

## Consensus Comparison

| Property | Nakamoto (PoW) | Gasper (PoS) | PBFT | DPoS | HotStuff |
|----------|---------------|--------------|------|------|----------|
| Finality | Probabilistic | Economic | Absolute | Absolute | Absolute |
| Finality time | ~60 min | ~12.8 min | ~5 sec | ~3 sec | ~3 sec |
| Fault tolerance | <50% hash | <33% stake | <33% nodes | <50% producers | <33% nodes |
| Scalability | Low | Medium | Medium | High | High |
| Energy | Very high | Low | Low | Low | Low |
| Best for | Permissionless | Permissionless | Permissioned | Permissionless | Permissionless |

## Fork Choice Rules

### Longest Chain (Bitcoin)
```go
func ForkChoice(head Block, candidates []Block) Block {
    best := head
    for _, c := range candidates {
        if c.TotalWork() > best.TotalWork() {
            best = c
        }
    }
    return best
}
```

### GHOST (Ethereum pre-merge)
Weigh subtrees, not just chain length — favors faster confirmation.

### LMD-GHOST (Ethereum PoS)
Latest Message Driven GHOST — validators attest to head, weight accumulated by latest votes.

## Slashing Conditions

Proof-of-stake penalty mechanisms:

| Violation | Penalty | Severity |
|-----------|---------|----------|
| Double vote (equivocation) | Slash | Full penalty (up to 32 ETH) |
| Surround vote | Slash | Full penalty |
| Inactivity leak | Gradual | Partial (until liveness restored) |
| Unavailable validator | Small penalty | Per epoch |
