---
name: tpu_systolic_arrays
description: Hardware meta-skill detailing Google's TPU architecture, specifically the Matrix Multiplication Unit (MXU) and Systolic Arrays.
---

# TPU Systolic Arrays: Algorithmic Silicon Design

## Theoretical Foundations

Google's Tensor Processing Unit (TPU) diverges fundamentally from NVIDIA's Single Instruction, Multiple Threads (SIMT) architecture. While SIMT relies on massive multi-threading and immense register file bandwidth to mask memory latency, the TPU leverages a spatial architecture known as a Systolic Array.

In a Systolic Array, data flows synchronously across a tightly coupled grid of Arithmetic Logic Units (ALUs). The core principle is localized data reuse: once a weight or activation is loaded from Static RAM (SRAM) into the array, it propagates bidirectionally through adjacent ALUs over consecutive clock cycles, participating in multiple multiply-accumulate (MAC) operations before exiting the pipeline.

## Silicon Datapath: Matrix Multiplication Unit (MXU)

The MXU is the computational heart of the TPU. It executes dense matrix multiplications without the Von Neumann bottleneck of reading/writing intermediate results to a centralized register file.

1.  **Weight Preload**: Matrix B (Weights) is loaded from High Bandwidth Memory (HBM) into the Unified Buffer (SRAM), then streamed into the MXU grid and held stationary in the local registers of each ALU cell.
2.  **Activation Streaming**: Matrix A (Activations) streams from the Unified Buffer into the left edge of the Systolic Array.
3.  **Wavefront Computation**: On clock cycle `t`, an ALU computes `A_{i,k} * B_{k,j} + PartialSum`, then passes `A` rightward and the `PartialSum` downward for cycle `t+1`.
4.  **Accumulation**: The partial sums cascade vertically down the columns. The final vector of accumulated sums emerges from the bottom of the array into the Accumulators.

By architecting the silicon to match the data dependency graph of matrix multiplication, the MXU achieves near-theoretical peak FLOP/s with drastically reduced instruction fetch and register access overhead compared to general-purpose GPU streaming multiprocessors.

## Mermaid Flowchart: TPU Systolic Array Datapath

```mermaid
%%{init: {"theme": "default", "themeVariables": {"fontSize": "28px"}, "flowchart": {"useMaxWidth": false}}}%%
flowchart TD
    HBM["High Bandwidth Memory (HBM)"]
    UB["Unified Buffer (SRAM)"]
    Control["Control Unit / Instruction Fetch"]
    
    subgraph MXUMatrixMultiplicationUnitSystolicArrayMXUMatrixMultiplicationUnitSystolicArray ["MXUMatrixMultiplicationUnitSystolicArray ['MXU['Matrix Multiplication Unit (Systolic Array)']']"]
        direction TB
        Weight_FIFO["Weight FIFO"]
        Activation_FIFO["Activation FIFO"]
        
        Grid_00["ALU (0,0)"]
        Grid_01["ALU (0,1)"]
        Grid_10["ALU (1,0)"]
        Grid_11["ALU (1,1)"]
        
        Weight_FIFO --> Grid_00
        Weight_FIFO --> Grid_01
        Activation_FIFO --> Grid_00
        Activation_FIFO --> Grid_10
        
        Grid_00 -->|Activation Flow| Grid_01
        Grid_00 -->|Partial Sum Flow| Grid_10
        Grid_10 -->|Activation Flow| Grid_11
        Grid_01 -->|Partial Sum Flow| Grid_11
    end
    
    Accumulators["Accumulators (32-bit FP)"]
    VectorUnit["Vector Unit (Activation Functions)"]

    HBM -->|DMA Transfer| UB
    UB -->|Weights| Weight_FIFO
    UB -->|Activations| Activation_FIFO
    Control -->|VLIW Instructions| MXU
    
    Grid_10 -->|Final Sum| Accumulators
    Grid_11 -->|Final Sum| Accumulators
    
    Accumulators --> VectorUnit
    VectorUnit -->|Output Activations| UB
```
