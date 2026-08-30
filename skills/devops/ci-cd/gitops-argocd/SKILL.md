# GitOps with ArgoCD

## Core Concepts

GitOps shifts the paradigm from "Push" (CI server executes deployment commands) to "Pull" (an Agent inside the cluster monitors Git and pulls changes).

### 1. The Pull Model
ArgoCD runs inside Kubernetes. It continuously monitors a target Git repository containing the Desired State (YAML/Helm/Kustomize). If the cluster's Actual State diverges, ArgoCD automatically reconciles it.

### 2. Security Advantage
The CI pipeline no longer needs cluster admin credentials. It only needs permission to commit a new image tag to the config repository. ArgoCD, sitting securely inside the cluster, handles the deployment.

### GitOps Flow Map

```mermaid
%%{init: {"theme": "default", "flowchart": {"useMaxWidth": true}}}%%
flowchart TD
    subgraph CI_Pipeline ["CI Pipeline"]
        A["Build Image"]
        B["Push Image to Registry"]
        C["Commit updated Image Tag"]
    end
    
    subgraph Git_Repos ["Git Repositories"]
        D["App Config Repo (Helm/Kustomize)"]
    end
    
    subgraph Kubernetes ["K8s Cluster"]
        E["ArgoCD Controller (Sync/Monitor)"]
        F["Target Namespace (Pods/Services)"]
    end
    
    A --> B
    B --> C
    C -->|"Push Tag Update"| D
    E -.->|"Poll Git for Desired State"| D
    E -->|"Reconcile (Apply YAML)"| F
```
