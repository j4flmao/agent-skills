# SIEM Architecture

## Components
```
Log Sources → Collectors → Forwarders → Ingestion → Indexing → Search → Dashboards
                                ↓
                          Correlation Engine → Alerting → Case Management
                                ↓
                          Retention (Hot/Warm/Cold)
```

## Common SIEM Platforms
| Platform | Type | Strengths | Weaknesses |
|----------|------|-----------|------------|
| Splunk | Enterprise | Flexible, apps ecosystem | Cost, scale complexity |
| Elastic Security | Open Source | Elasticsearch foundation, SIEM + EDR | Scaling challenges |
| Wazuh | Open Source | Free, OSSEC-based, compliance | Limited enterprise features |
| Microsoft Sentinel | Cloud-native | Azure integration, built-in AI | Azure-only, cost unpredictable |
| QRadar | Enterprise | Network-based, strong correlation | Legacy architecture, complex |
| Chronicle | Cloud-native | Google-scale, no ingestion limits | Lock-in, limited customization |

## Log Sources Priority
1. Authentication Logs (AD, VPN, SSH)
2. Endpoint Logs (EDR, Sysmon, Windows Event Log)
3. Network Logs (Firewall, Proxy, DNS, IDS/IPS)
4. Cloud Logs (CloudTrail, Azure Monitor, VPC Flow Logs)
5. Application Logs (Web servers, databases, APIs)
6. Email Security (Gateway logs, DLP)
7. IAM Logs (Privileged access, MFA changes)
8. Physical Security (Badge access, CCTV)

## Ingestion Strategy
| Volume | Approach | Retention |
|--------|----------|-----------|
| High (10TB+/day) | Filter critical logs only, sample the rest | Hot: 7d, Warm: 30d, Cold: 1y |
| Medium (1-10TB/day) | Full ingestion with selective exclusion | Hot: 14d, Warm: 90d, Cold: 2y |
| Low (<1TB/day) | Full ingestion all sources | Hot: 30d, Warm: 180d, Cold: 3y |

## Index Strategy
- Separate indexes by data type (auth, endpoint, network, cloud, app)
- Use data model acceleration for common queries
- Apply retention policies per index tier
- Use summary indexing for high-volume, low-value data
