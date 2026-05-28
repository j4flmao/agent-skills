# Change Management Frameworks

## Overview

Change management frameworks provide structured approaches for transitioning individuals, teams, and organizations from a current state to a desired future state. This reference provides a comprehensive comparison, detailed application guidance, and practical tools for the most widely used frameworks.

## Framework Comparison Matrix

| Dimension | ADKAR (PROSCI) | Kotter 8-Step | Lewin's 3-Stage | McKinsey 7S | Bridges Transition | Deming Cycle (PDCA) |
|-----------|---------------|---------------|-----------------|-------------|--------------------|----------------------|
| Year Introduced | 1998 | 1996 | 1947 | 1980 | 1991 | 1950 |
| Primary Focus | Individual adoption | Organizational transformation | Group dynamics | Organizational alignment | Psychological transition | Continuous improvement |
| Unit of Analysis | Individual | Organization | Group | Organization | Individual | Process |
| Number of Elements | 5 | 8 | 3 | 7 | 3 phases | 4 steps |
| Assessment Method | ADKAR score per element | Step completion checklist | Force field analysis | 7S gap analysis | Transition monitoring | Plan-Do-Check-Act |
| Typical Duration | 4-12 weeks per change | 12-36 months | 4-16 weeks | 3-12 months | Varies | Continuous |
| Best Suited For | Tool/process rollouts | Enterprise transformation | Simple group changes | Strategic alignment | Personal change | Operational improvements |
| Change Scale | Small to medium | Large | Small | Large | Individual to group | Any |
| Strengths | Individual focus, measurable | Actionable steps, momentum | Simple, intuitive | Holistic, interconnected | Addresses psychology | Iterative, low risk |
| Weaknesses | Can be mechanistic | Linear, slow | Oversimplified | No clear steps | Less structured | Not for transformation |

## ADKAR Framework

### Detailed Element Definitions

| Element | Definition | Key Question | Assessment Criteria | Score 1-5 |
|---------|------------|--------------|---------------------|-----------|
| Awareness | Understanding of why change is needed | Do I understand the reasons for change? | Can articulate business case; knows consequences of not changing; understands timing | 1: No awareness, 5: Full understanding |
| Desire | Motivation to participate in and support change | Do I want to be part of this change? | Personal buy-in; understands WIIFM; willing to let go of old ways | 1: Active resistance, 5: Active champion |
| Knowledge | Understanding of how to change | Do I know how to change? | Understands new role/process; knows training available; can describe new behaviors | 1: No knowledge, 5: Can teach others |
| Ability | Capability to implement change day-to-day | Can I implement the change? | Can perform new tasks; meets performance standards; overcomes obstacles | 1: Cannot perform, 5: Exceeds standards |
| Reinforcement | Mechanisms to sustain the change | Will the change stick? | Receives feedback; recognized for new behaviors; systems support change; no regression | 1: No reinforcement, 5: Fully sustained |

### ADKAR Scoring Methodology

Each element is scored 1-5 for each individual or stakeholder group:

```
ADKAR Profile (Stakeholder Group: Engineering Team)
  A: 4.2 — High awareness of need for new platform
  D: 3.1 — Moderate desire (some resistance to leaving familiar tools)
  K: 2.8 — Low knowledge of new platform (limited exposure)
  A: 2.5 — Low ability (limited practice opportunity)
  R: 1.8 — Very low reinforcement (no sustainment plan yet)

  Overall: 2.88 / 5.0 — Significant gaps in Knowledge, Ability, Reinforcement
  Priority Interventions:
    1. Hands-on training sandbox (Knowledge + Ability)
    2. Champion network for peer support (Desire)
    3. Recognition program for early adopters (Reinforcement)
```

### ADKAR Gap Analysis

```
┌─────────────────────────────────────────────────────────────┐
│ ADKAR Gap Analysis: Engineering Team                          │
├──────────┬──────┬────────┬───────┬───────────────────────────┤
│ Element  │ Now  │ Target │ Gap   │ Intervention              │
├──────────┼──────┼────────┼───────┼───────────────────────────┤
│ Awareness│ 4.2  │ 4.5    │ 0.3   │ Minimal — maintain comms  │
│ Desire   │ 3.1  │ 4.0    │ 0.9   │ Champion stories, WIIFM   │
│ Knowledge│ 2.8  │ 4.0    │ 1.2   │ Training program          │
│ Ability  │ 2.5  │ 4.0    │ 1.5   │ Sandbox, coaching         │
│ Reinforce│ 1.8  │ 3.5    │ 1.7   │ Recognition, metrics      │
└──────────┴──────┴────────┴───────┴───────────────────────────┘
```

### ADKAR Intervention Catalog

| Element | Gap | Intervention | Effort | Timeline |
|---------|-----|--------------|--------|----------|
| Awareness | Low | Executive communication, all-hands meeting, FAQ document | Low | 1-2 weeks |
| Awareness | Medium | Department roadshows, Q&A sessions, case studies | Medium | 2-4 weeks |
| Awareness | High | 1:1 sponsor meetings, customer testimonials, competitor data | High | 4-8 weeks |
| Desire | Low | WIIFM messaging, champion testimonials | Low | 1-2 weeks |
| Desire | Medium | Involvement in design, pilot participation, peer influence | Medium | 2-6 weeks |
| Desire | High | Incentive alignment, role modeling by leaders, resistance coaching | High | 4-12 weeks |
| Knowledge | Low | Quick reference guides, short videos, self-paced e-learning | Low | 1-3 weeks |
| Knowledge | Medium | Instructor-led training, workshops, knowledge checks | Medium | 3-6 weeks |
| Knowledge | High | Certification program, train-the-trainer, extended curriculum | High | 6-12 weeks |
| Ability | Low | Sandbox environment, practice scenarios, cheat sheets | Low | 1-3 weeks |
| Ability | Medium | On-the-job coaching, peer mentoring, shadowing | Medium | 3-8 weeks |
| Ability | High | Dedicated support team, extended practice period, reduced targets | High | 8-16 weeks |
| Reinforcement | Low | Recognition program, progress dashboards, quick feedback | Low | 1-4 weeks |
| Reinforcement | Medium | Performance metrics aligned, refresher training, manager check-ins | Medium | 4-8 weeks |
| Reinforcement | High | System/process changes, policy updates, ongoing coaching | High | 8-16 weeks |

## Kotter 8-Step Model

### Step Details with Activities and Deliverables

| Step | Objective | Key Activities | Common Failures | Deliverable | Timeline |
|------|-----------|----------------|-----------------|-------------|----------|
| 1. Create Urgency | Generate excitement and motivation for change | Share market data, customer feedback, competitive threats; discuss crises and opportunities | Underestimating urgency level; 50% of transformations fail at this step | Urgency presentation with data + personal stories | 1-2 months |
| 2. Build Guiding Coalition | Form a powerful group to lead the change | Identify 5-50 credible leaders across the organization; build trust within coalition; develop shared objectives | No senior executive on the coalition; coalition is too large to act | Coalition charter signed by all members | 2-4 months |
| 3. Form Strategic Vision | Create a vision to direct the change effort | Develop vision and strategy; identify 5-year goals; define scope and approach | Vision is too complex or not compelling enough; strategy is detailed but not visionary | 1-page vision statement + 3-5 year strategic plan | 2-4 months |
| 4. Enlist Volunteer Army | Communicate the vision to get buy-in | Communicate vision through every channel; demonstrate desired behaviors; address concerns openly | Under-communicating by factor of 10; executives not modeling new behaviors | Communication plan + 20+ change champions recruited | 2-4 months |
| 5. Enable Action by Removing Barriers | Remove obstacles to the new vision | Identify structural barriers; retrain or replace blockers; align systems and processes | Underestimating barriers; failing to address middle manager concerns | Barrier removal log with owners and deadlines | 2-6 months |
| 6. Generate Short-Term Wins | Create and celebrate visible improvements | Plan visible performance improvements; recognize contributors; build credibility | Wins are too small or not visible; declaring victory too early | 3-5 documented wins with data and stories | 2-6 months |
| 7. Sustain Acceleration | Use credibility to change more systems and processes | Deploy additional change projects; bring in more people; reduce interdependencies; keep urgency high | Losing momentum after early success; coalition members burn out | Expanded roadmap + 80%+ adoption milestone | 6-18 months |
| 8. Institute Change | Anchor new approaches in culture | Demonstrate connection between new behaviors and success; embed in succession planning; update policies | Not connecting success to leadership development; old culture resurfaces after project ends | Updated policies, processes, job descriptions | 12-24 months |

### Kotter Step Success Factors

```
Step 1 — Create Urgency:
  [ ] At least 75% of management is convinced that status quo is unacceptable
  [ ] External evidence (customer, competitor, market) is more compelling than internal analysis
  [ ] Crisis is framed as opportunity, not threat
  [ ] Urgency communication reaches every employee within 2 weeks

Step 2 — Build Guiding Coalition:
  [ ] Coalition includes position power (senior leaders), expertise (domain experts), credibility (respected individuals), and leadership (change agents)
  [ ] Coalition meets weekly during transformation
  [ ] Trust established within coalition — members can disagree openly
  [ ] Coalition members model the change in their own work

Step 3 — Form Strategic Vision:
  [ ] Vision can be communicated in 5 minutes and understood in 5 seconds
  [ ] Vision is specific enough to guide decision-making
  [ ] Vision is ambitious but achievable
  [ ] Vision survives the "Monday morning test" — it guides day-to-day priorities

Step 4 — Enlist Volunteer Army:
  [ ] Every employee has heard the vision within 2 months
  [ ] Vision communication uses at least 5 different channels
  [ ] Leaders at all levels model the vision behaviors
  [ ] Employees can answer "what does this change mean for me?"

Step 5 — Enable Action by Removing Barriers:
  [ ] Performance management systems aligned with new vision
  [ ] Information systems support new way of working
  [ ] Budget reallocated to support transformation
  [ ] People actively blocking change are confronted constructively

Step 6 — Generate Short-Term Wins:
  [ ] First visible win occurs within 6 months (ideally 3 months)
  [ ] Wins are clearly linked to the change effort
  [ ] Wins are celebrated visibly and publicly
  [ ] Detractors cannot dismiss wins as trivial

Step 7 — Sustain Acceleration:
  [ ] Change is expanded beyond initial pilots
  [ ] New projects, themes, and volunteers are added regularly
  [ ] Urgency does not decrease — if anything, it increases
  [ ] Each wave of change builds on previous successes

Step 8 — Institute Change:
  [ ] Succession planning identifies next-generation leaders who embody the change
  [ ] New behaviors are visible in day-to-day operations
  [ ] Promotion criteria include alignment with new culture
  [ ] Change is embedded in onboarding, training, and performance reviews
```

## Lewin's 3-Stage Model

### Stage Details

| Stage | Objective | Activities | Duration | Key Risk |
|-------|-----------|------------|----------|----------|
| Unfreeze | Prepare for change by challenging existing beliefs | Demonstrate problems with current state; create psychological safety for change; reduce resistance drivers | 2-8 weeks | Rushing unfreezing — trust must be built before change can happen |
| Change | Implement the new behaviors, processes, or systems | Introduce new approach; provide training and support; allow experimentation and failure; communicate progress | 4-12 weeks | Inadequate support during transition — people need time to learn |
| Refreeze | Stabilize and embed the change | Reinforce new behaviors; align incentives and systems; celebrate success; monitor for regression | 2-8 weeks | Incomplete refreezing — without reinforcement, old behaviors return |

### Force Field Analysis Template

```yaml
force_field_analysis:
  change_proposal: Implement cloud-based collaboration platform
  driving_forces:
    - force: Increased remote work demand
      strength: 8/10
    - force: Current platform is end-of-life
      strength: 9/10
    - force: Security compliance requirements
      strength: 7/10
    - force: Cost reduction opportunity
      strength: 6/10
    - force: Executive mandate from CEO
      strength: 10/10
  restraining_forces:
    - force: Team familiarity with current platform
      strength: 7/10
    - force: Data migration complexity
      strength: 6/10
    - force: Training time and cost
      strength: 5/10
    - force: Integration with existing tools
      strength: 4/10
    - force: Concerns about cloud security
      strength: 3/10
  analysis:
    total_driving: 40
    total_restraining: 25
    net_change_force: 15
    verdict: Favorable for change — driving forces outweigh restraining forces
    action: Strengthen driving forces through CEO communication; reduce restraining forces through training and migration planning
```

## McKinsey 7S Framework

### Seven Elements

| Element | Description | Assessment Question | Example Issue |
|---------|-------------|---------------------|---------------|
| Strategy | Plan for achieving competitive advantage | Does our strategy respond to market changes? | Strategy is clear but not understood at operational level |
| Structure | Organizational hierarchy and reporting lines | Does our structure support the strategy? | Matrix structure creates confusion about decision authority |
| Systems | Processes and procedures for daily operations | Do our systems support strategic goals? | Incentive systems reward individual performance but strategy requires collaboration |
| Shared Values | Core beliefs and company culture | Are values shared across the organization? | Stated values conflict with actual behaviors |
| Style | Leadership and management approach | Does leadership style support the change? | Top-down management style conflicts with desired empowerment culture |
| Staff | People capabilities and demographics | Do we have the right skills for the future? | Workforce is skilled in legacy technologies, not new ones |
| Skills | Core competencies and organizational capabilities | Are our capabilities competitive? | Organization excels at operational efficiency but not innovation |

### 7S Gap Analysis

| Element | Current State | Desired State | Gap | Action Required |
|---------|---------------|---------------|-----|-----------------|
| Strategy | Product-led growth, enterprise sales | Platform strategy, self-serve + sales | Need to build self-serve channel and ecosystem | Develop platform strategy document, build partner program |
| Structure | Functional silos (engineering, product, marketing) | Cross-functional product teams with end-to-end ownership | Current structure creates handoff delays and communication gaps | Reorganize into product-focused squads with clear ownership |
| Systems | Annual planning, quarterly releases | Continuous planning, bi-weekly releases | Planning cycle too slow for market responsiveness | Implement OKR-based quarterly planning with monthly check-ins |
| Shared Values | "Move fast, break things" | "Move fast with quality and reliability" | Speed-focused culture has caused quality issues | Executive communication campaign, add quality metrics to OKRs |
| Style | Directive, top-down | Empowering, coaching | Leaders tell rather than ask — stifles innovation | Leadership coaching program, 360 feedback for all managers |
| Staff | Deep domain experts, limited new grads | Balanced team of experts and fresh talent | Succession risk, limited new ideas | Graduate recruitment program, knowledge transfer initiatives |
| Skills | Strong in monolith development, weak in cloud-native | Strong in microservices, cloud-native, DevOps | Skill gap threatens technology transformation | Cloud-native training program, hire cloud architects |

### 7S Alignment Questions

```
Strategy:
  - Do we have a clear strategy that everyone understands?
  - Does our strategy differentiate us from competitors?
  - Is our strategy aligned with market realities?

Structure:
  - Does our structure enable or impede strategy execution?
  - Are decision rights clear and appropriate?
  - Does the structure encourage collaboration or create silos?

Systems:
  - Do our processes support or undermine strategy?
  - Are our incentives aligned with desired behaviors?
  - Do we measure what matters?

Shared Values:
  - Are our core values genuinely shared across the organization?
  - Do leaders model the values?
  - Are values reflected in hiring and promotion decisions?

Style:
  - Does management style enable or block change?
  - Are leaders accessible and approachable?
  - Does the organization encourage constructive debate?

Staff:
  - Do we have the right people in the right roles?
  - Are we developing future leaders?
  - Is diversity valued and cultivated?

Skills:
  - Are our organizational capabilities competitive?
  - Where are our critical skill gaps?
  - Are we investing in the right capabilities for the future?
```

## Bridges Transition Model

### Three Phases of Transition

| Phase | Description | Emotions | Duration | Support Needed |
|-------|-------------|----------|----------|----------------|
| Ending, Losing, Letting Go | People must acknowledge and grieve what they are losing | Shock, denial, anger, sadness, disorientation | 2-8 weeks | Acknowledge losses openly; provide psychological safety; allow mourning; honor the past |
| The Neutral Zone | The chaotic in-between state where old is gone but new isn't fully established | Confusion, anxiety, uncertainty, but also creativity and experimentation | 4-16 weeks | Clear communication about process; temporary structures; support for experimentation; celebrate small wins |
| The New Beginning | People embrace the new identity and way of working | Excitement, commitment, renewed energy, hope | 4-12 weeks | Reinforce new behaviors; celebrate success; connect to organizational vision; recognize contributors |

### Bridges vs. Kotter Comparison

| Aspect | Bridges Transition | Kotter 8-Step |
|--------|-------------------|---------------|
| Focus | Psychological transition of individuals | Organizational transformation process |
| Emphasis | What people are feeling | What leaders need to do |
| View of endings | Essential first step — must honor the past | Brief mention in urgency creation |
| Time orientation | Personal journey through time | Ordered sequence of organizational actions |
| Success metric | Psychological resolution and commitment | Behavioral adoption and performance change |
| Best used | When change is personal and emotional (layoffs, restructuring) | When change is strategic and structural (new strategy, M&A) |
| Complementary | Use within Kotter steps 4-8 to address individual transition | Use as overarching framework with Bridges as psychological layer |

### Application of Bridges Model in Practice

```
Phase 1: Ending, Losing, Letting Go
  Actions:
    - Clearly communicate what is ending and what is continuing
    - Acknowledge legitimate losses openly (status, relationships, competence)
    - Allow people to express grief and frustration
    - Provide as much information as possible about what to expect
    - Honor the past — celebrate what was achieved with old ways
  Signs of Completion:
    - People can talk about the change without strong negative emotion
    - People accept that the old way is genuinely over
    - Questions shift from "why" to "how"

Phase 2: The Neutral Zone
  Actions:
    - Create temporary structures and processes for the transition period
    - Set short-term goals and milestones to provide structure
    - Encourage experimentation and tolerate mistakes
    - Provide coaching and support — this is the hardest phase
    - Use the creative potential of this phase for innovation
  Signs of Completion:
    - People show energy and optimism about the new direction
    - Experimentation is producing results
    - People can articulate the new way of working
    - Anxiety has decreased noticeably

Phase 3: The New Beginning
  Actions:
    - Paint a compelling picture of the new reality
    - Clearly define new roles, responsibilities, and expectations
    - Reinforce new behaviors through recognition and rewards
    - Connect individual contributions to organizational success
    - Celebrate milestones and early successes
  Signs of Completion:
    - People identify with the new way of working
    - New behaviors are becoming habits
    - Energy and commitment are high
    - People can't imagine going back to the old way
```

## PROSCI Methodology

### The PROSCI 3-Phase Process

| Phase | Focus | Key Activities | Duration |
|-------|-------|----------------|----------|
| Phase 1: Prepare Approach | Build change management strategy | Assess change characteristics; define impact; identify risks; select methodology; build team | 2-4 weeks |
| Phase 2: Manage Change | Execute change management plan | Develop communications, sponsorship, coaching, training, and resistance management plans; execute plans | 4-20 weeks |
| Phase 3: Sustain Outcomes | Ensure change sticks | Monitor adoption; identify gaps; take corrective action; conduct lessons learned; transition to operations | 4-12 weeks |

### PROSCI Key Concepts

```
Change Management Maturity Model:
  Level 1 — Absent: No formal change management
  Level 2 — Isolated: Project-level change management (single practitioner)
  Level 3 — Standardized: Consistent methodology across projects
  Level 4 — Integrated: Change management integrated with project management
  Level 5 — Strategic: Change management as organizational capability

The Change Triangle:
  Success = Quality of Solution × Quality of Adoption
  Both factors are equally important — a great solution with poor adoption fails

Change Practitioner Roles:
  - Change Sponsor (executive): Authorizes and champions the change
  - Change Agent (practitioner): Designs and executes change management
  - Change Advocate (manager): Supports and reinforces change with their teams
  - Change Target (employee): Must adopt and use the change
```

### PROSCI ADKAR Master Plan

```yaml
prosci_master_plan:
  change: New CRM Platform Implementation
  phases:
    - phase: Prepare Approach
      activities:
        - conduct_change_characteristics_assessment
        - define_stakeholder_groups
        - assess_organizational_readiness
        - identify_risks_and_resistance
        - build_change_team
        - select_approach_and_timeline
      deliverables:
        - Change Characteristics Assessment
        - Stakeholder Map
        - Readiness Assessment
        - Risk Assessment Matrix
    - phase: Manage Change
      tracks:
        - track: Sponsorship
          activities:
            - develop_sponsor_roadmap
            - prepare_sponsor_communications
            - activate_sponsor_coalition
        - track: Communications
          activities:
            - develop_communication_plan
            - create_key_messages
            - establish_feedback_channels
        - track: Coaching
          activities:
            - develop_coaching_plan
            - prepare_manager_coaching_guides
            - train_coaches
        - track: Training
          activities:
            - conduct_training_needs_assessment
            - design_training_program
            - develop_training_materials
            - deliver_training
        - track: Resistance Management
          activities:
            - identify_resistance_sources
            - develop_mitigation_strategies
            - implement_interventions
        - track: Reinforcement
          activities:
            - define_adoption_metrics
            - establish_measurement_cadence
            - plan_celebrations_and_recognition
    - phase: Sustain Outcomes
      activities:
        - monitor_adoption_metrics
        - conduct_60_90_day_reviews
        - identify_and_address_gaps
        - conduct_lessons_learned
        - transition_change_to_operations
```

## Framework Selection Guide

### When to Use Each Framework

| Situation | Primary Framework | Complementary Framework |
|-----------|-------------------|------------------------|
| Rolling out a new software tool | ADKAR | Bridges Transition |
| Enterprise-wide restructuring | Kotter 8-Step | McKinsey 7S |
| Simple process change in one team | Lewin's 3-Stage | Force Field Analysis |
| Post-merger integration | McKinsey 7S + Kotter 8-Step | Bridges Transition |
| Implementing a new methodology (e.g., Agile) | ADKAR + Kotter 8-Step | PROSCI |
| Cultural transformation | Kotter 8-Step + Bridges | McKinsey 7S |
| Continuous improvement program | PDCA (Deming) | Lewin's 3-Stage |
| Individual behavior change | ADKAR | Bridges Transition |
| Strategic repositioning | McKinsey 7S | Kotter 8-Step |
| Emergency/crisis response | Kotter Step 1-4 only | Lewin's Unfreeze |

### Framework Integration Patterns

```
Pattern 1: ADKAR Inside Kotter
  Use Kotter as the overarching transformation framework.
  Use ADKAR within each stakeholder group to drive individual adoption.
  Example: Kotter Step 5 (Enable Action) uses ADKAR to assess what specific
  barriers each stakeholder group faces.

Pattern 2: Bridges Inside Kotter
  Use Kotter for organizational-level actions.
  Use Bridges for understanding and supporting individual transition.
  Example: During Kotter Step 4 (Enlist Volunteer Army), use Bridges Phase 1
  (Ending) to help people let go of old ways.

Pattern 3: McKinsey 7S as Diagnostic, Kotter as Action
  Use McKinsey 7S to diagnose the current alignment state.
  Use Kotter to plan and execute the transformation.
  Example: 7S gap analysis identifies misalignment in Systems and Skills;
  Kotter steps 5 and 7 address these specific gaps.

Pattern 4: Lewin + ADKAR for Targeted Change
  Use Lewin's 3-Stage for the overall change arc.
  Use ADKAR to ensure individual readiness within each stage.
  Example: In the Change stage, use ADKAR Knowledge and Ability interventions.
```

## Framework-Specific Tools

### ADKAR Scorecard

```yaml
adkar_scorecard:
  stakeholder_group: Customer Support Team
  assessment_date: 2026-04-15
  team_size: 45
  aggregated_scores:
    awareness: 4.1
    desire: 3.4
    knowledge: 2.9
    ability: 2.6
    reinforcement: 2.2
  high_scorers: 8 (score > 4.0) — potential champions
  low_scorers: 6 (score < 2.0) — need focused intervention
  gap_analysis:
    priority_1: ability (gap: 1.4)
    priority_2: reinforcement (gap: 1.3)
    priority_3: knowledge (gap: 1.1)
  action_plan:
    - element: ability
      intervention: weekly hands-on practice sessions with peer coaching
      owner: training_lead
      deadline: next 4 weeks
      success_metric: ability score >= 3.5 in next assessment
    - element: reinforcement
      intervention: implement recognition program, dashboard visibility
      owner: change_lead
      deadline: next 2 weeks
      success_metric: reinforcement score >= 3.0 in next assessment
```

### Kotter Progress Tracker

```yaml
kotter_tracker:
  initiative: Cloud Migration
  current_step: 5 (Enable Action by Removing Barriers)
  step_progress:
    step_1_create_urgency: complete
    step_2_build_coalition: complete
    step_3_form_vision: complete
    step_4_enlist_volunteers: complete
    step_5_enable_action: in_progress (60%)
    step_6_generate_wins: not_started
    step_7_sustain_acceleration: not_started
    step_8_institute_change: not_started
  barriers_identified:
    - barrier: Legacy system integration complexity
      severity: high
      status: being_addressed
      owner: engineering_lead
      resolution_date: 2026-05-30
    - barrier: Manager resistance in customer support
      severity: medium
      status: coaching_in_progress
      owner: change_lead
      resolution_date: 2026-05-15
  wins_planned:
    - First team fully migrated by June 1
    - 20% reduction in operational cost by Q3
  risks:
    - risk: Key coalition member going on leave
      impact: medium
      mitigation: Cross-train backup coalition member
```

### Change Impact Assessment Matrix

```yaml
change_impact_assessment:
  change: New Expense Reporting System
  dimensions:
    - dimension: process_change
      rating: 4/5
      detail: "Complete replacement of existing process"
    - dimension: technology_change
      rating: 3/5
      detail: "New cloud-based system, mobile app"
    - dimension: role_change
      rating: 3/5
      detail: "New approval workflow, new data entry requirements"
    - dimension: organizational_structure
      rating: 1/5
      detail: "No structural change"
    - dimension: cultural_change
      rating: 2/5
      detail: "Shift toward self-service and mobile-first"
    - dimension: skill_change
      rating: 3/5
      detail: "New system navigation, mobile app usage"
  overall_impact: moderate (2.7/5)
  stakeholder_groups_most_affected:
    - Finance team (high process change)
    - Travel-heavy employees (high technology change)
```

## References

- PROSCI — Best Practices in Change Management (ADKAR model, change management methodology)
- Kotter, J. (1996) — Leading Change (Harvard Business Review Press)
- Lewin, K. (1947) — Frontiers in Group Dynamics (Human Relations)
- Bridges, W. (1991) — Managing Transitions (Da Capo Press)
- Waterman, R., Peters, T., & Phillips, J. (1980) — Structure is Not Organization (McKinsey 7S)
- Hiatt, J. (2006) — ADKAR: A Model for Change in Business, Government and Our Community
- Deming, W.E. (1950) — Elementary Principles of Statistical Control
- Harvard Business Review — "The Hard Side of Change Management" (Nohria & Beer)
- Prosci's Best Practices in Change Management benchmarking reports
- McKinsey & Company — "The Science of Organizational Change"
- Kotter International — 8-Step Process for Leading Change toolkit
- Anderson & Anderson (2010) — Beyond Change Management
- Carnall, C. (2007) — Managing Change in Organizations
- Hayes, J. (2014) — The Theory and Practice of Change Management
- Cameron & Green (2019) — Making Sense of Change Management
