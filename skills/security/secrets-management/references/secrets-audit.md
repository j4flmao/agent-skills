# Secrets Audit

## Audit Checklist
- [ ] All secrets identified and cataloged
- [ ] No hardcoded secrets in source code
- [ ] Secrets stored in dedicated secret management tool
- [ ] Access to secrets logged and monitored
- [ ] Rotation schedule defined and enforced
- [ ] Emergency rotation procedure documented
- [ ] Least privilege: each service has its own secrets
- [ ] Audit trail for every secret access

## Audit Logging
`json
{
    "event": "secret_access",
    "secret_path": "secret/data/api/production",
    "user": "service-account-backend",
    "action": "read",
    "timestamp": "2024-01-15T10:30:00Z",
    "source_ip": "10.0.1.50",
    "result": "allowed"
}
`

## Monitoring
| Metric | Alert Threshold |
|--------|----------------|
| Failed secret access attempts | > 5 in 5 minutes |
| Secret access from unknown IP | Any |
| Secret access outside business hours | > 10 in 1 hour |
| Bulk secret read | > 50 in 5 minutes |
| Expired secret usage | Any |
