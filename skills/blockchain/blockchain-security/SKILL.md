---
name: blockchain-security
description: >
  Use this skill when asked about blockchain security, smart contract auditing, DeFi threat modeling, blockchain incident response, bug bounty programs, economic security, formal verification of smart contracts, and blockchain-specific security analysis. Languages: Solidity, Python, Rust, Haskell. Covers threat modeling for DeFi protocols (STRIDE for blockchain), audit methodology (scope, manual review, tooling, report), incident response (emergency pause, fork coordination, compensation), bug bounty programs (Immunefi, Code4rena), economic security (game theory, incentive analysis, MEV), and formal verification (Certora CVL, Halmos, Scribble). References shared skills from skills/security/ (threat-intelligence, secrets-management, siem-engineering) and skills/quality/ (property-based-testing) where core concepts overlap. Do NOT use for: general smart contract testing (use blockchain-testing), standard application security (use skills/security/ skills), or core cryptography (use blockchain-cryptography).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsuf: true
tags: [blockchain, security, audit, formal-verification, phase-blockchain]
---

# blockchain-security

## Trigger
"blockchain security", "smart contract audit", "DeFi security", "DeFi threat model", "blockchain threat modeling", "audit methodology", "blockchain incident response", "emergency pause", "fork coordination", "bug bounty", "Immunefi", "Code4rena", "economic security", "game theory blockchain", "incentive analysis", "MEV security", "certora", "formal verification blockchain", "Halmos", "Scribble", "solidity security", "smart contract vulnerability", "blockchain exploit", "flash loan attack", "oracle manipulation", "reentrancy", "access control blockchain"

## Rules
1. Always start with threat modeling (STRIDE adapted for blockchain) before writing any code — identify assets, trust boundaries, attack surfaces
2. Smart contract audit pipeline: scope → manual review (line-by-line) → automated tooling (Slither, Mythril, Echidna, Certora) → fuzz/invariant → formal verification → report
3. Economic security is as important as code security — analyze game theory, incentive alignment, and economic attack vectors
4. Bug bounty programs should follow Immunefi severity classification: Critical (up to $1M+), High ($50k-$100k), Medium ($5k-$20k), Low ($1k-$5k)
5. Incident response for blockchain: freeze/pause contract → assess damage → communicate → fork coordination (if needed) → post-mortem → compensation
6. Formal verification complements but does not replace manual review and fuzz testing
7. Reference shared skills: skills/security/threat-intelligence for CTI, skills/security/secrets-management for key security, skills/quality/property-based-testing for fuzz foundations

## Response Format
1. **Threat model**: assets, actors, attack vectors, trust assumptions
2. **Audit approach**: methodology, tools, timeline, expected coverage
3. **Economic analysis**: incentive structures, game theory, exploit scenarios
4. **Security controls**: mitigations, circuit breakers, monitoring
5. **Verification**: formal properties, invariants, proof techniques

## References
  - references/audit-methodology.md — Smart Contract Audit Methodology
  - references/blockchain-security-advanced.md — Blockchain Security Advanced Topics
  - references/blockchain-security-fundamentals.md — Blockchain Security Fundamentals
  - references/bug-bounty-program.md — Bug Bounty Programs for Blockchain Projects
  - references/economic-security.md — Economic Security in Blockchain Systems
  - references/formal-verification-deep.md — Formal Verification for Smart Contracts
  - references/incident-response.md — Blockchain Incident Response
  - references/smart-contract-security.md — Smart Contract Security
  - references/threat-modeling.md — Threat Modeling for Blockchain Systems
## Phase
blockchain → blockchain-security
