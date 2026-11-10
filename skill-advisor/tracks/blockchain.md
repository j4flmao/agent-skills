# Blockchain & Web3 Engineer

**Who this is for:** You write smart contracts, dApps or blockchain infrastructure.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (1 skill, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security-secrets-management`](../../skills/security/secrets-management/SKILL.md) | `security/secrets-management` | Design a secrets management strategy covering detection (GitLeaks, truffleHog, ggshield), centralized storage (Vault, AWS Secrets Manager, GCP… |

## Level 1 — Essentials (5 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`blockchain-core`](../../skills/blockchain/blockchain-core/SKILL.md) | `blockchain/blockchain-core` | Guide core blockchain protocol engineering covering consensus mechanisms, state machine design, P2P networking, mempool architecture, MEV… |
| [`blockchain-application`](../../skills/blockchain/blockchain-application/SKILL.md) | `blockchain/blockchain-application` | Guide smart contract development across all major blockchain platforms. |
| [`blockchain-testing`](../../skills/blockchain/blockchain-testing/SKILL.md) | `blockchain/blockchain-testing` | Guide blockchain smart contract testing covering the full testing pyramid: unit tests, integration tests, fuzz tests, invariant tests, formal… |
| [`blockchain-security`](../../skills/blockchain/blockchain-security/SKILL.md) | `blockchain/blockchain-security` | Guide blockchain-specific security analysis covering smart contract auditing, DeFi threat modeling, economic security, incident response, formal… |
| [`smart-contract-security`](../../skills/blockchain/smart-contract-security/SKILL.md) | `blockchain/smart-contract-security` | Explain the highest-impact Solidity security controls — Checks-Effects-Interactions with a reentrancy guard, oracle-manipulation resistance, and a… |

## Level 2 — Professional (6 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`blockchain-ethereum`](../../skills/blockchain/blockchain-ethereum/SKILL.md) | `blockchain/blockchain-ethereum` | Guide to Ethereum protocol engineering covering execution layer, consensus layer, staking, L2 scaling, and protocol evolution through EIPs. |
| [`blockchain-web3`](../../skills/blockchain/blockchain-web3/SKILL.md) | `blockchain/blockchain-web3` | Guide web3 frontend and dApp development covering library selection, wallet integration, contract interaction, transaction management, event… |
| [`blockchain-patterns`](../../skills/blockchain/blockchain-patterns/SKILL.md) | `blockchain/blockchain-patterns` | Catalog and guide the selection of blockchain design patterns covering token standards, contract upgradeability, scaling solutions, cross-chain… |
| [`blockchain-defi`](../../skills/blockchain/blockchain-defi/SKILL.md) | `blockchain/blockchain-defi` | Guide decentralized finance protocol design, analysis, and implementation. |
| [`blockchain-infrastructure`](../../skills/blockchain/blockchain-infrastructure/SKILL.md) | `blockchain/blockchain-infrastructure` | Guide blockchain infrastructure operations: node deployment, RPC infrastructure, smart contract CI/CD, monitoring, MEV infrastructure, and key… |
| [`blockchain-data-indexing`](../../skills/blockchain/blockchain-data-indexing/SKILL.md) | `blockchain/blockchain-data-indexing` | Guide the selection and implementation of blockchain data indexing solutions. |

## Level 3 — Specialist (7 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`blockchain-zk`](../../skills/blockchain/blockchain-zk/SKILL.md) | `blockchain/blockchain-zk` | Guide zero-knowledge proof integration in blockchain systems covering proof system selection, circuit programming, prover/verifier infrastructure,… |
| [`zero-knowledge-proofs`](../../skills/blockchain/zero-knowledge-proofs/SKILL.md) | `blockchain/zero-knowledge-proofs` | Explain how to build and prove zero-knowledge statements: authoring constrained arithmetic circuits in Circom, selecting a proving system (Groth16… |
| [`blockchain-cross-chain`](../../skills/blockchain/blockchain-cross-chain/SKILL.md) | `blockchain/blockchain-cross-chain` | Guide cross-chain protocol selection, bridge architecture, and interoperability design. |
| [`blockchain-solana`](../../skills/blockchain/blockchain-solana/SKILL.md) | `blockchain/blockchain-solana` | Guide Solana blockchain development covering protocol architecture, smart contract (program) development with Anchor, SPL token standards,… |
| [`blockchain-bitcoin`](../../skills/blockchain/blockchain-bitcoin/SKILL.md) | `blockchain/blockchain-bitcoin` | Guide Bitcoin protocol engineering, Bitcoin Core development, Bitcoin Script programming, mining infrastructure, Lightning Network implementation,… |
| [`blockchain-cryptography`](../../skills/blockchain/blockchain-cryptography/SKILL.md) | `blockchain/blockchain-cryptography` | Guide the selection, implementation, and optimization of cryptographic primitives specific to blockchain systems. |
| [`smart-contract-auditor`](../../skills/personas/smart-contract-auditor/SKILL.md) | `personas/smart-contract-auditor` | Adopt the mindset of a Staff Smart Contract Auditor: adversarial, zero-trust review of EVM contracts - invariant analysis, reentrancy (incl. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (6 skills):**

```bash
npx skills add j4flmao/agent-skills --skill blockchain-core --skill blockchain-application --skill blockchain-testing --skill blockchain-security --skill smart-contract-security --skill security-secrets-management
```

**Level 1 + 2 + security baseline (12 skills):**

```bash
npx skills add j4flmao/agent-skills --skill blockchain-core --skill blockchain-application --skill blockchain-testing --skill blockchain-security --skill smart-contract-security --skill blockchain-ethereum --skill blockchain-web3 --skill blockchain-patterns --skill blockchain-defi --skill blockchain-infrastructure --skill blockchain-data-indexing --skill security-secrets-management
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`blockchain-all`](../bundles.md#blockchain-all) | 20 | All blockchain skills: core, cryptography, Ethereum, Bitcoin, patterns, application, web3, testing, infrastructure, security, management, Solana, DeFi, cross-chain, ZK, data indexing |
| [`fintech-payments`](../bundles.md#fintech-payments) | 13 | Fintech and payments: ledgers, payment processing, checkout, idempotency, audit trails, data masking, compliance |

## Combine with

- [Security Engineer](security.md)
- [Frontend Engineer](frontend.md)

## Watch out

`blockchain/blockchain-defi` and `blockchain/defi-protocols` overlap, as do `blockchain-zk` and `zero-knowledge-proofs`; keep the `blockchain-*` versions unless you need the shorter ones.
