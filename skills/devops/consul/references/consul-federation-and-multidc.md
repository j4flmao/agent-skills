# Consul Federation and Multi-Datacenter

## Overview
Federation lets multiple Consul datacenters discover each other and route service traffic across regions with consistent ACL/CA — either over encrypted WAN gossip or through mesh gateways only.

## Federation Topologies

| Topology | How | When |
|----------|-----|------|
| **WAN gossip (traditional)** | Servers join WAN pool over 8302 | Quick multi-DC, same security domain |
| **Mesh gateways only** | No WAN gossip; gateways carry mTLS traffic | Strict isolation, untrusted networks |

## Datacenter concepts
- **Datacenter**: a logical Consul cluster (usually a region): 3–5 servers, many clients.
- **Admin partition**: enterprise — isolate tenants with separate CRUD fabric.
- **Namespace**: enterprise — within a DC, segments services/policies.
- **Datacenter name** must be lowercase; referenced in DNS as `<svc>.service.<dc>.consul`.

## WAN gossip federation
```hcl
datacenter = "dc1"
```
On servers, to join remote DCs:
```bash
consul join -wan <dc2-server1:8302> <dc2-server2:8302>
```
or via config:
```hcl
retry_join_wan = ["10.0.2.11:8302", "10.0.2.12:8302"]
```
Once joined, every DC's servers gossip on the WAN pool. Verify:
```bash
consul members -wan
consul catalog datacenters
```

## Mesh gateway federation (recommended)
Use mesh gateways for cross-DC Connect traffic; keep every DC isolated at the gossip layer.

```hcl
# On each DC's boundary nodes
service {
  name = "mesh-gateway"
  port = 8443
  kind = "mesh-gateway"
}
```
```bash
consul connect envoy -mesh-gateway -register -address <node-ip>:8443
consul connect envoy -mesh-gateway -register -address <node2-ip>:8443
```
Remote service access:
```
DNS: api.service.dc2.consul  ->  served via local gateway
```

## Cross-DC mTLS / CA
- A single Connect CA (cluster root) signs all DCs; leaf identity includes the DC.
- Certificates must have SPIFFE with URI SANs per DC.
- Verify remote DC reachability before relying on it in failover.

## Prepared queries with failover
```bash
consul query create -name "web-global" \
  -service web \
  -failover 1 \
  -datacenters dc1 dc2
dig @127.0.0.1 -p 8600 web-global.query.consul +short
```
Prepared queries offer `Datacenters` order + `Failover` config — ideal for global services.

## Replication
- **KV replication**: `consul kv put` is local; use `consul kv bind`/`replication` (enterprise) for KV copies across DCs. OSS replicates the catalog (nodes/services), not KV.
- Blocking queries let a DC mirror remote data.

## Failure scenarios
| Scenario | Behavior | Remediation |
|----------|----------|-------------|
| Partner DC unreachable | `-failover` circuits to next DC | Keep ≥3 servers; autopilot |
| Gossip partition between two DCs | Datacenters separate, data still local | Use mesh gateway or check `consul members -wan` |
| Cached remote via `cache` | eventual consistency | configure TTL |

## Best Practices
- Use mesh gateways for cross-DC service traffic; WAN gossip (if any) only for DC discovery.
- One CA across DCs; store CA in Vault.
- Test failover with prepared queries in CI.
- Keep DC names stable; changing them breaks DNS/SRV labels.
- Enterprise: use admin partitions to isolate tenants; namespaces for per-team policies.

## Anti-Patterns
- WAN gossip on internet — encrypt with `encrypt` + TLS or use gateways.
- Relying on a single remote DC for every query (no failover).
- Changing DC names after teams started using DNS.
- Assuming KV replicates cross-DC in OSS — it does not.

## Checklist
- [ ] `consul catalog datacenters` returns all DCs.
- [ ] WAN gossip joined (if used) and encrypted.
- [ ] Mesh gateways registered and routing DC-to-DC.
- [ ] CA covers all DCs with proper URI SANs.
- [ ] Prepared queries have failover DCs.
- [ ] OSS KV not used cross-DC where replication is needed.