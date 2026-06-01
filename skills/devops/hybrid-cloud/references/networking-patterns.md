# Hybrid Cloud Networking Patterns

## Direct Connect Types
AWS Direct Connect: dedicated 1/10/100 Gbps, private VIF for VPC, public VIF for AWS services. Azure ExpressRoute: 50 Mbps-10 Gbps, Microsoft peering (public), private peering (VNet). GCP Dedicated Interconnect: 10/100 Gbps, VLAN attachment for VPC. Partner interconnect: via supported provider (Equinix, Megaport, ConsoleConnect). Hosted connection: 50-500 Mbps via partner.

## VPN Backup
IPsec VPN tunnel as backup for Direct Connect failure. Multiple tunnels across different ISPs. BGP dynamic routing for automatic failover. Dead peer detection (DPD) for fast convergence. Tunnel monitoring and alerting.

## Routing and BGP
BGP ASN: public (registered) or private (64512-65535). BGP communities for route tagging and manipulation. Route propagation: on-prem → cloud, cloud → on-prem. Route tables: preference for Direct Connect over VPN. Prefix limits and route filtering. BGP timers adjustment for faster failover.

## DNS Integration
Split-horizon DNS: internal vs external resolution. Route53 Resolver / Azure DNS Private Resolver for hybrid DNS. Forward on-prem DNS queries to cloud and vice versa. Conditional forwarding for specific domains. Private DNS zones replicated to on-prem.

## Traffic Optimization
Traffic symmetry: ensure return traffic follows same path. MTU: 1500 (VPN), 9001 (Direct Connect jumbo frames). QoS marking for priority traffic classes. Bandwidth monitoring and capacity planning. Latency-based routing for global traffic.

## Security Patterns
Encryption: Direct Connect traffic not encrypted by default, add IPsec or TLS. East-west traffic inspection: firewall appliance in cloud or on-prem. VPC network ACLs and security groups for transit VPC. Identity federation for hybrid access.

## References
- hybrid-cloud-fundamentals.md -- Fundamentals
- direct-connect.md -- Direct Connect
- identity-federation.md -- Identity
- data-gravity.md -- Data Gravity
- multi-cloud-dns.md -- DNS
