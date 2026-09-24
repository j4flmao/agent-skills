# Consul Operations and Scale

## Overview
Day-2 operations for Consul: snapshots/backups, upgrades, quorum health, autopilot, capacity, and integration with Terraform, Kubernetes (consul-k8s Helm), and consul-terraform-sync (NIA).

## Snapshots and Backups
```bash
consul snapshot save backup.snap
consul snapshot inspect backup.snap
consul snapshot restore backup.snap   # needs management token
```
- Snapshots capture Raft state (catalog, ACLs, KV, sessions, intentions) — cheap, reload-safe.
- Schedule offsite: `0 3 * * * consul snapshot save /backups/$(date +%F).snap`.
- Always test a restore in a fresh DC/scratch before relying on it.
- Do not hot-copy `data_dir` while running.

## Autopilot (autopilot.hcl on servers)
```hcl
autopilot {
  cleanup_dead_servers = true
  disable_upgrade_migration = false
  max_replicas = 3
}
```
- Removes dead peers automatically.
- `max_replicas` caps servers; extra read-only replicas are allowed.
- `consul operator autopilot get-config` to verify.

## Raft / Quorum health checks
```bash
consul operator raft list-peers       # see who's leader/follower, last contact
consul operator raft remove-peer -address 10.0.1.14:8300
consul operator raft snapshot restore backup.snap
```
Metrics to watch:
- `consul.raft.leader` — should be 1.
- `consul.raft.numPeers` — 3/5 as configured.
- `consul.raft.leader.lastContact` — stale if lagging.
- `consul.raft.bootstrapped` — 1 after first bootstrap.

## Upgrades
### In-place rolling upgrade (OSS)
1. Snapshot before.
2. Replace one server at a time: stop, upgrade binary, start; watch `consul members`.
3. Repeat for each server; clients can be upgraded in any order.
4. Upgrade clients + servers in the same release window; mixed versions limited (minor).

### Zero-downtime
- Keep `bootstrap_expect` stable; the leader holds during rolling restart.
- Upgrade servers := 3-server: stop 1, run 2 → if the leader is down, elect new leader; upgrades are safe if servers remain ≥ quorum.

### Autopilot + `-retry-join`
Use `consul operator raft remove-peer` if a dead node lingers.

## Kubernetes + Helm (consul-k8s)
```bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm install consul hashicorp/consul \
  --set global.name=consul \
  --set global.image=hashicorp/consul:1.19 \
  --set ui.enabled=true \
  --set controller.enabled=true \
  --set connectInject.enabled=true
```
- `connectInject` transparently injects Envoy sidecars into pods (annotations).
- `controller` syncs K8s services ↔ Consul services.
- `server.replicas=3,5`; use an external load balancer for API.
- ACLs auto-enabled by default in newer charts; tokens via `consul-k8s` generated.
- `consul-k8s` binary provides `-dataplane` transparent proxy.

## Terraform provisioning
```hcl
# terraform-consul-nomad examples:
resource "aws_instance" "consul_servers" { count = 3 ... }
```
Usually paired with `terraform-provider-consul` for services, KV, ACLs, intentions:
```hcl
resource "consul_service" "web" {
  name = "web"; port = 8080
  address = "10.0.1.50"
}
```

## consul-terraform-sync (NIA — network infrastructure automation)
- Watches the Consul catalog; runs Terraform to re-program routers, firewalls, LB (F5/Panorama/NSX) when services change.
- `consul-terraform-sync run -config-file=config.hcl`.
- Define `condition` blocks (e.g., `services`, `catalog-services`, `kv`) to trigger runs; driver via Terraform modules.

## Capacity / scale guidance
| Metric | Rule of thumb |
|--------|---------------|
| Services per DC | thousands; keep registrations modest |
| Queries per second | API + DNS per server: tune `performance` + blocking queries |
| KV writes | Raft is sync — high write volume amplifies; batch with CAS |
| Clients per server | ~10k clients per server with active health checks |
| RAM | 2–4 GB/server (plus agents); more with large KV/ACL |

## Day-2 scripts
```bash
consul members -detailed
consul operator raft list-peers
consul operator autopilot get-config
consul catalog health -service web
consul kv export -recurse / | consul kv import -
```

## Best Practices / Anti-Patterns
- Snapshot every DC; test restores.
- Use autopilot (cleanup_dead_servers).
- Rolling upgrades, one server at a time; keep quorum.
- Never use `-bootstrap` in production (once, during first-boot only).
- Don't store `data_dir` on NFS, don't run 2 servers, don't skip TLS.

## Checklist
- [ ] Scheduled snapshots + tested restore.
- [ ] Autopilot on; `raft list-peers` clean.
- [ ] Rolling upgrade runbook with quorum floor.
- [ ] Helm/Terraform/Sync integration documented.
- [ ] Capacity & metrics dashboards (raft, peers, ACL reject, service counts).