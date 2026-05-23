# Onboarding Patterns

## Onboarding Patterns Overview

| Pattern | Best For | Time Investment | Complexity |
|---------|----------|----------------|------------|
| Guided wizard | Complex products | 5-15 min | High |
| Product tour | Feature-rich products | 2-5 min | Medium |
| Checklist | Goal-oriented products | Ongoing | Low |
| Empty state | Content creation products | 1-2 min | Low |
| Sample data | Analytics/BI tools | Automated | Medium |
| Video walkthrough | Any product | 1-3 min | Low |
| Interactive demo | Sales-led products | 5-10 min | High |
| Progressive disclosure | Mobile, simple tools | Continuous | Low |

## Guided Wizard Pattern

### Structure
```
Step 1: Who are you? (role, company size, industry)
Step 2: What do you want to do? (goal selection)
Step 3: Connect your tools (integrations)
Step 4: See your results (first value)
```

### Implementation
```javascript
const wizardSteps = [
  { id: 'profile', component: ProfileStep, validation: validateProfile },
  { id: 'goals', component: GoalsStep, validation: validateGoals },
  { id: 'integrations', component: IntegrationsStep, optional: true },
  { id: 'results', component: ResultsDashboard, final: true }
];
```

### Key Principles
- Show progress (step X of Y)
- Allow skipping optional steps
- Save progress (don't lose on refresh)
- Show value after each step
- Default selections where possible

## Checklist Pattern

### Design
```json
{
  "checklist": [
    {"id": 1, "task": "Create your first project", "done": false, "link": "/projects/new"},
    {"id": 2, "task": "Invite a team member", "done": false, "link": "/settings/team"},
    {"id": 3, "task": "Set up your first integration", "done": false, "link": "/integrations"},
    {"id": 4, "task": "Run your first report", "done": false, "link": "/reports/new"}
  ],
  "progress": "25% complete"
}
```

### Best Practices
- 4-7 items max
- Progressive difficulty (easy first)
- Celebratory animation on completion
- Lifetime access (don't auto-dismiss)
- Link directly to the action

## Empty State Pattern

### Before (useless)
```
[Your projects will appear here]
```

### After (actionable)
```
┌─────────────────────────────────────┐
│  Get started with your first project │
│                                     │
│  [Create Project]  [Explore Demo]   │
│                                     │
│  Or import from: Asana │ Trello │ CSV│
└─────────────────────────────────────┘
```

### Empty State Anatomy
```
1. Icon/illustration (contextual)
2. Short headline (benefit-focused)
3. Brief description (what to do)
4. Primary CTA button (lowest friction)
5. Secondary action (optional)
6. Learn more link (if complex)
```

## Progressive Disclosure Pattern

### Principle
Show only what's needed now. Hide advanced features until user is ready.

### Implementation
```
Phase 1 (Day 1): Core action only
  - Create, view, edit basic items
  - No settings, no configuration needed

Phase 2 (Week 1): Discover features
  - Tooltips highlighting advanced features
  - "Did you know?" tips after actions

Phase 3 (Week 2+): Full power
  - Keyboard shortcuts revealed
  - Advanced settings accessible
  - Automation and integrations
```

## Measuring Success

| Metric | Target | When to Measure |
|--------|--------|-----------------|
| Onboarding completion | >60% | Per session |
| Time to first value | <5 min | Per user |
| Activation rate | >25% | Day 7 |
| Drop-off per step | <20% each | Per step |
| Support tickets during onboarding | <1% | Day 1-7 |
| NPS after onboarding | >40 | Day 7 |

## Pattern Selection Guide

```
Product complexity?
├── Simple (1-2 core actions)
│   └── Empty state + progressive disclosure
├── Medium (3-5 core actions)
│   ├── Goal-oriented? → Checklist
│   └── Needs demo? → Product tour + empty states
└── Complex (many features, configurable)
    ├── Guided wizard (start)
    └── Checklist + progressive disclosure (ongoing)
```
