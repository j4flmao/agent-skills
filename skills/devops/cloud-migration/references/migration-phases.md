# Migration Phases

## Phase Planning Template
`
Wave 1: Foundation (Month 1-2)
├── Network connectivity (VPN/Direct Connect/ExpressRoute)
├── Identity federation (SSO with cloud)
├── Central logging (CloudWatch/Log Analytics/Cloud Logging)
├── CI/CD pipelines
└── Security baseline (IAM, encryption, monitoring)

Wave 2: Dev/Test (Month 2-4)
├── Non-critical applications
├── Development environments
├── Test and staging environments
└── Validation and learning

Wave 3: Production (Month 4-8)
├── Stateless production apps
├── Stateful production apps
├── Databases (cutover with replication)
└── Traffic shifting (DNS, load balancer)

Wave 4: Optimization (Month 8-12)
├── Decommission legacy infrastructure
├── Right-sizing and cost optimization
├── Automation improvements
└── Disaster recovery testing
`

## Cutover Checklist
- [ ] Final data sync complete and verified
- [ ] Application health checks passing on new infra
- [ ] DNS TTL lowered before cutover
- [ ] Monitoring and alerting configured
- [ ] Rollback plan documented and tested
- [ ] Stakeholders notified of maintenance window
- [ ] Support team briefed on new environment
