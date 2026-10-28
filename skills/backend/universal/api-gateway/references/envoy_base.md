# Envoy Core Model: Listeners, Filters, Clusters, and xDS

Envoy is the data plane behind Istio, Envoy Gateway, Contour, Emissary, and many custom gateways. This reference explains its configuration model so you can read and debug any Envoy-based gateway. Feature-level recipes (JWT, rate limits, Wasm) live in `envoy-gateway.md`.

## Request Path

```
downstream client
  → Listener (address:port)
    → Filter chain match (SNI, ALPN, source IP)
      → Network filters (tls_inspector, http_connection_manager)
        → HTTP filters (jwt_authn, ext_authz, ratelimit, cors, router)
          → Route table (virtual host → route → cluster)
            → Cluster (load balancing, health checks, circuit breakers)
              → Endpoint (upstream host)
```

| Object | Role |
|--------|------|
| Listener | Binds a socket; owns filter chains |
| HTTP connection manager (HCM) | Turns bytes into HTTP requests; runs HTTP filters |
| Route configuration | Virtual hosts (by `Host`), routes (by path/header), actions |
| Cluster | Logical upstream service: LB policy, timeouts, TLS to upstream |
| Endpoint | Concrete IP:port, discovered statically, by DNS, or via EDS |

## Minimal Static Bootstrap

```yaml
static_resources:
  listeners:
    - name: http
      address: { socket_address: { address: 0.0.0.0, port_value: 8080 } }
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: ingress_http
                route_config:
                  name: local_route
                  virtual_hosts:
                    - name: api
                      domains: ["api.example.com"]
                      routes:
                        - match: { prefix: "/orders" }
                          route: { cluster: orders, timeout: 5s }
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
  clusters:
    - name: orders
      type: STRICT_DNS
      lb_policy: ROUND_ROBIN
      connect_timeout: 1s
      load_assignment:
        cluster_name: orders
        endpoints:
          - lb_endpoints:
              - endpoint: { address: { socket_address: { address: orders.svc, port_value: 8080 } } }
admin:
  address: { socket_address: { address: 127.0.0.1, port_value: 9901 } }
```

- The `router` filter must be last in `http_filters`.
- Every typed extension needs its `@type` URL; v2 API types were removed long ago.
- Bind the admin interface to localhost only; it can drain or shut down Envoy.

## Cluster Discovery Types

| Type | Behaviour |
|------|-----------|
| `STATIC` | Fixed IPs in config |
| `STRICT_DNS` | Resolves DNS continuously; every returned IP is an endpoint |
| `LOGICAL_DNS` | Uses first resolved IP per new connection; for large external hosts |
| `EDS` | Endpoints pushed by a control plane |
| `ORIGINAL_DST` | Uses the original destination (transparent proxy) |

## xDS: Dynamic Configuration

| API | Delivers |
|-----|----------|
| LDS | Listeners |
| RDS | Route configurations |
| CDS | Clusters |
| EDS | Endpoints |
| SDS | TLS certificates and keys |
| ADS | All of the above over one ordered stream |

```yaml
dynamic_resources:
  ads_config:
    api_type: GRPC
    transport_api_version: V3
    grpc_services: [{ envoy_grpc: { cluster_name: xds_cluster } }]
  lds_config: { ads: {}, resource_api_version: V3 }
  cds_config: { ads: {}, resource_api_version: V3 }
```

- Use ADS (or delta xDS) to avoid ordering races, e.g. a route pointing at a cluster not yet delivered.
- Control plane libraries: `go-control-plane`, `java-control-plane`; products: Istio, Envoy Gateway, Gloo, Contour.

## Load Balancing and Resilience Settings (Cluster)

| Setting | Purpose |
|---------|---------|
| `lb_policy` | `ROUND_ROBIN`, `LEAST_REQUEST`, `RING_HASH`, `MAGLEV`, `RANDOM` |
| `circuit_breakers.thresholds` | `max_connections`, `max_pending_requests`, `max_requests`, `max_retries` per priority |
| `outlier_detection` | Eject hosts after consecutive 5xx / gateway errors |
| `health_checks` | Active HTTP/gRPC/TCP checks |
| `typed_extension_protocol_options` | Upstream HTTP/2, idle timeouts |
| `transport_socket` | Upstream TLS / mTLS |

```yaml
outlier_detection:
  consecutive_5xx: 5
  interval: 10s
  base_ejection_time: 30s
  max_ejection_percent: 50
```

## Route-Level Controls

- `timeout` (whole request, default 15s) and `idle_timeout`.
- `retry_policy`: `retry_on: "5xx,reset,connect-failure"`, `num_retries`, `per_try_timeout`; retry only idempotent requests.
- `weighted_clusters` for traffic splitting; `request_mirror_policies` for shadow traffic.
- `request_headers_to_add` / `request_headers_to_remove` for header hygiene.

## Hot Restart and Draining

Envoy reloads static config via hot restart (new process inherits sockets) or, preferably, dynamic xDS updates without restart. Listener changes drain existing connections according to `drain_timeout` / `--drain-time-s`.

## Debugging with the Admin Interface

```bash
curl -s localhost:9901/config_dump | jq '.configs[].["@type"]'
curl -s localhost:9901/clusters | grep -E 'health_flags|cx_active'
curl -s localhost:9901/stats | grep -E 'upstream_rq_(5xx|timeout|retry)'
curl -s -X POST 'localhost:9901/logging?router=debug'
```

Response flags in access logs explain failures: `UH` (no healthy upstream), `UF` (upstream connection failure), `UT` (upstream timeout), `URX` (retry limit exceeded), `NR` (no route), `RL` (rate limited), `UAEX` (ext_authz denied).

## Pitfalls

- Missing `router` filter or wrong filter order (auth after router never runs).
- Default 15s route timeout surprising long-polling or streaming endpoints; set `timeout: 0s` for streams deliberately.
- `STRICT_DNS` against a service with hundreds of IPs creates many connection pools.
- Admin port exposed on `0.0.0.0`.

## Checklist

- [ ] Filter order reviewed; `router` last
- [ ] Explicit timeouts, retries only for idempotent routes
- [ ] Circuit breakers and outlier detection on every upstream cluster
- [ ] Admin interface bound to localhost
- [ ] ADS or delta xDS for dynamic config
- [ ] Access logs include response flags
