# Kernel Bypass (DPDK, AF_XDP)

## 1. Skill Context
**Focus**: Packet processing with low, predictable latency for trading, telco (5G UPF), and network appliances.
**Triggers**: kernel-bypass, dpdk, af-xdp, hft, ultra-low-latency, zero-copy.
**Deep dive**: `skills/niche/hft/kernel-bypass-dpdk/SKILL.md`, `skills/niche/low-level/ebpf-xdp-networking/SKILL.md`.

## 2. Where the Kernel Path Costs Time
On the standard Linux receive path:
1. The NIC DMAs the packet into a kernel ring buffer and raises an interrupt (coalesced, then NAPI polling).
2. The kernel allocates an `sk_buff` and runs the protocol stack (IP, TCP/UDP, netfilter).
3. `recv()` is a syscall that copies the payload into user memory and may wake a sleeping thread, adding scheduler latency.

Each step adds latency and, more importantly for trading, **jitter**. A tuned kernel path reaches single-digit to tens of microseconds; bypass stacks reach low single-digit microseconds or below. Measure on your own hardware with hardware timestamps instead of trusting quoted numbers.

## 3. DPDK (Data Plane Development Kit)
- **User-space drivers**: The NIC is bound to `vfio-pci`, and DPDK's poll-mode driver (PMD) programs it directly from user space.
- **DMA into user memory**: Packets land in pre-allocated `rte_mbuf` pools in hugepage memory. No kernel copy, no per-packet allocation.
- **Polling**: A core isolated with `isolcpus`/`nohz_full` spins on `rte_eth_rx_burst()` instead of waiting for interrupts. That core runs at 100% by design.
- **Zero-copy**: The application parses and forwards packets in place in the mbuf.
- **Cost**: You lose the kernel TCP/IP stack and standard tools (tcpdump, iptables), and the OS can no longer use the NIC. You need your own or a user-space network stack.

## 4. Alternatives
| Option | Trade-off |
|---|---|
| AF_XDP sockets | Close to bypass speed while the NIC stays under kernel control; an XDP/eBPF program steers packets |
| Onload / ef_vi (AMD Solarflare), NVIDIA VMA | Socket-API-compatible bypass; vendor-specific |
| `SO_BUSY_POLL`, IRQ affinity, RSS tuning | Cheapest first step; stays on the kernel stack |
| RDMA (RoCE/InfiniBand) | Host-to-host memory access, not general packet processing |
