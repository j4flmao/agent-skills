# Zero-Knowledge & Cryptography Engineer

**Who this is for:** You build ZK circuits, proof systems or cryptographic protocols.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Level 1 — Essentials (3 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`blockchain-zk`](../../skills/blockchain/blockchain-zk/SKILL.md) | `blockchain/blockchain-zk` | Guide zero-knowledge proof integration in blockchain systems covering proof system selection, circuit programming, prover/verifier infrastructure,… |
| [`zero-knowledge-proofs`](../../skills/blockchain/zero-knowledge-proofs/SKILL.md) | `blockchain/zero-knowledge-proofs` | Explain how to build and prove zero-knowledge statements: authoring constrained arithmetic circuits in Circom, selecting a proving system (Groth16… |
| [`blockchain-cryptography`](../../skills/blockchain/blockchain-cryptography/SKILL.md) | `blockchain/blockchain-cryptography` | Guide the selection, implementation, and optimization of cryptographic primitives specific to blockchain systems. |

## Level 2 — Professional (3 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`modern-cryptography`](../../skills/cybersecurity/modern-cryptography/SKILL.md) | `cybersecurity/modern-cryptography` | Explain the mechanics and correct selection of modern asymmetric cryptography — ECC/ECDHE for key exchange and forward secrecy, and NIST PQC… |
| [`post-quantum-crypto`](../../skills/quantum-computing/post-quantum-crypto/SKILL.md) | `quantum-computing/post-quantum-crypto` | A cryptographically relevant quantum computer (CRQC) running Shor's algorithm would break RSA, finite-field Diffie-Hellman, and elliptic-curve… |
| [`blockchain-security`](../../skills/blockchain/blockchain-security/SKILL.md) | `blockchain/blockchain-security` | Guide blockchain-specific security analysis covering smart contract auditing, DeFi threat modeling, economic security, incident response, formal… |

## Level 3 — Specialist (2 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`post-quantum-crypto-poc`](../../skills/rnd/security/post-quantum-crypto-poc/SKILL.md) | `rnd/security/post-quantum-crypto-poc` | Prove in your own environment that post-quantum key exchange works end to end: clients and servers negotiate a hybrid group (classical X25519 +… |
| [`shors-algorithm`](../../skills/quantum-computing/shors-algorithm/SKILL.md) | `quantum-computing/shors-algorithm` | Shor (1994) showed that a quantum computer can factor integers and compute discrete logarithms in polynomial time, which breaks RSA,… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 only (3 skills):**

```bash
npx skills add j4flmao/agent-skills --skill blockchain-zk --skill zero-knowledge-proofs --skill blockchain-cryptography
```

**Level 1 + 2 (6 skills):**

```bash
npx skills add j4flmao/agent-skills --skill blockchain-zk --skill zero-knowledge-proofs --skill blockchain-cryptography --skill modern-cryptography --skill post-quantum-crypto --skill blockchain-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`blockchain-all`](../bundles.md#blockchain-all) | 20 | All blockchain skills: core, cryptography, Ethereum, Bitcoin, patterns, application, web3, testing, infrastructure, security, management, Solana, DeFi, cross-chain, ZK, data indexing |
| [`quantum-computing`](../bundles.md#quantum-computing) | 12 | Quantum computing: qubits and gates, algorithms (Grover, Shor), Qiskit, error correction, post-quantum cryptography |

## Combine with

- [Blockchain & Web3 Engineer](blockchain.md)
- [Quantum Computing Researcher](quantum.md)

## Watch out

Read `.claude/rules/zk-circuit-rules.md`: unconstrained signals are the most common ZK bug.
