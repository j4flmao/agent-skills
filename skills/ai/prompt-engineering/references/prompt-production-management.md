# Prompt Production Management

## Prompt Registry

### Purpose
A central catalog of all production prompts with metadata, version history, performance metrics, and ownership information. The registry is the single source of truth for "what prompt is running where."

### Registry Schema

```yaml
# prompts/classify-support/v2.3.0/manifest.yaml
id: classify-support
name: Customer Support Classification
version: 2.3.0
status: active  # active | deprecated | experimental | rollback
created: 2026-03-15
author: team-ai
owner: team-ai

target_model: gpt-4o
architecture: few-shot
task_type: classification

parameters:
  temperature: 0.0
  max_tokens: 30
  top_p: 1.0
  stop_sequences: ["\n"]

metrics:
  accuracy: 0.97
  precision: 0.96
  recall: 0.95
  f1_score: 0.955
  latency_p50_ms: 280
  latency_p95_ms: 450
  cost_per_1k_calls: 0.03
  pass_rate: 142/150

tests:
  unit_pass_rate: 1.0
  regression_pass_rate: 0.98
  adversarial_pass_rate: 0.95

changelog:
- version: 2.3.0
  date: 2026-03-20
  author: jane.doe
  change: "Added edge case example for refund queries. Accuracy +1.2%."
- version: 2.2.0
  date: 2026-03-10
  author: john.smith
  change: "Reduced temperature from 0.1 to 0.0. Precision +3%."
- version: 2.1.0
  date: 2026-03-01
  author: jane.doe
  change: "Added sandwich defense for security hardening."

dependencies: []
tags: [production, customer-facing, high-traffic]
```

### Registry Operations

| Operation | Description | Automation |
|-----------|-------------|------------|
| Register | Add new prompt to registry | CI/CD pipeline |
| Promote | Move from staging to production | Manual approval gate |
| Deprecate | Mark as no longer recommended | Automated after N days inactive |
| Rollback | Revert to previous version | One-click via tooling |
| Archive | Remove from active registry | After deprecation period expires |

## Version Control

### Prompt-as-Code
Store prompts in a version-controlled repository (Git). Each prompt is a directory with:
- `prompt.txt` or `prompt.yaml`: The actual prompt text/template.
- `manifest.yaml`: Metadata, parameters, metrics.
- `tests/`: Test cases and expected outputs.
- `changelog.md`: Human-readable change history.

### Directory Structure
```
prompts/
  classify-support/
    v1.0.0/
      prompt.txt
      manifest.yaml
      tests/
        unit.yaml
        regression.yaml
    v1.1.0/
      ...
    v2.0.0/
      ...
  summarize-transactions/
    v1.0.0/
      ...
```

### Branching Strategy
- **main**: Production prompts only (protected branch, requires review).
- **staging**: Prompts undergoing validation.
- **feature/[name]**: Individual prompt development branches.
- **experimental/[name]**: Research and exploration (no review required).

### Review Process for Prompt Changes
1. Developer creates feature branch with prompt changes.
2. Automated tests run: unit, regression, adversarial, performance.
3. Pull request created with diff of prompt text and manifest changes.
4. Reviewer examines: does the change address the issue? Are tests passing? Are metrics stable?
5. Merge to staging for shadow testing.
6. After validation period, promote to main.

## Testing Pipeline

### Pipeline Stages

```
[Commit] → [Unit Tests] → [Regression Tests] → [Adversarial Tests]
    → [Performance Tests] → [Shadow Deployment] → [Gate Decision]
    → [Production Deploy] → [Monitoring]
```

### Stage Details

**Stage 1: Unit Tests** (<30s)
- Output format validation (JSON parseable, schema matches).
- Constraint adherence (max length, allowed values, forbidden patterns).
- Basic robustness (empty input, very long input, special characters).
- Template rendering (all variables substituted, no KeyError).

**Stage 2: Regression Tests** (<2min)
- Full test suite against known inputs (50-200 test cases).
- Compare output quality against baseline version.
- Detect regressions: accuracy drops, format changes, new failure modes.
- Block deployment if regression count > 0.

**Stage 3: Adversarial Tests** (<5min)
- Injection attempts: 20+ variations of instruction override.
- Jailbreak attempts: 10+ role-play and encoding variations.
- Edge cases: very long input, non-ASCII, Unicode tricks.
- Rate limit bypass simulation.

**Stage 4: Performance Tests**
- Measure latency (p50, p95, p99) over 50+ calls.
- Measure token consumption (input, output, total).
- Estimate cost per 1,000 calls.
- Compare against baseline; alert if >20% regression.

**Stage 5: Shadow Deployment** (hours-days)
- New prompt version runs alongside production version.
- Compare outputs: agreement rate, quality metrics, latency.
- No user-facing impact during shadow period.
- Auto-approve if shadow metrics meet thresholds.

**Stage 6: Gate Decision**
- All previous stages must pass.
- Manual approval for major version changes.
- Deploy gate blocks on: any regression, latency >2x baseline, adversarial test failure.

### Test Suite Maintenance
- Review test suite monthly for stale or irrelevant tests.
- Add new test cases for every production incident.
- Maintain minimum test count per prompt (50+ unit, 20+ adversarial).
- Track test coverage: what types of inputs are NOT tested?

## Monitoring & Observability

### Key Metrics

| Category | Metric | Collection | Alert Threshold |
|----------|--------|------------|-----------------|
| Quality | Pass rate | Output evaluation | <95% over 5min window |
| Quality | Accuracy | Sampled human review | <90% over 1hr window |
| Quality | Refusal rate | Output classification | >5% or <0.1% |
| Performance | Latency p50 | Per-request timing | >500ms |
| Performance | Latency p95 | Per-request timing | >2s |
| Performance | Latency p99 | Per-request timing | >5s |
| Cost | Token output/input | Token counting | Ratio <0.1 or >5.0 |
| Cost | Cost per call | Token × model rate | >2x baseline |
| Security | Injection attempts | Input pattern detection | Spike >3x baseline |
| Security | Parse failures | Output parsing | >1% over 5min |
| Stability | Error rate | API errors + parse fails | >2% over 5min |
| Stability | Timeout rate | Request duration check | >0.5% over 5min |

### Alerting Strategy
- **Page (immediate)**: Quality pass rate <90%, error rate >5%, security incident detected.
- **Ticket (within 1hr)**: Latency >2x baseline, cost >1.5x baseline, parse failure rate >2%.
- **Report (daily)**: Gradual trends in any metric, minor regression in accuracy, new injection patterns detected.

### Dashboard
Build a real-time dashboard showing:
- Per-prompt pass rate over time (24h, 7d, 30d).
- Latency distribution (p50, p95, p99) per model endpoint.
- Token usage and cost trends (daily, weekly).
- Active prompt versions and their deployment percentages.
- Alert history and incident timeline.

## Incident Response

### Severity Levels

| Severity | Definition | Response Time | Example |
|----------|------------|---------------|---------|
| S1 | Critical quality or safety failure | 15min | Model outputs harmful content, PII leak |
| S2 | Major quality degradation | 1hr | Accuracy drops >10%, format consistently broken |
| S3 | Minor quality issue | 24hr | Occasional format errors, minor tone issues |
| S4 | Cosmetic or non-functional | Next sprint | Output formatting wonkiness, rare edge cases |

### Incident Response Playbook

**Detect**:
- Automated alert from monitoring dashboard.
- User/customer report via support channel.
- Manual review discovers issue.

**Triage** (within severity SLAs):
1. Confirm the issue is reproducible.
2. Determine if it's prompt-related, model-related, or infrastructure-related.
3. Assign severity level.
4. Notify stakeholders per severity protocol.

**Mitigate**:
1. For S1/S2: Rollback prompt to previous known-good version immediately.
2. For S3/S4: Diagnose and fix through normal pipeline.
3. If rollback isn't possible (model version change): Adjust prompt for new model behavior.
4. Document the rollback in the changelog.

**Diagnose**:
1. Check if the model version changed (API deprecations, model updates).
2. Check if input distribution shifted (new user segments, new query types).
3. Check if infrastructure changed (API endpoints, parameter handling).
4. Reproduce with the exact failing input in a controlled environment.
5. Identify root cause: prompt design flaw, missing edge case, security bypass, model behavior change.

**Fix**:
1. Develop fix on feature branch following standard prompt development process.
2. Add the failing input as a regression test case.
3. Run full test pipeline.
4. Deploy through staging → production pipeline.
5. Verify fix in production with monitoring.

**Review** (within 5 business days):
1. Post-mortem document: timeline, root cause, impact, fix, preventive measures.
2. Update runbooks with lessons learned.
3. Add monitoring for similar failure patterns.
4. Review test coverage gaps exposed by the incident.

## Drift Detection

### Types of Drift

| Drift Type | Description | Detection Method |
|------------|-------------|------------------|
| Input drift | User queries change over time | Embedding similarity tracking |
| Model drift | Model behavior changes with updates | Shadow comparisons, pass rate trends |
| Concept drift | What "good" means changes | Human evaluation calibration |
| Performance drift | Latency or cost changes | Continuous metric tracking |

### Detection Frequency
- Input drift: Weekly distribution analysis.
- Model drift: Continuous pass rate monitoring + full eval on model update.
- Concept drift: Monthly human calibration sessions.
- Performance drift: Real-time dashboard monitoring.

### Response to Drift
- Minor drift (metric change <5%): Log and monitor; no action.
- Moderate drift (5-15%): Schedule prompt review and potential update.
- Major drift (>15%): Treat as incident (S2 or S3 depending on impact).

## Cost Management

### Cost Optimization Strategies
1. **Reduce prompt length**: Every 100 tokens saved = ~5% cost reduction.
2. **Reduce few-shot count**: Find minimum effective examples.
3. **Use smaller models where appropriate**: Classification on GPT-4o-mini instead of GPT-4o.
4. **Cache identical queries**: Response caching for repeated inputs.
5. **Batch processing**: Combine multiple inputs into one prompt where safe.
6. **Monitor token waste**: Track output/input ratio; investigate outliers.

### Cost Allocation
- Tag each prompt with cost center or product team.
- Track cost per prompt per environment (dev, staging, production).
- Set budget alerts at team and prompt levels.
- Review cost trends weekly.

## Governance & Compliance

### Prompt Approval Workflow
1. Developer creates prompt following defined standards.
2. Automated quality checks pass.
3. Peer review: at least one reviewer from a different team.
4. Security review: required for high-risk deployments.
5. Compliance review: required for regulated domains (finance, healthcare, legal).
6. Final approval by prompt owner.

### Audit Trail
- Every prompt change is logged with: who, what, when, why.
- All production prompt versions are retained (never deleted).
- Access logs show who deployed what, when.
- Quarterly audit of active prompts for compliance.

### Retention Policy
- Active prompts: retained indefinitely.
- Deprecated prompts: retained for 1 year after deprecation.
- Shadow/experimental prompts: retained for 90 days.
- Test results: retained with prompt version.

## Production Checklist

- [ ] Prompt registered in central registry with metadata.
- [ ] Version controlled in Git with changelog.
- [ ] Unit tests passing (format, constraints, robustness).
- [ ] Regression tests passing with no regressions.
- [ ] Adversarial tests passing (injection, jailbreak).
- [ ] Performance baseline established (latency, token usage, cost).
- [ ] Monitoring configured with alerts for all key metrics.
- [ ] Rollback procedure documented and tested.
- [ ] Runbook exists for common failure modes.
- [ ] Security review completed (medium/high risk only).
- [ ] Compliance review completed (regulated domains only).
- [ ] Owner assigned with on-call rotation.
- [ ] Cost budget set with alert threshold.
