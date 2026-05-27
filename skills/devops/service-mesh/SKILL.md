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
Install, configure, and operate a service mesh (Istio or Linkerd) for traffic management, mTLS security, observability, and resilience patterns in Kubernetes.

## Agent Protocol

### Trigger
Any user message referencing service mesh, Istio, Linkerd, sidecar injection, mTLS, VirtualService, DestinationRule, or mesh observability.

### Input Context
Mesh provider preference, cluster size, security requirements, existing networking setup, K8s version, resource constraints.

### Output Artifact
Mesh installation commands (istioctl/linkerd CLI), sidecar injection config, traffic management VirtualService/DestinationRule YAML, mTLS policy, AuthorizationPolicy rules.

### Response Format
CLI commands and YAML manifests with brief explanations.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
Mesh installed, sidecars injected, mTLS enabled, traffic rules applied, telemetry flowing, Kiali topology visible.

### Max Response Length
8000 tokens.

## Components

### Istio Architecture in Depth
Pilot: service discovery abstraction (bridges K8s services to Envoy), traffic management rule conversion (VirtualService/DestinationRule -> Envoy filter config), Envoy xDS protocol for dynamic configuration push. No longer requires Mixer. Citadel: SPIFFE-compatible certificate authority, issues X.509 certificates with 24h TTL to every sidecar, auto-rotation before expiry, supports integration with external CA (cert-manager, Vault). Galley: validates all Istio CRDs before persistence, ingests platform state (services, endpoints, pods) and distributes to Pilot. Validation webhook prevents invalid config from being applied. Envoy sidecar: L4/L7 proxy, implements routing rules, mTLS, circuit breakers, retries, timeouts, rate limiting, access logging, telemetry generation (metrics, traces, logs). Ingress gateway: dedicated Envoy at mesh edge, handles TLS termination, mTLS passthrough, traffic routing to internal services. Egress gateway: dedicated Envoy for outbound traffic with policy enforcement, TLS origination, and audit logging.

### Traffic Management CRDs
VirtualService: hosts (service DNS names), http/tcp routes (match: uri, headers, method, query params), route (destination host, subset, weight, port), fault injection (abort with HTTP status, delay with fixed/exponential duration), mirror (shadow traffic to another destination), retries (attempts, perTryTimeout, retryOn), timeout, corsPolicy. DestinationRule: host, trafficPolicy (loadBalancer: ROUND_ROBIN/LEAST_REQUEST/RANDOM/PASSTHROUGH, connectionPool: tcp/http settings, outlierDetection: consecutive errors, interval, baseEjectionTime, maxEjectionPercent, minHealthPercent), subsets (name + labels for version routing), tlsSettings (ISTIO_MUTUAL, DISABLE, SIMPLE). Gateway: selector (which Envoy deployment), servers (port, protocol, TLS mode, hosts). ServiceEntry: hosts, ports, resolution (DNS/STATIC/NONE), location (MESH_INTERNAL/MESH_EXTERNAL).

### Canary and Blue-Green CRDs
Canary: VirtualService weight-based routing — two subsets (v1, v2) in DestinationRule, gradual weight shift from v1 to v2. Rollback by shifting weight back. Combine with Kiali metrics monitoring for automated weight progression. Blue-green: VirtualService routes all traffic to active subset, new version deployed alongside, switch virtual service to point at new version, monitor, rollback by switching back. Both patterns use Argo Rollouts for automation with metrics-based promotion, or Flagger for automated canary analysis with Prometheus queries.
Pilot: traffic management, converts VirtualService/DestinationRule into Envoy config, handles service discovery. Mixer (deprecated, replaced by telemetry v2/extensions): policy enforcement and telemetry collection — now handled by Envoy filters and WASM extensions. Citadel: certificate issuance and rotation for mTLS, SPIFFE-compatible workload identities. Galley: configuration validation, ingestion, and distribution to mesh components — validates Istio CRDs before applying. Envoy sidecar: L4/L7 proxy handles all inbound/outbound traffic, applies routing rules, mTLS, circuit breakers, telemetry. Ingress/Egress gateways: Envoy-based edge proxies for inbound and outbound traffic management.

### 2. Sidecar Injection
Namespace label for automatic injection: `istio-injection=enabled` (Istio) or `linkerd.io/inject=enabled` (Linkerd). Annotations override defaults per-pod. Sidecar resource limits/requests must be set to avoid OOM under load. Sidecar version must match control plane version — upgrade sidecars first with rolling restart. Injection via mutating webhook — pods restart on label change. Selective injection via `sidecar.istio.io/inject: "true"` annotation for specific deployments.

### 3. Traffic Management
VirtualService: defines routing rules — URI match, header match, weight-based split between subsets, fault injection (abort, delay), mirroring for shadow traffic. DestinationRule: defines load balancing policy (round_robin, least_request, random), connection pool settings (max connections, pending requests, timeout), circuit breaker (outlier detection: consecutive 5xx, interval, ejection time), TLS settings (ISTIO_MUTUAL, DISABLE). Gateway: ingress traffic entry point (shared or per-namespace), TLS termination at gateway. ServiceEntry: registers external services into mesh for traffic management and mTLS.

### 4. Security
mTLS modes: DISABLE (plain text), PERMISSIVE (accept both TLS and plain text — migration mode), STRICT (TLS only). PeerAuthentication sets mTLS mode at mesh/namespace/workload level. RequestAuthentication validates JWT tokens from external callers. AuthorizationPolicy — default-deny with explicit ALLOW rules: principals (SPIFFE identities), namespaces, IP ranges, paths, methods, ports. SPIFFE format: `spiffe://cluster.local/ns/<namespace>/sa/<service-account>`. Trust domain configuration for multi-cluster mTLS.

### 5. Observability
Prometheus: HTTP/gRPC metrics (request count, duration, size, error rate) via Envoy metrics. Grafana: pre-built dashboards for service, workload, and mesh control plane metrics. Kiali: service graph topology visualization, health/error rate overlay, traffic animation, distributed tracing integration, Istio config validation. Jaeger: distributed tracing with trace sampling configurable per service/route. Access logs: Envoy logs for request/response details — configurable via telemetry API. WASM extensions for custom metrics and log enrichment.

### 6. Canary and Blue-Green Deployments
Canary: VirtualService weight routing — 90% v1, 10% v2. Gradual weight shift based on metrics. Combine with DestinationRule subsets (v1, v2 labels). Blue-green: VirtualService switches all traffic to new version after validation. Can also use Argo Rollouts with Istio integration for automated canary with metrics-based promotion.

### 7. mTLS Deep Dive
Certificate lifecycle: Citadel issues SPIRE-compatible certificates with 24h TTL, auto-rotated by Envoy sidecar. Peer certificate validation on every connection. mTLS bypass detection via telemetry. Solution: STRICT mode on all namespaces after migration. Migration: DISABLE -> PERMISSIVE (monitor for non-TLS traffic) -> STRICT. Verify mTLS status via Kiali edges, Istioctl dashboard, or Envoy admin interface.

### 8. Egress Control
ServiceEntry for external services: allows mesh-enforced mTLS and traffic policies to external endpoints. Egress Gateway: routes external traffic through dedicated gateway for security policy enforcement, access logging, and audit. Egress TLS origination: gateway terminates TLS to external service, mTLS from sidecar to gateway. Block-all-egress by default, allow specific external services via ServiceEntry.

### 9. Mesh Expansion (VM Integration)
Extend mesh to include VMs (non-K8s workloads). Workload entry registers VM with mesh: provides SPIFFE identity, mTLS certificate, and Envoy proxy. VM must have Istio sidecar installed and connect to control plane. Use cases: legacy VM workloads, database VMs, on-premise services. DNS resolution and network connectivity must be pre-configured.

## Operational Practices

### Mesh Installation and Upgrade Procedure
Install: istioctl install with custom profile (production overrides), or Helm for GitOps deployment. Validate: istioctl verify-install, test injection in non-production namespace, verify mTLS with istioctl authz check. Upgrade: download new istioctl version, run istioctl x precheck to validate upgrade compatibility, upgrade control plane with canary revision (revision-based upgrade retains old control plane), run istioctl proxy-status to verify sidecars connect to new control plane, upgrade data plane by restarting workloads (rolling restart) to inject new sidecar version. Post-upgrade: run full integration test suite, verify mTLS and routing still working, remove old control plane revision.

### Performance and Resource Tuning
Sidecar resources: request 100m CPU and 128Mi memory per sidecar, limit 500m CPU and 256Mi memory. For high-traffic services: 500m/512Mi request, 2 CPU/1Gi limit. Concurrency: Envoy worker threads default to half CPU cores. Connection pool tuning: adjust maxConnections, http1MaxPendingRequests, http2MaxRequests based on service throughput. Buffer sizes: per-connection buffer pool for high-latency services. Access logs: disable in high-throughput namespaces, sample at 1% in production. Telemetry: WASM-based metrics generation over legacy Mixer for better performance.

### Troubleshooting Common Issues
Sidecar not injected: verify namespace label, check mutating webhook, verify sidecar injector ConfigMap exists. mTLS failure: check PeerAuthentication mode, certificate expiry, workload entry for VMs. Traffic not routing: verify VirtualService host matches service DNS, DestinationRule subset labels match pod labels. High sidecar memory: reduce connection pool limits, check for connection leaks, upgrade Envoy version. Gateway 503: verify service mesh endpoint routing, check DestinationRule circuit breaker thresholds, verify ServiceEntry for external services. Kiali not showing topology: enable telemetry, check Prometheus is running and scraping sidecar metrics, verify Kiali has namespace access.

## Rules
1. mTLS in STRICT mode for all mesh-internal traffic.
2. Sidecar injection via namespace label — never manual annotations.
3. AuthorizationPolicy default deny with explicit allow rules.
4. Circuit breaker configured for all downstream service calls.
5. Telemetry enabled at mesh level, not per-sidecar override.
6. Sidecar resource limits required — without them sidecars crash under load.
7. Mesh control plane upgraded before data plane (sidecars).
8. Canary upgrades for control plane — one revision at a time.
9. Egress traffic explicitly allowed via ServiceEntry — no wildcard egress.
10. Migration: PERMISSIVE -> monitor -> STRICT — never go directly to STRICT.
11. Sidecar version must match control plane version exactly.
12. Access logs sampled at 1% in production — 100% sample impacts performance.
13. Kiali configured with namespace access for topology visualization.
14. WASM extensions over legacy Mixer for telemetry generation.
15. Istio control plane metrics (Pilot, Galley, Citadel) monitored separately from data plane.
16. Sidecar injection not enabled on istio-system namespace to prevent recursive injection.
17. Service mesh version compatibility verified before Istio control plane upgrade.
18. Access log sampling rate configured per namespace — high-traffic services use 1% sample.
19. Kiali dashboard accessed via SSO with read-only role for most team members.
20. DestinationRule circuit breaker settings tuned based on actual service performance data.

## Multi-Mesh and Federation
Multi-primary mesh: each cluster has its own Istio control plane, meshes connected via shared root CA and east-west gateway. Benefits: independent control planes, no single point of failure, cross-cluster service discovery via DNS. Primary-remote mesh: single control plane in primary cluster manages remote clusters via east-west gateway. Benefits: single control plane (simpler), consistent policy across clusters. Federation: independent meshes with explicit service sharing via MeshFederation CRD. Use cases: merging organizations, different trust domains, gradual mesh migration.

## Istio Multi-Cluster Service Discovery
Service entries in primary cluster point to services in remote cluster via DNS or VIP. East-west gateway handles cross-cluster traffic with mTLS. Multi-cluster services: DNS suffix `global` for services that should resolve across clusters. Example: `myapp.myapp-ns.svc.cluster.local` (local) vs `myapp.myapp-ns.svc.clusterset.local` (global). Traffic management: VirtualService can route to subsets across clusters for multi-region deployments.

## Scenario Playbooks

### mTLS Migration (PERMISSIVE to STRICT)
Phase 1 — DISABLE to PERMISSIVE: deploy PeerAuthentication with PERMISSIVE mode per namespace, monitor telemetry for non-mTLS traffic (Kiali edges show TLS status), identify services without sidecar injection. Phase 2 — fix gaps: enable sidecar injection on all namespaces, add AuthorizationPolicy for key services, verify mTLS on all Kiali edges. Phase 3 — PERMISSIVE to STRICT: deploy PeerAuthentication STRICT per namespace, start with low-traffic namespaces, monitor for connection failures, rollback to PERMISSIVE if issues. Phase 4 — enforce: mesh-wide PeerAuthentication STRICT, remove PERMISSIVE namespaces after 2 weeks of stable operation, add alert for mTLS failures.

### Canary Deployment with Traffic Split
1. Deploy v2 with subset labels: DestinationRule adds subset v2 matching label version=v2
2. Deploy v2 workloads: deployment or rollout with label version=v2, initially 0 replicas
3. Scale v2: increase v2 replicas to match v1 capacity
4. Shift traffic: VirtualService updates weight from 100% v1 to 90% v1 / 10% v2
5. Monitor: Kiali metrics, Grafana dashboards, error rate, latency for v2
6. Gradual shift: 10% -> 25% -> 50% -> 75% -> 100% v2, each step with pause for monitoring
7. Promote: remove v1 subset from DestinationRule, scale down v1 to 0, cleanup v1 resources
8. Rollback: shift weight back to v1, scale up v1, scale down v2, investigate v2 failure

### Gateway TLS Termination
1. Create Kubernetes Secret with TLS certificate and key in istio-ingress namespace
2. Configure Gateway with TLS mode SIMPLE and credentialName pointing to the secret
3. Create VirtualService bound to gateway, routing host myapp.example.com to myapp service
4. Optionally configure mTLS passthrough: Gateway TLS mode PASSTHROUGH, VirtualService routes TLS traffic without termination
5. Certificate rotation: update Secret with new cert, Envoy hot-reloads without restart
6. Multi-domain Gateway: add multiple servers with different hostnames and credential names

## References
  - references/istio-patterns.md — Istio Patterns
  - references/linkerd-patterns.md — Linkerd Patterns
  - references/mesh-observability.md — Service Mesh Observability
  - references/mesh-operations.md — Service Mesh Operations
  - references/service-mesh-advanced.md — Service Mesh Advanced Topics
  - references/service-mesh-architecture.md — Service Mesh Architecture
  - references/service-mesh-fundamentals.md — Service Mesh Fundamentals
  - references/service-mesh-security.md — Service Mesh Security
## Handoff
Hand off to service-mesh for Istio/Linkerd operations. Hand off to kubernetes-patterns for workload manifests. Hand off to monitoring for Prometheus/Grafana dashboards. Hand off to security for PKI and certificate management. Hand off to argo-cd for progressive delivery patterns (canary/blue-green) with Istio integration. Hand off to chaos-engineering for mesh resilience testing (mTLS failure, sidecar injection issues). Hand off to observability for distributed tracing with Jaeger/Zipkin integration.
