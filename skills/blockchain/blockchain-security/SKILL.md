---
name: blockchain-security
description: >
  Use this skill when asked about blockchain security, smart contract auditing, DeFi threat modeling, blockchain incident response, bug bounty programs, economic security, formal verification of smart contracts, and blockchain-specific security analysis. Languages: Solidity, Python, Rust, Haskell. Covers threat modeling for DeFi protocols (STRIDE for blockchain), audit methodology (scope, manual review, tooling, report), incident response (emergency pause, fork coordination, compensation), bug bounty programs (Immunefi, Code4rena), economic security (game theory, incentive analysis, MEV), and formal verification (Certora CVL, Halmos, Scribble). References shared skills from skills/security/ (threat-intelligence, secrets-management, siem-engineering) and skills/quality/ (property-based-testing) where core concepts overlap. Do NOT use for: general smart contract testing (use blockchain-testing), standard application security (use skills/security/ skills), or core cryptography (use blockchain-cryptography).
version: "1.1.0"
author: "j4flmao"
license: "MIT"
tags: [blockchain, security, audit, formal-verification, phase-blockchain]
---

# Blockchain Security

## Purpose
Guide blockchain-specific security analysis covering smart contract auditing, DeFi threat modeling, economic security, incident response, formal verification, and bug bounty programs. Combines traditional security engineering with blockchain-specific risks like economic attack vectors, flash loans, oracle manipulation, and MEV.

## Agent Protocol

### Trigger
"blockchain security", "smart contract audit", "DeFi security", "DeFi threat model", "blockchain threat modeling", "audit methodology", "blockchain incident response", "emergency pause", "fork coordination", "bug bounty", "Immunefi", "Code4rena", "economic security", "game theory blockchain", "incentive analysis", "MEV security", "certora", "formal verification blockchain", "Halmos", "Scribble", "solidity security", "smart contract vulnerability", "blockchain exploit", "flash loan attack", "oracle manipulation", "reentrancy", "access control blockchain", "cross-chain security", "bridge security"

### Input Context
- Smart contracts or protocol to analyze
- Platform (EVM/Solana/Cosmos/Cardano)
- Security objective (audit/threat model/incident response/pre-audit review)
- Codebase location and audit history
- Previous incidents or vulnerabilities
- TVL and risk exposure

### Output Artifact
Security analysis including: threat model, vulnerability findings, economic analysis, verification approach, and remediation recommendations.

### Response Format
1. **Threat model**: assets, actors, attack vectors, trust assumptions, attack surface
2. **Audit approach**: methodology, tools, timeline, expected coverage
3. **Economic analysis**: incentive structures, game theory, exploit scenarios
4. **Security controls**: mitigations, circuit breakers, monitoring
5. **Verification**: formal properties, invariants, proof techniques
6. **Incident response**: emergency plan, communication template

### Completion Criteria
- Threat model identifies all trust assumptions and attack surfaces
- Vulnerability findings include severity, impact, likelihood, and remediation
- Economic analysis models incentive alignment and identifies exploit paths
- Formal verification specifies key invariants (solvency, access control, correctness)
- Emergency response plan covers: pause, communication, fork coordination, post-mortem

### Max Response Length
5000 tokens

## Decision Trees

### Security Assessment Type
```
Security need:
├── Pre-deployment audit?
│   ├── Early stage → Threat modeling + architecture review
│   │   ├── Identify trust assumptions
│   │   ├── Map attack surface
│   │   └── Design security controls
│   ├── Mid-development → Full audit (automated + manual + fuzz)
│   │   ├── Slither + Mythril static analysis (first pass)
│   │   ├── Manual line-by-line review (second pass)
│   │   ├── Foundry fuzz + invariant tests (third pass)
│   │   ├── Echidna/Medusa property-based fuzzing (fourth pass)
│   │   └── Certora/Halmos formal verification (fifth pass)
│   └── Pre-launch → Final audit + bug bounty launch
│       ├── Re-audit after fixes
│       ├── Immunefi or Code4rena bounty program
│       └── Emergency response plan
├── Incident response?
│   ├── Ongoing exploit → Emergency pause + communication
│   ├── Post-exploit → Damage assessment + recovery plan
│   └── Post-mortem → Root cause analysis + fix implementation
└── Ongoing security?
    ├── Continuous monitoring → Forta, Tenderly alerts
    ├── Bug bounty management → VRT, severity classification
    └── Periodic review → Quarterly parameter review, annual deep audit
```

### Vulnerability Severity (Immunefi Standard)
| Severity | Impact | Payout Range |
|---|---|---|
| Critical | Direct loss of funds, permanent DoS | Up to $10M+ |
| High | Theft of unclaimed yield, temporary DoS | $50K-$500K |
| Medium | Contract fails to deliver expected return, temporarily frozen funds | $5K-$50K |
| Low | Griefing (no direct financial loss) | $1K-$5K |
| None | Informational | No payout |

## DeFi Threat Modeling (STRIDE-Blockchain)

### STRIDE Adapted for Blockchain
| Threat | Blockchain Equivalent | Example |
|---|---|---|
| Spoofing | Fake event log emission, counterfeit token | Impostor token impersonation |
| Tampering | State manipulation, reorg, flash loan price | Manipulating oracle price |
| Repudiation | Unauthorized proposal, fake governance | Flash loan governance attack |
| Information disclosure | Mempool snooping, frontrunning | MEV extraction from public tx pool |
| Denial of Service | Gas griefing, block stuffing | Low-cost DoS via state bloat |
| Elevation of Privilege | Unauthorized role assignment, proxy admin | OpenZeppelin UUPS unauthorized upgrade |

### Common Attack Trees

**Reentrancy Attack Tree**
```
├── External call before state update
│   ├── ETH transfer via .call{value}() (forward all gas)
│   ├── ERC-777 callback (tokensToSend hook)
│   └── ERC-1155 callback (onERC1155Received)
├── Recipient is malicious contract
│   └── Malicious fallback re-enters victim function
└── Mitigations:
    ├── Checks-effects-interactions pattern
    ├── ReentrancyGuard (OpenZeppelin)
    └── Pull-over-push for payments
```

**Oracle Manipulation Attack Tree**
```
├── Single oracle price source
│   ├── Flash loan to manipulate AMM price
│   ├── Sandwich attack on oracle update
│   └── Frontrun oracle transaction
├── TWAP manipulation
│   └── Multi-block TWAP manipulation (expensive but possible)
└── Mitigations:
    ├── Redundant oracles (minimum 3 independent sources)
    ├── TWAP with sufficient window (30 min+)
    ├── Stale price checks (max age < 1 hour)
    └── Circuit breakers on price deviation
```

## Audit Methodology

### Phase 1: Scope & Recon
1. Define audit scope: contracts, functions, interactions
2. Review specification and architecture documentation
3. Understand trust model: admin roles, upgrade paths, emergency mechanisms
4. Set up local environment with all dependencies

### Phase 2: Automated Analysis
5. Run Slither: detect common vulnerabilities, generate inheritance graph
6. Run Mythril: symbolic execution for deep vulnerability detection
7. Run Aderyn: Solidity static analyzer for spec violations
8. Run Halmos: symbolic testing for complex assertions
9. Run semgrep with custom rules

### Phase 3: Manual Review
10. Storage layout review: collision risks, upgrade compatibility
11. Access control review: privilege escalation paths, role hierarchy
12. Business logic review: correctness, edge cases, integer handling
13. External dependency review: oracle, bridge, token interactions
14. Economic analysis: incentive alignment, MEV exposure, game theory

### Phase 4: Fuzz & Invariant
15. Parameterized fuzzing with Foundry
16. Invariant tests with Echidna or Medusa
17. Stateful fuzzing with Foundry fuzz
18. Differential testing with reference implementation

### Phase 5: Formal Verification
19. Certora CVL for critical invariants (solvency, access control)
20. Scribble for annotation-based formal specs
21. Halmos for symbolic testing of complex logic

### Phase 6: Report & Remediation
22. Document findings with severity, impact, exploit scenario, fix
23. Retest fixes after remediation
24. Final report with methodology, findings, and risk assessment

## Common Vulnerability Examples

### Reentrancy
```solidity
// VULNERABLE
function withdraw(uint256 amount) external {
    require(balances[msg.sender] >= amount);
    (bool ok, ) = msg.sender.call{value: amount}(""); // external call BEFORE state
    require(ok);
    balances[msg.sender] -= amount; // state update AFTER
}

// FIXED: CEI pattern
function withdraw(uint256 amount) external {
    require(balances[msg.sender] >= amount);
    balances[msg.sender] -= amount; // state update FIRST
    (bool ok, ) = msg.sender.call{value: amount}(""); // then external call
    require(ok);
}
```

### Access Control
```solidity
// VULNERABLE: init function unprotected
function initialize(address _owner) external {
    owner = _owner; // anyone can call this
}

// FIXED
function initialize(address _owner) external initializer {
    __Ownable_init(_owner);
}
```

## Rules
1. Always start with threat modeling before writing any code — identify assets, trust boundaries, attack surfaces
2. Audit pipeline: scope → manual review → automated tooling → fuzz/invariant → formal verification → report
3. Economic security is as important as code security — analyze game theory and incentive alignment
4. Bug bounty programs follow Immunefi severity: Critical (up to $1M+), High ($50K-$100K), Medium ($5K-$20K), Low ($1K-$5K)
5. Incident response: freeze/pause contract → assess damage → communicate → fork coordination → post-mortem → compensation
6. Formal verification complements but does NOT replace manual review and fuzz testing
7. Always verify signature malleability (low-s for ECDSA), nonce reuse, and signature replay protection
8. Cross-chain bridges require additional security layers: rate limiting, circuit breakers, tiered security

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
  - references/blockchain-vulnerability-catalog.md — Common Blockchain Vulnerabilities Catalog
  - references/cross-chain-security.md — Cross-Chain Security Considerations

## Phase
blockchain → blockchain-security
