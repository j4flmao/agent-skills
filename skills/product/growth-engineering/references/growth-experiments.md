# Growth Experiments

## Experiment Lifecycle

### Hypothesis Formation
```
If [change], then [metric] will [change] by [amount] because [reason].

Example:
If we add social sharing to onboarding flow,
then referral rate will increase by 15%
because new users will share with their network.
```

### Experiment Design
```
Ice Box → Hypothesis → Design → Build → Launch → Analyze → Decide → Ship/Kill
```

## Growth Loops

### Viral Loop
```
User Joins → Invites Friends → Friends Join → Friends Invite More
```

### Engagement Loop
```
User Returns → Completes Action → Gets Value → Returns More
```

### Paid Loop
```
Spend → Acquire User → User Generates Revenue → Reinvest in Spend
```

## Metrics Framework

### AARRR (Pirate Metrics)
| Stage | Metric | Target |
|-------|--------|--------|
| Acquisition | New users, installs, visits | Cost per acquisition < $5 |
| Activation | First key action completed | Activation rate > 60% |
| Retention | D1, D7, D30 return rate | D7 > 40%, D30 > 20% |
| Revenue | ARPU, LTV, conversion rate | LTV:CAC > 3:1 |
| Referral | Invites sent, conversion rate | Viral coefficient > 1.0 |

### Experiment Impact Measurement
```typescript
interface ExperimentResult {
  variant: string
  users: number
  conversion: number
  lift: number  // relative %
  significance: number  // p-value
  confidence: number  // %
  recommendation: 'launch' | 'iterate' | 'kill'
}
```

## Experiment Types

### Activation Experiments
- Simplify signup flow (reduce fields, social login)
- Better first-run experience (onboarding wizard)
- Immediate value demonstration (sample data, templates)

### Retention Experiments
- Push notifications and email re-engagement
- Personalization based on usage patterns
- Goal tracking and progress visualization

### Monetization Experiments
- Pricing page optimization
- Trial-to-paid conversion improvements
- Upgrade prompts at value moments

### Referral Experiments
- Incentive structure (double-sided rewards)
- Share message optimization
- Referral entry points in user journey

## Analysis Framework

### Decision Criteria
| Signal | Action |
|--------|--------|
| p < 0.05, positive lift | Launch |
| p < 0.05, negative lift | Kill |
| p >= 0.05, promising trend | Iterate or extend |
| No movement | Kill, reallocate resources |

### Guardrail Metrics
- Monitor secondary metrics for negative impact
- Set maximum acceptable degradation per metric
- Stop experiment if guardrails breached
