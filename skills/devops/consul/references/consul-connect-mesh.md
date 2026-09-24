# Consul Connect Service Mesh

## Overview
Consul Connect provides automatic mTLS, identity-based authorization (intentions), and traffic routing between services via Envoy sidecar proxies. Apps speak plaintext to their local proxy; the mesh handles TLS, discovery, and policy.

## Mesh Architecture
```
[ app A ] --localhost--> [ Envoy A ] <--mTLS--> [ Envoy B ] <--localhost-- [ app B ]
                              |                        |
                            Consul Servers  (catalog, ACL, intentions, CA)
```
- Every service gets an Envoy `-sidecar-for`.
- The sidecar pulls its config from servers via gRPC or xDS.
- Traffic between sidecars is mutually-authenticated TLS (SPIFFE identities).

## Getting Started

### Register the sidecar
```hcl
service {
  name = "web"
  port = 8080
  connect {
    sidecar_service {
      proxy {
        upstreams = [
          { destination_name = "api", local_bind_port = 7070 },
          { destination_name = "db",  local_bind_port = 5432 }
        ]
      }
    }
  }
}
```
```bash
consul connect envoy -sidecar-for web -admin-bind 127.0.0.1:19000
```
App now reaches `api` at `127.0.0.1:7070`, `db` at `127.0.0.1:5432`.

### Intentions
Rules that allow or deny by name/origination:
```bash
consul intention create -deny '*' '*'        # default-deny (recommended)
consul intention create -allow web api
consul intention create -deny web internal
consul intentions list
```
Scoped by namespace, source/destination metadata, L7 conditions (path, method, header).

## Certificate Management (the CA)
- Consul is a Cluster Root CA (`consul.raft` key in KV) by default.
- Supports Vault PKI as the CA: `consul connect ca set-config -config-file=pki.hcl`.
- Leaf certs are short-lived (`default leaf PP`), auto-rotated by the sidecar.
- Identity = SPIFFE: `spiffe://<domain>/ns/<namespace>/dc/<dc>/svc/<service>`.

## Customize the Proxy
```hcl
proxy {
  config {
    protocol = "http"        # enables L7 features
    envoy_extra_args = ["--log-level", "debug"]
  }
}
```
L7 (http protocol) enables: path/method-based intentions, retries, timeouts, health-check splitting, fault injection.

## Gateways
| Gateway | Purpose |
|---------|---------|
| **Mesh gateway** | Cross-DC mTLS: sidecars in DC A reach DC B through local gateways. |
| **Ingress gateway** | Entry from outside the mesh (public traffic) into services. |
| **Terminating gateway** | Exit from mesh to non-mesh (external) services. |

### Mesh gateway
```hcl
service { name = "mesh-gateway", port = 8443, kind = "mesh-gateway" }
```
```bash
consul connect envoy -mesh-gateway -register -address 10.0.1.70:8443
consul connect envoy -mesh-gateway -register -address 10.0.1.71:8443
```
Enables federated Connect: DC A sidecar resolves `api.dc2` via both gateways.

### Ingress gateway
```hcl
service {
  name = "ingress"
  kind = "ingress-gateway"
  port = 8080
  proxy {
    config {
      protocol = "http"
      services = [{ name = "web" }]
    }
  }
}
```
```bash
consul connect envoy -ingress-gateway -address 10.0.1.80:8080
```

### Terminating gateway
```hcl
service {
  name = "ext-api"
  kind = "terminating-gateway"
  proxy {
    config {
      services = [{ name = "ext", address = "ext.example.com:443" }]
    }
  }
}
```

## Transparent Proxy
`-transparent-proxy` rewrites all outbound traffic to flow through the sidecar with zero app changes (requires `consul-k8s` or `connect` namespace + `-expose` notes). Set traffic redirection rules to scope kinds.

## L7 Routing (http protocol)
```hcl
intention {
  source_name = "web"
  destination_name = "api"
  action = "allow"
  permissions = [
    { http { path_exact = "/v1/private" } action = "deny" },
    { http { path_prefixed = "/v1/public" } action = "allow" }
  ]
}
```
Load balancing: `connect proxy` `lb_policy = "ring_hash"`, consistency, retry policy.

## Best Practices / Anti-Patterns
- Default-deny from day one; nothing implicitly trusted.
- Short leaf TTL (minutes) with auto-rotation.
- Mesh through gateways, not naked WAN gossip, for multi-DC.
- Use `-transparent-proxy` to avoid per-app edits.
- Don't expose sidecar admin ports to the network (`-admin-bind 127.0.0.1`).

## Pitfalls
- Forgetting default-deny → any service can reach any service.
- Mesh without a proper CA rotation plan → leaf storms on CA change.
- L7 features require `protocol = "http"` — unused otherwise.
- Cross-DC Connect without mesh gateways → sidecars can't route remote.

## Checklist
- [ ] Sidecar service registered for every workload.
- [ ] Default-deny + explicit allow intentions.
- [ ] Leaf TLS auto-rotation working (check logs).
- [ ] L7 routing configured where required.
- [ ] Gateways (mesh/ingress/terminating) as needed, admin ports local.
- [ ] App uses local loopback upstream addresses.