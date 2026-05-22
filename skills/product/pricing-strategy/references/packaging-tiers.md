# Packaging and Tiers

## Tier Design Principles

### Feature Differentiation
Free → Pro → Enterprise
```
Free: Core features, limited usage, basic support
Pro: Full features, increased limits, priority support
Enterprise: Everything, unlimited, SSO, SLA, dedicated support
```

### Gating Strategy
Gate features that:
- Are valuable enough to pay for
- Don't break the core experience if removed
- Drive upgrade motivation
- Don't create negative network effects

### Do NOT Gate
```
Core value proposition (what users signed up for)
Security features (basic encryption, authentication)
Data export (users own their data)
Support (at least email/channel)
```

## Tier Structure

### 3-Tier Model (Recommended)

#### Free Tier
```
Goal: Acquisition and adoption
Length: Unlimited (time), Limited (features/usage)
Typical limit: N users, N projects, basic features
Example limits:
  1-5 users
  2 projects
  100MB storage
  Community support
```

#### Pro / Premium Tier
```
Goal: Primary revenue driver
Pricing: $15-99/month (typical SaaS)
Features: All core features unlocked
Usage limits: Significantly higher (10-100x free)
Support: Priority email, chat, standard SLA
```

#### Enterprise Tier
```
Goal: High-value accounts
Pricing: Custom ($500+/month)
Features: Advanced (SSO, audit logs, compliance)
Usage limits: Custom/unlimited
Support: Dedicated CSM, phone, 99.9% SLA
```

## Feature Packaging

### Feature Buckets
```
Table Stakes (Free):
  Core product functionality
  Basic integrations (2-3)
  Community support
  Standard security

Growth Features (Pro):
  Advanced functionality
  All integrations
  Priority support
  Analytics and reporting

Enterprise Features:
  SSO/SAML
  Audit logs
  Custom integrations
  Dedicated support
  SLA guarantees
  Compliance (SOC2, HIPAA)
  Custom contracts
```

### Packaging Rules
```
Each tier should offer 5-8 differentiating features
Higher tier = all lower features + new ones
Features should be clearly understandable
Avoid feature bloat (too many options = paralysis)
Use feature comparison table on pricing page
```

## Add-On Pricing

### Common Add-Ons
```
Additional users: $X/user/month
Extra storage: $X/GB/month
Premium support: $X/month per seat
Advanced analytics: $X/month
API access: $X/1k requests
Training/onboarding: $X one-time
```

## Pricing Page Design

### Layout
```
Header: Clear value proposition
Tier comparison: 3 columns side-by-side
Feature comparison: Full table below pricing
CTA: "Start free trial" or "Get started"
FAQ: Common pricing questions answered
```

### Conversion Elements
```
Most popular badge on middle tier
Annual billing with 15-20% discount
Feature comparison hover tooltips
Social proof (customer logos by tier)
Money-back guarantee (30 days)
```

## Migration Path

### Upgrade
```
Instant access to new features
Prorated billing for partial months
Feature notifications on upgrade
Onboarding for new features
```

### Downgrade
```
Effective next billing cycle
Data preserved during downgrade
Reactivation within 90 days retains data
Feature gating removes access on downgrade
```

### Grandfathering
```
Existing customers keep current pricing
New pricing applies to new customers only
Advance notice (30+ days) for price changes
Option to switch to new pricing if better
```
