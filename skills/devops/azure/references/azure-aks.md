# Azure Kubernetes Service (AKS): Cluster Setup, Identity, Scaling, Cost

Production-oriented AKS commands and manifests using the Azure CLI. Prefer expressing the same settings in Bicep or Terraform (`azurerm_kubernetes_cluster`) once the design is settled; the CLI is shown here because its flags map one-to-one to cluster properties.

## Networking Choices

| Option | Pod IPs | When to use |
|--------|---------|-------------|
| Azure CNI Overlay (`--network-plugin azure --network-plugin-mode overlay`) | Private overlay CIDR, not from the VNet | Default choice for most clusters; conserves VNet address space |
| Azure CNI (flat / VNet) | From the VNet subnet | Pods must be directly routable from peered networks |
| Azure CNI powered by Cilium (`--network-dataplane cilium`) | Overlay or VNet | eBPF dataplane and Cilium network policy |
| kubenet | NAT'd | Legacy; Microsoft has announced its retirement, avoid for new clusters |

## Cluster Creation

```bash
az aks create \
  --resource-group rg-platform-prod \
  --name aks-prod \
  --location westeurope \
  --tier standard \
  --kubernetes-version 1.33 \
  --nodepool-name system \
  --node-count 3 \
  --node-vm-size Standard_D4s_v5 \
  --zones 1 2 3 \
  --enable-aad \
  --enable-azure-rbac \
  --disable-local-accounts \
  --network-plugin azure \
  --network-plugin-mode overlay \
  --network-dataplane cilium \
  --vnet-subnet-id "$SUBNET_ID" \
  --enable-oidc-issuer \
  --enable-workload-identity \
  --auto-upgrade-channel patch \
  --node-os-upgrade-channel NodeImage \
  --generate-ssh-keys
```

- `--tier standard` gives the financially backed API server SLA; `free` is for dev.
- Use a version that `az aks get-versions --location westeurope -o table` lists as supported.
- `--disable-local-accounts` forces Entra ID authentication (no static admin kubeconfig).

### Dedicated system pool and user pools

```bash
# Keep only critical add-ons on the system pool
az aks nodepool update -g rg-platform-prod --cluster-name aks-prod -n system \
  --node-taints CriticalAddonsOnly=true:NoSchedule

az aks nodepool add \
  --resource-group rg-platform-prod \
  --cluster-name aks-prod \
  --name userpool \
  --mode User \
  --zones 1 2 3 \
  --node-vm-size Standard_D8s_v5 \
  --enable-cluster-autoscaler --min-count 1 --max-count 10

az aks get-credentials --resource-group rg-platform-prod --name aks-prod
kubelogin convert-kubeconfig -l azurecli   # Entra ID auth for kubectl
```

## Workload Identity

Microsoft Entra Workload ID replaces the deprecated AAD Pod Identity. Pods exchange a projected service-account token for an Entra token via federated credentials.

```bash
ISSUER=$(az aks show -g rg-platform-prod -n aks-prod --query oidcIssuerProfile.issuerUrl -o tsv)

az identity create --resource-group rg-platform-prod --name myapp-identity
CLIENT_ID=$(az identity show -g rg-platform-prod -n myapp-identity --query clientId -o tsv)

az identity federated-credential create \
  --name myapp-federated \
  --identity-name myapp-identity \
  -g rg-platform-prod \
  --issuer "$ISSUER" \
  --subject system:serviceaccount:myapp:myapp-sa \
  --audiences api://AzureADTokenExchange

# Grant only what the app needs, e.g. read secrets from one Key Vault
az role assignment create --assignee "$CLIENT_ID" \
  --role "Key Vault Secrets User" --scope "$KEYVAULT_ID"
```

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-sa
  namespace: myapp
  annotations:
    azure.workload.identity/client-id: "<MANAGED_IDENTITY_CLIENT_ID>"
---
# Pod template must opt in with this label
metadata:
  labels:
    azure.workload.identity/use: "true"
spec:
  serviceAccountName: myapp-sa
```

Azure SDKs pick the token up automatically through `DefaultAzureCredential` / `WorkloadIdentityCredential`.

## Monitoring

```bash
# Container Insights (logs) to a Log Analytics workspace
az aks enable-addons -g rg-platform-prod -n aks-prod \
  --addons monitoring --workspace-resource-id "$LAW_ID"

# Managed Prometheus metrics to an Azure Monitor workspace
az aks update -g rg-platform-prod -n aks-prod \
  --enable-azure-monitor-metrics \
  --azure-monitor-workspace-resource-id "$AMW_ID" \
  --grafana-resource-id "$GRAFANA_ID"
```

Container Insights log ingestion is a common cost driver: use the cost-optimized data collection settings and filter namespaces you do not need.

## Autoscaling

```bash
az aks update -g rg-platform-prod -n aks-prod \
  --cluster-autoscaler-profile \
    scan-interval=10s \
    scale-down-delay-after-add=10m \
    scale-down-unneeded-time=10m \
    balance-similar-node-groups=true
```

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
  namespace: myapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

Event-driven scaling: enable the KEDA add-on (`az aks update --enable-keda`). Node autoprovisioning based on Karpenter is available as `--node-provisioning-mode Auto`; it replaces the cluster autoscaler for those pools, so do not combine both on the same capacity.

## Upgrades

```bash
az aks get-upgrades -g rg-platform-prod -n aks-prod -o table
az aks nodepool update -g rg-platform-prod --cluster-name aks-prod -n userpool --max-surge 33%
az aks upgrade -g rg-platform-prod -n aks-prod --kubernetes-version <next-minor>
```

- Upgrade one minor version at a time; set PodDisruptionBudgets so drains do not take a service down.
- Configure a planned maintenance window (`az aks maintenanceconfiguration add`) for auto-upgrades.

## Cost Optimization

```bash
# Stop/start non-production clusters outside working hours
az aks stop  --resource-group rg-platform-dev --name aks-dev
az aks start --resource-group rg-platform-dev --name aks-dev

# Spot node pool for interruptible workloads
az aks nodepool add \
  -g rg-platform-prod \
  --cluster-name aks-prod \
  --name spotpool \
  --priority Spot \
  --eviction-policy Delete \
  --spot-max-price -1 \
  --enable-cluster-autoscaler --min-count 0 --max-count 10
```

Spot pools get the taint `kubernetes.azure.com/scalesetpriority=spot:NoSchedule`; only workloads that tolerate it (and can handle eviction) land there. Enable the AKS cost analysis add-on (`--enable-cost-analysis`, Standard/Premium tier) for namespace-level cost views.

## Pitfalls

| Pitfall | Fix |
|---------|-----|
| Subnet too small for flat Azure CNI | Use CNI Overlay or size the subnet for max nodes x max pods |
| Static admin kubeconfig in CI | `--disable-local-accounts` + workload identity / federated credentials for pipelines |
| Workloads on the system pool | Taint the system pool with `CriticalAddonsOnly` |
| Single-zone node pools | `--zones 1 2 3` at creation (cannot be changed later on a pool) |
| Skipping several minor versions | Upgrade sequentially; track the AKS release calendar |

## Checklist

- [ ] Standard tier, availability zones, separate system/user pools
- [ ] Entra ID auth, Azure RBAC, local accounts disabled
- [ ] Workload Identity for every pod that calls Azure APIs
- [ ] Auto-upgrade channels and maintenance window configured
- [ ] Managed Prometheus + Container Insights with cost controls
- [ ] Autoscaler bounds set; spot only for interruptible work
