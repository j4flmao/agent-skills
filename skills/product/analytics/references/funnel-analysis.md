# Funnel Analysis

## Funnel Definition

### Funnel Structure
```
Step 1 → Step 2 → Step 3 → Step 4 → Step 5 → Completed
Visits  Signups Activation   Pay    Referral
100%     12%       5%        2%      0.5%
```

### Funnel Configuration
```yaml
funnel:
  name: "trial-to-paid"
  steps:
    - id: 1
      name: "visit_pricing_page"
      event: "page_viewed"
      filter: page == "/pricing"
    - id: 2
      name: "started_signup"
      event: "signup.started"
    - id: 3
      name: "completed_signup"
      event: "signup.completed"
    - id: 4
      name: "activated"
      event: "activation.completed"
      window: "7 days after signup"
    - id: 5
      name: "first_payment"
      event: "payment.completed"
      window: "30 days after activation"
  time_window: "90 days"
```

## Analysis Techniques

### Step-by-Step Conversion
```sql
WITH funnel AS (
  SELECT 
    COUNT(DISTINCT user_id) as step_1_users,
    SUM(CASE WHEN step_2_completed THEN 1 ELSE 0 END) as step_2_users,
    SUM(CASE WHEN step_3_completed THEN 1 ELSE 0 END) as step_3_users,
    SUM(CASE WHEN step_4_completed THEN 1 ELSE 0 END) as step_4_users,
  FROM user_funnel_data
  WHERE cohort_date >= '2026-01-01'
)
SELECT
  step_1_users,
  step_2_users,
  ROUND(100.0 * step_2_users / step_1_users, 1) as step2_pct,
  step_3_users,
  ROUND(100.0 * step_3_users / step_2_users, 1) as step3_pct,
  step_4_users,
  ROUND(100.0 * step_4_users / step_3_users, 1) as step4_pct,
FROM funnel
```

### Drop-off Analysis
| Step | Users | Conversion | Drop-off | Drop-off Reason (hypothesis) |
|------|-------|------------|----------|------------------------------|
| Visit pricing | 100,000 | 100% | - | - |
| Start signup | 12,000 | 12% | 88% | Price too high, unclear value |
| Complete signup | 8,000 | 67% | 33% | Form too long, technical issues |
| Activate | 5,000 | 62% | 38% | Poor onboarding, no guidance |
| First payment | 2,000 | 40% | 60% | Not convinced of value |

## Segment Breakdown

### By Acquisition Channel
```
Channel    | Visit | Signup | Activate | Pay | Overall
Organic    | 50K   | 8%     | 5%       | 2%  | 2.0%
Paid       | 30K   | 12%    | 6%       | 2%  | 2.4%
Referral   | 15K   | 25%    | 18%      | 8%  | 8.0%
Social     | 5K    | 3%     | 1%       | 0%  | 0.3%
```

## Time-Based Funnel

### Time to Convert
```sql
SELECT
  step_name,
  AVG(time_to_step_seconds) as avg_time_seconds,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY time_to_step_seconds) as median_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY time_to_step_seconds) as p95_time
FROM funnel_timing
GROUP BY step_name
```

## Funnel Optimization

### Hypothesis Testing
```yaml
funnel_test:
  step: "signup_completion"
  problem: "33% drop-off from start to complete signup"
  hypothesis: "Removing optional fields will reduce friction"
  
  experiment:
    control: current signup form (8 fields)
    treatment: simplified form (4 required fields)
    
  expected_impact: "+15% signup completion"
  metric: signup_completion_rate
```

### Improvement Levers
```
Step 1→2 (Visit → Signup): Value proposition, pricing clarity, social proof
Step 2→3 (Start → Complete): Form length, error messages, progress indicator
Step 3→4 (Complete → Activate): Onboarding quality, time-to-first-value
Step 4→5 (Activate → Pay): Feature depth, usage habits, upgrade prompts
```

## Reporting Template

```markdown
## Funnel Report: Trial to Paid (March 2026)

### Overall
- Users entered funnel: 100,000
- Completed funnel: 2,000
- Overall conversion: 2.0%

### Step-by-Step
| Step | Users | Step Conv | Overall Conv | vs Last Month |
|------|-------|-----------|-------------|---------------|
| Visit pricing | 100,000 | 100% | 100% | - |
| Start signup | 12,000 | 12% | 12% | +1% ▲ |
| Complete signup | 8,000 | 67% | 8% | -2% ▼ |
| Activate | 5,000 | 62% | 5% | +3% ▲ |
| Pay | 2,000 | 40% | 2% | +0.5% ▲ |

### Key Findings
- Referral users convert 4x better than organic
- Signup completion dropped 2% — investigate form changes
- Activation improved after new onboarding flow
```
