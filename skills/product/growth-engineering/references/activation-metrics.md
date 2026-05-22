# Activation Metrics

## Activation Definition

### What Makes a Good Activation Metric
```
User-initiated: Requires user action (not time-based)
Value-signaling: User experienced core product value
Predictive: Correlates with long-term retention (Day 30+)
Measurable: Trackable in analytics system
Time-bound: Occurs within a specific window (e.g., 24h)
```

### Activation Examples by Product Type
```
SaaS Collaboration:
  Activation: Created first project and invited team member
  Time window: Within 24 hours of signup
  Correlation: 3x higher 30-day retention

Fintech:
  Activation: Completed first transaction
  Time window: Within 7 days of account creation
  Correlation: 5x higher 90-day retention

E-commerce Marketplace:
  Activation: Made first purchase
  Time window: Within 14 days of first visit
  Correlation: 4x higher 6-month retention

Content Platform:
  Activation: Consumed 3 pieces of content
  Time window: Within first session
  Correlation: 2x higher weekly active usage
```

## Time-to-Value (TTV)

### Definition
Time from first product interaction until user experiences core value.

### Measurement
```
Start: User signup or first session
End: User completes activation action
Formula: Median time from start to end
Segments: By acquisition channel, device, plan
```

### TTV Benchmarks
```
Excellent: <5 minutes (consumer apps)
Good: 5-30 minutes (B2B SaaS)
Average: 30-120 minutes (complex products)
Needs improvement: >2 hours (requires optimization)
```

### Reducing TTV
```
Remove unnecessary signup steps
  — Social login, fewer form fields
  — Skip email verification until activation
Pre-populate default data
  — Templates, sample content
  — Guided setup wizard
Progressive onboarding
  — Show only what's needed for activation
  -– Defer advanced configuration
Interactive product tour
  — Walk through activation in-context
  — Hands-on, not slides
```

## Activation Funnel

### Typical Funnel
```
Signup → Welcome → Setup → First Action → Activation → Engagement

Metrics per step:
  Signup: Registration form completion rate
  Welcome: Tutorial/onboarding start rate
  Setup: Configuration completion rate
  First Action: User takes first meaningful action
  Activation: User achieves core value
  Engagement: User returns within 7 days
```

### Funnel Analysis
```
Step | Visitors | Conversion | Drop-off
Signup            | 10,000 |  100%   | —
Welcome screen    |  7,500 |   75%   | 25%
Setup (3 fields)  |  5,250 |   70%   | 30%
First document    |  3,150 |   60%   | 40%
Activated (shared)|  1,575 |   50%   | 50%

Key insight: 50% drop from first document to activation (sharing).
Hypothesis: Users don't understand why they should share.
```

## Activation Experiments

### Common Experiments
```
1. Signup simplification
   — Remove optional fields
   — Single-click social signup
   Expected lift: +5-15% activation

2. In-app guidance
   — Interactive checklist
   — Contextual tooltips
   Expected lift: +10-20% activation

3. Template-based start
   — Pre-filled content on signup
   — Guided workflow
   Expected lift: +15-25% activation

4. Welcome email series
   — Day 0: Welcome + quick start
   — Day 1: Feature highlight
   — Day 3: Success story
   Expected lift: +5-10% activation

5. Progress indicators
   — Show completion percentage
   — Celebrate milestones
   Expected lift: +10-15% activation
```

## Activation Dashboard

### Key Metrics
```
Metric             | Current | Target | Trend
Activation Rate    |   35%   |   50%  | ↑
Median TTV         |  45 min |  20 min| ↓
Setup Completion   |   60%   |   80%  | ↑
First Action Rate |   72%   |   85%  | ↑
Day 7 Retention   |   40%   |   55%  | ↑
```
