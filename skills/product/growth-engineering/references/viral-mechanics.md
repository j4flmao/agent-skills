# Viral Mechanics

## Viral Loop Types

| Loop Type | Example | K-Factor Potential | Implementation Complexity |
|-----------|---------|-------------------|--------------------------|
| Inherent | Sharing a doc in Google Docs | High (>1.0) | Low (built into product use) |
| Incentivized | Dropbox referral program | Medium (0.5-1.5) | Medium |
| Network effect | Slack team invites | High (>1.0) | Low (byproduct of team product) |
| Content sharing | TikTok video share | Very High (>2.0) | Medium |
| Social proof | "X friends use this" | Low (<0.5) | Low |
| Collaboration | Figma multi-player | High (>1.0) | High (requires real-time features) |

## K-Factor Calculation

### Formula
```
K-factor = invitation_rate × conversion_rate

invitation_rate = invites sent per user / total users
conversion_rate = accepted invites / total invites sent

K > 1.0: Viral growth (each user brings >1 new user)
K = 1.0: Linear growth
K < 1.0: Decaying growth
```

### Example Metrics
```
Users: 10,000
Invites sent: 5,000 (0.5 invites per user)
Invites accepted: 1,500 (30% conversion)

K = 0.5 × 0.3 = 0.15
→ For every 100 users, 15 new users join
→ Growth decays without other channels
```

## Viral Cycle Time

### Components
```
Creation: Time for user to experience value and want to share
Distribution: Time to share and recipient to see it
Conversion: Time from seeing to signing up
Activation: Time from signup to experiencing value
```

### Optimization
```
Cycle time = creation + distribution + conversion + activation
Target: <24 hours total

If cycle time is long (>7 days):
- Reduce friction in sharing (one-click vs copy link)
- Speed up value delivery (instant value vs setup required)
- Improve notification delivery (email vs in-app, push vs pull)
```

## Inherent Viral Loops

### Collaboration-Based
```yaml
product: "document editor"
loop:
  - User creates document
  - User adds collaborator (to edit or view)
  - Collaborator receives invite and signs up
  - Collaborator creates their own document
  - Loop repeats
key_metric: "invites_per_creator"
target: ">2 invites per creator in first week"
```

### Content Sharing
```yaml
product: "design tool"
loop:
  - User creates design
  - User exports/shows design publicly
  - Viewer sees "Made with Product" branding
  - Viewer signs up to create their own
key_metric: "public_exports_per_user"
target: ">1 public export per active user"
```

## Incentivized Referral Programs

### Design Principles
```
Value: Both referrer and referee get value
Simplicity: One click to share
Tracking: Clear attribution (link, code)
Friction: Low barrier to claim reward
Timing: Offer at moment of peak satisfaction
```

### Dropbox-Style Program
```
Referrer gets: +500 MB storage per referral (up to 16 GB)
Referee gets: +500 MB storage on signup
Share mechanism: Email invite or share link
Attribution: Unique referral link per user
Reward delivery: Automatic on signup + install
```

## Measuring Viral Growth

### Key Metrics
```
K-factor: Users invited × conversion rate (daily/weekly)
Viral cycle time: Hours from invite to conversion
Invitation rate: Invites sent / total active users
Conversion rate: Accepted invites / invites sent
Cohort analysis: Inviters vs non-inviters (retention, engagement)
```

### Dashboard
```python
viral_metrics = {
    "daily_active_users": 50000,
    "invites_sent": 25000,
    "invites_accepted": 7500,
    "invitation_rate": 0.5,
    "conversion_rate": 0.3,
    "k_factor": 0.15,
    "cycle_time_hours": 48,
    "virality_score": 0.35,  # composite: K × (24/cycle_time)
}
```

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Incentive fraud | High signups, low retention | Verify quality; delayed rewards |
| Spam perception | Low conversion, complaints | Make sharing contextual, not pushy |
| Wrong timing | Low invitation rate | Trigger at "wow moment" not signup |
| Poor onboarding | Low activation after signup | Improve first-time experience |
| Over-incentivize | High cost per acquisition | Cap rewards, reduce over time |
