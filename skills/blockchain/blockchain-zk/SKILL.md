---
name: blockchain-zk
description: zero-knowledge proofs, zk-rollup, zkEVM, Circom, Noir, Halo2, proof systems, Groth16, PLONK, STARK, recursive proofs, circuit optimization, zkSync, StarkNet, Scroll, Polygon zkEVM
version: 1.0.0
author: j4flmao
license: MIT
tags: [blockchain, zero-knowledge, zk, rollup, proof, phase-blockchain]
---

## Trigger keywords

- zero-knowledge / zk / zkp
- groth16 / plonk / stark / plonkish
- circom / noir / halo2 / bellman / arkworks / snarkjs
- zk-rollup / zkrollup / zk rollup
- zkevm / zk evm / evm equivalence
- recursive proof / aggregation / ivc / nifs / pcd
- circuit / constraint / r1cs / acir / ssa / witness
- sequencer / prover / verifier
- zksync / starknet / scroll / polygon zkevm / taiko
- trusted setup / ceremony / toxic waste / crs
- merkle proof / nullifier / commitment / sapling / babyjubjub
- zkapp / zk-application / zk-dapp

## Rules

1. Always identify which phase of blockchain the user is in: if the query is about proofs, circuits, rollups, or zkEVM, tag this skill as `phase-blockchain` → `blockchain-zk`.

2. Distinguish the user's intent: protocol-level (proof system design, circuit DSL choice), infrastructure-level (rollup operator, prover, sequencer), or application-level (zkApp, zk identity, private transfer). Tailor depth accordingly.

3. When asked to compare proof systems, always consider trust assumption (PPTR/transparent), proof size, verification cost (on-chain gas), prover time, and recursive-friendliness. Default to up-to-date 2026 literature.

4. For circuit programming questions, recommend the DSL best suited to the user's context: Circom for EVM-heavy Groth16, Noir for multi-backend abstraction, Halo2 for custom PLONKish gates. Never propose a DSL without stating its tradeoffs.

5. When a user mentions a rollup project (zkSync, StarkNet, Scroll, Taiko, Polygon zkEVM), first classify its zkEVM type (1–4) and its sequencer–prover architecture before answering.

6. Always reference concrete constraints where relevant: proving time, circuit size (number of constraints), gas cost of `verify` on Ethereum L1, and any trusted-setup ceremony size.

7. Security-first: highlight common footguns — underconstrained circuits, missing range checks, oracle manipulation in proofs, toxic waste mishandling, and using `--old` SNARK parameters in production.

## Response Format

When answering with this skill active, structure answers as:

```
## [Topic]
- zkEVM Type / Proof System Category
- DSL recommendation (if applicable)
- Constraints / gas / proving time estimates
- Security considerations
- References to appropriate reference file
```

## Phase: blockchain → blockchain-zk
