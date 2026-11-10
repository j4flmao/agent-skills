# DeFi Protocol Engineer

**Who this is for:** You build lending, AMM or vault protocols.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (1 skill, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`blockchain-security`](../../skills/blockchain/blockchain-security/SKILL.md) | `blockchain/blockchain-security` | Guide blockchain-specific security analysis covering smart contract auditing, DeFi threat modeling, economic security, incident response, formal… |

## Level 1 — Essentials (4 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`blockchain-defi`](../../skills/blockchain/blockchain-defi/SKILL.md) | `blockchain/blockchain-defi` | Guide decentralized finance protocol design, analysis, and implementation. |
| [`smart-contract-security`](../../skills/blockchain/smart-contract-security/SKILL.md) | `blockchain/smart-contract-security` | Explain the highest-impact Solidity security controls — Checks-Effects-Interactions with a reentrancy guard, oracle-manipulation resistance, and a… |
| [`blockchain-application`](../../skills/blockchain/blockchain-application/SKILL.md) | `blockchain/blockchain-application` | Guide smart contract development across all major blockchain platforms. |
| [`blockchain-testing`](../../skills/blockchain/blockchain-testing/SKILL.md) | `blockchain/blockchain-testing` | Guide blockchain smart contract testing covering the full testing pyramid: unit tests, integration tests, fuzz tests, invariant tests, formal… |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`defi-protocols`](../../skills/blockchain/defi-protocols/SKILL.md) | `blockchain/defi-protocols` | Explain the core on-chain primitives of DeFi: the constant-product AMM invariant and swap pricing (with fees), and over-collateralized lending… |
| [`defi-smart-contracts`](../../skills/niche/fintech-web3/defi-smart-contracts/SKILL.md) | `niche/fintech-web3/defi-smart-contracts` | Explain the deterministic pricing math behind automated market makers (constant-product invariant, slippage, impermanent loss) and the security… |
| [`blockchain-patterns`](../../skills/blockchain/blockchain-patterns/SKILL.md) | `blockchain/blockchain-patterns` | Catalog and guide the selection of blockchain design patterns covering token standards, contract upgradeability, scaling solutions, cross-chain… |
| [`blockchain-cross-chain`](../../skills/blockchain/blockchain-cross-chain/SKILL.md) | `blockchain/blockchain-cross-chain` | Guide cross-chain protocol selection, bridge architecture, and interoperability design. |
| [`blockchain-data-indexing`](../../skills/blockchain/blockchain-data-indexing/SKILL.md) | `blockchain/blockchain-data-indexing` | Guide the selection and implementation of blockchain data indexing solutions. |

## Level 3 — Specialist (3 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`blockchain-zk`](../../skills/blockchain/blockchain-zk/SKILL.md) | `blockchain/blockchain-zk` | Guide zero-knowledge proof integration in blockchain systems covering proof system selection, circuit programming, prover/verifier infrastructure,… |
| [`blockchain-management`](../../skills/blockchain/blockchain-management/SKILL.md) | `blockchain/blockchain-management` | Guide blockchain-specific project management covering DAO governance, multi-sig operations, treasury management, and tokenomics engineering. |
| [`smart-contract-auditor`](../../skills/personas/smart-contract-auditor/SKILL.md) | `personas/smart-contract-auditor` | Adopt the mindset of a Staff Smart Contract Auditor: adversarial, zero-trust review of EVM contracts - invariant analysis, reentrancy (incl. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (5 skills):**

```bash
npx skills add j4flmao/agent-skills --skill blockchain-defi --skill smart-contract-security --skill blockchain-application --skill blockchain-testing --skill blockchain-security
```

**Level 1 + 2 + security baseline (10 skills):**

```bash
npx skills add j4flmao/agent-skills --skill blockchain-defi --skill smart-contract-security --skill blockchain-application --skill blockchain-testing --skill defi-protocols --skill defi-smart-contracts --skill blockchain-patterns --skill blockchain-cross-chain --skill blockchain-data-indexing --skill blockchain-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`blockchain-all`](../bundles.md#blockchain-all) | 20 | All blockchain skills: core, cryptography, Ethereum, Bitcoin, patterns, application, web3, testing, infrastructure, security, management, Solana, DeFi, cross-chain, ZK, data indexing |

## Combine with

- [Blockchain & Web3 Engineer](blockchain.md)
- [Zero-Knowledge & Cryptography Engineer](zk.md)

## Watch out

Oracle manipulation and flash-loan attacks are the classic DeFi failures; use TWAP or multi-source oracles with freshness checks.
