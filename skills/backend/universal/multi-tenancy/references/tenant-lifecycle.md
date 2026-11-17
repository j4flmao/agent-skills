# Tenant Lifecycle Management

## Tenant State Machine

```
Provisioning → Configuring → Activating → Active → Suspending → Suspended → Deleting → Deleted
                    ↓                                                    ↓
               Provision Failed                                    Reactivating → Active
```

### States

### Provisioning
- Create tenant record in identity store
- Provision infrastructure via IaC
- Create database / schema
- Generate tenant-specific secrets
- Configure DNS record

### Configuring
- Apply tenant configuration defaults
- Set feature flags for tenant tier
- Configure rate limits per plan
- Initialize default data (templates, roles)
- Run post-provisioning hooks

### Activating
- Verify all resources are healthy
- Run smoke tests against tenant endpoint
- Enable monitoring and alerting
- Send activation notification
- Mark tenant ready in routing table

### Active
- Normal operations
- Tenant-level monitoring
- Usage metering and billing
- Periodic health checks
- Config updates via admin API

### Suspending
- Graceful connection drain (30s timeout)
- Revoke API keys and sessions
- Isolate data (revoke access, keep encrypted)
- Set maintenance page on tenant domain
- Retention timer starts (30 days default)

### Suspended
- No access to data
- Billing paused
- Data retained for grace period
- Backup still runs
- Reactivation possible within 30 days

### Reactivating
- Restore access to data
- Issue new API keys
- Re-enable monitoring
- Resume billing
- Full sync verification

### Deleting
- Export data (if requested)
- Drop database / schema / rows
- Remove DNS records
- Archive audit logs
- Purge cache entries

### Deleted
- Metadata retained in audit store only
- All customer data irrecoverable
- Billing records finalized
- Tenant ID retired

## Automation Triggers

| Event | Action |
|-------|--------|
| Signup form submitted | Start provisioning |
| Payment verified | Activate tenant |
| Payment failed 3x | Begin suspension countdown |
| Admin clicks suspend | Immediate suspend |
| Grace period expires | Auto-delete |
| Admin exports data | Generate download link |

## Operational Runbooks

### Suspend Tenant
```bash
# Health check
kubectl exec -n tenant-$TENANT_ID -- curl -s localhost:8080/health

# Drain connections
aws elbv2 deregister-targets ...

# Archive config
pg_dump -h $DB_HOST -d $DB_NAME > archive/$TENant_ID/$(date +%Y%m%d).sql

# Suspend
api-admin --tenant $TENANT_ID suspend
```

### Delete Tenant
```bash
# Export final backup
# Drop database / schema
# Remove DNS records
# Purge from routing table
# Archive audit trail
```

## Monitoring

### Tenant Health Metrics
- HTTP error rate per tenant
- P50/P95/P99 latency per tenant
- Active connections per tenant
- Storage utilization per tenant
- API rate limit hits per tenant
