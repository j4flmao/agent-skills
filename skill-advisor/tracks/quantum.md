# Quantum Computing Researcher

**Who this is for:** You learn or prototype quantum algorithms and post-quantum migration.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Level 1 — Essentials (3 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`qubits-and-gates`](../../skills/quantum-computing/qubits-and-gates/SKILL.md) | `quantum-computing/qubits-and-gates` | Give precise, checkable foundations: what a qubit state is, how measurement works, the standard gates as matrices, the identities used to simplify… |
| [`quantum-algorithms`](../../skills/quantum-computing/quantum-algorithms/SKILL.md) | `quantum-computing/quantum-algorithms` | Quantum speedups exist for specific structures: periodicity (Shor), unstructured search (Grover), simulating quantum systems, and some… |
| [`qiskit-framework`](../../skills/quantum-computing/qiskit-framework/SKILL.md) | `quantum-computing/qiskit-framework` | Qiskit is IBM's open-source Python SDK for building quantum circuits, compiling (transpiling) them to a backend's native gates and connectivity,… |

## Level 2 — Professional (4 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`grovers-algorithm`](../../skills/quantum-computing/grovers-algorithm/SKILL.md) | `quantum-computing/grovers-algorithm` | Grover's algorithm finds one of M marked items among N = 2ⁿ using about (π/4)√(N/M) oracle calls, versus ~N/M classically: a quadratic, provably… |
| [`shors-algorithm`](../../skills/quantum-computing/shors-algorithm/SKILL.md) | `quantum-computing/shors-algorithm` | Shor (1994) showed that a quantum computer can factor integers and compute discrete logarithms in polynomial time, which breaks RSA,… |
| [`quantum-entanglement`](../../skills/quantum-computing/quantum-entanglement/SKILL.md) | `quantum-computing/quantum-entanglement` | A multi-qubit state is entangled when it cannot be written as a product of individual qubit states. |
| [`quantum-error-correction`](../../skills/quantum-computing/quantum-error-correction/SKILL.md) | `quantum-computing/quantum-error-correction` | Build and evaluate error-correcting codes the way QEC researchers do: describe the code by its stabilizers, generate a noisy syndrome-extraction… |

## Level 3 — Specialist (3 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`fundamental-quantum-error-correction`](../../skills/fundamental-truths/quantum-error-correction/SKILL.md) | `fundamental-truths/quantum-error-correction` | Physical qubits fail far too often for long algorithms: today's best two-qubit gate error rates are around 10⁻³, while algorithms such as Shor's… |
| [`post-quantum-crypto`](../../skills/quantum-computing/post-quantum-crypto/SKILL.md) | `quantum-computing/post-quantum-crypto` | A cryptographically relevant quantum computer (CRQC) running Shor's algorithm would break RSA, finite-field Diffie-Hellman, and elliptic-curve… |
| [`quantum-scientist`](../../skills/personas/quantum-scientist/SKILL.md) | `personas/quantum-scientist` | Adopt the mindset of a Principal Quantum Physicist: reason in superposition, entanglement, and probabilistic (unitary then measured) outcomes… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 only (3 skills):**

```bash
npx skills add j4flmao/agent-skills --skill qubits-and-gates --skill quantum-algorithms --skill qiskit-framework
```

**Level 1 + 2 (7 skills):**

```bash
npx skills add j4flmao/agent-skills --skill qubits-and-gates --skill quantum-algorithms --skill qiskit-framework --skill grovers-algorithm --skill shors-algorithm --skill quantum-entanglement --skill quantum-error-correction
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`quantum-computing`](../bundles.md#quantum-computing) | 12 | Quantum computing: qubits and gates, algorithms (Grover, Shor), Qiskit, error correction, post-quantum cryptography |

## Combine with

- [Zero-Knowledge & Cryptography Engineer](zk.md)
- [ML & AI Engineer](ml-ai.md)

## Watch out

`quantum-computing/quantum-error-correction` and `fundamental-truths/quantum-error-correction` overlap; the first is practical, the second theoretical.
