---
name: consul
description: >
  Use this skill when the user says 'consul', 'hashicorp consul',
  'consul agent', 'consul server', 'consul client', 'consul cluster',
  'consul datacenter', 'consul service discovery', 'consul DNS',
  'consul catalog', 'consul health check', 'consul KV', 'consul
  sessions', 'consul ACL', 'consul token', 'consul policy', 'consul
  role', 'consul connect', 'consul service mesh', 'consul intention',
  'consul envoy', 'consul mesh gateway', 'consul ingress gateway',
  'consul terminating gateway', 'consul tree', 'consul federation',
  'consul admin partition', 'consul namespace', 'consul gossip',
  'consul raft', 'consul snapshot', 'consul backup', 'consul upgrade',
  'consul k8s', 'consul helm', 'consul terraform', 'consul
  consul-template', 'consul ESM', 'consul NIA', 'consul Terraform
  sync', 'service discovery', 'service mesh', 'consul service
  registration'.
  Covers: HashiCorp Consul service discovery, health checking, KV store,
  sessions and leader election, ACLs and security, Connect service mesh
  (mTLS, intentions, Envoy), federation across datacenters, snapshots and
  upgrades, and deployment on Kubernetes with Helm, Terraform, and
  consul-terraform-sync.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, consul, hashicorp, service-discovery, service-mesh, phase-4]
---

# Consul

## Purpose
Deploy and operate HashiCorp Consul for service discovery, health checking, KV configuration, multi-datacenter federation, and the Connect service mesh with mTLS, intentions, and Envoy proxying.

## Agent Protocol

### Trigger
Exact user phrases: "consul", "consul agent", "consul server", "consul client", "consul cluster", "consul datacenter", "consul service discovery", "consul DNS", "consul catalog", "consul health check", "consul KV", "consul sessions", "consul ACL", "consul token", "consul connect", "consul service mesh", "consul intention", "consul envoy", "consul mesh gateway", "consul snapshot", "consul federation", "consul admin partition", "consul namespace", "consul k8s", "consul helm", "consul terraform", "consul-template", "consul ESM", "consul NIA", "consul terraform sync", "service discovery".

### Input Context
- Consul deployment topology (single or multiple datacenters).
- Agent modes: server, client, or dev (local).
- Integration points: Nomad, Vault, Terraform, Kubernetes, Envoy, registrator.
- Networking: gossip (8301/8302) and RPC (8300) port layouts, TLS, mTLS mesh.
- Scale expectations: number of services, registers per second, queries per second.

### Output Artifact
Consul agent configuration (HCL), service registration definitions, ACL policy/token files, intention rules, or Terraform/Kubernetes manifests.

### Response Format
Consul HCL/JSON configuration, CLI commands, or Kubernetes manifests. No preamble. No explanations unless asked.

### Completion Criteria
- [ ] Agent configuration is correct for server/client mode with proper ports and join addresses.
- [ ] Services registered with correct health checks (HTTP, TCP, gRPC, script).
- [ ] DNS service resolution validated (`dig <service>.service.consul`).
- [ ] KV keys written and consumed via consul-template or config injection.
- [ ] ACLs bootstrapped; tokens scoped with least-privilege policies and roles.
- [ ] Connect service mesh configured with mTLS and intentions.
- [ ] Federation (WAN gossip or mesh gateways) configured if multiple DCs.
- [ ] Snapshots and scheduled backups in place; upgrade path planned.

### Max Response Length
400 lines.

## Quick Start
`consul agent -dev` → register a service (`consul services register svc.hcl` or `consul service register`) → `consul catalog services` → `dig @127.0.0.1 -p 8600 web.service.consul` → enable ACLs with `consul acl bootstrap` → `consul connect envoy -sidecar-for web` for the mesh.

## Decision Tree: Deployment Topology
| Topology | Use Case | Agents | Federation |
|----------|----------|--------|------------|
| **Single DC** | Most applications, one region | 3–5 servers + clients | None |
| **Multi-DC (WAN gossip)** | Global services, low ACL/plan needs | 3–5 per DC, clients everywhere | WAN gossip + mesh gateways |
| **Multi-DC (mesh gateways only)** | Isolate gossip, strict security | Same, gateways on boundary | Mesh gateways, no WAN gossip |
| **Dev** | Local testing | 1 dev agent | None |

## Core Workflow

### Step 1: Server Configuration
```hcl
# /etc/consul.d/server.hcl
server = true
bootstrap_expect = 3
ui = true
data_dir = "/opt/consul"
log_level = "INFO"
bind_addr = "{{ GetPrivateInterfaces | attr \"address\" }}"
client_addr = "0.0.0.0"
retry_join = ["10.0.1.11", "10.0.1.12", "10.0.1.13"]

ports {
  dns      = 8600
  http     = 8500
  https    = -1
  grpc     = 8502
  serf_lan = 8301
  serf_wan = 8302
  server   = 8300
}

# Encrypt gossip and RPC
encrypt = "A4F4+oAxyOvAThY4c3Kt0sMN0+SIpxEwbjxZTr/BRh0="
verify_server_hostname = true
verify_incoming = true
verify_outgoing = true
ca_file = "/etc/consul.d/tls/consul-agent-ca.pem"

# ACLs
acl = {
  enabled                  = true
  default_policy           = "deny"
  enable_token_persistence = true
  tokens = {
    master = "a34adf98-9b1d-4be5-8f6a-5c1f2a3b4c5d"
  }
}

performance {
  raft_multiplier = 1
}
```

### Step 2: Client Configuration
```hcl
# /etc/consul.d/client.hcl
server = false
data_dir = "/opt/consul"
client_addr = "0.0.0.0"
bind_addr = "{{ GetPrivateInterfaces | attr \"address\" }}"
retry_join = ["10.0.1.11:8301", "10.0.1.12:8301", "10.0.1.13:8301"]
encrypt = "A4F4+oAxyOvAThY4c3Kt0sMN0+SIpxEwbjxZTr/BRh0="
# Client agents proxy traffic and serve DNS locally
```

### Step 3: Service Registration
```hcl
# /etc/consul.d/conf.d/web.hcl
service {
  name    = "web"
  id      = "web-01"
  address = "10.0.1.50"
  port    = 8080
  tags    = ["primary", "v1"]

  checks = [
    {
      name     = "web-http"
      type     = "http"
      path     = "/healthz"
      interval = "10s"
      timeout  = "2s"
      status   = "passing"
    },
    {
      name     = "web-memory"
      type     = "script"
      args     = ["/usr/local/bin/check-web.sh"]
      interval = "30s"
    }
  ]

  enable_tag_override = false

  meta {
    version = "1.2.0"
  }
}
```
```bash
consul services register /etc/consul.d/conf.d/web.hcl
consul catalog services          # list unique services
consul catalog nodes -service web  # nodes running web
```

### Step 4: DNS Resolution
```bash
dig @127.0.0.1 -p 8600 web.service.consul +short
dig @127.0.0.1 -p 8600 web.service.consul SRV +short   # with host:port
dig @127.0.0.1 -p 8600 web.service.consul A +short     # prepared query
# RFC 2782 SRV: _web._tcp.service.consul
```
Configure `/etc/resolv.conf` to point at `127.0.0.1:8600` with `search consul.` for zero-config service resolution inside the cluster.

### Step 5: Health Checks and Deregister
```bash
consul catalog health -service web     # health of all web instances
consul health state -passing           # all passing
# Automatic deregistration: critical + critical deregistration in check config
consul services deregister /etc/consul.d/conf.d/web.hcl
```

### Step 6: KV Store
```bash
consul kv put config/webapp/feature_flag enabled
consul kv put config/webapp/db_host db.internal
consul kv get config/webapp/feature_flag
consul kv get -recurse config/webapp
consul kv delete config/webapp/db_host
consul kv put -flags=42 config/webapp/version 2
```
```hcl
# consul-template patterns
{{ key "config/webapp/db_host" }}
{{ range key "config/webapp/" }}
```
Refresh is automatic in consul-template:
```hcl
template {
  contents = "db_host = {{ key \"config/webapp/db_host\" }}"
  destination = "/etc/webapp.conf"
  command = "systemctl reload webapp"
}
```

### Step 7: Sessions and Leader Election
```bash
consul session create -name webapp-session -ttl 60s
# Leader election pattern: try to acquire on a KV key
consul kv put -acquire -session=<session-id> leader/webapp $(hostname)
consul kv get -recurse leader/
consul kv put -release -session=<session-id> leader/webapp $(hostname)
consul session info <session-id>
```
Sessions are used for leader election, distributed locks, and fencing. Set `lock-delay` to protocol with stale lock holders.

### Step 8: ACL Bootstrapping
```bash
consul acl bootstrap                      # creates management token (SAVE IT!)
# Policy file
cat > web-policy.hcl <<'EOF'
node_prefix "web-*" {
  policy = "read"
}
service_prefix "web" {
  policy = "write"
}
key_prefix "config/webapp/" {
  policy = "write"
}
session_prefix "" {
  policy = "read"
}
EOF
consul acl policy create -name web-app -rules @web-policy.hcl
consul acl token create -policy web-app -description "Web app token"
consul acl token set -id <token-id> -policy web-app -description "update policy"
consul acl token read -self
consul acl token list
# Roles bundle multiple policies for easier management
consul acl role create -name web-team -policy-name web-app -policy-name ops-read
consul acl token create -role web-team
```

### Step 9: Connect Service Mesh
```hcl
# Service with Envoy sidecar
service {
  name = "web"
  port = 8080
  connect {
    sidecar_service {
      proxy {
        upstreams = [
          {
            destination_name = "api"
            local_bind_port  = 7070
          },
          {
            destination_name = "db"
            local_bind_port  = 5432
          }
        ]
      }
    }
  }
}
```
```bash
consul connect envoy -sidecar-for web -admin-bind 127.0.0.1:19000
# Intentions (allow web -> api)
consul intention create -deny '*' '*'          # default deny
consul intention create -allow web api
consul intention create -deny web internal     # block web -> internal
consul intentions list
# Transparent proxy — no app changes needed
consul connect envoy -sidecar-for web -transparent-proxy
```

### Step 10: Federating Datacenters
```hcl
# Mesh gateway service registration (each DC)
service {
  name = "mesh-gateway"
  port = 8443
  kind = "mesh-gateway"
}
```
```bash
consul connect envoy -mesh-gateway -register -address 10.0.1.70:8443
# Join WAN gossip (server config) or rely on mesh gateways only
consul join -wan 10.0.2.11
consul members -wan
# Requires TLS on WAN; gateways cross the boundary
```
Admin partitions isolate teams; namespaces organize within a DC.

### Step 11: Monitoring
```bash
curl localhost:8500/v1/agent/metrics | jq '.Gauges[] | select(.Name|test("raft|serf|acl|connect"))'
```
Key metrics:
- `consul.raft.leader` — 1 if leader
- `consul.raft.peers` / `consul.raft.state`
- `consul.serf.members` / `consul.serf.events`
- `consul.catalog.service.register.count`
- `consul.memberlist.msg.suspect`
- `consul.acl.reject` — ACL silences
- `consul.connect.proxy.config.executable.version`
- `consul.health.failing.count` (response: "The remote datacenter has no leader")

Alert on: no leader, `consul.raft.peers < 3`, gossip suspect storms, failed checks, `consul.acl.reject` ratio rising.

## Rules
- Always run an odd number of Consul servers (3 or 5). Never run 2 or 4.
- Enable gossip encryption with a rotating key (`consul keygen`) and TLS (verify_incoming/verify_outgoing).
- Enable ACLs with `default_policy = "deny"` before joining production workloads.
- Register a health check on every service — an un-checked service is invisible health-wise.
- Use services registered with `enable_tag_override = false` unless the consul agent owns tags.
- Prefer CIDR, workspace, and tag filters in prepared queries over DNS wildcards.
- Use sessions for leader election; set `-lock-delay` for safe fencing.
- Pin critical tokens to a secret manager (Vault); never commit tokens to git.
- Federation: prefer mesh gateways over raw WAN gossip for encrypted cross-DC traffic.
- Backup with `consul snapshot save` and restore with `consul snapshot restore`; test restores.
- Set `raft_multiplier` carefully; only tune with profiling data.
- Use `-config-dir` for fragments: one service per file eases CI/CD.

## Production Considerations
- Data directory on local SSD; Raft writes are synchronous — no network filesystems.
- Servers should be in the same datacenter / failure-domain aware (spread across AZs if possible).
- `bootstrap_expect` + `retry_join` for autoclustering; never use `-bootstrap` in prod.
- `reconnect_timeout`/`reconnect_timeout_wan` tuned for flapping network nodes.
- Enable `autopilot` for automatic Raft peer removal: `autopilot { cleanup_dead_servers = true }`.
- Set `max_replicas` in autopilot for server count enforcement.
- Federation needs certificates with `URI SAN` for cross-DC mTLS.
- Deploy `consul ESM` if using external nodes / instance health health-checks.
- `consul k8s` (Helm chart) for K8s bootstrap; `consul terraform-sync` (NIA) to program LB/firewalls.
- Watch `consul.raft.numPeers` and `consul.raft.leader.lastContact` for quorum health.
- Schedule `consul snapshot save` + offsite copy; restore into a fresh DC for DR drill.
- `consul operator raft list-peers` and `consul operator autopilot get-config` for ops.
- Cluster load: requests per second through the HTTP API gate; business metric = registers/sec.

## Anti-Patterns
- Single server without autopilot — no HA, silent leader loss.
- `-bootstrap` in production — two agents can split brain.
- Running servers on network storage — Raft latency/timeouts.
- ACLs disabled for "convenience" — a security hole; read default-deny.
- No gossip encryption — agents sniff each other.
- No health check on services — stale/missing instance entries.
- Using KV as primary DB — it's for config, not transactions.
- Whole-cluster `-reload` without staged cert/ACL rotation — partial DC failures.
- No snapshots — can't recover a deleted datacenter.
- WAN gossip enabled without TLS — cross-DC traffic plaintext.
- `consul connect` with default-deny disabled — no mTLS enforcement.

## References
  - references/consul-fundamentals.md — Consul architecture, gossip & Raft, agents and ports
  - references/consul-service-discovery.md — Catalog, DNS, health checks, consul-template
  - references/consul-kv-and-sessions.md — KV store, sessions, leader election, feature flags
  - references/consul-connect-mesh.md — Connect mesh, mTLS, intentions, Envoy, gateways
  - references/consul-acls-and-security.md — ACLs, tokens/roles/policies, TLS, encryption, hardening
  - references/consul-federation-and-multidc.md — WAN gossip, mesh gateways, partitions, namespaces
  - references/consul-operations-and-scale.md — Snapshots, upgrades, quorum, k8s/Helm/Terraform sync

## Handoff
- `devops-nomad` for job scheduling with Consul service discovery and Consul Connect.
- `devops-vault` for Vault secrets, dynamic credentials, and Vault+Consul integration.
- `devops-terraform` for Consul cluster provisioning with Terraform.
- `devops-monitoring` for Prometheus/Grafana observability of Consul metrics.
- `devops-kubernetes` for consul-k8s Helm chart and service mesh on K8s.