# Consul Service Discovery

## Overview
Service discovery is Consul's core feature: services register on agents, the catalog replicates to servers, and consumers resolve them via DNS or the API. Combine with health checks so only passing services are returned.

## Service Registration

### Agent-side (recommended)
```hcl
service {
  name = "web"
  id   = "web-01"
  address = "10.0.1.50"
  port = 8080
  tags = ["primary", "v1"]
  meta = { version = "1.2.0" }
}
```
Register from the CLI: `consul services register web.hcl`.

### Catalog API (server-side)
```bash
curl -X PUT localhost:8500/v1/catalog/register \
  -d '{"Node":"node1","Address":"10.0.1.50","Service":{"Service":"web","ServiceID":"web-01","Port":8080}}'
```
Use agent registration in most cases; catalog-managed nodes are for external nodes and edge cases.

### Lifecycle
- Registration persists until deregistration (`consul services deregister`) or `deregister_critical_service_after`.
- A critical service that stays critical for that interval is auto-deregistered — prevents DNS poisoning.

## Health Checks
| Type | Check | Use |
|------|-------|-----|
| HTTP | `GET /healthz` expects 2xx | Web APIs, health endpoints |
| TCP | TCP connect to port | Databases, generic |
| gRPC | gRPC health check | gRPC services |
| Script | `args` run periodically | Custom logic, must exit 0 |
| TTL | Client must `pass` before TTL expiry | App-managed health |
| Alias | Mirror another service's status | Envoy / sidecar all same as app |

```hcl
checks = [
  {
    name = "web-http"
    type = "http"
    path = "/healthz"
    interval = "10s"
    timeout  = "2s"
    deregister_critical_service_after = "2m"
  },
  {
    name = "web-ttl"
    ttl = "15s"
  }
]
```
`consul client` runs checks; results flow to servers.

## DNS Resolution
```
# A record
web.service.consul         -> 10.0.1.50
# SRV record with ports
web.service.consul SRV     -> 10.0.1.50:8080
# Tag filter
tag.web.service.consul
# Prepared query binding (non-leader)
qname.query.consul
```
The DNS interface listens on 8600 and answers with the TTL of the health check. Services in non-passing state are excluded.

## Prepared Queries
```bash
consul query create -name "web-lb" -service web -tag primary
dig @127.0.0.1 -p 8600 web-lb.query.consul +short
```
Prepared queries support failover: attempt the primary DC, fall back to a failover DC or city.

## Watch and Template
Use `consul-template`, or the `/v1/catalog/services` and `/v1/catalog/service/:service` HTTP endpoints for programmatic consumers. Watch pattern:

```hcl
watch {
  type = "service"
  service = "web"
  handler = "/usr/local/bin/reload-web.sh"
}
```

## Anti-Patterns
- No health check → stale entries returned; traffic to dead instances.
- `deregister_critical_service_after` unset → dead services never removed.
- `enable_tag_override = true` (undesired) → client tags silently override server.
- Too many clients hitting HTTP API instead of DNS → chatty calls; use DNS + TTL or connect.join.

## Checklist
- [ ] Every service has ≥1 health check.
- [ ] `deregister_critical_service_after` on critical services.
- [ ] DNS SRV records verified (`_web._tcp.service.consul`).
- [ ] Prepared query for round-robin / failover.
- [ ] Non-passing services excluded from DNS.