---
name: management-change-management
description: >
  Use this skill when managing organizational change: ADKAR, Kotter 8-Step, stakeholder impact analysis, adoption metrics.
  This skill enforces: ADKAR assessment per stakeholder, Kotter 8-Step framework, stakeholder mapping, adoption measurement.
  Do NOT use for: project management, team communication, agile transformation, culture initiatives without defined scope.
version: "1.1.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [management, change-management, phase-10]
---

# Change Management Agent

## Purpose
Drives organizational change using ADKAR, Kotter 8-Step, and stakeholder impact analysis frameworks with measurable adoption outcomes.

## Agent Protocol

### Trigger
Exact user phrases: change management, ADKAR, Kotter, organizational change, adoption, change readiness, stakeholder impact, resistance, transformation, culture change.

### Input Context
- What is the change being introduced (process, tool, structure, strategy)?
- Who is affected and what is the scope?
- What is the timeline and who is sponsoring the change?
- What is the current state and desired future state?
- What resistance is anticipated or observed?

### Output Artifact
Change management plan with ADKAR assessment, Kotter 8-Step timeline, stakeholder impact analysis, and adoption metrics framework.

### Response Format

## Change Management Plan
### Change: {name}
ADKAR Assessment: A={score}/5 | D={score}/5 | K={score}/5 | A={score}/5 | R={score}/5
### Stakeholder Impact
High Impact + Low Readiness: {groups} — focus change effort
High Impact + High Readiness: {groups} — leverage as champions
### Adoption Target
Adoption Rate: {target}% by {date} | Proficiency: {target}%

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Change defined with current state, future state, and rationale
- [ ] ADKAR assessment completed per stakeholder group
- [ ] Kotter 8-Step timeline created with action items
- [ ] Stakeholder impact analysis with power/interest grid
- [ ] Change readiness assessment per stakeholder
- [ ] Resistance management strategies documented
- [ ] Communication plan per stakeholder group
- [ ] Training needs assessment and plan created
- [ ] Adoption metrics defined with targets and measurement method

### Max Response Length
7000 tokens

## Workflow

### Step 1: Change Definition
Define the change clearly: what is changing, what is staying the same, and what is the rationale. Document current state (how things work today), future state (how things will work after change), and the gap between them. Identify the sponsor (who has authority to make the change stick). Quantify the benefit of making the change and the cost of not making it.

### Step 2: ADKAR Assessment
Assess each stakeholder group on five ADKAR elements. Awareness: Do they understand why the change is needed? (score 1-5). Desire: Do they want to participate and support the change? (score 1-5). Knowledge: Do they know how to change? (score 1-5). Ability: Can they implement the change day-to-day? (score 1-5). Reinforcement: Are there mechanisms to sustain the change? (score 1-5). Scores below 3 indicate a gap that needs intervention.

### Step 3: Kotter 8-Step Plan
Create urgency (why now?), build guiding coalition (who leads?), form strategic vision (what will it look like?), enlist volunteer army (who helps?), enable action by removing barriers (what's in the way?), generate short-term wins (quick credibility), sustain acceleration (build momentum), institute change (make it stick).

### Step 4: Stakeholder Impact Analysis
Map all affected groups on a power/interest grid. Assess change readiness for each group (1-5). Identify resistance sources and strategies. Plan communications per group. Assess training needs and design learning path.

### Step 5: Adoption Measurement
Define adoption metrics per stakeholder group. Set targets and measurement intervals. Track time-to-adoption and proficiency. Measure NPS/eNPS for change satisfaction. Create feedback loops for course correction.

### Step 6: Communication Planning
Develop a multi-channel communication plan per stakeholder group. Define key messages, communication cadence, and channel mix. Plan two-way communication channels for feedback. Schedule town halls, email updates, team meetings, and 1:1 sessions. Align messages with ADKAR gaps identified in assessment.

### Step 7: Training and Enablement
Design training programs based on stakeholder knowledge gaps. Create blended learning: self-paced material, instructor-led sessions, hands-on workshops, job aids, and peer coaching. Define proficiency benchmarks. Plan train-the-trainer model for scaling. Schedule training in phases aligned with rollout.

### Step 8: Resistance Management
Identify sources of resistance per stakeholder group. Categorize resistance types: lack of awareness, lack of desire, lack of knowledge, lack of ability, lack of reinforcement. Develop mitigation strategies for each type. Create safe channels for expressing concerns. Address resistance with empathy and data.

### Step 9: Reinforcement and Sustainment
Design reinforcement mechanisms: process audits, performance scorecards, recognition programs, and refresher training. Schedule reinforcement activities at 30/60/90 days post-launch, then quarterly. Plan for leadership reinforcement — sponsor must continue visible support. Track adoption decay and intervene if proficiency drops.

### Step 10: Post-Implementation Review
Conduct reviews at 30, 60, 90, and 180 days post-launch. Compare adoption metrics against targets. Gather qualitative feedback through surveys and focus groups. Identify improvement opportunities. Document lessons learned. Celebrate successes and recognize contributors.

## Framework / Methodologies

### Change Management Framework Comparison

| Aspect | ADKAR | Kotter 8-Step | Lewin's 3-Stage | McKinsey 7S | PROSCI |
|--------|-------|---------------|-----------------|-------------|--------|
| Focus | Individual change | Organizational transformation | Group dynamics | Organizational alignment | Holistic change |
| Structure | 5 sequential elements | 8 sequential steps | 3 phases | 7 interdependent elements | 3-phase process |
| Best for | Small-medium changes, individual adoption | Large-scale transformation | Simple organizational changes | Strategic alignment | Enterprise change programs |
| Assessment | ADKAR score per element | Step completion | Field force analysis | 7S gaps | Change maturity assessment |
| Output | Individual readiness plan | Transformation roadmap | Unfreeze-Change-Refreeze plan | Alignment action plan | Enterprise change plan |
| Timeframe | Weeks to months | Months to years | Weeks to months | Months | Months to years |

### Decision Tree: Select Change Framework

```
What is the nature of the change?
  ├── Individual behavior change (new tool, process, skill)
  │   └── Use ADKAR — assess each person's Awareness, Desire, Knowledge, Ability, Reinforcement
  ├── Organizational transformation (restructuring, M&A, new strategy)
  │   └── Use Kotter 8-Step — create urgency, build coalition, sustain momentum
  ├── Simple process change (team-level workflow update)
  │   └── Use Lewin's 3-Stage — unfreeze current process, make change, refreeze new norm
  ├── Strategic realignment (new market, new business model)
  │   └── Use McKinsey 7S — align strategy, structure, systems, skills, staff, style, shared values
  └── Enterprise-wide program (multi-year, multiple workstreams)
      └── Use PROSCI — enterprise change management with standardized methodology
```

### Change Resistance Typology

| Resistance Type | Root Cause | ADKAR Gap | Strategy |
|-----------------|------------|-----------|----------|
| Informational | Lack of understanding | Awareness | Clear, repeated communication |
| Emotional | Fear of loss, uncertainty | Desire | Empathy, involvement, peer stories |
| Capability | Lack of skills or confidence | Knowledge + Ability | Training, coaching, practice time |
| Structural | Systems, processes, incentives misaligned | Ability | Align systems, remove barriers |
| Cultural | Values and norms contradict the change | Reinforcement | Model new behaviors, celebrate wins |

### Change Impact Assessment Levels

| Level | Description | Reach | Complexity | Timeline |
|-------|-------------|-------|------------|----------|
| 1 | Cosmetic — minor process update | Single team | Low | 1-4 weeks |
| 2 | Incremental — tool upgrade, process change | Multiple teams | Medium | 1-3 months |
| 3 | Significant — reorganisation, new system | Department | High | 3-6 months |
| 4 | Transformational — new business model, M&A | Enterprise | Very high | 6-18 months |
| 5 | Revolutionary — industry disruption, pivot | Entire organization + ecosystem | Extreme | 12-36 months |

## Common Pitfalls

### Pitfall 1: Starting Without Sponsor Commitment
The single biggest predictor of change failure is lack of active, visible executive sponsorship. A sponsor who delegates change management to HR or project managers guarantees failure. The sponsor must personally communicate the vision, remove barriers, model new behaviors, and hold leaders accountable.

### Pitfall 2: Underestimating Resistance
Treating resistance as a problem to be overcome rather than data to be understood leads to escalation. Every resistor has a valid perspective. Dismissing concerns as "change resistance" ignores systemic issues that, if addressed, would improve the change itself.

### Pitfall 3: One-Size-Fits-All Communication
Sending the same email to every stakeholder ignores their different ADKAR profiles, communication preferences, and information needs. Executives need business case and metrics. Front-line employees need what changes for them day-to-day. Power users need detailed specifications.

### Pitfall 4: Skipping Steps in Kotter's Model
Teams eager to show progress jump from Step 4 (communicate vision) to Step 7 (sustain acceleration), skipping Step 5 (remove barriers) and Step 6 (generate short-term wins). Without removing barriers, the change stalls. Without visible wins within 90 days, momentum dies.

### Pitfall 5: Training Without Practice
Classroom training without hands-on practice has near-zero retention. Knowledge does not equal ability. Training must include realistic practice scenarios, sandbox environments, and on-the-job coaching. Proficiency is only achieved through application, not instruction.

### Pitfall 6: Declaring Victory Too Early
When adoption metrics reach target, teams declare victory and move on. But without reinforcement, adoption decays. New behaviors regress to old habits within 30-60 days without reinforcement. Sustained adoption requires ongoing measurement, coaching, and system alignment.

### Pitfall 7: Ignoring Middle Management
Middle managers are the most critical change agents and the most often neglected. They are expected to implement changes they may not fully understand or support. Provide middle managers with extra communication, coaching, and support. They are the bridge between strategy and execution.

### Pitfall 8: Measuring Activity Instead of Adoption
Counting training sessions delivered, emails sent, or town halls held tells you nothing about whether the change is actually happening. Measure adoption behavior: Are people using the new system? Following the new process? Achieving the expected outcomes?

### Pitfall 9: One-Time Training Approach
Delivering training once at launch assumes everyone learns at the same pace. New hires, late adopters, and people who learn by doing all miss out. Training must be continuous, with on-demand resources, just-in-time support, and refresher sessions for those who need them.

### Pitfall 10: Not Planning for the Dip
Change initiatives follow a predictable pattern: initial enthusiasm, followed by a dip in performance and confidence, then eventual recovery and improvement. Teams unprepared for the dip panic and revert to old ways. Communicate the dip as a normal part of the change process.

## Best Practices

- **Secure executive sponsorship before anything else**: No active sponsor, no change program. A sponsor who delegates authority dooms the effort.
- **Assess ADKAR individually, not organizationally**: A single ADKAR score for the whole company masks critical gaps in specific groups. Assess at the stakeholder group level at minimum, ideally at the individual level.
- **Communicate through multiple channels, multiple times**: People need to hear a message 5-7 times before it sticks. Use different channels (email, town hall, team meeting, intranet, 1:1) to reach different learning styles.
- **Create visible wins within 90 days**: Without early evidence of success, people lose faith. Identify and promote early wins that are visible, meaningful, and credible.
- **Build a coalition, not a committee**: A guiding coalition is a committed group with authority and credibility who actively champion the change. A committee reviews documents.
- **Remove barriers before asking people to change**: If the system doesn't support the new way of working, people will revert to the old way. Fix systems, processes, and incentives first.
- **Make the change about people, not the project**: Change succeeds when individuals change their behavior. Focus on the personal WIIFM (What's In It For Me) for every stakeholder.
- **Measure behavior, not activity**: Track adoption behaviors — logins, transactions, process compliance — not "awareness" or "satisfaction."
- **Plan for reinforcement from day one**: Most change plans focus on launch and forget reinforcement. Design reinforcement mechanisms before launch, not after adoption starts to slip.
- **Treat resistance as data**: Every expression of resistance contains information about a real problem. Listen, understand, and adapt.

## Templates & Tools

### ADKAR Assessment Template

```yaml
adkar_assessment:
  stakeholder_group: {name}
  individual_count: {n}
  scores:
    awareness:
      average: 3.2
      min: 1
      max: 5
      gap: awareness_of_need — target: 4.0
    desire:
      average: 2.8
      min: 1
      max: 4
      gap: motivation_to_participate — target: 4.0
    knowledge:
      average: 3.5
      min: 2
      max: 5
      gap: how_to_change — target: 4.0
    ability:
      average: 2.5
      min: 1
      max: 4
      gap: ability_to_implement — target: 4.0
    reinforcement:
      average: 2.0
      min: 1
      max: 3
      gap: mechanisms_to_sustain — target: 3.5
  interventions:
    - element: ability
      gap: 1.5
      intervention: hands-on training + sandbox environment
      owner: training_team
      timeline: week 4-6
```

### Stakeholder Power/Interest Grid

```yaml
stakeholder_grid:
  quadrants:
    manage_closely:
      - group: executive_sponsors
        power: 5
        interest: 5
        strategy: regular briefings, active involvement
      - group: key_customers
        power: 4
        interest: 5
        strategy: direct communication, feedback sessions
    keep_satisfied:
      - group: board_of_directors
        power: 5
        interest: 3
        strategy: quarterly updates, exception-only engagement
    keep_informed:
      - group: end_users
        power: 2
        interest: 4
        strategy: regular newsletters, training sessions
    monitor:
      - group: industry_analysts
        power: 2
        interest: 1
        strategy: press releases, minimal engagement
```

### Change Readiness Assessment

```yaml
readiness_assessment:
  dimensions:
    - dimension: leadership_alignment
      score: 4
      notes: Executive team fully aligned
    - dimension: resource_availability
      score: 3
      notes: Budget approved, headcount partially available
    - dimension: technical_capability
      score: 2
      notes: Legacy systems need upgrade before change
    - dimension: cultural_readiness
      score: 3
      notes: Generally open to change, some risk-averse pockets
    - dimension: history_of_change
      score: 2
      notes: Previous change effort failed — trust needs rebuilding
  overall: 2.8 / 5.0
  readiness_level: moderate
  focus_areas:
    - Rebuild trust from previous failed change through transparent communication
    - Address technical capability gap before main rollout
```

### Change Communication Plan Template

```yaml
communication_plan:
  stakeholder_group: engineering_team
  adkar_gap: desire (2.8/5)
  key_message: This platform will reduce your deployment time from 2 hours to 15 minutes
  channels:
    - town_hall: kickoff + quarterly updates
    - email: bi-weekly newsletter
    - slack: #change-announcements channel
    - team_meeting: weekly 5-min update in standup
  cadence:
    - pre-launch: weekly
    - during_launch: daily
    - post-launch: bi-weekly for 3 months, then monthly
  feedback_mechanism:
    - anonymous_survey
    - change_champion_network
    - open_office_hours
```

### Kotter 8-Step Timeline Template

```yaml
kotter_timeline:
  step_1_create_urgency:
    activities:
      - Share competitive threat data with leadership
      - Present burning platform case
      - Bring customer feedback to highlight need
    timeline: week 1-2
    owner: sponsor
    deliverable: Urgency deck shared with all leadership
  step_2_build_coalition:
    activities:
      - Identify and recruit key influencers
      - Form guiding coalition with cross-functional leaders
      - Establish coalition meeting cadence
    timeline: week 2-4
    owner: change lead
    deliverable: Guiding coalition charter signed
  step_3_form_vision:
    activities:
      - Draft strategic vision with coalition
      - Define 18-month change roadmap
      - Identify key milestones and success criteria
    timeline: week 4-6
    owner: coalition
    deliverable: Change vision statement and roadmap
  step_4_enlist_volunteers:
    activities:
      - Share vision at company all-hands
      - Recruit change champions per department
      - Launch internal communications campaign
    timeline: week 6-8
    owner: communications
    deliverable: 20+ change champions recruited
  step_5_remove_barriers:
    activities:
      - Audit systems and processes for alignment
      - Address policy and incentive conflicts
      - Remove or retrain blockers
    timeline: week 8-12
    owner: sponsor
    deliverable: Barrier removal log complete
  step_6_generate_wins:
    activities:
      - Identify quick wins in pilot teams
      - Document and celebrate early successes
      - Share results broadly with data and stories
    timeline: week 12-16
    owner: change lead
    deliverable: 3 documented early wins
  step_7_sustain_acceleration:
    activities:
      - Expand rollout to additional departments
      - Build on momentum from early wins
      - Increase adoption targets progressively
    timeline: week 16-36
    owner: change lead
    deliverable: 80% adoption across all groups
  step_8_institute_change:
    activities:
      - Embed changes into policies, systems, culture
      - Update job descriptions and performance reviews
      - Celebrate completion and recognize contributors
    timeline: week 36-52
    owner: sponsor
    deliverable: Change embedded, transition to BAU
```

## Case Studies

### Case Study 1: Enterprise SaaS — CRM Migration
A 2000-person company migrated from Salesforce to a custom CRM. ADKAR assessment revealed high Knowledge and Ability gaps among sales teams who had used Salesforce for 10+ years. The change team built a 12-week training program with sandbox environment, created a sales champion network, and provided 1:1 coaching for low-adoption reps. Adoption reached 90% by week 16. Key success factor: executive sponsor joined sales calls to model the new system.

### Case Study 2: Manufacturing — Lean Transformation
A manufacturing plant implemented lean production using Kotter's 8-Step. The guiding coalition included union representatives, a critical success factor that prevented labor resistance. Short-term wins included a 30% reduction in changeover time within 60 days, which was celebrated at a plant-wide event. After 18 months, productivity improved 40% and defect rate dropped 60%.

### Case Study 3: Financial Services — Agile Transformation
A bank attempted an enterprise agile transformation using only training and new tooling. ADKAR assessment was not conducted. Resistance from middle managers was dismissed as "not agile." After 6 months, adoption was below 20%. A reboot using PROSCI methodology with stakeholder-specific ADKAR assessment, active sponsor engagement, and barrier removal achieved 75% adoption within 9 months.

### Case Study 4: Healthcare — Digital Health Record Implementation
A hospital network implemented a new EHR system affecting 5000+ clinicians. Resistance was high due to previous failed implementations. The change team addressed this by involving clinicians in software configuration decisions, creating peer coaching programs, and designing a phased rollout starting with the most change-ready departments. After 12 months, adoption was 92% and patient satisfaction scores improved.

## Rules

- ADKAR must be assessed per stakeholder group, not organization-wide
- Kotter steps must be executed in order — skipping steps causes failure
- Resistance is data, not a problem — understand its root cause
- Quick wins must be visible within the first 90 days
- Communication must be two-way, not just broadcast
- Training must include hands-on practice, not just documentation
- Adoption metrics must be tracked for at least 6 months post-launch
- Sponsor must be visibly active throughout the change
- Change impact must be assessed at individual and group level
- One-size-fits-all communication guarantees failure
- Training without practice equals zero retention
- Middle managers need extra support — they are the bridge between strategy and execution
- Celebrate early wins publicly and often to build momentum
- Plan for the dip — performance will drop before it improves
- Reinforcement starts before launch, not after adoption slips
- Measure behavior, not activity — adoption, not awareness
- Document lessons learned for next change initiative
- Change champions are volunteers, not conscripts

## References

- references/adkar-model.md — ADKAR model detailed with assessment tools
- references/adoption-metrics.md — Adoption measurement framework and KPIs
- references/change-management-advanced.md — Advanced change management topics
- references/change-management-fundamentals.md — Fundamentals of change management
- references/kotter-8step.md — Kotter 8-Step change model detailed guide
- references/stakeholder-impact.md — Stakeholder impact analysis toolkit
- references/change-management-frameworks.md — Comprehensive comparison of change management frameworks
- references/organizational-change-resilience.md — Building organizational resilience for sustained change

## Handoff
For stakeholder communication execution, hand off to `management-stakeholder`. For OKR alignment with change goals, hand off to `management-okr-kpi`. For team-level change impact, hand off to `management-team-topology`.
