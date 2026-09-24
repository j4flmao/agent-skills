# Consul ACLs and Security

## Overview
ACLs are Consul's identity and authorization layer. Each request is authenticated via a token; a policy (or role) defines what that token may read/write on nodes, services, KV, sessions, and Connect intentions. Combined with gossip encryption and TLS, ACLs harden the control plane and mesh.

## ACL Model
```
Client token -> Realm (Service Identity, Token, JWT SSD...) -> Policies -> Actions
```
- **Token** — secret bearer credential.
- **Policy** — set of rules for prefixes/scopes.
- **Role** — named bundle of policies for reuse.
- **Service identity** — token auto-derived from mTLS cert for Connect.

## Bootstrapping
```hcl
acl = {
  enabled = true
  default_policy = "deny"
  tokens = { master = "<management-token>" }
}
```
```bash
consul acl bootstrap      # one-time, prints management token — save to Vault
consul acl token read -self
```
Change `default_policy` only after token rotation, or lock yourself out.

## Rule Syntax
```hcl
# Node rules
node "web-*" { policy = "read" }

# Service rules
service "web" { policy = "write" }        # register/deregister/update
service "api" { policy = "read" }          # discover

# Key rules
key ""          { policy = "deny" }
key "config/"   { policy = "read" }
key "config/webapp/" { policy = "write" }

# Session rules (lock acquisition needs write)
session "" { policy = "read" }
session "config/" { policy = "write" }

# Intention rules (mesh)
service "web" { intentions = "write" }

# Operator rules (snapshots, metrics for ops)
operator = "read"
agent { policy = "read" }
```

## Token / Policy / Role workflows
```bash
consul acl policy create -name web-app -rules @web-policy.hcl
consul acl role create -name web-team -policy-name web-app -policy-name ops-read
consul acl token create -role web-team -description "CI web deploy"
consul acl token list
consul acl token get -id <id>
consul acl token delete -id <id>
consul acl policy list ; consul acl role list
```
In a service-mesh cluster, enable per-service identity (`consul-envoy` uses it) so tokens don't need explicit creation for connect.

## Secret Management
- Store the bootstrap token in Vault.
- Rotate tokens periodically (`consul acl token clone -id <id>`).
- Set `acl.tokens` in config only for bootstrap + reserved tokens; use `consul acl token set`.
- For apps: generate a token per service identity or role with the least scope.

## TLS Everywhere (defense-in-depth)
```hcl
encrypt = "<gossip-key>"        # AES-GCM Serf (LAN+WAN)
verify_incoming = true          # mTLS inbound to agents
verify_outgoing = true          # mTLS outbound
verify_server_hostname = true   # verify peer hostnames
ca_file / cert_file / key_file  # agent TLS
```
Rotate gossip keys (`consul operator rotate`) and CA certs on a schedule.

## Security Scenarios
### 1. Public DNS but private API
Run DNS on 8600 (serves `service.consul`), HTTP API on private interface only, enforce ACL for UI.

### 2. Zero-trust mesh
Default-deny ACL + default-deny intentions + short leaf TTL + Vault CA.

### 3. Auditing
- `audit` (enterprise) logs via `audit.log` target (file/syslog).
- Track `consul.acl.reject` metric — rising = probes or misconfig.

## OSS limitations
- Namespaces, admin partitions, SAML/JWT auth (enterprise).
- But core mTLS + intentions + ACLs are fully OSS.

## Anti-Patterns
- ACs disabled "because it's a internal cluster" — single bootstrap token is master of the world.
- `default_policy = "allow"` — negative security.
- Leaking the management token in git/CI — it can create new tokens.
- One giant token with write everywhere — blast radius of a leak.
- Not rotating — token reuse years after an incident.

## Checklist
- [ ] ACLs enabled, `default_policy = "deny"`.
- [ ] Bootstrap token in Vault; removed from config.
- [ ] Per-service/token least-privilege policies.
- [ ] Gossip encryption on LAN+WAN.
- [ ] Agent TLS (verify + hostname) configured.
- [ ] ACL reject/deny ratio monitored.
- [ ] Intentions default-deny where mesh is used.