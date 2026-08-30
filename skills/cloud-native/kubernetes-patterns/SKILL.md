# Advanced Kubernetes Patterns

## 1. Skill Context
**Focus**: Sidecar, Ambassador, Operator patterns, Admission Webhooks, Node affinity, and workload resiliency.
**Triggers**: k8s patterns, kubernetes operator, mutating webhook, pod disruption budget, advanced scheduling

## 2. Advanced Kubernetes Architecture
The agent must design resilient, self-healing, and highly available Kubernetes deployments.

### Structural Patterns
- **Sidecar Pattern**: Augmenting the main container (e.g., logging agent, OTel collector, proxy).
- **Ambassador Pattern**: A sidecar that proxies network connections to the outside world, handling retries, circuit breaking, and mTLS (e.g., Envoy).
- **Operator Pattern**: Extending the K8s API using Custom Resource Definitions (CRDs) and writing custom controllers (in Go/Rust) to manage complex stateful applications (e.g., running PostgreSQL clusters).

### Resiliency & Scheduling
- **Pod Disruption Budgets (PDBs)**: Preventing cluster administrators or autoscalers from draining nodes if it would drop a deployment below a minimum available threshold (quorum).
- **Taints, Tolerations, and Affinity**: 
  - *Taints*: Repelling pods from specific nodes (e.g., GPU nodes or dedicated tenant nodes).
  - *Affinity*: Attracting pods to specific nodes or ensuring pods from the same deployment do not land on the same physical underlying host (`podAntiAffinity` with `topologyKey: kubernetes.io/hostname`).

### Security & Governance
- **Admission Webhooks**: Using `ValidatingAdmissionWebhook` to reject deployments that violate policy (e.g., running as root) or `MutatingAdmissionWebhook` to automatically inject sidecars or environment variables.

## 3. Output Format
- Provide deeply commented Kubernetes YAML manifests.
- Diagram the communication flow between custom controllers and the API server.
- Focus on zero-downtime deployments and graceful shutdown (e.g., `preStop` hooks and `terminationGracePeriodSeconds`).
