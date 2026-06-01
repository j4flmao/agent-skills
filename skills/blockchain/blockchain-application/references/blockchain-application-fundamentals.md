# Blockchain Application Fundamentals

## Smart Contract Lifecycle

### Design Phase
Before writing any code: define the contract's purpose, state variables, entry points, and external dependencies. Map the complete data flow: which functions read which state, which functions write which state, and which external contracts are called. Identify all trust assumptions (admin roles, oracles, external protocols).

### Development Phase
Write contracts following platform conventions. For EVM: Solidity with Foundry. For Solana: Rust with Anchor. Test every function with unit tests (happy path + edge cases + reverts). Use continuous fuzzing for functions with numeric parameters.

### Audit Phase
Before mainnet deployment: static analysis (Slither, Aderyn), fuzz testing (Foundry fuzz, Echidna), formal verification (Certora CVL for critical invariants), manual line-by-line review. All high-severity findings must be fixed before deployment.

### Deployment Phase
Deploy to testnet first. Verify on block explorer. Run integration tests against testnet deployment. Have deployment runbook ready. Transfer ownership to multi-sig or timelock immediately after mainnet deployment.

## Core Principles

### Checks-Effects-Interactions
The single most important smart contract pattern. Validate all conditions first (checks), update state second (effects), make external calls last (interactions). This pattern prevents reentrancy attacks regardless of whether the external call is trusted.

### Defense in Depth
No single security control is sufficient. Combine: access control (Ownable, Roles), reentrancy protection (ReentrancyGuard), pull-over-push for payments, circuit breakers (Pausable), and input validation (require, custom errors).

### Minimize Trust
Reduce the number of trusted actors and the scope of their control. Use timelocks for admin operations. Prefer immutable contracts over upgradeable. Use multi-sig over single admin keys. Make all privileged operations observable via events.

## Platform Characteristics

### EVM (Solidity/Vyper)
Stored at 32-byte slots. Gas costs: SLOAD (2100 cold, 100 warm), SSTORE (20000+). Events cost 375 gas + 375 per topic byte. All transactions are sequential per account (nonce-based). Deployed contract code is immutable (unless proxy pattern).

### Solana (Rust/Anchor)
Account-based but with explicit read/write sets for parallelism. Compute budget: 200K CU per transaction (extendable via ComputeBudgetProgram). Accounts must be rent-exempt (min 2 years rent). PDAs replace constructor-based initialization.

### Cardano (Plutus)
eUTxO model: no global contract state. Validators check spending conditions for UTXOs locked at script addresses. Datum carries on-chain state. Redeemer provides spending condition. All validation has full transaction context.
