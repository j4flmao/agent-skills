# Blockchain Application Advanced Topics

## Multi-Chain Contract Architecture

### Abstract Core Pattern
Separate business logic from chain-specific adapters. Core contracts define interfaces and data structures. Adapter contracts implement chain-specific storage, fee models, and cross-chain communication.

### CREATE2 Deterministic Deployment
Deploy contracts at the same address across all EVM chains using CREATE2 with a deterministic salt. Same deployer address + same salt + same init code = same contract address. This simplifies multi-chain management — proxy admin is the same address everywhere.

### Cross-Chain Governance
Hub-and-spoke governance: governance token on main chain (hub), deployed contracts on satellite chains (spokes). Proposals originate on hub, execute on hub, then messages relay execution to spokes via cross-chain messaging.

## Advanced Gas Optimization

### Storage Packing
Pack multiple small values into a single 32-byte slot. Use `uint128`, `uint64`, `address` packed together. One SLOAD costs 2100 gas regardless of how many values are read from the slot.

### Event Optimization
- Log data costs 8 gas per byte of data (non-indexed)
- Topic costs 375 gas per topic byte (indexed params)
- Max 3 indexed parameters per event (4th param is data)
- Use indexed parameters for filtering, data for retrieval

### Calldata Optimization
Use `calldata` instead of `memory` for function parameters (cheaper). Use `abi.encodePacked` instead of `abi.encode` when padding isn't needed. Batch operations where possible to amortize fixed costs.

## Formal Verification Integration

### Certora CVL for Smart Contracts
Write formal specifications for critical invariants: solvency (assets >= liabilities), access control (only admin can call specific functions), correctness (function behavior matches spec). Run Certora Prover in CI to prevent invariant violations.

## Smart Contract Upgrade Strategies

### UUPS vs Transparent vs Beacon
| Aspect | UUPS | Transparent | Beacon |
|---|---|---|---|
| Upgrade cost | Low (single function) | Medium (admin storage) | Medium (beacon deploy) |
| Call overhead | ~200 gas | ~400 gas | ~200 gas |
| Multi-implementation | No | No | Yes (clones) |
| Storage collision risk | Low | Low | Low |
| Best for | Most new projects | Upgrade-heavy contracts | Many instances |
