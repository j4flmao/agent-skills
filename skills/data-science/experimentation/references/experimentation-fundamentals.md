# Experimentation Fundamentals

## Overview
Experimentation is the practice of running controlled tests to evaluate the causal impact of changes in products, policies, or treatments. The gold standard is the randomized controlled trial (A/B test), but organizations also deploy multi-armed bandits, switchback experiments, and quasi-experimental designs. This reference covers experiment design, metric development, statistical analysis, platform architecture, and operational best practices.

## Experiment Design Framework

### Hypothesis Development
Start with a clear, falsifiable hypothesis: "Changing X will cause Y to change by Z% in direction D." The null hypothesis (H₀) states no effect; the alternative (H₁) states the expected effect. Pre-register the hypothesis, primary metric, and analysis plan before launching. Use RICE (Reach, Impact, Confidence, Effort) or ICE (Impact, Confidence, Ease) to prioritize experiment ideas.

### Unit of Randomization
Individual user: most common, highest statistical power. Session: for UI/UX that resets per session (less power, cross-contamination risk). Cluster (group/household/region): for network effects or policy rollouts (largest required sample size). Device or browser: for cross-platform experiments. The unit of analysis must match or be nested within the unit of randomization.

### Randomization Methods
Simple randomization: each unit assigned coin-flip independent. Stratified randomization: block by key covariates (country, platform, segment) to reduce variance. Blocked randomization: randomize within blocks of similar units for balanced assignment. Adaptive randomization (MAB): dynamically allocate more traffic to better-performing variants. For limited sample sizes, use re-randomization (reject unbalanced assignments) with proper inference correction.

## Sample Size Planning

### Input Parameters
Baseline conversion rate (p₀): current metric value. Minimum detectable effect (MDE): smallest effect worth detecting (absolute or relative). Significance level (α): probability of false positive, typically 0.05. Statistical power (1-β): probability of detecting true effect, target ≥ 0.80. Ratio of control to treatment: standardized allocation (1:1 is most efficient; unequal allocation if cost differs).

### Sample Size Formulas
For comparing two proportions: n = (Z_(α/2) + Z_β)² × (p₁(1-p₁) + p₂(1-p₂)) / (p₁ - p₂)² where Z is the standard normal quantile. For continuous metrics: n = 2 × (Z_(α/2) + Z_β)² × σ² / δ² where σ² is variance and δ is the effect size. Use online calculators (Evan's Awesome A/B Tools) or libraries (statsmodels, pwr in R). Double sample size for one-tailed tests at same α.

### Variance Reduction
Pre-specified covariates (CUPED): regress outcome on pre-experiment values of the same metric. Stratification: post-stratify or block on correlated covariates. CUPAC: CUPED with additional relevant covariates beyond pre-period metric. Variance reduction of 20-50% is typical, directly reducing required sample size proportionally. Apply to primary metric before analysis — do not cherry-pick after seeing results.

## Metric Design

### Success Metrics
North star: the ultimate business metric (revenue, retention). Primary metric: directly measures the experiment hypothesis (click-through rate, purchase conversion). Secondary metrics: related success indicators. OEC (Overall Evaluation Criterion): weighted combination of metrics to prevent metric fixation. Choose metrics that are: sensitive, timely, reliable, and directional.

### Guardrail Metrics
Metrics that should NOT degrade even if primary metric improves: page load time, error rate, unsubscribes, support tickets, latency. Guardrail thresholds define acceptable boundaries. Experiment is negative if guardrail crosses threshold even if primary metric wins. Document organizational guardrails centrally.

### Metric Standardization
Define metrics once in a metric repository (SQL or Python). Consistent definitions across experiments enable comparability. Metadata per metric: owner, definition, SQL query, expected range, seasonality, guardrail assignment. Version control metric definitions via CI/CD.

## Statistical Analysis

### Frequentist Framework
Use two-sample t-test for continuous metrics, chi-square test for proportions. p-value: probability of observing the result (or more extreme) under H₀. Statistical significance ≠ practical significance. Always report confidence intervals: mean difference ± Z × SE. Prefer Cohen's d or lift % for effect size.

### Bayesian Framework
Beta-Binomial for proportions: prior Beta(a,b) + data (s, f) → posterior Beta(a+s, b+f). Normal-Normal for continuous outcomes. Posterior probability of direction (P(effect > 0)): direct probability interpretation. Bayes factor: BF₁₀ = P(data | H₁) / P(data | H₀). Use weakly informative priors (Beta(1,1) = uniform). Report posterior mean, credible interval, and probability of practical significance.

### Multiple Testing Correction
Family-wise error rate (FWER): Bonferroni (α/m), Holm-Bonferroni (step-up). False discovery rate (FDR): Benjamini-Hochberg (control expected proportion of false positives among rejected). Control FDR when testing many metrics per experiment. Pre-specify which corrections apply. Do not peek at results repeatedly without correction — sequential testing or group sequential designs (Pocock, O'Brien-Fleming boundaries).

### Heterogeneity Analysis
Pre-specified subgroups: region, platform, user segment. Test interaction effects via regression: Y = β₀ + β₁×T + β₂×Subgroup + β₃×T×Subgroup + ε. Post-hoc subgroup discovery: causal forest, Bayesian additive regression trees (BART). Caution: multiple comparison issues in subgroup analysis. Report all tested subgroups, not just significant ones.

## Experimentation Platform Architecture

### Assignment Service
Deterministic hash of user ID to variant. Sticky assignment: user stays in variant throughout session. Availability: 99.99% uptime, sub-millisecond latency. Features: hash consistency, gradual rollout (% of users), overlapping experiments (namespace MD5 hashes). Log assignment events to a data warehouse for analysis.

### Event Logging
Instrument all user interactions relevant to metrics. Server-side events: preferred (reliable, not blocked). Client-side events: supplement for UX interactions. Schemas: session ID, timestamp, experiment ID, variant, user ID, event type, event properties. Logging pipeline: producer → Kafka → Flink enrichment → S3 → warehouse. Schema registry enforces backward compatibility.

### Analysis Pipeline
ETL: join experiment assignments with metric events. CUPED adjustment: de-noise metrics using pre-period data. Statistical test: compute p-value, CI, and Bayesian posterior. Multiple testing correction. Alerting: stopping rules (futility, superiority, harm). Store results in experiment results database with API for reporting.

### Experiment Lifecycle
1. Propose: hypothesis, design, sample size estimation
2. Launch: traffic allocation, randomization verification (AA test)
3. Monitor: daily dashboard, guardrail alerts, sample ratio mismatch
4. Analyze: after power is reached, run pre-specified analysis
5. Decide: ship, iterate, or kill — base on primary metric and guardrails
6. Document: results, learnings, follow-up experiments

## Advanced Designs

### Multi-Armed Bandit
Thompson sampling: sample from Beta posterior for each arm, allocate to best sample. Epsilon-greedy: with prob ε explore, else exploit best arm. Softmax/Boltzmann: probability proportional to expected reward. Best for: rapid learning, minimizing regret, when sample size is fixed and traffic is needed elsewhere. Not for: designs requiring pre-specified power or precise inference after experiment.

### Switchback Experiments
Randomize time intervals instead of units. Control: odd hours, treatment: even hours. Analysis with block bootstrap or HAC standard errors (handle autocorrelation). Best for: marketplace platforms, infrastructure experiments, dynamic pricing — where unit-level randomization infeasible or where interference exists.

### Interleaved Experiment
Present both variants simultaneously to the same user (e.g., ranked search results). User sees interleaved results from A and B. Compare user interactions (clicks) on A vs B results. More sensitive (detects smaller effects) than standard A/B. Analysis via paired t-test per user. Best for: ranking, recommendation, search algorithm changes.

### Network Experiment
Treatment spills to control via social/economic interactions (e.g., Uber price increase may reduce supply on both treated and control areas). Solution: cluster-randomized designs — randomize at market/city level with cluster-robust standard errors. Design-based approaches: use saturation design where proportion treated varies by cluster.

## Sample Ratio Mismatch (SRM)

### Detection
Chi-square test on observed vs expected allocation ratio (typically 50:50). p < 0.05 indicates SRM. Daily monitoring dashboard should check SRM for every running experiment. Also check per platform, per country, per browser.

### Causes
- Implementation bug in assignment code
- Caching layer serving stale experiment config
- JavaScript blocking client-side randomization
- Bot traffic filtered inconsistently
- Timezone issues in daily rollups
- Ad blockers on browser-side events

### Response
A/B test with SRM is invalid — do not analyze primary metric. Triage: check assignment code, check logging pipeline, reproduce in staging. Remediate: fix root cause, re-launch experiment. Document SRM events for operational learning.

## Experiment Operations

### Experiment Velocity
Parallel experiments: namespace MD5 hash of user ID to partition traffic across experiments. Orthogonal layers: each layer maps to unique partition. Maximum experiments per user: typically 5-10 simultaneous. Experiment calendar: avoid overlapping experiments on same surface. Decide conflict resolution policy: last-writer-wins or explicit priority.

### AA Tests
Run test with both groups receiving the same variant. Null should be retained 95% of the time. Use AA tests to: validate randomization, verify metric lift is 0, establish variance estimate for sample size calculations. Regular AA tests (weekly) catch randomization failures and pipeline issues. If AA fails, investigate immediately.

### Experiment Governance
Review board: approve experiments based on risk, sensitivity, and infrastructure. Risk tiers: low (UI changes, internal tools), medium (algorithm changes, pricing), high (policy changes, data privacy). Approval workflow: self-serve for low, PR review for medium, VP-level for high. Ethical review for experiments affecting vulnerable populations.

## Statistical Pitfalls

### Peeking
Repeatedly checking results and stopping early upon significance inflates false positive rate. Valid choices: (1) fixed horizon — don't peek at all, (2) sequential testing — Pocock/Haybittle boundary, (3) always-valid p-values (mixture sequential). Use Experimentation dashboard that hides results until sample size is reached.

### Novelty Effect
Users temporarily behave differently with new feature. Solutions: (1) ramp traffic slowly over days/weeks, (2) extend experiment duration past novelty period, (3) run reversed experiment after novelty. Analyze per user-week: do later weeks show same effect?

### Survivorship Bias
Users who survive to the end of experiment differ from those who churned. Use inverse probability of censoring weights, or define metric as intent-to-treat (include all users assigned). For subscription experiments: death is failure, not missing data.

### Simpson's Paradox
Overall effect reverses direction in subgroups. Solution: pre-specify stratification variables, report both aggregate and stratified results. Use regression with interaction terms or inverse-variance weighting.

## Key Metrics Dashboard

| Metric | Definition | Target | Alert |
|---|---|---|---|
| SRM p-value | Chi-square test on allocation | > 0.05 | < 0.05 |
| AA failure rate | % of AA tests with p < 0.05 | < 5% | > 5% |
| Experiment count | Active + running | Varies by team | 0 for > 2 weeks |
| Decision rate | % of completed experiments with decision | > 80% | < 60% |
| Ship rate | % of completed experiments shipped | 20-40% | < 10% or > 50% |
| Average duration | Days from launch to decision | As designed | 3x planned |
| CUPED variance reduction | % variance reduced | > 20% | < 5% |

## Tooling

| Platform | Strengths | Weaknesses |
|---|---|---|
| Google Optimize | Free tier, easy GA integration | No CUPED, limited stats engine |
| Optimizely | Feature flags, full-stack SDKs | Cost, opaque variance model |
| LaunchDarkly | Best-in-class feature flags | Experimentation add-on, limited analysis |
| Eppo | Bayesian stats, metric repository | Newer platform, smaller community |
| Statsig | Free tier for small teams, SDKs | Proprietary, data egress limits |
| GrowthBook | Open-source, self-hostable | Fewer integrations than commercial |
| PlanOut (Meta) | Open-source, advanced design | No UI, no analysis built-in |

## Best Practices

- Pre-register hypothesis, primary metric, and analysis plan
- Calculate required sample size before launching
- Run AA tests monthly to validate randomization
- Check SRM daily during experiment
- Use CUPED or stratified design for variance reduction
- Never peek at results without sequential testing boundaries
- Report both statistical and practical significance
- Conduct power analysis for heterogeneity detection
- Automate experiment governance for velocity
- Build a metric repository with version-controlled SQL definitions