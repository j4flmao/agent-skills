# Atomic Composability Across Chains

## Overview

Atomic composability is the ability to execute multiple operations across different blockchains as a single atomic unit — either all operations succeed or none do. This is a fundamental challenge when moving from single-chain to multi-chain architectures.

## Composable vs Non-Composable

| Property | Single Chain | Cross-Chain (Non-Atomic) | Cross-Chain (Atomic) |
|----------|-------------|------------------------|----------------------|
| Execution | Synchronous | Asynchronous | Synchronous (via sequencer/intents) |
| Failure | Revert if one step fails | One step can succeed while another fails | All revert or all succeed |
| Latency | Block time | Block time × N chains | Block time (shared sequencer) or intent settlement |
| Complexity | Low | Medium (handle partial failures) | High (revert propagation) |

## Atomic Swaps (HTLC)

### Hash Time-Locked Contracts (HTLC)

HTLC is the classic cross-chain atomic swap mechanism. Used in Lightning Network, atomic cross-chain DEXs.

**Flow**:
1. Alice generates a secret `s` and sends `hash(s)` to Bob.
2. Alice locks her tokens on Chain A with a contract: "Anyone can claim if they provide `s` before time `t1`".
3. Bob locks his tokens on Chain B with a contract: "Anyone can claim if they provide `s` before time `t2`".
4. Alice claims Bob's tokens on Chain B by revealing `s`.
5. Bob sees `s` on Chain B (or Alice reveals it directly) and claims Alice's tokens on Chain A.
6. If either party fails, both contracts expire and tokens are refunded.

**Limitations**:
- Only works for two-party swaps of simple assets (no complex contract calls).
- Needs both chains to support HTLC (hash functions, timelocks).
- Can be front-run if the contracts are not carefully designed.
- Not composable with DeFi — you cannot execute a swap-into-lending-flow atomically with HTLC.

## Multi-Chain Intents

Intent-based architectures let users state **what** they want (e.g., "swap 100 USDC on Ethereum for at least 99 USDC on Arbitrum") and let solvers compete to fulfill it.

### ERC-7683: Cross-Chain Intents

- **EIP-7683** (proposed, 2024) defines a standard for cross-chain intents.
- **Key components**:
  - `CrossChainOrder` — a struct defining the order (source chain, destination chain, caller, settlement data).
  - `ISettlementContract` — a contract that resolves orders on the destination chain.
  - `Open` / `Filled` / `Cancelled` order states.
- **Solvers** (fillers) submit a `resolve()` transaction on the destination chain.
- Intents can be combined: solver aggregates fills across chains.
- Standard covers ERC-20 and native token swaps.

### Example: UniswapX (Cross-Chain)

- UniswapX extends its RFQ-based swapping to cross-chain.
- A user signs an intent: "Swap X on Chain A for Y on Chain B".
- Fillers (market makers) compete to execute the swap.
- Filler posts a bond; if they fail to deliver on one side, the bond is slashed.
- The user's tokens on Chain A are locked in a contract; the filler must deliver tokens on Chain B within a deadline.
- Atomicity is enforced by the bond mechanism rather than atomic execution.

## Cross-Chain DEX Aggregation

DEX aggregators (1inch, Li.Fi, Squid Router) bundle cross-chain swaps via bridge protocols into a single user transaction.

- **Flow**:
  1. User calls `swap(amountIn, chainIn, tokenIn, chainOut, tokenOut)`.
  2. Aggregator selects the optimal route: swap on source chain → bridge → swap on destination.
  3. The user signs one transaction; the aggregator handles the rest.
- **Atomicity**: most aggregators do **not** guarantee atomicity — if the bridge fails, the user may end up with tokens stuck on the source chain or in the bridge. Some aggregators add a "retry" or "revert" mechanism.
- **Callbacks**: Li.Fi and Squid use **diamond routing** — the aggregator calls a receiver contract that can perform additional logic after the bridge completes.

## Interoperability Standards

### xERC-20 (ERC-7281)

xERC-20 is a standard for cross-chain tokens that can be managed by multiple bridge providers.

- **Lockbox**: the canonical token contract on the canonical chain (e.g., Ethereum).
- **XERC-20**: a mintable/burnable token on other chains.
- **Bridge limits**: per-bridge mint/burn limits to prevent any single bridge from minting arbitrarily.
- **Rate limiting**: each bridge has a rate limit — if a bridge is compromised, the maximum damage is bounded.
- **Governance**: the token issuer can add/remove bridges and adjust limits.

**Benefits**:
- Multiple bridges can support the same canonical token.
- If one bridge is hacked, the damage is limited to that bridge's rate limit.
- Users can choose the bridge with the best security/latency/fee tradeoff for each transfer.

**Example**: Chainlink's CCIP and Wormhole can both support the same USDC via xERC-20.

### ERC-5169 / Token Bound Accounts (ERC-6551)

Not strictly cross-chain, but enables cross-chain NFT composability: an NFT can own assets on multiple chains via a TBA (Token Bound Account). TBAs can have addresses on other chains if cross-chain messaging is integrated.

## Comparison of Composability Models

| Model | Atomicity | Latency | Complexity | Use Case |
|-------|-----------|---------|------------|----------|
| HTLC (Atomic Swap) | Yes (2-phase) | Minutes | Low | Simple P2P swap |
| Shared Sequencer | Yes (single block) | Sub-second | High | Cross-rollup DeFi |
| Intent-based (ERC-7683) | Economic (bond) | Seconds | Medium | Swaps, limit orders |
| Aggregator (non-atomic) | No | Variable | Medium | General cross-chain tx |
| IBC General Message | No (unordered) or ordered retry | 2–15s | Medium | Cosmos app-chains |
| GMP (Axelar/LayerZero) | No (separate calls) | 5s–5min | Low-Medium | Arbitrary messaging |
| Multi-bridge (xERC-20) | No (bridge per transfer) | Per bridge | Low | Token transfers |

## Achieving Atomicity in Practice

### Method 1: Shared Sequencer

Both rollups share a sequencer. The sequencer includes transactions from both rollups in the same ordered sequence. If the first transaction fails, the second is never executed. This is the highest level of atomic composability.

**Real-world**: Espresso, Astria (see [shared-sequencer.md](./shared-sequencer.md)).

### Method 2: Solver-Economic Atomicity

A solver posts a bond. The solver is incentivized to make both sides of a cross-chain operation succeed, because failing one side causes their bond to be slashed. This is economic, not cryptographic atomicity.

**Real-world**: UniswapX, ERC-7683.

### Method 3: Atomic Batch via Bridge

Some bridges (like Axelar's `callContractWithToken`) bundle token transfer + contract call into a single bridge message. On the destination, if the contract call fails, the token transfer can be configured to revert too (using a callback from the receiver).

**Real-world**: Axelar GMP, CCIP Programmable Token Transfer.

### Method 4: Two-Phase Commit

A coordinator (could be a smart contract or off-chain relayer) manages a two-phase commit protocol:
1. Phase 1: lock assets on Chain A.
2. Phase 2: execute on Chain B.
3. If Phase 2 fails → unlock Phase 1.

**Real-world**: Rare in production due to the need for a trusted coordinator and the "locking" problem.

## Open Problems

1. **Revert propagation**: if a cross-chain atomic bundle fails on one chain, how does the revert propagate to the other chains? This is straightforward with a shared sequencer but hard with async bridges.

2. **State pinning**: atomic composability across chains requires knowing the state of both chains at the same instant. Shared sequencers solve this; async bridges cannot.

3. **Capital efficiency**: atomicity typically requires locking capital (HTLC, bonds). Reducing locked capital while preserving atomicity is an open challenge.

4. **MEV extraction**: atomic bundles are highly valuable — a shared sequencer that sees both legs of a cross-chain bundle can extract maximum MEV. Preventing sequencer exploitation is an active research area.
