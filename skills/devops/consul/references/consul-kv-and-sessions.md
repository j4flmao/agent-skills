# Consul KV and Sessions

## Overview
The KV store is a distributed, replicated key/value registry served by the Raft datacenter. It is for configuration, feature flags, leader election, and small coordination state — not a database. Sessions provide lock semantics on top of KV.

## KV Store

### API / CLI operations
```bash
consul kv put config/webapp/feature_flag enabled
consul kv get config/webapp/feature_flag
consul kv get -recurse config/webapp
consul kv delete config/webapp/feature_flag
consul kv put -flags=7 config/webapp/version 2
consul kv import config.json    # bulk
consul kv export -recurse config/webapp
```
HTTP equivalents: `/v1/kv/:key`. Keys are UTF-16 path segments; folder semantics come from recursion, not actual folders.

### Values + Meta
- Values are byte arrays (base64 in API).
- Flags (uint64) are per-key metadata for versioning or feature gates.
- Support atomic operations: `Check-And-Set` (CAS) and `check-and-modify`.

### Protecting writes
```bash
# CAS: only succeed if current = expected
consul kv put -cas -modify-index=0 config/webapp/version 3
```
The `ModifyIndex` you read is the CAS precondition.

## Configuration Injection (consul-template)
```hcl
template {
  contents = <<EOF
db_host = {{ key "config/webapp/db_host" }}
feature = {{ key "config/webapp/feature_flag" }}
EOF
  destination = "/etc/webapp.conf"
  command = "systemctl reload webapp"
}
```
`consul-template -config /etc/consul-template/config.hcl`. Changes to watched keys trigger re-render + command. For K8s, `consul-k8s` injects config as env vars / volumes.

## Sessions

### Session mechanics
A session is a distributed lock:
- Bound to a node + optional health checks.
- Has a TTL; the lock is released if the node fails health or TTL expires.
- Used with KV via `-acquire` / `-release`.

### Create and use
```bash
consul session create -name app-session -ttl 60s -lock-delay 15s
consul session create -node node1 -checks web-http -ttl 60s
consul kv put -acquire -session=<id> leader/webapp $(hostname)
consul kv put -release -session=<id> leader/webapp $(hostname)
consul session info <id>
```
- `-acquire` returns true only if you hold the lock key.
- `-lock-delay` = fencing grace: the key stays locked briefly after release so a stale holder observes a delay (prevents split-brain).

### Leader election pattern
1. Each candidate tries `kv put -acquire leader/job <node>`.
2. The winner holds the lock; others poll.
3. On crash/health failure the session is invalidated and the lock frees.
4. Optionally watch `/v1/kv/leader/job` with a blocking query for reactivity.

### Session invalidation
Held in Serf/health; if the node dies or checks fail, the session is invalidated and `session/isTTL` for TTL sessions eventually expires. The lock is then free.

## Best Practices
| Practice | Why |
|----------|-----|
| CAS on config writes | Prevent accidental overwrite |
| TTL on session | Self-healing locks |
| `-lock-delay` ≥ network worst case | Fencing safety |
| Injected via consul-template / k8s | No polling loop in app code |
| Blocking queries (`index` param) | Efficient watchers, low load |

## Pitfalls
- KV used as a database → raft write amplification, loss on `drop-lock` only of locks.
- No TTL on session → stale lock holder if node hangs without health check.
- Polling the KV API from hundreds of apps → API flood; use blocking queries or DNS.
- `-acquire` on a key that's not yours → fails silently; always check return code.
- Forgetting `-lock-delay` → brief double-leader after failover.

## Checklist
- [ ] Writes protected with CAS where needed.
- [ ] Sessions have TTL + relevant check.
- [ ] Leader election uses `-acquire`/`-release` with lock-delay.
- [ ] consul-template (or k8s injection) for config consumption.
- [ ] No transactions/logic stored in KV (use a database).