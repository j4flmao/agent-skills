# Persona-Driven Product Design

## Overview

Persona-driven product design places user personas at the center of every product decision — from discovery and ideation through design, development, validation, and iteration. Rather than designing for an abstract "user" or oneself, teams design for specific, research-grounded personas with distinct goals, needs, and behaviors. This reference covers the full lifecycle: creation, application, measurement, and evolution.

## Persona-Driven Design Process

### Workflow

Research → personas → empathy maps → scenarios → design → prototype → test (recruit matching profiles) → build (persona-driven AC, QA with scenarios) → launch (persona messaging) → measure (persona metrics) → iterate.

### Research → Design

"Ops managers spend 4 hrs/week reconciling" → manual data reconciliation pain → auto-sync feature.
"Marketing presents reports to C-suite every Monday" → executive reporting goal → one-click PDF export.
"Freelancers evaluate by time-to-first-value" → trial-driven behavior → wizard with template.

### Design → Validation

Feature: Bulk import. Scenario: Sarah imports 500 CRM records. Criteria: <30sec upload, >90% mapping accuracy, <2 clicks to fix errors. Test: 5 ops managers, measure time + errors + satisfaction.

## Creating Actionable Personas

### Archetypes vs Personas

| Dimension | Archetype | Persona |
|-----------|-----------|---------|
| Basis | Behavioral patterns | Research data |
| Specificity | Abstract, universal | Concrete, specific |
| Research required | Minimal | Extensive (interviews, analytics, surveys) |
| Application | Early ideation, alignment | Design decisions, prioritization, testing |
| Example | "The power user" | "Sarah, 34, Ops Manager at 50-person SaaS company" |

### Segmentation Approaches

**Goal-based:** Segment by what users want to accomplish. "Grow email list" vs "Analyze campaign performance" → different personas.

**Behavior-based:** Segment by product interaction. "Daily power users" vs "Weekly report consumers" → different behavioral patterns.

**Needs-based:** Segment by unmet needs. "Needs better analytics" vs "Needs easier collaboration" → richest source of differentiation.

**Attitude-based:** Segment by mindset. "Early adopters" vs "Pragmatists" vs "Skeptics" → informs messaging and onboarding.

**Jobs-to-be-Done:** Segment by the progress users want to make. Cuts across demographics, reveals functional + emotional + social dimensions.

### Persona Anatomy

**Name + Tagline:** "Sarah — I need accurate data." [photo]
**Demographics:** Age, location, education, job title, company size, tech proficiency
**Goals:** Primary (must achieve), Secondary, Personal (how they want to feel)
**Needs:** What the product must provide — auto sync, customizable dashboards
**Pain Points:** Frustrations, obstacles, severity + frequency
**Behaviors:** Daily/weekly/monthly actions, discovery, evaluation, decision patterns
**Motivations:** Efficiency, accuracy, control, recognition (with intensity %)
**Context:** Tools, environment, collaborators, constraints
**Quote:** Verbatim from research
**Sources:** Interviews (n), survey (n), analytics period

**What to exclude:** Info not informing design (favorite color, unrelated hobbies), stereotypes, unsupported assumptions, non-research quotes.

## Empathy Mapping

### Components

**THINKS:** Private doubts — "This is probably too expensive"
**SAYS:** Explicit statements — "I need an enterprise solution"
**DOES:** Observable behaviors — opens competitor site after demos
**FEELS:** Emotional state — frustrated by manual work, anxious about accuracy
**PAINS:** Fears, obstacles — manual sync, can't trust accuracy
**GAINS:** Aspirations — accurate data, faster reports, recognition

### From Research

"I export data into a spreadsheet, spend hours reconciling" → **DOES:** manual export
"My boss asks if data is accurate, I'm never 100% sure" → **THINKS:** uncertainty, **FEELS:** anxiety
"Found a mistake after board report, embarrassing" → **FEELS:** embarrassment, **PAIN:** real consequences
"When things work, I feel on top of things" → **GAIN:** control and competence

### Common Mistakes

| Mistake | Fix |
|---------|-----|
| Says = Thinks (losing the gap) | Differentiate public vs private |
| Generic statements | "Wants good UX" → "Wants one-click export" |
| All pains, no gains | Balance aspirations alongside frustrations |
| Assumptions as facts | Base on specific quotes and observations |
| No contradictions | Surface tensions between words and actions |
| One-time artifact | Display in workspace, update with new research |

## Journey Mapping

### Current-State vs Future-State

**Current-state:** Documents existing experience — what users actually do with current tools. Grounded in research.

**Future-state:** Visualizes ideal experience with your product. Shows opportunities and desired end state.

```
Current-state journey: "Weekly campaign report"

Stage     | 1. Realize need | 2. Gather data      | 3. Create report | 4. Present
----------|-----------------|---------------------|------------------|---------------
Actions   | CMO asks Mon AM | Export from 3 tools | Build slides     | Share in meeting
          |                 | Paste into Excel    | Format charts    | Answer questions
Touchpoints | Slack, email | Salesforce, Excel   | PowerPoint       | Conference room
Thoughts  | "Here we go"   | "Why doesn't this   | "Formatting takes| "Hope I didn't
          |                |  sync?"             |  longer than     |  miss anything"
          |                |                     |  analysis"       |
Feelings  | Resigned (3)   | Frustrated (2)      | Tedious (3)      | Nervous (5)
Opportunities | Pre-scheduled | Auto data sync   | Report templates | Live dashboard
            | reporting    | Single source of truth| One-click export | Interactive
```

### Components

**Phases/stages** → **Actions** → **Touchpoints** → **Thoughts** → **Feelings** (score 1-10) → **Pain points** → **Opportunities** → **Metrics**

### Touchpoint Analysis

```
Touchpoint      | Score | Pain  | Priority | Opportunity
----------------|-------|-------|----------|--------------------
Signup form     | 6/10  | Med   | High     | Reduce 8 fields to 4
Onboarding      | 4/10  | High  | High     | Interactive wizard
First report    | 3/10  | High  | Critical | Guided template
Data import     | 2/10  | V high| Critical | Auto-mapping CSV
Billing portal  | 7/10  | Low   | Low      | N/A (working well)
```

### Emotion Curves

Plot emotional highs and lows. The deepest pain points are the biggest opportunities.

### Opportunities Identification

```
Pain → Opportunity → Feature → Validation

"Spends 4+ hours manually reconciling data"
  → Eliminate manual data gathering
  → Automated data connector with scheduled sync
  → "Would you use a tool that auto-syncs your data into a unified dashboard?"

"Anxious about presenting inaccurate data to leadership"
  → Build confidence in data accuracy
  → Data quality score with anomaly detection
  → "If the dashboard showed a data confidence score, would that help?"

"Report formatting takes longer than analysis"
  → Eliminate formatting busywork
  → One-click executive report with brand template
  → "Would pre-built report templates save you time?"
```

## Service Blueprinting

### Frontstage vs Backstage

Blueprints extend journey maps by showing behind-the-scenes processes.

```
User action: Export report as PDF
  Frontstage: Click "Export" button, see progress bar, download file
  Backstage: Report generation job runs, PDF rendered, permissions checked
  Supporting: Report generator service, storage service, auth service

User action: Share dashboard link
  Frontstage: Click "Share", enter email, set permissions, send
  Backstage: Link generated, permissions persisted, email notification sent
  Supporting: Sharing service, notification service, permission service
```

### Blueprint Components

**Physical evidence** → **User actions** → **Frontstage interactions** → **Backstage interactions** → **Supporting processes** → **Supporting systems**

### Analysis Questions

For each step: Is this necessary? What happens on failure? How does it feel for the persona? Could it be automated? What are the dependencies? What's the single point of failure?

## Persona Prioritization

### Primary, Secondary, Anti-Personas

| Type | Role | Number | Design approach |
|------|------|--------|-----------------|
| Primary | Main target | 1 | Optimize everything for their needs |
| Secondary | Additional users | 1-3 | Accommodate without compromising primary |
| Anti-persona | Explicitly NOT target | 1-2 | Actively avoid designing for them |

**Decision rule:** If a feature helps primary but hurts secondary, build it. If it helps secondary but hurts primary, don't. If it would benefit anti-persona, question why it's being considered.

### Persona Matrix

```
Feature                     | Sarah (Primary) | Alex (Secondary) | Dev (Anti)
----------------------------|-----------------|------------------|---------------
Automated data sync         | 3 (Essential)   | 2 (Helpful)      | 0 (Irrelevant)
Custom dashboard            | 2 (Important)   | 3 (Essential)    | 0 (Irrelevant)
Executive summary report    | 1 (Nice)        | 3 (Essential)    | 0 (Irrelevant)
API access                  | 0 (Indifferent) | 1 (Nice)         | 3 (Essential)
Raw data export             | 0 (Indifferent) | 0 (Indifferent)  | 3 (Essential)

Weighted score = (Primary × 0.6) + (Secondary × 0.3) + (Anti × -0.1)

Feature                     | Weighted
Automated data sync         | 2.4
Custom dashboard            | 2.1
Executive summary report    | 1.5
Role-based permissions      | 1.6
API access                  | 0.3
Raw data export             | -0.3
```

### Conflict Resolution

1. Identify the conflict: "Sarah needs simplified workflows. Alex wants deep customization."
2. Score by persona priority (Primary 0.6, Secondary 0.3)
3. Evaluate options:
   - Option A (optimize for Sarah): Sarah +3, Alex -1 → net 1.5
   - Option B (optimize for Alex): Sarah -1, Alex +3 → net 0.3
   - Option C (tiered): Sarah +2, Alex +2 → net 1.8
4. Select highest-scoring option → C (tiered approach)
5. Validate with testing for both personas

## Scenario-Based Design

### Context Scenarios

Describe the broader situation — the "why" before the "how."

```
Scenario: Sarah, Monday morning, weekly ops report due by 11am.
  Context: Data across 4 systems. CMO wants one-page summary.
  Last week: found error after sending — embarrassing.
  Needs: single view, accurate data, quick export, anomaly detection, <30 min.
  
This informs: why auto-sync matters, why validation matters, why one-click export matters.
```

### Key Path Scenarios

The most common or critical path, which must work flawlessly.

```
Key path: Sarah imports her first dataset
  Given: Sarah just signed up, on onboarding screen
  When: She clicks "Import your data"
  Then: System asks her to upload CSV
  When: She selects file
  Then: System previews data with suggested field mappings
  When: She confirms mapping
  Then: System imports 500 records, shows success, navigates to dashboard

Requirements: CSV upload, parser, field mapping UI, import engine, error handling
Testing: <3 min completion, >90% mapping accuracy, zero data loss
```

### Validation Scenarios

Specific test cases for usability testing with persona-appropriate participants.

```
"Sarah needs to customize her dashboard"
  Task description + success criteria (completion rate >80%, time <3 min)
  Measurement: task completion, time, errors, satisfaction (>4/5)
```

## Storytelling with Personas

### Narrative Techniques

**Setup:** "Sarah is an ops manager at a 100-person SaaS company. Monday, 8:30 AM."
**Conflict:** "CMO just asked for the ops report. Data across 4 systems. Last time numbers were wrong."
**Resolution:** "What if Sarah opened a dashboard with all data synced, validated, ready to present?"
**Emotional arc:** Dread → frustration → relief → confidence.

**Hooks:** Starting quote ("I spend more time proving my data is right than using it"), visual moment ("Imagine Sarah's face when it just works"), contrast ("This week: 20 min. Last week: 4 hours").

### Day-in-the-Life

```
Sarah's day (product-relevant moments):
  8:30 AM — Arrives. 47 emails. CMO Slack: "Can we review ops numbers before 11 AM?"
  8:35 AM — Opens dashboard. Data synced at 2 AM — fresh.
  8:40 AM — Spots anomaly: support tickets up 30%. Investigates.
  8:55 AM — Flags anomaly with support lead via Slack.
  9:15 AM — Exports ops summary as PDF. 30 seconds.
  9:20 AM — Reviews PDF. Looks good. Sends to CMO.
  11:00 AM — Ops review. CMO: "Great report. The anomaly flag was helpful."
  11:30 AM — Feeling good. Productive morning.
```

### Using Stories in Design Reviews

```
Persona story in critique:
"We're reviewing the new dashboard. Let's consider Sarah's story:
  Monday morning. She has 30 minutes. Opens dashboard for first time this week.
  
  Can she find key metrics in 10 seconds?
  Can she tell at a glance if anything needs attention?
  Can she export with one click?
  
  If 'no' to any of these, we have a problem."
```

## Design Studios

### Persona-Based Ideation

Time-boxed, collaborative sessions with persona focus.

```
Format (2-3 hours):

I. Warm-up (15 min) — Review persona, design challenge
II. Individual ideation (20 min) — 6-8 sketches per person
III. Present and critique (30 min) — "Would Sarah use this?"
IV. Small group concepts (30 min) — Combine best ideas into flows
V. Group presentations (30 min) — Critique through persona lens
VI. Synthesis (15 min) — Dot vote, identify concepts to prototype
```

### Ideation Prompts by Persona

```
For Sarah (efficiency-focused):
"How might we reduce data reconciliation from 4 hours to 5 minutes?"
"How might we eliminate manual data entry entirely?"
"How might Sarah complete her weekly report in under 15 minutes?"

For Alex (insight-focused):
"How might Alex share campaign insights without data duplication?"
"How might Alex customize her dashboard without technical skills?"
"How might Alex create reports showing campaign ROI the way her VP wants?"
```

### Critique Frameworks

**Evaluate each design concept:**
1. **Persona alignment:** Which persona does this serve? Help or harm others?
2. **Goal achievement:** Does it help achieve primary goal? How many steps?
3. **Cognitive load:** Would persona understand immediately? Match their mental model?
4. **Emotional response:** How would they feel at each step?
5. **Feasibility:** Can we build this? What's the simplest validation?

**Feedback format:** "I like...", "I wonder...", "What if...", "For Sarah..."

## User Story Mapping

### Persona-Driven Story Mapping

Organize stories by persona journey, not technical component.

```
Backbone: Set up account → Connect data → View metrics → Analyze → Export/share

Release 1 (MVP — Sarah's essential path):
  Sign up → Import CSV → View metrics → Filter/sort → Export PDF

Release 2 (Sarah's workflow):
  Auto-sync from CRM → Custom dashboard → Schedule report delivery

Release 3 (Alex's secondary needs):
  Connect ad platform → Share dashboard link

Release 4 (Platform):
  SSO → Advanced filtering → API access
```

### Narrative-Driven Backlogs

Structure releases as increasing value for the persona.

```
Release 1: "Sarah can get started" — sign up, import, view, export
Release 2: "Sarah can save time" — auto-sync, custom dashboard, schedule, alerts
Release 3: "Sarah can collaborate" — share, permissions, comments
Release 4: "Sarah can analyze deeply" — custom metrics, trends, period comparison, AI insights
```

### Sprint Persona Balance

```
Target: 60-70% primary persona stories, 20-30% secondary, 0% anti, 10% platform
If primary drops below 50%, sprint is off-track — add primary stories, defer secondary
```

## Persona Validation

### Testing Assumptions

Personas are hypotheses — test them like any product assumption.

```
Hypothesis: "Sarah manually reconciles data across multiple systems."
  Validation: Analytics — do we see cross-system activity patterns?
  Threshold: >40% of target users perform cross-system data activity weekly

Hypothesis: "Sarah's primary goal is accurate, real-time data."
  Validation: Survey — users rank "data accuracy" in top 3
  Threshold: >60% rank accuracy in top 3

Timeline:
  Month 1: Analytics validation
  Month 2: Survey
  Month 3: Usability testing
  Month 6: Full persona audit with interviews
```

### Iterating Personas

```
Version 1.0 (Jan 2024) — Initial, 8 interviews
  Key insight: Manual reconciliation is primary pain point

Version 1.1 (Mar 2024) — Survey (n=142)
  Refined demographics (median company size: 50-200, not 10-50)
  Added: 68% also use BI tools; Secondary motivation: career growth

Version 2.0 (Jan 2025) — Major update, 12 new interviews
  Split: "Operations Manager" → "Operational Sarah" (60%) and "Strategic Sarah" (40%)
  Rationale: Distinct behavioral patterns couldn't be served by one persona
```

### A/B Testing Persona-Driven Designs

```
Hypothesis: Persona-specific onboarding improves activation vs generic onboarding

Variants:
  Control: Generic onboarding
  Variant A: Users self-select role, get tailored experience

Results:
  Metric         | Control | Variant A
  7-day activation | 10%    | 14% (+40% improvement)
  30-day retention | 32%    | 38%
  NPS (day 7)      | 42     | 48

Verdict: Variant A wins. Roll out persona-specific onboarding.
Persona breakdown: Sarah-like activation improved 52%, Alex-like improved 28%.
```

## Information Architecture

### Card Sorting for Personas

Different personas may organize information differently.

```
Cross-persona analysis:

Category: "Reports"
  Sarah: grouped with "Data Sources" and "Exports"
  Alex: grouped with "Dashboards" and "Analytics"

IA decision: Main nav → Campaigns, Reports, Analytics, Settings
  Within Reports: role-adaptive sub-nav
  Reports and Analytics: sibling sections (consistent across personas)
  Settings: merges Account (Sarah's expectation) and Preferences (Alex's expectation)
```

### Tree Testing

Validate that users can find information in proposed structure.

```
Task: "Where would you click to see this week's operations summary?"
  Sarah success: 92%, time: 2.1s
  Alex success: 82%, time: 3.8s

All tasks above 80% threshold → tree validated.
Areas for improvement: "Custom Reports" had 12% confusion rate.
```

### Sitemaps by Persona

Create persona-specific navigation highlighting primary flows.

```
Sarah's primary flows:
  1. Login → Dashboard → Review metrics → Export (daily)
  2. Dashboard → Alert anomaly → Investigate Reports (as needed)
  3. Settings → Team → Manage members (weekly)

Alex's primary flows:
  1. Login → Campaign Reports → Review performance (daily)
  2. Dashboard → Customize metrics → Share link (weekly)
  3. Reports → Schedule delivery → Set recipients (monthly)
```

### Navigation Design

**Options for multi-persona navigation:**
1. Role selector: user selects role at onboarding, nav adapts
2. Adaptive: nav starts generic, adapts to usage patterns
3. Configurable: user can pin/hide items, create custom sections

**Recommended:** Role selector (option 1) with customization (option 3).

## Content Strategy

### Tone of Voice by Persona

| Dimension | Sarah (Ops) | Alex (Marketing) |
|-----------|-------------|------------------|
| Tone | Direct, efficient, professional | Enthusiastic, results-oriented |
| Words | Accurate, reliable, efficient | Campaign, engagement, ROI |
| Avoid | "Revolutionary", "game-changing" | "Technical", "complex" |
| Example | "Import data. We'll validate it." | "See how your campaigns perform!" |
| Error msg | "Import failed. 3 invalid fields." | "Something went wrong. Try again." |

### Content Types by Persona

| Content | Sarah | Alex |
|---------|-------|------|
| Onboarding | "5 steps to your first report" | "Launch your first campaign report" |
| Videos | "How to connect data sources" | "How to analyze campaign ROI" |
| Case study | "How OpsCo reduced reporting time 80%" | "How GrowthCo improved ROI 40%" |
| Best practices | "Data validation strategies" | "Campaign reporting cadence" |
| FAQs | "CSV import troubleshooting" | "Campaign tracking setup" |

### Content Personalization

```
Rules:
If persona = Sarah:
  Default dashboard: Operations metrics
  Onboarding: Data import → Dashboard → Export
  Content: Data sync best practices, CSV import guide
  Tips: "Pro tip: Schedule your weekly report"

If persona = Alex:
  Default dashboard: Campaign performance
  Onboarding: Connect ad platform → Campaign dashboard → Share
  Content: Campaign analytics guide, ROI calculation
  Tips: "Pro tip: Share your dashboard with your team"
```

**Sources:** User-selected role, behavioral signals, account metadata, support context, explicit preferences.

## UI/UX Design Decisions

### Pattern Selection by Persona

| Pattern | Sarah (Ops) | Alex (Marketing) | Decision |
|---------|-------------|------------------|----------|
| Data table with inline edit | Essential | Nice to have | Build |
| Drag-and-drop dashboard | Nice to have | Essential | Conditional |
| Guided wizard | Essential | Helpful | Wizard + skip |
| Command palette (⌘K) | High use | Occasional | Build for all |
| Bulk actions | Essential | Helpful | Build for all |
| Keyboard shortcuts | Essential | Nice to have | Build, promote to Sarah |

### Interaction Design

**For Sarah (high frequency, efficiency):**
- Default views show data immediately (no loading splash)
- Common actions in 2 clicks or fewer
- Keyboard shortcuts for all common actions
- Sticky filters (state persists across sessions)
- Progressive disclosure for advanced options
- No carousels, animations that delay, or modals blocking workflow

**For Alex (moderate frequency, insight-driven):**
- Visual summaries (charts before tables)
- Storytelling (auto-generated narrative of data changes)
- Share actions prominent on every view
- Multiple export formats
- Collaborative comments and shared views
- Proactive alerts for significant changes

### Visual Design

**Sarah:** Blues/grays (professional, data-focused), higher density, sans-serif, precise charts, minimal motion, split-panel layout.

**Alex:** Warmer tones with accent colors, lower density, expressive headings, colorful charts with icons, purposeful micro-interactions, card-based layout.

**Resolution:** Default view optimized for Sarah. Toggle to "presentation mode" for Alex. User preference saved in account.

### Accessibility

**Sarah:** 6+ hours daily use → dark mode, large font option, keyboard-only navigation, high contrast toggle, voice commands, adjustable font size without breaking layout.

**Alex:** 2-3 hours daily, multitasking, mobile review → responsive design, interruption management, focus mode.

**Universal:** Color never sole indicator, keyboard support for all functionality, text resizable 200% without loss, readable at grade 8 level, clear form labels, visible focus indicators, 44×44px touch targets, stoppable animations. Target WCAG AA minimum.

## Measuring Persona-Driven Design

### Task Success Metrics

```
Sarah:
  Primary: Time to complete weekly report (target: <15 min)
  Errors per report generation (target: <1)
  Data accuracy confidence (target: >4/5)
  Export completion rate (target: >90%)

Alex:
  Primary: Time to create campaign dashboard (target: <5 min)
  Dashboard share rate (target: >50%)
  Campaigns tracked per session (target: >3)
```

### Satisfaction Metrics

| Metric | Trigger | Target Sarah | Target Alex |
|--------|---------|-------------|-------------|
| CSAT (1-5) | After key task | >4.0 | >4.2 |
| NPS (0-10) | After 30 days | >40 | >50 |
| CES (1-5 effort) | After task | <2.5 | <2.5 |
| SUPR-Q | Quarterly | >50th percentile | >50th percentile |

### Adoption Metrics

```
Feature                     | Sarah | Alex | Target
Automated data sync        | 52%   | 18%  | Sarah >50% ✓
Custom dashboard           | 22%   | 41%  | Alex >40% ✓
Scheduled reports          | 31%   | 9%   | Sarah >30% ✓
Anomaly alerts             | 21%   | 6%   | Sarah >20% ✓
Share dashboard link       | 8%    | 28%  | Alex >25% ✓
API access                 | 5%    | 3%   | Anti <10% ✓
```

### Business Impact

```
Persona focus         → Metric             | Improvement
Sarah onboarding      → 7-day activation   | +40%
Alex report sharing   → Invites per user   | +65%
Sarah report efficiency→ Reports per week  | +120%
Sarah auto-sync       → Time to first report| -60%
Both: satisfaction    → NPS                | +12 points
```

## Persona Evolution

### Updating Personas

**Quarterly (light):** Review analytics, support tickets, 2-3 validation interviews. Update statistics.

**Annual (full):** 8-12 new interviews per persona, field validation survey (n=200), update behavioral data, revise attributes and goals, present to team.

**Trigger-based:** Major pivot, competitor shift, demographic change, new segment discovered, persona no longer predicts behavior.

```
Version | Date       | Changes
1.0     | 2024-01    | Initial from 8 interviews
1.1     | 2024-04    | Demographics from survey (n=142)
1.2     | 2024-07    | Pain point priorities from analytics
2.0     | 2025-01    | Major revision: split into Operational + Strategic Sarah
```

### Longitudinal Studies

Track how users evolve over time. Quarterly interviews with same 10-participant cohort. Measure: goals, pain points, tool ecosystem, skill level, workflow, role changes.

### Persona Lifecycle

**Creation** (draft, present, validate) → **Active** (used daily in decisions, updated quarterly) → **Mature** (50+ interviews, well-validated, team knows naturally) → **Transitioning** (behavioral shifts suggest change) → **Split/Merge/Retire** as needed.

## Persona Communication

### Persona Posters

Display prominently in workspace. Include photo, tagline, goals, pains, behaviors, needs, quote, tools, research sources, version date.

### Persona Cards

Portable summaries (business card size). Front: name, role, tagline, photo, key demographics. Back: goal, pain, behavior, trigger, decision question.

### Persona Videos

2-minute narrative: "Meet Sarah" — animated whiteboard or motion graphics showing her morning, her pain, and what we're designing for her.

### Onboarding New Team Members

```
Week 1: Read persona docs, watch video, review empathy/journey maps, read support tickets
Week 2: Listen to 2 recorded interviews, attend persona walkthrough, shadow team members
Week 3: Participate in design critique using persona lens, write persona-tagged stories
Ongoing: Persona posters visible, weekly mention ("which persona are we helping?"), quarterly updates
```

## Persona-Driven Roadmapping

### Feature Prioritization

```
RICE-Persona score:
  Reach × Impact × Confidence × Persona weight / Effort

Feature: Automated data sync
  Weighted reach: 5,000 users/mo × 0.6 = 3,000
  Impact: 4 | Confidence: 90% | Effort: 40 days
  RICE-P = (3,000 × 4 × 0.90) / 40 = 270

Rank: 1. Auto sync (270) → 2. Custom dashboard (185) → 3. Alerts (160) → 4. API (30)
```

### Kano Model by Persona

| Feature | Sarah | Alex | Priority |
|---------|-------|------|----------|
| Auto data sync | Basic need | Performance | Build (Sarah's basic) |
| Custom dashboard | Performance | Basic need | Build for both |
| PDF export | Basic need | Indifferent | Build (Sarah needs) |
| Shareable link | Indifferent | Basic need | Build (Alex needs) |
| Anomaly alerts | Performance | Attractive | Build (differentiator) |
| AI insights | Attractive | Performance | Build when feasible |
| API access | Reverse | Indifferent | Don't build |

**Heuristic:** Basic needs for primary first → Performance for all → Attractive for primary → Attractive for secondary when feasible.

### Persona-Weighted Scoring

```
Feature score = Σ(Kano_Score × Persona_Weight × Impact) / Effort

Auto data sync:
  Sarah: Basic(3) × 0.6 × Impact(5) = 9.0
  Alex: Performance(2) × 0.3 × Impact(4) = 2.4
  Dev: Indifferent(0) × -0.1 × Impact(1) = 0.0
  Total: 11.4 / 40 story points = 0.285
```

## Design Critique

### Persona-Based Critique Framework

```
For each design, evaluate per persona:

Sarah (Primary):
  - Can she find key metrics within 5 seconds?
  - Can she export in 1 click?
  - What would slow her down?
  - Would she feel confident in this data?
  Score 1-5: ___

Alex (Secondary):
  - Can she customize this view?
  - Can she share insights with her team?
  - Is terminology familiar?
  Score 1-5: ___

Dev (Anti):
  - Does this benefit Dev?
  - Are we adding complexity Dev wants but Sarah doesn't need?
  Score -1 to 0: ___
```

### Do's and Don'ts

| Do | Don't |
|----|-------|
| Reference persona by name | Say "I don't like this" (personal preference) |
| "Sarah would struggle with this density" | "Users won't understand" (vague) |
| "What if we split this for Sarah?" | "This is wrong" (not constructive) |
| "Step 3 has 5 fields. Sarah has 30 min." | "This is too complicated" (vague) |
| "Our research showed Sarah needs 1-click export" | "I think Sarah would want..." (assumption) |

## Anti-Patterns

### Stereotype-Based Personas

```
Stereotype: "Millennial Marketer — 25-34, lives on social media, wants mobile-first"
  → No research basis. Useless for design decisions.

Research-based: "Alex, Marketing Manager — 30-38, manages campaigns and budgets,
  needs to prove ROI to CFO, pulls data from 5+ platforms"
  → Actionable: every attribute informs design.

Avoid: If you can't cite a source for a persona attribute, remove it.
```

### Too Many Personas

**Symptoms:** Team can't name them, posters collect dust, reviews don't reference them, documents overlap, "this serves Persona 7" (nobody knows 7).

**Solution:** Limit to 3-5. Prioritize into primary/secondary/anti. Group similar ones. Demote low-priority to archetypes.

**Rule of thumb:** If you can't fit all personas on one wall, you have too many.

### Outdated Personas

**Signs:** 2+ years without update, references obsolete tools, cites old statistics, describes workflows that changed.

**Prevention:** Annual refresh minimum, "Last updated" on all artifacts, quarterly analytics check, trigger-based updates, version control.

### Vanity Personas

**Signs:** C-level title but does grunt work, unlimited budget, no pain points, perfectly matches CEO's assumptions, created by stakeholder fiat.

**Avoid:** Base on user research (not stakeholder opinion), include real frustrations, present evidence with each attribute, actively look for disconfirming evidence.

## Case Studies

### Mailchimp — Three personas (freelancer, small business, marketing team). Tailored onboarding, dashboards, content per persona. Result: +30% activation, -20% support tickets.

### IBM Design — Separate personas for enterprise buyers, users, and administrators. Extensive field research, longitudinal validation. Measurable improvements in task completion and satisfaction.

### Spotify — Data-driven D.A.T.A. framework: Define → Analyze → Test → Adapt. A/B testing revealed different segments needed different UX and content strategies.

### Airbnb — Separate personas for hosts and guests, with sub-personas (aspiring host, power host, occasional guest, business traveler). Persona-driven features for each side without degrading the other's experience.

## Key Points

- Personas must be based on research, not assumptions — every attribute traces to evidence
- Design primarily for the primary persona; accommodate secondary personas without compromise
- Anti-personas prevent scope creep — document who you're explicitly NOT designing for
- Empathy maps capture the says-thinks-does-feels gap where richest insights live
- Journey maps reveal emotional highs and lows; opportunities lie at low points
- Service blueprints extend journeys by showing frontstage and backstage processes
- Use persona-weighted scoring to prioritize features objectively
- Test persona-driven designs with participants matching persona profiles
- Measure persona-specific metrics: task success, satisfaction, adoption, business impact
- Update personas regularly — they are hypotheses that must evolve with new evidence
- Display personas prominently and reference them in every design decision
- Onboard new team members with persona immersion (documents, videos, interviews)
- Avoid anti-patterns: stereotypes, too many, outdated, vanity personas
- Use Kano model to classify features differently per persona
- Validate persona-driven designs through A/B testing and behavioral analytics
- Role-based navigation and content personalization serve multiple personas
- Accessibility requirements differ by persona context and frequency of use

## Code Examples

### Persona Template

```
{
  "persona": {
    "id": "sarah-ops-v2",
    "name": "Sarah Chen",
    "role": "Operations Manager",
    "tagline": "I need accurate data to make decisions my team can trust.",
    "type": "primary", "version": "2.0", "lastUpdated": "2025-01-15",
    "demographics": {
      "ageRange": "32-38", "gender": "Female",
      "education": "MBA", "experience": "8-12 years",
      "companySize": "50-200", "industry": "B2B SaaS",
      "technicalProficiency": "intermediate"
    },
    "goals": {
      "primary": "Maintain accurate, real-time operational data",
      "secondary": ["Reduce manual reporting time"]
    },
    "needs": ["Automated data sync", "Customizable dashboards",
              "One-click export", "Anomaly detection"],
    "painPoints": [
      { "description": "Manual reconciliation across 4+ systems",
        "severity": 5, "timeLost": "4 hrs/week" },
      { "description": "Cannot fully trust data accuracy",
        "severity": 4, "impact": "Anxiety, errors" }
    ],
    "behaviors": {
      "daily": ["Check dashboards 8:30am"],
      "weekly": ["Compile ops report", "Monday morning routine"],
      "discovery": ["Google search", "G2 reviews"],
      "decision": ["Consults team", "ROI analysis"]
    },
    "motivations": { "efficiency": 80, "accuracy": 80, "control": 60 },
    "context": {
      "tools": ["Excel", "Salesforce", "Tableau", "Slack"],
      "constraints": ["IT security policies", "Budget cycles"]
    },
    "quote": "I spend more time proving my data is right than using it.",
    "researchSources": [
      { "type": "interview", "count": 8 },
      { "type": "survey", "count": 142 }
    ]
  }
}
```

### Persona Prioritization Calculation

```
const weights = { primary: 0.6, secondary: 0.3, anti: -0.1 };

const features = {
  "Auto data sync": { scores: { Sarah: 3, Alex: 2, Dev: 0 }, effort: 40 },
  "Custom dashboard": { scores: { Sarah: 2, Alex: 3, Dev: 1 }, effort: 35 },
  "Anomaly alerts": { scores: { Sarah: 2, Alex: 1, Dev: 0 }, effort: 25 }
};

function calculatePriority(name, f) {
  const score = f.scores.Sarah * weights.primary
              + f.scores.Alex * weights.secondary
              + f.scores.Dev * weights.anti;
  return { name, score: score.toFixed(1), priority: (score / f.effort).toFixed(4) };
}

Object.entries(features).forEach(([name, f]) => {
  const r = calculatePriority(name, f);
  console.log(`${r.name}: ${r.score} (priority ${r.priority})`);
});
```

### Journey Map & Kano-Persona Score

```
const journeyStage = {
  id: "gather-data",
  actions: ["Export from Salesforce", "Paste into Excel"],
  feelings: [{ emotion: "frustrated", score: 2 }],
  opportunities: ["Automated data sync"],
  metrics: { avgTime: "47 min" }
};

const kano = { basic: 3, performance: 2, attractive: 1, indifferent: 0, reverse: -1 };

function scoreFeature(name, scores, weights, kanoMap, effort) {
  let total = 0;
  for (const [p, s] of Object.entries(scores))
    total += s * (weights[p]||0) * (kano[kanoMap[p]]||0);
  return { name, score: total, priority: (total / effort).toFixed(4) };
}

scoreFeature("Auto sync", {Sarah:3,Alex:2,Dev:0}, {Sarah:.6,Alex:.3,Dev:-.1}, {Sarah:"basic",Alex:"performance"}, 40);
```
