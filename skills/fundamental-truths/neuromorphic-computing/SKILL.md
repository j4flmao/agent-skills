---
name: neuromorphic-computing
description: >
  Use this skill when the user says 'neuromorphic', 'spiking neural network', 'SNN', 'LIF neuron', 'Loihi', 'SpiNNaker', 'event camera', 'surrogate gradient', 'snnTorch', 'Lava framework', 'memristor in-memory computing'. Explains event-driven spiking computation, neuron models, training methods (surrogate gradients, ANN-to-SNN conversion), hardware platforms, and when neuromorphic approaches are worth prototyping. Do NOT use for: conventional GPU deep learning (ml/deep-learning), edge inference on MCUs with standard networks (embedded-systems/edge-ai), or quantum hardware (quantum-computing/*).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [fundamental-truths, neuromorphic-computing, snn, spiking, event-driven, loihi]
---

# Neuromorphic Computing

## Purpose
Neuromorphic systems compute with sparse, asynchronous spikes and keep state (membrane potentials, synaptic weights) close to where it is used, aiming at very low energy for always-on sensing and temporal processing. They are a research and niche-deployment area: promising for event-camera vision, keyword spotting, and low-power control, but tooling is immature and accuracy on standard benchmarks usually trails conventional deep networks. This skill sets realistic expectations and gives working entry points.

## Agent Protocol

### Trigger
"spiking neural network", "SNN", "LIF", "neuromorphic chip", "Loihi", "SpiNNaker", "event camera", "DVS", "surrogate gradient", "snnTorch", "Lava", "memristor crossbar".

### Input Context
- Task (classification, detection, control), data modality (event streams vs frames vs audio).
- Power/latency constraints and target hardware (GPU simulation, Loihi 2 via research access, SpiNNaker 2, other).
- Baseline accuracy from a conventional model.

### Output Artifact
Feasibility assessment, encoding and neuron model choice, training approach, framework/hardware plan, and comparison metrics.

### Response Format
```
Task: {x}  Data: {events|frames|audio}  Constraint: {power/latency}
Encoding: {rate|latency/temporal|direct event input}
Neuron: {LIF (beta=...)}  Training: {surrogate gradient BPTT|ANN-to-SNN conversion}
Framework: {snnTorch|Norse|SpikingJelly|Lava|Brian2/NEST (neuroscience)}
Target: {GPU simulation|Loihi 2|SpiNNaker 2|other}
Compare: accuracy, spikes/inference, latency, measured energy vs ANN baseline
```

### Completion Criteria
- [ ] Conventional baseline exists for comparison.
- [ ] Energy claims based on measurement or hardware-specific models, not assumptions.
- [ ] Input encoding matches the data (events stay events).
- [ ] Timesteps, spike counts, and accuracy reported together.

## Concepts
- **Spikes**: neurons emit binary events when their membrane potential crosses a threshold; information lives in spike timing and rates.
- **Leaky integrate-and-fire (LIF)**: `U[t+1] = β·U[t] + W·X[t+1] − S[t]·θ`; spike `S[t] = 1` if `U[t] > θ`, then reset (subtract or to zero). β ∈ (0,1) is the leak (decay).
- **Event-driven computation**: work happens only when spikes arrive; with high sparsity this saves energy on hardware designed for it. On GPUs, SNNs are usually simulated densely and are often *less* efficient than ANNs.
- **Address-Event Representation (AER)**: spikes are transmitted as (neuron address, time) packets over an on-chip network.
- **Local learning**: spike-timing-dependent plasticity (STDP) and other local rules enable on-chip learning; supervised accuracy today mostly comes from surrogate-gradient training.
- **In-memory computing**: memristor/ReRAM crossbars perform analog multiply-accumulate where weights are stored; an active research area with device variability, drift, and ADC overhead challenges, separate from (but often discussed alongside) spiking chips.

## Training Approaches
| Method | Idea | Pros | Cons |
|---|---|---|---|
| Surrogate gradient + BPTT | Replace the non-differentiable spike step with a smooth surrogate in the backward pass | Best accuracy for direct training; low latency possible | Memory grows with timesteps |
| ANN-to-SNN conversion | Train ReLU ANN, map activations to firing rates | Reuses ANN tooling | Needs many timesteps; latency |
| Local plasticity (STDP) | Unsupervised, biologically inspired | On-chip learning | Lower accuracy on benchmarks |

## snnTorch Example

```python
from __future__ import annotations

import torch
import torch.nn as nn
import snntorch as snn
from snntorch import surrogate


class SpikingMLP(nn.Module):
    def __init__(self, n_in: int, n_hidden: int, n_out: int, beta: float = 0.9) -> None:
        super().__init__()
        grad = surrogate.fast_sigmoid(slope=25)
        self.fc1 = nn.Linear(n_in, n_hidden)
        self.lif1 = snn.Leaky(beta=beta, spike_grad=grad)
        self.fc2 = nn.Linear(n_hidden, n_out)
        self.lif2 = snn.Leaky(beta=beta, spike_grad=grad)

    def forward(self, x_seq: torch.Tensor) -> torch.Tensor:
        """x_seq: [time, batch, features] (spikes or currents). Returns output spikes [time, batch, out]."""
        mem1, mem2 = self.lif1.init_leaky(), self.lif2.init_leaky()
        out = []
        for x in x_seq:
            spk1, mem1 = self.lif1(self.fc1(x), mem1)
            spk2, mem2 = self.lif2(self.fc2(spk1), mem2)
            out.append(spk2)
        return torch.stack(out)

# Rate-coded classification: predicted class = argmax of spike counts over time.
# loss = snntorch.functional.ce_rate_loss()(spk_out, targets)
```

Device selection follows the usual rule (CUDA → MPS → CPU); simulation cost scales with timesteps × network size.

## Hardware Landscape
| Platform | Notes |
|---|---|
| Intel Loihi 2 | Research chip (2021); programmable neurons; Lava open-source framework; large systems such as Hala Point (2024) |
| SpiNNaker / SpiNNaker 2 | Many ARM cores with spike-routing fabric; large-scale neural simulation |
| IBM TrueNorth (2014) | Early digital neuromorphic chip; NorthPole (2023) is a related low-power inference chip but not spiking |
| Commercial edge devices | e.g. BrainChip Akida, SynSense chips for low-power sensing |
| Event cameras (DVS) | Sensors emitting per-pixel brightness-change events; natural SNN input |

Availability and SDKs change; verify current access programs before planning.

## When to Prototype
- Input is already event-based (DVS cameras, some audio front-ends) or temporally sparse.
- Hard power budget (always-on sensing) where measured energy matters more than peak accuracy.
- Research goals around on-chip learning or brain simulation.

Otherwise, a quantized conventional network on an NPU/MCU is usually the pragmatic choice.

## Anti-Patterns
- Claiming energy wins from GPU-simulated SNNs.
- Converting static images to spikes with many timesteps and calling it efficient.
- Reporting accuracy without timesteps/latency.
- Ignoring device non-idealities when proposing memristor designs.

## Checklist
- [ ] ANN baseline and target metrics defined.
- [ ] Encoding and neuron parameters justified.
- [ ] Surrogate-gradient or conversion pipeline reproducible.
- [ ] Spike sparsity, timesteps, latency, accuracy reported.
- [ ] Energy measured on target hardware (or clearly labelled as estimated).

## References
- Maass, "Networks of spiking neurons: the third generation of neural network models" (1997).
- Neftci, Mostafa & Zenke, "Surrogate Gradient Learning in Spiking Neural Networks" (IEEE Signal Processing Magazine, 2019).
- Eshraghian et al., "Training Spiking Neural Networks Using Lessons From Deep Learning" (Proc. IEEE, 2023; snnTorch).
- Davies et al., "Loihi: A Neuromorphic Manycore Processor with On-Chip Learning" (IEEE Micro, 2018).
