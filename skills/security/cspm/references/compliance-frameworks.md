# Compliance Frameworks for CSPM

## CIS Benchmarks
The Center for Internet Security publishes cloud provider-specific hardening benchmarks:
- **CIS AWS Foundations**: 60+ controls across identity, logging, monitoring, networking
- **CIS Azure Foundations**: 80+ controls for Azure subscription security
- **CIS GCP Foundations**: 70+ controls for GCP project security
- **CIS Kubernetes**: 100+ controls for K8s cluster hardening

## Key CIS Controls
```
1. IAM: Enable MFA for all users, rotate keys every 90 days
2. Storage: Block public S3/GCS/Azure Blob access by default
3. Logging: Enable CloudTrail/Azure Monitor/GCP Audit Logs
4. Monitoring: Enable Security Hub/Azure Defender/GCP Security Command
5. Networking: Restrict security group rules, use private subnets
6. Encryption: Encrypt all data at rest and in transit
7. Backup: Enable automated backups for critical data
8. Patching: Keep systems patched, scan for vulnerabilities
9. Anti-malware: Enable cloud-native protection (GuardDuty, Defender)
10. Incident Response: Documented and tested IR procedures
```

## SOC 2 Controls
Five trust service criteria:
- **Security**: Protection against unauthorized access (firewalls, IAM, encryption)
- **Availability**: System uptime and performance (redundancy, monitoring)
- **Processing Integrity**: Complete, accurate processing (logging, error handling)
- **Confidentiality**: Data confidentiality (encryption, access controls)
- **Privacy**: Personal information protection (data minimization, consent)

## Key Points
- CIS benchmarks are the baseline — start here before adding framework-specific controls
- Map CSPM findings to relevant compliance frameworks
- Automate evidence collection for audit readiness
- Monitor compliance score trends — improving or degrading
- Regular compliance reviews at least quarterly
