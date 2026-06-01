# Business Continuity Advanced Topics

## Introduction
Advanced BCP covers multi-region active-active architectures, immutable backup strategies, ransomware playbooks, vendor fallback automation, chaos engineering, and BCP metrics for continuous improvement.

## Multi-Region Architecture for Continuity

### Active-Active vs Active-Passive
Active-Active: Traffic distributed across regions, automatic failover, RTO < 1min. Requires global load balancer, cross-region data replication, conflict resolution. Cost: 2x-3x single region.

Active-Passive: Primary region handles traffic, secondary on standby. DNS failover redirects on outage. RTO: 5-15min. Cost: 1.5x-2x single region.

### Cross-Region Data Replication
Synchronous replication: Low RPO (<1s) but high latency penalty for distant regions. Use within 1000km or same-continent. Asynchronous replication: Higher RPO (seconds-minutes) but no latency penalty. Use for cross-continent replication.

Database replication strategies: Aurora Global Database (async, 1s RPO), Spanner (sync, <5ms within 1000km), Cassandra (tunable consistency), CockroachDB (strong consistency at distance).

### Traffic Management Strategy
Route53 latency-based routing: Direct users to nearest healthy region. Health checks monitor regional endpoint health. Failover occurs when health check fails for threshold period. 60s TTL means slow failover. Lower TTL to 5s for critical services (more Route53 costs).

## Immutable Backup Strategy

### WORM Storage
Write-Once-Read-Many storage prevents backup modification or deletion. AWS S3 Object Lock (compliance mode), Azure Blob Storage immutability, GCP Bucket Lock. Set retention period to match BCP RPO + recovery window.

### Air-Gapped Backups
Backups stored in a separate AWS account/organization with strict SCPs preventing deletion. No automatic deletion possible even with compromised credentials. Recovery requires cross-account access that is manually approved.

### Backup Verification Automation
Automated restore testing: spin up temporary environment from latest backup, run validation queries, verify data integrity, tear down. Schedule weekly automated restore tests. Pager on restore failure.

## Ransomware Playbook

### Prevention
Immutable backups (WORM storage), air-gapped copies, network segmentation (backup network isolated from production), least-privilege backup access, anomaly detection on backup writes (sudden mass modification/deletion).

### Detection
Alert on: mass file modifications, ransomware note files appearing, backup deletion attempts, unusual encryption API calls, sudden storage write spike.

### Response
1. Isolate affected systems immediately (network segmentation)
2. Do NOT pay ransom (no guarantee of decryption)
3. Identify scope: which systems, which backups affected
4. Restore from immutable backup
5. Forensic analysis to identify entry vector
6. Rebuild compromised systems from clean state
7. Report to authorities as required

## Vendor Fallback Automation

### Pre-Integrated Fallbacks
For each Tier-1 vendor, maintain a pre-integrated alternative. Configuration-as-code means fallback infrastructure is provisioned in minutes, not days.

| Tier-1 Vendor | Primary | Fallback | Switchover Time | Automation Level |
|--------------|---------|----------|-----------------|------------------|
| Payments (Stripe) | Stripe | Adyen | 30min manual | Semi-auto (DNS + config flip) |
| Email (SendGrid) | SendGrid | SES | 15min | Fully auto (DNS swap) |
| DNS (Route53) | Route53 | Cloudflare DNS | 15min | Fully auto (TTL + zone transfer) |
| CDN (Cloudflare) | Cloudflare | Fastly | 30min | Semi-auto (DNS + caching policy) |

### Fallback Testing
Test fallback quarterly in staging. Measure: switchover time, data loss during transition, performance degradation on fallback, time to return to primary. Document any manual steps and automate incrementally.

## Chaos Engineering for Continuity

### Game Day Scenarios
- Kill a region: Route all traffic away from us-east-1, verify failover
- Throttle a vendor: Simulate Stripe latency 5x normal, verify graceful degradation
- Corrupt a database: Inject bad data, verify rollback capability
- Kill a DNS provider: Fail over to secondary DNS, verify resolution
- Ransomware simulation: Encrypt test files, verify immutable backup restore

### Success Criteria
Each Game Day defines a hypothesis: "When us-east-1 fails, traffic routes to us-west-2 within 30s with < 1% error rate." Measure against the hypothesis. Document deviations as action items. Track mean time to recover (MTTR) trend across Game Days.

## BCP Metrics and KPIs

### Continuity Maturity Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| BIA coverage | 100% of services | BIA-per-service completion |
| Drill completion | 100% of schedule | Drill vs planned |
| Runbook freshness | < 6 months | Last review timestamp |
| Backup restore success | 100% | Automated test results |
| Vendor fallback coverage | 100% Tier-1 | Fallback plan per vendor |
| Failover time | Within RTO | Drill-measured failover duration |
| Data loss | Within RPO | Drill-measured data loss |

## Operational Excellence

### BCP Maintenance Cadence
- Monthly: automated backup restore test, runbook review for changed services
- Quarterly: tabletop exercise, BIA update for new/changed services, vendor fallback test
- Semi-annual: technical failover drill with real traffic
- Annual: full BCP exercise (multi-team, multi-hour), BIA refresh for all services
- On change: re-test affected runbook within 30 days of architectural change

### Post-Drill Improvement
Each drill produces an after-action report with: timeline, decisions made, gaps identified, action items with owners. Track action items to closure before next drill. Common gaps: stale runbook, missing access, untested fallback, communication delays.

### Key Person Risk Mitigation
For every critical process, maintain at least two trained operators. Runbooks must be executable by any on-call engineer with standard access. Cross-train during drills by rotating roles: incident commander, scribe, comms lead, technical lead.

## Technology Considerations

### Cloud-Native Continuity Services
- AWS: Route53 health checks + failover, Aurora Global Database, S3 Cross-Region Replication, CloudFront origin failover
- Azure: Traffic Manager, Cosmos DB multi-region writes, SQL Database geo-replication, Front Door
- GCP: Cloud DNS + Cloud Load Balancing, Cloud Spanner, Cloud Storage dual-region buckets

### Observability for Continuity
Monitor: cross-region replication lag, DNS health check status, backup age, last successful restore, vendor endpoint health, failover timer status. Dashboards for war-room display during incidents.

## Security Considerations

### BCP Access Control
BCP documents contain sensitive information (recovery procedures, access keys, vendor contacts, infrastructure diagrams). Store in access-controlled repository. Grant read access only to on-call engineers and incident responders. Audit access quarterly.

### Emergency Access
Break-glass emergency access procedure: tamper-evident envelope with credentials, multi-person retrieval, automated alert on access, documented post-access review. Test quarterly.

## Compliance and Audit

### ISO 22301 Compliance
The international standard for Business Continuity Management Systems. Requirements: BCP scope and policy, risk assessment and BIA, continuity strategies and solutions, BCP plans and procedures, exercise and testing program, performance evaluation, management review.

### SOC2 CC7.5
Requires business continuity and disaster recovery plans that are tested and reviewed. Evidence: BCP document, BIA results, test results, after-action reports, plan review history.

### Regulatory Continuity Requirements
- HIPAA 164.308(a)(7): Contingency plan including emergency mode, backup, DR
- PCI DSS 12.3: BCP including CDE recovery
- GDPR Art. 32: Security and continuity of processing
- SOX 404: Financial reporting continuity controls

## Key Points
- Multi-region architecture is the gold standard but requires testing to validate
- Immutable backups are the last defense against ransomware — make them air-gapped
- Vendor fallback must be tested, automated, and measured
- Chaos engineering reveals gaps that tabletop exercises miss
- BCP maturity is measured by metrics, not document existence
- Post-drill action items tracked to closure drive continuous improvement
- Emergency access procedures must be tested, not just documented