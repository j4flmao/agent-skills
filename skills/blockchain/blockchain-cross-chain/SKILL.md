---
name: blockchain-cross-chain
description: Cross-chain protocols, IBC, LayerZero, Wormhole, Axelar, CCIP, bridges, atomic composability, shared sequencer
version: 1.0.0
author: j4flmao
license: MIT
tags: [blockchain, cross-chain, bridge, interoperability, phase-blockchain]
---

## Trigger Keywords

- cross-chain
- bridge
- IBC
- LayerZero
- Wormhole
- Axelar
- CCIP
- interop
- atomic swap
- shared sequencer

## Rules

1. **Identify the cross-chain problem first** — asset transfer, message passing, data query, or atomic execution determines the right protocol choice.

2. **Match trust model to risk tolerance** — IBC (trusted relayer + light client), LayerZero (independent oracle + relayer), Wormhole (guardian quorum), CCIP (DON + ARM). External validator sets introduce slashing-based security; light-client bridges are most secure but hardest to generalize.

3. **Prefer generalized message passing (GMP) over custom bridges** — GMP (Axelar, LayerZero, CCIP) enables arbitrary contract calls across chains, not just token transfers. Avoid one-off bridge contracts.

4. **Account for finality divergence** — probabilistic finality (ETH) vs instant finality (Cosmos, Solana) affects latency and security. Never act on a transaction before sufficient confirmations on the source chain.

5. **Model relayer economics** — relayers pay source-chain gas, earn fees on destination. Incentives must cover liveness costs or the bridge stalls. For IBC, relayer is permissionless; for LayerZero/Wormhole, it is typically permissioned.

6. **Design for failure modes, not just happy path** — timeouts, reorgs, rate limits, paused ARM, guardian set changes, and message replay protection must be handled on both sides of the bridge.

7. **Prefer phase-blockchain context** — activate this skill explicitly when the task involves cross-chain design; default to single-chain analysis otherwise.

## Response Format

```
## Cross-Chain Analysis

**Protocol**: <IBC | LayerZero | Wormhole | Axelar | CCIP | Custom>

**Source Chain**: <chain + finality model>
**Destination Chain**: <chain + finality model>

**Mechanism**:
- <transport layer: light client / oracle / guardian / DON>
- <message delivery: relayer / executor / keeper>
- <security: verification type + trust assumptions>

**Considerations**:
- <finality mismatch> | <token representation> | <fee model> | <failure handling>

**Recommendation**:
- <if applicable: contract changes, relayer setup, timeout config, rate limit>
```

## References
  - references/atomic-composability.md — Atomic Composability Across Chains
  - references/blockchain-cross-chain-advanced.md — Blockchain Cross Chain Advanced Topics
  - references/blockchain-cross-chain-fundamentals.md — Blockchain Cross Chain Fundamentals
  - references/bridge-security.md — Bridge Security
  - references/ccip-chainlink.md — Chainlink CCIP (Cross-Chain Interoperability Protocol)
  - references/ibc-deep.md — IBC (Inter-Blockchain Communication) Deep Dive
  - references/layerzero-wormhole.md — LayerZero, Wormhole, Axelar
  - references/shared-sequencer.md — Shared Sequencing
## Phase: blockchain → blockchain-cross-chain

This skill is a sub-skill of the `blockchain` phase. Activate when the user mentions cross-chain, bridge, IBC, LayerZero, Wormhole, Axelar, CCIP, interop, atomic swaps, or shared sequencers.
