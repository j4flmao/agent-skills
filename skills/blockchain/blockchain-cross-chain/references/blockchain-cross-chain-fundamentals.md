# Blockchain Cross-Chain Fundamentals

## Core Concepts

### Cross-Chain Communication Models
- **Lock-Mint**: Lock tokens on source chain, mint representation on destination chain. Requires trust in the lock operator.
- **Burn-Mint**: Burn tokens on source chain, mint native tokens on destination. Used for canonical bridges.
- **Atomic Swap**: Trust-minimized exchange across chains using HTLCs. Requires both chains to support hashlock and timelock.
- **General Message Passing**: Arbitrary contract calls across chains. Enables cross-chain composability.

### Finality Divergence
Different blockchains have different finality guarantees:
- **Instant finality** (Cosmos, Solana): Blocks are final immediately upon creation
- **Probabilistic finality** (Ethereum, Bitcoin): Blocks are increasingly unlikely to be reorged over time
- Bridges must wait for sufficient confirmations on the source chain before acting on the destination

## Bridge Types

### Trusted Bridge
Centralized or multi-sig controlled. Fast and cheap but requires trust in the operators. Examples: Binance Bridge (formerly), Wormhole (guardian quorum).

### Light Client Bridge
The destination chain runs a light client of the source chain. Trust-minimized (only trust source chain consensus). Expensive to run (on-chain header verification). Example: IBC, Rainbow Bridge.

### Oracle Bridge
External oracles report events from source chain to destination. Moderate trust (in the oracle network). Examples: LayerZero, Axelar, CCIP.

### ZK Bridge
Zero-knowledge proof that a transaction occurred on source chain. Trustless (math replaces trust). Expensive (proving costs). Examples: zkBridge, Polyhedra.
