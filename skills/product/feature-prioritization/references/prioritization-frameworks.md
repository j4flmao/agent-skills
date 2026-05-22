# Prioritization Frameworks

## Framework Comparison

### When to Use Each
```
RICE:
  — Quantitative data available
  — Need to compare across different types of work
  — Team comfortable with estimation
  Best for: Data-informed product teams

Kano Model:
  — Customer satisfaction is primary goal
  — Need to differentiate must-haves from delighters
  — User research data available
  Best for: Feature differentiation and innovation

MoSCoW:
  — Tight deadline with stakeholders
  -– Need to manage scope and expectations
  — Multiple stakeholders with competing priorities
  Best for: Time-constrained releases

Opportunity Scoring:
  — Focused on solving user problems
  — User research and satisfaction data available
  — Need to quantify pain points
  Best for: User-centered design teams

ICE:
  — Fast-paced growth experiments
  -– Need quick prioritization
  — Confidence in estimates across team
  Best for: Growth teams
```

### Selection Matrix
```
Scenario                  | Recommended Framework
Quantitative data exists  | RICE
User satisfaction focus   | Kano Model
Stakeholder alignment     | MoSCoW
Problem-solving focus     | Opportunity Scoring
Growth experiments        | ICE
Mixed priority types      | RICE (combine dimensions)
```

## RICE Framework

### Dimensions
```
Reach: How many users will this affect in a given time period?
  — Number of users per month or quarter
  — Use actual data, not guesses

Impact: How much will this affect each user?
  Scale: 3 (massive), 2 (high), 1 (medium), 0.5 (low), 0.25 (minimal)
  -– Calibrate across the team to ensure consistency

Confidence: How confident are we in our estimates?
  Scale: 100% (data proven), 80% (strong data), 50% (educated guess),
         20% (guesstimate), 0.2% (wild guess)

Effort: How much time will this take?
  — Person-months (total team effort)
  — Include design, engineering, QA, release
```

### Calculation
```
RICE Score = (Reach × Impact × Confidence) / Effort

Example:
  Feature: In-app notifications
  Reach: 5,000 users/month
  Impact: 2 (high)
  Confidence: 80% (0.8)
  Effort: 2 person-months
  Score: (5000 × 2 × 0.8) / 2 = 4000
```

## Kano Model

### Categories
```
Basic Needs (Must-be):
  — Table stakes, expected by users
  — Dissatisfaction if absent
  — Satisfaction doesn't increase with more
  Examples: Login, security, reliable performance

Performance Needs (One-dimensional):
  — Linear relationship with satisfaction
  — Explicitly requested by users
  — More is better
  Examples: Speed, storage, features

Delightful Needs (Attractive):
  — Unexpected, creates delight
  — High satisfaction if present
  -– No dissatisfaction if absent
  Examples: Gamification, animations, surprises

Indifferent:
  -– No impact on satisfaction either way

Reverse:
  — Some users want it, others don't
  — Can cause dissatisfaction
```

### Classification Method
```
Ask two questions per feature:
1. How would you feel if this feature is present?
2. How would you feel if this feature is absent?

Scale: Like, Expect, Neutral, Tolerate, Dislike

Map answers to category based on combination
Requires 20-30 survey responses per feature
```

## MoSCoW Method

### Categories
```
Must Have (P0):
  — Critical for current release
  — Without it, release has no value
  — Non-negotiable
  Typically 20-30% of scope

Should Have (P1):
  — Important but not critical
  — Can be delivered without
  -– May need workaround
  Typically 20-30% of scope

Could Have (P2):
  — Nice to have if time permits
  -– Lower impact
  -– Easy to defer
  Typically 20-30% of scope

Won't Have (P3):
  -– Explicitly excluded from current scope
  — Documented for future consideration
  — Important to manage expectations
  Typically 10-20% of scope
```

### Process
```
1. List all features/requirements
2. Stakeholders assign initial priority
3. Discuss disagreements and trade-offs
4. Finalize priority per feature
5. Estimate effort for Must + Should
6. If over capacity, move items down
7. Lock scope for current cycle
```

## Opportunity Scoring

### Dimensions
```
Importance: How important is solving this problem?
  Scale: 1-10 (user rating)
  — Survey users: "How important is [problem]?"

Satisfaction: How satisfied are users with current solution?
  Scale: 1-10 (user rating)
  — Survey users: "How satisfied are you with current [solution]?"
```

### Calculation
```
Opportunity Score = Importance + max(Importance - Satisfaction, 0)

This amplifies problems that are both important and poorly solved.
Example:
  Importance: 8/10
  Satisfaction: 3/10
  Score: 8 + (8-3) = 13 (high opportunity)
```
