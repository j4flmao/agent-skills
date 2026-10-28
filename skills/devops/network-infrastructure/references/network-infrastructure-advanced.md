# Network Infrastructure: Advanced Topics

Advanced practices for operating production networks: network automation and source of truth, pre-change verification, model-driven telemetry, BGP security (RPKI, filtering), EVPN-VXLAN operations, traffic engineering, QoS, DDoS defence and zero-touch provisioning. Fabric and BGP fundamentals are in `leaf-spine.md` and `bgp-anycast.md`; monitoring in `network-monitoring.md`.

## Source of Truth and Automation

```
NetBox / Nautobot (intended state: devices, IPs, VLANs, circuits, cabling)
      -> templates (Jinja2) / models
      -> config generation
      -> verification (Batfish, lint, diff)
      -> deployment (Ansible, Nornir, NAPALM, vendor APIs, gNMI Set)
      -> validation (state checks, telemetry)
```

| Tool | Role |
|------|------|
| NetBox / Nautobot | Source of truth for intended state; APIs and webhooks |
| Ansible (vendor collections), Nornir | Orchestration of config pushes |
| NAPALM | Vendor-neutral get/compare/commit/rollback |
| gNMI / OpenConfig | Model-driven config and streaming telemetry |
| Batfish | Offline analysis of configs: reachability, ACL behaviour, BGP sessions, differential impact |
| Containerlab | Lab topologies with containerized NOS images for CI |

### GitOps for Network Config

1. Change data in the source of truth or templates via pull request.
2. CI renders configs, runs lint and Batfish checks, and deploys to a Containerlab replica.
3. Reviewers see rendered config diffs.
4. Deploy in waves (one device, one pod, then fabric) with automatic post-checks and rollback (`commit confirmed` where supported).

### Batfish Example

```python
from pybatfish.client.session import Session
from pybatfish.datamodel.flow import HeaderConstraints

bf = Session(host="localhost")
bf.set_network("dc1")
bf.init_snapshot("snapshots/candidate", name="candidate", overwrite=True)

sessions = bf.q.bgpSessionStatus().answer().frame()
assert (sessions["Established_Status"] == "ESTABLISHED").all(), sessions

answer = bf.q.reachability(
    pathConstraints=None,
    headers=HeaderConstraints(srcIps="10.10.0.0/16", dstIps="10.20.5.10", applications=["https"]),
    actions="SUCCESS",
).answer().frame()
assert not answer.empty, "web tier must reach payments VIP on 443"
```

## Model-Driven Telemetry

- Streaming telemetry (gNMI Subscribe, sampled or on-change) replaces SNMP polling for counters, BGP state and optics at higher resolution.
- Collect with gnmic or Telegraf, store in Prometheus/VictoriaMetrics/InfluxDB, alert on interface errors, BGP state changes, optic power, buffer drops.
- Flow telemetry (sFlow, IPFIX) for traffic matrices and DDoS detection.

## BGP Security and Hygiene

| Control | Purpose |
|---------|---------|
| Prefix filters (IRR-based, e.g. bgpq4-generated) | Accept only prefixes a peer/customer is authorized to announce |
| RPKI Route Origin Validation | Drop RPKI-invalid routes (RFC 6811); publish ROAs for your own prefixes |
| Max-prefix limits | Protect against full-table leaks from peers |
| Bogon and default-route filters | Never accept or leak bogons |
| BGP roles / Only-to-Customer (RFC 9234) | Prevent route leaks where supported |
| TCP-AO (or the older RFC 2385 TCP signature option) and GTSM (TTL security) | Protect sessions |
| ASPA | Emerging AS path validation; track vendor support |
| Graceful shutdown community (RFC 8326) | Drain traffic before maintenance |

Run RPKI validators (Routinator, rpki-client, FORT) redundantly and feed routers via RTR.

## EVPN-VXLAN Operations

- Control plane: BGP EVPN route types 2 (MAC/IP), 3 (inclusive multicast for BUM), 5 (IP prefix).
- Symmetric IRB with L3 VNIs for inter-subnet routing; anycast gateway (same gateway IP/MAC on every leaf).
- ESI multihoming (EVPN all-active) instead of MLAG for standards-based server dual-homing.
- Operational checks: VTEP reachability, VNI-to-VLAN mapping consistency, EVPN route counts per VNI, duplicate MAC detection, MTU headroom for VXLAN (50 bytes).
- Segment tenants with VRFs; route leaking between VRFs only through explicit policy or firewalls.

## Traffic Engineering

| Technique | Use |
|-----------|-----|
| BGP attributes (local-pref, MED, AS-path prepend, communities) | Inter-domain inbound/outbound preferences |
| ECMP / UCMP | Spread load across equal or weighted paths |
| Segment Routing (SR-MPLS, SRv6) | Source-routed paths, TI-LFA fast reroute, controller-driven TE |
| RSVP-TE | Legacy MPLS TE; largely replaced by SR in new designs |

Fast convergence: BFD for sub-second failure detection, BGP PIC (prefix independent convergence), tuned timers only where hardware supports them.

## Quality of Service

- Classify and mark at the edge (DSCP), trust markings only from known sources.
- Queue per class with strict priority for real-time traffic (bounded), weighted queues for others.
- Data center lossless classes (PFC + ECN/DCQCN) for RDMA/RoCE storage and AI training traffic; misconfigured PFC can cause deadlocks and head-of-line blocking, so monitor pause frames.
- AI/ML fabrics: high-radix, non-blocking designs, adaptive routing and congestion control features (vendor- and Ultra Ethernet-specific); validate with collective-communication benchmarks.

## DDoS Defence

| Layer | Defence |
|-------|---------|
| Volumetric (L3/L4) | Upstream scrubbing services, cloud DDoS protection, anycast distribution, RTBH (remote triggered black hole) and BGP Flowspec |
| Protocol (SYN floods) | SYN cookies, stateful firewall tuning, rate limits |
| Application (L7) | WAF, bot management, rate limiting at CDN/edge |

Pre-arrange scrubbing activation (BGP diversion, GRE return tunnels), test it, and keep runbooks with thresholds.

## Zero-Touch Provisioning

- Devices boot, obtain DHCP options pointing to a ZTP/provisioning server, download OS image and day-0 config generated from the source of truth.
- Verify device identity (serial/secure ZTP with certificates per RFC 8572 where supported) before handing out configs containing secrets.
- Post-provisioning: automated validation (LLDP neighbours match intended cabling, BGP sessions up).

## Change Safety

- Maintenance windows for risky changes; pre-checks and post-checks captured automatically (route counts, BGP neighbours, interface states).
- Drain before change (BGP graceful shutdown, MLAG/ESI isolation), verify traffic moved, change, undrain.
- Keep rollback configs; use `commit confirmed` / candidate config features.
- Post-incident: add a Batfish or lab test reproducing the failure.

## Checklist

- [ ] Source of truth drives generated configs; no manual drift
- [ ] Batfish and lab validation in CI before deployment
- [ ] Streaming telemetry for interfaces, BGP and optics
- [ ] RPKI ROV, IRR filters, max-prefix and session protection on all external BGP
- [ ] EVPN-VXLAN consistency checks and MTU headroom
- [ ] DDoS mitigation path tested
- [ ] Changes deployed in waves with drain, checks and rollback
