# Blockchain Solana Advanced Topics

## Solana Runtime Deep Dive

### Compute Budget
Default compute budget: 200,000 CUs per transaction. Can be increased via ComputeBudgetProgram::requestHeapFrame (max 256K) and requestUnits (max 1.4M CUs per block total). CU costs: SLOAD (100-600), SSTORE (300-3300), CPI call (200 + per account), syscall (100-10000).

### BPF Bytecode
Solana programs compile to eBPF (extended Berkeley Packet Filter) bytecode. LLVM compiles Rust to BPF. BPF verifier checks program safety before execution. Maximum program size: 1MB.

### Bankrun (Testing)
```typescript
import { startAnchor } from "solana-bankrun";
// Bankrun: ultra-fast local validator for testing
// Processes transactions in-process (no IPC)
// Compatible with Anchor tests
```

## Advanced Program Patterns

### PDA Seeds and Bumps
PDA = program-derived address (off the Ed25519 curve). Seeds define the PDA. Bump ensures the address is off-curve. Store bump in account data or derive each time. Deterministic: same seeds = same PDA across all clusters.

### CPI with PDA Signing
Programs can sign for their PDAs using invoke_signed. Provide the seeds, the runtime derives the PDA and signs. This enables programs to act as authority for token accounts, mint tokens, and manage user assets without user intervention.

### Close Account Pattern
Solana charges rent for account storage (min 2 years). Close empty accounts to reclaim rent. Anchor's `close` constraint handles this automatically: transfers rent lamports to destination, marks account data as invalid.

## Solana DeFi Ecosystem

### Jupiter Aggregator
Largest DEX aggregator on Solana. Routes trades across all Solana DEXs for best price. Supports limit orders, DCA, and cross-chain swaps. Uses: Marinade, Orca, Raydium, Meteora, Phoenix, OpenBook.

### Pyth Oracle
Push-based oracle network. Publishers submit prices to Pyth program. On-chain price feeds update every ~400ms. Used by most Solana DeFi protocols. Confidence interval provides price uncertainty.

### Solana DeFi vs EVM DeFi
| Aspect | Solana | EVM |
|---|---|---|
| Execution | Parallel (SeaLevel) | Sequential (EVM) |
| Account model | Explicit all accounts | Implicit state |
| Token standard | SPL Token | ERC-20 |
| Liquidation | Same block | Next block |
| Composability | CPI (atomic) | DELEGATECALL/CALL |
