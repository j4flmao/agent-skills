# SIEM Engineering Advanced Topics

## Introduction
Advanced SIEM engineering covers performance optimization, log source anomaly detection, schema-on-read vs schema-on-write tradeoffs, cloud-native SIEM (SIEM-as-a-Service), advanced correlation techniques (UEBA, ML models), and building a SOC data lake.

## Performance Optimization at Scale
### Ingestion Pipeline Optimization
- **Log batching**: Batch log shipping (buffer size x flush interval) for throughput
- **Compression**: LZ4/Zstandard compression reduces network bandwidth by 60-80%
- **Partitioning**: Time-based and source-based partitions for faster queries
- **Routing**: Route high-volume low-value logs (access logs) to separate index with shorter TTL
- **Sampling**: Sample verbose logs (debug, verbose access logs) at 1:1000

### Storage Tier Architecture
| Tier | Storage Type | Retention | Query Speed | Cost |
|------|-------------|-----------|-------------|------|
| Hot | SSD/NVMe | 7-30 days | Fast | $$$ |
| Warm | HDD/SSD | 30-90 days | Moderate | $$ |
| Cold | Object storage (S3/GCS) | 90-365 days | Slow | $ |
| Archive | Glacier/Deep Archive | 1-7 years | Very slow (hours) | $ |

## UEBA and ML Detection
- **User behavior**: Baseline login times, locations, devices, access patterns
- **Entity behavior**: Baseline server connections, port usage, process launches
- **Statistical anomalies**: Z-score, moving average deviation for volume-based anomalies
- **Consolidated anomaly score**: Aggregate multiple signals for high-fidelity alerts

## Key Points
- Optimize ingestion with batching, compression, partitioning, and routing
- Storage tiers balance cost vs query performance
- Schema-on-write (Splunk) offers fast queries; schema-on-read (ELK) offers flexibility
- Cloud-native SIEM (SIEM-as-a-Service) provides elastic scaling and reduced operations
- Advanced detection: UEBA, statistical baselines, ML models
- SOC data lakes enable long-term retention for historical threat hunting
- Log source anomaly detection identifies outages and tampering
- Normalization patterns: ECS (Elastic), CIM (Splunk), OCSF (Open Cybersecurity Schema Framework)
- SIEM health monitoring must be automated and alerted
- Cost management: balance log volume with detection value
