# CPU Architecture & Microarchitecture

## 1. Skill Context
**Focus**: Understanding the physical hardware that executes your code. Without knowing how the CPU Pipeline, Branch Predictor, and Cache work, you cannot write high-performance systems code.
**Triggers**: cpu, microarchitecture, pipeline, branch-prediction, out-of-order, superscalar.

## 2. The Illusion of Sequential Execution
When you write C code, you assume it executes line-by-line, sequentially. Modern CPUs (x86_64, ARM64) do not work this way. They are **Superscalar, Out-of-Order** execution engines.

### A. The CPU Pipeline
A CPU breaks instruction execution into stages (e.g., Fetch, Decode, Execute, Memory, Write-back). 
Instead of waiting for an instruction to finish all 5 stages before starting the next one, the CPU overlaps them (Pipelining). While Instruction 1 is executing, Instruction 2 is being decoded, and Instruction 3 is being fetched.

### B. Out-of-Order Execution (OoOE)
If Instruction 1 is waiting for data from a slow RAM read, the CPU does not halt. It looks ahead in the compiled code, finds instructions that do not depend on Instruction 1, and executes them immediately. The CPU then reorders the results at the very end to make it *appear* sequential.

## 3. Branch Prediction
Because of deep pipelines, conditional jumps (`if` statements) are dangerous. If the CPU waits to evaluate the `if` condition, the pipeline stalls.
Instead, the CPU **guesses** the outcome of the branch (Branch Prediction) and speculatively executes the code path.

- **Prediction Hit**: The CPU guessed right. Zero performance penalty.
- **Prediction Miss (Pipeline Flush)**: The CPU guessed wrong. It must throw away all the speculative work, flush the pipeline, and start over on the correct path. This costs 15-20 CPU cycles.

*Performance Rule*: Unpredictable `if` statements inside tight loops destroy performance. (This is why sorting an array before processing it with an `if(value > 128)` makes the code run 6x faster—the branch predictor achieves ~100% accuracy).

## 4. References
- `references/cache-hierarchy.md` — L1/L2/L3 caches and MESI Coherence.
- `references/tlb-and-paging.md` — Virtual Memory and Translation Lookaside Buffers.
