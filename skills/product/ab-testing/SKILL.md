---
name: product-ab-testing
description: >
  Use this skill when designing and analyzing A/B tests: hypothesis formation, experiment design, statistical analysis, and decision framework.
  This skill enforces: hypothesis structure, sample size calculation, statistical significance, AA test validation.
  Do NOT use for: multivariate testing, bandit algorithms, personalization engines, survey analysis.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [product, ab-testing, phase-8]
---

# A/B Testing Agent

## Purpose
Designs and analyzes A/B tests with rigorous hypothesis formation, experiment design, statistical frameworks, and decision criteria.

## Agent Protocol

### Trigger
Exact user phrases: A/B test, split test, experiment, hypothesis testing, statistical significance, sample size, AA test, multivariate test, bandit, sequential testing.

### Input Context
- What is the business question being tested?
- What is the primary metric and its current baseline value?
- What is the minimum detectable effect (MDE) that matters for business?
- What is the expected traffic volume and how is it allocated?
- What segments should be analyzed (device, source, plan, region)?
- What guardrail metrics must be monitored?
- What is the expected experiment duration constraint?

### Output Artifact
Experiment design document with hypothesis, sample size calculation, statistical framework, analysis plan, and decision criteria.

### Response Format
```
## A/B Test Design
### Hypothesis
If {change} then {metric} will {direction} by {effect} because {rationale}

### Variants
Control: {current state}
Treatment: {change description}

### Statistical Framework
α = {0.05}, β = {0.20}, Power = {0.80}, MDE = {X%}
Sample Size: {N per variant}, Duration: {days}
Test Type: {two-tailed / one-tailed}
Correction: {Bonferroni / none}

### AA Test Validation
Result: {passed/failed} | p-value: {value} | Uniformity: {passed/failed}

### Results
Primary: {estimate} [{CI}] p={value} | {significant/not significant}
Guardrails: {all passed / any failed — detail}
Segments: {notable segment differences}

### Decision
{implement / roll back / iterate} | Confidence: {level}
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Hypothesis defined with If/Then/Because structure including effect size estimate
- [ ] Primary, secondary, and guardrail metrics selected and defined
- [ ] Sample size calculated with α=0.05, β=0.20, MDE, and expected traffic
- [ ] AA test completed and validated before treatment experiment
- [ ] Experiment launched with proper randomization and consistent assignment
- [ ] Results analyzed with statistical rigor including segment analysis
- [ ] Decision made with clear rationale and confidence level
- [ ] Learnings documented for future tests regardless of outcome
- [ ] Analysis code shared for reproducibility

### Max Response Length
7000 tokens

## Workflow

### Step 1: Hypothesis Formation
Structure hypothesis as If/Then/Because. If {change}, then {metric} will {direction} by {effect size}, because {mechanism}. Define null hypothesis H0 (no effect, μ_treatment = μ_control) and alternative hypothesis Ha (effect exists, μ_treatment ≠ μ_control or directional).

Identify primary metric — one decision metric that determines the experiment outcome. Must be measurable, reliable, and sensitive to the change. Define secondary metrics (additional metrics of interest for understanding mechanism) and guardrail metrics (must not degrade — overall CSAT, revenue, retention, support volume).

Ensure hypothesis is falsifiable: the experiment can prove it wrong. Ground the hypothesis in user research, data analysis, or established principles — not intuition alone. Document the rationale with supporting evidence.

### Step 2: Experiment Design
Define variants: control (current experience) and treatment(s) (proposed change). Limit the number of treatments to avoid sample size inflation and multiple comparison problems. For multiple treatments, apply Bonferroni correction or use a control-to-treatment allocation ratio that preserves power.

Choose randomization unit: user-level for UX changes where user experience must be consistent, session-level for funnel or flow changes where each visit is independent, event-level for algorithmic changes that affect individual page loads. The unit of randomization must match the unit of analysis.

Calculate required sample size: use α=0.05, β=0.20 (power=0.80), and MDE based on business impact and traffic constraints. Use online calculators or power analysis libraries. Account for multiple variants with corrections.

Set minimum experiment duration: at least one full business cycle (typically 7 days) to capture day-of-week effects. Avoid ending experiments on holidays or during unusual periods. Calculate duration as max(sample size / daily traffic, one business cycle).

Consider allocation ratios: 50/50 for most experiments, 90/10 for high-risk changes to limit exposure, 80/10/10 for two treatments with equal power.

### Step 3: Statistical Framework
Configure significance level α=0.05 (5% false positive risk). For high-stakes decisions (revenue, retention, safety), use α=0.01. For exploratory tests, α=0.10 may be acceptable.

Set statistical power β=0.20 (80% chance to detect the specified MDE if it exists). Higher power (90%) for critical experiments where missing a real effect is costly.

Determine MDE based on business impact: what effect size would make implementation worthwhile? Smaller MDE requires larger sample sizes. Balance statistical requirements with traffic and time constraints.

Use two-tailed test by default (tests for both positive and negative effects). One-tailed test only when there is strong prior evidence that the effect can only go in one direction and the opposite direction is not actionable.

Apply sequential testing (group sequential design) for continuous monitoring with pre-specified interim analysis points. Use alpha spending functions to maintain overall error rate. Do not use traditional p-value monitoring without correction.

### Step 4: AA Test Validation
Run AA test before any treatment experiment. Split traffic equally between two identical variants (both receive control experience). Verify no statistically significant difference between the two groups.

Check that p-value distribution is uniform across many AA tests: run repeated AA tests and verify that p-values follow a uniform distribution (5% should be below 0.05). Confirm the experimentation system is not biased — consistent assignment, no data leakage, proper randomization.

Document AA test results: p-value, effect size, confidence interval, any metrics with significant differences. If AA test fails, investigate the root cause: randomization bug, data pipeline issue, sample ratio mismatch, instrumentation error. Fix before proceeding.

### Step 5: Launch and Analysis
Randomize users with consistent assignment (user ID hashing, cookie-based assignment, or deterministic function). Ensure assignment is stable — user stays in same variant for the experiment duration.

Monitor guardrail metrics daily. Automated alerts for significant negative impact on guardrails. Do not stop experiment early based on primary metric peeking — only stop early for guardrail violations or futility (pre-specified stopping rules).

Run analysis at predetermined end time. Do not extend the experiment after peeking at results. If results are inconclusive, plan a follow-up experiment with larger sample size or different design.

Check assumptions: normality (use CLT for large samples, non-parametric tests for small), equal variance (use Welch's t-test if violated), independence (account for user clustering, repeated measures), no sample ratio mismatch (check expected vs. observed sample sizes per variant).

Calculate p-value (probability of observing data as extreme as seen, assuming H0 is true). Calculate confidence interval (range of plausible effect sizes consistent with data). Report both.

Segment results by device, source, plan, region, and other pre-specified segments. Apply correction for multiple segment comparisons. Interpret segment results cautiously — smaller sample sizes per segment reduce power and increase false positive risk.

### Step 6: Decision Framework
Implement if p<α and effect size exceeds MDE, and no guardrail metric degraded. Confidence is high when results are statistically significant at p<0.01, practically significant (effect > 2x MDE), consistent across segments, and robust to sensitivity analysis.

Roll back if any guardrail metric shows statistically significant degradation. Even if primary metric improves, guardrail violations may cause net negative impact. Investigate root cause before re-testing.

Iterate if results are inconclusive: p>α but direction is promising (effect in expected direction but not significant). Consider extending the experiment (only if pre-specified), increasing sample size, or refining the treatment.

Consider secondary metrics and segment analysis in decision. A negative effect on a secondary metric may offset primary metric improvement. A positive effect concentrated in one segment may inform targeted rollout.

Document learnings: hypothesis, design, results, decision, and what was learned about user behavior. Share with the team. Include analysis code for reproducibility.

## Rules
- Never peek at results before predetermined sample size and duration are reached.
- AA test must pass before any treatment experiment is launched.
- Primary metric must be defined and frozen before experiment launch — no switching after.
- Guardrail metrics must be monitored daily to detect and prevent negative impact.
- Multiple treatments (3+) require Bonferroni correction or false discovery rate control.
- Experiment duration must cover at least one full business cycle (minimum 7 days).
- Segment analysis requires sufficient per-segment power — underpowered segments are exploratory only.
- Results must be reproducible with shared analysis code and documented parameters.
- Do not stop experiments early based on primary metric peeking — use pre-specified stopping rules.
- Sample ratio mismatch must be investigated before interpreting results.
- The unit of randomization must match the unit of analysis to avoid pseudoreplication.
- Any guardrail metric degradation must be reported regardless of primary metric result.

## Framework / Methodologies

### Frequentist Hypothesis Testing Framework
Standard approach for A/B testing. Null hypothesis significance testing (NHST) with p-values and confidence intervals. Pros: widely understood, computationally simple, well-established conventions. Cons: p-values are easily misinterpreted, no direct statement about probability of hypotheses being true, problematic with continuous monitoring.

Key elements: pre-specified α and β, MDE-based sample size calculation, two-tailed tests by default, p-value threshold for significance, confidence intervals for effect size estimates. Report both statistical significance and practical significance.

### Bayesian A/B Testing Framework
Alternative approach that estimates the probability distribution of the effect size. Produces directly interpretable statements: "There is a 95% probability that the treatment improves conversion by 2-5%."

Key elements: prior distribution (informative or uninformative), likelihood function (based on observed data), posterior distribution (updated belief), credible intervals (Bayesian analog of confidence intervals), probability of superiority (Pr(treatment > control)), expected loss.

Pros: interpretable results, natural handling of sequential monitoring, incorporates prior information, no p-value misinterpretation. Cons: requires specifying prior (subjective), computationally more intensive, less widely understood in organizations.

### Sequential Testing (Group Sequential Design)
Multiple interim analyses with pre-specified stopping rules that maintain overall error rate. Use alpha spending functions (Pocock, O'Brien-Fleming, Haybittle-Peto) to distribute α across analyses.

Stopping rules: early stop for superiority (treatment clearly better), early stop for futility (treatment clearly not better), early stop for harm (guardrail violation). Pre-specify all stopping rules before experiment launch.

### Multiple Comparisons Frameworks
Bonferroni correction: divide α by number of comparisons. Simplest and most conservative. Use for 2-5 comparisons where false positives are costly.

Benjamini-Hochberg (FDR control): control false discovery rate rather than familywise error rate. Less conservative. Use for many comparisons where some false positives are acceptable. Common for segment analysis.

Closed testing procedure: hierarchical testing where overall null must be rejected before testing sub-hypotheses. Powerful for multiple treatment vs. control comparisons.

### A/A Test Methodology
Split traffic between two identical variants. Verify no statistically significant difference. Key validation of experiment infrastructure. Run before first experiment on a platform, after significant infrastructure changes, and quarterly for ongoing validation.

Expected behavior: p-values follow uniform distribution. Effect sizes are centered at zero with variance proportional to sample size. Sample ratio is approximately 50/50 (or the specified ratio). Any deviation indicates infrastructure issues.

## Common Pitfalls

### Peeking at Results
Checking p-values repeatedly during the experiment and stopping when significance is reached. Dramatically inflates false positive rate. A p-value of 0.05 means 5% false positive rate at a single look. With daily peeking, the effective false positive rate can reach 30-50%. Mitigation: pre-specify experiment duration. Use sequential testing if interim looks are needed. Never stop an experiment early based on primary metric results.

### Sample Ratio Mismatch (SRM)
Observed sample sizes in variants deviate significantly from expected ratios. Indicates randomization failure, data pipeline issues, or assignment bugs. SRM invalidates experiment results because the groups may not be comparable. Mitigation: check SRM before analyzing results. Use chi-squared test for expected vs. observed ratios. Investigate and fix root cause before proceeding.

### Multiple Comparison Without Correction
Running many analyses (multiple metrics, multiple segments, multiple looks) without adjusting significance thresholds. Inflates false positive rate — with 20 independent metrics, at least one will show p<0.05 by chance. Mitigation: designate a single primary metric. Apply correction for secondary and segment analyses. Pre-specify all analyses before launch.

### Novelty Effect
Users respond positively to a change simply because it is new. Effect diminishes over time as novelty wears off. Can lead to implementing changes that have no long-term benefit. Mitigation: run experiments long enough for novelty to wear off (minimum 2 weeks for significant UX changes). Compare early-period vs. late-period effect. Use holdout groups for long-term measurement.

### Primacy Effect
Existing users prefer the familiar experience and react negatively to change even if the new experience is objectively better. New users who have no baseline show the true treatment effect. Mitigation: segment results by new vs. existing users. Run experiments long enough for existing users to adapt. Consider gradual rollouts for existing users.

### Selecting Population After the Fact
Analyzing results and then deciding which segments "count" based on the results. Data dredging. Invalidates statistical inference. Mitigation: pre-specify all segments and inclusion/exclusion criteria before experiment launch.

### Ignoring Practical Significance
Implementing changes that are statistically significant but practically meaningless. A 0.1% conversion improvement may be statistically significant with large sample sizes but not worth implementation cost. Mitigation: set MDE before the experiment based on business impact. Do not implement effects smaller than MDE regardless of p-value.

### Simpson's Paradox
Aggregate results show one direction but segment results show the opposite. Caused by uneven segment distribution across variants. Mitigation: check segment balance across variants. Pre-specify stratification variables. Analyze results with and without stratification.

## Best Practices

### Hypothesis Formation
- Ground hypotheses in user research, behavioral data, or established UX principles — not intuition.
- Use the If/Then/Because structure for clarity and testability.
- Include a specific effect size estimate: "increase conversion by 5%" not "improve conversion."
- Document the rationale with supporting evidence (user research quotes, analytics data, case studies).
- Formulate both null and alternative hypotheses explicitly.
- Run competing hypotheses when possible to test mechanisms, not just changes.

### Experiment Design
- Limit variants to 2-3 per experiment to maintain statistical power and operational simplicity.
- Choose the right randomization unit for the change type: user-level for UX, session-level for flows.
- Calculate sample size with realistic assumptions — use historical data for baseline conversion and variance.
- Set experiment duration at least 7 days regardless of sample size requirements.
- Pre-specify all stopping rules, segment analyses, and decision criteria.
- Document the experiment design in a shared template before launch.
- Run AA tests before the first experiment on any new platform or metric.

### Statistical Rigor
- Pre-register the experiment: hypothesis, metrics, sample size, duration, analysis plan.
- Use sequential testing with alpha spending for continuous monitoring.
- Check assumptions (normality, equal variance, independence, SRM) before interpreting results.
- Report confidence intervals alongside p-values for effect size interpretation.
- Apply corrections for multiple comparisons in segment and secondary metric analysis.
- Use robust standard errors for non-independent observations.
- Share analysis code for reproducibility — results should be independently verifiable.

### Operational Discipline
- Never peek at results before the pre-specified end time.
- Do not extend experiments after peeking — plan extensions pre-specifically or declare inconclusive.
- Document every experiment regardless of outcome in a shared repository.
- Run an experimentation review: what did we learn, what would we do differently?
- Maintain an experiment log with hypothesis, design, results, and learnings.
- Conduct regular A/A tests to validate experimentation infrastructure.
- Train team members on statistical concepts and experiment best practices.

## Templates & Tools

### Hypothesis Template
```
Hypothesis: If we {change} for {target segment} at {location}, then {primary metric} will {increase/decrease} by {effect size} because {rationale}.

H0: μ_treatment = μ_control (no effect)
Ha: μ_treatment ≠ μ_control (two-tailed)

Supporting Evidence: {user research, analytics data, case studies}
```

### Experiment Design Document
```
## Experiment: {Name}
### Hypothesis
{hypothesis statement}

### Variants
Control: {description}
Treatment: {description}

### Metrics
Primary: {metric} — {definition and measurement details}
Secondary: {metrics} — {definitions}
Guardrails: {metrics} — {definitions}

### Design
Randomization Unit: {user / session / event}
Allocation: {ratio per variant}
Target Population: {inclusion and exclusion criteria}
Segments: {pre-specified segment analyses}

### Statistical Parameters
α = {value}
β = {value}
Power = {value}
MDE = {value} ({absolute or relative})
Expected Baseline = {value}
Expected Variance = {value}
Minimum Sample Size = {N per variant}
Expected Duration = {days}

### Stopping Rules
Early stop for superiority: {rule}
Early stop for futility: {rule}
Early stop for harm: {rule}

### Risks
{risks and mitigations}
```

### Sample Size Calculator Configuration
```
Parameters:
- Baseline conversion rate: {p}
- Minimum detectable effect: {MDE absolute or relative}
- Significance level (α): {0.05}
- Statistical power (1-β): {0.80}
- Test type: {two-tailed}
- Number of variants: {k}

Output:
- Sample size per variant: {n}
- Total sample size: {N = n × k}
- Minimum duration: {N / daily traffic} days
- With 1 business cycle minimum: {max(N/daily traffic, 7)} days
```

### AA Test Validation Template
```
## AA Test Report
### Configuration
Start date: {date}
End date: {date}
Sample size per variant: {n}
Metrics tested: {list}

### Results
| Metric | Control Mean | Variant Mean | Difference | CI | p-value |
|--------|-------------|-------------|------------|-----|---------|
| {m1}   | {v1}        | {v2}        | {d}        | {ci}| {p}     |
| {m2}   | {v1}        | {v2}        | {d}        | {ci}| {p}     |

SRM check: χ² = {value}, p = {value} — {passed/failed}
P-value distribution check: {uniform/non-uniform}

### Verdict
{passed / failed — investigation needed}
```

### Results Analysis Template
```
## Experiment Results
### Overview
Experiment: {name}
Duration: {start} to {end}
Sample size: {control N} / {treatment N}

### Primary Metric
Result: {estimate} [{CI}] p = {value}
Significance: {p < α / p > α}
Practical significance: {effect > MDE / effect < MDE}

### Secondary Metrics
| Metric | Estimate | CI | p-value | Significant? |
|--------|---------|-----|---------|-------------|
| {m1}   | {e}     | {ci}| {p}     | {yes/no}    |

### Guardrail Metrics
| Metric | Estimate | CI | p-value | Degraded? |
|--------|---------|-----|---------|----------|
| {m1}   | {e}     | {ci}| {p}     | {yes/no} |

### Segment Analysis
| Segment | Control | Treatment | Diff | CI | p-value |
|---------|---------|----------|------|-----|---------|
| {s1}    | {v1}    | {v2}     | {d}  | {ci}| {p}     |

### Decision
{implement / roll back / iterate}
Rationale: {reasoning}
```

### Experiment Learning Log Entry
```
Date: {date}
Experiment: {name}
Hypothesis: {hypothesis}
Result: {implemented / rolled back / inconclusive}
What we learned: {key insights about user behavior}
What surprised us: {unexpected findings}
What we would do differently: {improvements for next experiment}
Next steps: {follow-up experiments, implementation plan}
```

## Case Studies

### SaaS Pricing Page Test
A B2B SaaS company tested monthly vs. annual pricing emphasis on their pricing page. Hypothesis: emphasizing annual pricing (featuring annual first, showing savings) would increase annual subscription rate without reducing overall conversion.

Design: Control — monthly and annual presented equally. Treatment — annual plan featured first with savings callout, monthly below fold. Primary metric: annual subscription rate. Secondary: overall conversion rate, average revenue per conversion. Guardrails: page conversion rate, bounce rate.

Result: annual subscription rate increased 34% (p<0.001). Overall conversion rate unchanged (p=0.32). Average revenue per conversion increased 22%. Guardrails all passed. Decision: implement. Additional revenue: $1.4M annually.

Key learning: users respond to anchoring — presenting the higher-value option first shifts preference. No negative impact on overall conversion suggests annual is not perceived as worse, just needs visibility.

### Mobile Checkout Flow Redesign
E-commerce app tested single-page vs. multi-step mobile checkout. Hypothesis: single-page checkout reduces friction on mobile and increases completion rate by reducing page loads and visual breaks.

Design: Control — current 3-step checkout (cart → shipping → payment → review). Treatment — single-page checkout with accordion sections. Primary metric: checkout completion rate. Secondary: time to complete, error rate. Guardrails: average order value, return rate.

Result: single-page increased completion rate 18% (p=0.003). Time to complete decreased 31%. Error rate decreased 22%. No change in AOV or return rate. Decision: implement.

Segment analysis: effect was concentrated on mobile users (24% improvement) vs. tablet users (5%, not significant). New users benefited more (27%) than returning users (12%).

### Onboarding Email Sequence A/B Test
SaaS product tested onboarding email sequence timing. Hypothesis: delaying the second onboarding email from 24 hours to 72 hours after signup reduces early unsubscribes without reducing activation rate.

Design: Control — emails at Day 0, 1, 3, 7. Treatment — emails at Day 0, 3, 7, 14. Primary metric: 30-day activation rate. Secondary: email unsubscribe rate, feature discovery rate. Guardrails: support ticket volume.

Result: treatment group had 29% lower unsubscribe rate (p=0.008). 30-day activation rate was unchanged (p=0.41). Feature discovery shifted later but total adoption at 30 days was similar. Support tickets unchanged. Decision: implement.

Key learning: users need time to explore before receiving feature emails. Fewer, better-timed emails improve engagement without harming activation.

### Feature Placement Test
Productivity app tested placement of a new collaboration feature. Hypothesis: placing the collaboration button in the main toolbar (always visible) instead of the share menu (2 clicks away) increases collaboration feature adoption.

Design: Control — collaboration button in share menu. Treatment — collaboration button in main toolbar. Primary metric: weekly collaboration feature users. Secondary: collaboration actions per user, feature discovery rate. Guardrails: main UI engagement metrics, error rate.

Result: weekly collaboration users increased 41% (p<0.001). Actions per user increased 23%. No guardrail degradation. Decision: implement.

Segment analysis: effect was driven by new users (67% increase) more than existing users (18%). Existing users had established habits — the toolbar placement was less noticeable.

### AA Test Failure Case
An experimentation platform failed its AA test: one variant showed 3.2% conversion vs. 3.8% in the other (p=0.04). Investigation revealed a client-side caching issue: users assigned to Variant B received cached control content 15% of the time, diluting the observed effect.

Fix: invalidated caches on experiment launch, added cache-busting parameters, and implemented server-side assignment verification. AA test passed on re-run. This case demonstrates why AA tests must precede every significant experiment.

## References
  - references/ab-testing-advanced.md — A/B Testing Advanced Topics
  - references/ab-testing-fundamentals.md — A/B Testing Fundamentals
  - references/ab-testing-statistics.md — A/B Testing Statistics
  - references/ab-testing-statistical-methods.md — Statistical Methods for A/B Testing
  - references/ab-testing-infrastructure.md — A/B Testing Infrastructure and Operations
  - references/experiment-design.md — Experiment Design
  - references/statistical-analysis.md — Statistical Analysis
  - references/statistical-methods.md — Statistical Methods

## Handoff
For product analytics event tracking to inform metrics, hand off to `product-analytics`. For user research insights to inform hypotheses, hand off to `product-user-research`. For customer journey touchpoints to test, hand off to `product-customer-journey`. For growth metric experiment design, hand off to `product-growth-engineering`.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.