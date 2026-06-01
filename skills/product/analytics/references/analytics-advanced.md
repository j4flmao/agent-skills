# Analytics Advanced Topics

## Introduction
Advanced product analytics covers statistical methods, predictive modeling, experimentation analytics, data warehouse integration, and analytics operations at scale. These techniques move analytics from descriptive (what happened) to diagnostic (why it happened), predictive (what will happen), and prescriptive (what to do about it).

## Statistical Methods for Product Analytics

### Hypothesis Testing
Before drawing conclusions from metric changes, test statistical significance. Use two-tailed t-tests for comparing means between two groups (e.g., control vs treatment conversion rates). Use chi-square tests for categorical outcomes (e.g., plan distribution by acquisition channel). Set significance level α=0.05 as default, adjust for multiple comparisons using Bonferroni correction.

### Confidence Intervals
Report metric changes with confidence intervals, not just point estimates. "Conversion rate increased 2.3% (95% CI: 1.1%-3.5%)" is more useful than "Conversion rate increased 2.3%". Wider intervals indicate more uncertainty. Use bootstrapping for non-normal distributions. Require minimum 1000 users per variant for reliable interval estimation.

### Regression Analysis
Use linear regression for continuous outcomes (session duration, revenue). Use logistic regression for binary outcomes (conversion, retention). Control for confounding variables: acquisition channel, device type, seasonality. Report R² (variance explained), coefficient p-values, and effect sizes. Stepwise regression for variable selection when many potential predictors.

### Simpson's Paradox
Aggregate metrics can reverse direction when data is segmented. Example: feature increases conversion in every segment but decreases overall conversion because segments have different sizes. Prevention: always segment before aggregating. Check for confounding variables. Report both aggregate and segmented results.

## Experimentation Analytics

### Statistical Power Analysis
Before running an experiment, calculate required sample size. Power depends on: minimum detectable effect (MDE), significance level (α), statistical power (1-β), and baseline conversion rate. For a 10% relative MDE at 80% power with α=0.05, need ~1000 users per variant. Underpowered experiments are worse than no experiment — they produce unreliable results.

### Sequential Testing
Traditional A/B tests require fixed sample sizes. Sequential testing allows continuous monitoring with valid statistical inference. Use always-valid p-values or peeking-adjusted confidence intervals. Implement in experimentation platform for automatic sequential testing. This enables faster decisions without sacrificing statistical validity.

### Variance Reduction
Reduce experiment variance to detect smaller effects with fewer users. Use pre-post analysis (compare same users before and after treatment), CUPED (Controlled-experiment Using Pre-Experiment Data), or stratified sampling. Typical variance reduction: 30-50% for CUPED on well-correlated pre-experiment metrics. Implement in experiment analysis pipeline automatically.

## Predictive Analytics

### Churn Prediction
Build logistic regression or gradient boosting models to predict user churn. Features: engagement frequency, feature adoption count, session duration trend, support ticket volume, account age, plan tier. Train on historical data with churn label (user inactive for 30+ days). Evaluate with AUC-ROC (target >0.8). Deploy as weekly scoring job — flag top 10% at-risk users for intervention.

### LTV Prediction
Predict customer lifetime value using historical behavior data. Use Pareto/NBD or BG/NBD models for transactional products. Use regression models with features: early engagement, time to first value, feature adoption velocity. Validate by comparing predicted vs actual LTV for historical cohorts. LTV predictions enable CAC budgeting and tier-specific acquisition strategies.

### Feature Impact Modeling
Quantify how specific features impact retention and LTV. Use propensity score matching to control for selection bias (users who use a feature may differ from those who don't). Use difference-in-differences for before-after comparisons. Use instrumental variables when features are randomly assigned. Report causal impact with confidence intervals, not just correlations.

## Data Warehouse Integration

### Analytics Schema Design
Design a warehouse schema optimized for product analytics queries. Use star schema: fact tables (events) and dimension tables (users, sessions, products). Partition fact tables by date for query performance. Materialize commonly queried aggregations as summary tables. Document schema with column descriptions and example queries.

### Reverse ETL
Sync analytics insights back to operational tools via reverse ETL (RudderStack, Census, Hightouch). Push user segments to marketing tools (email lists), push feature flags based on behavior (activate feature for power users), push lead scores to CRM. Set sync cadence based on data freshness requirements: real-time for personalization, daily for segmentation.

### Event Streaming Architecture
For real-time analytics, use event streaming (Kafka, Kinesis) between application and analytics pipeline. Design stream processing: filter invalid events, enrich with user properties, route to multiple destinations (warehouse, real-time dashboard, ML models). Set retention on raw event streams: 7 days for streams, longer for archived data.

## Advanced Segmentation

### Dynamic Segmentation
Segment users in real-time based on current behavior, not static attributes. Define segment criteria as rules: "users who have performed action X within Y days and have not performed action Z." Update segment membership on every event. Use for: personalization triggers, intervention timing, feature flag targeting.

### Persona-Based Analysis
Map analytics segments to user personas. Track persona-specific metrics: task completion rate per persona, feature adoption per persona, churn rate per persona. Analyze experiments by persona segment — a feature that wins overall might lose for the primary persona. Report persona-specific results alongside aggregate results.

### Behavioral Cohort Discovery
Use unsupervised learning (k-means, hierarchical clustering) to discover behavioral segments from event data. Features: action frequency, feature breadth, session patterns, time-of-day preferences. Validate discovered segments against qualitative personas. Use segment profiles to guide personalization and feature prioritization.

## Attribution Modeling

### Last-Touch Attribution
Attributes 100% of conversion credit to the last touchpoint. Simple but biased toward late-stage channels. Use when the goal is optimizing conversion close (sales, checkout). Limitations: undervalues awareness and consideration channels.

### Multi-Touch Attribution
Distribute credit across multiple touchpoints. Linear: equal credit to all touches. Time-decay: more weight to recent touches. Position-based: 40% first, 40% last, 20% middle. Data-driven: ML model assigns credit based on incremental impact of each touchpoint. Use data-driven when sufficient data exists; use time-decay or position-based as simpler alternatives.

### Incrementality Testing
Measure the true causal impact of a channel or campaign. Use geo-based experiments (treat in some regions, control in others). Use holdout groups (randomly exclude a group from seeing the campaign). Measure the incremental lift in the target metric. Compare to attribution model estimates — attribution often overstates channel impact.

## Analytics Operations

### Data Quality Monitoring
Automated checks run daily: event volume within expected range (alert on >20% deviation), required properties populated (alert on >1% null rate), no duplicate events within 1-second window (alert on >0.01% rate), schema compliance (reject invalid property types). Track data quality SLA: 99.5% completeness, <60s delivery latency for 99% of events.

### Governance and Access Control
Define data access tiers: raw event data (data engineering only), aggregated metrics (analysts), curated dashboards (all stakeholders). Implement PII controls: never send PII as event properties, pseudonymize user IDs in analytics tools, set data retention limits per tool. Document data dictionary with ownership, update cadence, and access level per dataset.

### Analytics Maturity Assessment
| Level | Characteristics | Focus |
|-------|----------------|-------|
| 1: Vanity | Page views, downloads, no taxonomy | Awareness of data need |
| 2: Descriptive | Event tracking, basic funnels, dashboards | What happened |
| 3: Diagnostic | Segmentation, cohort analysis, retention | Why it happened |
| 4: Predictive | Forecasting, propensity models, LTV | What will happen |
| 5: Prescriptive | Automated experimentation, personalization | What to do about it |

## Key Points
- Statistical significance before actionability — use proper hypothesis testing
- Segment everything: aggregate metrics hide critical patterns (Simpson's paradox)
- Underpowered experiments are worse than no experiments
- CUPED and variance reduction techniques enable smaller experiments
- Predictive models (churn, LTV) require ongoing validation against outcomes
- Causal inference methods are necessary for feature impact analysis
- Warehouse schema design impacts query performance and analyst productivity
- Attribution models vary in accuracy — incrementality testing is the gold standard
- Data quality monitoring is a daily operational requirement, not a project
- Analytics maturity evolves from descriptive to prescriptive over time
- Reverse ETL bridges analytics insights to operational tools
- Event streaming enables real-time analytics at scale
- Behavioral cohort discovery augments qualitative persona research
- Dynamic segmentation enables real-time personalization triggers
- Analytics governance protects PII and maintains data trust
