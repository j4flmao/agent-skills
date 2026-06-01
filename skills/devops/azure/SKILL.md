---
name: devops-azure
description: >
  Trigger: "Azure", "Microsoft Azure", "Azure DevOps", "Azure Kubernetes",
  "AKS", "Azure Functions", "Azure App Service", "Azure Storage", "Azure SQL",
  "ARM template", "Bicep", "Azure CLI", "Azure pipeline", "Azure AD",
  "Managed Identity", "Azure Policy", "Azure Monitor", "Log Analytics",
  "Key Vault", "Azure Front Door", "Azure Firewall", "Private Link".
  Covers: compute (AKS, App Service, Functions, VMs), storage (Blob, Disk, Files),
  database (Azure SQL, Cosmos DB), networking (VNet, VPN, ExpressRoute),
  IaC (Bicep, ARM), security (Azure AD, Key Vault, Policy), monitoring,
  cost management, landing zone design (CAF).
  Exclusion: Not for AWS or GCP — use those specific skills.
version: 2.0.0
author: j4flmao
license: MIT
compatibility:
  cli: true
  core: true
  editor: true
  api: true
tags: [devops, cloud, azure, phase-7]
---

# Azure

## Purpose
Provision and operate Azure infrastructure using Bicep, AKS, Azure DevOps pipelines, and Azure-native networking with landing zone design, security, and cost optimization.

## Agent Protocol

### Trigger
Any user message referencing Azure services, AKS, Bicep, ARM templates, Azure DevOps pipelines, Azure AD, or Azure networking.

### Input Context
Azure service required, region, resource naming convention, cost tier, compliance requirements, existing resource group structure, management group hierarchy.

### Output Artifact
Bicep/ARM templates, Azure DevOps YAML pipeline definitions, AKS cluster config, networking architecture, Azure Policy definitions.

### Response Format
Bicep/ARM JSON/YAML with inline explanations. Azure CLI commands where applicable.

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
Infrastructure deployed via Bicep, AKS cluster operational, pipeline passing, networking secured with private endpoints and NSG rules, cost budgets active.

### Max Response Length
8000 tokens.

## Architecture Decision Trees

### Compute: AKS vs App Service vs Functions vs Container Instances vs VMs
| Workload Type | Recommended | Key Factor | Scaling |
|---|---|---|---|
| Kubernetes workloads | AKS | Need K8s ecosystem | Node pools + HPA |
| Web app, simple | App Service | PaaS, deployment slots | Auto-scale |
| Event-driven, short | Azure Functions | <10min execution | Consumption plan |
| Container, simple | Container Instances | Quick, burst | Manual |
| Full OS control | Virtual Machines | Legacy, custom OS | VMSS |

### Database: Azure SQL vs Cosmos DB vs PostgreSQL vs SQL Managed Instance
| Requirement | Recommended | HA Model |
|---|---|---|
| SQL Server compatible, <4TB | Azure SQL Database (DTU) | Active geo-replication |
| SQL Server compatible, >4TB | Azure SQL Database (vCore) | Zone-redundant |
| SQL Server, full instance | SQL Managed Instance | Auto-failover groups |
| NoSQL, multi-model | Cosmos DB | Multi-region writes |
| PostgreSQL/MySQL | Azure Database for PostgreSQL | Read replicas |
| Cache | Azure Cache for Redis | Premium with clustering |

### Networking: VNet Hub-Spoke vs Virtual WAN vs Azure Front Door
| Scenario | Recommended | Monthly Cost Est. |
|---|---|---|
| Single region, <10 spokes | Hub-spoke VNet | $0 (peering: $0.01/GB) |
| Multi-region, >10 spokes | Virtual WAN | ~$300/hr (hub) |
| Global web app, WAF | Front Door + WAF | ~$330/month + data |
| Site-to-site VPN | VPN Gateway | ~$30/month |
| Dedicated private connection | ExpressRoute | ~$500/month + port fees |

### Authentication: Azure AD vs Managed Identity vs Service Principal
| Method | Use Case | Security Level |
|---|---|---|
| Azure AD user | Human access, Azure Portal | Medium (requires MFA) |
| Managed Identity | Azure resource to Azure resource | High (no credentials) |
| Service Principal | External app, CI/CD | Medium (secret rotation needed) |
| Azure AD Pod Identity | Pods to Azure services (AKS) | High |
| Workload Identity Federation | GitHub Actions, Terraform Cloud | High (OIDC, no secrets) |

## Quick Start
Management group hierarchy → Bicep template for VNet hub-spoke → AKS cluster + Azure AD integration → Azure DevOps pipeline → Private Link for PaaS → Azure Policy for governance → Monitor with Log Analytics → Cost budgets + tags.

## Core Workflow

### Step 1: Landing Zone with Management Groups
```bicep
// management-groups.bicep
targetScope = 'tenant'

resource mgRoot 'Microsoft.Management/managementGroups@2023-04-01' = {
  name: take(format('{0}', subscription().tenantId), 64)
  properties: {
    displayName: 'Tenant Root Group'
  }
}

resource mgPlatform 'Microsoft.Management/managementGroups@2023-04-01' = {
  name: 'platform'
  properties: {
    displayName: 'Platform'
    parent: {
      id: mgRoot.id
    }
  }
}

resource mgLandingZones 'Microsoft.Management/managementGroups@2023-04-01' = {
  name: 'landing-zones'
  properties: {
    displayName: 'Landing Zones'
    parent: {
      id: mgRoot.id
    }
  }
}

resource mgSandbox 'Microsoft.Management/managementGroups@2023-04-01' = {
  name: 'sandbox'
  properties: {
    displayName: 'Sandbox'
    parent: {
      id: mgRoot.id
    }
  }
}

// Subscriptions
resource platformSub 'Microsoft.Subscription/aliases@2021-10-01' = {
  name: 'platform-sub'
  properties: {
    displayName: 'Platform Subscription'
    billingScope: '/providers/Microsoft.Billing/billingAccounts/...'
    workload: 'Production'
  }
}
```

### Step 2: VNet Hub-Spoke with Bicep
```bicep
// networking/hub-spoke.bicep
param location string = resourceGroup().location
param hubVnetAddressPrefix string = '10.0.0.0/16'
param spokeVnetAddressPrefix string = '10.1.0.0/16'

resource hubVnet 'Microsoft.Network/virtualNetworks@2023-11-01' = {
  name: 'hub-vnet-${location}'
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [hubVnetAddressPrefix]
    }
    subnets: [
      {
        name: 'GatewaySubnet'
        properties: {
          addressPrefix: '10.0.0.0/27'
        }
      }
      {
        name: 'AzureFirewallSubnet'
        properties: {
          addressPrefix: '10.0.0.64/26'
        }
      }
      {
        name: 'shared-services'
        properties: {
          addressPrefix: '10.0.1.0/24'
          networkSecurityGroup: { id: nsgShared.id }
        }
      }
    ]
  }
}

resource spokeVnet 'Microsoft.Network/virtualNetworks@2023-11-01' = {
  name: 'spoke-vnet-${location}-${spokeName}'
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [spokeVnetAddressPrefix]
    }
    subnets: [
      {
        name: 'workload'
        properties: {
          addressPrefix: '10.1.0.0/24'
          delegations: []
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
    ]
  }
}

resource vnetPeering 'Microsoft.Network/virtualNetworks/virtualNetworkPeerings@2023-11-01' = {
  name: 'hub-to-spoke-${spokeName}'
  parent: hubVnet
  properties: {
    allowVirtualNetworkAccess: true
    allowForwardedTraffic: true
    allowGatewayTransit: true
    useRemoteGateways: false
    remoteVirtualNetwork: { id: spokeVnet.id }
  }
}

resource vnetPeeringReverse 'Microsoft.Network/virtualNetworks/virtualNetworkPeerings@2023-11-01' = {
  name: 'spoke-to-hub-${spokeName}'
  parent: spokeVnet
  properties: {
    allowVirtualNetworkAccess: true
    allowForwardedTraffic: true
    allowGatewayTransit: false
    useRemoteGateways: true
    remoteVirtualNetwork: { id: hubVnet.id }
  }
}

resource nsgShared 'Microsoft.Network/networkSecurityGroups@2023-11-01' = {
  name: 'nsg-shared-services'
  location: location
  properties: {
    securityRules: [
      {
        name: 'AllowHTTP'
        properties: {
          protocol: 'Tcp'
          sourcePortRange: '*'
          destinationPortRange: '80'
          sourceAddressPrefix: '*'
          destinationAddressPrefix: '*'
          access: 'Allow'
          priority: 100
          direction: 'Inbound'
        }
      }
      {
        name: 'DenyAllInbound'
        properties: {
          protocol: '*'
          sourcePortRange: '*'
          destinationPortRange: '*'
          sourceAddressPrefix: '*'
          destinationAddressPrefix: '*'
          access: 'Deny'
          priority: 4000
          direction: 'Inbound'
        }
      }
    ]
  }
}
```

### Step 3: AKS Cluster with Azure AD Integration
```bicep
// aks/aks-cluster.bicep
param clusterName string = 'aks-production'
param dnsPrefix string = 'aks-production-dns'
param kubernetesVersion string = '1.29'
param vmSize string = 'Standard_DS3_v2'
param nodeCount int = 3

resource aksCluster 'Microsoft.ContainerService/managedClusters@2024-01-01' = {
  name: clusterName
  location: resourceGroup().location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    kubernetesVersion: kubernetesVersion
    dnsPrefix: dnsPrefix
    enableRBAC: true
    aadProfile: {
      managed: true
      enableAzureRBAC: true
      adminGroupObjectIDs: ['00000000-0000-0000-0000-000000000000']
    }
    networkProfile: {
      networkPlugin: 'azure'
      networkPolicy: 'calico'
      loadBalancerSku: 'standard'
      serviceCidr: '10.0.0.0/16'
      dnsServiceIP: '10.0.0.10'
      dockerBridgeCidr: '172.17.0.1/16'
    }
    agentPoolProfiles: [
      {
        name: 'system'
        count: 2
        vmSize: 'Standard_DS2_v2'
        osType: 'Linux'
        mode: 'System'
        type: 'VirtualMachineScaleSets'
        enableAutoScaling: true
        minCount: 2
        maxCount: 5
        availabilityZones: ['1', '2', '3']
      }
      {
        name: 'user'
        count: nodeCount
        vmSize: vmSize
        osType: 'Linux'
        mode: 'User'
        type: 'VirtualMachineScaleSets'
        enableAutoScaling: true
        minCount: 3
        maxCount: 20
        availabilityZones: ['1', '2', '3']
        nodeTaints: []
      }
    ]
    disableLocalAccounts: true
    oidcIssuerProfile: {
      enabled: true
    }
    workloadIdentityProfile: {
      enabled: true
    }
    azureMonitorProfile: {
      metrics: {
        enabled: true
      }
    }
    securityProfile: {
      defender: {
        securityMonitoring: {
          enabled: true
        }
      }
      imageCleaner: {
        enabled: true
        intervalHours: 24
      }
    }
    autoUpgradeProfile: {
      upgradeChannel: 'stable'
    }
    nodeResourceGroup: 'MC_${clusterName}'
  }
}
```

### Step 4: Azure DevOps Pipeline for AKS
```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main
      - develop

variables:
  - group: 'production-secrets'
  - name: dockerRegistryServiceConnection
    value: 'acr-connection'
  - name: imageRepository
    value: 'myapp'
  - name: containerRegistry
    value: 'myacr.azurecr.io'
  - name: tag
    value: '$(Build.BuildId)'

stages:
  - stage: Build
    displayName: Build and Push
    jobs:
      - job: Build
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: Docker@2
            displayName: Build and Push
            inputs:
              command: buildAndPush
              repository: $(imageRepository)
              dockerfile: 'Dockerfile'
              containerRegistry: $(dockerRegistryServiceConnection)
              tags: |
                $(tag)
                latest
          - task: PublishPipelineArtifact@1
            inputs:
              targetPath: 'kubernetes/'
              artifact: 'manifests'

  - stage: DeployDev
    displayName: Deploy to Dev
    dependsOn: Build
    condition: succeeded()
    variables:
      - group: 'dev-environment'
    jobs:
      - deployment: Deploy
        pool:
          vmImage: 'ubuntu-latest'
        environment: 'dev'
        strategy:
          blueGreen:
            deploy:
              steps:
                - task: KubernetesManifest@1
                  inputs:
                    action: deploy
                    connectionType: kubernetesServiceConnection
                    kubernetesServiceConnection: 'aks-dev'
                    namespace: 'myapp'
                    manifests: '$(Pipeline.Workspace)/manifests/**/*.yaml'
                    containers: '$(containerRegistry)/$(imageRepository):$(tag)'

  - stage: DeployProd
    displayName: Deploy to Production
    dependsOn: DeployDev
    condition: succeeded()
    variables:
      - group: 'prod-environment'
    jobs:
      - deployment: Deploy
        pool:
          vmImage: 'ubuntu-latest'
        environment: 'production'
        strategy:
          canary:
            increments: [10, 50, 100]
            deploy:
              steps:
                - task: KubernetesManifest@1
                  inputs:
                    action: deploy
                    connectionType: kubernetesServiceConnection
                    kubernetesServiceConnection: 'aks-prod'
                    namespace: 'myapp'
                    manifests: '$(Pipeline.Workspace)/manifests/**/*.yaml'
                    containers: '$(containerRegistry)/$(imageRepository):$(tag)'
```

### Step 5: Private Link for PaaS Services
```bicep
// networking/private-link.bicep
param storageAccountName string
param sqlServerName string

resource privateEndpointStorage 'Microsoft.Network/privateEndpoints@2023-11-01' = {
  name: 'pe-${storageAccountName}-blob'
  location: resourceGroup().location
  properties: {
    subnet: {
      id: spokeSubnet.id
    }
    privateLinkServiceConnections: [
      {
        name: 'storage-blob'
        properties: {
          privateLinkServiceId: storageAccount.id
          groupIds: ['blob']
        }
      }
    ]
    privateDnsZoneGroup: {
      name: 'default'
      properties: {
        privateDnsZoneConfigs: [
          {
            name: 'privatelink-blob-core-windows-net'
            properties: {
              privateDnsZoneId: dnsZoneBlob.id
            }
          }
        ]
      }
    }
  }
}

resource privateEndpointSql 'Microsoft.Network/privateEndpoints@2023-11-01' = {
  name: 'pe-${sqlServerName}'
  location: resourceGroup().location
  properties: {
    subnet: {
      id: spokeSubnet.id
    }
    privateLinkServiceConnections: [
      {
        name: 'sql-server'
        properties: {
          privateLinkServiceId: sqlServer.id
          groupIds: ['sqlServer']
        }
      }
    ]
  }
}
```

### Step 6: Azure Policy for Governance
```bicep
// governance/azure-policy.bicep
resource policyAssignmentTags 'Microsoft.Authorization/policyAssignments@2023-04-01' = {
  name: 'require-cost-center-tag'
  properties: {
    displayName: 'Require Cost Center Tag'
    description: 'Enforces presence of costCenter tag on all resources'
    policyDefinitionId: '/providers/Microsoft.Authorization/policyDefinitions/...'
    parameters: {
      tagName: {
        value: 'costCenter'
      }
    }
    enforcementMode: 'Default'
  }
}

resource policyAssignmentLocations 'Microsoft.Authorization/policyAssignments@2023-04-01' = {
  name: 'allowed-locations'
  properties: {
    displayName: 'Allow only East US and West Europe'
    policyDefinitionId: '/providers/Microsoft.Authorization/policyDefinitions/e56962a6-4747-49cd-b67b-bf8b01975c4c'
    parameters: {
      listOfAllowedLocations: {
        value: ['eastus', 'westeurope']
      }
    }
  }
}
```

## Tool Comparison: Azure vs AWS Service Mapping

| Category | Azure | AWS |
|---|---|---|
| Compute - VMs | Virtual Machines | EC2 |
| Compute - Containers | AKS | EKS |
| Compute - Serverless | Azure Functions | Lambda |
| Compute - PaaS Web | App Service | Elastic Beanstalk |
| Storage - Object | Blob Storage | S3 |
| Storage - Block | Disk Storage | EBS |
| Storage - File | Azure Files | EFS |
| Database - SQL | Azure SQL Database | RDS |
| Database - NoSQL | Cosmos DB | DynamoDB |
| Networking - VNet | Virtual Network | VPC |
| Networking - LB | Azure Load Balancer | ELB/ALB |
| Networking - CDN | Azure Front Door / CDN | CloudFront |
| DNS | Azure DNS | Route53 |
| IAM | Azure AD + RBAC | IAM |
| Key Management | Key Vault | KMS |
| Monitoring | Azure Monitor | CloudWatch |
| CI/CD | Azure DevOps Pipelines | CodePipeline |
| IaC | Bicep/ARM | CloudFormation/CDK |
| Governance | Azure Policy | AWS Config |

## Anti-Patterns

### Anti-Pattern 1: No Management Group Hierarchy
Putting all subscriptions flat at root level. Use at least 3 levels: Platform, Landing Zones, Sandbox — enables policy inheritance and cost separation.

### Anti-Pattern 2: Public Endpoints for PaaS
Using public endpoints for Azure SQL, Storage, ACR instead of Private Link. This exposes services to the internet and bypasses VNet security controls.

### Anti-Pattern 3: Shared Service Principals
Using a single service principal across environments. Each environment gets its own managed identity or service principal with scoped permissions.

### Anti-Pattern 4: ARM JSON over Bicep
Writing raw ARM JSON when Bicep provides cleaner syntax, modules, and linting. Bicep compiles to ARM and is the recommended IaC tool.

### Anti-Pattern 5: No Resource Locks
Not applying resource locks (CanNotDelete / ReadOnly) to production resources. Accidental deletion of resource groups can wipe production infrastructure.

### Anti-Pattern 6: Ignoring Cost Management
No budgets, no alerts, no tags for cost allocation. Azure costs can spiral without governance. Set budgets at 50/80/100% with action groups.

## Production Considerations

### Security
- Enable Azure Defender (Microsoft Defender for Cloud) on all subscriptions.
- Use Azure AD Conditional Access with MFA for all administrative access.
- Enable Diagnostic Settings on all resources for audit logging.
- Use Azure Policy to enforce HTTPS, deny public IPs on NSGs, require encryption.
- Use Key Vault with soft-delete and purge protection enabled.
- Enable network security groups with just-in-time (JIT) VM access.
- Use Azure RBAC with least privilege; audit role assignments quarterly.

### Cost Optimization
- Use Azure Reservations (1yr/3yr) for predictable VMs and SQL databases (20-60% savings).
- Use Azure Hybrid Benefit for Windows Server and SQL Server licenses.
- Right-size VMs using Azure Advisor recommendations.
- Use auto-shutdown schedules for dev/test environments.
- Set budgets at management group level with alerts to finance team.
- Use Azure Cost Management + Billing for showback/chargeback.

### HA and Disaster Recovery
- Deploy AKS node pools across 3 availability zones.
- Use Azure Front Door for global load balancing and failover.
- Configure Azure SQL geo-replication for cross-region DR.
- Use Azure Site Recovery for VM-level DR.
- Define RPO/RTO and test recovery annually.

## Troubleshooting Guide

| Issue | Likely Cause | Solution |
|---|---|---|
| AKS node provisioning fails | Quota limit in region | Request vCPU quota increase |
| Private Link connection timeout | Private DNS not configured | Verify Private DNS Zone linked to VNet |
| Azure DevOps pipeline fails | Service Principal expired | Rotate SP secret or use Workload Identity |
| Bicep deployment fails | Module not found | Verify module registry path and version |
| Azure Policy non-compliant | Resource missing required tag | Add tags; check policy definition |
| Key Vault access denied | Missing access policy | Add service principal/managed identity to KV |

## Rules
1. Bicep over ARM JSON for all new IaC.
2. Managed identities over service principals for Azure resource auth.
3. Private endpoints for all PaaS services (SQL, Storage, ACR, Key Vault).
4. Azure Policy for compliance enforcement at resource creation.
5. AKS with Azure CNI and Azure AD integration.
6. Cost allocation via resource tags — every resource gets mandatory tags.
7. Deployment slots for zero-downtime App Service deployments.
8. Diagnostic settings enabled on all services for audit and monitoring.
9. Resource locks (CanNotDelete) on production resource groups.
10. Azure Defender enabled on all subscriptions.
11. Budget alerts at 50%, 80%, 100%, 200% of forecast.

## Output Format
Bicep/ARM templates, Azure DevOps YAML pipeline definitions, AKS config, Azure CLI commands.

## References
  - references/azure-advanced.md
  - references/azure-aks.md
  - references/azure-compute.md
  - references/azure-devops-pipelines.md
  - references/azure-fundamentals.md
  - references/azure-iac.md
  - references/azure-networking.md
  - references/azure-resource-management.md
  - references/azure-policy-guide.md

## Handoff
Hand off to Azure when provisioning Azure-specific infrastructure or pipelines. Hand off to terraform for multi-cloud IaC. Hand off to monitoring for Azure Monitor configuration.
