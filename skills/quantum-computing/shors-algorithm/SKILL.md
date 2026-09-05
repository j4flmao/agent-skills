# Shor's Algorithm

## 1. Skill Context
**Focus**: Understanding the theoretical quantum algorithm that threatens classical asymmetric cryptography.
**Triggers**: shors-algorithm, quantum-computing, prime-factorization, rsa-breaking.

## 2. The RSA Security Premise
RSA encryption relies on a simple mathematical asymmetry: it is trivially easy for a computer to multiply two extremely large prime numbers together (e.g., $P \times Q = N$), but it is practically impossible for a classical computer to take the massive number $N$ and figure out what $P$ and $Q$ were. 
For a 2048-bit RSA key, classical algorithms (like the General Number Field Sieve) would take billions of years to factor it.

## 3. How Shor's Algorithm Works
In 1994, Peter Shor formulated a quantum algorithm that finds the prime factors of an integer in polynomial time. It transforms the problem of factoring into a problem of finding the *period* of a function.

1. **Classical Reduction**: The problem of factoring $N$ is reduced (using classical math) to finding the period of a modular exponential function: $f(x) = a^x \pmod N$.
2. **Quantum Superposition**: The quantum computer creates a massive superposition of all possible values of $x$ simultaneously.
3. **Quantum Fourier Transform (QFT)**: This is the magic step. The quantum computer applies QFT to the superposition. QFT interferes the probability amplitudes—canceling out the wrong answers (destructive interference) and amplifying the correct period (constructive interference).
4. **Measurement**: When the quantum state is measured, it collapses and yields the correct period with extremely high probability.
5. **Classical Extraction**: The period is plugged back into a classical formula (using the Greatest Common Divisor) to extract the prime factors $P$ and $Q$.

## 4. Hardware Limitations
To break RSA-2048, Shor's algorithm requires thousands of *Logical Qubits*. Because quantum states are incredibly fragile and prone to errors (decoherence), creating 1 Logical Qubit requires millions of *Physical Qubits* for error correction. 
Currently, quantum computers only have a few hundred noisy physical qubits. The mathematical threat is absolute, but the hardware is currently decades away.
