# Golden Path Design Patterns

## Golden Path Structure
A golden path consists of:
- **Trigger**: What developer action starts this path (e.g., "I need a new microservice")
- **Template**: Scaffolded repository with best practices
- **Automation**: CI/CD pipeline, infrastructure, monitoring
- **Documentation**: README, API docs, runbook
- **Support**: Who to contact, SLA for platform support

## Golden Path Types
| Path | Description | Includes |
|------|-------------|----------|
| New microservice | REST/GraphQL API service | Repo + CI/CD + K8s + monitoring + docs |
| New frontend | Web application | Repo + CI/CD + CDN + analytics + a11y checks |
| New batch job | Scheduled/event-driven job | Repo + CI/CD + cron job + logging |
| Add database | Attach database to service | Terraform + secrets + connection string |
| Add queue | Attach message queue | Terraform + credentials + SDK config |

## Golden Path Exit Criteria
Golden paths must include documented exit strategies:
- When to outgrow the path (traffic, team size, compliance)
- How to migrate off the path
- What support is available after leaving the path
