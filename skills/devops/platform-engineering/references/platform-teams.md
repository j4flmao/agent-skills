# Platform Team Models

## Team Topologies

| Model | Description | Best For | Size |
|-------|-------------|----------|------|
| Enabling | Helps stream-aligned teams adopt platform | < 100 devs | 3-5 |
| Platform-as-product | Treats platform as product with PM | 100-500 devs | 5-12 |
| Platform-as-API | Teams interact through well-defined APIs | 500+ devs | 8-15 |
| Federation | Multi-platform team with shared standards | 1000+ devs | Multiple |

### Enabling Team
```
Stream Team A ←→ Enabling Team ←→ Stream Team B
                     ↓
               Platform APIs
                     ↓
           Infrastructure Team
```

### Platform-as-Product
```
                  Product Manager
                       ↓
              Platform Team (5-12)
              /       |        \
         Frontend  Backend    Infra
         Platform  Platform   Platform
```

## Platform APIs

| API Type | Examples | Consumer |
|----------|----------|----------|
| Infrastructure | Provision DB, deploy service | CI/CD, Backstage |
| Observability | Metrics, logs, traces | All services |
| Security | Secrets, IAM, certificates | All services |
| Developer portal | Template, catalog, docs | Developers |

```typescript
// Platform API contract
interface PlatformAPI {
  // Infrastructure
  provisionDatabase(type: string, size: string): Promise<DatabaseEndpoint>
  deployService(config: DeployConfig): Promise<DeploymentStatus>

  // Observability
  createDashboard(service: string): Promise<Dashboard>
  configureAlerts(service: string, rules: AlertRule[]): Promise<void>

  // Security
  rotateSecrets(service: string): Promise<void>
  requestCertificate(domain: string): Promise<CertInfo>
}
```

## Internal Products

| Product | Users | Value Metric |
|---------|-------|-------------|
| CI/CD pipelines | All engineers | Build time, deploy frequency |
| Service catalog | All engineers | Discovery time |
| Golden path templates | New services | Time to production |
| Observability stack | All engineers | MTTR |
| Secrets management | All engineers | Onboarding time |

## Key Metrics

| Metric | Target | How to Measure |
|--------|--------|---------------|
| Platform adoption | > 80% of new projects | Template usage vs manual |
| Developer velocity | < 1 hour to production | Time from commit to deploy |
| Platform reliability | 99.9% uptime | Uptime of platform APIs |
| Internal NPS | > 50 | Quarterly survey |
| Feature adoption | > 60% in first month | Usage analytics |
| Toil reduced | > 50% reduction | Hours saved per dev per week |

## Platform Maturity Model

| Level | Name | Characteristics |
|-------|------|----------------|
| 1 | Ad-hoc | No platform, every team configures infra manually |
| 2 | Standardized | Shared CI/CD templates, basic docs |
| 3 | Self-service | Backstage portal, golden paths for common workflows |
| 4 | Platform-as-product | Dedicated PM, roadmap, NPS tracking |
| 5 | Ecosystem | Internal marketplace, plugin SDK, community contributions |

## Team Communication Patterns

| Pattern | Description | Use Case |
|---------|-------------|----------|
| RFC process | Written proposal before implementation | Architecture decisions |
| Office hours | Scheduled Q&A for platform consumers | Support |
| Incident sync | Post-incident review with platform consumers | Reliability |
| Roadmap review | Quarterly presentation of planned work | Transparency |
| Feedback surveys | Monthly NPS + qualitative questions | Continuous improvement |

```typescript
class PlatformTeamMetrics {
    calculateDORA(deployFrequency: number, leadTime: number): DORAScore {
        return {
            deployFrequency: this.rate(deployFrequency),
            leadTime: this.rate(leadTime),
            mtbf: this.mtbf(),  // mean time between failures
            mttr: this.mttr(),   // mean time to recovery
        }
    }

    private rate(value: number): 'elite' | 'high' | 'medium' | 'low' {
        if (value > 10) return 'elite'
        if (value > 5) return 'high'
        if (value > 1) return 'medium'
        return 'low'
    }
}
```
