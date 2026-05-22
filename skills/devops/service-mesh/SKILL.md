---
name: devops-service-mesh
description: |
  Trigger: "service mesh", "Istio", "Linkerd", "Envoy", "sidecar", "mTLS",
  "service-to-service", "mesh traffic", "virtual service", "destination rule",
  "service mesh observability", "mesh security"
  Exclusion: Not for standard K8s networking — use kubernetes-patterns.
version: 1.0.0
author: j4flmao
license: MIT
compatibility:
  cli: true
  core: true
  editor: true
  api: true
tags: [devops, service-mesh, networking, phase-7]
---

# devops-service-mesh

## Purpose

Install, configure, and operate a service mesh (Istio or Linkerd) for
traffic management, mTLS security, observability, and resilience patterns
in Kubernetes.

## Agent Protocol

### Trigger

Any user message referencing service mesh, Istio, Linkerd, sidecar
injection, mTLS, VirtualService, DestinationRule, or mesh observability.

### Input Context

Mesh provider preference, cluster size, security requirements, existing
networking setup, K8s version, resource constraints.

### Output Artifact

Mesh installation commands (istioctl/linkerd CLI), sidecar injection config,
traffic management VirtualService/DestinationRule YAML, mTLS policy,
AuthorizationPolicy rules.

### Response Format

CLI commands and YAML manifests with brief explanations.

No preamble. No postamble. No explanations. No filler/hedging/transitions.
Compress output — why use many token when few do trick.

### Completion Criteria

Mesh installed, sidecars injected, mTLS enabled, traffic rules applied,
telemetry flowing, Kiali topology visible.

### Max Response Length

8000 tokens.

## Workflow

### 1. Mesh Selection

Istio — feature-rich, Envoy-based sidecar, steep learning curve, best for
large orgs needing fine-grained control. Linkerd — lightweight, Rust-based
sidecar (linkerd-proxy), simple to operate, lower resource overhead. Consul
— multi-platform, supports VMs + K8s, good for hybrid. Open Service Mesh
— SMI-compliant, lightweight, limited features.

### 2. Sidecar Injection

Namespace label for automatic injection: `istio-injection=enabled` (Istio)
or `linkerd.io/inject=enabled` (Linkerd). Annotations override defaults
per-pod. Sidecar resource limits/requests must be set to avoid OOM.
Sidecar version must match control plane version — upgrade sidecars first
with rolling restart.

### 3. Traffic Management

VirtualService defines routing rules (URI match, header match, weight-based
split). DestinationRule defines load balancing policy, circuit breaker
(max connections, pending requests), and TLS settings. Gateway for ingress
traffic (shared or per-namespace). ServiceEntry for external service access
through mesh.

### 4. Security

mTLS — STRICT mode enforces TLS between all mesh services. PeerAuthentication
sets mTLS mode at namespace/workload level. RequestAuthentication validates
JWT tokens. AuthorizationPolicy — default-deny with explicit allow rules
(principals, namespaces, paths, methods). SPIFFE identities for workload
identity in mTLS certificates.

### 5. Observability

Telemetry — HTTP/gRPC metrics (request count, latency, error rate) via
Prometheus. Access logs — Envoy/Linkerd-proxy logs for request/response
details. Distributed tracing — Zipkin/Jaeger integration via Istio telemetry
v2 or Linkerd tap. Kiali (Istio) or linkerd-viz (Linkerd) for topology
visualization of service graph and health.

## Rules

1. mTLS in STRICT mode for all mesh-internal traffic.
2. Sidecar injection via namespace label — never manual annotations.
3. AuthorizationPolicy default deny with explicit allow rules.
4. Circuit breaker configured for all downstream service calls.
5. Telemetry enabled at mesh level, not per-sidecar override.
6. Sidecar resource limits required — without them sidecars crash under load.
7. Mesh control plane upgraded before data plane (sidecars).
8. Canary upgrades for control plane — one revision at a time.

## References

- [Istio Patterns](./references/istio-patterns.md) — VirtualService,
  DestinationRule, Gateway, mTLS, AuthorizationPolicy
- [Linkerd Patterns](./references/linkerd-patterns.md) — Linkerd setup, mTLS,
  traffic split, multi-cluster, observability

## Handoff

Hand off to service-mesh for Istio/Linkerd operations.
Hand off to kubernetes-patterns for workload manifests.
Hand off to monitoring for Prometheus/Grafana dashboards.
Hand off to security for PKI and certificate management.
