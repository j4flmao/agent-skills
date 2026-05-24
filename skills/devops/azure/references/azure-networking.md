# Azure Networking

## Virtual Network (VNet)

```bash
# Create VNet with subnets
az network vnet create \
  --resource-group rg-prod \
  --name vnet-prod \
  --address-prefix 10.0.0.0/16 \
  --subnet-name web-subnet \
  --subnet-prefix 10.0.1.0/24

# Add subnets
az network vnet subnet create \
  --name app-subnet \
  --vnet-name vnet-prod \
  --resource-group rg-prod \
  --address-prefix 10.0.2.0/24

# Network security group
az network nsg create --name web-nsg --resource-group rg-prod
az network nsg rule create \
  --name allow-https \
  --nsg-name web-nsg \
  --resource-group rg-prod \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --destination-port-ranges 443
```

## VNet Peering & VPN Gateway

```bash
# VNet peering (same region)
az network vnet peering create \
  --name prod-to-staging \
  --resource-group rg-prod \
  --vnet-name vnet-prod \
  --remote-vnet vnet-staging \
  --allow-vnet-access

# VPN Gateway for hybrid connectivity
az network vpn-gateway create \
  --resource-group rg-prod \
  --name vpn-gw-prod \
  --location eastus \
  --vnet vnet-prod \
  --gateway-type Vpn \
  --sku VpnGw2
```

## Azure Load Balancer

| LB Type | Layer | Scenario |
|---------|-------|----------|
| Standard LB | L4 | Regional, high-performance, HA ports |
| Application GW | L7 | HTTP(S), WAF, URL-based routing |
| Traffic Manager | DNS | Global traffic routing, multi-region |
| Front Door | L7+ | Global HTTP(S), WAF, CDN, acceleration |

```bash
# Application Gateway with WAF
az network application-gateway create \
  --name appgw-prod \
  --resource-group rg-prod \
  --capacity 2 \
  --sku WAF_v2 \
  --vnet-name vnet-prod \
  --subnet appgw-subnet \
  --http-settings-cookie-based-affinity Enabled \
  --frontend-port 443
```

## Azure Front Door

```yaml
# Global load balancing with WAF
frontend_endpoints:
  - name: app-frontend
    host_name: app.example.com
    session_affinity_enabled: true

backend_pools:
  - name: primary
    backends:
      - address: app-weu.azurewebsites.net
        priority: 1
      - address: app-eus.azurewebsites.net
        priority: 2

routing_rules:
  - frontend_endpoints: [app-frontend]
    accepted_protocols: [HttpOnly]
    patterns: [/api/*]
    forwarding_configuration:
      backend_pool: primary
      forwarding_protocol: HttpsOnly
```

## Azure DNS

```bash
# Create DNS zone
az network dns zone create --name example.com --resource-group rg-prod

# Create record sets
az network dns record-set a add-record \
  --zone-name example.com \
  --resource-group rg-prod \
  --record-set-name www \
  --ipv4-address 20.100.1.2

# Private DNS for internal resolution
az network private-dns zone create \
  --name internal.example.com \
  --resource-group rg-prod
```
