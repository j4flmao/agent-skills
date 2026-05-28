# BA Requirements Management

## Overview

Requirements management is the systematic approach to eliciting, documenting, prioritizing, agreeing on, and managing changes to requirements throughout the project lifecycle. Effective requirements management ensures that stakeholders, development teams, and quality assurance share a common understanding of what needs to be delivered and provides a framework for handling changes as they arise.

## Requirements Lifecycle

### Lifecycle Phases

| Phase | Description | Key Activities | Entry Criteria | Exit Criteria |
|-------|-------------|----------------|----------------|---------------|
| Elicitation | Discover stakeholder needs | Interviews, workshops, observation, document analysis | Project charter or scope statement available | Stakeholders identified, initial needs documented |
| Analysis | Refine and structure requirements | Prioritization, modeling, feasibility assessment, validation prep | Raw requirements collected | Analyzed requirements with priorities |
| Specification | Document requirements formally | User story writing, acceptance criteria, BRD creation | Analyzed requirements | Documented, reviewed requirements |
| Validation | Confirm requirements with stakeholders | Walkthroughs, prototyping, acceptance criteria review | Draft requirements documented | Validated, approved requirements |
| Management | Handle changes and traceability | Change control, impact analysis, traceability updates | Approved baseline | Controlled changes, maintained traceability |
| Verification | Confirm delivery meets requirements | Test case mapping, UAT support, acceptance | Developed solution | Requirements met, accepted |

### Requirements States

```
Proposed → Analyzed → Approved → Implemented → Verified → Accepted
   ↓           ↓           ↓           ↓            ↓          ↓
• Draft       • Refined   • Baselined  • Coded      • Tested   • Signed off
• Idea        • Sized     • Agreed     • Built      • Passed   • Delivered
• Unrefined   • Estimated • Signed     • Deployed   • Verified • Closed
                                           ↓
                                        Rejected / Deferred
```

## Requirements Classification

### Classification Dimensions

| Dimension | Categories | Description |
|-----------|------------|-------------|
| Level | Business, Stakeholder, Solution, Transition | Where in the hierarchy the requirement sits |
| Type | Functional, Non-functional, Constraint, Assumption | What aspect of the system it addresses |
| Source | Stakeholder, System, Regulatory, Derived | Where the requirement originated |
| Priority | Must, Should, Could, Won't | How critical the requirement is |
| Risk | High, Medium, Low | Risk of not implementing or implementing incorrectly |
| Stability | Stable, Volatile, Emerging | How likely the requirement is to change |
| Scope | In-scope, Out-of-scope, TBD | Whether the requirement is included in current delivery |

### Requirement Levels

```
Business Requirements (Why?)
  └── High-level organizational objectives
      └── Example: "Reduce order processing time by 50%"
          │
          ▼
Stakeholder Requirements (Who? What?)
  └── Needs of specific stakeholder groups
      └── Example: "Order processors can import orders from email"
          │
          ▼
Solution Requirements (How?)
  ├── Functional Requirements (What the system does)
  │   └── Example: "System parses order emails and creates order records"
  └── Non-functional Requirements (Quality attributes)
      └── Example: "Email import processes within 5 seconds per order"
          │
          ▼
Transition Requirements (During change)
  └── Temporary needs during implementation
      └── Example: "Legacy data is migrated to new system"
```

### Requirements Types

| Type | Description | Examples |
|------|-------------|----------|
| Functional | What the system must do | Search orders, process payment, generate report |
| Performance | Speed and throughput | Response under 2s, 1000 concurrent users |
| Security | Protection of data and access | TLS 1.3, OAuth2, role-based access |
| Usability | User experience and accessibility | WCAG 2.1 AA, mobile-responsive, 3-click rule |
| Reliability | Uptime and fault tolerance | 99.9% uptime, automatic failover |
| Scalability | Growth capacity | Horizontal scaling, stateless design |
| Maintainability | Ease of change | Code documentation, modular architecture |
| Portability | Cross-platform ability | Runs on Windows and Linux, cloud-agnostic |
| Compliance | Regulatory and legal | GDPR, PCI-DSS, SOC 2, HIPAA |
| Interface | Integration with other systems | REST API, file exchange, event publishing |

## Requirements Prioritization

### Priority Frameworks

| Framework | Method | Dimensions | Best For |
|-----------|--------|------------|----------|
| MoSCoW | Must have, Should have, Could have, Won't have | Criticality (not importance) | Time-boxed delivery with fixed deadline |
| Kano Model | Basic, Performance, Excitement | Customer satisfaction impact | Product features, customer-facing |
| Value vs Effort | Plot on value/effort matrix | Business value vs implementation effort | Resource-constrained projects |
| Weighted Scoring | Score each requirement on criteria | Multiple criteria (value, risk, cost, alignment) | Portfolio decisions |
| RICE | Reach, Impact, Confidence, Effort | Quantitative prioritization | Growth teams, data-driven |
| Opportunity Scoring | Importance vs Satisfaction | Satisfaction gap | UX improvements |
| Cost of Delay | User-business value + time sensitivity | Economic value over time | Lean/agile, CD3 method |
| WSJF (Weighted Shortest Job First) | Cost of Delay / Job Size | Economic value + effort | SAFe, large programs |

### MoSCoW Prioritization

```
Must Have:
  - Non-negotiable for this delivery
  - Without these, the solution is invalid
  - Typically 40-50% of total requirements
  - Example: "User can log in with valid credentials"

Should Have:
  - Important but not vital
  - Significant value but workaround exists
  - Typically 15-25% of total requirements
  - Example: "User can reset their own password"

Could Have:
  - Desirable but not necessary
  - Small impact if missing
  - Typically 15-25% of total requirements
  - Example: "User can customize their dashboard layout"

Won't Have (this time):
  - Explicitly excluded from current delivery
  - Documented for future consideration
  - Typically 5-15% of total requirements
  - Example: "User can integrate with third-party CRM"

MoSCoW Rules:
  - Must haves must be delivered for project success
  - Should and Could are flexible — trade-off if time runs short
  - Won't have is explicit — not a backlog
  - Re-prioritize at each planning cycle
  - All Must haves must be achievable within time/budget
```

### Kano Model Classification

```
                 Satisfaction
                     ↑
                     │         Excitement (Delighters)
                     │           (Not expected, but highly satisfying)
                     │           • AI-powered suggestions
                     │           • Personalized dashboards
                     │
                     │    Performance (Linear)
                     │      (More is better)
                     │      • Faster processing
                     │      • More reporting options
                     │
                     │
    ────────────────┼──────────────────────────→ Functionality
                     │
                     │  Basic (Threshold)
                     │    (Expected — dissatisfaction if absent)
                     │    • Login
                     │    • Search
                     │    • Data accuracy
                     │
                     ↓
                 Dissatisfaction

Prioritization Strategy:
  1. Must have: All Basic requirements
  2. Prioritize: Performance requirements (competitive advantage)
  3. Differentiate: Excitement requirements (carefully — they become Basic over time)
  4. Avoid: Low-value performance + low-uniqueness excitement
```

### Value vs Effort Matrix

```
Effort
  High ↑
       │   • High Effort, Low Value     • High Effort, High Value
       │     (Avoid)                      (Investigate — may be worth it)
       │     ┌────────────────────────────┐
       │     │  Question / Reduce         │  Plan & Execute
       │     │  "Can we simplify?"        │  "Break into smaller pieces"
       │     │  "Is there an alternative?"│  "Validate value first"
       │     └────────────────────────────┘
       │
       │   • Low Effort, Low Value       • Low Effort, High Value
       │     (Do if nothing better)        (Do first!)
       │     ┌────────────────────────────┐
       │     │  Deprioritize              │  Quick Wins
       │     │  "Do last or skip"         │  "Do immediately"
       │     │  "Automate later"          │  "High ROI"
       │     └────────────────────────────┘
   Low └──────────────────────────────────────────→ Value
        Low                                      High
```

### WSJF (Weighted Shortest Job First)

```
WSJF = Cost of Delay / Job Size (Effort)

Cost of Deley = User-Business Value + Time Criticality + Risk Reduction/Opportunity Enablement

Scoring (1-5 scale for each dimension):
  User-Business Value:
    1 = Minor value (nice to have)
    2 = Moderate value (improves experience)
    3 = Significant value (key capability)
    4 = High value (critical capability)
    5 = Extreme value (game-changing)

  Time Criticality:
    1 = No time sensitivity
    2 = Moderate time sensitivity
    3 = Time-sensitive (market window)
    4 = Urgent (competitive pressure)
    5 = Extreme urgency (regulatory deadline, lost opportunity)

  Risk Reduction / Opportunity Enablement:
    1 = No risk reduction or opportunity
    2 = Some insight gained
    3 = Significant learning or future enablement
    4 = Major risk reduction or new opportunity
    5 = Critical dependency for future value

  Job Size (Effort):
    1 = > 3 weeks
    2 = 2-3 weeks
    3 = 1-2 weeks
    4 = 3-5 days
    5 = < 3 days (do immediately regardless)

Example:
  Feature A: Value (4) + Time (3) + Risk (2) = 9, Size (3) → WSJF = 9/3 = 3.0
  Feature B: Value (3) + Time (5) + Risk (1) = 9, Size (5) → WSJF = 9/5 = 1.8
  Feature C: Value (5) + Time (2) + Risk (3) = 10, Size (2) → WSJF = 10/2 = 5.0

  Priority: C (5.0) > A (3.0) > B (1.8)
```

## Requirements Documentation

### Documentation Formats

| Format | Best For | Detail Level | Audience | Maintenance |
|--------|----------|--------------|----------|-------------|
| User Story + AC | Agile teams, iterative delivery | Medium | Team, PO | Continuous |
| Use Case | Complex interactions, formal specs | High | Developers, testers | Per release |
| BRD (Business Requirements Document) | Formal projects, compliance | Very high | Stakeholders, auditors | Per phase |
| Feature Specification | Detailed feature definition | High | Developers | Per feature |
| Acceptance Criteria (Gherkin) | Testable behavior definition | High | Team, QA, PO | Per story |
| Process Flow | Workflow understanding | Medium | All | As needed |
| Wireframe/Prototype | Visual representation | Varies | Stakeholders, UX | Per iteration |
| Decision Log | Requirements decisions | Low | All | Ongoing |

### User Story Standards

```
Standard Format:
  As a [user role]
  I want [goal / feature]
  So that [benefit / value]

CONDITIONS for good user stories:
  - Independent: Can be developed, tested, and delivered separately
  - Negotiable: Details can be refined through conversation
  - Valuable: Delivers clear value to user or business
  - Estimable: Team can estimate effort with reasonable confidence
  - Small: Fits within one sprint (typically 2-3 days of work)
  - Testable: Clear pass/fail criteria exist

Adding Detail (when needed):
  As a [detailed persona]
  I want [specific action with context]
  So that [measurable outcome]

  Acceptance Criteria:
  Scenario: Happy path
    Given [specific preconditions]
    When [specific trigger]
    Then [specific outcome]

  Scenario: Error path
    Given [error conditions]
    When [trigger]
    Then [error handling]

  Non-functional: [performance, security, usability requirements]
  Notes: [assumptions, dependencies, open questions]
```

### BRD (Business Requirements Document) Standards

```yaml
brd_structure:
  header:
    document_id: {unique identifier}
    title: {project name}
    version: {major.minor}
    date: {date}
    author: {name and role}
    status: draft / reviewed / approved
    approval:
      - role: Product Owner
        name: {name}
        date: {date}
      - role: Engineering Lead
        name: {name}
        date: {date}

  section_1_executive_summary:
    - Brief description of the project or initiative
    - Key business objectives (linked to strategic goals)
    - High-level scope statement
    - Expected business outcomes and success criteria

  section_2_business_context:
    - Current state description (processes, systems, pain points)
    - Problem statement or opportunity description
    - Business case summary (costs, benefits, ROI)
    - Strategic alignment with organizational goals

  section_3_scope:
    in_scope:
      - {capability or feature area 1}
      - {capability or feature area 2}
    out_of_scope:
      - {explicitly excluded item 1}
      - {explicitly excluded item 2}
    assumptions:
      - {assumption 1}
      - {assumption 2}
    constraints:
      - {constraint 1}
      - {constraint 2}

  section_4_stakeholder_analysis:
    - Stakeholder matrix (name, role, influence, interest, engagement)
    - Key stakeholder concerns and requirements
    - Communication and engagement approach

  section_5_functional_requirements:
    - User stories organized by epic/feature area
    - Acceptance criteria for each story
    - Process flows and decision rules

  section_6_non_functional_requirements:
    category: performance
      - {requirement 1}
      - {requirement 2}
    category: security
      - {requirement 1}
    category: usability
      - {requirement 1}
    category: reliability
      - {requirement 1}
    category: scalability
      - {requirement 1}

  section_7_data_requirements:
    - Key data entities and relationships
    - Data volumes and growth projections
    - Data quality requirements
    - Data migration requirements

  section_8_interfaces:
    - System integrations and API specifications
    - Data exchange formats and protocols
    - Batch processing schedules
    - Error handling and retry logic

  section_9_acceptance_criteria:
    - High-level acceptance criteria for the project/phase
    - Go/no-go decision criteria for release
    - UAT approach and success criteria

  section_10_dependencies_and_risks:
    - Internal dependencies (other workstreams)
    - External dependencies (vendors, third parties)
    - Key risks and mitigation strategies

  section_11_appendices:
    - Glossary of terms
    - Reference documents
    - Supporting analysis
```

## Requirements Traceability

### Traceability Matrix Structure

```
Requirement ID  | Description            | Source           | Owner  | Priority | Status    | Test Cases     | Design Docs     | Release
────────────────┼────────────────────────┼──────────────────┼────────┼──────────┼───────────┼────────────────┼─────────────────┼─────────
REQ-001         | User login             | Stakeholder wkshp| PM     | Must     | Approved  | TC-001, TC-002 | DD-LOGIN-001    | v2.0
REQ-002         | Password reset         | Stakeholder wkshp| PM     | Should   | In Review | TC-003, TC-004 | DD-LOGIN-002    | v2.1
REQ-003         | Order search           | Survey results    | PM     | Must     | Approved  | TC-010 - TC-015| DD-SEARCH-001   | v2.0
```

### Traceability Types

| Type | Links | Purpose |
|------|-------|---------|
| Forward traceability | Requirement → Design → Test | "Can I find all test cases for this requirement?" |
| Backward traceability | Test → Design → Requirement | "What requirement does this test verify?" |
| Horizontal traceability | Requirement ↔ Requirement | "Which requirements are related?" |
| Vertical traceability | Business → Stakeholder → Solution | "How does this feature serve business goals?" |
| Bidirectional traceability | All directions | "Complete chain: business goal → requirement → test → pass" |

### Traceability Implementation

```yaml
traceability_framework:
  tool: Jira / ALM / Excel
  linking:
    requirement_to_epic: "REQ-001 relates to EPIC-003"
    requirement_to_test: "REQ-001 is verified by TC-001, TC-002"
    requirement_to_design: "REQ-001 is addressed in DD-LOGIN-001"
    test_to_requirement: "TC-001 verifies REQ-001"
    defect_to_requirement: "BUG-042 affects REQ-001"
  coverage_metrics:
    - Test coverage%: requirements with at least one test case
    - Design coverage%: requirements with design documentation
    - Review coverage%: requirements reviewed by stakeholders
    - Verification coverage%: requirements verified as met
  reporting:
    - Traceability matrix view (table)
    - Coverage gap view (untraced requirements)
    - Impact analysis view (affected items when requirement changes)
    - Verification status view (what's tested, what's pending)
```

## Requirements Change Control

### Change Control Process

```
Change Request Submitted
  │
  ▼
Step 1: Receive and Log
  - Assign change request ID
  - Record date, requester, description
  - Confirm completeness of request
  │
  ▼
Step 2: Impact Analysis
  - Assess impact on scope, schedule, cost, quality
  - Identify affected requirements, designs, test cases
  - Estimate effort to implement change
  - Identify risks of implementing vs not implementing
  │
  ▼
Step 3: Review and Decide
  - Change Control Board (CCB) reviews analysis
  - Decision: Approve / Reject / Defer / Request more info
  - Document decision rationale
  │
  ▼
Step 4: Implement (if approved)
  - Update requirements documentation
  - Update traceability matrix
  - Communicate change to affected stakeholders
  - Re-plan affected work items
  │
  ▼
Step 5: Verify
  - Confirm change was implemented correctly
  - Update status to "Implemented"
  - Close change request
```

### Change Request Form

```yaml
change_request:
  id: CR-001
  project: Order Management Redesign
  title: Add batch order upload feature
  requester: Sarah Chen (Operations)
  date_submitted: 2026-04-20
  priority: High
  category: Scope Addition
  description: |
    Currently orders must be entered one at a time. Operations team
    frequently receives batches of 20-50 orders from wholesale customers.
    They need a batch upload capability (CSV or Excel format) to process
    these efficiently.
  business_justification: |
    Batch upload would save approximately 10 hours per week of manual
    data entry for the Operations team. Wholesale customers would receive
    faster order confirmation.
  impacted_requirements:
    - REQ-010 (Order entry) — will be extended
    - REQ-015 (Order validation) — will need batch validation
  impact_analysis:
    scope: Adds new feature — batch order upload
    timeline: +2 weeks to project schedule
    cost: +$15,000 (estimated development effort)
    quality: No negative impact
    risks:
      - CSV parsing complexity for various customer formats
      - Error handling for partial batch failures
  alternatives_considered:
    - Alternative 1: Template-based CSV with strict format (less flexible but simpler)
    - Alternative 2: Manual entry with copy-paste from spreadsheet (lower effort but less value)
  recommendation: Approve — high value relative to cost
  decision:
    status: Approved
    date: 2026-04-22
    approved_by: Change Control Board
    conditions: |
      1. CSV template must be clearly documented
      2. Error reporting must identify specific row/column failures
      3. Rollback capability for partial imports
```

### Change Control Board (CCB)

| Role | Responsibility | Voting Rights |
|------|----------------|---------------|
| Project Sponsor | Final decision authority | Yes |
| Product Owner | Business value assessment | Yes |
| Engineering Lead | Technical impact assessment | Yes |
| QA Lead | Quality impact assessment | Advisory |
| BA/PM | Impact analysis preparation | No |
| Change Requester | Present justification | No |

### CCB Decision Criteria

```
Criteria for evaluating change requests:
  ┌────────────────────────────────────────────────────────────────┐
  │ 1. Business Value: Does the change add significant value?      │
  │    • Revenue impact                                          │
  │    • Cost savings                                            │
  │    • Customer satisfaction improvement                       │
  │    • Strategic alignment                                     │
  ├────────────────────────────────────────────────────────────────┤
  │ 2. Urgency: When is this needed?                               │
  │    • Regulatory deadline                                     │
  │    • Competitive pressure                                    │
  │    • Customer commitment                                     │
  │    • Technical necessity                                     │
  ├────────────────────────────────────────────────────────────────┤
  │ 3. Impact on Current Scope: What must be traded off?           │
  │    • What Must haves would be affected?                      │
  │    • Can other Should/Could items be deferred?               │
  │    • Is there budget contingency?                            │
  ├────────────────────────────────────────────────────────────────┤
  │ 4. Implementation Risk: Can we do this safely?                 │
  │    • Technical complexity                                    │
  │    • Dependency impact                                       │
  │    • Testing requirements                                    │
  │    • Integration risk                                        │
  ├────────────────────────────────────────────────────────────────┤
  │ 5. Organizational Impact: Who else is affected?                │
  │    • Other teams or workstreams                              │
  │    • External stakeholders                                   │
  │    • Operational processes                                   │
  └────────────────────────────────────────────────────────────────┘
```

## Requirements Quality Assessment

### Quality Characteristics

| Characteristic | Definition | Verification Question |
|----------------|-------------|----------------------|
| Correct | Accurately reflects stakeholder need | "Does this requirement reflect what stakeholders actually need?" |
| Complete | Contains all necessary information | "Is there enough information to design and test?" |
| Clear | Unambiguous, single interpretation | "Can two people read this and understand the same thing?" |
| Consistent | Doesn't conflict with other requirements | "Does this requirement agree with other requirements?" |
| Feasible | Achievable within constraints | "Can we implement this within time, budget, and technology constraints?" |
| Necessary | Addresses a genuine need | "What happens if we don't implement this?" |
| Testable | Verifiable through inspection, analysis, or demonstration | "Can we write a pass/fail test for this?" |
| Atomic | Single, indivisible requirement | "Can this be split into separate requirements?" |
| Traceable | Links to source and downstream artifacts | "Can we trace this from business need to test case?" |
| Prioritized | Has assigned priority | "Do we know how critical this is relative to other requirements?" |

### Quality Checklist for Requirements Review

```
☐ Correctness:
  ☐ Requirement accurately reflects stakeholder need
  ☐ Requirement has been validated with the source
  ☐ Business rules are correctly expressed

☐ Completeness:
  ☐ All conditions (inputs, triggers, preconditions) are specified
  ☐ All responses (outputs, actions, postconditions) are specified
  ☐ Error handling and alternative flows are specified
  ☐ Non-functional requirements are addressed
  ☐ External interfaces are specified

☐ Clarity:
  ☐ Requirement has a single, unambiguous interpretation
  ☐ Terminology is consistent with glossary
  ☐ Acronyms are defined
  ☐ Quantifiable terms are used (not "fast", "user-friendly", "easy")

☐ Consistency:
  ☐ Requirement does not conflict with other requirements
  ☐ Terminology is consistent across all requirements
  ☐ Level of detail is consistent with other requirements
  ☐ Format and structure are consistent

☐ Feasibility:
  ☐ Requirement is achievable within project constraints
  ☐ Technical feasibility has been assessed
  ☐ Required data is available
  ☐ Dependencies are identified

☐ Necessity:
  ☐ Requirement traces to a business objective
  ☐ Value of requirement is justified
  ☐ Requirement is not redundant
  ☐ Requirement is in scope

☐ Testability:
  ☐ Acceptance criteria can be verified (pass/fail)
  ☐ Test data requirements are identified
  ☐ Testing environment requirements are identified
  ☐ Testing effort is estimable

☐ Atomicity:
  ☐ Requirement addresses a single capability
  ☐ Requirement cannot be further decomposed
  ☐ Multiple conditions are not combined in one statement

☐ Traceability:
  ☐ Requirement ID is assigned and unique
  ☐ Source of requirement is documented
  ☐ Requirement links to design and test artifacts
```

## Requirements Management Tools

### Tool Comparison

| Tool | Type | Best For | Collaboration | Traceability | Integration |
|------|------|----------|---------------|--------------|-------------|
| Jira | Agile project management | User story management, sprint planning | Excellent | Good (add-ons) | Extensive |
| Confluence | Documentation | BRDs, specs, decision logs | Excellent | Limited | Good (Atlassian) |
| Azure DevOps | ALM | End-to-end traceability | Excellent | Excellent | Excellent (Microsoft) |
| IBM DOORS | Requirements management | Regulated industries, formal traceability | Good | Excellent | Moderate |
| Jama Connect | Requirements management | Complex product development | Excellent | Excellent | Good |
| Aha! | Product management | Roadmap, strategy alignment | Good | Moderate | Good |
| Notion | Documentation | Lightweight requirements | Good | Limited | Moderate |
| Spreadsheets (Excel/Sheets) | Ad-hoc | Small projects, traceability matrix | Limited | Manual | Good |
| Polarion | ALM | Regulated, lifecycle traceability | Excellent | Excellent | Good |
| ReqView | Requirements management | Medium-scale, desktop + server | Good | Excellent | Moderate |

### Tool Selection Criteria

```yaml
tool_selection_criteria:
  project_characteristics:
    - factor: team_size
      small_team: Jira, Confluence, Notion
      medium_team: Jira, Azure DevOps
      large_team: Azure DevOps, Jama, DOORS
      distributed_team: Jira, Confluence (cloud)
    - factor: industry
      general_software: Jira, Azure DevOps
      medical_device: Polarion, DOORS
      aerospace: DOORS
      finance: Jama, DOORS
      automotive: Polarion, DOORS
    - factor: methodology
      agile: Jira, Azure DevOps
      waterfall: DOORS, Jama
      hybrid: Azure DevOps, Jama
    - factor: compliance_level
      none: Jira, Confluence, Notion
      moderate: Azure DevOps, Jama
      high: DOORS, Polarion
  features_to_evaluate:
    - Requirements authoring and formatting
    - Baseline and version management
    - Impact analysis and traceability
    - Review and approval workflows
    - Change control and audit trail
    - Reporting and metrics
    - Integration with development and testing tools
    - Collaboration and real-time editing
    - Access control and permissions
    - Import/export capabilities
```

## Requirements Metrics and KPIs

| Metric | Definition | Target | How to Measure |
|--------|------------|--------|----------------|
| Requirements volatility | % of requirements changed after baseline | < 15% | (# changed + # added + # removed) / total baseline requirements |
| Defect leakage due to requirements | % of defects traced to requirement issues | < 5% | Requirements-related defects / total defects |
| Requirements coverage | % of requirements with test cases | 100% | Requirements with test case / total requirements |
| Review effectiveness | % of issues found during review | > 70% | Issues found in review / total issues (review + test + production) |
| Requirements churn | Requirements changed per time period | Decreasing trend | Count of CRs per sprint/phase |
| Time to approve | Average time from CR submission to decision | < 5 days | Sum of approval times / number of CRs |
| Stakeholder satisfaction | Survey of requirements quality | > 4/5 | Survey after requirements delivery |
| Traceability completeness | % of requirements with full traceability | 100% | Bidirectional traceable reqs / total reqs |
| Requirements density | Requirements per unit of functionality | Consistent | Req count / feature count |
| Ambiguity rate | % of requirements with clarification needed | < 5% | Clarified reqs / total reqs reviewed |

## Requirements Handoff and Transition

### Handoff Checklist

```
Pre-Handoff:
  ☐ All requirements documented and approved
  ☐ Requirements prioritized (MoSCoW or other)
  ☐ Acceptance criteria defined and testable
  ☐ Non-functional requirements documented
  ☐ Traceability matrix updated
  ☐ Decision log complete
  ☐ Assumptions and constraints documented
  ☐ Dependencies identified and communicated
  ☐ Risk register updated
  ☐ Stakeholders notified of handoff

Handoff Meeting:
  ☐ Walk through requirements with development team
  ☐ Review priority rationale
  ☐ Discuss non-functional requirements
  ☐ Highlight high-risk or complex requirements
  ☐ Review acceptance criteria
  ☐ Answer questions and clarify
  ☐ Agree on ongoing BA engagement model
  ☐ Schedule follow-up sessions

Post-Handoff:
  ☐ BA available for clarification during development
  ☐ Requirements clarification process defined
  ☐ Change control process operational
  ☐ Regular touchpoints with development team
  ☐ BA participates in sprint reviews and retrospectives
  ☐ BA supports UAT and acceptance
  ☐ Lessons learned documented for next phase
```

## References

- IIBA (2015) — A Guide to the Business Analysis Body of Knowledge (BABOK v3)
- Wiegers, K. & Beatty, J. (2013) — Software Requirements (3rd Edition)
- Cohn, M. (2004) — User Stories Applied
- Leffingwell, D. (2011) — Agile Software Requirements
- Gottesdiener, E. (2005) — The Software Requirements Memory Jogger
- Alexander, I. & Beus-Dukic, L. (2009) — Discovering Requirements
- Hull, E., Jackson, K., & Dick, J. (2010) — Requirements Engineering (3rd Edition)
- Pohl, K. & Rupp, C. (2015) — Requirements Engineering Fundamentals (2nd Edition)
- ATD (2019) — The Agile Requirements Toolbox
- Project Management Institute (2017) — Business Analysis for Practitioners
- International Institute of Business Analysis — BABOK Guide v3
- PMI — The PMI Guide to Business Analysis
- IEEE 29148:2018 — Systems and software engineering — Life cycle processes — Requirements engineering
- INCOSE (2015) — Systems Engineering Handbook: Requirements Management section
- ISO/IEC/IEEE 15288:2015 — System life cycle processes
