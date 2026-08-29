# Kubernetes (K8s) Architecture & Deployments

## Core Concepts

Kubernetes is a distributed system for managing container workloads. It consists of a Control Plane (brain) and Data Plane (worker nodes).

### 1. Control Plane vs Worker Nodes
- **Control Plane:** `kube-apiserver` (Entrypoint), `etcd` (Key-Value Store, the absolute source of truth), `kube-scheduler` (Assigns Pods to Nodes), `kube-controller-manager`.
- **Worker Node:** `kubelet` (Agent that ensures containers are running), `kube-proxy` (Network routing/iptables), Container Runtime (containerd).

### 2. Deployment Strategies
- **Rolling Update:** Replaces pods incrementally. Zero downtime.
- **Blue/Green:** Spins up a full duplicate environment (Green), switches traffic instantly at the Load Balancer level.
- **Canary:** Routes a small percentage (e.g., 5%) of traffic to the new version to monitor metrics before full rollout.

### Architecture Map

```mermaid
%%{init: {"theme": "default", "flowchart": {"useMaxWidth": false}}}%%
flowchart TD
    subgraph ControlPlane ["Control Plane (Master)"]
        A["kube-apiserver"]
        B["etcd (State DB)"]
        C["kube-scheduler"]
        D["kube-controller-manager"]
    end
    
    subgraph WorkerNode ["Worker Node (Data Plane)"]
        E["kubelet (Node Agent)"]
        F["kube-proxy (Networking)"]
        G["Container Runtime (containerd)"]
        H["Pod 1"]
        I["Pod 2"]
    end
    
    A <--> B
    A <--> C
    A <--> D
    A <-->|"gRPC/TLS"| E
    E -->|"Instructs"| G
    G -->|"Runs"| H
    G -->|"Runs"| I
    F -.->|"Routes IP traffic"| H
```
