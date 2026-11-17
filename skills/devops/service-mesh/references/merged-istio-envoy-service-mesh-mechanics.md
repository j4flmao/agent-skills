# Istio and Envoy: Data-Plane Mechanics

> Reference for `devops/service-mesh` — the entry point is [`../SKILL.md`](../SKILL.md). This file keeps only material the SKILL.md does not cover.

## Purpose
Most mesh problems (traffic bypassing the proxy, 503s with `UF`/`NR` flags, mTLS failures, latency) are explained by how packets get redirected and how Envoy's configuration was pushed. This skill covers both sidecar and ambient data planes and the commands to inspect them.

## Control Plane → Envoy (xDS)
Istiod watches Kubernetes (Services, EndpointSlices, Istio CRDs) and pushes config to proxies over a gRPC xDS stream (Aggregated Discovery Service, delta xDS by default in recent releases):
| xDS | Object | Istio source |
|---|---|---|
| LDS | Listeners (ports, filter chains) | Services, Sidecar resource, Gateways |
| RDS | HTTP route tables | VirtualService / HTTPRoute |
| CDS | Upstream clusters (LB, TLS, circuit breaking) | DestinationRule |
| EDS | Endpoints (pod IPs, locality, health) | EndpointSlices |
| SDS | Certificates/keys | Istiod CA (SPIFFE identities) |

Envoy runs a main thread (xDS, admin) plus worker threads, each running its own event loop over accepted connections; config changes are applied without restarting.

## Sidecar Mode Interception
- Injection adds `istio-proxy` (and historically `istio-init`, which needs `NET_ADMIN`). With **istio-cni**, the CNI plugin programs redirection instead, so app pods need no elevated init container.
- iptables `nat` rules (chains `ISTIO_INBOUND`, `ISTIO_REDIRECT`, `ISTIO_OUTPUT`):
  - outbound app traffic → Envoy port **15001** (virtualOutbound listener),
  - inbound traffic → **15006** (virtualInbound listener),
  - traffic from the proxy's own UID (1337) is excluded to avoid loops.
- Other ports: 15000 admin, 15020 merged metrics/health, 15021 health, 15090 Envoy Prometheus stats.
- Exclusions: `traffic.sidecar.istio.io/excludeOutboundPorts`, `excludeOutboundIPRanges` annotations.
- Startup race: app sends traffic before Envoy is ready → set `holdApplicationUntilProxyStarts: true` (or native sidecar mode, `ENABLE_NATIVE_SIDECARS`).

## Ambient Mode
- GA since Istio 1.24. No sidecars.
- **ztunnel** (Rust, per-node DaemonSet) handles L4: mTLS (HBONE — HTTP CONNECT tunnelling over mTLS on port 15008), L4 authorization, telemetry. Traffic is redirected into ztunnel from inside the pod's network namespace by istio-cni.
- **Waypoint proxy** (Envoy, per namespace or service account) only when L7 features are needed: HTTP routing, retries, L7 authorization, fault injection.
- Enrol with `kubectl label namespace shop istio.io/dataplane-mode=ambient`; add a waypoint with `istioctl waypoint apply -n shop --enroll-namespace`.

| | Sidecar | Ambient (ztunnel) | Ambient + waypoint |
|---|---|---|---|
| Proxies | One Envoy per pod | One ztunnel per node | + shared Envoy per namespace/SA |
| Features | Full L4+L7 at source and destination | mTLS, L4 policy | Full L7 at destination side |
| Resource cost | Highest (per-pod proxy) | Lowest | Moderate |
| Upgrade | Restart pods to update proxies | Upgrade DaemonSet | Upgrade waypoint Deployments |

## eBPF Redirection (alternative to iptables)
Projects such as Merbridge, and CNIs like Cilium, use eBPF socket-level programs (`sockops` + `sk_msg` with a sockmap and `bpf_msg_redirect_hash`) to pass data between the app socket and the local proxy socket on the same node, skipping part of the TCP/IP stack and netfilter. Gains are workload-dependent; measure before adopting.

## Debugging Commands
```bash
istioctl proxy-status                                  # is each proxy SYNCED with istiod?
istioctl proxy-config listeners deploy/checkout -n shop --port 15001
istioctl proxy-config routes deploy/checkout -n shop --name 8080 -o json
istioctl proxy-config clusters deploy/checkout -n shop --fqdn payments.shop.svc.cluster.local
istioctl proxy-config endpoints deploy/checkout -n shop --cluster "outbound|8080||payments.shop.svc.cluster.local"
istioctl proxy-config secret deploy/checkout -n shop   # cert validity
istioctl analyze -n shop                               # config mistakes
istioctl ztunnel-config workloads                      # ambient: what ztunnel knows
```
Common Envoy response flags: `UF` upstream connection failure, `UH` no healthy upstream, `NR` no route configured, `URX` retry limit exceeded, `UO` circuit breaker overflow, `DC` downstream disconnect.

## Port and Protocol Rules
- Name Service ports with protocol prefixes (`http-`, `grpc-`, `tcp-`) or set `appProtocol`; otherwise Istio auto-detects, and server-first protocols (MySQL, SMTP) can break.
- Headless services and StatefulSets: each pod gets its own endpoint; ensure DestinationRule host matches.

## Anti-Patterns
- No `Sidecar` resource in large meshes → every proxy receives config for every service (memory, push latency). Scope with `Sidecar` egress hosts or use ambient.
- `PERMISSIVE` mTLS left on forever → plaintext still accepted; move to `STRICT` per namespace.
- Retries configured both in app and VirtualService → retry amplification.
- Disabling the proxy's resource limits entirely in large pods without measuring.

## Checklist
- [ ] Mode chosen (ambient by default for L4 mTLS; waypoints only where L7 needed).
- [ ] istio-cni used (no `NET_ADMIN` in app pods).
- [ ] `PeerAuthentication` STRICT; `AuthorizationPolicy` default-deny per namespace.
- [ ] Service ports named / `appProtocol` set.
- [ ] `istioctl proxy-status` and `analyze` in the runbook.

## References
- `envoy-xds.md`
