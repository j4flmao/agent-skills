---
name: shors-algorithm
description: >
  Use this skill when the user says 'Shor's algorithm', 'quantum factoring', 'period finding', 'break RSA with quantum', 'order finding', 'discrete log quantum', 'how many qubits to break RSA-2048', 'Q-Day estimate'. Explains Shor's reduction from factoring to order finding, the quantum period-finding circuit (modular exponentiation + inverse QFT), classical post-processing with continued fractions, a runnable classical simulation of the logic, and realistic resource estimates for RSA/ECC. Do NOT use for: migration planning to PQC (quantum-computing/post-quantum-crypto), Grover search (quantum-computing/grovers-algorithm), or the QFT/phase-estimation survey (quantum-computing/quantum-algorithms).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [quantum-computing, shors-algorithm, factoring, period-finding, rsa, resource-estimation]
---

# Shor's Algorithm

## Purpose
Shor (1994) showed that a quantum computer can factor integers and compute discrete logarithms in polynomial time, which breaks RSA, Diffie-Hellman, and elliptic-curve cryptography. The quantum part finds the period r of f(x) = aˣ mod N; everything else is classical number theory. This skill explains the algorithm precisely, gives runnable code for the classical parts, and states what current resource estimates say about breaking real keys.

## Agent Protocol

### Trigger
"Shor", "quantum factoring", "order finding", "period finding", "modular exponentiation circuit", "RSA-2048 qubits", "ECC quantum attack", "Q-Day".

### Input Context
- Goal: explanation, toy implementation, or resource/threat assessment.
- Key type and size (RSA-2048, P-256) if assessing threat.

### Output Artifact
Algorithm walkthrough, code for reduction and post-processing, and a sourced resource estimate with assumptions.

### Response Format
```
N = {n}, a = {a}, gcd(a,N) = {g}
Period r = {r} (even? {y/n}; a^{r/2} ≢ −1 mod N? {y/n})
Factors: gcd(a^{r/2} ± 1, N) = {p}, {q}
Quantum resources: {qubits/T-count/runtime} under {error rate, cycle time} (source)
```

### Completion Criteria
- [ ] Classical reduction and failure cases (odd r, a^{r/2} ≡ −1) handled.
- [ ] Continued-fraction step explained for measured phases.
- [ ] Resource numbers cited with their assumptions, not invented.

## The Reduction (classical)
1. Pick random a with 1 < a < N. If g = gcd(a, N) > 1, g is a factor (lucky).
2. Find the order r: smallest r > 0 with aʳ ≡ 1 (mod N). **This is the only quantum step.**
3. If r is even and a^{r/2} ≢ −1 (mod N), then gcd(a^{r/2} − 1, N) and gcd(a^{r/2} + 1, N) are non-trivial factors.
4. Otherwise pick another a; for N with at least two distinct odd prime factors, a random a succeeds with probability ≥ 1/2.

## The Quantum Step: Period Finding
1. Two registers: t ≈ 2n qubits (counting) and n qubits (work), n = ⌈log₂ N⌉.
2. Hadamards on the counting register → uniform superposition over x.
3. Controlled modular exponentiation: |x⟩|1⟩ → |x⟩|aˣ mod N⟩ (implemented as controlled multiplications by a^{2^j} mod N; this dominates circuit cost).
4. Inverse QFT on the counting register; measure y. Then y/2ᵗ ≈ s/r for a random integer s.
5. Recover r with continued fractions of y/2ᵗ (denominator ≤ N); verify aʳ ≡ 1 mod N; repeat a few times and take lcm of candidates if needed.

Equivalently, this is phase estimation of the unitary U|y⟩ = |a·y mod N⟩, whose eigenphases are s/r.

## Runnable Classical Simulation of the Logic

```python
from __future__ import annotations

import math
import random
from fractions import Fraction


def order_classical(a: int, n: int) -> int:
    """Stand-in for the quantum step (exponential time classically)."""
    r, value = 1, a % n
    while value != 1:
        value = (value * a) % n
        r += 1
        if r > n:
            raise ArithmeticError(f"no order found for a={a}, N={n}")
    return r


def period_from_measurement(y: int, t: int, n: int) -> int:
    """Continued-fraction recovery of r from a measured counting-register value."""
    return Fraction(y, 2**t).limit_denominator(n).denominator


def shor_factor(n: int, attempts: int = 20, seed: int = 1) -> tuple[int, int]:
    if n % 2 == 0:
        return 2, n // 2
    rng = random.Random(seed)
    for _ in range(attempts):
        a = rng.randrange(2, n - 1)
        g = math.gcd(a, n)
        if g > 1:
            return g, n // g
        r = order_classical(a, n)
        if r % 2 == 1:
            continue
        x = pow(a, r // 2, n)
        if x == n - 1:
            continue
        p = math.gcd(x - 1, n)
        if 1 < p < n:
            return p, n // p
    raise RuntimeError(f"no factor of {n} found in {attempts} attempts")


print(shor_factor(15), shor_factor(21), shor_factor(3 * 1009))
# For N=15, a=7: r=4, 7^2=49≡4 (mod 15), gcd(3,15)=3, gcd(5,15)=5.
# With t=8 counting qubits, measuring y=192 gives 192/256 = 3/4 -> r=4.
```

## Resource Reality
| Item | Status |
|---|---|
| Largest numbers factored with genuine Shor-style circuits | Tiny (15, 21), using simplified circuits that exploit known answers |
| RSA-2048 estimate (Gidney & Ekerå, 2019) | ~20 million noisy physical qubits, ~8 hours, assuming 10⁻³ gate errors, surface code, 1 µs cycle |
| RSA-2048 estimate (Gidney, 2025) | Under 1 million noisy physical qubits, under a week, same style of assumptions with improved arithmetic and magic-state techniques |
| ECC (e.g. P-256) | Estimates require fewer logical qubits than RSA-2048; elliptic-curve keys are at least as exposed |
| Current hardware | Hundreds to ~a thousand physical qubits, early below-threshold QEC demonstrations; no logical-qubit machine near these scales |

Interpretation: the algorithmic threat is settled; the hardware timeline is uncertain and estimates keep falling as algorithms improve. Hence harvest-now-decrypt-later risk and PQC migration now.

Claims of breaking RSA with annealers or tiny devices typically rely on classical preprocessing or special-form numbers; they do not scale like Shor's algorithm.

## Anti-Patterns
- "Quantum computers try all factors in parallel" (the speedup comes from interference in period finding).
- Quoting qubit counts without error rates, cycle times, and code assumptions.
- Treating demonstrations on 15/21 as evidence of imminent RSA breaks, or dismissing the threat because they are small.

## Checklist
- [ ] Reduction steps and retry conditions correct.
- [ ] Continued-fraction recovery demonstrated.
- [ ] Resource numbers cite source and assumptions.
- [ ] Recommendation links to PQC migration where relevant.

## References
- Shor, "Algorithms for quantum computation: discrete logarithms and factoring" (FOCS 1994); SIAM J. Comput. 1997.
- Gidney & Ekerå, "How to factor 2048 bit RSA integers in 8 hours using 20 million noisy qubits" (Quantum, 2021).
- Gidney, "How to factor 2048 bit RSA integers with less than a million noisy qubits" (2025).
- Nielsen & Chuang, ch. 5.
