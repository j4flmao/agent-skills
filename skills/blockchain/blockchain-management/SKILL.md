---
name: blockchain-management
description: >
  Use this skill when asked about blockchain project management, DAO governance, multi-sig operations, treasury management, tokenomics design, and web3 project methodology. Languages: Solidity, TypeScript, Python. Covers DAO governance frameworks (Compound Governor, Aave, Snapshot, Tally), multi-sig wallet operations (Gnosis Safe, Timelock, proposal lifecycle), treasury management (vesting, streaming, diversification, yield), tokenomics design (supply schedule, inflation, staking rewards, emission curve), and web3-specific project methodology (audit-first, progressive decentralization, community governance). For standard management practices (agile, scrum, kanban, risk management, stakeholder management, OKR/KPI), reference shared skills from skills/management/. Do NOT use for: standard project management (use skills/management/pm), team operations (use skills/management/agile-scrum-kanban), cost analysis (use skills/management/cost-benefit), or technical blockchain development (use other blockchain-* skills).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsuf: true
tags: [blockchain, management, governance, dao, phase-blockchain]
---

# blockchain-management

## Trigger
"blockchain management", "DAO governance", "Compound Governor", "Snapshot vote", "Tally", "multi-sig", "Gnosis Safe", "timelock", "treasury management", "tokenomics", "token supply", "vesting", "token emission", "web3 project management", "blockchain project methodology", "progressive decentralization", "audit-first", "community governance", "DAO operations"

## Rules
1. For standard management practices (agile, scrum, kanban, sprint retro, risk management, stakeholder management, OKR/KPI, cost-benefit), reference skills/management/ skills — blockchain management adds web3-specific concerns
2. DAO governance should use battle-tested frameworks (Compound Governor, OpenZeppelin Governor) — avoid custom governance without security audit
3. Multi-sig operations require at least 3/5 signers for non-critical operations, 5/9 for treasury/critical operations
4. Timelocks must be enforced for all upgrades and parameter changes — 48h minimum for non-critical, 7 days for critical
5. Tokenomics must be modeled with supply schedule, inflation rate, and vesting cliffs before deployment
6. Always plan for progressive decentralization — start centralized, progressively transfer control to community
7. Use the references in `references/` for deep technical detail

## Response Format
1. **Governance model**: on-chain vs off-chain, token-weighted vs quadratic, quorum requirements
2. **Operational security**: multisig configuration, signing policies, key management
3. **Treasury strategy**: allocation, vesting, diversification, yield generation
4. **Token economics**: supply model, distribution, incentives, emission schedule
5. **Project methodology**: development lifecycle, audit gates, community involvement

## References
- references/dao-governance.md — DAO governance frameworks and voting systems
- references/multi-sig-operations.md — Gnosis Safe, timelocks, proposal lifecycle
- references/project-methodology.md — Web3 project methodology and progressive decentralization
- references/tokenomics-design.md — Token supply, inflation, vesting schedules
- references/treasury-management.md — Treasury allocation, diversification, yield

## Phase
blockchain → blockchain-management
