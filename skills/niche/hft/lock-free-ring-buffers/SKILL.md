---
name: lock-free-ring-buffers
description: >
  Use this skill when the user says 'lock-free', 'ring buffer', 'LMAX Disruptor', 'SPSC/MPMC queue', 'false sharing', 'mechanical sympathy'. Explains lock-free inter-thread communication with ring buffers and cache-aware design. Do NOT use for: kernel-bypass networking (use niche/hft/kernel-bypass-dpdk) or general concurrency primitives.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
tags: [niche, hft, lock-free, ring-buffer, concurrency]
---

# Lock-Free Architecture & Ring Buffers

## Purpose
Explain lock-free inter-thread communication for low-jitter systems: ring-buffer (LMAX Disruptor) design, sequence/claim coordination, and mechanical sympathy - avoiding false sharing and respecting CPU cache lines.

## Agent Protocol

### Trigger
User phrases: "lock-free queue", "ring buffer", "LMAX Disruptor", "false sharing", "cache line padding".

### Input Context
- Producer/consumer counts (SPSC/MPMC).
- Latency and ordering requirements.

### Output Artifact
Queue design with memory-ordering and padding guidance.

### Response Format
```
Pattern: {SPSC | MPMC | Disruptor}
Coordination: {sequence / CAS}
Cache: {pad to 64B, avoid false sharing}
```


## Core Mechanics

Mutexes and Locks pause threads. In HFT systems, locking causes latency spikes (jitter). To process millions of orders per second, architectures must be Lock-Free.

### 1. The LMAX Disruptor
A revolutionary architecture for high-performance inter-thread communication.
- **Ring Buffer:** A pre-allocated, circular array. No garbage collection, no memory allocation during runtime.
- **Sequence Barriers:** Instead of locks, threads track atomic `Sequence` counters to know which slot in the array they are allowed to read or write.

### 2. Mechanical Sympathy (CPU Caches)
The Disruptor respects hardware. By padding data structures to 64 bytes (the size of a CPU Cache Line), it prevents "False Sharing"—a hardware phenomenon where two CPU cores accidentally invalidate each other's cache because they are modifying adjacent variables.

### Ring Buffer Architecture Map

```mermaid
%%{init: {"theme": "default", "flowchart": {"useMaxWidth": true}}}%%
flowchart TD
    subgraph DataStructure ["Pre-allocated Ring Buffer"]
        A["Slot 0"]
        B["Slot 1"]
        C["Slot 2"]
        D["Slot N..."]
    end
    
    subgraph Threads ["Concurrent Lock-Free Access"]
        E["Publisher Thread (Write)"]
        F["Consumer Thread (Read)"]
    end
    
    subgraph Sync ["Atomic Sequences (CAS)"]
        G["Cursor (Head)"]
        H["Consumer Sequence (Tail)"]
    end
    
    E -->|"Claims Slot via CAS"| G
    G -.->|"Write Data"| B
    F -->|"Checks available slots"| H
    H -.->|"Read Data"| A
```
