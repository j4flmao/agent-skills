---
name: product-onboarding-flow
description: >
  Use this skill when designing user onboarding flows: activation milestones, funnel mapping, progressive disclosure, and drop-off analysis.
  This skill enforces: activation milestone definition, funnel mapping, progressive disclosure patterns, onboarding experimentation.
  Do NOT use for: email drip campaigns, documentation writing, tutorial video production, customer success programs.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [product, onboarding, phase-8]
---

# Onboarding Flow Agent

## Purpose
Designs and optimizes user onboarding flows including activation milestones, funnel mapping, progressive disclosure, and experimentation. The goal is to get new users to experience the core value of the product as quickly as possible, maximizing activation rate and long-term retention.

## Agent Protocol

### Trigger
Exact user phrases: onboarding flow, user onboarding, user activation, new user experience, product tour, activation rate.

### Input Context
- What is the Aha moment (core value experience) for users?
- What is the current activation rate and onboarding funnel?
- What steps does a user go through from signup to activation?
- What friction points exist in the current flow?
- What user segments have different onboarding needs?
- What analytics instrumentation exists in the onboarding flow?
- What are the current onboarding metrics (activation rate, time-to-activation, drop-off points)?

### Output Artifact
Onboarding flow design with activation milestone, funnel steps, progressive disclosure plan, and experiment framework.

### Response Format
```
## Onboarding Flow Design
### Activation Milestone
{action} within {timeframe} → User activated

### Funnel
Signup → {step 1} → {step 2} → Activation
Current CR: {X%} | Target CR: {Y%}

### Progressive Disclosure
Day 1: {core features shown}
Day 3: {advanced features shown}
Day 7: {power features shown}

### Drop-off Analysis
Step | Drop-off | Root Cause | Action
{step} | {X%} | {cause} | {solution}

### Experiment Pipeline
{hypothesis} | {variant} | {expected lift}
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Activation milestone defined and measurable
- [ ] Onboarding funnel mapped with all steps
- [ ] Progressive disclosure schedule designed
- [ ] Drop-off points identified with root causes
- [ ] Onboarding experiments prioritized
- [ ] Time-to-activation measured
- [ ] Success metrics defined for onboarding
- [ ] User segmentation for different onboarding paths
- [ ] Post-activation experience designed
- [ ] Analytics instrumentation validated for onboarding events

### Max Response Length
7000 tokens

## Framework/Methodology

### Onboarding Maturity Model

| Level | Name | Characteristics | Metrics |
|-------|------|-----------------|---------|
| 1 | None | No defined onboarding, users left to explore | High drop-off, low activation |
| 2 | Basic | Generic product tour, welcome email | Basic activation tracking |
| 3 | Guided | In-app guidance, checklist, role-based path | Funnel tracked, experiments running |
| 4 | Personalized | Segment-specific flows, adaptive content | Segmented activation, behavior-triggered |
| 5 | Continuous | Onboarding never stops; re-onboarding, upgrade paths | Lifecycle onboarding, full user journey |

### Activation Spectrum

```
Unaware → Aware → Interested → Signed Up → Setup Started → First Value → Activated → Engaged → Retained
   0%       10%       25%          40%          55%           70%         85%       92%       100%
```

The critical transition is from "First Value" to "Activated" — this is where users experience the Aha moment.

### Onboarding Flow Types

| Type | Description | Best For | Example |
|------|-------------|----------|---------|
| Sequential wizard | Step-by-step setup flow | Complex products with configuration | Project setup, profile creation |
| Progressive disclosure | Features revealed over time | Feature-rich products | SaaS platforms, creative tools |
| Empty state guided | First-use experience with sample data | Content-heavy products | CRM, project management |
| Interactive demo | Simulated product experience | Sales-led products | Enterprise SaaS |
| Self-serve exploration | Minimal guidance, powerful defaults | Simple consumer products | Social apps, messaging |
| Checklist-based | Task list guiding to activation | Goal-oriented products | Productivity tools |
| Role-based | Different flows for different user types | Multi-user products | Admin vs member onboarding |

### The Aha Moment Framework
An Aha moment is the specific interaction where users realize the product's value. Characteristics:

- Measurable as a specific user action
- Correlated with long-term retention (validated by data)
- Achievable within the first session or first day
- Repeatable across user segments
- Actionable — the product can guide users toward it

## Workflow

### Step 1: Activation Milestone Definition
Identify the Aha moment — the specific action where users realize the product's core value. Define activation as a measurable event (not time): e.g., created first project, invited team member, completed first workflow. Set target time window (within 24h, within first session). Validate that activated users retain at higher rates.

To identify the Aha moment:

1. Brainstorm candidate value events (what actions indicate value received?)
2. For each candidate: check correlation with D7/D30 retention
3. Find the event with the strongest retention correlation
4. Validate: do users who complete this event within X time retain better?
5. Define activation = [event] within [time window]

Example analysis:

```
Candidate Event | D30 Retention (Did Event) | D30 Retention (Didn't) | Lift
First project created | 65% | 22% | 2.95x
First team member invited | 72% | 31% | 2.32x
First workflow completed | 58% | 28% | 2.07x
≡≡ Activation = Created first project within 24 hours of signup
```

### Step 2: Funnel Mapping
Map the full onboarding funnel: signup → welcome → setup → first action → activation → engagement. Measure conversion rate at each step. Segment funnel by acquisition channel, plan tier, and user role. Calculate absolute drop-off (most users lost at which step). Identify friction points per step.

Funnel mapping template:

```
Funnel: New User Onboarding
Timebox: 24 hours from signup

Step | Event | Users Entering | Step Conversion | Absolute Conversion | Drop-off
1. Signup | signup_completed | 10,000 | 100% | 100% | 0%
2. Email verified | email_verified | 8,500 | 85% | 85% | 15%
3. Account setup | setup_completed | 6,000 | 71% | 60% | 29%
4. First core action | first_core_action | 4,200 | 70% | 42% | 30%
5. Activation | activation_milestone | 3,000 | 71% | 30% | 29%

Biggest absolute drop-off: Step 3 → Step 4 (1,800 users lost)
```

Segment the funnel by:
- Acquisition channel: organic vs paid vs referral
- Plan tier: free vs trial vs paid
- User role: admin vs member vs viewer
- Device: desktop vs mobile vs tablet
- Geography: region, language

### Step 3: Progressive Disclosure
Design a progressive disclosure schedule. Day 1: show only core features needed for activation. Day 3: introduce complementary features that deepen engagement. Day 7: reveal advanced and power-user features. Use tooltips, banners, and checklists. Avoid overwhelming new users.

Progressive disclosure schedule template:

```
Phase 1 (First Session — 0-30 min):
  Goal: Reach activation milestone
  Show: Signup → Onboarding checklist → Core feature → Activation celebration
  UI Patterns: Guided setup wizard, progress bar, inline tips

Phase 2 (Day 1-3):
  Goal: Deepen engagement with core feature
  Show: Secondary features, integrations, team setup
  UI Patterns: Tooltip announcements, contextual suggestions, email tips

Phase 3 (Day 4-7):
  Goal: Build habit and power usage
  Show: Advanced features, shortcuts, templates, power user tips
  UI Patterns: Feature discovery modal, in-app messages, weekly digest

Phase 4 (Day 8+):
  Goal: Prevent churn, drive advocacy
  Show: Referral program, premium features (for free users), best practices
  UI Patterns: Re-engagement campaigns, feature highlight banners, NPS survey
```

### Step 4: Drop-off Analysis
Analyze where and why users drop off. Common causes: unclear value proposition, too many steps, technical friction (slow load, broken flow), information overload, no clear next step. Quantify impact of each friction point. Prioritize fixes by impact on activation rate.

Root cause analysis techniques:

| Technique | When to Use | Method |
|-----------|-------------|--------|
| Session replay analysis | Visual drop-off without clear cause | Watch 20-30 sessions of users who dropped off at each step |
| User survey | Need direct feedback | Exit survey: "What prevented you from completing?" |
| Heatmap analysis | Interface confusion | Heatmap + click tracking on onboarding pages |
| Expert review | Known UX issues common to your product type | Heuristic evaluation of onboarding flow |
| A/B test diagnosis | Testing multiple hypotheses | Controlled experiments on suspected friction points |

Common onboarding friction categories:

| Category | Examples | Fix Strategy |
|----------|----------|--------------|
| Motivational | "Why should I do this?" | Strengthen value prop, show benefits, social proof |
| Technical | Slow loading, broken links, errors | Performance optimization, error handling, fallback states |
| Cognitive | Too many choices, unclear instructions | Simplify, reduce options, progressive disclosure |
| Commitment | "Is this worth my time?" | Reduce required fields, allow skip, show progress |
| Confidence | "Will I break something?" | Undo options, preview before committing, safety nets |

### Step 5: Onboarding Experiments
Create experiment pipeline to improve activation. Typical experiments: reduce signup fields, add interactive demo, improve welcome email, change CTAs, add progress indicator, implement checklist. Measure activation rate, time-to-activation, and Day 7 retention. Iterate on winning variants.

Experiment prioritization framework:

| Hypothesis | Expected Lift | Effort | Confidence | Priority |
|------------|---------------|--------|------------|----------|
| Reduce signup from 8 fields to 4 | +15% activation | 2 days | High | P0 |
| Add interactive product demo | +20% activation | 2 weeks | Medium | P1 |
| Personalized onboarding path by role | +10% activation | 3 weeks | Medium | P2 |

Experiments to consider:

| Experiment | Description | Typical Impact | Implementation |
|------------|-------------|----------------|----------------|
| Reduce form fields | Shorter signup forms | +10-25% completion | Remove non-essential fields, defer to later |
| Social signup | Google/Apple login | +15-30% signup rate | OAuth integration |
| Interactive demo | Simulated product experience | +15-20% activation | Guided product tour with sample data |
| Progress indicator | Show onboarding progress | +10-15% completion | Progress bar with milestones |
| Value-first design | Show value before asking for setup | +20-30% activation | "See your dashboard" before "Set up your profile" |
| Checklist | Gamified task list | +15-25% activation | Visual checklist with rewards |
| Email sequence | Nurture emails during onboarding | +10-20% activation | Drip campaign triggered by user actions |
| In-app guidance | Contextual tooltips and hints | +5-15% activation | Hotspots, tooltips, banners |

### Step 6: Post-Activation Design
Design the experience after activation to ensure users don't churn after the initial success:

1. Day 1-3 post-activation: Help users increase depth of engagement
2. Week 1-2 post-activation: Introduce habit-forming features
3. Month 1 post-activation: Prevent mid-term churn with re-engagement
4. Month 2+ post-activation: Drive advocacy and upgrade paths

Post-activation milestones:

| Milestone | Description | Timing | Metric |
|-----------|-------------|--------|--------|
| Repeated activation | User performs activation action again | Day 3 | D3 return rate |
| Feature expansion | User adopts second core feature | Week 1 | Feature adoption rate |
| Habit formation | User uses product with increasing frequency | Week 2 | DAU/MAU trend |
| Value reinforcement | User achieves significant outcome | Month 1 | Goal completion |

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| One-size-fits-all onboarding | Same flow for all user segments | Segment users by role, intent, and source |
| Feature overload in first session | Showing too many features at once | Progressive disclosure; limit to activation-relevant features |
| Ignoring mobile users | Desktop-optimized onboarding on mobile | Design responsive/adaptive onboarding flows |
| No post-activation plan | Users activate then churn | Design Day 3/7/30 engagement sequences |
| Fake activation metrics | Defining activation too loosely (e.g., "viewed dashboard") | Activation must be a meaningful value event correlated with retention |
| Skipping empty states | Not designing for users with no data | Empty states with guidance and sample data |
| No failure recovery | Users error and have no way to get help | Error messages, help links, support chat during onboarding |
| Too much text | Walls of instructions no one reads | Visual guidance, short tooltips, video alternatives |
| Over-engineering before validation | Building complex onboarding before testing hypothesis | MVP onboarding: test with 5 users, iterate |
| Silent friction | Not measuring drop-off causes | Session recording, exit surveys, heatmaps |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Show value before asking for commitment | Users who see value first are more willing to set up |
| Reduce every form to minimum viable fields | Each extra field drops conversion 5-10% |
| Use social signup as primary option | Reduces friction and improves data quality |
| Design empty states with guidance | First-time users see clear next steps, not blank screens |
| Celebrate activation milestones | Positive reinforcement builds momentum |
| Provide undo for everything | Reduces anxiety about making mistakes |
| Use progress indicators during multi-step flows | Users are more likely to complete with visible progress |
| A/B test everything, even the welcome email | Small changes can have outsized impact on activation |
| Personalize onboarding by user role and intent | Relevant content converts better than generic |
| Monitor time-to-activation alongside activation rate | Fast activation correlates with better retention |

## Templates & Tools

### Activation Milestone Validation Template
```
Hypothesis: {action} within {timeframe} is the activation milestone

Analysis:
1. Users who completed {action} within {timeframe}: {N} — {X%} D30 retention
2. Users who did NOT complete {action} within {timeframe}: {N} — {Y%} D30 retention
3. Retention lift: {X / Y}x
4. Minimum lift threshold: 2.0x

Validation: {Pass/Fail — lift exceeds threshold}
Activation definition confirmed: {Yes/No}
```

### Onboarding Flow Canvas

```
User Segment: {segment description}
Source: {acquisition channel}
Goal: {what success looks like for this segment}

Funnel Steps:
| # | Step | Success Event | Expected CR | Target CR | Notes |
|---|------|---------------|-------------|-----------|-------|
| 1 | {step} | {event} | {X%} | {Y%} | {notes} |
| 2 | {step} | {event} | {X%} | {Y%} | {notes} |

Activation Milestone: {event} within {timeframe}

Progressive Disclosure:
- Session 1: {features}
- Day 2-3: {features}
- Week 1: {features}
- Week 2+: {features}

Potential Friction Points:
1. {point} — {mitigation}
2. {point} — {mitigation}

Experiment Ideas:
1. {idea} — {expected impact}
2. {idea} — {expected impact}
```

### Onboarding Analytics Event Specification

| Event | Trigger | Properties | Purpose |
|-------|---------|------------|---------|
| onboarding_started | User begins onboarding flow | source, plan_tier, user_role | Funnel entry |
| onboarding_step_completed | User completes a step | step_name, step_number | Step conversion tracking |
| onboarding_skipped | User skips a step | step_name, skip_reason | Friction analysis |
| onboarding_dropped_out | User leaves without completing | last_step, time_spent, page_exit | Drop-off analysis |
| activation_milestone_reached | User completes activation event | event_name, time_since_signup | Activation tracking |
| guided_tip_dismissed | User dismisses a tooltip | tip_id, time_to_dismiss | Guidance effectiveness |

## Case Studies

### Case Study 1: Signup Form Optimization Increases Activation 40%
A B2B SaaS product had a 10-field signup form with only 25% completion rate. Analytics showed 55% of users started the form but 40% dropped off at the "company size" field, which was required but appeared too early. The team reduced the form to 4 fields (email, password, name, role), moved company info to a post-signup survey, and added Google SSO. Signup completion increased from 25% to 68%, and overall activation rate increased 40% because more users reached the activation milestone.

Method: Funnel analysis + session replay on signup form
Key finding: Company size field caused 40% drop-off due to appearing too early
Impact: Signup completion 25% to 68%, activation rate increased 40%

### Case Study 2: Personalized Onboarding by User Role
A team collaboration tool with 5 user roles (admin, manager, contributor, viewer, external) used the same onboarding for everyone. Activation rate was 22% for admins but only 8% for contributors. Role-specific onboarding paths were created: admins saw workspace setup, contributors saw task management, viewers saw reporting. Contributor activation increased from 8% to 31%, and overall activation rose from 18% to 34%.

Method: User segmentation analysis → role-based onboarding design
Key insight: Different roles have different Aha moments and setup needs
Impact: Contributor activation 8% to 31%, overall activation 18% to 34%

### Case Study 3: Interactive Demo vs Product Tour
A data analytics SaaS tested two onboarding approaches. The original product tour (screenshot slides explaining features) had a 12% activation rate. An interactive demo (sample dataset with guided analysis tasks) was tested against it. The interactive demo achieved a 34% activation rate — nearly 3x higher. Users who went through the interactive demo also had 25% higher D30 retention.

Method: A/B test: product tour vs interactive demo
Key finding: Active learning (doing tasks) beats passive learning (viewing slides)
Impact: Activation 12% to 34%, D30 retention improved 25%

## Rules
- Activation must be defined as a user action, not a time period.
- Onboarding funnel must be fully instrumented with analytics.
- Progressive disclosure must never hide the activation path.
- Drop-off analysis must use cohort data, not aggregate.
- Experiments must have clear success criteria before launch.
- Onboarding personalization should match user role and intent.
- Time-to-activation must be measured and optimized.
- Post-activation experience must be designed simultaneously.
- Every onboarding step must have a clear purpose related to activation.
- Empty states must include guidance, not just "nothing here" messages.
- Onboarding success must be measured by retention, not just activation.
- Each user segment needs a validated activation definition, not a single one-size-fits-all.
- Social signup must be offered as a primary option, not secondary.
- Onboarding flows must work fully on mobile (responsive or adaptive).
- Errors during onboarding must provide clear recovery paths.
- Welcome emails must be sent within 5 minutes of signup.
- Onboarding experiments require minimum 1,000 users per variant for statistical significance.
- Users must be able to skip or exit guided onboarding at any point.
- Onboarding data must be reviewed weekly during the first month of a new flow.

## References
  - references/activation-design.md — Activation Design
  - references/activation-funnels.md — Activation Funnels
  - references/onboarding-experiments.md — Onboarding Experiments
  - references/onboarding-flow-advanced.md — Onboarding Flow Advanced Topics
  - references/onboarding-flow-fundamentals.md — Onboarding Flow Fundamentals
  - references/onboarding-patterns.md — Onboarding Patterns
  - references/onboarding-flow-design-patterns.md — Onboarding Flow Design Patterns
  - references/onboarding-metrics-optimization.md — Onboarding Metrics and Optimization
## Handoff
For analytics tracking of onboarding metrics, hand off to `product-analytics`. For A/B testing onboarding changes, hand off to `product-ab-testing`.
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