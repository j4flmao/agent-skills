# Azure Compute

## Virtual Machines

| Feature | VM | VMSS |
|---------|-----|------|
| Scaling | Manual stop/start | Auto-scale by metric/schedule |
| Load balancing | Azure Load Balancer | Integrated with LB/ASG |
| State | Stateful | Stateless (ideal for scaling) |
| Use case | Legacy apps, stateful | Stateless web, batch processing |
| Availability | Availability Set / Zone | Distributed across zones |

```bash
# Create VM with advanced options
az vm create \
  --resource-group rg-prod \
  --name web-vm-001 \
  --image Ubuntu2204 \
  --size Standard_D2s_v5 \
  --admin-username deploy \
  --ssh-key-values ~/.ssh/id_rsa.pub \
  --public-ip-sku Standard \
  --zone 1 \
  --vnet-name vnet-prod \
  --subnet web-subnet \
  --nsg web-nsg
```

## AKS (Azure Kubernetes Service)

| Feature | Description |
|---------|-------------|
| Control plane | Microsoft-managed (free) |
| Node pools | System + User pools, Windows/Linux |
| Identity | Managed Identity, Azure AD integration, Pod Identity |
| Networking | Azure CNI, Kubenet, Cilium |
| Scaling | Cluster autoscaler, Virtual Node (ACI) |
| Storage | Azure Disk, Azure Files, Azure NetApp Files |
| Security | Azure Policy, Defender for Cloud, Key Vault |

```bash
# Create AKS cluster
az aks create \
  --resource-group rg-prod \
  --name aks-prod \
  --node-count 3 \
  --node-vm-size Standard_D4s_v5 \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 10 \
  --enable-managed-identity \
  --network-plugin azure \
  --enable-oidc-issuer \
  --enable-workload-identity
```

## App Service

| Plan | CPU | Memory | Scale-out | Use Case |
|------|-----|--------|-----------|----------|
| Free/Shared | Shared | 1GB | 0 | Dev/test |
| Basic | Dedicated | 1.75GB | 3 instances | Low traffic |
| Standard | Dedicated | 1.75GB | 30 instances, auto-scale | Production |
| Premium | Dedicated | 3.5GB | 30 instances, private endpoints | High traffic |
| Isolated | Dedicated | 7GB | 100 instances, dedicated VNet | Compliance/regulated |

## Azure Functions

| Hosting Plan | Scaling | Timeout | Max Instances |
|-------------|---------|---------|---------------|
| Consumption | Auto-scale | 5-10min | 200 (default) |
| Premium | Pre-warmed | 30-60min | 100 (default) |
| Dedicated (App Service) | Manual/auto | Unlimited | Plan limit |

## Batch

```bash
# Create Batch account and pool
az batch account create --name batch-prod --resource-group rg-prod
az batch pool create \
  --id render-pool \
  --vm-size Standard_D2s_v5 \
  --target-dedicated-nodes 5 \
  --node-agent-sku-id "batch.node.ubuntu 22.04" \
  --image "UbuntuServer:22.04-LTS"
```

## Container Instances

```bash
# Quick container deployment (no orchestration needed)
az container create \
  --resource-group rg-prod \
  --name batch-processor \
  --image myregistry.azurecr.io/batch:v1 \
  --cpu 4 --memory 8 \
  --restart-policy OnFailure
```
