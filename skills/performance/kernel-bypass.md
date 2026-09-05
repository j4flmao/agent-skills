# Kernel Bypass (DPDK)

## 1. Skill Context
**Focus**: Ultra-low latency network processing for High-Frequency Trading (HFT) and telco infrastructure.
**Triggers**: kernel-bypass, dpdk, hft, ultra-low-latency, zero-copy.

## 2. The Linux Network Penalty
In standard networking, when a packet hits the NIC:
1. The NIC fires a hardware interrupt.
2. The CPU context-switches to kernel space.
3. The kernel copies the packet from hardware to a socket buffer (sk_buff).
4. The kernel copies the packet AGAIN from kernel space to user space memory.
This entire process takes ~50 microseconds. In HFT, you lose millions if a trade takes more than 5 microseconds.

## 3. DPDK (Data Plane Development Kit)
DPDK eliminates the OS kernel from the critical path entirely.
- **Direct Memory Access (DMA)**: The NIC writes packets directly into user-space RAM. No kernel copying.
- **Polling Mode Driver (PMD)**: Instead of waiting for an interrupt (which takes precious time), a dedicated CPU core runs an infinite while(1) loop, constantly polling the NIC's memory buffer for new packets.
- **Zero-Copy**: The application processes the packet directly in the DMA buffer and sends it out without ever copying the memory.
