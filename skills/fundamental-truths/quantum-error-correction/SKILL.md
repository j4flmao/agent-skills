---
name: fundamental-quantum-error-correction
description: >
  Use this skill when the user says 'why quantum error correction', 'logical vs physical qubits', 'threshold theorem', 'fault tolerance overhead', 'below threshold', 'how many physical qubits per logical qubit', 'magic state distillation', 'when will quantum computers be useful'. Conceptual foundations of QEC: noise models, why redundancy works despite no-cloning, the threshold theorem, code distance and overhead scaling, fault-tolerant gate sets, and how to read hardware milestone claims. Do NOT use for: hands-on stabilizer circuits and decoders with Stim/PyMatching (quantum-computing/quantum-error-correction), gate basics (quantum-computing/qubits-and-gates), or cryptographic timelines (quantum-computing/post-quantum-crypto).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [fundamental-truths, quantum-error-correction, fault-tolerance, logical-qubits, threshold]
---

# Quantum Error Correction: Foundations

## Purpose
Physical qubits fail far too often for long algorithms: today's best two-qubit gate error rates are around 10⁻³, while algorithms such as Shor's need roughly 10⁹ or more operations. QEC encodes each logical qubit in many physical qubits and repeatedly measures parities to detect and correct errors, so logical error rates fall exponentially with code size once physical errors are below a threshold. This skill explains the principles and how to reason about overheads and milestone claims.

## Agent Protocol

### Trigger
"quantum error correction", "logical qubit", "physical qubits per logical", "threshold theorem", "fault-tolerant quantum computing", "below threshold", "code distance", "magic states", "QEC roadmap claims".

### Input Context
- Question type: conceptual explanation, overhead estimate, or evaluating a vendor/paper claim.
- Assumed physical error rate, code family, target logical error rate.

### Output Artifact
Explanation with the scaling relations, a worked overhead estimate, and a checklist for evaluating claims.

### Response Format
```
Physical error p: {value}  Threshold p_th: {~1% for surface code}
Target logical error per round: {value}  Λ = p_th/p ≈ {value}
Distance d ≈ {value}  Physical qubits/logical ≈ 2d² − 1 = {n}
Caveats: {non-Pauli noise, leakage, correlated errors, decoder speed}
```

### Completion Criteria
- [ ] Distinguishes physical, logical, and algorithmic qubit counts.
- [ ] States assumptions (noise model, code, decoder).
- [ ] Overhead estimate shows its formula.

## Why QEC Is Possible
- **No-cloning** forbids copying an unknown state, but QEC never copies: it entangles the logical state across many qubits so that information is stored non-locally.
- **Discretization of errors**: any single-qubit error is a combination of I, X, Y, Z. Measuring stabilizers projects arbitrary small errors onto discrete Pauli errors, so correcting Paulis corrects everything (to first order).
- **Syndrome measurement**: ancilla qubits measure parities (stabilizers) of data qubits; the outcomes reveal *where* errors are without revealing the encoded information.
- **Classical decoding**: a decoder maps syndromes over time to the most likely correction, applied physically or tracked in software (Pauli frame).

## Error Types
| Error | Effect |
|---|---|
| Bit flip (X) | Swaps |0⟩ and |1⟩ |
| Phase flip (Z) | Flips relative sign; no classical analogue |
| Y | Both |
| Measurement error | Wrong syndrome bit; handled by repeating rounds (space-time decoding) |
| Leakage | Qubit leaves the computational subspace; needs leakage-reduction circuits |
| Correlated errors (crosstalk, cosmic rays) | Break independence assumptions; can defeat codes |

## Threshold Theorem
If the physical error rate per operation p is below a threshold p_th (and noise is sufficiently local and uncorrelated), arbitrarily long computations are possible with overhead growing only polylogarithmically in the computation size. For the surface code under circuit-level depolarizing noise, p_th is around 1%.

Heuristic scaling for the surface code:
```
p_L ≈ A · (p / p_th)^((d+1)/2)
Λ   = p_L(d) / p_L(d+2) ≈ p_th / p      (error suppression factor per distance step of 2)
```
Rotated surface code uses d² data qubits + (d² − 1) measure qubits = 2d² − 1 physical qubits per logical qubit.

**Worked estimate**: p = 0.1%, p_th ≈ 1% → Λ ≈ 10. Starting from p_L ≈ 3% at d = 3, reaching 10⁻¹² per round needs about 10 more factors of 10, i.e. d ≈ 23 → ~1,000 physical qubits per logical qubit. With Λ ≈ 2 the same target would need d in the 70s (roughly 10,000+ physical qubits per logical qubit), which is why lowering p matters so much. These are order-of-magnitude numbers; real estimates depend on noise details and decoders.

## Milestones and How to Read Them
- Google's Willow processor (2024) reported below-threshold surface-code memory: logical error per cycle fell by a factor of about 2 each time distance increased by 2 (d = 3 → 5 → 7). This shows exponential suppression has begun, but Λ ≈ 2 is far from the Λ ≈ 10 assumed in many resource estimates.
- Other platforms (trapped ions, neutral atoms) have demonstrated small logical-qubit arrays and logical gates with different codes; compare like with like.

Questions to ask of any claim:
1. Memory (idle) logical qubit, or logical *gates* including non-Clifford?
2. Error per cycle/round, per gate, or after post-selection (discarding runs)?
3. Is decoding real-time (fast enough for feedback) or offline?
4. How many physical qubits, which code, what distance?

## Fault-Tolerant Computation
- Clifford gates (H, S, CNOT) are relatively cheap in surface codes (lattice surgery, transversal or code deformation).
- Universality needs a non-Clifford gate (T). Common approach: **magic state distillation** or **cultivation**, which consumes many physical qubits and time; T-count often dominates algorithm cost.
- Other codes (color codes, qLDPC/bivariate bicycle codes) promise lower qubit overhead but need longer-range connectivity.

## Practical Takeaways
- Resource estimates (e.g. for factoring RSA-2048) are quoted in physical qubits and runtime under assumed p, cycle time, and code; small changes in assumptions move results by large factors.
- "Number of qubits" headlines without error rates say little about computational power.
- Near-term devices without full QEC rely on error mitigation (zero-noise extrapolation, probabilistic error cancellation), which scales poorly with circuit size.

## Anti-Patterns
- Equating physical qubit count with capability.
- Treating threshold as a hard cliff instead of a scaling regime.
- Ignoring decoder latency and leakage in feasibility estimates.
- Quoting overhead ratios ("1,000 physical per logical") without stating p and target p_L.

## Checklist
- [ ] Noise model and p stated.
- [ ] Code, distance, and qubit count formula shown.
- [ ] Logical error target tied to algorithm size.
- [ ] Milestone claims checked against the four questions above.

## References
- Shor, "Scheme for reducing decoherence in quantum computer memory" (1995); Steane (1996).
- Aharonov & Ben-Or (1997); Knill, Laflamme & Zurek (1998) — threshold theorem.
- Fowler et al., "Surface codes: Towards practical large-scale quantum computation" (PRA 2012).
- Google Quantum AI, "Quantum error correction below the surface code threshold" (Nature, 2024/2025).
