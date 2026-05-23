# Identity Provider Migration

## Migration Strategies

| Strategy | Risk | Downtime | Duration | Complexity |
|----------|------|----------|----------|------------|
| Big Bang | High | Yes | Days | Low |
| Phased | Medium | No | Weeks | Medium |
| Parallel Run | Low | No | Months | High |
| Shadow | Very Low | No | Months | Very High |

## Parallel Run (Recommended)

### Architecture
```
Users → Existing IdP ←→ App (existing SAML/OIDC config)
        Existing IdP syncs users → New IdP
        New IdP ←→ App (new config, read-only test)
```

### Migration Phases
```
Phase 1 (Weeks 1-2): Setup and synchronization
  - Provision new IdP infrastructure
  - Establish user sync from old → new IdP
  - Configure metadata exchange
  - Test with internal team

Phase 2 (Weeks 3-4): App migration
  - Migrate apps one-by-one from old to new IdP
  - Each app: configure new IdP, test, switch traffic
  - Monitor auth failures per app

Phase 3 (Week 5): Cutover
  - All apps on new IdP
  - Disable old IdP (keep read-only for 30 days)
  - Monitor for 30 days before decommissioning
```

## User Synchronization

### Schema Mapping
```yaml
source_idp: "Okta"
target_idp: "Azure AD"

mapping:
  uid: "userPrincipalName"
  email: "mail"
  displayName: "displayName"
  department: "department"
  manager: "manager"
  groups: "memberOf"
```

### Sync Strategy
- Full sync: Weekly (baseline reconciliation)
- Incremental sync: Every 5 minutes (delta changes)
- Password sync: Not supported (use federation)
- Group sync: Maintain group membership mapping

## Application Migration

### Migration Per App
```python
def migrate_app(app_name, config):
    # 1. Configure new IdP app registration
    new_config = create_app_in_new_idp(config)
    
    # 2. Test in staging environment
    staging_result = test_auth_flow(new_config, "staging")
    assert staging_result.success
    
    # 3. Deploy to canary (5% users)
    deploy_canary(new_config, traffic_pct=5)
    monitor_auth_metrics(app_name, duration="1h")
    
    # 4. Rollout to all
    deploy_full(new_config)
    
    # 5. Monitor
    monitor_auth_metrics(app_name, duration="24h")
    assert auth_failure_rate < 0.1%
```

## Rollback Plan

### Immediate Rollback Triggers
- Auth failure rate > 1% in 5 minutes
- User lockout reports > 10 in 1 hour
- SSO session creation fails > 0.5%
- Application reachable but auth flow broken

### Rollback Steps
```
1. Revert app config to old IdP endpoint
2. Clear session caches
3. Verify old IdP is still operational
4. Notify affected users
5. Investigate root cause
6. Re-attempt migration after fix
```

## Communication Plan

### Stakeholder Updates
```
Pre-Migration (1 week before):
  - Email: "Scheduled IdP migration for {date}"
  - Explain: what changes, what stays same
  - Include: support contact, FAQ link

During Migration:
  - Status page: real-time migration progress
  - Slack channel: #idp-migration for issues

Post-Migration:
  - Summary: what migrated, metrics
  - Known issues: any minor differences
  - Support: extended support window (1 week)
```

## Validation Checklist

- [ ] All user attributes synced correctly
- [ ] Group memberships preserved
- [ ] SAML/OIDC metadata valid
- [ ] Certificate rotation process documented
- [ ] Auth flow works for all app types
- [ ] Single Logout works (SAML) or session management (OIDC)
- [ ] Passwordless/MFA flows intact
- [ ] SCIM provisioning works (if used)
- [ ] Audit logs flowing from new IdP
- [ ] Backup IdP accessible for emergency access
