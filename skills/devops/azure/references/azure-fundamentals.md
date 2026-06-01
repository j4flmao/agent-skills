# Azure Fundamentals

## Overview
Microsoft Azure is a cloud computing platform offering IaaS, PaaS, and SaaS services across 60+ regions worldwide. It provides deep integration with Microsoft enterprise products (Active Directory, SQL Server, .NET) and supports open-source technologies.

## Core Concepts

### Azure Resource Hierarchy
Management Groups: top-level containers for policy and compliance. Subscriptions: billing and isolation boundary, maps to accounts. Resource Groups: logical containers for resources sharing lifecycle. Resources: individual services (VMs, databases, functions). RBAC roles and policies apply at any level and propagate downward.

### Regions and Availability
Azure operates in 60+ regions, each with at least 3 Availability Zones. Availability Zones: physically separate data centers within a region with independent power, cooling, and networking. Availability Sets: logical grouping of VMs for fault and update domain isolation within a region (no SLA commitment without zones or sets).

### Azure Resource Manager
ARM is the deployment and management layer. All resource operations go through ARM APIs. ARM templates (JSON) define infrastructure declaratively. Bicep is a domain-specific language that compiles to ARM templates. Terraform is the multi-cloud alternative.

## Core Services

### Compute
Virtual Machines: IaaS VMs with Windows/Linux, various series (general, compute, memory, GPU). VM Scale Sets: auto-scaling VM groups with load balancer. Azure App Service: PaaS for web apps with auto-scaling, CI/CD, custom domains. Azure Functions: serverless compute with event-driven triggers. AKS: managed Kubernetes with integrated Azure AD and monitoring. Container Instances: serverless containers without orchestration.

### Storage
Azure Blob Storage: object storage with Hot, Cool, Cold, Archive tiers. Azure Files: managed SMB/NFS file shares. Azure Disks: managed block storage for VMs (SSD, HDD, Ultra). Azure NetApp Files: enterprise file storage for specialized workloads.

### Database
Azure SQL Database: managed SQL Server with elastic pools and serverless. Azure Database for MySQL/PostgreSQL/MariaDB: managed open-source databases. Cosmos DB: globally distributed NoSQL with multiple API models (SQL, MongoDB, Cassandra, Gremlin, Table). Azure Cache for Redis: managed Redis. Azure Synapse: analytics and data warehouse.

### Security
Azure AD: identity and access management, SSO, MFA. RBAC: role-based access control at any scope. Azure Policy: compliance and governance enforcement. Azure Security Center: unified security management. Key Vault: secrets, keys, and certificate management. Azure Firewall: managed firewall with threat intelligence. DDoS Protection: basic (automatic) and standard (tuned) tiers.

## Basic Operations
```powershell
# Login and manage subscriptions
Connect-AzAccount
Get-AzSubscription
Set-AzContext -Subscription "Production"

# Resource group and VM
New-AzResourceGroup -Name "my-app" -Location "eastus"
New-AzVM -ResourceGroupName "my-app" -Name "web-vm" -Location "eastus" -Image "Ubuntu2404"

# Storage
Get-AzStorageAccount
New-AzStorageContainer -Name "data" -Context $ctx
```

## Best Practices
- Use Management Groups for enterprise policy hierarchy.
- Implement RBAC with least-privilege principles.
- Enable Azure Security Center for threat detection.
- Use Azure Policy to enforce tagging and compliance.
- Deploy resources in paired regions for disaster recovery.
- Use managed identities instead of service principal credentials.
- Enable diagnostic settings for all resources.
- Use Azure Backup for VM and database protection.

## References
- azure-advanced.md -- Advanced Azure topics
- compute-networking.md -- Compute and Networking
- storage-databases.md -- Storage and Databases
- security-identity.md -- Security and Identity
- azure-devops.md -- Azure DevOps Integration
