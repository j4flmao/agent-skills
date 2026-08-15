---
name: Quantum Error Correction
description: Surface codes, syndrome measurement, and topological qubits mechanics.
---
# Quantum Error Correction (QEC)

QEC protects fragile quantum information from decoherence and environmental noise using logical qubits encoded across multiple physical qubits.

## Surface Codes and Topological Qubits
Surface codes are a class of stabilizer codes mapped onto a 2D lattice.
- Qubits are placed on the edges of the lattice.
- Star (vertex) operators $A_v = \prod_{i \in \text{star}} X_i$ and plaquette operators $B_p = \prod_{i \in \text{boundary}} Z_i$ form the stabilizer generators.

## Syndrome Measurement
Error detection occurs without measuring the logical state via syndrome extraction circuits using ancillary measure qubits.

```mermaid
flowchart TD
%%{init: {"theme": "default", "themeVariables": {"fontSize": "28px"}, "flowchart": {"useMaxWidth": false}}}%%
    subgraph SyndromeExtractionSyndromeExtraction ["Syndrome Extraction<br/>"]
        Data[Data Qubits] -->|"CNOT(Data, Ancilla)"| Ancilla[Measure Qubit]
        Ancilla -->|"Measure(Z)"| Syndrome[Syndrome Graph]
    end
    subgraph DecoderMWPMDecoder ["MWPM Decoder<br/>"]
        Syndrome -->|"MapToGraph()"| Match[Minimum Weight Perfect Matching]
        Match -->|"ApplyCorrection()"| Recovery[Recovery Operations]
    end
```

### Decoder Topology
The Minimum Weight Perfect Matching (MWPM) algorithm pairs any detected error defects (anyons) in the space-time syndrome graph.
