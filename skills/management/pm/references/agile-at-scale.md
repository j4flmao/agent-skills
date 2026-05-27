# Agile at Scale

## Overview

Agile at scale refers to applying agile principles and practices across multiple teams working on the same product or solution. As organizations grow beyond a single team, coordination overhead, dependency management, and alignment challenges emerge. Scaling frameworks provide structured approaches to maintain agility while managing complexity.

## Scaling Frameworks Overview

### Framework Comparison

```yaml
frameworks:
  safe:
    full_name: "Scaled Agile Framework"
    type: "Prescriptive, role-heavy"
    team_range: "50-200+ engineers"
    overhead: "High — dedicated roles, multi-day PI planning, extensive ceremonies"
    best_for: "Enterprise, regulated industries, large product portfolios"
    
  less:
    full_name: "Large-Scale Scrum"
    type: "Minimalist, principles-based"
    team_range: "2-8 teams (10-80 people)"
    overhead: "Low — extends Scrum with minimal additions"
    best_for: "Product-centric orgs, experienced agile teams, single-product focus"
    
  scrum_at_scale:
    full_name: "Scrum@Scale"
    type: "Modular, scalable"
    team_range: "2-20+ teams"
    overhead: "Medium — scales Scrum roles cyclically"
    best_for: "Organizations wanting to keep Scrum while scaling"
    
  nexus:
    full_name: "Nexus Framework"
    type: "Lightweight, team-focused"
    team_range: "3-9 teams"
    overhead: "Low — adds Nexus Integration Team to existing Scrum"
    best_for: "3-9 teams working on single product backlog"
    
  disciplined_agile:
    full_name: "Disciplined Agile (DA)"
    type: "Toolkit, goal-driven"
    team_range: "Any size"
    overhead: "Variable — choose your level of ceremony"
    best_for: "Organizations wanting flexibility, hybrid approaches"
```

## SAFe (Scaled Agile Framework)

### Overview

SAFe is the most widely adopted scaling framework, offering four configurations that add layers of structure as organizational complexity increases.

### SAFe Configurations

```yaml
configurations:
  essential_safe:
    description: "Core configuration, minimum viable SAFe"
    structure: "Single Agile Release Train (ART) with 5-12 teams"
    roles:
      - "Release Train Engineer (RTE)"
      - "Product Management"
      - "System Architect/Engineer"
      - "Business Owners"
    ceremonies:
      - "PI Planning (8-12 week cadence)"
      - "System Demo"
      - "Inspect & Adapt"
    artifacts:
      - "Program Backlog"
      - "PI Objectives"
      - "Program Board"
      - "WSJF prioritization"
    
  large_solution_safe:
    description: "For building large, complex solutions"
    structure: "Multiple ARTs coordinated by a Solution Train"
    additions:
      - "Solution Train Engineer"
      - "Solution Management"
      - "Solution Architect/Engineer"
    ceremonies:
      - "Pre-PI Planning"
      - "Solution Demo"
      - "Solution-level Inspect & Adapt"
    artifacts:
      - "Solution Backlog"
      - "Solution Intent"
      - "Capabilities and Enablers"
    
  portfolio_safe:
    description: "Aligns portfolio strategy to execution"
    structure: "Value Streams → ARTs → Teams"
    additions:
      - "Lean Portfolio Management (LPM)"
      - "Epic Owners"
      - "Enterprise Architect"
    ceremonies:
      - "Strategic Portfolio Review"
      - "Participatory Budgeting"
      - "Portfolio Sync"
    artifacts:
      - "Strategic Themes"
      - "Portfolio Canvas"
      - "Lean Budget Guardrails"
    
  full_safe:
    description: "All layers combined — portfolio, solution, program, team"
    structure: "Portfolio → Large Solution (optional) → Program → Team"
    usage: "2000+ person organizations, complex multi-product environments"
```

### SAFe Roles

```yaml
roles:
  release_train_engineer_rte:
    description: "ART-level servant leader and coach — the 'scrum master for the train'"
    responsibilities:
      - "Facilitate PI Planning readiness and execution"
      - "Facilitate ART ceremonies (System Demo, Inspect & Adapt, ART Sync)"
      - "Coach teams on SAFe practices"
      - "Track ART metrics and impediments"
      - "Facilitate cross-team coordination"
      - "Drive continuous improvement across the ART"
    qualifications:
      - "Certified SAFe Release Train Engineer (RTE)"
      - "5+ years agile experience"
      - "Strong facilitation and conflict resolution skills"

  system_architect_engineer_sae:
    description: "Technical leader defining architecture and technology direction"
    responsibilities:
      - "Define system architecture and Non-Functional Requirements (NFRs)"
      - "Participate in PI Planning to align technical direction"
      - "Support Enabler史诗 and technical risk mitigation"
      - "Establish architectural runway"
      - "Guide technology standards and patterns"
    deliverables:
      - "Architecture Vision"
      - "Enabler backlog"
      - "Technology roadmap"
      - "Architecture guidelines"

  solution_train_engineer_ste:
    description: "Facilitates Solution Train — multiple ARTs working together"
    responsibilities:
      - "Coordinate multiple ARTs toward solution goals"
      - "Facilitate Solution-level ceremonies"
      - "Manage cross-ART dependencies"
      - "Track solution-level progress and metrics"
      - "Escalation path for ART-level impediments"

  lean_agile_center_of_excellence_lace:
    description: "Internal agile transformation team"
    members:
      - "Agile coaches"
      - "Change agents"
      - "Sponsors"
      - "RTE representatives"
    responsibilities:
      - "Drive agile transformation roadmap"
      - "Establish and evolve SAFe practices"
      - "Mentor and coach leadership"
      - "Share best practices across ARTs"
      - "Measure transformation progress"
      - "Maintain Communities of Practice (CoPs)"
```

### PI Planning

PI Planning is the heartbeat of SAFe — a 2-day event occurring every 8-12 weeks where all ART members align on objectives.

```yaml
pi_planning:
  preparation:
    pre_planning_activities:
      - "Product Management prepares Program Backlog (prioritized by WSJF)"
      - "RTE prepares logistics, tools, and agenda"
      - "Teams review and estimate upcoming stories"
      - "Architecture guidance and Enabler史诗 prepared by SAE"
      - "Business Owners define business context"
    
    readiness_checks:
      - "Program Backlog is prioritized and estimated"
      - "Agenda and facilitation team confirmed"
      - "Venue/tools prepared for all participants"
      - "Draft PI Objectives template ready"
      - "Planning boards (physical or digital) prepared"

  agenda_day_1:
    morning:
      - "Business Context presentation (60 min) — market, strategy, vision"
      - "Product/Technology Vision (30 min) — top features, architecture direction"
      - "Planning breakouts — teams plan their first iteration (2-3 hours)"
    afternoon:
      - "Planning breakouts continue — teams finalize Iteration 1 plans"
      - "Draft PI Objectives review (30 min) — teams present initial objectives"
      - "Management review and problem-solving (60 min)"
      
  agenda_day_2:
    morning:
      - "Planning breakouts resume — remaining iterations"
      - "Dependency identification and management"
      - "Draft Program Board — visualizing dependencies across teams"
    afternoon:
      - "Final plan review (60 min) — each team presents PI Objectives"
      - "Risks and impediments review"
      - "Confidence vote (fist of five)"
        - "3+ means proceed with ROAMing remaining risks"
        - "< 3 means re-plan affected areas"
      - "ROAM risks: Resolved, Owned, Accepted, Mitigated"
      - "Draft PI Objectives committed"

  pi_planning_template:
    description: "Structure for team breakout sessions"
    sections:
      team_backlog:
        - "Select stories from Program Backlog for each iteration"
        - "Estimate effort and capacity match"
        - "Identify dependencies on other teams"
      
      pi_objectives:
        - "Define 3-5 SMART PI Objectives per team"
        - "Assign business value (1-10) to each objective"
        - "Identify committed vs. stretch objectives"
        - "Format: 'Objective description (BV: 7)'"
      
      program_board:
        - "Map features to teams across iterations"
        - "Visualize cross-team dependencies as arrows"
        - "Highlight milestones and external dependencies"
        - "Identify risks in each iteration"
      
      risks:
        - "List all identified risks on sticky notes"
        - "Categorize: technical, dependency, resource, external"
        - "ROAM each risk before committing"
        - "Assign owners for Owned/Accepted/Mitigated items"
```

### WSJF (Weighted Shortest Job First)

```yaml
wsjf:
  description: "Prioritization model based on Cost of Delay (CoD) divided by job size"
  formula: "WSJF = Cost of Delay / Job Size"
  
  cost_of_delay_components:
    user_business_value:
      question: "What is the value to the business or customer?"
      scale: "1-13 (relative estimation)"
      factors:
        - "Revenue impact"
        - "Cost savings"
        - "Customer satisfaction improvement"
        - "Competitive advantage"
    
    time_criticality:
      question: "How does urgency change over time?"
      scale: "1-13"
      factors:
        - "Fixed deadline (regulatory, contractual)"
        - "Market window"
        - "Seasonal relevance"
        - "First-mover advantage"
    
    risk_reduction_opportunity_enablement_ooe:
      question: "What future value does this unlock?"
      scale: "1-13"
      factors:
        - "Risk reduction (security, compliance)"
        - "Technical debt reduction"
        - "Enables future features"
        - "Platform capability building"
  
  job_size:
    question: "How much effort is required relative to others?"
    scale: "1-13 (inverse — smaller is better)"
    estimation: "Story points, ideal days, or relative sizing"
  
  wsjf_calculation:
    example:
      feature: "Multi-factor authentication"
      user_business_value: 8
      time_criticality: 10  # Regulatory deadline
      risk_reduction_ooe: 5
      job_size: 5
      
      cost_of_delay: 23  # 8 + 10 + 5
      wsjf_score: 4.6  # 23 / 5
```

### Inspect & Adapt

```yaml
inspect_and_adapt:
  description: "End-of-PI workshop for quantitative and qualitative improvement"
  agenda:
    pi_system_demo:
      description: "Integrated system demo across all teams on the ART"
      duration: "2-3 hours"
      attendees: "All ART members, stakeholders, Business Owners"
    
    quantitative_measurement:
      description: "Review PI-level metrics"
      metrics:
        - "Planned vs. actual PI Objectives (business value delivered)"
        - "Program Predictability Measure (team PI objective completion)"
        - "Flow metrics (cycle time, WIP, throughput)"
        - "Quality metrics (defect escape rate, test coverage)"
    
    retrospective_and_improvement:
      description: "Root cause analysis and improvement backlog"
      technique: "Problem-solving workshop"
      steps:
        - "Identify top improvement opportunities"
        - "Analyze root causes (5 Whys, fishbone)"
        - "Identify improvement actions"
        - "Add improvement stories to Program Backlog"
        - "Assign owners and SMART targets"
```

## LeSS (Large-Scale Scrum)

### Overview

LeSS extends Scrum to multiple teams working from the same product backlog. It has two configurations: LeSS (2-8 teams) and LeSS Huge (8+ teams).

### Principles

```yaml
less_principles:
  scaling_requires_reduction:
    description: "Add nothing that doesn't simplify — strip away complexity"
    examples:
      - "No additional roles beyond Scrum"
      - "One Product Owner, one Product Backlog"
      - "One Definition of Done for all teams"
  
  whole_product_focus:
    description: "All teams work on the same product, not components"
    implications:
      - "Feature teams (not component teams)"
      - "Teams work on customer-centric features end-to-end"
      - "Teams can work on any part of the product"
  
  more_with_less:
    description: "Achieve more with fewer artifacts and ceremonies"
    compared_to_safe: "No additional roles, no PI Planning, no program board"
    practices:
      - "One sprint for all teams"
      - "One integrated product at sprint end"
      - "Multi-team sprint review and retrospective"
```

### LeSS (2-8 Teams)

```yaml
less:
  structure:
    teams: "2-8 feature teams, 3-9 people each"
    product_owner: "Single Product Owner for all teams"
    scrum_masters: "Each team has a Scrum Master (can serve multiple teams)"
    product_backlog: "One shared backlog"
    sprint_length: "Same for all teams (typically 2-4 weeks)"
  
  ceremonies:
    sprint_planning:
      type: "Two-part multi-team event"
      part_1_overall:
        description: "All teams + PO select which items to work on"
        outcome: "Teams decide which Product Backlog items they'll own"
      part_2_team_level:
        description: "Each team plans how to deliver their selected items"
        outcome: "Team-level sprint backlog and task breakdown"
    
    daily_scrum:
      description: "Each team does their own daily scrum"
      coordination: "Cross-team coordination happens informally (hallway, chat) or through a coordinator if needed"
    
    sprint_review:
      description: "Single multi-team review with all stakeholders"
      format: "Teams demo their work, get collective feedback"
      attendees: "All teams, PO, customers, stakeholders"
    
    overall_retrospective:
      description: "Systemic improvement across all teams"
      frequency: "End of every sprint"
      focus: "Cross-team issues, organizational impediments"
      process:
        - "Teams do internal retrospectives first"
        - "Representatives join overall retrospective"
        - "Identify systemic problems affecting multiple teams"
        - "Generate improvement experiments"
      techniques:
        - "ESVP (Explorer, Shopper, Vacationer, Prisoner)"
        - "Sailboat (wind, anchor, rocks, iceberg)"
        - "Timeline with emotions"
        - "5 Whys for root cause analysis"
    
    multi_team_sprint_planning_2:
      description: "Teams coordinate on detailed design and interfaces"
      when: "After Sprint Planning 1, if cross-team dependencies exist"
      format: "Informal — teams discuss integration points"
  
  definition_of_done:
    description: "Single DoD for all teams — if any team can't meet it, the product isn't done"
    must_include:
      - "Code reviewed and merged to mainline"
      - "Automated tests pass (unit, integration, acceptance)"
      - "Documentation updated"
      - "Deployed to staging environment"
      - "Non-functional requirements verified"
    extension: "Teams can add to the DoD but never subtract"
```

### LeSS Huge (8+ Teams)

```yaml
less_huge:
  structure:
    requirement_areas:
      description: "Divide the product into customer-focused areas"
      example_areas:
        - "Payments"
        - "Orders"
        - "Inventory"
        - "Reporting"
      guidance: "3-8 requirement areas max — each owned by Area Product Owner (APO)"
    
    area_product_owner_apo:
      description: "Focuses on one requirement area"
      relationship: "Reports to overall Product Owner"
      responsibilities:
        - "Refine area-level backlog"
        - "Clarify requirements for their area's teams"
        - "Participate in area-level sprint planning"
    
    overall_product_owner:
      description: "Single PO accountable for entire product"
      responsibilities:
        - "Define product vision and strategy"
        - "Prioritize across requirement areas"
        - "Align APOs on overall direction"
    
    area_scrum_masters:
      description: "Scrum Masters assigned to requirement areas"
      focus: "Cross-team coaching within the area"
  
  additional_ceremonies:
    area_sprint_planning:
      description: "Teams within a requirement area coordinate on sprint backlog selection"
    area_retrospective:
      description: "Area-level improvement before overall retrospective"
    overall_sprint_review:
      description: "All areas demo to all stakeholders"
```

### Feature Teams vs. Component Teams

```yaml
feature_vs_component_teams:
  feature_teams:
    description: "End-to-end ownership of customer-facing features"
    structure: "Cross-functional team with all skills needed to deliver a feature"
    advantages:
      - "Customer-focused — teams own value delivery"
      - "Reduced handoffs and dependencies"
      - "Higher ownership and motivation"
      - "Faster time-to-market for features"
      - "Systems thinking — teams see the whole"
    disadvantages:
      - "Broader knowledge required from each member"
      - "More difficult to develop deep expertise"
      - "May duplicate infrastructure/component knowledge"
      - "Onboarding takes longer"
    conways_law_implication: "Feature teams produce feature-oriented architecture"
    best_for: "Product companies, customer-facing features, end-to-end flow"
  
  component_teams:
    description: "Own specific technical components or layers"
    structure: "Specialists in a technical domain (e.g., database team, UI team)"
    advantages:
      - "Deep technical expertise in component"
      - "Efficient component development and optimization"
      - "Clear ownership boundaries"
      - "Easier onboarding to specific component"
    disadvantages:
      - "Handoff overhead between teams"
      - "Features require multiple teams — slow delivery"
      - "Optimize locally, suboptimize globally"
      - "Blame culture between teams"
      - "Integration risk at feature delivery time"
    conways_law_implication: "Component teams produce service-oriented architecture, often overly coupled"
    best_for: "Platform/infrastructure teams, specialized technical domains"
  
  organizational_design_guidance:
    conways_law: "Organizations design systems that mirror their communication structure"
    inverse_conway: "To get a desired architecture, restructure teams to match"
    recommendations:
      - "Start with feature teams for delivery — the primary value stream"
      - "Keep component teams only where deep specialization is critical"
      - "Platform teams enable feature teams — build internal products"
      - "Avoid matrixed component teams — split or rotate instead"
      - "Transition gradually — 1-2 feature teams first, measure outcomes, expand"
  
  team_topologies:
    description: "Four fundamental team types for modern software delivery"
    types:
      stream_aligned:
        description: "Aligned to a flow of work (product, service, feature area)"
        goal: "Deliver value directly to customers"
        example: "Checkout team, Search team"
      
      enabling:
        description: "Helps stream-aligned teams acquire missing capabilities"
        goal: "Bridge skill gaps, accelerate learning"
        example: "DevOps enablement, Testing coaching"
      
      complicated_subsystem:
        description: "Owns a technically complex component requiring deep expertise"
        goal: "Maintain and evolve high-difficulty subsystems"
        example: "Video encoding engine, Payment processing core"
      
      platform:
        description: "Provides internal services that reduce cognitive load for stream teams"
        goal: "Self-service infrastructure and shared capabilities"
        example: "CI/CD platform, Shared auth service, Data platform"
```

## Scrum@Scale

### Overview

Scrum@Scale (S@S) scales Scrum through a modular, cyclic approach. It extends Scrum roles and events into two cycles: the Scrum Master Cycle and the Product Owner Cycle.

### Scrum Master Cycle

```yaml
scrum_master_cycle:
  scaled_roles:
    scrum_of_scrums_master_sosm:
      description: "Coordinates across teams — equivalent to Scrum Master for the Scrum of Scrums"
      responsibility: "Removing systemic impediments, coordinating cross-team work"
    
    executive_action_team_eat:
      description: "Leadership team that removes organizational impediments"
      composition: "Senior leaders who can make org-level decisions"
      meeting_frequency: "Weekly or bi-weekly"
      output: "Organizational changes, policy updates, resource decisions"
  
  scrum_of_scrums:
    description: "Cross-team coordination meeting"
    frequency: "2-3 times per week (or daily during high-dependency periods)"
    participants: "Each team sends a representative (usually Scrum Master or lead)"
    duration: "15-30 minutes"
    agenda:
      - "What did your team do since last SoS?"
      - "What will your team do before next SoS?"
      - "What impediments does your team face?"
      - "Are there cross-team dependencies to raise?"
    escalation_path: "Unresolved impediments → Executive Action Team"
  
  scaled_daily_scrum:
    structure: "Each team has its own daily scrum, then representatives meet in Scrum of Scrums"
    frequency: "Daily"
    duration: "15 min per team + 15 min SoS"
    coordination: "Teams can send different reps based on the day's coordination needs"
```

### Product Owner Cycle

```yaml
product_owner_cycle:
  scaled_roles:
    chief_product_owner_cpo:
      description: "Overall accountable for product strategy and backlog"
      responsibility: "Aligning multiple Product Owners toward common vision"
    
    product_owner_team:
      description: "POs for different areas/components coordinate"
      composition: "Feature area POs, CPO"
      purpose: "Cross-team prioritization and backlog alignment"
  
  scaled_product_owner_meeting:
    frequency: "Weekly or bi-weekly"
    participants: "Chief PO, Product Owners, Stakeholders"
    agenda:
      - "Review product-level metrics and progress"
      - "Adjust cross-team priorities"
      - "Resolve backlog conflicts"
      - "Align on upcoming features"
      - "Stakeholder feedback and market changes"
  
  cross_team_backlog_refinement:
    frequency: "Before each Sprint Planning"
    format: "POs review and refine the top of their backlogs together"
    outcome: "Shared understanding of priorities across teams"
    techniques:
      - "WSJF prioritization at portfolio level"
      - "Impact mapping for feature alignment"
      - "User story mapping across teams"
```

### Executive Action Team

```yaml
executive_action_team_eat:
  description: "Leadership-level impediment removal body"
  composition:
    - "VP/CTO level"
    - "Chief Product Owner"
    - "Scrum of Scrums Master(s)"
    - "HR/Business representatives as needed"
  
  meeting_format:
    frequency: "Bi-weekly"
    duration: "60 minutes"
    agenda:
      - "Review impediments escalated from Scrum of Scrums"
      - "Assign owners and deadlines for each impediment"
      - "Track organizational change progress"
      - "Review transformation metrics"
      - "Make policy and resource decisions"
  
  typical_impediments:
    - "Budget constraints blocking team growth"
    - "Organizational policies contradicting agile values"
    - "Cross-department coordination deadlocks"
    - "Technology migration decisions"
    - "Hiring freezes impacting team capacity"
    - "Compliance processes blocking deployment cadence"
```

## Nexus

### Overview

Nexus is a lightweight scaling framework from Ken Schwaber (Scrum co-creator) designed for 3-9 teams working from a single Product Backlog. It adds minimal overhead to Scrum.

```yaml
nexus:
  structure:
    nexus_integration_team:
      description: "Central coordination body"
      members:
        - "Product Owner"
        - "Scrum Master (or Nexus Scrum Master)"
        - "Nexus Integration Team members"
      responsibilities:
        - "Ensure integrated product at each Sprint"
        - "Manage dependencies"
        - "Coaches cross-team Scrum"
        - "Manages Nexus Sprint Backlog"
      
    nexus_scrum_master:
      description: "Single Scrum Master serving all teams (or one per 2-3 teams)"
      responsibilities:
        - "Coach all teams on Nexus practices"
        - "Facilitate Nexus events"
        - "Remove cross-team impediments"
        - "Improve overall Scrum effectiveness"
    
    development_teams:
      description: "3-9 Scrum teams, each 3-9 people"
      constraint: "All teams share the same Product Backlog and Sprint cadence"
  
  nexus_events:
    nexus_sprint_planning:
      description: "Replaces individual team Sprint Planning"
      duration: "2 hours per week of sprint (max 8 hours)"
      participants: "Nexus Integration Team + all team representatives"
      agenda:
        - "Review Product Backlog top items"
        - "Map backlog items to teams"
        - "Identify cross-team dependencies"
        - "Create Nexus Sprint Backlog"
        - "Each team creates their Sprint Backlog"
    
    nexus_daily_scrum:
      description: "Daily coordination across teams"
      duration: "15 minutes"
      participants: "Nexus Integration Team + select team members"
      focus: "Integration status, new dependencies, cross-team issues"
    
    nexus_sprint_review:
      description: "Review of integrated increment"
      participants: "Stakeholders, all teams, PO"
      focus: "Integrated product demo, not individual team demos"
    
    nexus_sprint_retrospective:
      description: "Two-part retrospective"
      part_1:
        description: "Individual team retrospectives (internal improvement)"
      part_2:
        description: "Nexus retrospective (cross-team improvement)"
        focus: "Integration issues, dependency management, Nexus process"
    
    nexus_refinement:
      description: "Cross-team backlog refinement"
      frequency: "Throughout the sprint"
      focus: "Breaking down large items, dependency identification, sizing"
      outcome: "Refined backlog items ready for next Sprint Planning"
```

## Choosing a Framework

### Decision Framework

```yaml
framework_selection:
  factors:
    team_count:
      question: "How many teams need coordination?"
      mapping:
        1: "Standard Scrum — no scaling framework needed"
        2_3: "Scrum of Scrums or informal coordination"
        3_9: "Nexus or Scrum@Scale work well"
        2_8: "LeSS — strong for single product focus"
        5_20: "SAFe Essential or Scrum@Scale"
        20_plus: "SAFe Portfolio/Large Solution, or custom approach"
    
    organizational_complexity:
      question: "How many products, stakeholders, and regulatory constraints?"
      low: "Single product, few stakeholders, no regulatory — LeSS or Nexus"
      medium: "Multiple products, moderate compliance — Scrum@Scale or SAFe Essential"
      high: "Portfolio of products, heavy regulation — SAFe Portfolio/Large Solution"
    
    organizational_culture:
      question: "How does the organization handle process and autonomy?"
      high_autonomy_lean: "LeSS — minimal rules, trust teams"
      moderate_structure: "Scrum@Scale — modular, adaptable"
      low_autonomy_hierarchical: "SAFe — explicit roles and ceremonies"
      hybrid: "Disciplined Agile — pick and choose practices"
    
    existing_experience:
      question: "What is the team's agile maturity?"
      beginner: "SAFe provides structure and guidance"
      intermediate: "Scrum@Scale or Nexus — extends familiar Scrum"
      advanced: "LeSS — requires deep agile understanding"
      expert: "Custom scaling based on lean principles"
  
  assessment_checklist:
    - "How many total people need coordination?"
    - "Is this a single product or portfolio of products?"
    - "What regulatory/compliance requirements exist?"
    - "What is the current agile maturity?"
    - "Is leadership willing to adopt prescribed roles?"
    - "What is the tolerance for ceremony overhead?"
    - "Are teams collocated or distributed?"
    - "What is the release cadence requirement?"
    - "How much cross-team dependency exists?"
    - "What is the organizational culture (command vs. empower)?"
  
  culture_fit_assessment:
    dimensions:
      decision_making:
        command_and_control:
          fit: "SAFe provides clear escalation and decision hierarchy"
          risk: "May revert to command behaviors despite agile intent"
        empowered_teams:
          fit: "LeSS or Scrum@Scale align with team autonomy"
          risk: "Teams may resist SAFe's prescribed roles"
      
      process_adherence:
        high_ceremony:
          fit: "SAFe's structured approach is predictable"
          risk: "Process can become rigid, losing agility"
        low_ceremony:
          fit: "LeSS or Nexus keep ceremonies minimal"
          risk: "May lack coordination visibility at large scale"
      
      change_appetite:
        incremental_safe:
          fit: "Scrum@Scale — start with Scrum of Scrums, add as needed"
          approach: "Start with Scrum of Scrums, add structure gradually"
        transformative:
          fit: "SAFe or LeSS — requires organizational commitment"
          approach: "Invest in training, coaching, and structural changes up front"
```

## Dependency Management at Scale

### Dependency Mapping

```yaml
dependency_types:
  knowledge:
    description: "Team A needs to understand what Team B is doing"
    example: "Frontend team needs API contract from backend team"
    mitigation: "Shared design sessions, API contract reviews, consumer-driven contracts"
  
  task:
    description: "Team A's work blocks Team B"
    example: "Platform team must deploy shared library before feature teams can use it"
    mitigation: "Shared milestones, dependency tracking, slack time"
  
  resource:
    description: "Teams compete for same limited resource"
    example: "Two teams need the same QA environment"
    mitigation: "Schedule coordination, self-service environments, cloud resources"
  
  technical:
    description: "Technical integration points between teams"
    example: "Feature team needs to integrate with authentication service"
    mitigation: "Contract testing, API versioning, integration environments"
```

### Dependency Board

```yaml
dependency_board:
  description: "Visual management of cross-team dependencies, often created during PI Planning"
  
  columns:
    identified:
      description: "Dependencies identified but not yet analyzed"
    committed:
      description: "Provider team has committed to deliver"
    in_progress:
      description: "Provider team is actively working on the dependency"
    delivered:
      description: "Provider has completed their part"
    verified:
      description: "Receiver team has validated the dependency"
  
  dependency_card_format:
    id: "DEP-042"
    description: "User service needs to expose GET /users/{id}/preferences endpoint"
    source_team: "User Service Team"
    target_team: "Frontend Team"
    due_iteration: "Iteration 3"
    status: "In Progress"
    risk_level: "High"
    blocking: false
  
  dependency_tracking_template:
    columns:
      - "Dependency ID"
      - "Description"
      - "Source Team"
      - "Target Team"
      - "Due By"
      - "Status"
      - "Risk Level"
      - "Notes"
  
  management_practices:
    pi_planning_dependency_slam:
      description: "Rapid dependency identification session during PI Planning"
      technique: "Teams walk the program board together, identify and annotate all dependency arrows"
    
    weekly_dependency_review:
      description: "Review and update dependency board"
      participants: "Scrum Masters, Tech Leads, affected PO representatives"
      frequency: "Weekly"
      
    dependency_slack:
      description: "Assign buffer time for dependency delivery"
      guidance: "Include 20% buffer for external dependencies; 10% for internal"
    
    escalation_protocol:
      level_1: "Team leads discuss and resolve"
      level_2: "Scrum Master/PO coordination escalates"
      level_3: "RTE or management intervention"
      level_4: "Executive Action Team or LPM decision"
```

### Risk Management at Scale

```yaml
risk_management_scaled:
  pi_level_risks:
    identification:
      - "PI Planning risk board"
      - "Dependency board analysis"
      - "Team capability assessment"
      - "External factor review (market, regulatory, vendor)"
    
    classification:
      technical:
        examples:
          - "New technology adoption risk"
          - "Integration complexity"
          - "Performance scaling unknowns"
        response: "Add Enabler stories, spikes, POCs to PI backlog"
      
      dependency:
        examples:
          - "External vendor delivery uncertainty"
          - "Cross-team feature coupling"
          - "API contract instability"
        response: "Buffer time, early integration, contract testing"
      
      resource:
        examples:
          - "Team availability (PTO, attrition)"
          - "Skill gaps in critical areas"
          - "Environment/infrastructure availability"
        response: "Cross-training, capacity buffers, shared resources"
      
      organizational:
        examples:
          - "Reorganization during PI"
          - "Leadership priority shifts"
          - "Budget changes"
        response: "Engage LACE, transparent communication, slack in plan"
    
    roam_technique:
      resolved:
        description: "Risk has been addressed and no longer a concern"
      owned:
        description: "Someone is responsible for monitoring and response"
      accepted:
        description: "Explicit acknowledgment without active mitigation"
      mitigated:
        description: "Actions taken to reduce probability or impact"
```

## Coordination Across Teams

### Coordination Mechanisms

```yaml
coordination_techniques:
  scrum_of_scrums:
    description: "Cross-team synchronization meeting"
    frequency: "2-3x per week"
    duration: "15 minutes"
    participants: "Team representatives (rotating or fixed)"
    agenda: "Standard daily scrum questions from each team's rep"
    best_for: "Day-to-day coordination, rapid issue resolution"
  
  art_sync:
    description: "SAFe-specific weekly coordination"
    frequency: "Weekly"
    duration: "30-60 minutes"
    participants: "RTE, Scrum Masters, Product Managers"
    agenda:
      - "Program-level metrics review"
      - "Dependency status update"
      - "Impediment review and escalation"
      - "Upcoming milestones and events"
    best_for: "Program-level alignment in SAFe contexts"
  
  cross_team_backlog_refinement:
    description: "Multi-team backlog grooming session"
    frequency: "Every 2 weeks"
    participants: "POs, tech leads from each team"
    focus: "Shared backlog items, large史诗 decomposition, dependency identification"
    best_for: "Ensuring backlog alignment across teams"
  
  communities_of_practice_cop:
    description: "Cross-team knowledge sharing groups"
    frequency: "Every 2-4 weeks"
    formats:
      - "Tech guild (architecture, specific technologies)"
      - "Process guild (agile practices, estimation)"
      - "Testing guild (automation, quality)"
      - "DevOps guild (CI/CD, infrastructure)"
    benefits:
      - "Spread expertise across teams"
      - "Build shared technical standards"
      - "Reduce silo knowledge"
      - "Career development and mentoring"
    best_for: "Long-term capability building, standardization"
  
  joint_sprint_review:
    description: "Unified sprint review across multiple teams"
    frequency: "End of every sprint"
    attendees: "All teams, stakeholders, customers"
    format: "Integrated demo showing how features work together"
    best_for: "End-to-end stakeholder feedback, big-picture visibility"
  
  management_review:
    description: "Leadership-level progress review"
    frequency: "Every 2-4 weeks"
    participants: "RTE/leadership, PO, Engineering Managers"
    agenda:
      - "Metric review (velocity, quality, flow)"
      - "Resource allocation decisions"
      - "Organizational impediment escalation"
      - "Portfolio alignment check"
    best_for: "Strategic alignment, resource decisions, governance"
```

## Technical Practices for Scaling

### Engineering Practices

```yaml
technical_practices:
  continuous_integration_ci:
    description: "Every team member merges code to trunk daily"
    scaling_considerations:
      - "Feature flags separate deployment from release"
      - "Trunk-based development with short-lived branches (< 24 hours)"
      - "Automated build verification for every commit"
      - "Parallel CI pipelines for multiple teams"
    practices:
      - "Branch by abstraction for large changes"
      - "Dark launches for gradual rollout"
      - "Canary releases for risk reduction"
  
  trunk_based_development:
    description: "All teams work on a single shared trunk"
    rules:
      - "Branches live less than one day"
      - "No long-lived feature branches"
      - "Feature flags gate incomplete features"
      - "Small, frequent commits"
    benefits_at_scale:
      - "Integration happens continuously, not in bursts"
      - "Merge conflicts are rare and small"
      - "CI is fast because diffs are small"
      - "Any team can quickly integrate with any other"
    anti_patterns:
      - "Release branches that live for weeks"
      - "Feature branches per team that merge only at PI boundary"
      - "Branch-per-environment strategy"
  
  feature_flags:
    description: "Toggle features on/off without deployment"
    scaling_patterns:
      - "Centralized flag management system"
      - "Environment-specific flag configurations"
      - "Gradual rollout percentages"
      - "Kill switches for immediate disable"
      - "Flag expiry and cleanup automation"
    types:
      release_toggle: "Gate unfinished features in production"
      experiment_toggle: "A/B test feature variants"
      ops_toggle: "Operational controls (circuit breaker, maintenance mode)"
      permission_toggle: "Control feature access by user segment"
  
  test_automation:
    scaled_architecture:
      test_pyramid_at_scale:
        unit: "70% — fast, isolated, run on every commit"
        integration: "20% — contract tests, API tests, run on merge"
        end_to_end: "10% — critical paths only, run on deployment"
      
      parallel_execution:
        description: "Distribute test execution across CI agents"
        strategy: "Partition by test type, then by directory/component"
        target: "Full test suite < 10 minutes"
      
      test_impact_analysis:
        description: "Run only tests affected by code changes"
        technique: "Dependency graph mapping code to tests"
        benefit: "75-90% reduction in CI time"
      
      non_functional_testing:
        performance: "Baseline + regression detection on every deployment"
        security: "SAST on every commit, DAST weekly, penetration quarterly"
        accessibility: "Automated accessibility checks in CI pipeline"
```

## DevOps at Scale

```yaml
devops_at_scale:
  platform_team:
    description: "Internal platform team that enables stream-aligned teams"
    mission: "Reduce cognitive load on delivery teams"
    services:
      - "CI/CD pipelines as a service"
      - "Shared deployment tooling"
      - "Monitoring and observability platform"
      - "Secret management and security scanning"
      - "Container orchestration platform"
      - "Development environments (local, ephemeral, preview)"
    team_topology:
      type: "Platform team (as per Team Topologies)"
      interaction_mode: "Self-service APIs and tools, not handoffs"
    
  shared_tooling:
    principles:
      - "Self-service over ticket-based access"
      - "APIs over GUIs for automation"
      - "Standardized templates with team customization"
      - "Documented service level objectives (SLOs)"
    
    tools_catalog:
      source_control: "Single platform (GitHub/GitLab) with standardized branching"
      ci_cd: "Shared pipeline templates with team-specific stages"
      artifact_storage: "Centralized artifact registry"
      container_registry: "Shared image registry with vulnerability scanning"
      infrastructure_as_code: "Shared modules and patterns"
      
  standardized_pipelines:
    pipeline_template:
      stages:
        commit:
          triggers: "PR created or updated"
          steps:
            - "Code linting"
            - "Unit tests"
            - "Security scan (SAST)"
            - "Build artifact"
        
        merge:
          triggers: "Merge to trunk"
          steps:
            - "Integration tests"
            - "Contract tests"
            - "Dependency scan"
            - "Build and push Docker image"
        
        deploy_staging:
          triggers: "Merge to trunk"
          steps:
            - "Deploy to staging environment"
            - "Smoke tests"
            - "E2E critical path tests"
            - "Performance baseline test"
        
        deploy_production:
          triggers: "Manual approval (deploy gate)"
          steps:
            - "Canary deployment (10% traffic)"
            - "Synthetic monitoring check"
            - "Gradual rollout (25%, 50%, 100%)"
            - "Rollback on metric degradation"
    
    self_service_infrastructure:
      capabilities:
        - "One-click environment provisioning"
        - "Ephemeral preview environments per PR"
        - "Database seeding with production-like data"
        - "Load testing environments on demand"
        - "Environment cleanup automation"
```

## Organizational Design

### Team Topologies in Practice

```yaml
team_topologies_practice:
  stream_aligned_teams:
    description: "Team aligned to a single, valuable stream of work"
    design_principles:
      - "Each team has end-to-end ownership of a feature area"
      - "Team can deliver value without waiting on other teams"
      - "Team size supports pizza-team principle (6-9 people)"
      - "Cross-functional composition covers all needed skills"
    
    stream_types:
      product_team: "Owns a specific product or feature set"
      service_team: "Owns a specific internal service or API"
      feature_area_team: "Owns a customer journey or workflow"
      delivery_team: "Owns delivery of a specific project or program"
  
  enabling_teams:
    description: "Helps stream-aligned teams acquire capabilities"
    characteristics:
      - "Temporary — disband when capability is built"
      - "Small — 2-4 people with deep expertise"
      - "Coaching-focused — teaches, doesn't do the work"
      - "Demand-driven — responds to team requests"
    lifecycle:
      - "Identify capability gap across teams"
      - "Form enabling team with experts"
      - "Engage with teams to build capability"
      - "Transition ownership to teams"
      - "Dissolve enabling team"
  
  complicated_subsystem_teams:
    description: "Owns technically complex components"
    when_to_use:
      - "Component requires rare, deep expertise"
      - "Component has extreme quality/reliability requirements"
      - "Component changes infrequently but requires expert maintenance"
      - "Specialized hardware or domain knowledge required"
    
    risks:
      - "Becomes bottleneck for feature teams"
      - "Creates handoff overhead"
      - "May optimize for technical purity over customer value"
    
    mitigation:
      - "Clear SLAs for feature team requests"
      - "APIs and interfaces designed for consumption, not implementation"
      - "Regular rotation of engineers between subsystem and feature teams"
  
  platform_teams:
    description: "Provides internal products for stream-aligned teams"
    product_mindset:
      - "Treats other teams as customers"
      - "Focuses on user experience (developer experience)"
      - "Measures adoption, satisfaction, and time-to-value"
      - "Competes for adoption — no forced mandates"
    
    platform_tiers:
      tier_1_core: "Mandatory — CI/CD, logging, monitoring, auth"
      tier_2_shared: "Highly recommended — database, messaging, caching"
      tier_3_optional: "Value-added — template generators, migration tools"
    
    team_interaction_modes:
      collaboration: "Platform teams work directly with stream teams (short-term)"
      x_as_a_service: "Stream teams consume platform capabilities via APIs (long-term)"
      facilitating: "Platform team enables stream teams to self-serve"
```

## Metrics at Scale

### Measurement Framework

```yaml
metrics_at_scale:
  flow_metrics:
    cycle_time:
      description: "Time from work start to delivery"
      measurement: "Start when first commit is made; end when deployed to production"
      target: "< 1 week per story point"
      visualization: "Cycle time scatterplot with percentile lines"
    
    work_in_progress_wip:
      description: "Items started but not finished"
      measurement: "Count of stories in 'In Progress' or equivalent across teams"
      target: "2 items per team member, max"
      visualization: "Cumulative flow diagram"
    
    throughput:
      description: "Items completed per unit time"
      measurement: "Completed stories per sprint or per week"
      visualization: "Throughput run chart with moving average"
    
    flow_efficiency:
      description: "Ratio of active work time to total elapsed time"
      calculation: "Active time / (Active time + Wait time) × 100"
      target: "> 40%"
  
  dora_metrics:
    deployment_frequency:
      description: "How often code is deployed to production"
      elite: "Multiple deployments per day"
      high: "Weekly to monthly"
      medium: "Monthly to quarterly"
      low: "Less than quarterly"
    
    lead_time_for_changes:
      description: "Time from commit to production"
      elite: "Less than 1 hour"
      high: "Less than 1 week"
      medium: "Less than 1 month"
      low: "More than 6 months"
    
    change_failure_rate:
      description: "Percentage of deployments causing failures"
      elite: "0-5%"
      high: "5-10%"
      medium: "10-15%"
      low: "> 15%"
    
    time_to_restore:
      description: "Time to recover from failure"
      elite: "Less than 1 hour"
      high: "Less than 1 day"
      medium: "Less than 1 week"
      low: "More than 6 months"
  
  okr_cascading:
    description: "Align objectives from portfolio to team level"
    structure:
      portfolio_level:
        objectives: "Strategic (annual, 3-5 objectives)"
        key_results: "Metric-based, quantitative"
        example: "Increase customer retention (OKR: reduce churn from 5% to 3%)"
      
      program_level:
        objectives: "Aligned to portfolio (quarterly)"
        key_results: "Feature adoption, quality targets"
        example: "Deliver customer loyalty program (OKR: 80% target adoption in 90 days)"
      
      team_level:
        objectives: "Contributes to program objectives (sprint to quarter)"
        key_results: "Delivery milestones, quality metrics"
        example: "Implement loyalty points engine (OKR: 100% points calculation accuracy)"
    
    alignment_patterns:
      - "Portfolio OKRs → Program OKRs → Team OKRs (hierarchical)"
      - "Teams contribute to multiple program OKRs (matrix)"
      - "Each team has 1-2 OKRs per quarter"
      - "OKRs are aspirational (70% completion is success)"
  
  value_stream_mapping:
    description: "End-to-end flow analysis from idea to delivered value"
    steps:
      - "Map current state: all steps from request to deployment"
      - "Identify waste: wait time, handoffs, rework, delays"
      - "Measure: cycle time, touch time, % complete & accurate"
      - "Design future state: eliminate non-value-add steps"
      - "Implement improvements and re-measure"
    
    common_waste_at_scale:
      - "Multi-team handoffs for single feature delivery"
      - "Queue time in shared testing/review pools"
      - "Environment provisioning delays"
      - "Release coordination overhead"
      - "Cross-team approval gates"
      - "Relearning due to poor documentation"
```

## Communication Patterns

```yaml
communication_patterns:
  daily_coordination:
    scrum_of_scrums:
      frequency: "Daily"
      duration: "15 min"
      participants: "Team reps"
      format: "Standing, high-energy"
      output: "Visibility, raised impediments"
    
    team_daily_standup:
      frequency: "Daily"
      duration: "15 min"
      participants: "Each team internally"
      format: "Focus on coordination needs"
  
  weekly_synchronization:
    art_sync:
      frequency: "Weekly"
      duration: "30-60 min"
      participants: "RTE, Scrum Masters, PM"
      format: "Metrics, dependency status, impediments"
    
    product_owner_sync:
      frequency: "Weekly"
      duration: "30-60 min"
      participants: "Chief PO, POs, Stakeholders"
      format: "Backlog alignment, priority adjustment"
  
  periodic_reviews:
    management_review:
      frequency: "Bi-weekly or monthly"
      duration: "60 min"
      participants: "Leadership, PM, RTE"
      format: "Strategic progress, resource decisions"
    
    system_demo:
      frequency: "End of every iteration"
      duration: "60-90 min"
      participants: "All teams, stakeholders"
      format: "Integrated system demo"
    
    community_of_practice:
      frequency: "Bi-weekly"
      duration: "60-90 min"
      participants: "By guild (testing, devops, architecture)"
      format: "Knowledge sharing, standard alignment"
  
  escalation_patterns:
    level_1: "Team internal — resolve within team standup"
    level_2: "Scrum of Scrums — cross-team impediment"
    level_3: "RTE/Management — resource or organizational"
    level_4: "Executive Action Team — systemic policy change"
```

## Impediment Removal at Scale

```yaml
impediment_removal:
  escalation_paths:
    team_level:
      impediments: "Technical blockers, unclear requirements, tooling issues"
      escalation: "Scrum Master within daily standup"
      resolution_time: "< 24 hours"
    
    cross_team_level:
      impediments: "Dependency conflicts, shared resource contention"
      escalation: "RTE through ART Sync or Scrum of Scrums"
      resolution_time: "Within sprint"
    
    organizational_level:
      impediments: "Policy constraints, budget issues, structural barriers"
      escalation: "LACE or Executive Action Team"
      resolution_time: "1-4 weeks"
    
    systemic_level:
      impediments: "Culture issues, compensation misalignment, career path problems"
      escalation: "Executive sponsor, HR, organizational design initiative"
      resolution_time: "Months to quarters"
  
  impediment_tracking:
    tool: "Shared impediment board (visual management)"
    fields:
      - "ID and description"
      - "Date identified"
      - "Impacted teams"
      - "Impact severity"
      - "Current status"
      - "Assigned resolver"
      - "Target resolution date"
      - "Escalation level"
  
  organizational_change_management:
    framework: "ADKAR (Awareness, Desire, Knowledge, Ability, Reinforcement)"
    application_to_impediments:
      awareness: "Help stakeholders understand why the impediment exists and its impact"
      desire: "Build motivation for change — what's in it for them?"
      knowledge: "Provide training and information on new processes"
      ability: "Give time and resources to implement change"
      reinforcement: "Celebrate wins, measure sustainability, prevent backsliding"
```

## Budgeting and Planning

```yaml
budgeting_and_planning:
  lean_budgeting:
    principles:
      - "Budget by value stream, not project"
      - "Empower teams to make spending decisions within guardrails"
      - "Reduce annual budget cycles — move to rolling forecasts"
      - "Use participatory budgeting where teams allocate funds"
    
    budget_allocation:
      value_stream_1: "45% of budget"
      value_stream_2: "30% of budget"
      enabling_work: "15% of budget"
      unplanned_work: "10% of budget"
    
    guardrails:
      - "Spend authority limits per value stream"
      - "Fiscal year compliance requirements"
      - "Approval needed for > 20% deviation from plan"
      - "Quarterly portfolio review for rebalancing"
  
  rolling_wave_planning:
    description: "Plan near-term in detail, long-term in broad strokes"
    application:
      horizon_1_immediate: "Current quarter — detailed sprint plans, committed scope"
      horizon_2_near: "Next quarter — PI Objectives, feature-level scope, estimates"
      horizon_3_mid: "6-12 months — epic-level roadmap, thematic priorities"
      horizon_4_far: "12+ months — strategic themes, portfolio direction"
    
    planning_cadence:
      quarterly: "Detailed PI planning (SAFe) or quarterly planning event"
      monthly: "Forecast update, dependency review, budget check"
      weekly: "Sprint planning, backlog refinement, resource adjustment"
  
  beyond_budgeting_principles:
    governance:
      - "Relative targets instead of fixed budgets (e.g., improve efficiency 10%)"
      - "Rolling forecasts instead of annual budget cycle"
      - "Resource availability planning instead of allocation"
    
    accountability:
      - "Teams accountable for outcomes, not output"
      - "Decentralized decision-making within clear principles"
      - "Performance reviews focus on relative contribution, not budget adherence"
    
    adaptation:
      - "Dynamic resource reallocation based on changing priorities"
      - "Fast approval processes for deviations (< 48 hours)"
      - "Eliminate annual performance targets tied to budget"
```

## Cultural Considerations

```yaml
cultural_considerations:
  organizational_culture_change:
    characteristics:
      from: "Command-and-control, siloed, risk-averse"
      to: "Empowered teams, cross-functional, experimentation"
    
    dimensions_of_change:
      trust:
        from: "Micromanagement, detailed status reports"
        to: "Outcome-based trust, visibility over control"
      
      failure:
        from: "Blame culture, failure punished"
        to: "Learning culture, blameless postmortems"
      
      transparency:
        from: "Information hoarded, need-to-know basis"
        to: "Radical transparency, open information access"
      
      decision_making:
        from: "Top-down decisions, approval chains"
        to: "Decentralized decisions, clear principles"
    
    culture_assessment:
      survey_dimensions:
        - "Psychological safety — can people speak up?"
        - "Team autonomy — do teams control their work?"
        - "Cross-team collaboration — do teams help each other?"
        - "Learning orientation — is experimentation rewarded?"
        - "Leadership support — do leaders model agile behaviors?"
  
  leadership_buy_in:
    leadership_transformation:
      role_changes:
        from_commander: "Gives detailed instructions, makes all decisions"
        to_servant_leader: "Sets vision, removes impediments, coaches"
        
        from_controller: "Tracks hours, micro-manages tasks"
        to_enabler: "Provides resources, trust teams' judgment"
        
        from_gatekeeper: "Approves every decision, blocks autonomy"
        to_coach: "Defines principles, lets teams self-organize"
    
    leadership_commitment_indicators:
      - "Leaders attend PI Planning and stay for full duration"
      - "Leaders visibly remove impediments within 48 hours"
      - "Leaders fund agile coaching and training"
      - "Leaders adjust compensation to reward collaboration"
      - "Leaders model agile behaviors (transparency, feedback, experimentation)"
  
  transformation_roadmap:
    phase_1_foundation_0_3_months:
      actions:
        - "Executive alignment and commitment"
        - "Select initial pilot teams"
        - "Agile fundamentals training for all"
        - "Identify and train agile coaches"
      milestones:
        - "Executive charter signed"
        - "Pilot teams selected and trained"
        - "Baseline metrics captured"
    
    phase_2_pilot_3_9_months:
      actions:
        - "Run pilot teams through 2-3 iterations"
        - "Establish coaching cadence"
        - "Identify and remove organizational blockers"
        - "Define scaling approach and framework"
      milestones:
        - "Successful PI Planning (or equivalent)"
        - "Measurable improvement in pilot metrics"
        - "Leadership impediment removal demonstrated"
    
    phase_3_expand_9_18_months:
      actions:
        - "Add additional teams (2-3 at a time)"
        - "Train additional Scrum Masters and POs"
        - "Establish Communities of Practice"
        - "Evolve HR, finance, and governance processes"
      milestones:
        - "50% of organization practicing"
        - "PO sync and Scrum of Scrums operating"
        - "Standard toolchain established"
    
    phase_4_optimize_18_36_months:
      actions:
        - "Deepen technical practices (CI/CD, test automation)"
        - "Continuous improvement culture embedded"
        - "Metrics-driven process optimization"
        - "Cross-organization learning and sharing"
      milestones:
        - "DORA metrics at elite/high level"
        - "Self-sustaining improvement culture"
        - "Minimal ceremony overhead maintained"
```

## Common Pitfalls

```yaml
common_pitfalls:
  framework_selection:
    - "Choosing a framework based on popularity instead of organizational context"
    - "Over-customizing the framework until it loses coherence"
    - "Adopting multiple frameworks simultaneously (methodology fatigue)"
    - "Ignoring culture fit — a framework that clashes with culture will fail"
  
  implementation:
    - "Scaling without building agile fundamentals first (skip-level scaling)"
    - "Mandating frameworks without coaching support"
    - "Treating the framework as a checklist rather than a mindset"
    - "Failing to customize the framework to the organization's context"
  
  leadership:
    - "Leaders expecting others to change while keeping their old behaviors"
    - "Delegating transformation to middle management"
    - "Maintaining command-and-control while claiming to be agile"
    - "Failing to invest in coaching and training"
  
  coordination:
    - "Over-coordinating — too many meetings, too much synchronization"
    - "Under-coordinating — teams work in silos, integration surprises"
    - "Scrum of Scrums becomes status reporting instead of problem-solving"
    - "Dependency management treated as tracking exercise, not active management"
  
  technical:
    - "Scaling team processes without scaling engineering practices"
    - "Maintaining long-lived branches and late integration"
    - "Ignoring technical debt at scale — compounds exponentially"
    - "No shared Definition of Done — integration failures at sprint boundaries"
  
  metrics:
    - "Using velocity as a productivity metric (Goodhart's Law)"
    - "Gaming metrics — teams optimize for the measure, not the outcome"
    - "Too many metrics — information overload, no action"
    - "Comparing metrics across teams (causes unhealthy competition)"
  
  anti_patterns:
    safe_fallacy:
      description: "Implementing SAFe without understanding lean-agile principles"
      symptom: "Process-heavy, ceremony-focused, no agility improvement"
      fix: "Start with lean principles, add SAFe structure only where needed"
    
    scrummerfall:
      description: "Waterfall in agile clothing — sprints become mini-waterfalls"
      symptom: "Requirements frozen at sprint start, analysis phase, coding phase, testing phase"
      fix: "Ensure cross-functional teams, vertical slicing, Definition of Done includes testing"
    
    local_optimization:
      description: "Each team optimizes their own performance at expense of system"
      symptom: "Teams hoard work, avoid knowledge sharing, compete on velocity"
      fix: "Reward system-level outcomes, rotate team members, shared goals"
    
    transformation_theater:
      description: "Going through motions without genuine change"
      symptom: "New titles but old behaviors, agile artifacts without agile mindset"
      fix: "Focus on outcomes and behaviors, not roles and ceremonies"
```

## Transitioning to Agility

### Adoption Roadmap

```yaml
adoption_roadmap:
  assess:
    activities:
      - "Current state assessment (agile maturity, culture, structure)"
      - "Value stream identification"
      - "Stakeholder analysis and buy-in assessment"
      - "Risk assessment for transformation"
    
    tools:
      - "Agile maturity model assessment"
      - "Organizational culture assessment"
      - "Team Topologies mapping"
      - "Value stream mapping"
  
  design:
    activities:
      - "Define target operating model"
      - "Select scaling framework"
      - "Design team topology"
      - "Plan pilot program"
      - "Define metrics and success criteria"
    
    outputs:
      - "Target state description"
      - "Team topology diagram"
      - "Pilot program charter"
      - "Transformation backlog"
  
  pilot:
    activities:
      - "Select pilot value stream or product area"
      - "Form initial teams and train intensively"
      - "Run 2-3 PI cycles or equivalent"
      - "Iterate based on feedback"
      - "Document learnings and patterns"
    
    success_criteria:
      - "Cycle time reduced by 30%"
      - "Team satisfaction scores > 4/5"
      - "Stakeholder satisfaction improved"
      - "Predictability (planned vs. actual) > 80%"
  
  expand:
    activities:
      - "Scale to additional value streams"
      - "Onboard new teams using pilot patterns"
      - "Establish coaching support structure"
      - "Evolve supporting processes (HR, finance, legal)"
    
    rollout_patterns:
      - "Wave expansion — 1-2 new teams per sprint"
      - "Vertical expansion — deepen practices within existing teams"
      - "Horizontal expansion — add more value streams"
  
  sustain:
    activities:
      - "Continuous improvement culture embedded"
      - "Regular retrospectives at all levels"
      - "Metrics-driven process optimization"
      - "Community of practice maturity"
      - "Leadership succession planning for agile roles"
    
    governance:
      - "Annual health check"
      - "Quarterly transformation review"
      - "Continuous learning budget"
      - "External coaching audit every 6-12 months"
```

### Change Management Strategies

```yaml
change_management:
  communication:
    principles:
      - "Over-communicate — 7x repetition for changed behaviors"
      - "Use multiple channels (all-hands, email, chat, 1:1s)"
      - "Share both the 'why' and the 'what'"
      - "Celebrate small wins publicly"
    
    messaging_framework:
      problem: "Why we can't continue as-is"
      vision: "What the future looks like"
      plan: "How we'll get there"
      role: "What each person needs to do"
      support: "What help is available"
  
  stakeholder_management:
    engagement_plan:
      sponsors: "Weekly executive briefings, celebrate progress, surface impediments"
      managers: "Bi-weekly coaching, role transition support, management training"
      teams: "Daily coaching, training, safe experimentation space"
      unions_hr: "Monthly alignment, policy evolution discussions"
      customers: "Quarterly demos, feedback sessions, beta programs"
  
  resistance_management:
    common_resistance:
      - "Fear of job loss or reduced authority (managers)"
      - "Fear of losing technical expertise (specialists)"
      - "Skepticism from past failed transformations"
      - "Comfort with current processes"
    
    strategies:
      address_fears: "Acknowledge concerns, explain role evolution"
      demonstrate_quick_wins: "Show tangible improvement within 2-3 sprints"
      involve_skeptics: "Put resisters on design teams"
      provide_safety: "No-blame experimentation, fail-fast culture"
      communicate_continuously: "Regular updates on transformation progress"
  
  training_and_coaching:
    training_curriculum:
      foundation:
        audience: "Everyone"
        content: "Agile principles, Scrum basics, lean thinking"
        format: "2-day immersive workshop"
      
      role_specific:
        audience: "Scrum Masters, POs, RTE"
        content: "Framework-specific training (SAFe, LeSS, etc.)"
        format: "3-5 day certification or equivalent"
      
      leadership:
        audience: "Executives and managers"
        content: "Lean-agile leadership, servant leadership, agile budgeting"
        format: "2-day workshop + monthly coaching"
      
      technical:
        audience: "Engineers"
        content: "CI/CD, TDD, test automation, DevOps"
        format: "Hands-on labs, hackathons, guild sessions"
    
    coaching_model:
      internal_coaches: "Full-time embedded coaches per 30-50 people"
      external_coaches: "Periodic expert coaching for complex challenges"
      peer_coaching: "Cross-team coaching through CoPs"
      self_coaching: "Retrospective-driven improvement within teams"
```

## Best Practices Summary

```yaml
best_practices:
  do:
    - "Start with a single team, build agile muscle, then scale"
    - "Choose the framework that fits your culture, not the popular choice"
    - "Invest heavily in coaching — teams need guidance, not mandates"
    - "Align metrics to outcomes, not outputs to avoid gaming"
    - "Build technical excellence in parallel with process scaling"
    - "Feature teams over component teams for faster value delivery"
    - "Continuous integration with trunk-based development is non-negotiable at scale"
    - "Create platform teams that enable, not gatekeep"
    - "Invest in communities of practice for cross-team learning"
    - "Rolling wave planning for predictability without false precision"
    - "Transparency at all levels — dependency boards, risk boards, metrics dashboards"
    - "Leadership transformation must precede team transformation"
  
  dont:
    - "Don't scale dysfunction — fix the basics first"
    - "Don't adopt a framework without understanding its principles"
    - "Don't create more ceremony than the problem warrants"
    - "Don't maintain separate waterfall planning while adopting agile"
    - "Don't use velocity for performance evaluation"
    - "Don't create component teams unless specialization is truly required"
    - "Don't skip retrospectives at scale — they're the mechanism for improvement"
    - "Don't impose the same practices on all teams — context matters"
    - "Don't forget technical debt — it compounds exponentially with more teams"
    - "Don't treat the framework as the goal — agility is the goal"
```

## Templates and Checklists

### PI Planning Preparation Checklist

```yaml
pi_planning_prep_checklist:
  four_weeks_before:
    - "Confirm PI Planning dates with all participants"
    - "Reserve venue or confirm virtual collaboration tools"
    - "Program Backlog refined with top 2-3 iterations of stories"
    - "WSJF scores updated for top Program Backlog items"
    - "Architecture guidance drafted by SAE"
    - "Business context presentation drafted by PM"
    - "Draft PI Objectives template prepared"
    - "PI Planning agenda finalized and distributed"
    - "ROAM risk template prepared"
  
  two_weeks_before:
    - "Program Board template prepared (physical or digital)"
    - "Dependency tracking process defined"
    - "Team capacity confirmed (PTO, on-call, support duty)"
    - "Historical velocity data available for capacity planning"
    - "Stakeholders confirmed for Business Context presentation"
    - "Retrospective from previous PI reviewed for improvement actions"
    - "Logistics confirmed (catering, supplies, travel)"
  
  one_week_before:
    - "Final agenda distributed to all participants"
    - "All tools tested (video conferencing, digital boards)"
    - "Teams have reviewed top backlog items"
    - "Pre-PI surveys sent (if using) to gauge sentiment"
    - "Breakout rooms/spaces assigned per team"
    - "Parking lot and risk boards prepared"
  
  day_before:
    - "Room setup complete with all materials"
    - "Technical check for all virtual tools"
    - "Facilitation team briefed on agenda and roles"
    - "Backup plans confirmed for technical issues"
    - "RTE finalizes facilitation materials"
```

### ART Metrics Dashboard Template

```yaml
art_dashboard_template:
  pi_level:
    predictability:
      metric: "Program Predictability Measure"
      calculation: "Actual business value / Planned business value"
      target: "80-100%"
      frequency: "End of PI"
    
    business_value_delivered:
      metric: "Business Value Delivered per PI"
      calculation: "Sum of achieved business value for all PI Objectives"
      trend: "Increasing"
    
    quality:
      metric: "Defect Escape Rate"
      calculation: "Production defects / Total defects found"
      target: "< 5%"
  
  iteration_level:
    flow:
      metrics:
        - "Cycle Time (median per story)"
        - "WIP (current count)"
        - "Throughput (stories per iteration)"
      visualization: "Cumulative Flow Diagram"
    
    quality:
      metrics:
        - "Unit test coverage: > 80%"
        - "Automated test pass rate: > 99%"
        - "Build stability: > 95% green builds"
    
    team_health:
      metrics:
        - "Happiness index (sprint survey)"
        - "Planned vs. actual velocity"
        - "Sprint goal success rate"
```

## Code Examples

### Dependency Mapping Script (Python)

```python
"""Dependency mapping and analysis for cross-team coordination."""

from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime, timedelta


@dataclass
class Dependency:
    id: str
    description: str
    source_team: str
    target_team: str
    due_date: datetime
    status: str  # identified, committed, in_progress, delivered, verified
    risk_level: str  # low, medium, high, critical
    blocking: bool = False
    notes: str = ""


@dataclass
class DependencyBoard:
    dependencies: list[Dependency] = field(default_factory=list)

    def add_dependency(self, dep: Dependency) -> None:
        self.dependencies.append(dep)

    def deps_by_team(self, team: str) -> list[Dependency]:
        return [d for d in self.dependencies
                if d.source_team == team or d.target_team == team]

    def critical_deps(self) -> list[Dependency]:
        return [d for d in self.dependencies
                if d.risk_level == "critical" and d.status != "verified"]

    def blocking_deps(self) -> list[Dependency]:
        return [d for d in self.dependencies if d.blocking]

    def deps_due_within(self, days: int) -> list[Dependency]:
        cutoff = datetime.now() + timedelta(days=days)
        return [d for d in self.dependencies
                if d.due_date <= cutoff and d.status != "verified"]

    def status_summary(self) -> dict:
        summary = {}
        for status in ["identified", "committed", "in_progress",
                       "delivered", "verified"]:
            count = len([d for d in self.dependencies
                        if d.status == status])
            summary[status] = count
        return summary

    def risk_heatmap(self) -> dict:
        heatmap = {}
        for risk in ["low", "medium", "high", "critical"]:
            count = len([d for d in self.dependencies
                        if d.risk_level == risk and d.status != "verified"])
            heatmap[risk] = count
        return heatmap


# Example usage
board = DependencyBoard()
board.add_dependency(
    Dependency(
        id="DEP-001",
        description="API endpoint for user preferences",
        source_team="User Service",
        target_team="Frontend",
        due_date=datetime(2026, 6, 15),
        status="committed",
        risk_level="medium"
    )
)
board.add_dependency(
    Dependency(
        id="DEP-002",
        description="Payment gateway SDK update",
        source_team="Platform",
        target_team="Checkout",
        due_date=datetime(2026, 6, 10),
        status="identified",
        risk_level="critical",
        blocking=True
    )
)

print(f"Critical unmet deps: {len(board.critical_deps())}")
print(f"Blocking deps: {len(board.blocking_deps())}")
print(f"Status summary: {board.status_summary()}")
print(f"Risk heatmap: {board.risk_heatmap()}")
```

### PI Planning Risk ROAM Tracker (Python)

```python
"""ROAM risk tracking for PI Planning."""

from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime


class ROAMStatus(Enum):
    RESOLVED = "Resolved"
    OWNED = "Owned"
    ACCEPTED = "Accepted"
    MITIGATED = "Mitigated"


@dataclass
class Risk:
    id: str
    description: str
    category: str  # technical, dependency, resource, organizational
    team: str
    likelihood: int  # 1-5
    impact: int  # 1-5
    roam_status: ROAMStatus
    owner: str
    mitigation_plan: str = ""
    created_date: datetime = field(default_factory=datetime.now)
    resolved_date: Optional[datetime] = None


class RiskBoard:
    def __init__(self):
        self.risks: list[Risk] = []

    def add_risk(self, risk: Risk) -> None:
        if risk.likelihood < 1 or risk.likelihood > 5:
            raise ValueError("Likelihood must be 1-5")
        if risk.impact < 1 or risk.impact > 5:
            raise ValueError("Impact must be 1-5")
        self.risks.append(risk)

    def risk_score(self, risk: Risk) -> int:
        return risk.likelihood * risk.impact

    def high_priority_risks(self, threshold: int = 12) -> list[Risk]:
        return [r for r in self.risks
                if self.risk_score(r) >= threshold
                and r.roam_status != ROAMStatus.RESOLVED]

    def risks_by_status(self) -> dict:
        counts = {}
        for status in ROAMStatus:
            counts[status.value] = len(
                [r for r in self.risks if r.roam_status == status]
            )
        return counts

    def resolve_risk(self, risk_id: str) -> None:
        for risk in self.risks:
            if risk.id == risk_id:
                risk.roam_status = ROAMStatus.RESOLVED
                risk.resolved_date = datetime.now()
                return
        raise ValueError(f"Risk {risk_id} not found")

    def summary_table(self) -> str:
        """Generate a risk register summary."""
        lines = []
        lines.append("| ID | Description | Team | L | I | Score | Status | Owner |")
        lines.append("|-----|-------------|------|---|---|-------|--------|-------|")
        for risk in sorted(self.risks,
                          key=lambda r: self.risk_score(r),
                          reverse=True):
            score = self.risk_score(risk)
            lines.append(
                f"| {risk.id} | {risk.description[:40]} | "
                f"{risk.team} | {risk.likelihood} | {risk.impact} | "
                f"{score} | {risk.roam_status.value} | {risk.owner} |"
            )
        return "\n".join(lines)


# Example usage
board = RiskBoard()
board.add_risk(Risk(
    id="RISK-001",
    description="Third-party API rate limits during peak",
    category="dependency",
    team="Checkout",
    likelihood=4,
    impact=5,
    roam_status=ROAMStatus.MITIGATED,
    owner="Dev Lead",
    mitigation_plan="Implement caching layer with queue"
))
board.add_risk(Risk(
    id="RISK-002",
    description="Key team member PTO mid-PI",
    category="resource",
    team="User Service",
    likelihood=3,
    impact=3,
    roam_status=ROAMStatus.OWNED,
    owner="Scrum Master",
    mitigation_plan="Cross-train on critical components"
))

print(board.summary_table())
print(f"\nUnresolved high-priority risks: {len(board.high_priority_risks())}")
```

### Team Topology Configuration (YAML)

```yaml
# team-topologies.yaml
version: "1.0"
organization: "Acme Corp"

stream_aligned_teams:
  - name: "Checkout Team"
    stream: "Payment and checkout flow"
    size: 7
    skills: ["backend", "frontend", "qa", "devops"]
    ownership:
      - "Cart service"
      - "Checkout API"
      - "Payment integration"
      - "Order confirmation"
    
  - name: "Search Team"
    stream: "Product search and discovery"
    size: 6
    skills: ["backend", "data", "ml", "frontend"]
    ownership:
      - "Search service"
      - "Indexing pipeline"
      - "Recommendation engine"
      - "Search UI"
    
  - name: "Account Team"
    stream: "User account management"
    size: 5
    skills: ["backend", "frontend", "security"]
    ownership:
      - "User service"
      - "Authentication"
      - "Profile management"
      - "Preferences"

platform_team:
  name: "DevEx Platform"
  size: 8
  services:
    - "CI/CD pipeline"
    - "Observability stack"
    - "Feature flag system"
    - "Secret management"
    - "Ephemeral environments"

enabling_teams:
  - name: "Testing Enablement"
    focus: "Test automation and quality practices"
    size: 3
    duration: "6 months"
    
complicated_subsystem_teams:
  - name: "Payment Engine"
    subsystem: "Payment processing core"
    size: 4
    expertise: ["Financial systems", "High throughput", "Compliance"]

team_interaction_modes:
  Checkout_DevEx: "X-as-a-Service"
  Search_DevEx: "X-as-a-Service"
  Checkout_Testing: "Facilitating"
  Search_PaymentEngine: "Collaboration"
```
