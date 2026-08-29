# GitHub Actions CI/CD Architecture

## Core Concepts

GitHub Actions provides native CI/CD. For enterprise systems, pipelines must be modular (Reusable Workflows), optimized (Caching), and secure (OIDC).

### 1. Matrix Builds & Caching
- **Matrix Builds:** Run tests simultaneously across multiple OS/Node versions to save pipeline time.
- **Caching:** Cache dependencies (`npm`, `pip`, Docker layers) to drastically reduce build times. Cache keys must be deterministic (e.g., hash of lockfiles).

### 2. OIDC (OpenID Connect) vs Secrets
Avoid storing long-lived AWS/GCP static credentials in GitHub. Use OIDC to establish trust between GitHub and the Cloud Provider, requesting temporary, short-lived STS tokens.

### Pipeline Architecture Map

```mermaid
%%{init: {"theme": "default", "flowchart": {"useMaxWidth": false}}}%%
flowchart TD
    subgraph Repo ["GitHub Repository"]
        A["Developer Push/PR"]
    end
    
    subgraph Pipeline ["CI Pipeline (GitHub Runners)"]
        B["Checkout Source"]
        C["Restore Cache"]
        D["Lint & Static Analysis (SAST)"]
        E["Unit Tests (Matrix Strategy)"]
        F["Build Container Image"]
    end
    
    subgraph CD_Push ["CD Pipeline & Artifacts"]
        G["OIDC Auth (Assume Role)"]
        H["Push to Container Registry (ECR/GCR)"]
        I["Update GitOps Manifests (Commit)"]
    end
    
    A --> B
    B --> C
    C --> D
    C --> E
    D --> F
    E --> F
    F --> G
    G --> H
    H --> I
```
