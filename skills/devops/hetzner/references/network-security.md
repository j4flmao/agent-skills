# Hetzner Network and Security

## Network Configuration
Private network: attach servers to vSwitch for internal communication. Subnet planning: /24 per network per location. Floating IPs: assign to server, enable HA failover. Additional IPs: multiple public IPs per server. IPv6: /64 subnet per server. Firewall rules per server or per label.

## Firewall Management
Hetzner Cloud Firewall: stateful, label-based, applied to multiple servers. Rules: inbound (source IP, port, protocol), outbound (destination IP, port, protocol). Apply firewall to new servers automatically via labels. API-managed firewall rules for automation. Default deny inbound, allow established connections.

## SSH Key Management
Add SSH keys via Hetzner Cloud Console or API. Keys stored per project, available to all servers. Use separate keys for different teams. Rotate keys periodically via API. Size limit: 4096-bit RSA or Ed25519.

## Load Balancers
Hetzner Cloud Load Balancer: HTTP/HTTPS, TCP, TLS termination. Health checks (HTTP, TCP) per target. Algorithm: round-robin, least-connections. Target group: servers by label selector. Public and private load balancers. Target traffic distribution configuration.

## Backups and Snapshots
Backup: automatic daily backups, 7-day retention, per-server. Snapshot: manual, point-in-time, create new server from snapshot. Image: customized OS image, shareable within project. Automated snapshot creation with API/CLI. Cross-location snapshot copy.

## Security Best Practices
Closed by default: block all ports except SSH. Use Cloud Firewall not just OS firewall. Regular OS updates: unattended-upgrades or automated patching. Fail2ban for SSH brute force protection. Monitor Hetzner security advisories. API tokens with minimal scopes, regularly rotated.

## References
- hetzner-fundamentals.md -- Fundamentals
- hetzner-cloud.md -- Cloud
- dedicated-servers.md -- Dedicated Servers
- hetzner-kubernetes.md -- Kubernetes
- storage-backup.md -- Storage and Backups
