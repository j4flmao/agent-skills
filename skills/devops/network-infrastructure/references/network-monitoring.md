# Network Monitoring and Telemetry

## SNMP Monitoring
SNMPv3: authenticated and encrypted, preferred over v2c/v1. OIDs: per-device metrics (CPU, memory, interface traffic). MIBs: translate numeric OIDs to human-readable names. Polling frequency: production (60s), non-critical (300s). Trap receivers: SNMP traps for event-driven alerts. Bandwidth utilization: ifInOctets, ifOutOctets delta over time.

## Flow Data
NetFlow v5/v9: Cisco-proprietary flow export. sFlow: packet sampling, vendor-neutral. IPFIX: standardized successor to NetFlow. Flow analysis: top talkers, protocol distribution, traffic matrix. Elasticsearch + Kibana for flow visualization. Flow-based anomaly detection (DDoS, bandwidth spike).

## Infrastructure Monitoring
Device health: CPU, memory, temperature, fan speed, power supply. Interface status: up/down, errors, discards, CRC errors. Optical transceiver monitoring: TX power, RX power, temperature, voltage. BGP session status: established vs down, prefixes received. STP topology changes: unexpected changes cause loops.

## Latency and Jitter Monitoring
ICMP ping: basic reachability and RTT. TWAMP/LM: two-way active measurement, standardized. Juniper RPM / Cisco IP SLA: integrated performance monitoring. Path MTU discovery monitoring. VoIP quality: MOS score, jitter, packet loss.

## Log Management
Syslog: centralized log collection (rsyslog, syslog-ng). Log severity: emerg, alert, crit, error, warning, notice, info, debug. Log correlation: link event with BGP event with interface error. Time synchronization: NTP for consistent timestamps. Log retention: 90 days online, 1 year archive.

## Network Automation for Monitoring
Ansible: configure SNMP, syslog, NTP on network devices. Napalm: retrieve operational data from devices. NetBox: source of truth for device inventory and IPAM. Prometheus SNMP exporter: SNMP to Prometheus metrics. Grafana dashboards for network visualization.

## References
- network-infrastructure-fundamentals.md -- Fundamentals
- leaf-spine.md -- Leaf-Spine
- bgp-anycast.md -- BGP Anycast
- sd-wan-mpls.md -- SD-WAN and MPLS
- vrrp-hsrp.md -- VRRP and HSRP
