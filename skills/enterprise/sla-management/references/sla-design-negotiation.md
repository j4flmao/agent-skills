# SLA Design and Negotiation

## Overview
SLA design and negotiation covers the structuring of service level agreements that balance customer expectations, operational capability, business risk, and commercial terms. This reference covers SLA architecture, target setting, penalty structures, legal considerations, and the negotiation process with enterprise customers.

## SLA Architecture

### What is an SLA?
A Service Level Agreement (SLA) is a formal contract between a service provider and a customer that defines: the services provided, the expected reliability and performance levels (SLOs), the measurement and reporting methodology, the consequences of failing to meet targets (penalties, service credits), and the exclusions and limitations (what is not covered).

SLAs serve multiple purposes: set clear expectations between provider and customer, provide a framework for measuring and reporting service quality, create accountability for reliability investments, define commercial consequences for service failures, and differentiate service tiers for different customer segments.

### SLA vs. SLO vs. SLI
SLI (Service Level Indicator): a quantitative measure of some aspect of service quality. Examples: request latency (p99), error rate (5xx / total), uptime (available minutes / total minutes). SLIs are the raw measurements.

SLO (Service Level Objective): a target value or range for an SLI over a specified time window. Examples: 99.9% uptime over a rolling 30-day window, p99 latency < 200ms over a rolling 7-day window. SLOs define the acceptable performance level.

SLA (Service Level Agreement): a contractual commitment to meet SLOs, with consequences for breach. An SLA references specific SLOs but adds commercial and legal terms. Not all SLOs need to be in the SLA — internal SLOs are typically stricter than contractual SLAs.

The relationship: SLIs are measured → SLOs set targets → SLA contracts the targets with consequences. Internal SLOs should be tighter than contractual SLAs to provide a buffer zone where the team can address issues before customers are affected.

### SLA Components
Service description: what service is covered? Define scope, boundaries, and dependencies. Include API endpoints, user-facing features, infrastructure components. Exclude explicitly what is not covered.

SLO targets: specific metrics, targets, measurement methods, and time windows. For each SLO: metric name (uptime, latency, error rate, throughput), target value (99.9%, 200ms, 0.1%), measurement method (request-based, time-based, synthetic), measurement window (rolling 30 days, calendar month, quarterly), exclusions (planned maintenance, client errors, force majeure).

Measurement and reporting: how SLIs are measured, how data is collected, how reports are generated and delivered. Measurement source (server logs, APM tools, synthetic probes), report frequency (monthly, quarterly), report format (dashboard access, PDF, automated email), data retention for dispute resolution.

Exclusions: what is not covered by the SLA. Planned maintenance with advance notice. Client-side issues (network, device, browser). Force majeure events. Third-party service dependencies. Beta or preview features. Usage exceeding reasonable limits.

Penalties and service credits: what happens when SLO targets are not met. Credit calculation formula, credit cap (typically 10-50% of monthly fee), payment method (credit against future invoices, cash refund), minimum threshold before credits apply (de minimis).

Term and termination: SLA effective dates, renewal terms, termination for repeated breach, transition assistance upon termination.

## SLO Target Setting

### Determining Achievable Targets
Start with historical data: analyze the past 3-6 months of SLI data to understand current performance. Calculate current uptime, latency distributions, and error rates. Identify patterns: seasonal variations, traffic-related degradation, deployment-related incidents.

Set initial SLO targets at or slightly above current performance. A 99.9% target is achievable if the service has been at 99.95% for the past 3 months. A 99.99% target is risky if the service has been at 99.95% — the gap between 99.9% and 99.99% is 10x less allowed downtime.

Consider headroom: internal SLOs should be 2x stricter than external SLA targets. If the SLA promises 99.9%, the internal SLO should be 99.95%. This provides a buffer zone where the team can detect and fix issues before they become customer-facing breaches.

### Customer-Driven Target Setting
Survey enterprise customers: what uptime level do they expect? What latency is acceptable for their use case? What are their business continuity requirements? What SLAs do they have with their own customers (that your SLA must support)?

Match SLO targets to customer value: high-value customers get tighter SLOs (and pay more). Low-value customers get standard SLOs (and pay less). The SLO tier should reflect the operational investment required to support it.

Negotiate SLOs based on customer requirements, not just operational capability. If a customer requires 99.99% but the service can only deliver 99.9%, either invest in reliability improvements before signing the contract, or scope the SLA to the achievable level and offer service credits as a bridge.

### SLI Selection
Chose SLIs that matter to customers: uptime is the most commonly contracted SLI because it is easy to understand and measure. Latency matters for real-time applications (APIs, streaming, collaboration). Error rate matters for transactional services (payments, orders, data processing). Throughput matters for batch processing and data-intensive services.

Each SLI should be: measurable (data is available and reliable), meaningful (directly affects customer experience), actionable (team can improve it), and contractable (clear definition and dispute resolution).

Avoid SLIs that are: noisy (high variance without clear signal), indirect (measure internal system health, not user experience), or unactionable (team cannot directly influence the metric).

### Window Selection
A rolling window (e.g., 30 days rolling) continuously measures performance over the most recent period. Advantages: prevents permanent deficits from single incidents, allows recovery over time, reflects current service quality. Disadvantages: more complex to calculate, difficult for customers to verify.

A calendar window (e.g., calendar month) resets at the beginning of each month. Advantages: simple to calculate and verify, clear start and end dates. Disadvantages: an incident at the end of one month and beginning of the next counts against two windows, a bad month is followed by a fresh start.

A quarterly window smooths out short-term variations but delays breach detection. Best for services with high variance but long-term consistent performance.

Best practice: use rolling windows for internal monitoring (the most accurate measure of current performance) and calendar windows for contractual SLAs (simpler for customers to understand and verify).

### Exclusions Definition
Common SLA exclusions:
- Planned maintenance: scheduled downtime with advance notice (typically 24-48 hours). Must be communicated through a defined channel. Should not exceed a maximum per month (e.g., 4 hours).
- Client-side issues: problems caused by the customer's network, hardware, software, or configuration. Provider is not responsible for on-premises infrastructure the customer controls.
- Force majeure: events outside the provider's control (natural disasters, war, terrorism, government action, major internet outages).
- Third-party dependencies: services the provider depends on but does not control (cloud providers, CDN, DNS, payment gateways, telecom carriers). Best practice: the provider should still manage these dependencies and offer credit if they cause breach, but the exclusion protects against events truly outside control.
- Beta/preview features: pre-release functionality is not covered by SLA. Customer accepts the risk of using preview features.
- Abuse or excessive use: customer usage that exceeds reasonable limits (rate limits, storage limits, API call limits). Provider is not responsible for performance degradation caused by abusive usage.
- Customer-requested changes: changes the customer requests that negatively affect performance.

## Penalty Structures

### Service Credit Models
Percentage-based credit: customer receives a percentage of their monthly fee for each period the SLA is breached. Typical structure: 5% credit for first 0.1% below SLO, 10% for 0.2% below, 25% for 0.5% below, 50% for 1% or more below. Scales with breach severity.

Tiered credit: different credit levels for different breach types. Uptime breach: 5% per 0.1% below target. Latency breach: 2% per 10ms above target. Response time breach: 1% per hour above target. Reflects the relative impact of each SLI.

Flat credit: fixed credit amount per breach incident. Example: 10% of monthly fee for any SLA breach regardless of duration or severity. Simpler to administer but may not reflect breach severity.

Accelerating credit: credit percentage increases for repeated breaches. First breach: 5%, second consecutive month: 10%, third: 25%. Creates strong incentive to prevent recurring issues.

### Credit Caps
Most SLA contracts include a maximum credit limit, typically 10-50% of monthly fees. Caps protect the provider from catastrophic credit exposure while still providing meaningful customer compensation.

Arguments for caps: unlimited credits could exceed revenue from the customer, creating negative-margin accounts. Caps are standard in the industry. Caps still provide strong incentive (losing up to 50% of monthly revenue is significant).

Arguments against caps: caps reduce provider accountability for severe or extended outages. Enterprise customers may insist on uncapped credits for critical services.

Negotiation approach: offer capped credits for standard SLAs, uncapped for premium-tier SLAs with higher pricing. The premium pricing covers the additional risk.

### Credit Claim Process
Automatic credit issuance: provider detects breach, calculates credit, and issues credit against the next invoice. No customer action required. Best customer experience, but requires automated measurement and reporting.

Customer-requested credit: customer must submit a credit claim with evidence of breach. Provider validates and issues credit. More common in traditional enterprise contracts. Requires clear claim process and timeline (typically 30 days from month end).

Hybrid: automatic for clearly measurable SLIs (uptime, latency), customer-requested for subjective or complex SLIs (response time, resolution time).

### Credit Payment Method
Invoice credit: credit applied against the next invoice. Most common. Simple to administer. Provider retains the cash (credit reduces future receivable rather than requiring refund).

Cash refund: provider refunds the credit amount. Rare in enterprise SaaS (administrative overhead). Used when the customer is terminating or for very large credits.

Service extension: credit converted to additional service time. Common for subscription services. "Your one-month credit extends your subscription by 10 days."

### Minimum Threshold (De Minimis)
A minimum threshold before credits apply. Example: no credit for breaches lasting less than 5 minutes. Prevents customers from claiming credits for very short outages that have negligible business impact.

Typical thresholds: 5-minute minimum for uptime breaches, 1% sample size minimum for latency breaches. Thresholds should be small enough that significant breaches are captured but large enough that noise is excluded.

## Legal and Commercial Considerations

### SLA as a Legal Document
The SLA is a legally binding contract addendum. It should be reviewed by legal counsel before signing. Key legal elements: definitions (clear definitions of all terms to prevent ambiguity), scope (precise description of services covered to prevent scope creep), limitations (clear exclusions and limitations of liability), dispute resolution (process for resolving measurement or credit disputes), amendment (process for changing SLA terms).

### Liability Limitations
Link SLA credits to the contract's overall limitation of liability. Typically, SLA credits are the sole remedy for service failures. The customer cannot pursue additional damages beyond the credit mechanism.

This limitation is standard in the industry but is often contested by enterprise customers. Negotiation: sole remedy for service failures within the SLA scope. Customer retains rights for gross negligence, willful misconduct, or data breach outside SLA scope.

### Dispute Resolution
Measurement disputes: how to resolve disagreements about SLI measurements. Process: provider shares raw measurement data, customer can audit, third-party measurement as escalation. Timeline: 30-60 days to resolve.

Credit disputes: how to resolve disagreements about credit calculations. Process: provider recalculates, customer reviews, executive escalation if unresolved. Timeline: 30 days.

Arbitration: unresolved disputes go to binding arbitration. Specify arbitration body, rules, location, and cost sharing.

### SLA Amendment Process
SLAs should be reviewed and can be amended annually. Amendment triggers: significant infrastructure changes, new service capabilities, changes in customer requirements, repeated breaches requiring target adjustment.

Process: both parties agree to review, proposed changes are documented and negotiated, amendment is signed and appended to the SLA. Amendments should be limited to once per year to prevent constant renegotiation.

## Negotiation Process

### Preparation Phase
Understand customer requirements: what does the customer actually need in terms of reliability, performance, and support? Is uptime the real concern, or is it data integrity, security, or disaster recovery? Do not over-commit on SLIs that do not matter to the customer.

Know the service's capabilities: what reliability is the service currently delivering? What is the gap between current performance and customer requirements? What investments are planned to improve reliability? Do not promise what the service cannot deliver.

Define negotiation boundaries: minimum acceptable SLOs (the lowest the provider can offer), target SLOs (what the provider aims to agree), maximum credits (the highest credit exposure the provider can accept), must-have terms (non-negotiable exclusions, liability caps). Prepare walk-away criteria.

Prepare the negotiation team: sales representative (commercial terms, relationship), product manager (capabilities, roadmap), legal counsel (liability, contract terms), engineering lead (technical feasibility, operational investment required).

### Negotiation Phase
Start with standard terms: present the provider's standard SLA as the starting point. Standard terms are benchmarked against industry practice and operational capability. Deviations should be justified by the customer.

Listen to customer concerns: what specific concerns drive the customer's SLA requirements? Past bad experiences with other vendors? Internal compliance requirements? Downstream customer commitments? Regulatory obligations? Address the underlying concern, not just the stated SLA target.

Trade scope for commitment: if the customer needs tighter SLOs, offer them in exchange for higher pricing, longer contract term, or reduced scope. Tight SLOs require operational investment that should be compensated.

Use the tier structure: if the customer wants higher SLOs than the standard tier, offer the next tier with appropriate pricing. The tier structure aligns customer expectations with operational investment.

Document agreements in writing: every negotiation session should produce written notes of agreements, open items, and action items. Both parties review and confirm before the next session.

### Common Negotiation Points
SLO target levels: customer wants 99.99%, provider offers 99.9%. Negotiate: 99.95% with a plan to reach 99.99% within 12 months, interim credits if 99.99% is not met by the deadline.

Measurement method: customer wants third-party measurement, provider prefers internal measurement. Negotiate: provider's measurement is primary, customer can verify with their own synthetic monitoring, third-party audit available for dispute resolution.

Credit percentage: customer wants 10% per 0.1% breach, provider offers 5%. Negotiate: 5% standard, 10% for consecutive months of breach. Higher credit for persistent problems.

Credit cap: customer wants no cap, provider wants 25% cap. Negotiate: 50% cap, uncapped for catastrophic outages (multiple hours below SLO). Hybrid approach.

Response time SLOs: customer wants guaranteed response times for support tickets. Negotiate: define response tiers by severity (critical: 15 min, high: 1 hour, medium: 4 hours, low: 24 hours). Provide credits for response time misses.

### Closing Phase
Finalize all terms: review all agreed terms for consistency and completeness. Ensure no open items remain. Confirm that the SLA matches the customer's actual requirements, not aspirational targets.

Sign and implement: execute the SLA as a contract addendum. Set up measurement and reporting for the customer. Schedule the first SLA review (typically 30-60 days after contract start). Provide customer access to SLA dashboard.

Plan for review: schedule quarterly business reviews that include SLA performance. Review trend, incidents, credits, and upcoming changes. Use reviews to strengthen the relationship, not just report metrics.

## Multi-Tier SLA Design

### Tier Definition Principles
Each tier should represent a real difference in service quality, not just marketing. The operational investment to support a tier should be proportional to the revenue from that tier. Tiers should be clearly differentiated so customers can self-select.

Three-tier model: Critical (99.99% uptime, <10ms p99 latency, 15-minute response, dedicated support, 24/7 coverage). Standard (99.9% uptime, <100ms p99 latency, 1-hour response, pooled support, business hours coverage). Best-Effort (no SLO, no guarantee, community support, best effort).

### Operational Investment Per Tier
Critical tier: multi-region deployment with automatic failover, redundant infrastructure (no single point of failure), dedicated support engineers (24/7 coverage), proactive monitoring and incident response (<5 minute detection), monthly SLA reporting with executive review, capacity planning with headroom for 2x traffic spikes.

Standard tier: single-region deployment with redundancy within region, pooled support team (business hours coverage), standard monitoring and incident response (<15 minute detection), monthly automated SLA reporting, capacity planning with headroom for 1.5x traffic spikes.

Best-effort tier: single-region deployment, community support, standard monitoring, no SLA reporting, no capacity guarantees.

### Pricing Per Tier
Critical tier pricing: premium pricing (2-5x standard). Reflects the additional operational investment: dedicated infrastructure, dedicated support, proactive monitoring, higher capacity headroom, and credit risk.

Standard tier pricing: standard pricing. Based on standard operational costs plus margin.

Best-effort tier pricing: free or low-cost. No SLA-related costs.

Tier migration: customers can upgrade tiers with appropriate pricing adjustment. Downgrade is typically allowed at contract renewal or with notice period. Migration requires operational preparation (especially upgrading to critical tier).

## SLA Breach Management

### Breach Detection
Automated detection: monitoring systems detect when SLIs fall below SLO thresholds. Generate breach event with timestamp, duration, and impact scope. Log to breach management system. Trigger incident response for active breaches.

Breach confirmation: automated detection is primary. Manual confirmation for edge cases. Dispute resolution process for measurement disagreements. Breach is confirmed when monitoring data shows sustained violation.

Breach notification: internal notification to service team (immediate). Customer notification per contract terms (typically within SLA response time). Regulatory notification if applicable.

### Breach Analysis
Root cause analysis: what caused the breach? Infrastructure failure, software bug, deployment issue, capacity saturation, external dependency failure, configuration error, human error. Document root cause and contributing factors.

Impact assessment: which customers were affected? What was the duration and severity of the breach? How many SLO windows were affected? What is the credit exposure? Document for reporting and remediation.

Remediation: what is being done to prevent recurrence? Short-term fix (restore service, mitigate impact). Long-term fix (code change, infrastructure improvement, process change). Verification (how will the fix be validated?).

### Breach Reporting
Customer report: formal notification to affected customers. Includes: breach description, duration and impact, root cause, remediation steps, credit calculation, and next steps. Tone: transparent, accountable, focused on improvement.

Internal report: incident report for the service team. Includes: technical details, timeline, root cause, remediation, lessons learned, preventive actions. Used for postmortem and process improvement.

Executive report: summary for management. Includes: breach count and trend, credit cost, customer impact, systemic issues, investments needed. Used for resource allocation decisions.

### Breach Prevention
Error budget management: monitor consumption, alert on burn rate, enforce feature freeze at exhaustion. Error budget is the primary breach prevention mechanism.

Proactive reliability investment: allocate engineering time to reliability improvements proportional to error budget consumption. When budget is low, reliability work takes priority.

Chaos engineering: test system resilience through controlled experiments. Identify weaknesses before they cause customer-facing breaches. Regular game days and fault injection.

Capacity planning: monitor traffic trends and saturating ahead of demand. Scale infrastructure before it is needed. Test capacity limits regularly.

## Key Points
- SLA structure: SLIs (measurements) → SLOs (targets) → SLA (contract with consequences).
- Internal SLOs should be 2x stricter than contractual SLAs to provide buffer against breaches.
- Set SLO targets based on historical performance data plus realistic improvement margin.
- Rolling windows for internal monitoring, calendar windows for contractual SLAs.
- Service credits should be proportional to breach severity with reasonable caps (25-50%).
- Multi-tier SLA aligns operational investment with customer revenue and requirements.
- Negotiate SLA terms based on customer requirements and service capabilities, not just standard templates.
- Error budget management is the primary breach prevention mechanism.
- Quarterly SLO reviews keep targets aligned with system capability and customer needs.
- Document exclusions clearly to prevent disputes — planned maintenance, client issues, force majeure.
