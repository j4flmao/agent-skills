---
name: smart-contract-security
description: >
  Use this skill when the user says 'reentrancy', 'checks-effects-interactions', 'ReentrancyGuard', 'flash loan attack', 'oracle manipulation', 'Slither', 'Echidna', 'smart contract audit'. Covers core Solidity security patterns and the audit workflow (static analysis, fuzzing, formal verification, manual review). Do NOT use for: full security domain reference (use blockchain/blockchain-security), test harness setup (use blockchain/blockchain-testing), or DeFi math (use blockchain/defi-protocols).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
tags: [blockchain, security, solidity, reentrancy, auditing]
---

# Smart Contract Security

## Purpose
Explain the highest-impact Solidity security controls — Checks-Effects-Interactions with a reentrancy guard, oracle-manipulation resistance, and a layered audit workflow — so developers write defensible contracts and reviewers triage risk. Reference and remediation guidance, not exploit construction.

## Agent Protocol

### Trigger
User phrases: "reentrancy guard", "checks effects interactions", "flash loan attack prevention", "oracle manipulation", "Slither/Echidna", "audit workflow".

### Input Context
- Solidity version and OpenZeppelin Contracts version (v5 changed import paths).
- External calls and price dependencies in scope.

### Output Artifact
Security pattern recommendation plus the audit-stage plan.

### Response Format
```
Risk: {class}
Control: {pattern / tool}
Residual: {what still needs manual review}
```

## Reentrancy Guards
Use the Checks-Effects-Interactions pattern and OpenZeppelin's `ReentrancyGuard`. In OpenZeppelin Contracts v5 the guard moved from `security/` to `utils/` — use `@openzeppelin/contracts/utils/ReentrancyGuard.sol` (the `security/ReentrancyGuard.sol` path only exists in v4.x).

```solidity
// OpenZeppelin Contracts v5+:
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Vault is ReentrancyGuard {
    mapping(address => uint) public balances;

    function withdraw() external nonReentrant {
        uint bal = balances[msg.sender];
        require(bal > 0, "No balance");
        balances[msg.sender] = 0; // Effect
        (bool success, ) = msg.sender.call{value: bal}(""); // Interaction
        require(success, "Transfer failed");
    }
}
```

## Flash Loan Attack Prevention
Flash loans let an attacker borrow large capital atomically, so any value that depends on a single-block spot price is manipulable. Use decentralized oracles (Chainlink price feeds) or a time-weighted average price (Uniswap V3 TWAP via the pool's observation oracle) instead of spot `getReserves()`/`slot0`. Also avoid read-only reentrancy by never trusting external balances mid-callback, and validate that oracle data is fresh (check `updatedAt` / `answeredInRound`).

## Security Audit Workflow
```mermaid
%%{init: {"theme": "default", "flowchart": {"useMaxWidth": true}}}%%
flowchart TD
    A[Source Code] --> B[Static Analysis (Slither)]
    B --> C[Fuzzing (Echidna)]
    C --> D[Formal Verification]
    D --> E[Manual Code Review]
    E --> F[Audit Report]
```
