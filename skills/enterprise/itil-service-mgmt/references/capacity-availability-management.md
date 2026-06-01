# Capacity and Availability Management

## Overview
Capacity management ensures IT resources meet current and future demand at optimal cost. Availability management ensures services meet agreed uptime targets. These are closely linked — insufficient capacity causes availability breaches.

## Capacity Management Process

### Capacity Management Sub-Processes
| Sub-Process | Focus | Time Horizon |
|-------------|-------|--------------|
| Business Capacity | Future business demand | 12-24 months |
| Service Capacity | Live service performance | 3-12 months |
| Component Capacity | Individual resource utilization | 1-6 months |

### Capacity Management Activities
1. Monitor: Collect utilization data (CPU, memory, storage, network, throughput)
2. Analyze: Compare current utilization against thresholds and trends
3. Forecast: Predict future demand based on business growth, seasonality, product launches
4. Plan: Determine when and what capacity needs to be added
5. Implement: Add capacity through scaling, purchasing, or provisioning
6. Review: Validate capacity decisions against actual usage

### Threshold Management
| Threshold | Level | Action |
|-----------|-------|--------|
| Normal | < 60% utilization | No action |
| Planned | 60-80% | Monitor trend for growth |
| Warning | 80-90% | Plan capacity addition within 30 days |
| Critical | 90-95% | Implement capacity increase urgently |
| Exhausted | > 95% | Immediate action, possible service impact |

## Resource Capacity Planning

### Compute Capacity Planning
Monitor: CPU utilization, memory utilization, disk I/O, network throughput. Right-sizing: analyze 14-day utilization to determine if instance type is over or under-provisioned. Auto-scaling: scale out based on CPU or request count threshold.

### Storage Capacity Planning
Monitor: total capacity, growth rate, IOPS, throughput. Tier data by access frequency: hot (SSD), warm (HDD), cold (archive). Set growth alerts: 80% full -> plan expansion, 90% full -> urgent expansion.

### Database Capacity Planning
Monitor: connection count, query throughput, disk space, replication lag. Index maintenance: rebuild/reorganize based on fragmentation. Query optimization: identify and fix slow queries before they cause capacity issues.

## Availability Management

### Availability Metrics
| Metric | Definition | Formula |
|--------|------------|---------|
| Service Availability | % of agreed time service was available | (Agreed Time - Downtime) / Agreed Time x 100 |
| MTBF | Mean time between service failures | Total Uptime / Number of Failures |
| MTTR | Mean time to repair | Total Downtime / Number of Failures |
| MTTD | Mean time to detect | Time from failure to first alert |
| MTBSI | Mean time between service incidents | Total Time / Number of Incidents |

### Availability Calculation
Agreed time: The period when service is expected to be available (e.g., 24x7, business hours only).

Downtime: Period when service is unavailable or significantly degraded. Excludes planned maintenance if agreed in SLA.

Example: 24x7 service, 30 minutes downtime in May (31 days = 44,640 minutes).
Availability = (44640 - 30) / 44640 x 100 = 99.93%

### Availability Design for Tiered Services
| Tier | Availability | Annual Downtime | Architecture |
|------|-------------|-----------------|-------------|
| 1 | 99.995% | 26 minutes | Multi-region active-active |
| 2 | 99.99% | 53 minutes | Multi-AZ with auto-failover |
| 3 | 99.9% | 8.76 hours | Single region, HA within AZ |
| 4 | 99.5% | 43.8 hours | Single instance with backup |

## Demand Management

### Influencing Demand
Not all demand must be met with capacity increases. Strategies:
- Chargeback/showback: Teams pay for resources they use, reducing waste
- Scheduling: Shift non-critical workloads to off-peak hours
- Queuing: Buffer requests during peak, process during off-peak
- Throttling: Limit request rate per user/client
- Prioritization: Critical users get resources first during contention

### Forecasting Techniques
| Technique | Use When | Example |
|-----------|----------|---------|
| Trend analysis | Historical data available | Linear regression on monthly growth |
| Seasonality | Cyclical patterns | Holiday traffic spikes |
| Leading indicators | Correlated data available | Marketing spend predicts user growth |
| Scenario planning | High uncertainty | Best/worst/most-likely case capacity plans |

## Reporting

### Capacity Report Contents
| Section | Contents |
|---------|----------|
| Executive Summary | Overall status, key risks, recommendations |
| Resource Utilization | CPU, memory, storage, network per service |
| Trend Analysis | 3/6/12-month utilization trends |
| Forecast | Predicted utilization vs capacity by quarter |
| Recommendations | Capacity additions, right-sizing, optimization |

### Availability Report Contents
| Section | Contents |
|---------|----------|
| Service Availability | Actual vs target for each service |
| Major Incidents | Service outages with duration and root cause |
| MTBF/MTTR Trends | Monthly trend over 12 months |
| Planned Maintenance | Upcoming maintenance windows and expected impact |
| Improvement Actions | Actions to improve availability |

## Capacity and Availability in ITIL 4

### Integration with Other Practices
- Incident Management: Capacity-related incidents trigger capacity review
- Problem Management: Root cause of availability issues feeds capacity planning
- Change Management: Capacity changes follow change process
- Service Level Management: Capacity and availability targets define SLAs
- Continual Improvement: CSI register tracks capacity/availability improvements

### Automation
Automated scaling: auto-scaling groups, cluster autoscaler, database auto-pilot. Automated failover: health checks, DNS failover, load balancer health pools. Automated alerts: threshold-based alerts, predictive alerts (forecast breach before it happens).

## Key Points
- Capacity management has three sub-processes: business, service, and component
- Threshold monitoring (normal -> planned -> warning -> critical -> exhausted) prevents surprises
- Availability is calculated against agreed time, not calendar time
- Availability design tiers map to architectural redundancy levels
- Demand management (chargeback, scheduling, queuing) reduces needed capacity
- Capacity forecasting uses trend, seasonality, leading indicators, and scenario analysis
- Capacity and availability reports drive planning and improvement decisions
- Automated scaling and failover reduce manual capacity management effort