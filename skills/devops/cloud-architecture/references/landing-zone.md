# Cloud Landing Zone Patterns

## Landing Zone Structure

### AWS
```
Organization
├── Management Account (billing, audit, SSO)
├── Security Account (GuardDuty, Security Hub, Config)
├── Network Account (Transit Gateway, DNS, Firewall)
├── Shared Services Account (CI/CD, artifacts, monitoring)
├── Workload Accounts
│   ├── Production
│   ├── Staging
│   └── Development
└── Log Archive Account (immutable log storage)
```

### Azure
```
Management Group
├── Platform Root
│   ├── Management (Log Analytics, Automation)
│   ├── Connectivity (Hub VNet, Firewall)
│   └── Identity (AD DS, AD B2C, PIM)
└── Workload Root
    ├── Production
    ├── Staging
    └── Development
```

### GCP
```
Organization
├── Folder: Security (Cloud Armor, SCC, DLP)
├── Folder: Shared Services (Cloud Build, Artifact Registry)
├── Folder: Workloads
│   ├── Production
│   ├── Staging
│   └── Development
└── Folder: Logging (log buckets, BigQuery export)
```

## Landing Zone Checklist
- [ ] Identity management (SSO, federation, SCIM)
- [ ] Network topology (hub-spoke, VPC peering, transit routing)
- [ ] Security baseline (guardrails, detective controls)
- [ ] Logging and monitoring (centralized, retention, alerting)
- [ ] CI/CD pipeline (deployment roles, artifact storage)
- [ ] Backup and DR policy (RPO/RTO, cross-region replication)
- [ ] Budget and cost controls (alerts, quotas, budgets)
- [ ] Compliance framework (policy-as-code, audit trail)
- [ ] Container platform (ECS/EKS, AKS, GKE)
- [ ] Secret management (Vault, Secrets Manager, Parameter Store)

## Guardrails
| Guardrail | AWS | Azure | GCP |
|-----------|-----|-------|-----|
| Block public S3/Blob/GCS | SCP + bucket policy | Azure Policy | Org policy |
| Enforce encryption | SCP + KMS key | Azure Policy | Org policy |
| Restrict regions | SCP | Azure Policy | Org policy |
| Require tags | SCP + config rule | Azure Policy | Org policy |
| Block root user activity | SCP | RBAC | Org policy |
| Audit all changes | CloudTrail | Activity Log | Cloud Audit Logs |
