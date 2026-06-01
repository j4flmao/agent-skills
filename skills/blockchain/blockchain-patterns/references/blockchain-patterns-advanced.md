# Blockchain Patterns Advanced Topics

## Advanced Token Standards

### ERC-2612 (Permit)
Gasless token approvals using EIP-712 typed signatures. Users sign a permit off-chain and submit it to the contract directly, or a relayer submits it on their behalf. Eliminates the approve-then-transfer two-step pattern.

### ERC-4337 (Account Abstraction)
UserOperations replace regular transactions. Bundlers aggregate UserOps. EntryPoint handles verification and execution. Paymasters sponsor gas. Benefits: social recovery, session keys, batch transactions, gas sponsorship.

### ERC-4626 Vault Implementation Patterns
Vaults hold underlying assets and issue shares. Share price = totalAssets / totalSupply. Inflation attack prevention: frontrun first deposit by donating assets. Mitigation: virtual shares or liquidity check on first deposit.

## Cross-Chain Communication Patterns

### Hub-and-Spoke
Main governance chain (hub) manages protocol configuration for all chains (spokes). Messages flow hub→spoke for execution, spoke→hub for verification. Used by: Aave, Compound for cross-chain governance.

### Mesh Network
Every chain communicates directly with every other chain. Each pair has its own bridge or message path. Used by: LayerZero omnichain applications. Benefits: lower latency (direct path), higher complexity (N^2 connections).

## MEV-Aware Architecture

### MEV-Resistant Design Patterns
- **CowSwap**: Batch auctions with off-chain solver competition. Best price across all DEXs, no MEV.
- **UniswapX**: Dutch auctions for swap execution. Fillers compete on price. MEV-resistant via competitive filling.
- **1inch Fusion**: Similar to CowSwap but with resolver competition.
- **Flashbots Protect**: Private transaction submission (no public mempool).

### Order Flow Auctions
Users' transactions are auctioned to searchers/builders before entering the mempool. The winning searcher pays the user a share of extracted MEV. Creates a market for order flow that distributes MEV back to users.
