# Activation Funnels

## Activation Definition

### What is Activation?
The moment a user experiences the core value of your product for the first time. It's the "aha moment" that correlates with long-term retention.

### Activation Criteria
```yaml
activation:
  definition: "User completes their first automated workflow"
  actions:
    - "Created an account"
    - "Connected a data source"
    - "Configured a workflow trigger"
    - "Workflow executed successfully"
  time_window: "7 days from signup"
  measurement: "Percentage of users meeting all criteria within 7 days"
```

## Activation Funnel

### Funnel Stages
```
Signup → Account Setup → First Action → Core Action → Activated
 100%       80%            55%           35%           25%
```

### Per-Stage Optimization
| Stage | Current | Target | Lever |
|-------|---------|--------|-------|
| Signup → Account setup | 80% | 90% | Reduce required fields |
| Account setup → First action | 69% | 80% | Guided walkthrough |
| First action → Core action | 64% | 75% | Template/sample data |
| Core action → Activated | 71% | 85% | Celebrate success, show value |

## Activation Metrics

### Leading Indicators
```
Time to first key action: How quickly users reach activation
Steps to activation: Number of steps required
Guidance completion: % of onboarding checklist done
Feature discovery: % of key features tried in first session
```

### Diagnostic Metrics
```
Drop-off by step: Which step loses the most users?
Time spent per step: Is any step taking too long?
Error rate per step: Are users getting stuck?
Revisit rate: Do users come back to complete?
```

## Activation Optimization

### Reducing Steps
```python
# Before: 7 steps to activate
steps = ["signup", "verify_email", "create_profile", 
         "connect_integration", "configure_settings",
         "create_first_item", "share_with_team"]

# After: 4 steps to activate  
steps = ["signup", "quick_setup", "create_first_item", "invite_team"]
```

### Time-to-Value Reduction
```
Before: Setup → Configure → Learn → Create → Value
  (7 days to activation)

After: Signup → Template → Value
  (15 minutes to activation)
  
Strategy:
1. Skip configuration (use smart defaults)
2. Provide templates (pre-built examples)
3. Embed guidance (tooltips, checklists)
4. Defer complexity (advanced settings optional)
```

## Cohort Analysis

### Activation by Cohort
```
Cohort (Signup Week) | Activation % | Time to Activate
2026-W01             | 22%          | 3.2 days
2026-W02             | 24%          | 2.8 days
2026-W03             | 25%          | 2.5 days
2026-W04             | 28%          | 2.1 days  ← After onboarding redesign
```

### Activation by Segment
```
Segment           | Activation | 7-Day Retention | 30-Day Retention
SME               | 32%        | 45%             | 28%
Enterprise        | 22%        | 38%             | 22%
Free trial        | 18%        | 30%             | 15%
Referral          | 35%        | 50%             | 32%
```

## Activation Scoring

### Predictive Score
```python
def activation_score(user_actions):
    """Predict likelihood of activation based on first-session actions."""
    score = 0
    if user_actions.get("completed_setup"):
        score += 25
    if user_actions.get("created_first_item"):
        score += 35
    if user_actions.get("invited_team_member"):
        score += 25
    if user_actions.get("connected_integration"):
        score += 15
    return min(score, 100)  # 0-100 scale
```

### Score Thresholds
```
0-30: High risk of churn → Intervention needed
31-60: Moderate → Nurture with tips
61-80: On track → Reinforce with success stories
81-100: Likely to activate → Reduce support
```

## Activation Dashboard

### Panels
```
Activation rate: 25% (target: 35%) ↕
Time to activation: 2.1 days (target: <2 days) ✓
Steps to activation: 4 avg (target: <4) ✓

Top drop-off: Account setup → First action (31% drop)
  → Investigation: Is the setup wizard too complex?

Segments:
  SME: 32% ✓
  Enterprise: 22% ✗ (investigate)
  Free trial: 18% ✗ (investigate)
```
