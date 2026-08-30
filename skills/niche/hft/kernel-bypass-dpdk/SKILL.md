# Kernel Bypass & Ultra-Low Latency (DPDK)

## Core Mechanics

In High-Frequency Trading (HFT), a microsecond is an eternity. Traditional Linux networking is too slow because it relies on hardware interrupts and context switching between Kernel Space and User Space.

### 1. Kernel Bypass (DPDK)
Data Plane Development Kit (DPDK) allows an application to bypass the Linux kernel entirely.
- The NIC writes packet data directly into a memory buffer in User Space via DMA (Direct Memory Access).
- The OS networking stack, iptables, and socket buffers are completely skipped.

### 2. Polling vs Interrupts
Instead of waiting for an interrupt (IRQ) to signal a packet arrived (which costs expensive CPU context switches), the DPDK application dedicates a CPU core to spin in an infinite loop (Polling) checking for new packets. It burns 100% CPU to achieve near-zero latency.

### Kernel Bypass Flow Map

```mermaid
%%{init: {"theme": "default", "flowchart": {"useMaxWidth": true}}}%%
flowchart TD
    subgraph StandardNetwork ["Standard Networking (Slow)"]
        A["NIC Interrupts CPU"]
        B["Kernel TCP/IP Stack"]
        C["Context Switch (Copy to User)"]
        D["Trading App"]
    end
    
    subgraph KernelBypass ["Kernel Bypass (DPDK - Fast)"]
        E["NIC (DMA Write)"]
        F["User Space Memory (HugePages)"]
        G["Trading App (Busy Polling)"]
    end
    
    A --> B
    B --> C
    C --> D
    
    E -->|"Direct Memory Access"| F
    G -.->|"Reads Directly"| F
```
