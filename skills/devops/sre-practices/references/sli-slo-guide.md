# SLI/SLO Definition Guide

## Common SLIs by Service Type

### HTTP API Service
| SLI | Definition | Measurement |
|-----|------------|-------------|
| Availability | % of requests returning 2xx/3xx | sum(2xx+3xx) / total |
| Latency (p50) | Median response time | histogram_quantile(0.50) |
| Latency (p99) | 99th percentile response time | histogram_quantile(0.99) |
| Throughput | Requests per second | rate(http_requests_total) |
| Error rate | % of requests returning 5xx | sum(5xx) / total |

### Database Service
| SLI | Definition | Measurement |
|-----|------------|-------------|
| Query latency | p99 query execution time | Database slow query log |
| Connection pool | % of connections used | Connection pool metrics |
| Replication lag | Seconds behind primary | Replication lag metric |
| Storage utilization | % disk used | Disk usage metric |
| Availability | Successful connections | Connection success rate |

### Queue/Streaming Service
| SLI | Definition | Measurement |
|-----|------------|-------------|
| Message latency | End-to-end delivery time | Producer → consumer timestamp |
| Queue depth | Messages waiting | Queue size metric |
| Dead letter rate | % of messages to DLQ | DLQ count / total messages |
| Throughput | Messages per second | Rate of consumed messages |

## SLO Target Setting
| Service Tier | Target SLO | Error Budget | Burn Rate |
|-------------|------------|--------------|-----------|
| Critical (Tier 1) | 99.99% | 52.56 min/year | 1% / week max |
| Important (Tier 2) | 99.9% | 8.76 hr/year | 10% / week max |
| Standard (Tier 3) | 99% | 87.6 hr/year | 100% / week max |
| Best-effort (Tier 4) | No SLO | N/A | N/A |

## Multi-Window Multi-Burn-Rate Alerting
| Burn Rate | Window | Alert |
|-----------|--------|-------|
| 2x | 1 hour | Critical: consuming error budget too fast |
| 10x | 5 minutes | Page: dangerously fast burn |
| 14.4x (100% in 1 week) | 6 hours | Page: SLO breach imminent |
