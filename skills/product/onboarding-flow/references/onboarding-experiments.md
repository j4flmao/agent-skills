# Onboarding Experiments

## Experiment Framework

### Hypothesis Format
```
If we [change to onboarding], then [activation metric]
will [increase/decrease] by [X%], because [rationale].
```

### Success Metrics
```
Primary: Activation rate (within 24h)
Secondary: Time-to-activation, Day 7 retention, NPS
Guardrail: Error rate, support tickets, churn rate
```

## Experiment Ideas by Funnel Stage

### Signup Stage

#### Reduce Form Fields
```
Hypothesis: Removing phone number field will increase
signup completion by 10%, because fewer fields = less friction.
Variant A: Name + Email + Password + Phone
Variant B: Name + Email + Password
Duration: 2 weeks
```

#### Social Login
```
Hypothesis: Adding Google SSO will increase signup
completion by 20%, because users prefer one-click signup.
Variant A: Email + password only
Variant B: Google SSO as primary, email as fallback
Duration: 2 weeks
```

### Welcome Stage

#### Value Prop Video
```
Hypothesis: Showing a 30-second value prop video on
welcome screen will increase activation rate by 15%,
because users understand the product's purpose faster.
Variant A: Static welcome screen
Variant B: Welcome screen with autoplay video
Duration: 3 weeks
```

#### Personalized Welcome
```
Hypothesis: Personalized welcome based on user role
will increase activation by 12%, because relevant content
resonates more.
Variant A: Generic welcome message
Variant B: Role-based welcome (developer vs manager vs designer)
Duration: 2 weeks
```

### Setup Stage

#### Template Selection
```
Hypothesis: Offering pre-made templates during setup
will increase activation by 20%, because users get value
without starting from scratch.
Variant A: Blank start (no templates)
Variant B: Template selection screen
Duration: 3 weeks
```

#### Smart Defaults
```
Hypothesis: Pre-populating settings with intelligent defaults
will reduce setup time by 30% and increase activation by 10%.
Variant A: Empty setup, user fills everything
Variant B: Pre-filled smart defaults, user adjusts
Duration: 2 weeks
```

### Learn Stage

#### Interactive Walkthrough
```
Hypothesis: An interactive walkthrough (vs text-only guide)
will increase first action completion by 25%.
Variant A: Text-based onboarding guide
Variant B: Interactive step-by-step walkthrough
Duration: 2 weeks
```

#### Progress Indicator
```
Hypothesis: A visible progress bar showing onboarding
completion will increase setup completion by 15%.
Variant A: No progress indicator
Variant B: Progress bar at top
Duration: 3 weeks
```

### Activate Stage

#### Celebration Moment
```
Hypothesis: Celebrating the activation milestone with
animation + message will increase Day 7 retention by 10%.
Variant A: Quiet transition to main app after activation
Variant B: Confetti animation + congratulations message
Duration: 4 weeks
```

#### Social Proof
```
Hypothesis: Showing "X peers have completed this" during
onboarding will increase activation by 8%.
Variant A: No social proof during onboarding
Variant B: Social proof notifications during setup
Duration: 3 weeks
```

### Post-Activation Stage

#### Next Action Prompt
```
Hypothesis: Suggesting a specific next action after activation
will increase Day 3 return rate by 20%.
Variant A: Generic dashboard after activation
Variant B: Specific CTA "Try X next" with clear benefit
Duration: 3 weeks
```

#### Email Sequence
```
Hypothesis: A 3-email onboarding sequence will increase
Day 30 retention by 15% for users who didn't activate.
Variant A: No email follow-up
Variant B: 3-email sequence (Day 1, 3, 7)
Duration: 4 weeks
```

## Experiment Checklist

### Before Launch
```
[ ] Hypothesis defined with If/Then/Because
[ ] Primary metric selected and instrumented
[ ] Sample size calculated
[ ] AA test passed
[ ] Variants properly randomized
[ ] All states tested (loading, empty, error, success)
```

### During Experiment
```
[ ] Guardrail metrics monitored daily
[ ] No peeking at primary metric before end date
[ ] Sample ratio mismatch checked
[ ] Technical issues tracked
[ ] Feedback collected from test users
```

### After Experiment
```
[ ] Results analyzed with statistical test
[ ] Decision documented (implement/roll back/iterate)
[ ] Learnings shared with team
[ ] Winning variant deployed to all users
[ ] Experiment documented in experiment tracker
```
