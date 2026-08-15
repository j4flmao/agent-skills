---
name: Quantum Algorithms
description: Academic reference for Shor's algorithm period finding and Grover's diffusion operator.
---
# Quantum Algorithms: Core Mechanics

## Shor's Algorithm: Period Finding Subroutine
The quantum bottleneck of Shor's algorithm lies in finding the period $r$ of the modular exponentiation function $f(x) = a^x \pmod N$.
1. **Superposition**: Apply Hadamard gates to the first register.
2. **Modular Exponentiation**: Apply the unitary $U|x\rangle|0\rangle = |x\rangle|a^x \pmod N\rangle$.
3. **Quantum Fourier Transform (QFT)**: Extract the phase via QFT on the first register.

## Grover's Diffusion Operator
Grover's algorithm achieves quadratic speedup for unstructured search using amplitude amplification. The diffusion operator $U_s = 2|s\rangle\langle s| - I$ performs inversion about the mean.

```mermaid
flowchart TD
%%{init: {"theme": "default", "themeVariables": {"fontSize": "28px"}, "flowchart": {"useMaxWidth": false}}}%%
    subgraph AmplitudeAmplificationAmplitudeAmplification ["Amplitude Amplification<br/>"]
        Init[Superposition State |s>] --> Phase[Phase Inversion Oracle]
        Phase -->|"ApplyOracle()"| Diffuse[Diffusion Operator]
        Diffuse -->|"InvertMean()"| Measure[Measurement]
        Diffuse -->|"Iterate(O(sqrt(N)))"| Phase
    end
```

### Diffusion Matrix Representation
The matrix elements of $U_s$ are given by $D_{ij} = \frac{2}{N}$ for $i \neq j$ and $D_{ii} = -1 + \frac{2}{N}$.
