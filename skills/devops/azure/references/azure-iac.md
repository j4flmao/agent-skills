# Azure IaC

## Bicep File Structure

```bicep
// main.bicep
param environment string
param location string = resourceGroup().location

var tags = {
  environment: environment
  managedBy: 'bicep'
  costCenter: 'platform-engineering'
}

module networking './modules/networking.bicep' = {
  name: 'networking-${environment}'
  params: {
    location: location
    tags: tags
    environment: environment
  }
}

module aks './modules/aks.bicep' = {
  name: 'aks-${environment}'
  params: {
    location: location
    tags: tags
    environment: environment
    vnetId: networking.outputs.vnetId
  }
}

output aksClusterId string = aks.outputs.clusterId
```

## Bicep Module

```bicep
// modules/aks.bicep
@description('AKS cluster with Azure AD integration')
param environment string
param location string
param vnetId string
param tags object

resource aks 'Microsoft.ContainerService/managedClusters@2023-08-01' = {
  name: 'aks-${environment}'
  location: location
  tags: tags
  properties: {
    kubernetesVersion: '1.27'
    dnsPrefix: 'aks-${environment}'
    enableRBAC: true
    aadProfile: {
      managed: true
      enableAzureRBAC: true
    }
    networkProfile: {
      networkPlugin: 'azure'
      networkPolicy: 'calico'
      serviceCidr: '10.0.0.0/16'
      dnsServiceIP: '10.0.0.10'
    }
    agentPoolProfiles: [
      {
        name: 'system'
        mode: 'System'
        vmSize: 'Standard_D4s_v3'
        count: 3
        vnetSubnetId: '${vnetId}/subnets/aks-system'
      }
      {
        name: 'user'
        mode: 'User'
        vmSize: 'Standard_D8s_v3'
        count: 3
        minCount: 1
        maxCount: 10
        enableAutoScaling: true
        vnetSubnetId: '${vnetId}/subnets/aks-user'
      }
    ]
  }
  identity: {
    type: 'SystemAssigned'
  }
}

output clusterId string = aks.id
output clusterFqdn string = aks.properties.fqdn
```

## Deployment

```bash
# Preview
az deployment group what-if --resource-group rg-platform-prod --template-file main.bicep --parameters environment=prod

# Deploy
az deployment group create --resource-group rg-platform-prod --template-file main.bicep --parameters environment=prod

# Deploy stack
az stack sub create --name platform-stack --location eastus --template-file main.bicep --parameters environment=prod --action-on-unmanage deleteAll
```

## Resource Organization

```
subscriptions/
└── platform/
    ├── rg-platform-prod/
    │   ├── networking.bicep
    │   ├── aks.bicep
    │   └── database.bicep
    └── rg-platform-staging/
        ├── networking.bicep
        ├── aks.bicep
        └── database.bicep
```

## Linting

```bash
# Lint Bicep
az bicep lint --file main.bicep

# Decompiling ARM to Bicep
az bicep decompile --file template.json

# Build Bicep to ARM
az bicep build --file main.bicep
```
