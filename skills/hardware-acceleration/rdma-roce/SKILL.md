---
name: rdma-roce
description: >
  Use this skill when the user says 'rdma', 'roce', 'rocev2', 'infiniband', 'gpudirect rdma', 'ibverbs', 'pfc', 'ecn', 'dcqcn', 'lossless ethernet', 'nccl ib', 'queue pair'. Explains the RDMA verbs data path and RoCEv2 encapsulation, and designs/validates GPU cluster fabrics (lossless Ethernet with PFC + ECN/DCQCN, or InfiniBand) for NCCL collective traffic. Do NOT use for: choosing parallelism strategies (distributed-training), general Kubernetes networking or service meshes (devops), TCP application performance.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
tags: [hardware-acceleration, rdma, rocev2, infiniband, gpudirect, nccl, networking]
---

# RDMA and RoCEv2

## Purpose
RDMA lets a NIC read and write registered memory on a remote host without involving the remote CPU or the kernel in the data path. It is the transport under NCCL multi-node collectives. InfiniBand provides it natively with credit-based lossless links; RoCEv2 carries the InfiniBand transport over UDP/IP on Ethernet and depends on careful congestion configuration. Most "slow multi-node training" problems are fabric misconfiguration.

## Agent Protocol

### Trigger
"rdma", "roce", "rocev2", "infiniband", "gpudirect", "ibverbs", "queue pair", "pfc", "ecn", "dcqcn", "lossless ethernet", "NCCL_IB_*", "nccl net/socket".

### Input Context
- NIC model and firmware, switch model, topology (rail-optimized, fat-tree), link speeds.
- GPUs per node, NIC-GPU PCIe affinity, OS/driver stack (MLNX_OFED / DOCA, nvidia-peermem or dma-buf).
- Symptoms: NCCL logs, `nccl-tests` bandwidth, switch counters.

### Output Artifact
Fabric checklist + validation commands + NCCL environment settings. No file unless requested.

### Response Format
```
Transport seen: {IB|RoCEv2|Socket} GDR: {on|off}
Measured: {busbw GB/s} vs expected {GB/s}
Finding: {misconfig}
Fix: {setting} Verify: {command}
```

### Completion Criteria
- [ ] NCCL uses the IB/RoCE transport with GPUDirect RDMA (not Socket).
- [ ] `nccl-tests` bus bandwidth near line rate for large messages.
- [ ] Pause/ECN counters checked under load; no PFC storms.

## Verbs Data Path
1. **Setup (control path, uses kernel):** open device, allocate protection domain, register memory (`ibv_reg_mr`) which pins it and gives the NIC a translation plus local/remote keys (lkey/rkey); create completion queue and queue pair (QP); exchange QP numbers, GIDs and rkeys out of band; transition QP RESET→INIT→RTR→RTS.
2. **Post (data path, user space):** application writes a work queue element (WQE) into the send queue and rings the NIC doorbell (an MMIO write). No system call.
3. **Transmit:** NIC DMA-reads the payload from registered memory (host RAM, or GPU memory with GPUDirect RDMA) and builds packets.
4. **Receive:** remote NIC validates the rkey and bounds for one-sided RDMA WRITE/READ (address and rkey carried in the RETH header) and DMA-writes directly into the target buffer. The remote CPU is not involved.
5. **Complete:** completion queue entries are polled (or event-driven) by the requester.

Operations: SEND/RECV (two-sided), RDMA WRITE, RDMA READ, atomics (one-sided). Transport types: RC (reliable connected, used by NCCL), UC, UD.

## RoCEv2 Packet
`Ethernet | IPv4/IPv6 | UDP (dst port 4791) | IB BTH | [RETH/AETH...] | payload | ICRC | FCS`
Routable over L3. RoCEv1 was L2-only (EtherType 0x8915). Packet sequence numbers in the BTH drive go-back-N style retransmission on loss in many NICs, so packet loss is very costly.

## Congestion Control and Losslessness
| Mechanism | Role |
|-----------|------|
| PFC (802.1Qbb) | Per-priority pause frames make the RoCE traffic class lossless. Risks: head-of-line blocking, pause storms, deadlocks in cyclic topologies. |
| ECN | Switches mark packets above a queue threshold instead of dropping. |
| DCQCN | Receiver turns ECN marks into CNPs; sender NIC reduces rate, then recovers. Default RoCE congestion control on NVIDIA/Mellanox NICs. |
| DSCP / trust mode | Classify RoCE into its own priority queue on NICs and switches consistently. |
InfiniBand instead uses link-level credit-based flow control and its own congestion control. Newer NICs and the Ultra Ethernet effort aim to reduce dependence on PFC (selective retransmission, better congestion control).

## GPUDirect RDMA
- NIC DMA directly to/from GPU memory over PCIe; requires `nvidia-peermem` kernel module or dma-buf support.
- Best when GPU and NIC share a PCIe switch; crossing the CPU root complex/socket interconnect lowers bandwidth. Check with `nvidia-smi topo -m` (PIX/PXB good, SYS bad).
- Rail-optimized clusters: GPU i in every node connects to the same leaf ("rail") switch.

## Validation Commands
```bash
ibv_devinfo                          # devices, port state, link layer (InfiniBand/Ethernet)
show_gids                            # RoCE v1/v2 GID index per port (MLNX_OFED/DOCA tool)
ib_write_bw -d mlx5_0 --use_cuda=0 <server_ip>   # perftest; --use_cuda tests GPUDirect
nvidia-smi topo -m                   # GPU/NIC PCIe affinity
ethtool -S <iface> | grep -iE "pause|ecn|cnp|discard"   # PFC/ECN counters (names vary by driver)
NCCL_DEBUG=INFO ./all_reduce_perf -b 8 -e 8G -f 2 -g 8  # nccl-tests
```
In NCCL logs look for `NET/IB` with `GDRDMA`; `NET/Socket` means RDMA is not being used.

## Common NCCL Settings
| Variable | Use |
|----------|-----|
| `NCCL_IB_HCA` | Restrict to specific HCAs/ports (e.g. `mlx5_0,mlx5_1`). |
| `NCCL_IB_GID_INDEX` | RoCE: select the RoCEv2 GID (often 3, verify with `show_gids`). |
| `NCCL_IB_TC` / `NCCL_IB_SL` | Traffic class / service level matching the lossless queue. |
| `NCCL_SOCKET_IFNAME` | Interface for bootstrap/control traffic. |
| `NCCL_NET_GDR_LEVEL` | Max PCIe distance at which GPUDirect RDMA is used. |
Set them only to correct a measured problem; defaults are usually right on well-configured clusters.

## Anti-Patterns
- Enabling PFC without ECN/DCQCN, or with mismatched priority mapping between NIC and switch.
- Testing only with small messages or a single pair of nodes.
- Wrong GID index (RoCEv1 or IPv4-mapped vs IPv6) giving silent fallback or failed connections.
- MTU mismatch across the path (RoCE path MTU is negotiated per QP; jumbo frames must be end to end).
- Ignoring NIC–GPU NUMA/PCIe affinity.

## References
- InfiniBand Architecture Specification, Annex A17 (RoCEv2).
- Zhu et al., "Congestion Control for Large-Scale RDMA Deployments" (DCQCN, SIGCOMM 2015).
- NVIDIA NCCL environment variable docs; perftest and nccl-tests repositories.
- Related: `../distributed-training/SKILL.md`.
