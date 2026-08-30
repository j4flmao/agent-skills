# Docker Internals & Architecture

## Core Concepts

Containers are not VMs; they are isolated processes running on the host OS kernel.

### 1. Namespaces & Cgroups
- **Namespaces:** Provide isolation (PID, NET, MNT, IPC, UTS). A process in a container thinks it has its own isolated OS, filesystem, and network stack.
- **Cgroups (Control Groups):** Provide resource limitation. They restrict how much CPU, Memory, and I/O the container processes can consume.

### 2. OverlayFS (Union File System)
Docker images are built in Read-Only layers. When a container runs, Docker adds a thin Read-Write layer on top. Modifying an existing file triggers a "Copy-on-Write" (CoW) operation.

### Docker Layer Architecture Map

```mermaid
%%{init: {"theme": "default", "flowchart": {"useMaxWidth": true}}}%%
flowchart TD
    subgraph Host ["Linux Host Kernel"]
        A["Namespaces (Isolation)"]
        B["Cgroups (Resource Limits)"]
    end
    
    subgraph ContainerFs ["OverlayFS (Union Mount)"]
        C["Read-Write Layer (Container State)"]
        D["Read-Only Layer 3 (App Code)"]
        E["Read-Only Layer 2 (Dependencies)"]
        F["Read-Only Layer 1 (Base OS - Alpine/Ubuntu)"]
    end
    
    subgraph Process ["Containerized App"]
        G["PID 1 (Main App Process)"]
    end
    
    A -.-> G
    B -.-> G
    G -->|"Reads/Writes via CoW"| C
    C -.->|"Stacks on"| D
    D -.->|"Stacks on"| E
    E -.->|"Stacks on"| F
```
