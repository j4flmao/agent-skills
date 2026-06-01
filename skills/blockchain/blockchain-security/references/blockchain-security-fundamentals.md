# Blockchain Security Fundamentals

## Security Mindset

### Blockchain Security vs Traditional Security
Traditional security focuses on perimeter defense (firewalls, access control). Blockchain security must additionally protect against: economic attacks (incentive manipulation), oracle manipulation, smart contract bugs, and governance attacks. There is no firewall for on-chain assets.

### Trust Minimization
Every trust assumption is a potential attack vector. The most secure smart contracts minimize trust: no admin keys (immutable), no upgradeability (fixed logic), no oracles (on-chain computation). Each trust tradeoff should be explicitly documented and justified.

## Core Vulnerability Classes

### Reentrancy
External call re-enters the calling contract before state is updated. Mitigations: Checks-Effects-Interactions (mandatory), ReentrancyGuard (OpenZeppelin), mutex locks.

### Access Control
Unauthorized users call privileged functions. Mitigations: OpenZeppelin Ownable/AccessControl, explicit role checks, timelock for sensitive operations.

### Integer Issues
Overflow, underflow, rounding errors in financial calculations. Solidity 0.8+ has built-in overflow checks. Still need to watch for: precision loss (division before multiplication), rounding direction (always floor for user-facing).

### Oracle Manipulation
Attacker manipulates on-chain data source to extract value. Mitigations: TWAP (time-weighted average price), redundant oracles, stale-price checks, circuit breakers.

## Security Tooling

### Static Analysis (Slither)
Detects common vulnerabilities via static analysis. Runs in CI. False positive rate ~20%. Covers: reentrancy, access control, uninitialized storage, unused return values.

### Symbolic Execution (Mythril, Halmos)
Explores all possible execution paths to find vulnerabilities. Computationally expensive but catches deep bugs. Mythril: EVM bytecode analysis. Halmos: Solidity-level symbolic testing.

### Fuzz Testing (Foundry, Echidna)
Random inputs find edge cases. Stateless fuzzing: independent calls. Stateful fuzzing: sequences of calls. Invariant fuzzing: properties that must always hold. Minimum 10K runs per function.

### Formal Verification (Certora)
Mathematical proof of contract properties. Express invariants in CVL (Certora Verification Language). Prover checks all possible states. Expensive to set up but catches bugs impossible to find with fuzzing.
