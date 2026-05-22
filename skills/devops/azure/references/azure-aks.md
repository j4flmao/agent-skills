# Azure AKS

## Cluster Creation

```bash
# Create AKS with Azure AD and Azure CNI
az aks create \
  --resource-group rg-platform-prod \
  --name aks-prod \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --enable-aad \
  --enable-azure-rbac \
  --network-plugin azure \
  --network-policy calico \
  --vnet-subnet-id /subscriptions/.../subnets/aks \
  --generate-ssh-keys \
  --nodepool-name system

# Add user node pool
az aks nodepool add \
  --resource-group rg-platform-prod \
  --cluster-name aks-prod \
  --name userpool \
  --node-count 3 \
  --min-count 1 \
  --max-count 10 \
  --enable-cluster-autoscaler \
  --node-vm-size Standard_D8s_v3

# Get credentials
az aks get-credentials --resource-group rg-platform-prod --name aks-prod
```

## Workload Identity

```bash
# Enable OIDC issuer
az aks update --resource-group rg-platform-prod --name aks-prod --enable-oidc-issuer

# Create managed identity
az identity create --resource-group rg-platform-prod --name myapp-identity

# Create federated credential
az identity federated-credential create \
  --name myapp-federated \
  --identity-name myapp-identity \
  --resource-group rg-platform-prod \
  --issuer $(az aks show -g rg-platform-prod -n aks-prod --query oidcIssuerProfile.issuerUrl -o tsv) \
  --subject system:serviceaccount:myapp:myapp-sa
```

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-sa
  namespace: myapp
  annotations:
    azure.workload.identity/client-id: <MANAGED_IDENTITY_CLIENT_ID>
```

## Monitoring with Container Insights

```bash
az aks enable-addons \
  --resource-group rg-platform-prod \
  --name aks-prod \
  --addons monitoring \
  --workspace-resource-id /subscriptions/.../workspaces/loganalytics-prod
```

## Autoscaling

```yaml
# Cluster Autoscaler profile
az aks update \
  --resource-group rg-platform-prod \
  --name aks-prod \
  --cluster-autoscaler-profile \
    scan-interval=10s \
    scale-down-delay-after-add=10m \
    scale-down-unneeded-time=10m

# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
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

## Cost Optimization

```bash
# Stop/start for non-production
az aks stop --resource-group rg-platform-dev --name aks-dev
az aks start --resource-group rg-platform-dev --name aks-dev

# Use spot node pool
az aks nodepool add \
  --resource-group rg-platform-prod \
  --cluster-name aks-prod \
  --name spotpool \
  --priority Spot \
  --eviction-policy Delete \
  --spot-max-price -1 \
  --node-count 2
```
