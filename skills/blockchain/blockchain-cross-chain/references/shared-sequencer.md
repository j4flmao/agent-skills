# Shared Sequencing

## Overview

Shared sequencing is a concept where multiple rollups (or execution environments) share a single sequencer set instead of each having its own sequencer. This enables atomic cross-chain composability, MEV internalization, and faster settlement.

## Why Shared Sequencing?

- **Atomic composability**: transactions across multiple rollups can be ordered atomically in the same block. A user can swap on Rollup A and deposit on Rollup B in the same atomic bundle.
- **MEV sharing**: sequencers capture MEV across domains and can distribute it back.
- **Unified UX**: users interact with one sequencer, not one per chain.
- **Lower latency**: no cross-chain message relay latency if both rollups share a sequencer that can reorder across both.

## Implementations

### Espresso Systems

- **Architecture**: Espresso provides a **shared sequencing layer** that rollups optionally subscribe to.
- **HotShot**: Espresso's BFT consensus protocol for ordering transactions. Uses **Tendermint-like PBFT** with **Diem's Jolteon (HotStuff-2)** improvements.
- **Light client**: Espresso's light client can be embedded in any chain (EVM, Solana, etc.) for verifying the sequencer's output.
- **Atomic bundles**: users submit bundles of transactions across multiple rollups. The Espresso sequencer guarantees atomic inclusion or rejection.
- **Integration**: rollups retain their own execution — Espresso only provides ordering. Rollups can fall back to their own sequencer if Espresso goes down.
- **Status**: testnet phase (as of 2025). Used by Caldera and other rollup-as-a-service providers.

### Astria

- **Architecture**: Astria is a **shared sequencer network** built on top of Celestia's data availability layer.
- **Sequencer**: a set of permissionless nodes that order transactions and post ordered blocks to Celestia.
- **Rollup integration**: rollups subscribe to Astria for transaction ordering. Astria produces an ordered list of transactions; each rollup executes them independently.
- **Atomic composability**: rollups sharing the Astria sequencer can atomically compose — a transaction on Rollup A that depends on Rollup B's state can be included in the same Astria block.
- **Sovereign rollup compatible**: works with Sovereign SDK rollups.
- **Key design choice**: the sequencer does not execute — it only orders. Execution is the rollup's responsibility. This keeps the sequencer minimal and fast.

### Radius

- **Architecture**: Radius is a shared sequencing and MEV mitigation layer.
- **PBS (Proposer-Builder Separation)**: Radius extends PBS principles to the shared sequencer setting. Builders construct blocks across multiple rollups; proposers select the best block.
- **MEV mitigation**: uses **payload timeouts** and **blind auctions** to reduce MEV extraction.
- **zk-rollup focused**: optimized for validity-proof rollups where execution is offloaded to the prover.
- **Atomic inclusion**: bundles spanning multiple zk-rollups are ordered atomically.

## Based Sequencing

Based sequencing is an alternative to shared sequencing where the **L1 proposer** (e.g., Ethereum proposer) also orders L2 transactions.

### How It Works

1. L2 users submit transactions to the **inbox** (a contract on L1).
2. The next L1 proposer includes L2 transactions from the inbox in their L1 block.
3. The L2 rollup executes these transactions in the order the L1 proposer includes them.
4. The L1 proposer receives L2 sequencing fees + MEV on top of L1 rewards.

### Based Sequencing: Pros

- **Trustless**: no separate sequencer set. Security inherits entirely from L1.
- **Censorship resistance**: anyone can force-include transactions on L1 via the inbox. No sequencer can censor.
- **Liveness**: if the L1 is live, the L2 is live. No additional sequencer set to fail.
- **Atomic composability with L1**: L1 and L2 transactions can be ordered together in the same L1 block.

### Based Sequencing: Cons

- **Latency**: L2 block time = L1 block time (~12s on Ethereum). Shared sequencers can offer sub-second latency.
- **MEV leakage**: L1 proposers capture L2 MEV, not the rollup.
- **Preconfirmations**: without a separate sequencer, users cannot get fast preconfirmation. Solutions like "based preconfirmations" (committing L1 proposers to include certain L2 txs) are being researched.

### Based vs Shared Comparison

| Feature | Based Sequencing | Shared Sequencer (Espresso) |
|---------|-----------------|-----------------------------|
| Trust model | Trustless (L1 consensus) | BFT sequencer set |
| Latency | ~12s (L1 block time) | Sub-second |
| Atomic composability | L1 ↔ L2 only | Cross-rollup only |
| Censorship resistance | High (L1 inbox) | Medium (sequencer set) |
| MEV capture | L1 proposer | Shared sequencer set |
| Preconfirmations | None (research ongoing) | Yes (from sequencer) |
| Liveness | L1-liveness | Additional sequencer liveness |

## Sequencing Latency vs Finality Tradeoffs

| Approach | Latency (block time) | Finality | Confidence Level |
|----------|---------------------|----------|------------------|
| Based (Ethereum L1) | 12s | ~12 min (Casper FFG) | Economic + probabilistic |
| Espresso (HotShot) | ~200ms | ~2s (BFT commit) | Immediate (BFT) |
| Astria (Celestia DA) | ~1s | ~5s (DA + BFT) | Data availability + consensus |
| Radius (PBS) | ~500ms | ~3s (BFT + proof) | ZK-proven |
| Optimistic rollup | <1s (sequencer) | ~7d (dispute) | Economic (fault proof) |

## Atomic Composability Across Domains

With shared sequencing, a single sequencer orders transactions from multiple rollups in one block. This enables:

- **Atomic swap** — swap USDC on Rollup A for ETH on Rollup B in a single bundle. Both succeed or both fail.
- **Cross-domain liquidation** — a liquidator can repay debt on Rollup A and seize collateral on Rollup B atomically.
- **Intent-based execution** — a user expresses an intent (e.g., "get best ETH price across Rollups A, B, C"). The shared sequencer fills it atomically.

### Open Problem: State Dependencies

Atomic composability across rollups is easy when the operations are independent (swap token A → token B). It becomes hard when they depend on shared state (e.g., a cross-rollup DEX with a single liquidity pool). Full shared execution (not just shared ordering) would be needed, which approaches a single monolithic chain.

## Key Tradeoffs

- **Centralization risk**: a shared sequencer introduces a new trust assumption. If the sequencer set is small, it may be able to censor or reorder.
- **Liveness dependency**: if the shared sequencer goes down, all connected rollups either halt (hard dependency) or fall back to their own sequencer (soft dependency).
- **Economic alignment**: who pays the sequencer? Users, rollups, or both? The fee market for shared sequencing is not yet settled.
- **Standardization**: no universal standard for shared sequencing exists. Each implementation has unique APIs and trust models.
