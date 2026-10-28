# Advanced Service Mesh: Multi-Cluster, Ambient Waypoints, Egress Control, External CA, Performance

Advanced topics for production meshes: multi-cluster topologies, Istio ambient waypoints, egress control, integrating external certificate authorities, extending proxies, tuning performance, and upgrade strategies. Security policy basics are in `service-mesh-security.md`; operations in `mesh-operations.md`.

## Multi-Cluster Topologies

| Topology (Istio terms) | Description | Use |
|------------------------|-------------|-----|
| Multi-primary, same network | Control plane in each cluster, flat pod network | Single region, multiple clusters for blast radius |
| Multi-primary, different networks | East-west gateways connect clusters | Cross-region, cloud boundaries |
| Primary-remote | One control plane manages remote clusters | Smaller clusters, centralized ops (control plane is a dependency) |

Requirements:
- Shared root of trust (common root CA or intermediates from the same root) so workload certificates validate across clusters.
- Consistent namespace sameness: a service `ns/name` is treated as the same service across clusters.
- Endpoint discovery: each control plane reads remote API servers (remote secrets) or uses gateways.

Linkerd multicluster mirrors services across clusters via gateways or flat-network pod-to-pod mode. Cilium Cluster Mesh connects clusters at the CNI layer with global services.

Locality-aware routing: prefer same-zone/same-region endpoints and fail over by locality priority when endpoints are unhealthy (requires outlier detection to be configured in Istio for failover to trigger).

## Istio Ambient Mode in Depth

- `ztunnel` (per node, Rust) handles mTLS, L4 authorization and telemetry using HBONE (HTTP/2 CONNECT tunneling) between nodes.
- Waypoint proxies (Envoy) provide L7: HTTP routing, L7 authorization, retries, fault injection. Deploy per namespace or per service account and attach with labels.

```bash
kubectl label namespace shop istio.io/dataplane-mode=ambient
istioctl waypoint apply -n shop --enroll-namespace
```

Design notes:
- L7 policies apply only when traffic passes through a waypoint; an `AuthorizationPolicy` targeting L7 attributes must target the waypoint (`targetRefs`).
- Sidecar and ambient workloads can interoperate during migration.
- Validate feature parity for your needs (some sidecar features differ in ambient).

## Egress Control

Default meshes often allow any outbound traffic. Tighten it:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata: { name: stripe-api, namespace: payments }
spec:
  hosts: ["api.stripe.com"]
  ports: [{ number: 443, name: tls, protocol: TLS }]
  resolution: DNS
  location: MESH_EXTERNAL
```

- Set `meshConfig.outboundTrafficPolicy.mode: REGISTRY_ONLY` so only registered external hosts are reachable.
- Route egress through dedicated egress gateways for auditing and fixed source IPs.
- Remember a mesh is not a complete egress firewall: workloads that bypass the proxy (host network, misconfiguration) need NetworkPolicies or cloud firewall rules too.

## External Certificate Authorities

| Option | Notes |
|--------|-------|
| Mesh built-in CA with plug-in intermediate | Load an intermediate signed by your corporate root (`cacerts` secret in Istio) |
| cert-manager istio-csr | Istio workload CSRs signed via cert-manager issuers (Vault, private CA) |
| SPIRE | SPIFFE-native identity issuance with attestation; integrates with Istio |
| Linkerd with cert-manager | Rotate trust anchor and issuer certificates via cert-manager |

Plan trust anchor rotation in advance: it requires distributing a bundle containing old and new roots before switching issuers.

## Extending the Data Plane

- Envoy filters via Istio `EnvoyFilter` are powerful but fragile across upgrades; prefer first-class APIs.
- WebAssembly plugins (Istio `WasmPlugin`) for custom auth/header logic; test performance and failure modes.
- External authorization (`ext_authz`) to delegate decisions to OPA or custom services; set timeouts and failure behavior (fail open vs closed) deliberately.

## Performance Tuning

| Lever | Effect |
|-------|--------|
| Scope configuration (`Sidecar` resource / `exportTo`) | Each proxy receives only needed services; reduces memory and push time in large meshes |
| Proxy resource requests | Avoid CPU throttling of proxies under load |
| Concurrency (`proxy.istio.io/config` concurrency) | Worker threads per proxy |
| Ambient mode | Removes per-pod sidecars; L4 path is lightweight |
| Protocol detection | Name ports (`http-`, `grpc-`) or set `appProtocol` to skip sniffing delays |
| Access logging | Sample or disable verbose logs in hot paths |

Measure end-to-end p99 latency and proxy CPU with realistic traffic before and after changes; overhead depends heavily on request rate and payload sizes.

## Traffic Management Advanced

- Request mirroring (shadowing) to test new versions with production traffic; ensure mirrored calls have no side effects.
- Fault injection (delays, aborts) for resilience testing in staging.
- Progressive delivery with Argo Rollouts or Flagger driving weights based on metrics.
- Consistent hash load balancing for cache affinity; beware hot spots.

## Upgrades

- Istio revision-based canary upgrades: install the new control plane with a revision label, move namespaces gradually (`istio.io/rev=1-24-x` or revision tags), then remove the old revision.
- Data plane restarts required for sidecar mode upgrades; ambient ztunnel upgrades are node-level and need care to avoid connection disruption.
- Run `istioctl x precheck` / `linkerd check --pre` before upgrades, and read deprecation notes for APIs.

## Failure Modes to Plan For

| Failure | Impact | Mitigation |
|---------|--------|-----------|
| Control plane down | Existing config keeps working; no new config/certs | HA control plane; monitor cert expiry windows |
| Certificate expiry/rotation failure | Widespread mTLS failures | Alerts on cert TTL; tested rotation |
| Bad config push | Traffic blackholed | `istioctl analyze` in CI; staged rollouts; GitOps with review |
| Proxy resource exhaustion | Latency/drops | Requests/limits, HPA for gateways |

## Checklist

- [ ] Multi-cluster trust domain and root CA plan
- [ ] Ambient waypoints placed where L7 policy is required
- [ ] Egress registry-only plus network-level egress controls
- [ ] External CA integration and rotation runbook
- [ ] Config scoping for large meshes
- [ ] Revision-based upgrades with prechecks
- [ ] Mesh config validated in CI before apply
