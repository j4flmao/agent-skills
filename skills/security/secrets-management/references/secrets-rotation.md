# Secrets Rotation Patterns

## Rotation Strategies
| Strategy | Description | Best For |
|----------|-------------|----------|
| Manual rotation | Admin generates and distributes new secret | Emergency only |
| Scheduled rotation | Rotate on fixed schedule (e.g., every 90 days) | Compliance requirements |
| Event-driven rotation | Rotate on specific events (breach, employee exit) | Security incidents |
| Automatic rotation | System rotates secrets without human intervention | CI/CD, service accounts |

## Rotation Automation (HashiCorp Vault)
`ash
# Vault automatic rotation for database credentials
vault write database/rotate-root/my-db
vault read database/creds/my-role

# AWS Secrets Manager rotation
aws secretsmanager rotate-secret \
    --secret-id my-api-key \
    --rotation-rules AutomaticallyAfterDays=30
`

## Zero-Downtime Rotation
1. Deploy new secret alongside old (dual-read)
2. All clients updated to use new secret
3. Remove old secret after verification
4. Monitor for stale connections using old secret
