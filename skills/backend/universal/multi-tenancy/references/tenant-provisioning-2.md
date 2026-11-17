# Tenant Provisioning

## Provisioning Workflow

### Automated Pipeline
```
Signup triggered → Create tenant record → Provision infra → Configure services → Activate
      │                  │                    │                   │                  │
      ▼                  ▼                    ▼                   ▼                  ▼
  Webhook           Identity DB          Terraform           API calls           DNS/Traffic
```

### Implementation
```python
class TenantProvisioner:
    def __init__(self):
        self.steps = [
            self.create_tenant_record,
            self.provision_infrastructure,
            self.configure_services,
            self.activate_tenant,
        ]

    async def provision(self, tenant_data):
        context = {"tenant_data": tenant_data, "status": "pending"}
        for step in self.steps:
            context = await step(context)
            if context.get("error"):
                await self.rollback(context)
                raise ProvisioningError(context["error"])
        return context
```

## Infrastructure Provisioning

### Terraform Module
```hcl
module "tenant" {
  source = "./modules/tenant"

  tenant_id   = var.tenant_id
  tenant_tier = var.tenant_tier  # free, pro, enterprise

  # Conditional resources based on tier
  create_dedicated_db = var.tenant_tier == "enterprise"
  create_k8s_namespace = true
  enable_backup       = var.tenant_tier != "free"
  backup_retention    = var.tenant_tier == "enterprise" ? 30 : 7
}
```

### Resource Allocation by Tier
| Resource | Free | Pro | Enterprise |
|----------|------|-----|------------|
| Database | Shared (row-level) | Shared (schema) | Dedicated instance |
| Compute | Burstable | Dedicated pod | Auto-scaling |
| Storage | 1 GB | 10 GB | 100 GB+ |
| Backups | None | Daily (7 days) | Continuous (30 days) |
| Support | Community | Email | SLA-backed |
| Rate limit | 100 req/min | 1000 req/min | Custom |

## Configuration Services

### Post-Provisioning Hooks
```python
async def configure_services(context):
    tenant_id = context["tenant_id"]
    tier = context["tenant_data"]["tier"]

    tasks = [
        create_dns_records(tenant_id),
        configure_rate_limits(tenant_id, tier),
        setup_monitoring(tenant_id),
        initialize_default_data(tenant_id),
        send_welcome_notification(tenant_id),
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    for result in results:
        if isinstance(result, Exception):
            return {"error": str(result)}
    
    return context
```

## Activation

### Readiness Checks
```
Database: Connection verified, migrations run
DNS: Records propagated, TLS certificate issued
Rate Limits: Configured per tenant tier
Monitoring: Metrics flowing, alerts configured
Backup: First backup triggered
Health: Smoke test passed on tenant endpoint
```

### Activation Notification
```json
{
  "tenant_id": "tnt_abc123",
  "status": "active",
  "endpoint": "https://tnt-abc123.app.company.com",
  "api_key": "generated-api-key",
  "admin_email": "admin@customer.com",
  "activated_at": "2026-03-15T10:30:00Z",
  "welcome_email_sent": true
}
```

## De-provisioning

### Deletion Workflow
```
1. Export request (optional): Provide data download link
2. Quarantine: Disable access, stop billing
3. Grace period: 30 days (configurable)
4. Cleanup: Delete resources, purge data
5. Archive: Retain audit logs only
```

### Cleanup Steps
```
Drop database / delete schema / delete rows
Remove DNS records
Delete TLS certificates
Purge cache entries
Remove monitoring and alerts
Rotate API keys that had access
```

## Monitoring & Metrics

### Provisioning Metrics
| Metric | Target | Alert |
|--------|--------|-------|
| Provision time (P95) | <5 min | >15 min |
| Success rate | >99% | <98% |
| Activation delay | <1 min | >5 min |
| Resource creation time | <30s per resource | >2 min |

### Dashboard
```
Provisioning funnel: Signups → Provisioned → Activated
Daily active tenants: Active tenant count
Provision failures: Count and breakdown by error type
Resource utilization: Per-tenant vs aggregate
```
