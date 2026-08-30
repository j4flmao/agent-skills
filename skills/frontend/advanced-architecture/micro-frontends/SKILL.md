# Micro-frontends & Module Federation

## Core Architecture

Micro-frontends extend the concepts of microservices to the frontend world. Instead of a monolithic SPA (Single Page Application), the UI is composed of independent, deployable fragments.

### 1. Webpack Module Federation
Introduced in Webpack 5, Module Federation allows a JavaScript application to dynamically load code from another application at runtime. 
- **Host:** The main shell application.
- **Remote:** The micro-frontend exposing specific components or routes.
- **Shared Dependencies:** React or Lodash can be marked as shared, so the browser downloads them only once, preventing bundle bloat.

### Architecture Map

```mermaid
%%{init: {"theme": "default", "flowchart": {"useMaxWidth": true}}}%%
flowchart TD
    subgraph Browser ["User Browser"]
        A["App Shell (Host)"]
        B["Header Component (Remote A)"]
        C["Cart Component (Remote B)"]
    end
    
    subgraph CDN ["CDN Deployment"]
        D["Host Bundle (Webpack)"]
        E["Team A Bundle (Webpack)"]
        F["Team B Bundle (Webpack)"]
    end
    
    A -->|"Fetch Initial HTML/JS"| D
    A -.->|"Dynamic Import (Runtime)"| E
    A -.->|"Dynamic Import (Runtime)"| F
    
    E -.->|"Exposes"| B
    F -.->|"Exposes"| C
```
