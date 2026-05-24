# Web3 Project Methodology

## Overview

Web3 projects require a different development lifecycle than traditional software. Smart contracts are immutable (or have controlled upgradeability), security is paramount, and decentralization is the end goal.

---

## 1. Web3 Development Lifecycle

```
IDEATION → WHITEPAPER → TOKENOMICS → CONTRACTS → INTERNAL AUDIT
    │           │            │            │             │
    v           v            v            v             v
EXTERNAL AUDIT → BUG BOUNTY → TESTNET → MAINNET → PROGRESSIVE
    │               │            │         │      DECENTRALIZATION
    v               v            v         v             v
FORMAL VERIFY  14+ days     Staging    Production    DAO Control
(+ independent)             + validators              + Immutable
```

### 1.1 Phase Details

| Phase | Duration | Deliverables | Gates |
|-------|----------|-------------|-------|
| Ideation | 2-4 weeks | Problem statement, solution sketch | Team alignment |
| Whitepaper | 4-8 weeks | Technical specification, protocol design | Peer review |
| Tokenomics | 2-4 weeks | Supply model, distribution, vesting | Tokenomics review |
| Contract dev | 8-16 weeks | Solidity contracts, tests (90%+ coverage) | Code freeze |
| Internal audit | 2-4 weeks | Self-review, tooling (Slither, Echidna) | No critical issues |
| External audit | 4-8 weeks | 2 independent auditors, 1 formal verification | All critical/high fixed |
| Bug bounty | 14-30 days | Public or private (Immunefi) | No critical in 14 days |
| Testnet | 2-4 weeks | Staging deployment, validators, monitoring | All systems go |
| Mainnet | Ongoing | Production launch | Gradual TVL ramp |
| Progressive dec. | 6-24 months | Multi-sig → Timelock → DAO control | Stage-specific checks |

---

## 2. Audit-First Approach

### 2.1 Audit Process Timeline

```
Week 1:         Code freeze. Lock all contract code.
Week 1-2:       Internal audit + static analysis (Slither, Mythril, Aderyn)
Week 2-4:       External audit #1 (e.g., Trail of Bits)
Week 3-5:       External audit #2 (e.g., Code4rena)
Week 4-6:       Formal verification (e.g., Certora)
Week 4-6:       Fix all critical/high issues from audit #1
Week 5-7:       Fix all critical/high issues from audit #2
Week 6-8:       Re-audit / fix verification
Week 8+:        Public bug bounty (Immunefi)
                → Minimum 14 days with no critical findings before mainnet
```

### 2.2 Auditor Selection

| Firm | Best For | Cost Range | Duration |
|------|----------|-----------|----------|
| Trail of Bits | DeFi, complex systems | $200k-$1M | 3-6 weeks |
| OpenZeppelin | ERC standards, governance | $100k-$500k | 2-4 weeks |
| Code4rena | Community audits | $50k-$200k | 1-2 weeks |
| Certora | Formal verification | $100k-$300k | 2-4 weeks |
| Spearbit | DeFi specialists | $50k-$200k | 1-3 weeks |
| Sherlock | Competitive audits | $50k-$150k | 1-2 weeks |
| Consensys Diligence | Enterprise grade | $200k-$500k | 3-6 weeks |

**Rule:** At least 2 independent audits + 1 formal verification for core contracts.

### 2.3 Audit Readiness Checklist

- [ ] 100% test coverage on all functions
- [ ] All invariant tests passing (Foundry)
- [ ] Fuzz testing (Echidna, Foundry fuzz) — no assertion failures
- [ ] Static analysis clean: Slither, Mythril, Aderyn
- [ ] All TODOs and comments resolved
- [ ] No unused imports, variables, or functions
- [ ] NatSpec documented
- [ ] Gas optimizations applied (but not at security expense)
- [ ] Reentrancy guards applied
- [ ] Access control checked on every external function
- [ ] Emergency pause mechanism tested
- [ ] Upgradeability mechanism reviewed (UUPS vs transparent proxy)

### 2.4 Pre-Audit Static Analysis

```bash
# Slither
slither contracts/ --print human-summary
slither contracts/ --detect reentrancy-eth,reentrancy-no-eth,tx-origin
slither contracts/ --print call-graph
slither contracts/ --config-file slither.config.json

# Mythril
myth analyze contracts/Token.sol --solc-json mythril.json

# Aderyn
aderyn contracts/

# Foundry invariant tests
forge test --inv-bounds 100000 --dereference-depth 10
```

---

## 3. Progressive Decentralization

### 3.1 Stages

```
Stage 1: Centralized Launch
├── Full team control
├── Upgradeable contracts (UUPS or Transparent Proxy)
├── Multi-sig owners = core team
├── Timelock for parameter changes
├── Emergency pause by team
└── Duration: 0-6 months

Stage 2: Community Oversight
├── Multi-sig expanded (team + community reps + advisors)
├── Snapshot for off-chain signaling
├── On-chain proposal for parameter changes
├── Community multisig signers
├── Contract still upgradeable
├── Emergency pause: multi-sig only (3/5 threshold)
└── Duration: 3-12 months

Stage 3: DAO Control
├── Full DAO governance (Governor Bravo / OZ Governor)
├── Contracts immutable or controlled by DAO
├── No emergency pause (or pause controlled by DAO vote)
├── Contracts non-upgradeable (or upgradeable only by DAO + timelock)
├── Treasury managed by multi-sig with DAO oversight
└── Duration: Ongoing
```

### 3.2 Decentralization Decision Matrix

| Component | Stage 1 | Stage 2 | Stage 3 |
|-----------|---------|---------|---------|
| Contract upgrades | Team proxy admin | Multi-sig + 7d timelock | DAO vote only |
| Parameter changes | Team directly | Multi-sig > 48h timelock | DAO proposal |
| Emergency pause | Team single-sig | Multi-sig 3/5 | Multi-sig 5/9 |
| Treasury spending | Team multi-sig | Multi-sig + DAO signal | DAO on-chain |
| Oracle management | Team controlled | Community vetted | DAO managed |
| Fee/interest rates | Team set | Multi-sig + timelock | DAO proposal |
| Whitelist/blacklist | Team managed | Multi-sig + timelock | DAO or committee |

### 3.3 Decentralization Checklist

- [ ] No single entity can unilaterally upgrade contracts (Stage 2+)
- [ ] Contract upgrade requires > 7-day timelock (Stage 2+)
- [ ] At least 5 multisig signers from different organizations (Stage 2+)
- [ ] No admin keys on main contracts (Stage 3)
- [ ] Emergency pause requires multi-sig (Stage 2+)
- [ ] All governance actions have timelock (Stage 2+)
- [ ] DAO treasury independent of team control (Stage 3)
- [ ] Protocol can function without team intervention (Stage 3)

---

## 4. Community Governance Integration

### 4.1 Full Proposal Flow

```
Forum Discussion        (7-14 days)
    │  [Temperature check snapshot]
    v
RFC (Request for Comment)  (3-7 days)
    │  [Refine parameters based on feedback]
    v
Temperature Check (Snapshot)  (3-5 days)
    │  [Off-chain signal vote, quorum > 5%]
    v
On-Chain Proposal (Tally/Governor)  (3-7 days)
    │  [Token-weighted vote, quorum > 4%]
    v
Timelock Queue  (2-7 days)
    │  [Community monitoring period]
    v
Execution  (Anyone can execute)
```

### 4.2 Proposal Template

```markdown
## Title: [AIP/XIP-XX] Protocol Parameter Change

## Summary
One paragraph describing the proposal.

## Motivation
Why is this change needed? What problem does it solve?

## Specification
- Target contract: 0x...
- Function: setParam(uint256)
- New value: 1_500 (current: 1_000)

## Rationale
- Why this value?
- What analysis supports it?
- Risk assessment

## Implementation
- Calldata: 0x...
- Timeline: 48h timelock after vote

## Voting
- For: Accept the parameter change
- Against: Keep current value
- Abstain: No opinion
```

---

## 5. Development Timeline Example

### 5.1 12-Month Plan

```
Month 1-2:     Ideation + Whitepaper
               → Problem definition, protocol design, competitive analysis

Month 3-4:     Tokenomics + Architecture
               → Supply model, distribution, vesting → Contract architecture

Month 5-8:     Smart Contract Development
               → Sprint 1: Core protocol (weeks 1-4)
               → Sprint 2: Governance + Treasury (weeks 5-8)
               → Sprint 3: Integrations + Tests (weeks 9-12)
               → Sprint 4: Audit prep + invariant tests (weeks 13-16)

Month 9-10:    Audit Phase
               → Internal audit (weeks 1-2)
               → External audit #1 + #2 (weeks 3-6)
               → Formal verification (weeks 5-8)
               → Fix + re-audit (weeks 7-10)

Month 11:      Bug Bounty + Testnet
               → Immunefi bounty (14-30 days)
               → Testnet deployment
               → Validator/node operator onboarding

Month 12+:     Mainnet + Decentralization
               → Mainnet launch (gradual TVL)
               → Stage 1 → Stage 2 transition (month 6+)
```

### 5.2 Resource Planning

| Role | Stage 1 (months 1-6) | Stage 2 (months 7-12) | Stage 3 (year 2+) |
|------|----------------------|----------------------|-------------------|
| Smart contract devs | 3-5 | 2-3 | 1-2 |
| Frontend devs | 2-3 | 2-3 | 2-3 |
| Security engineer | 1-2 | 1 | 0-1 |
| Product manager | 1 | 1 | 0-1 |
| Community manager | 0-1 | 1-2 | 2-3 |
| Business dev | 1 | 1-2 | 1-2 |
| Legal/compliance | 0-1 | 1 | 1 |

---

## 6. Key Principles

1. **Security-first:** Audit before mainnet, bug bounty before significant TVL. No exceptions.
2. **Progressive decentralization:** Don't launch fully decentralized — it's impractical and dangerous.
3. **Transparency:** All multisig transactions, treasury movements, and governance votes should be on-chain and visible.
4. **Community inclusion:** Involve community early via forum discussions and temperature checks before on-chain votes.
5. **Defense in depth:** Multi-sig + timelock + monitoring + insurance. No single point of failure.
6. **Test everything:** Unit tests, integration tests, fork tests, invariant tests, fuzz tests, formal verification.
7. **Prepare for failure:** Emergency pauses, upgradeability, insurance fund, gradual TVL ramp.

**Golden Rule:** The best web3 launch is boring. No hacks, no drama, no emergency governance — just a protocol that works as designed and gradually hands control to its community.
