---
name: blockchain-cross-chain
description: >
  Cross-chain protocols, IBC, LayerZero, Wormhole, Axelar, CCIP, bridges, atomic composability, shared sequencer, cross-chain message passing. Covers trust models (light clients, external validators, ZK proofs), bridge security, token representation (canonical, wrapped, native), relayer economics, and cross-chain application design. Do NOT use for: single-chain application development (use blockchain-application), general blockchain patterns (use blockchain-patterns), or core protocol design (use blockchain-core).
version: 1.1.0
author: j4flmao
license: MIT
tags: [blockchain, cross-chain, bridge, interoperability, phase-blockchain]
---

# Blockchain Cross-Chain

## Purpose
Guide cross-chain protocol selection, bridge architecture, and interoperability design. Covers all major cross-chain protocols with their trust models, security implications, and integration patterns.

## Agent Protocol

### Trigger Keywords
"cross-chain", "bridge", "IBC", "LayerZero", "Wormhole", "Axelar", "CCIP", "interop", "atomic swap", "shared sequencer", "cross-chain message", "wrapped token", "canonical bridge", "light client bridge", "GMP", "interchain", "multichain"

### Input Context
- Problem type (asset transfer/message passing/data query/atomic execution)
- Source and destination chains with finality models
- Security requirements (trust minimization, audit level, value secured)
- Performance needs (latency, throughput, cost budget)
- Existing infrastructure (current bridge usage, token standards)

### Output Artifact
Cross-chain architecture specification: protocol selection, trust model, fee model, security analysis, implementation plan.

### Response Format
```
## Cross-Chain Analysis

**Protocol**: <IBC | LayerZero | Wormhole | Axelar | CCIP | ZK-Bridge | Custom>

**Source Chain**: <chain + finality model>
**Destination Chain**: <chain + finality model>

**Mechanism**:
- <transport layer: light client / oracle / guardian / DON / ZK proof>
- <message delivery: relayer / executor / keeper>
- <security: verification type + trust assumptions>

**Considerations**:
- <finality mismatch> | <token representation> | <fee model> | <failure handling>

**Recommendation**:
- <contract changes, relayer setup, timeout config, rate limit, pause mechanism>
```

### Completion Criteria
- Protocol selection justified against alternatives with trust model comparison
- Finality divergence modeled with confirmation depth specification
- Fee model covers relayer economics on both sides
- Failure modes documented: timeouts, reorgs, rate limits, paused state
- Security analysis identifies bridge-specific attack vectors

### Max Response Length
4000 tokens

## Decision Trees

### Cross-Chain Protocol Selection
```
Cross-chain problem:
├── Asset transfer between chains?
│   ├── Same ecosystem (Cosmos IBC, ETH L1↔L2)?
│   │   ├── YES → Native bridge (IBC for Cosmos, canonical for L2)
│   │   └── NO → External bridge
│   │       ├── Maximum security → ZK-bridge (trustless, slow, expensive)
│   │       ├── Balanced → Light client bridge (trustless, complex to deploy)
│   │       └── Fast + flexible → External validator bridge (trusted, fast)
├── Generalized message passing?
│   ├── IBC-enabled chains → IBC (light client, trustless)
│   ├── EVM chains → LayerZero, CCIP, or Axelar
│   │   ├── Configurable security → LayerZero (oracle + relayer choice)
│   │   ├── Decentralized oracle network → CCIP (DON + ARM)
│   │   └── Cross-chain execution → Axelar GMP (gas service)
│   └── Solana + EVM → Wormhole (guardian quorum)
├── Data query across chains?
│   ├── On-demand → Oracle bridge (Chainlink CCIP)
│   └── Streaming → Event indexing + relayer
└── Atomic execution across chains?
    ├── Same sequencer → Shared sequencer (Espresso, Astria)
    └── Different sequencers → Atomic commit protocol (two-phase commit with timeouts)
```

### Trust Model Comparison
```
Bridge type:
├── Light client bridge (IBC, Rainbow)
│   ├── Trust: Source chain consensus rules (1 trust assumption)
│   ├── Security: Validator set of source chain
│   ├── Latency: Finality time of source chain
│   ├── Cost: High (on-chain header verification, ~500K gas per header)
│   └── Best for: High-value, security-critical transfers
├── External validator bridge (Wormhole, Multichain)
│   ├── Trust: Validator set of bridge protocol (N-of-M multi-sig)
│   ├── Security: Slashing conditions, economic security of bridge token
│   ├── Latency: Fast (after validator confirmation, ~seconds)
│   ├── Cost: Low (signature verification)
│   └── Best for: Fast, frequent transfers with accepted trust tradeoff
├── Oracle + relayer (LayerZero)
│   ├── Trust: Oracle does not collude with relayer
│   ├── Security: 2-of-2 model (Oracle + Relayer independent)
│   ├── Latency: Configurable (confirmations per chain)
│   ├── Cost: Medium (block header verification + tx proof)
│   └── Best for: Flexible cross-chain messaging
├── DON + ARM (CCIP)
│   ├── Trust: Chainlink DON + ARM (risk management network)
│   ├── Security: Redundant DON verification + ARM circuit breaker
│   ├── Latency: ~minutes (DON consensus)
│   ├── Cost: Medium (DON computation)
│   └── Best for: Enterprise, regulated (built-in rate limits, pause)
└── ZK-bridge (zkBridge, Polyhedra)
    ├── Trust: None (mathematical verification)
    ├── Security: Proof system security (Groth16, PLONK)
    ├── Latency: Slow (proving time minutes-hours)
    ├── Cost: High (proof verification on destination)
    └── Best for: Maximum security, large batched transfers
```

## Bridge Security

### Common Attack Vectors
| Attack | Description | Mitigation |
|---|---|---|
| Validator compromise | Bridge validators collude to sign fraudulent message | Distributed validator set, slashing, threshold signatures |
| Replay attack | Same message replayed on different chains/destinations | Nonce + chain ID + contract address in message |
| Reorg exploit | Chain reorganization invalidates source chain confirmation | Wait for finality (or risk threshold confirmations) |
| Smart contract bug | Bridge contract vulnerability (reentrancy, access control) | Audits, formal verification, bug bounties |
| Oracle manipulation | Price feed manipulation during bridge operation | Redundant oracles, TWAP pricing |
| Griefing | Relayer stops processing messages | Permissionless relayer set, economic incentives |
| MEV extraction | Sandwiching bridge transactions | Commit-reveal, slippage protection |

### Message Format Security
```solidity
// Secure cross-chain message format
struct CrossChainMessage {
    uint256 sourceChainId;      // Prevent replay across forks
    uint256 destinationChainId; // Prevent misrouting
    address sourceContract;     // Verify sender
    address targetContract;     // Ensure correct recipient
    uint256 nonce;              // Prevent replay on same chain
    uint256 deadline;           // Prevent time-dilated execution
    bytes payload;              // Encoded function call
    bytes32 sourceHash;         // Bind to source transaction
}
```

## Implementation Patterns

### IBC (Inter-Blockchain Communication)
```go
// IBC packet flow: source chain → relayer → destination chain
// 1. Source app calls IBC core to send packet
// 2. IBC core stores commitment in state
// 3. Relayer observes commitment, submits to destination
// 4. Destination IBC core validates light client proof
// 5. Destination app receives packet via OnRecvPacket callback

type Packet struct {
    Sequence           uint64
    SourcePort         string
    SourceChannel      string
    DestinationPort    string
    DestinationChannel string
    Data               []byte
    TimeoutHeight      Height
    TimeoutTimestamp   uint64
}
```

### LayerZero ULN (Ultra Light Node)
```solidity
// LayerZero message flow
// 1. User sends message with fees for oracle + relayer
// 2. Oracle submits block hash to destination (BlockHeaderStore)
// 3. Relayer submits transaction proof + payload
// 4. Destination validates: block hash matches oracle, proof matches relayer

function lzReceive(
    uint16 _srcChainId,
    bytes calldata _srcAddress,
    uint64 _nonce,
    bytes calldata _payload
) external {
    // Validate oracle and relayer independently confirmed
    require(oracleConfirmed[_srcChainId][_nonce], "oracle not confirmed");
    require(relayerConfirmed[_srcChainId][_nonce], "relayer not confirmed");
    _executeMessage(_srcChainId, _srcAddress, _payload);
}
```

### Token Representation Patterns
| Pattern | Description | Example |
|---|---|---|
| Canonical | Native bridge (L1 → L2 standard bridge) | Arbitrum/OP canonical bridge |
| Wrapped | Mint-burn on destination (locked on source) | wBTC, wETH |
| Synthetic | Minted on destination, backed by collateral | stETH on L2 |
| Native | Deployed natively on both chains | USDC on multiple chains |

## Rules
1. **Identify the cross-chain problem first**: asset transfer, message passing, data query, or atomic execution determines protocol choice
2. **Match trust model to risk tolerance**: IBC (light client, trustless) > ZK-bridge (trustless, expensive) > CCIP (DON+ARM) > LayerZero (2-of-2) > Wormhole (guardian quorum)
3. **Prefer GMP over custom bridges**: Generalized message passing (Axelar, LayerZero, CCIP) enables arbitrary contract calls
4. **Account for finality divergence**: Probabilistic (ETH) vs instant (Cosmos, Solana) affects security and latency
5. **Model relayer economics**: Relayers pay source gas, earn on destination. Incentives must cover liveness costs
6. **Design for failure modes, not just happy path**: timeouts, reorgs, rate limits, paused ARM, guardian changes, replay protection
7. **Always implement rate limiting**: Prevents single-exploit loss of entire bridge TVL
8. **Use tiered security**: Low-value messages (fast, cheap), high-value messages (slow, secure)
9. **Handle token representation correctly**: Understand canonical vs wrapped vs synthetic implications
10. **Monitor bridge health**: Relayer uptime, pending message queue, timeout expiry, rate limit proximity

## References
  - references/atomic-composability.md — Atomic Composability Across Chains
  - references/blockchain-cross-chain-advanced.md — Blockchain Cross Chain Advanced Topics
  - references/blockchain-cross-chain-fundamentals.md — Blockchain Cross Chain Fundamentals
  - references/bridge-incident-response.md — Bridge Incident Response
  - references/bridge-monitoring-alerting.md — Bridge Monitoring and Alerting
  - references/bridge-security.md — Bridge Security
  - references/ccip-chainlink.md — Chainlink CCIP (Cross-Chain Interoperability Protocol)
  - references/ibc-deep.md — IBC (Inter-Blockchain Communication) Deep Dive
  - references/layerzero-wormhole.md — LayerZero, Wormhole, Axelar
  - references/message-replay-protection.md — Message Replay Protection
  - references/shared-sequencer.md — Shared Sequencing
  - references/cross-chain-token-representation.md — Cross-Chain Token Standards & Representation

## Phase: blockchain → blockchain-cross-chain
