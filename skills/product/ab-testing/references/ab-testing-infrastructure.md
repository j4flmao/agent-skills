# A/B Testing Infrastructure and Operations

## Overview
A/B testing infrastructure encompasses the systems, tools, processes, and organizational practices that enable reliable, scalable, and efficient experimentation. This reference covers randomization systems, data pipelines, tool selection, operational workflows, and organizational maturity models for running experiments at scale.

## Experimentation System Architecture

### Core Components
A complete experimentation platform consists of five interconnected systems:

Assignment service: determines which variant each user sees. Must be fast (sub-millisecond), reliable (never assign differently for the same user), and consistent (user stays in same variant for experiment duration). Typically implemented as a deterministic function of user ID and experiment ID.

Event tracking pipeline: captures user interactions and attributes them to the correct experiment and variant. Must handle high volume (millions of events per day), provide real-time and batch processing, and maintain data integrity through validation and deduplication.

Data warehouse: stores events, experiment assignments, and user attributes. Must support fast queries for analysis, maintain historical data for long-term metrics, and integrate with business intelligence tools.

Statistical analysis engine: performs sample size calculation, AA testing, p-value computation, confidence interval estimation, and sequential testing. May be integrated into the platform or use external statistical libraries.

Experiment management console: UI or API for creating, monitoring, and analyzing experiments. Includes experiment configuration, metric definition, results dashboard, and alerting.

### Assignment Systems

#### Deterministic Assignment
User ID hashing: assign user to variant using hash(user_id, experiment_id) mod N. Consistent — same user always gets same variant for same experiment. No 3rd party cookies required. Works server-side or client-side.

Hash functions: use cryptographic hashes (SHA-256, MD5) for uniform distribution. Avoid modular arithmetic on raw user IDs (they may have patterns). Validate uniformity with chi-squared test on AA test data.

Consistent hashing: minimizes reassignment when the number of variants changes. Useful for experiments where variants may be added or removed during the experiment. Less uniform than direct hashing but more stable.

#### Random Assignment
Random number generation: generate a random number for each user at assignment time. Store the assignment persistently (user profile, cookie, local storage). Requires random number generator with uniform distribution.

Stratified random assignment: divide users into strata (by region, plan, device) and randomize within each stratum. Ensures balanced covariates across variants. More complex to implement but reduces variance.

#### Assignment Persistence
Server-side: store assignment in user database or session store. Most reliable — survives browser clearing, device changes, and session timeouts. Requires server-side lookup on every request.

Client-side: store assignment in cookie or local storage. No server-side lookup required. Fragile — lost when cookie is cleared, browser is changed, or on incognito mode.

Hybrid: use both server-side storage and client-side cookie. Server-side is authoritative. Client-side cookie enables fast client-side decision making.

### Event Tracking Pipeline

#### Event Collection
Server-side events: capture actions that occur server-side (signup, purchase, API call). Include user ID, timestamp, event name, event properties, experiment ID, variant ID. Most reliable — not affected by ad blockers or client-side failures.

Client-side events: capture actions that occur in the browser or app (page view, click, scroll). More granular but less reliable (ad blockers, network failures, browser privacy restrictions). Include additional context: page URL, device type, browser, viewport size.

Synthetic events: events derived from other data sources (support ticket created, email sent, push notification received). Attribute to experiments through user ID and experiment assignment lookup.

#### Event Processing
Stream processing: events processed in real-time (or near real-time) for monitoring, alerting, and real-time personalization. Typical latency: seconds. Technologies: Apache Kafka, Amazon Kinesis, Google Pub/Sub, Apache Flink.

Batch processing: events processed in scheduled batches (hourly, daily) for final analysis. Includes deduplication, validation, and attribution. Typical latency: hours. Technologies: Apache Spark, AWS EMR, Google Dataflow, dbt.

Validation stage: check event format (required fields present, field types correct), event quality (no duplicates, timestamps within acceptable range, user IDs valid), and attribution correctness (variant assignment matches experiment configuration). Invalid events are quarantined for investigation.

#### Attribution
Deterministic attribution: user ID is present in every event and maps directly to experiment assignment. Most reliable. Requires authenticated events.

Probabilistic attribution: when user ID is not available (anonymous users, cross-device), use device ID, IP, browser fingerprint, or cookie to probabilistically attribute events to experiments. Less reliable — introduces noise and potential bias.

Session-level attribution: if assignment is user-level but events are session-level, maintain a session-to-user mapping. Re-attribution needed if user ID is resolved mid-session.

### Data Quality

#### Event Quality Monitoring
Completeness: what percentage of expected events are captured? Compare tracked events against independent logs (server logs, payment records, email delivery logs). Target: >99% capture rate.

Accuracy: do event properties match reality? Spot-check against source systems. Validate critical properties (revenue, plan type, conversion events) against authoritative sources.

Timeliness: how quickly do events arrive in the data warehouse? Monitor event ingestion latency. Set SLAs: 95% within 1 minute for real-time processing, 99.9% within 1 hour for batch.

Deduplication: how many duplicate events exist? Implement idempotent event processing with unique event IDs. Target: <0.1% duplicate rate.

#### Assignment Integrity
Stable assignment: users must stay in the same variant for the entire experiment. Check assignment mismatch rate (user assigned to different variant at different times). Investigate any non-zero mismatch rate.

No cross-contamination: control users should not be exposed to treatment and vice versa. Check variant exposure consistency (do control users ever see treatment experience?). Investigate any cross-contamination.

Complete attribution: every event must be attributable to an experiment and variant. Track unattributable event rate. Target: <1% unattributed events.

## Experimentation Platform Selection

### Build vs. Buy Decision

#### Build
Best for: companies with >10M users, dedicated infrastructure team, complex or proprietary randomization needs, complete control over data and analysis.

Required capabilities: distributed systems engineering, data pipeline engineering, statistics and analytics. Team of 3-5 engineers minimum.

Pros: full control over assignment logic, data model, and analysis. Deep integration with existing infrastructure. No vendor dependency. Can build exactly what is needed.

Cons: high upfront investment (6-12 months to build viable platform). Ongoing maintenance cost. Must build statistical engine from scratch. Risk of building incorrect statistical methods.

#### Buy (SaaS Platform)
Best for: companies with <10M users, lean infrastructure team, standard experimentation needs, no complex integration requirements.

Platforms: Optimizely, Google Optimize, VWO, LaunchDarkly, Statsig, Eppo, Split.

Pros: fast time-to-value (weeks to launch first experiment). Built-in statistical engine. Professional support and documentation. Feature management alongside experimentation. Lower upfront investment.

Cons: less control over assignment logic and data model. Vendor dependency. May not integrate with all data sources. Cost scales with traffic. Custom analysis may require data export.

#### Hybrid (Custom + Statistical Package)
Common approach: build custom assignment and data pipeline. Use open-source statistical packages (or internal statistical team) for analysis.

Pros: control over infrastructure where it matters (assignment, data quality). Flexibility in analysis. Can use best-of-breed statistical libraries. No vendor dependency for core infrastructure.

Cons: requires maintaining custom infrastructure. Must ensure statistical packages are used correctly. Integration between custom infrastructure and analysis tools needs ongoing maintenance.

### Key Platform Evaluation Criteria

#### Randomization Capabilities
- Supported randomization units: user, session, event, device, account, geographic
- Stratified and multi-level randomization
- Consistent assignment across devices (if user is authenticated)
- Assignment stability verification (AA test)

#### Metric Support
- Proportion metrics (conversion rate, CTR)
- Mean metrics (AOV, revenue, time)
- Ratio metrics (revenue per user, time per session)
- Count metrics (orders per user, sessions per week)
- Retention and survival metrics
- Custom metric definition without engineering involvement

#### Statistical Methods
- Frequentist hypothesis testing (z-test, t-test, chi-squared)
- Bayesian analysis with posterior distributions
- Sequential testing with alpha spending
- Multiple comparison correction (Bonferroni, FDR)
- Variance reduction (CUPED, stratification)
- Sample size and power calculator

#### Data Integration
- Event data: SDKs (web, mobile, server), API ingestion, batch import
- User attributes: API, batch import, identity resolution
- Data warehouse integration: Snowflake, BigQuery, Redshift, Databricks
- Export capabilities: raw data export, API access, webhooks

#### Operational Features
- Experiment management console: create, edit, monitor experiments
- Results dashboard: real-time and final results, segment analysis, metrics exploration
- Alerting: guardrail violations, SRM, data quality issues
- Role-based access control: read, write, administer per experiment
- Audit log: who did what, when

## Operational Workflows

### Experiment Lifecycle

#### Ideation
Collect experiment ideas from: user research insights, analytics data (high drop-off, low engagement), customer support themes, competitive analysis, product roadmap initiatives, team brainstorming.

Maintain a backlog of experiment ideas with: hypothesis, expected impact, effort estimate, confidence level. Prioritize using Impact × Confidence / Effort scoring.

#### Design
Design experiment using template: hypothesis, variants, primary metric, secondary metrics, guardrails, sample size, duration, target segment, randomization unit, stopping rules.

Review design with: product manager, data scientist, engineer, designer (relevant stakeholders). Approve before implementation.

#### Implementation
Engineer implements treatment variant(s). Instrument tracking for all metrics. Run QA on treatment implementation: does it render correctly? Are events firing? Is assignment working? Test edge cases: new users, returning users, users in multiple experiments.

Run a mini-experiment (small sample) to verify: assignment works, events fire, metrics look reasonable, no obvious bugs.

#### Launch
Set up experiment in platform: variants, allocation, target population, metrics, duration. Run AA test to validate infrastructure. If AA test passes, launch treatment variant at full allocation.

Communicate experiment launch to stakeholders: what is being tested, expected duration, what to watch for, when results will be available.

#### Monitoring
Monitor daily: guardrail metrics (alert if degraded), data quality (event completeness, SRM), sample size progression, unexpected behavior (support tickets, user complaints).

Do not peek at primary metric! If you must peek, use sequential testing boundaries. If you peek outside sequential boundaries, document the peek and its impact on error rates.

#### Analysis
At pre-specified end time: run pre-registered analysis. Check assumptions. Compute results. Run sensitivity analyses. Document findings regardless of outcome.

Share results in a consistent format: hypothesis, design, primary result, secondary results, segment findings, decision, learnings.

#### Implementation
If implement: plan rollout (gradual, canary, or full). Monitor implementation for regression. Document expected impact and compare to actual.

If roll back: investigate root cause. Document what went wrong. Consider whether to re-test with modified design.

If iterate: refine treatment based on learnings. Adjust hypothesis. Re-run with modifications.

#### Documentation
Document every experiment in a shared, searchable repository. Standard template: hypothesis, design, results, decision, learnings, analysis code.

Run retrospective quarterly: what experiments have taught us, what patterns have emerged, what we would do differently.

### Experiment Governance

#### Experiment Review Board
For organizations running many concurrent experiments, establish an experiment review board. Responsibilities: review experiment designs for statistical validity, ensure experiments do not conflict or overlap, maintain experiment catalog, resolve disputes over experiment results. Meet weekly to review launched, running, and completed experiments.

Members: product lead, data science lead, engineering lead, design lead.

#### Experiment Overlap Management
Concurrent experiments can interact. A user in Experiment A's treatment can also be in Experiment B's treatment. Interaction effects can bias results.

Strategies:
- Mutual exclusion: users in Experiment A are excluded from Experiment B. Simplest but limits experiment throughput.
- Layer-based allocation: assign users to experiment layers. Each layer has independent randomization. Within a layer, experiments are mutually exclusive; across layers, experiments are independent.
- Interaction detection flagging: allow overlap but flag experiments that may interact. Analyze interaction effects if both experiments change related functionality.

#### Holdout Groups
A holdout group is a set of users permanently excluded from all treatment variants. Used for measuring the cumulative impact of experimentation over time.

Implementation: reserve 5-10% of users as permanent control. Compare their long-term metrics (retention, LTV, engagement) to users who have been exposed to winning treatments over time.

Holdout groups answer: does our experimentation program actually improve long-term metrics? Without holdouts, you see only the incremental gain per experiment, not the cumulative effect.

### Experimentation at Scale

#### Managing Many Concurrent Experiments
For organizations running 20+ concurrent experiments:

- Layer system: organize experiments by product area (signup, pricing, engagement, retention). Each area has its own experiment layer with independent randomization.
- Traffic budgeting: allocate traffic per experiment based on priority. High-priority experiments get larger samples and shorter durations. Low-priority experiments get smaller samples and longer durations or are shared across teams.
- Experiment calendar: schedule experiments to avoid conflicts. Marketing campaigns, product launches, and holidays affect user behavior and should not overlap with experiments unless that is part of the design.
- Automated conflict detection: flag overlapping experiments that modify the same component or metric.

#### Multi-variant Experiments
When testing multiple treatment variants against a single control:

Allocation: use a single control group shared across all treatments. Control size should be proportional to 1/√k where k is the number of treatments, to optimize statistical power across all comparisons.

Analysis: Dunnett's test for multiple-treatment-to-control comparisons. Each treatment is compared to the shared control. Treatments are not compared to each other unless that is of specific interest.

Sequential: test promising variants in sequence rather than all at once. Small initial experiment to identify top 2-3 candidates. Larger follow-up experiment on selected variants with full sample size.

#### Network Effects
Experiments that affect how users interact with each other violate the independence assumption. Social products, marketplaces, and collaboration tools are most affected.

Detection: AA test failing on network-sensitive metrics, treatment effect spilling into control group (control users behave differently than pre-experiment), variance inflation.

Solutions:
- Cluster randomization: randomize at the network cluster level (school, company, geographic region) instead of individual user level.
- Ego network randomization: randomize a user and their immediate network neighbors together.
- Time-based randomization: randomize time periods rather than users (switch between control and treatment weekly).
- Difference-in-differences: compare treatment clusters to control clusters over time, controlling for time trends.

## Organizational Experimentation Maturity

### Maturity Model

#### Level 1 — Ad Hoc
Experiments are rare and informal. No standard process. No dedicated platform. Results are not consistently documented. Decisions are made based on intuition or authority. Individuals run experiments independently without coordination.

Characteristics: 0-5 experiments per quarter. Excel-based analysis. No AA testing. No experiment review. Results are not shared. No learning repository.

#### Level 2 — Defined
Standard experiment process is documented and followed. Basic platform (custom or SaaS) is in place. Metrics are pre-defined. Results are consistently documented. Training is available for experiment design and analysis.

Characteristics: 5-20 experiments per quarter. Simple statistical analysis (proportion z-tests). Basic platform with no advanced features. AA tests for major experiments. Experiment review for high-impact tests. Basic experiment repository.

#### Level 3 — Managed
Experimentation is embedded in product development process. Advanced statistical methods are used (sequential testing, CUPED, Bayesian). Dedicated experimentation platform with automation. Segment analysis is standard. Experiment results influence roadmap decisions.

Characteristics: 20-100 experiments per quarter. Sequential testing on all experiments. CUPED on high-traffic experiments. Automated guardrail monitoring. Regular AA test validation. Quarterly experiment retrospective.

#### Level 4 — Optimized
Experimentation culture is organization-wide. Predictive models prioritize experiments. Real-time personalization adapts based on experiment results. Holdout groups measure cumulative impact. Automated experiment design and launch for low-risk changes.

Characteristics: 100-500+ experiments per quarter. Full statistical platform with Bayesian methods. Automated experiment design suggestions. Holdout groups always active. Cross-team experimentation coordination. Experiment results feed product strategy decisions.

### Building Experimentation Culture

#### Executive Support
Experimentation requires executive sponsorship. Leaders must: protect experimentation from interference (no stopping experiments for convenience), celebrate learning from failed experiments, allocate resources for infrastructure and training, make decisions based on experiment results, not authority.

#### Team Training
All team members involved in product decisions should understand: what A/B testing is and why it matters, how to form testable hypotheses, how to interpret experiment results, the dangers of peeking and multiple comparisons, the difference between statistical and practical significance.

Training formats: workshops, online courses (Google, Udacity, Coursera), internal brown bags, experiment reading groups, statistical office hours with data scientists.

#### Incentives
Align incentives with experimentation. Reward: running well-designed experiments regardless of outcome, learning and sharing results, implementing winning treatments, contributing to experimentation infrastructure, rejecting changes that fail experiments.

Avoid: rewarding only positive results (encourages p-hacking), penalizing inconclusive experiments (discourages risky but valuable tests), making decisions based on hierarchy rather than data.

#### Communication
Share experiment results transparently across the organization. Include: what we tested, what we found, what we decided, what we learned. Highlight failed experiments as learning opportunities. Celebrate well-designed experiments, not just winning ones.

Create a weekly or monthly experiment newsletter. Maintain a searchable experiment repository. Present experiment results at all-hands meetings. Encourage cross-team discussion about experiment findings.

## Tools and Technologies

### Experimentation Platforms

#### Enterprise Platforms
Optimizely: full-featured experimentation platform. Web, mobile, server-side. Feature flags, personalization. Strong statistical engine with sequential testing. Enterprise pricing.

LaunchDarkly: primarily feature management with experimentation capabilities. Strong flagging infrastructure. Good for server-side and infrastructure experiments. Statistical engine is less advanced than dedicated platforms.

Statsig: modern experimentation platform. Built for data-rich product teams. Native integration with data warehouses. Strong statistical engine with Bayesian and frequentist methods. Self-serve pricing.

Eppo: experimentation platform focused on statistical rigor. Built for enterprise scale. Support for CUPED, sequential testing, multiple comparisons. Strong SQL-based metric definition.

#### Mid-Market Platforms
VWO: web experimentation with visual editor. A/B, multivariate, split URL testing. Built-in heatmaps and session recordings. Mid-market pricing. Less suitable for mobile and server-side experiments.

Google Optimize: integrated with Google Analytics. Free tier available. A/B, multivariate, redirect tests. Limited statistical features (no sequential testing, no CUPED). Good for small teams getting started.

Split: feature management and experimentation. SDK-based implementation. Server-side focus. Good for engineering teams. Statistical engine is basic.

### Statistical Libraries

#### Python
scipy.stats: basic statistical tests (t-test, z-test, chi-squared, Mann-Whitney). Not designed for A/B testing specifically but foundational.

statsmodels: more comprehensive. GLM, mixed models, power analysis, multiple comparison correction. Good for custom experiment analysis.

Pyro/NumPyro: probabilistic programming for Bayesian analysis. MCMC and variational inference. Advanced Bayesian A/B testing.

#### R
base R: t.test, prop.test, chisq.test. Basic experiment analysis.

experimentd (R): designed specifically for A/B testing analysis. ATT (average treatment effect on treated) estimation, randomization inference.

bayesAB: Bayesian A/B testing with conjugate priors. Posterior distributions, probability of superiority, expected loss.

#### JavaScript
mathjs: basic math library. Not designed for A/B testing. Useful for lightweight implementations.

simple-statistics: JavaScript statistics library. T-test, chi-squared, regression. Works in browser and Node.js.

### Data Infrastructure

#### Event Collection
Segment: customer data infrastructure. Collect events from web, mobile, server. Route to multiple destinations (analytics platforms, data warehouses, experimentation platforms). Single integration point for event data.

RudderStack: open-source alternative to Segment. Self-hosted or cloud. Warehouse-first architecture. Good for organizations that want to own their data pipeline.

mParticle: customer data platform with event collection, identity resolution, and audience management. Strong mobile SDK support.

#### Data Warehouses
Snowflake: cloud data warehouse. Strong SQL support, separation of storage and compute, data sharing, support for semi-structured data (JSON, Avro, Parquet).

BigQuery: Google Cloud data warehouse. Serverless, automatic scaling, real-time streaming ingestion, integration with Google ecosystem (GA4, Ads).

Redshift: AWS data warehouse. Columnar storage, fast query on large datasets, integration with AWS ecosystem (Kinesis, S3, EMR).

#### Stream Processing
Apache Kafka: distributed event streaming platform. High throughput, fault-tolerant, durable. Core infrastructure for real-time event pipelines.

Amazon Kinesis: managed streaming data service. Real-time data ingestion and processing. Integration with AWS Lambda, S3, Redshift.

Apache Flink: stream processing framework. Real-time event processing, complex event processing, stateful computations. Suitable for real-time experiment monitoring and personalization.

### Monitoring and Alerting

#### Experiment Monitoring
Custom dashboards: built in BI tools (Tableau, Looker, Metabase) or custom web apps. Show: sample size progression, guardrail metrics, data quality metrics, SRM checks, experiment calendar.

Platform dashboards: built-in monitoring in experimentation platforms (Optimizely, Statsig, Eppo). Standardized metrics and visualizations. Less customizable.

Automated alerts: email, Slack, PagerDuty for: guardrail metric degradation, SRM detection, data quality issues (event drop, missing data), experiment duration exceeded, unexplained metric movements not related to experiments.

## Security and Privacy

### Data Governance
Experiment data contains potentially sensitive user information. Implement appropriate data governance:

Access control: role-based access to experiment results. Some roles can view results, some can configure experiments, some can access raw data. Document who has access to what.

Data retention: define how long raw event data, experiment assignments, and analysis results are retained. Purge PII according to privacy policy. Anonymize data in less-restricted environments.

Compliance: experiment data must comply with GDPR, CCPA, and other applicable regulations. User consent for data collection and experimentation. Right to access, rectify, and delete experiment data. Opt-out mechanisms for users who do not want to be in experiments.

### Experimentation Ethics
Informed consent: users should be aware that they may be part of experiments. Privacy policy should disclose experimentation practices. Some jurisdictions require explicit opt-in for certain types of experiments.

Do no harm: experiments should not cause harm to users. Monitor guardrail metrics for degradation. Stop experiments that negatively impact user experience. Avoid experiments that manipulate user emotions or exploit psychological vulnerabilities.

Transparency: publish experimentation practices and principles. Share experiment results with users where appropriate. Be transparent about experimentation culture.

## Key Points
- Build or buy an experimentation platform based on company size, infrastructure team, and experimentation complexity.
- Assignment must be deterministic, consistent, and validated through AA tests.
- Event tracking pipeline must be reliable, complete, and correctly attribute events to experiments.
- Data quality monitoring is essential — garbage in, garbage out for experiment results.
- Establish experiment lifecycle from ideation through documentation with clear governance.
- Use holdout groups to measure cumulative experimentation impact on long-term metrics.
- Organizational maturity progresses from ad hoc to optimized experimentation culture.
- Invest in team training and align incentives with experimentation best practices.
- Choose tools based on experimentation maturity level and specific infrastructure needs.
- Privacy and ethics must be core considerations in experimentation program design.
