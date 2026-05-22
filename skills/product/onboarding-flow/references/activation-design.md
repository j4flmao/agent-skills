# Activation Design

## Activation Milestone Design

### Step 1: Identify Core Value
```
What problem does the product solve?
What action proves the user got value?
How do power users differ from casual users?

Example (Project Management Tool):
  Core value: Teams organize and track work
  Activation: Create a project and assign tasks to team members
  Power user behavior: Create 5+ projects, use templates
```

### Step 2: Define Activation Action
```
Action: {specific, measurable action}
Time Window: {within first session / 24h / 7 days}
Segment: {single user / team / workspace}
Criteria: {specific conditions that count as activated}

Example Action:
  "Invite at least 2 team members to a shared project
   and assign tasks within the first 24 hours"
```

### Step 3: Validate with Data
```
Hypothesis: Activated users retain at X% higher rate
Analysis: Compare Day 30 retention for activated vs non-activated
Result: Activated users retain 3x higher at Day 30
Validation: Clear correlation between action and retention
```

## Onboarding Flow Design

### Flow Structure
```
Signup → Welcome → Setup → Learn → Activate → Engage

1. Signup: Create account (minimal friction)
   — Email + password, or social login
   — No credit card for free tier

2. Welcome: Set expectations
   — Value proposition reminder
   — Quick time commitment (2 min)

3. Setup: Configure for success
   — Minimal required setup (1-3 fields)
   — Smart defaults and templates
   — Defer optional configuration

4. Learn: First action guided
   — Interactive walkthrough (not slides)
   — One core action with guidance
   — Immediate feedback on completion

5. Activate: Core value moment
   — User completes activation action
   — Celebrate achievement
   — Show what's next

6. Engage: Post-activation momentum
   — Suggested next actions
   -– Feature discovery prompts
   — Success milestones
```

### Design Principles

#### Progressive Disclosure
```
Reveal features gradually based on user progress.
Show only what's needed for the current step.
Defer advanced features until user is activated.

Example:
  Session 1: Core creation flow only
  Session 2: Collaboration features
  Session 3: Advanced settings
  Session 5: Power user features
```

#### Reduce Cognitive Load
```
One primary action per screen
Fewer than 3 options at any step
Clear labels and expectations
Visual hierarchy guides attention
Progress indicator shows completion
```

#### Immediate Value
```
Pre-populate with templates or sample data
Show sample output before user creates anything
First action produces visible result immediately
No dead ends — every step leads somewhere
```

## Onboarding Flow Examples

### Single-Player Flow (Consumer)
```
1. Open app → See curated content feed
2. Tap to interact → See personalized result
3. Create first item → Published immediately
4. Share → See social validation
Time to activation: <2 minutes
```

### Team-Player Flow (B2B SaaS)
```
1. Sign up → Create workspace (name + invite)
2. Invite teammates → Email invites sent
3. Create first project → Template selection
4. Assign tasks → Teammates notified
5. Team member responds → Collaboration begins
Time to activation: <10 minutes (solo)
```

## Success Metrics

### Onboarding Metrics
```
Metric                    | Target
Activation rate           | >50% within 24h
Setup completion rate     | >80%
Median TTV                | <5 minutes (consumer), <15 (B2B)
Day 7 retention           | >40% of activated users
Onboarding NPS            | >30
Support tickets (onboarding)| <5% of new users
```

### Leading Indicators
```
Time spent in first session
Number of actions taken in first session
Feature exploration breadth
Return rate within 24 hours
Activation within target window
```
