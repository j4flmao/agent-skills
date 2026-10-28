# Service Mesh Fundamentals

A service mesh moves service-to-service networking concerns (mTLS, retries, timeouts, traffic shifting, telemetry) out of application code into infrastructure. This reference covers what a mesh does, data plane models (sidecar, ambient/node proxies, sidecarless eBPF), when a mesh is worth it, and core concepts. Product-specific guides: `istio-patterns.md`, `linkerd-patterns.md`.

## What a Mesh Provides

| Capability | Without mesh | With mesh |
|------------|--------------|-----------|
| Encryption in transit | Per-app TLS config and cert management | Automatic mTLS with rotated workload certificates |
| Service identity | IPs, shared secrets | Cryptographic identity (SPIFFE IDs bound to service accounts) |
| Authorization | App code | Policy on identity, path, method |
| Retries, timeouts | Libraries per language (Resilience4j, Polly) | Proxy configuration |
| Traffic shifting | DNS/LB tricks | Weighted routing for canaries, mirroring |
| Telemetry | Per-app instrumentation | Uniform L4/L7 metrics and trace spans from proxies |

A mesh does not replace application-level tracing context propagation: apps must still forward trace headers for end-to-end traces.

## Architecture

```
Control plane (istiod / linkerd control plane / cilium operator)
   │ config, certificates, service discovery
   ▼
Data plane proxies (Envoy, linkerd2-proxy, ztunnel, eBPF + Envoy)
   │ intercept traffic between workloads
   ▼
Workloads
```

## Data Plane Models

| Model | How | Examples | Trade-offs |
|-------|-----|----------|-----------|
| Sidecar | Proxy container injected into every pod | Istio sidecar mode, Linkerd | Full L7 per pod; extra CPU/memory per pod; injection and restart required |
| Ambient (node L4 + optional L7 waypoints) | Per-node ztunnel for mTLS/L4; waypoint proxies for L7 per namespace/service | Istio ambient mode (GA since Istio 1.24) | Lower overhead, no pod restarts to enroll; L7 features only via waypoints |
| eBPF + per-node proxy | Kernel datapath plus shared Envoy for L7 | Cilium service mesh | Integrated with CNI; L7 via node proxy |

## When You Need a Mesh

Good fit:
- Many services and teams; mTLS and identity-based policy required (zero trust, compliance).
- Need consistent traffic management (canary, retries, timeouts) across languages.
- Desire uniform golden-signal telemetry without changing every app.

Probably not yet:
- A handful of services in one language with a good shared library.
- No team capacity to operate and upgrade the mesh.
- Strict latency budgets where every proxy hop matters (measure first).

Alternatives for partial needs: Kubernetes Gateway API at the edge only, CNI with encryption (WireGuard in Cilium/Calico) for transparent encryption without L7, libraries for resilience.

## Core Concepts

| Concept | Meaning |
|---------|---------|
| Workload identity | Certificate identity per service account (SPIFFE `spiffe://<trust-domain>/ns/<ns>/sa/<sa>`) |
| mTLS mode | Permissive (accepts plaintext and mTLS, for migration) vs strict |
| Ingress / egress gateways | Controlled entry and exit points |
| Traffic policy | Routing rules, retries, timeouts, circuit breaking/outlier detection |
| Authorization policy | Allow/deny by source identity, namespace, path, method |
| Telemetry | Proxy metrics (requests, latency, bytes), access logs, trace spans |

## Gateway API

The Kubernetes Gateway API (`Gateway`, `HTTPRoute`, `GRPCRoute`) is the common configuration model for ingress and, via the GAMMA initiative, for mesh (east-west) routing in Istio, Linkerd and Cilium. Prefer it over vendor-specific CRDs when it covers your needs.

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata: { name: reviews-canary, namespace: shop }
spec:
  parentRefs:
    - { group: "", kind: Service, name: reviews }   # mesh (GAMMA) attachment
  rules:
    - backendRefs:
        - { name: reviews-v1, port: 9080, weight: 90 }
        - { name: reviews-v2, port: 9080, weight: 10 }
```

## Resilience Settings: Use Carefully

- Timeouts: set per route, shorter than the caller's own timeout.
- Retries: only for idempotent requests and retriable failures; set a budget. Retries at both the app and the mesh multiply load.
- Outlier detection: eject failing endpoints temporarily.

## Adoption Path

1. Install the mesh in a non-production cluster; measure latency and resource overhead.
2. Enroll namespaces gradually with mTLS in permissive mode.
3. Verify telemetry and connectivity; fix apps that break (e.g. server-first protocols, non-HTTP traffic).
4. Switch to strict mTLS per namespace.
5. Add authorization policies (default deny, explicit allows).
6. Introduce traffic management for canaries.

## Operational Responsibilities

- Upgrades of control and data planes on the mesh's support schedule (Istio supports a limited window of minor releases).
- Certificate authority management (built-in CA or integration with cert-manager/Vault/cloud CA).
- Capacity: proxy CPU/memory requests.
- Debugging skills: `istioctl analyze`, `istioctl proxy-config`, `linkerd check`, `linkerd viz` (see `mesh-debugging.md`).

## Checklist

- [ ] Clear reasons for adopting a mesh (security, traffic, telemetry)
- [ ] Data plane model chosen (sidecar, ambient, eBPF) with measured overhead
- [ ] Gradual enrollment, permissive then strict mTLS
- [ ] Default-deny authorization with explicit allows
- [ ] Timeouts and retry budgets coordinated with app-level settings
- [ ] Gateway API used where supported
- [ ] Upgrade and CA management owned by a team
