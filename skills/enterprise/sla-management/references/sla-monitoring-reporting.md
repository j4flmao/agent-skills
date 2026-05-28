# SLA Monitoring and Reporting

## Overview
SLA monitoring and reporting provides the operational infrastructure for measuring SLIs, tracking SLO attainment, computing error budgets, generating customer reports, and managing the full lifecycle of SLA compliance. This reference covers instrumentation, dashboards, alerting, reporting automation, and the operational processes that keep SLA commitments on track.

## Instrumentation and Measurement

### SLI Data Sources
Application Performance Monitoring (APM): request-level data including latency, error rate, and throughput. Captured from server-side instrumentation (OpenTelemetry, Datadog, New Rellic, Dynatrace). Provides high-fidelity measurement at the individual request level. Suitable for latency, error rate, and throughput SLIs.

Infrastructure monitoring: system-level metrics (CPU, memory, disk, network). Indirect indicators of service health. Less suitable for customer-facing SLIs but useful for capacity planning and root cause analysis.

Synthetic monitoring: external probes that simulate user requests from multiple locations. Measures availability and latency from the user's perspective. Complements APM data by providing independent verification. Services: Pingdom, Checkly, Datadog Synthetics, AWS CloudWatch Synthetics.

Load balancer and proxy logs: request logs from load balancers (ELB, NGINX, HAProxy) or API gateways. Provide request-level data independent of application instrumentation. Useful as a secondary measurement source for dispute resolution.

Client-side monitoring: real user monitoring (RUM) capturing performance from the browser or mobile app. Measures actual user experience including client network time. More accurate for user-facing SLIs but noisier due to client-side variability.

### SLI Calculation Methods

Request-based measurement: measure SLI as successful requests / total requests over the measurement window. Uptime = successful requests / total requests where successful means HTTP 2xx or 3xx (excluding 4xx client errors). Latency = percentile (p50, p95, p99) of request duration distribution. Error rate = 5xx responses / total responses.

Pros: accurate, granular, accounts for traffic volume. Cons: requires request-level instrumentation, can be noisy for low-traffic periods. Best for: high-traffic services, API-based services, transactional systems.

Time-based measurement: measure SLI as time the service is available / total time in the measurement window. Uptime = minutes without service-affecting incident / total minutes. Pros: simple, no request-level data needed, easy to verify. Cons: ignores traffic volume (an incident during low traffic has same weight as during high traffic). Best for: infrastructure services, services with low or variable traffic, when request-level instrumentation is not available.

Composite measurement: combination of multiple SLIs into a single score. Example: overall service health = 0.5 × uptime + 0.3 × latency + 0.2 × error rate. Pros: single metric for dashboard, reflects multiple dimensions of health. Cons: complex to define, weights are subjective, hard to contract. Best for: internal dashboards, not contractual SLA measurement.

### Data Collection Pipeline
Instrumentation layer: agents, SDKs, or libraries that capture SLI data from the service. Output: metrics, events, or logs with timestamps, request IDs, response codes, latency measurements. Push to collection layer.

Collection layer: aggregators that collect, batch, and forward telemetry data. Technologies: OpenTelemetry Collector, Fluentd, Logstash, Vector. Handle buffering, retry, and back-pressure. Output to storage layer.

Storage layer: time-series databases for metrics (Prometheus, Thanos, VictoriaMetrics, InfluxDB), log storage for events (Elasticsearch, Loki, Splunk), data warehouse for long-term analytics (BigQuery, Snowflake, Redshift). Retention policies: raw data (7-30 days), aggregated data (6-12 months), monthly summaries (permanent).

Computation layer: services that compute SLIs, SLO attainment, and error budgets from stored data. Query raw data or aggregated data depending on precision requirements. Output to visualization and alerting layers.

### Measurement Frequency and Granularity
Measurement frequency: how often SLIs are computed. Real-time (every minute) for alerting. Every 5-10 minutes for dashboards. Hourly for trend analysis. Daily for reporting.

Granularity: request-level for accuracy, minute-level for availability, hour-level for trend. Higher granularity provides more accurate SLO calculation but requires more storage. Balance precision with cost.

Aggregation: raw data is aggregated over time for reporting. 1-minute aggregates (min, max, avg, p50, p95, p99 of latency; count of success and error). 1-hour aggregates (same as minute, plus rolling window computation). Daily aggregates (SLO attainment for the day, error budget consumption for the day).

### Measurement Reliability
The measurement system must be more reliable than the service it measures. If the monitoring system fails and cannot report SLI data, the provider cannot prove SLO attainment. This may result in automatic breach determination.

Monitoring system reliability requirements: independent infrastructure (separate from the service being monitored), redundant collection (multiple collection paths), durable storage (data survives collection system failure), backup probes (fallback if primary probes fail), and SLI measurement SLO (monitoring system has its own reliability target, typically 99.99%).

## SLO Attainment Calculation

### Continuous vs. Discrete Attainment
Continuous attainment: SLI is measured continuously and attainment is calculated as the percentage of time (or requests) that meet the SLO target over the window. Represents moment-by-moment SLO compliance.

Discrete attainment: SLI is measured at discrete intervals (e.g., every minute) and attainment is calculated as the percentage of intervals that meet the target. Simplifies calculation but loses precision between intervals.

Best practice: use continuous attainment for contractual SLAs (most accurate), discrete attainment for internal dashboards (simpler, still directionally correct).

### Rolling Window Calculation
Rolling window maintains a buffer of the most recent N days of SLI data. When a new day's data is added, the oldest day's data is removed. SLO attainment is calculated over the current window contents.

Example: 30-day rolling window for 99.9% uptime. Day 1-30 data defines attainment. On Day 31, Day 1 data is removed and Day 31 data is added. Attainment is recalculated.

Implementation: store daily SLI aggregates (success count, total count, latency distribution). Compute rolling window attainment by summing aggregates over the window. Update daily.

### Calendar Window Calculation
Calendar window aligns with calendar months (or quarters). SLO attainment is calculated for the full calendar period. Resets at the beginning of the next period.

Example: January has 31 days. Uptime is calculated as uptime over January. February has a fresh start regardless of January performance.

Implementation: compute SLI aggregates for the month to date. Report current SLO attainment. At month end, finalize attainment for the month and reset counters.

### Composite SLO Attainment
When multiple SLIs are contracted in the same SLA, composite attainment may be needed. Two common approaches:

All-or-nothing: all SLOs must be met for the SLA to pass. Any single breach triggers credits. Strictest approach. Best for critical services where all dimensions matter equally.

Weighted composite: each SLO has a weight, and weighted attainment must meet a threshold. Example: uptime (50%), latency (30%), error rate (20%). Composite = 0.5 × uptime + 0.3 × latency + 0.2 × error rate. Composite target: 99.9%. Allows one SLO to slightly underperform if others overperform.

## Error Budget Management

### Error Budget Calculation
Error budget = (1 - SLO) × total measurement units in window.

For request-based SLIs: error budget = (1 - SLO) × total requests in window. Example: 99.9% SLO over 1M requests = (1 - 0.999) × 1,000,000 = 1,000 allowed failed requests.

For time-based SLIs: error budget = (1 - SLO) × total time in window. Example: 99.9% SLO over 30 days = (1 - 0.999) × 43,200 minutes = 43.2 minutes allowed downtime.

### Error Budget Consumption Tracking
For each event where the SLI falls below the SLO threshold, count the event toward budget consumption. Request-based: each failed request or request exceeding latency target consumes budget. Time-based: each minute of downtime consumes budget.

Running consumption: consumption over the current window / total budget for the window. Expressed as a percentage. 0% = no consumption, 100% = budget fully consumed, >100% = budget exceeded.

Budget replenishment: in a rolling window, budget is replenished as old data falls out of the window. If the removed data was from a period of good performance, the budget consumption percentage decreases. This creates a natural recovery mechanism.

### Budget Consumption Policies
Green zone (0-50% consumed): normal operations. Feature work proceeds normally. No additional reliability investment required beyond standard practices.

Yellow zone (50-75% consumed): increased awareness. Team discusses error budget status in standup. Reliability work is prioritized in sprint planning. Feature work continues but with awareness that budget is trending toward exhaustion.

Orange zone (75-100% consumed): active intervention. Reliability work takes priority over feature work. Non-critical deployments are reviewed for risk. On-call team is on heightened alert.

Red zone (100%+ consumed): feature freeze. No non-critical deployments allowed. Only reliability fixes, security patches, and dependency upgrades. All hands on reliability until budget recovers.

### Feature Freeze Implementation
Automated enforcement: deployment pipeline checks error budget status before allowing deployments. Condition: error budget < 100% consumed. Exemptions: reliability fixes, security patches, dependency upgrades, configuration changes (not code changes).

Manual override: executive approval required for any deployment during feature freeze. Override reason documented. Override limit: maximum N overrides per quarter.

Feature freeze communication: notify engineering team when freeze is triggered. Include: current budget consumption, expected duration (based on burn rate trend), allowed changes, escalation path for override requests.

Feature freeze lift: automatically lift when budget drops below 75% consumed. Manually lift after team review if improvements have been validated.

## SLA Dashboards

### Internal SLA Dashboards
Purpose: provide real-time visibility into SLO attainment and error budget status for the engineering team.

Dashboard components:
- Overall SLA health score: composite of all service SLOs. Green (all SLOs on track), Yellow (any SLO at risk), Red (any SLO breached or budget exhausted).
- Per-service SLO cards: each card shows service name, SLO target, current attainment, error budget consumption percentage, burn rate status. Color-coded by status.
- Error budget trend: chart showing error budget consumption over the current window. Green/yellow/orange/red zones marked. Projected exhaustion date.
- Burn rate indicators: current burn rate status per service (fast/slow/nominal). Number of active burn rate alerts.
- Recent breaches: list of SLO breaches in the past 7 days. Duration, impact, root cause, remediation status.
- Incident correlation: incidents overlaid on error budget consumption chart. Shows which incidents consumed the most budget.

Update frequency: real-time (seconds to minutes). Available to all engineering team members.

### Customer SLA Dashboards
Purpose: provide customers with visibility into SLA performance against their contracted terms.

Dashboard components:
- Customer overview: customer name, contract tier, current month SLO attainment, overall status (pass/breach).
- SLO attainment by metric: for each contracted SLI, show target vs. actual for the current month. Historical trend line for last 12 months.
- Incidents: list of SLA-impacting incidents in the current month. Duration, impact, root cause (customer-friendly language), remediation status.
- Service credits: credits earned this month (if any), credits issued, total credits this year.
- Reports: downloadable monthly SLA reports (PDF, CSV). Raw data export for customer verification.

Update frequency: daily (aligned with contractual reporting cadence). Available to authorized customer contacts through a portal or API.

### Executive SLA Dashboards
Purpose: provide management with a high-level view of SLA health, credit costs, and reliability trends.

Dashboard components:
- Overall SLA attainment rate: percentage of all SLOs met across all services. Trend over 12 months.
- Credit cost: total service credits issued per month. As percentage of revenue. Trend over 12 months.
- Top breach causes: Pareto chart of breach causes (infrastructure, software, human error, external, capacity).
- SLA attainment by tier: separate attainment rates for critical, standard, and best-effort tiers.
- Investment vs. credit cost: reliability investment spend vs. credit cost. Show ROI of reliability improvements.
- Forecast: projected SLA attainment and credit cost for the next quarter based on current trends and planned improvements.

Update frequency: monthly (aligned with business reporting cadence). Available to executives through BI tools.

## SLA Alerting

### Burn Rate Alerts
Burn rate measures how fast the error budget is being consumed relative to the expected rate. Expected rate = 1 / window (e.g., for a 30-day window, expected burn rate = 1/30 of budget per day).

Fast burn rate: consuming budget at a rate that would exhaust it in < 2 hours (for critical services) or < 6 hours (for standard services). Triggers immediate page. Indicates critical incident requiring immediate response.

Slow burn rate: consuming budget at > 2x expected rate. Triggers daily digest alert. Indicates systemic issue that needs investigation but is not immediately critical.

Nominal burn rate: consuming budget at or below expected rate. No alert needed.

Alert fatigue prevention: fast burn alerts should page (they require immediate attention). Slow burn alerts should not page (they are informational). Each service should have at most 2-3 distinct alert configurations.

### Multi-Window Alerting Strategy
Recommended by Google SRE. Use two windows (short and long) for each burn rate level:

Fast burn, short window: detect quickly (e.g., 1 hour at burn rate > 10). Pages immediately. Catches sudden spikes. Risk: false positives from short-term noise.

Fast burn, long window: confirm sustained issue (e.g., 5 minutes at burn rate > 14 for latency). Reduces false positives but delays detection by minutes.

Slow burn, short window: detect developing issues (e.g., 6 hours at burn rate > 2). Daily alert. Risk: may not detect gradual degradation quickly enough.

Slow burn, long window: confirm sustained degradation (e.g., 3 days at burn rate > 1.5). Weekly review. Catches slow trends that short windows miss.

Configuration example for 99.9% SLO:
- Fast burn (page): 1 hour window, burn rate ≥ 10, spend ≥ 1.4% of budget
- Fast burn (page): 5 minutes window, burn rate ≥ 14 (for latency)
- Slow burn (daily): 6 hours window, burn rate ≥ 2, spend ≥ 5% of budget

### Predictive Alerting
Predictive alerts estimate when the error budget will be exhausted at the current burn rate. Triggered when projected exhaustion is within a defined horizon.

Configuration: projected exhaustion within 7 days → notify team lead. Projected exhaustion within 2 days → notify team + management. Projected exhaustion within 6 hours → page (high severity).

Predictive alerts enable proactive intervention before budget is exhausted. The team can investigate and remediate the issue before it triggers a feature freeze.

### Alert Response Process
Fast burn alert (page): acknowledge within 5 minutes. Incident commander assigned. Diagnosis within 15 minutes. Remediation within 1 hour (critical) or 4 hours (standard). Postmortem within 48 hours.

Slow burn alert (digest): review within 4 hours of notification. Create investigation ticket. Triage as priority: if burn rate > 3x expected, treat as high priority incident. If burn rate 1.5-3x expected, investigate within business hours.

Predictive alert (advisory): review within 1 business day. Assess burn rate trend. Plan intervention: reliability work in next sprint, capacity scaling, or dependency review.

## SLA Reporting

### Monthly SLA Report
For each contracted customer, generate a monthly SLA report with:

Header: customer name, contract number, reporting period, SLA tier.

SLO attainment table: for each contracted SLI: SLI name, target value, actual value, attained (yes/no/partial), percentage attainment.

Incident log: list of all SLA-impacting incidents during the month. For each incident: date/time, duration, impact description, root cause, resolution, any exclusions applied.

Service credit calculation: if SLO was breached: breach duration/exent, credit percentage applied, credit amount, total monthly fee, credit as percentage of fee. If no breach: "No service credits due this month."

Attestation: statement that the report is generated automatically from SLI measurement data. Contact information for disputes. Date of report generation.

Delivery method: automated email (PDF attachment), customer portal download, API access for programmatic consumption.

### Quarterly SLA Review Report
For internal and customer review (typically for critical tier customers):

Trend analysis: SLO attainment trend over the past 4 quarters. Improving, declining, or stable per SLI. Commentary on trends and contributing factors.

Incident analysis: top breach causes by frequency and duration. Trends in incident count and impact. Effectiveness of remediation actions.

Improvement initiatives: reliability investments made in the past quarter. Investments planned for the next quarter. Expected impact on SLO attainment.

SLO target review: assessment of current SLO targets. Are they still appropriate? Should they be tightened or loosened? Proposed changes with rationale.

Service credits summary: total credits issued in the past quarter. As a percentage of revenue. Trend over 4 quarters.

### Regulatory and Compliance Reporting
Some customers require SLA reports for their own compliance obligations (SOC2, HIPAA, PCI-DSS, FINRA). Report requirements may include: signed attestation of SLA performance, independent verification of SLI measurements, data retention for audit purposes, and specific report format or content requirements.

Implement report templates per regulatory framework. Maintain data retention per regulatory requirements (typically 3-7 years). Support customer audit requests with raw measurement data and report generation logs.

### Report Automation
Automated report generation: scheduled job runs monthly. Query SLI data from storage. Compute SLO attainment and error budget consumption. Calculate service credits. Generate report document (PDF, HTML, CSV). Deliver via email, portal, or API.

Report generation pipeline:
1. Query daily SLI aggregates for the reporting period
2. Compute SLO attainment per metric per customer
3. Apply exclusions (planned maintenance, force majeure)
4. Calculate service credits based on breach terms
5. Generate report document with template
6. Archive report with timestamp and data snapshot
7. Deliver to customer and internal stakeholders
8. Log delivery confirmation

Error handling: if SLI data is incomplete for the reporting period, note data gaps in the report. If data is entirely missing for a period, escalate to engineering for investigation. Do not generate reports with unverified data.

## Operational Processes

### Daily SLA Operations
Review error budget consumption for all services. Investigate any sudden changes. Check burn rate alerts. Address fast burn alerts immediately. Review slow burn digest and create tickets for investigation. Update SLA dashboard with latest data.

### Weekly SLA Review
Engineering team reviews: error budget status (green/yellow/orange/red), ongoing incidents or breach risks, burn rate trends (fast burn rate for any service?), and needed reliability work. Include SLA status in team standup or weekly meeting. Assign action items for any at-risk services.

### Monthly SLA Review
Operations team reviews: monthly SLO attainment by service, service credits issued (amount and % of revenue), breach analysis (root causes, trends), error budget consumption trend (month over month), and incident response effectiveness (detection time, resolution time, postmortem completion). Generate monthly SLA report. Publish to internal stakeholders. Address systemic issues with reliability investments.

### Quarterly SLO Review
Cross-functional review with engineering, product, and management: SLO target assessment — are targets still appropriate? Should they be tightened (system has improved) or loosened (system cannot meet consistently)? Error budget policy review — are consumption thresholds still appropriate? Feature freeze policy — is it being enforced? Is it effective?

Reliability investment planning: based on breach patterns, budget consumption, and product strategy. Identify services that need reliability investment. Prioritize investments based on customer impact and business value.

SLO catalog update: document any SLO target changes, new SLIs, decommissioned SLIs. Communicate changes to affected teams and customers. Update dashboards, alerts, and reports.

### Annual SLA Audit
Comprehensive audit of SLA program: measurement accuracy — are SLI measurements accurate and reliable? Are there gaps or errors in the data pipeline? Process effectiveness — are alerting, incident response, and reporting processes working as designed? Are there gaps or inefficiencies? Cost analysis — what is the total cost of the SLA program (instrumentation, monitoring, reporting, credit payouts)? Is the cost justified by customer retention and revenue? Customer feedback — what do customers think of the SLA program? Is the reporting useful? Are the targets meaningful? Are there improvement opportunities?

Audit output: audit report with findings, recommendations, and action plan. Present to executive team for resource allocation decisions.

## Tools and Technologies

### Monitoring and Observability Platforms
Datadog: comprehensive monitoring platform. SLI measurement, SLO tracking, error budget dashboards, burn rate alerting. Strong APM, infrastructure, and synthetic monitoring capabilities. SLO tracking with rolling and calendar windows.

New Relic: APM-focused platform with SLO tracking. Good for request-level SLI measurement. Error budget tracking and burn rate alerts. Synthetics monitoring for external probes.

Dynatrace: AI-powered observability. Automatic SLI measurement through Davis AI. SLO tracking and alerting. Good for large-scale, complex environments.

Grafana + Prometheus: open-source stack. Prometheus for metrics collection and alerting. Grafana for visualization and dashboards. SLO tracking via Prometheus recording rules and Grafana dashboards. Most flexible but requires more setup.

### SLA Reporting Tools
Custom reporting: build on the data warehouse (Snowflake, BigQuery, Redshift). Query SLI data, compute attainment and credits, generate reports via BI tools (Looker, Tableau, Metabase). Most flexible, tailored to specific SLA terms.

SaaS SLA platforms: specialized tools for SLA management and reporting (e.g., SLAAlert, ServiceNow). Pre-built templates and workflows. Integration with monitoring platforms.

Automated document generation: use document generation tools (DocuSign, PandaDoc, custom PDF generation) to create formatted SLA reports from data.

### Alerting and Incident Management
PagerDuty: incident management with alert routing, on-call scheduling, and response automation. Integrate with monitoring platform for fast burn alerts.

OpsGenie: similar to PagerDuty. Alert management, on-call scheduling, and incident response workflows.

Slack/PagerDuty integration: route alerts to appropriate Slack channels. Automated incident creation from burn rate alerts.

## Key Points
- SLI measurement must be reliable and verifiable — the monitoring system must be more reliable than the service.
- Use request-based measurement for accuracy, time-based for simplicity. Match measurement method to service type.
- Rolling windows for internal monitoring, calendar windows for contractual SLA calculation.
- Error budget consumption tracked in four zones: green (0-50%), yellow (50-75%), orange (75-100%), red (100%+).
- Feature freeze at budget exhaustion — automated enforcement through deployment pipeline.
- Multi-window, multi-burn-rate alerting balances detection speed with alert fatigue.
- Monthly SLA reports generated automatically from SLI data — no manual calculation.
- Quarterly SLO review keeps targets aligned with system capability and customer requirements.
- Real-time internal dashboards for engineering, daily customer dashboards, monthly executive dashboards.
- Annual SLA audit ensures measurement accuracy, process effectiveness, and appropriate investment.
