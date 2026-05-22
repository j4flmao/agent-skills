# Scoring Models

## RICE Scoring Details

### Reach Estimation

#### Methods
```
Active users: Feature affects X% of MAU × MAU count
Traffic analysis: X% of visitors hit this page/flow
User segment: X users in target segment
Request data: X users requested this feature

Scale:
  10,000+ users → 10 (massive)
  2,000-9,999  → 5 (large)
  500-1,999    → 2 (medium)
  100-499      → 1 (small)
  <100         → 0.5 (niche)
```

#### Effort Estimation

#### Person-Months
```
1 person-month = 1 engineer × 4 weeks (full-time)

Definition breakdown:
  Small: 0.5-1 person-month (few days to 1 week)
  Medium: 2-3 person-months (2-4 weeks)
  Large: 4-6 person-months (1-2 months)
  X-Large: 7+ person-months (2+ months)
```

#### Confidence Scoring

##### Confidence Levels
```
100% (1.0): Proven with experiment data
  - A/B test on this specific feature showed results
  - Historical data from identical change

80% (0.8): Strong data support
  - Analytics data confirms this pattern
  - User research supports hypothesis

50% (0.5): Educated guess
  - Team's experience and intuition
  - Industry benchmarks and patterns

20% (0.2): Low confidence
  - Limited data available
  - New domain for the team
```

### RICE Calculator Template

```
Feature | Reach | Impact | Confidence | Effort | Score
--------|-------|--------|------------|--------|------
Login SSO | 8000 | 2 | 0.8 | 3 | 4267
In-app chat | 5000 | 3 | 0.5 | 4 | 1875
Dark mode | 2000 | 1 | 0.8 | 1 | 1600
Dashboard export | 1500 | 2 | 0.5 | 1 | 1500
Notifications | 3000 | 1.5 | 0.8 | 3 | 1200
```

## Kano Scoring

### Survey Template

```
For each feature, ask:

1. If [feature] is available, how do you feel?
   Like / Expect / Neutral / Tolerate / Dislike

2. If [feature] is NOT available, how do you feel?
   Like / Expect / Neutral / Tolerate / Dislike
```

### Classification Table

```
Feature Present → | Like | Expect | Neutral | Tolerate | Dislike
Feature Absent ↓  |      |        |         |          |
Like              |  Q   |   D    |    D    |    D     |   P
Expect            |  R   |   I    |    I    |    I     |   M
Neutral           |  R   |   I    |    I    |    I     |   M
Tolerate          |  R   |   I    |    I    |    I     |   M
Dislike           |  R   |   R    |    R    |    R     |   Q

M = Must-be (Basic)
P = Performance
D = Delightful (Attractive)
I = Indifferent
R = Reverse
Q = Questionable (suspicious response)
```

### Scoring Output

```
Feature       | M%  | P%  | D%  | I%  | Category
-------------|-----|-----|-----|-----|---------
Login via SSO | 70% | 15% |  5% | 10% | Must-be
Dark mode    |  5% | 10% | 60% | 25% | Delightful
File sharing | 20% | 55% | 15% | 10% | Performance
Export to PDF| 10% | 10% | 20% | 60% | Indifferent
```

## Opportunity Scoring

### Survey Questions

```
Importance:
  "On a scale of 1-10, how important is solving [problem]?"
  1 = Not at all important
  10 = Extremely important

Satisfaction:
  "On a scale of 1-10, how satisfied are you with
   the current solution for [problem]?"
  1 = Completely dissatisfied
  10 = Completely satisfied
```

### Calculation

```
Problem | Importance (I) | Satisfaction (S) | I - S | Score = I + max(I-S, 0)
--------|---------------|-----------------|-------|-----------------------
Slow search | 9 | 3 | 6 | 15
Complex setup | 8 | 4 | 4 | 12
No mobile app | 7 | 2 | 5 | 12
Limited storage | 6 | 5 | 1 | 7
No dark mode | 4 | 7 | -3 | 4
```

### Priority Matrix

```
High Importance + Low Satisfaction = HIGHEST priority
High Importance + High Satisfaction = Maintain
Low Importance + Low Satisfaction = Monitor
Low Importance + High Satisfaction = Low priority
```

## ICE Framework

### Dimensions
```
Impact: How big is the expected impact?
  Scale: 1-10
  - 10 = Transformational
  - 7-9 = Significant
  - 4-6 = Moderate
  - 1-3 = Small

Confidence: How sure are we?
  Scale: 1-10
  - 10 = Absolute certainty
  - 7-9 = High confidence
  - 4-6 = Medium confidence
  - 1-3 = Guess

Ease: How easy is implementation?
  Scale: 1-10
  - 10 = Trivial (hours)
  - 7-9 = Easy (days)
  - 4-6 = Medium (weeks)
  - 1-3 = Hard (months)
```

### Calculation
```
ICE Score = (Impact × Confidence × Ease) / 10

Example:
  Feature: Add social login
  Impact: 7
  Confidence: 9  
  Ease: 8
  Score: (7 × 9 × 8) / 10 = 50.4
```
