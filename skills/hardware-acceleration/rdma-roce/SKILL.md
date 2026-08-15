---
name: rdma_rocev2_hardware_datapath
description: Hardware meta-skill analyzing RDMA & RoCEv2 datapath for zero-copy GPU-to-GPU interconnects over converged ethernet fabrics.
---

# RDMA & RoCEv2: Zero-Copy Silicon Datapaths

## Theoretical Foundations

Remote Direct Memory Access (RDMA) over Converged Ethernet v2 (RoCEv2) is the foundational interconnect protocol for exascale distributed training. It bypasses the traditional TCP/IP kernel stack, eliminating context switches, CPU interrupts, and intermediate buffer copies.

At the silicon level, RoCEv2 encapsulates InfiniBand (IB) transport headers within UDP/IP/Ethernet frames. The network interface card (NIC) hardware implements the entire transport layer. When a GPU initiates a memory write to a remote node, the memory controller (via PCIe or NVLink/NVSwitch) interacts directly with the NIC DMA engine.

## Datapath Analysis

1.  **Work Request Posting**: The sender application posts a Work Queue Element (WQE) to a Send Queue mapped directly in user-space hardware (Doorbell Register).
2.  **DMA Read**: The NIC hardware polls the WQE, parses the virtual address, translates it to a physical address via the IOMMU (or directly via ATS/PRI), and initiates a PCIe DMA Read from the source GPU HBM.
3.  **Encapsulation**: The NIC packet processing pipeline encapsulates the payload with IB Base Transport Header (BTH), UDP, IP, and Ethernet headers. Congestion control (DCQCN) metadata is stamped.
4.  **Network Transit**: The packet traverses Lossless Ethernet switches (PFC/ECN enabled).
5.  **Hardware Decapsulation & DMA Write**: The receiving NIC verifies the packet (ICRC/VCRC checks), extracts the virtual address from the memory payload, and performs a direct PCIe DMA Write to the destination GPU HBM. No kernel intervention occurs.

## Mermaid Flowchart: RoCEv2 GPU-to-GPU Datapath

```mermaid
%%{init: {"theme": "default", "flowchart": {"useMaxWidth": false}}}%%
flowchart TD
    subgraph NodeASenderNodeNodeASenderNode ["Node_A['Sender Node<br><br><br>"]
        direction TB
        GPU_A["GPU HBM (Source Buffer)"]
        PCIe_A["PCIe Switch"]
        NIC_A["RNIC (RoCEv2 Hardware)"]
        
        GPU_A -->|PCIe DMA Read| PCIe_A
        PCIe_A -->|Payload| NIC_A
        NIC_A -->|WQE Polling| Doorbell_A["Doorbell Register"]
    end

    subgraph FabricSpineLeafEthernetFabricFabricSpineLeafEthernetFabric ["Fabric['Spine-Leaf Ethernet Fabric<br><br><br>"]
        direction TB
        ToR_A["ToR Switch (PFC/ECN)"]
        Spine["Spine Switch"]
        ToR_B["ToR Switch (PFC/ECN)"]
        
        ToR_A --> Spine
        Spine --> ToR_B
    end

    subgraph NodeBReceiverNodeNodeBReceiverNode ["Node_B['Receiver Node<br><br><br>"]
        direction TB
        NIC_B["RNIC (RoCEv2 Hardware)"]
        PCIe_B["PCIe Switch"]
        GPU_B["GPU HBM (Dest Buffer)"]
        
        NIC_B -->|PCIe DMA Write| PCIe_B
        PCIe_B -->|Direct Memory Access| GPU_B
    end

    NIC_A -->|UDP/IP Encapsulation| ToR_A
    ToR_B -->|UDP/IP Decapsulation| NIC_B
```
