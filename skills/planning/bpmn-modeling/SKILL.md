---
name: planning-bpmn-modeling
description: >
  Use this skill when the user asks about BPMN, business process modeling, BPMN 2.0, process diagrams, process discovery, AS-IS TO-BE analysis, process automation, Camunda, DMN decision tables, workflow automation, process optimization, process simulation, or process design patterns. Covers: BPMN 2.0 elements and notation, AS-IS and TO-BE modeling techniques, process discovery and levels (L1-L5), common process patterns (gateways, subprocesses, error handling), BPMN to automation mapping with Camunda/Flowable/Temporal. Do NOT use for: data flow diagrams, system architecture, or organizational chart design.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [planning, bpmn, process-modeling, automation, phase-10]
---

# BPMN Modeling

## Purpose
Design, document, and analyze business processes using BPMN 2.0 standards for process improvement and automation. Covers process discovery from stakeholders, AS-IS and TO-BE modeling across all process levels, applying BPMN patterns correctly, mapping BPMN to workflow automation engines, and designing DMN decision tables for automated decisions.

## Agent Protocol

### Trigger
"BPMN", "business process model", "process diagram", "process flow", "process modeling", "BPMN 2.0", "AS-IS process", "TO-BE process", "process discovery", "process automation", "Camunda", "DMN", "decision table", "process simulation", "workflow automation", "process mapping", "process design".

### Input Context
- Process scope: start trigger, end outcome, boundaries (what's in/out)
- Current process description or existing diagram
- Pain points: delays, errors, handoffs, exceptions, bottlenecks
- Automation goals: cost reduction, throughput, compliance, visibility
- Stakeholders: process owner, participants, downstream consumers
- Technology constraints: target automation platform, existing systems
- Regulatory or compliance requirements for process design

### Output Artifact
BPMN process model in BPMN 2.0 XML notation with DMN decision table definitions, swimlane mapping, and automation recommendations.

### Response Format
```
## Process Model
Process Name: {name}
Level: {L1-L5}
Scope: {triggers} → {outcomes}
Owner: {role}

## BPMN Diagram Description
{pools/lanes and their responsibilities}
{flow with gateways, events, activities described textually}

## DMN Decision Table
Decision: {name}
Rules: {table with inputs/outputs}

## Automation Recommendation
Engine: {Camunda/Flowable/Temporal}
Implementation: {key implementation notes}
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Process scope and boundaries defined
- [ ] AS-IS process documented with all stakeholders
- [ ] TO-BE process modeled with automation opportunities
- [ ] BPMN diagram described textually (start/end events, activities, gateways, flows)
- [ ] Swimlanes mapped to roles or systems
- [ ] DMN decision tables defined for automated decisions
- [ ] Automation platform recommendation with rationale
- [ ] Implementation considerations documented

### Max Response Length
7000 tokens

## Decision Trees

### Process Modeling Level Decision Tree
```
What is the audience for this process model?
  |-- Executive / Sponsors --> Level 1 (Contextual)
  |     Output: value chain, process relationships, 5-10 boxes
  |-- Process Owner / Manager --> Level 2 (Process Flow)
  |     Output: end-to-end flow, major steps, handoffs
  |-- Process Participants --> Level 3 (Detailed)
  |     Output: swimlanes, decisions, exceptions, 15-30 activities
  |-- Implementation Team --> Is automation planned?
  |     |-- YES --> Level 4 (Executable)
  |     |     Output: service tasks, business rules, message flows
  |     |-- NO --> Level 3 is sufficient
  |-- Developers / Integrators --> Level 5 (Technical)
        Output: implementation details, data mappings, API specs
```

### AS-IS vs TO-BE Strategy
```
Process exists and is documented?
  |-- YES --> Is the process performing well?
  |     |-- YES --> Minor optimization, focus on automation
  |     |-- NO --> Full AS-IS analysis, identify pain points
  |           Output: pain point catalog with metrics
  |-- NO --> Do stakeholders agree on how the process works?
        |-- YES --> Jump to TO-BE design
        |-- NO --> Discovery session needed first
```

## BPMN 2.0 Element Reference

### Flow Objects
| Element | Notation | Purpose | Example |
|---------|----------|---------|---------|
| Start Event | Single thin circle | Trigger that starts the process | Order received |
| End Event | Single thick circle | Signals process completion | Order fulfilled |
| Task | Rounded rectangle | Atomic unit of work | Validate address |
| Subprocess | Rounded rectangle with + | Compound activity with internal flow | Process payment |
| Exclusive Gateway | Diamond with X | XOR split/merge, one path taken | If credit check passes |
| Parallel Gateway | Diamond with + | AND split/merge, all paths taken | Notify warehouse + billing |
| Event-Based Gateway | Diamond with double circle | React to first occurring event | Wait for payment or timeout |
| Inclusive Gateway | Diamond with O | OR split/merge, one or more paths | Ship partial or full order |

### Connecting Objects
| Element | Notation | Purpose |
|---------|----------|---------|
| Sequence Flow | Solid arrow | Order of activities |
| Message Flow | Dashed arrow | Communication across pools |
| Association | Dotted line | Link artifacts to flow objects |
| Data Association | Dotted arrow with arrowhead | Data input/output to activities |

### Swimlanes
| Element | Purpose | Example |
|---------|---------|---------|
| Pool | Major participant (org/system) | Customer, Company, Payment Gateway |
| Lane | Sub-division within a pool | Sales, Warehouse, Accounting |

### Artifacts
| Element | Purpose | Example |
|---------|---------|---------|
| Data Object | Shows data used/produced | Invoice, Order Form |
| Data Store | Persistent storage location | Customer Database |
| Annotation | Text explanation for clarity | "Manual approval required over $10K" |
| Group | Visual grouping for readability | All exception paths |

## Gateway Patterns

### Exclusive Gateway (XOR)
```
           [Check Payment]
          /       |       \
    [Credit]   [Invoice]   [PO]
          \       |       /
           [Fulfill Order]
```
Only one path is taken. The decision is explicit — each outgoing flow has a condition.

### Parallel Gateway (AND)
```
          [Approve Order]
          /             \
    [Pick Items]    [Process Payment]
          \             /
          [Ship Order]
```
All paths execute concurrently. Process waits at the merge until all paths complete.

### Inclusive Gateway (OR)
```
          [Review Order]
          /           \
    [Check Credit]  [Check Fraud]
       (if new)       (if large)
          \           /
         [Process Order]
```
One or more paths execute depending on conditions. The merge waits for all activated paths.

### Event-Based Gateway
```
          [Ship Order]
               |
        [Wait for Delivery]
        /       |       \
  [Delivered] [Damaged] [30-Day Timeout]
```
Process takes the first path whose event fires. Used for timeouts, external triggers, and competing scenarios.

## BPMN Process Levels

| Level | Name | Elements | Audience | Automation |
|-------|------|----------|----------|------------|
| L1 | Contextual | 5-10 boxes, no gateways | Executives | No |
| L2 | Process Flow | 10-20 steps, basic decisions | Managers | No |
| L3 | Detailed | Swimlanes, exceptions, all gateways | Participants | Partial |
| L4 | Executable | Service tasks, rules, message events | Implementers | Yes |
| L5 | Technical | Data mappings, API specs, implementation | Developers | Yes |

## Process Discovery Methods

### Stakeholder Interview Guide
| Question | Purpose |
|----------|---------|
| "Walk me through the process from start to finish" | Capture current state |
| "What triggers this process?" | Identify start events |
| "What decisions do you make and how?" | Discover gateways and DMN rules |
| "What goes wrong and how often?" | Identify exception paths |
| "Who else is involved?" | Map swimlanes |
| "What systems do you use?" | Identify automation boundaries |

### Pain Point Quantification Template
```
| Pain Point | Frequency | Impact | Current Workaround | Root Cause |
|------------|-----------|--------|-------------------|------------|
| Manual data entry errors | 15/week | 2hr rework each | Double-checking | No integration |
| Approval delays | 3/week | 24hr avg delay | Escalation email | No SLA tracking |
```

## DMN Decision Table Design

### Decision Table Structure
```
Decision: Approve Loan
Hit Policy: UNIQUE (only one rule matches)

| Credit Score | Income > $50K | Employment | Decision | Reason |
|--------------|---------------|------------|----------|--------|
| > 700        | YES           | > 2 years  | Approve  | Low risk |
| 600-700      | YES           | > 2 years  | Review   | Medium risk |
| < 600        | —             | —          | Reject   | High risk |
| —            | NO            | —          | Reject   | Insufficient income |
```

### Hit Policies
| Policy | Behavior | Use Case |
|--------|----------|----------|
| UNIQUE | Exactly one rule matches | Most business rules |
| FIRST | First matching rule in order | Prioritized rules |
| ANY | All matching rules have same output | Consistent classifications |
| COLLECT | Aggregate matching rules | Multiple outputs |
| RULE ORDER | First matching, priority by position | Sequential logic |
| OUTPUT ORDER | Collect and sort outputs | Ranked results |

## Common Anti-Patterns

### 1. Modeling at Wrong Level
Showing technical implementation details to business stakeholders (L5 diagram for L1 audience). Fix: match level to audience. Create separate views for different stakeholders.

### 2. Unbalanced Gateways
Opening with a parallel gateway but closing with an exclusive gateway. Fix: every split must have a corresponding merge of the same type.

### 3. Magic Wand Automation
Modeling automation for activities that require human judgment, unstructured data, or subjective decisions. Fix: DMN tables only work for deterministic rules. If a decision requires judgment, it's a user task.

### 4. Happy Path Only Modeling
Showing only the ideal flow with no exception paths. Fix: every gateway should have a default flow. Every service task should have error boundary events.

### 5. One Giant Diagram
Putting an entire enterprise process on a single diagram. Overwhelming and unreadable. Fix: use subprocesses to decompose. Max 20 activities per diagram.

### 6. Mixing Pools and Lanes Incorrectly
Using lanes for systems within a company pool when they should be separate pools with message flows. Fix: separate pools for autonomous participants. Lanes for departments within the same organization.

### 7. No Start or End Events
Processes that start in the middle or never terminate. Fix: every process must have exactly one start event and one or more end events.

### 8. Over-Complex Gateway Logic
Chaining 5+ exclusive gateways in sequence makes the diagram unreadable. Fix: extract complex decision logic into DMN tables. Use business rule tasks instead of gateways.

## Automation Platform Comparison

| Platform | BPMN 2.0 Support | DMN | Language | Deployment | Cost |
|----------|-----------------|-----|-----------|------------|------|
| Camunda 8 | Full | Yes | Java, JS, Go | SaaS/Self-hosted | Free + Enterprise |
| Flowable | Full | Yes | Java, Spring | Self-hosted | Free + Enterprise |
| Temporal | Workflow engine | No | Java, Go, TS, Python | Self-hosted/SaaS | Free + Cloud |
| Zeebe (Camunda) | Full | Yes | Java, Go, JS | SaaS/Orchestration | Included in Camunda 8 |
| jBPM | Full | Yes | Java | Self-hosted | Open source |
| IBM BPM | Full | Limited | Java | Self-hosted | Commercial |

## BPMN to Automation Mapping

### Task Type Selection
Map each BPMN activity to the correct automation implementation type:

| BPMN Element | Automation Type | Implementation | When to Use |
|-------------|----------------|----------------|-------------|
| Service Task | API call / microservice | REST, gRPC, GraphQL call | Deterministic, stateless operations |
| Business Rule Task | DMN decision | Decision table evaluation | Complex business logic with explicit rules |
| User Task | Human workflow | Task list, form, approval UI | Requires human judgment or input |
| Script Task | Inline code execution | JavaScript, Groovy, Python | Simple transformations, data mapping |
| Send Task | Outbound message | Email, SMS, webhook, event | Notification or external system trigger |
| Receive Task | Inbound event listener | Message queue, webhook, polling | Waiting for external system response |
| Manual Task | No automation | Documented procedure | Cannot or should not be automated |

### Error Handling Patterns
For each automated task, define error handling:

| Error Type | Handling Pattern | Implementation |
|------------|-----------------|----------------|
| Transient (timeout, network) | Retry with backoff | Retry 3x, exponential backoff, max 30s total |
| Business logic (validation fail) | Boundary error event | Route to manual review or rejection path |
| System unavailable | Circuit breaker | Fallback to alternate service or defer |
| Data quality | Escalation to user task | Route to human review with error context |
| Compensating | Undo previous steps | Saga compensation handler per activity |

## Process Mining Integration

### Mining vs Modeling
Process mining discovers actual process flows from event log data, while BPMN modeling designs intended flows. Use process mining to validate BPMN models against reality:

| Source | BPMN Modeling | Process Mining |
|--------|--------------|----------------|
| Input | Stakeholder interviews | Event logs (ERP, CRM, workflow systems) |
| Output | Intended process design | Actual process discovery |
| Bias | Stakeholder perception (what people think happens) | Data (what actually happens) |
| Best for | TO-BE design, new processes | AS-IS validation, compliance checking |

### Conformance Checking
Compare mined process against BPMN model to identify deviations. Calculate fitness score: how much of the mined process fits the model (0-1). Calculate precision: how much of the model is actually observed in data (0-1). Calculate generalization: how well the model explains unseen behavior. Targets: fitness >0.8, precision >0.7, generalization >0.8.

### Process Enhancement
Use mining insights to enhance BPMN models: discovered bottlenecks (where does the process actually slow down?), actual path frequencies (which paths are most/least used?), exception patterns (what deviations recur?), resource utilization (which lanes are overloaded?), cycle time distribution (min/avg/max/P90 per activity).

### Mining-Driven Automation Prioritization
Rank automation candidates by mining data: frequency (how often does this activity occur?), duration (how much time is spent on it?), variability (is it standardized or ad-hoc?), error rate (how often does it fail?). Target high-frequency, high-duration, low-variability activities first — these have the highest automation ROI and lowest implementation risk.

## DMN Decision Table Design

### Decision Table Structure
```
Decision: Approve Loan
Hit Policy: UNIQUE (only one rule matches)

| Credit Score | Income > $50K | Employment | Decision | Reason |
|--------------|---------------|------------|----------|--------|
| > 700        | YES           | > 2 years  | Approve  | Low risk |
| 600-700      | YES           | > 2 years  | Review   | Medium risk |
| < 600        | —             | —          | Reject   | High risk |
| —            | NO            | —          | Reject   | Insufficient income |
```

### Hit Policies
| Policy | Behavior | Use Case |
|--------|----------|----------|
| UNIQUE | Exactly one rule matches | Most business rules |
| FIRST | First matching rule in order | Prioritized rules |
| ANY | All matching rules have same output | Consistent classifications |
| COLLECT | Aggregate matching rules | Multiple outputs |
| RULE ORDER | First matching, priority by position | Sequential logic |
| OUTPUT ORDER | Collect and sort outputs | Ranked results |

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Process cycle time reduction | >30% | Before/after comparison |
| Error rate reduction | >50% | Exception path frequency |
| Automation coverage | >80% of deterministic tasks | Task type audit |
| Stakeholder understanding | >90% can explain diagram | Survey |
| Model accuracy | Matches reality within 5% deviation | Process mining comparison |

## Rules
- Start with AS-IS modeling before designing TO-BE — skipping current-state analysis produces unrealistic designs
- BPMN models must be understandable by business stakeholders, not just developers
- Each swimlane represents one actor (role, system, external entity) — avoid mixing multiple actors in one lane
- Gateways must be balanced: every split must have a corresponding merge
- Exception paths must be modeled explicitly — catch-all flows hide process failures
- DMN hit policy must be explicit and correct for the business logic
- Service tasks should be idempotent — process engines may retry failed service calls
- Subprocesses should be limited to 2 levels of nesting for readability
- Process models at Level 4+ should only be designed if automation is planned
- Every process must have exactly one start event and one or more end events
- Label every sequence flow leaving a gateway with the condition
- Use intermediate catch events for waiting states, not timer tasks
- Message flows only cross pool boundaries, never within a pool
- Event subprocesses for error handling at the process level
- Validate BPMN diagrams with process participants before publishing

## Expanded Decision Trees

### Process Automation Priority Decision Tree
```
Which processes should be automated first?
  Is the process high-volume (>100 executions/month)?
    |-- YES --> Is it deterministic (rules-based)?
    |     |-- YES --> Priority 1: Automate (high ROI, low risk)
    |     |-- NO --> Is the human judgment bounded by clear rules?
    |           |-- YES --> Priority 2: Automate with DMN + human review
    |           |-- NO --> Priority 3: Keep manual, optimize process
    |-- NO --> Is the process error-prone in current state?
          |-- YES --> Priority 2: Automate to reduce errors
          |-- NO --> Is the process slow (>2 days cycle)?
                |-- YES --> Priority 3: Automate for speed
                |-- NO --> Low priority: document and monitor
```

### Error Handling Strategy Decision Tree
```
What type of error can occur at this task?
  |-- Transient (timeout, network glitch, rate limit)
  |     |-- YES --> Retry with exponential backoff (max 3 retries)
  |-- Business rule violation (validation failure, constraint)
  |     |-- YES --> Boundary error event → route to manual review
  |-- System unavailable (downstream dependency down)
  |     |-- YES --> Does an alternative service exist?
  |     |     |-- YES --> Circuit breaker, fallback to alternative
  |     |     |-- NO --> Defer with escalation + retry later
  |-- Data quality issue (missing fields, format error)
        |-- YES --> Escalation user task with error context
```

### DMN Hit Policy Selection Decision Tree
```
Can multiple rules match the same input?
  |-- NO --> UNIQUE hit policy (one rule matches)
  |-- YES --> Do all matching rules produce the same output?
        |-- YES --> ANY hit policy (consistent classification)
        |-- NO --> What behavior do you need?
              |-- First rule by priority order → FIRST
              |-- Collect all matching outputs → COLLECT
              |-- Collect and sort results → OUTPUT ORDER
              |-- Sequential evaluation → RULE ORDER
```

## Templates

### AS-IS Process Discovery Template
```
# Process Discovery: {Process Name}

## Scope
- Start trigger: {event that initiates the process}
- End outcome: {what signals completion}
- In scope: {activities, decisions, roles included}
- Out of scope: {explicitly excluded boundaries}

## Current State Flow
{textual or table-based description of the current process}

## Pain Points
| # | Pain Point | Stage | Frequency | Impact | Current Workaround | Root Cause |
|---|------------|-------|-----------|--------|-------------------|------------|

## Metrics (Current State)
- Average cycle time: {time}
- Error rate: {%
- Rework rate: {%
- Handoff count: {number}
- Automation level: {manual / partially automated / fully automated}
```

### Process Analysis Report Template
```
# Process Analysis: {Process Name}

## Executive Summary
{1-2 paragraph summary of findings and recommendations}

## AS-IS Process Overview
{level L2 or L3 diagram description + metrics}

## Pain Point Analysis
{top 5 pain points with quantification}

## Automation Opportunities
| Activity | Type | Automation Approach | ROI Estimate | Priority |
|----------|------|-------------------|-------------|----------|

## TO-BE Process Overview
{level L4 diagram description + expected metrics}

## Implementation Roadmap
| Phase | Activities | Timeline | Dependencies |
|-------|-----------|----------|-------------|

## DMN Decisions
{decisions identified with hit policies}

## Risk Assessment
{risks in the TO-BE design with mitigation}
```

### Process Discovery Interview Script
```
Opening (2 min):
  "Walk me through your day when [process trigger] happens."
  "What is the first thing you do?"

Process Flow (15 min):
  "What happens next?"
  "Who else gets involved?"
  "What systems do you use at this step?"
  "What information do you need and where does it come from?"

Decisions (10 min):
  "What decisions do you make during this process?"
  "How do you decide between option A vs option B?"
  "What would make you change your decision?"

Pain Points (10 min):
  "What frustrates you about this process?"
  "What goes wrong and how often?"
  "What workaround have you developed?"

Automation (5 min):
  "If you could wave a magic wand, what would change?"
  "What repetitive tasks would you eliminate?"

Closing (3 min):
  "Who else should I talk to?"
  "Is there anything we missed?"
```

## Expanded Process Patterns

### Pattern: Escalation and SLA Management
Model escalation paths using boundary timer events on user tasks. When a task exceeds its SLA, trigger an escalation: notify supervisor, reassign task, or automatically approve/reject based on rules. Use multiple escalation levels with increasing severity. Document escalation matrix clearly: Level 1 (2hr → team lead), Level 2 (4hr → department manager), Level 3 (8hr → director).

### Pattern: Parallel Approval Workflow
Use parallel gateway to send approval requests simultaneously to multiple approvers. Combine with inclusive gateway if not all approvals are required. Implement the "majority approval" pattern: N out of M approvers must approve. Use DMN to determine which approvals are needed based on request characteristics (amount, risk, department).

### Pattern: Saga Compensation for Long-Running Transactions
When a process spans multiple systems, implement compensating transactions for rollback. Each service task must have a corresponding compensation handler. If the process fails at step N, trigger compensation for steps N-1 through 1 in reverse order. Use event subprocesses for compensation logic. Important: compensation handlers must be idempotent and logged.

### Pattern: Case Management with BPMN
For processes that are ad-hoc and knowledge-worker driven (not sequential), use Case Management Model and Notation (CMMN) concepts within BPMN. Model milestones instead of sequential steps. Allow workers to choose the order of tasks. Use event subprocesses for unplanned work. Plan items can be discretionary — available but not required.

## Expanded Anti-Patterns

### 9. Process Over-Engineering
Modeling every possible variation and exception path on a single diagram. The diagram becomes unreadable and impossible to maintain. Fix: use subprocesses aggressively. Keep each diagram to max 20 activities. Model exception paths in separate subprocesses or event subprocesses.

### 10. Ignoring Non-Functional Requirements
Designing the process flow without considering performance, security, or compliance requirements. The automated process may work functionally but fail under load, expose data, or violate regulations. Fix: document non-functional requirements alongside the BPMN model. Add performance targets to service tasks. Include security and compliance review in model validation.

### 11. Manual-First Modeling
Designing the TO-BE process by simply automating the AS-IS process without rethinking the flow. You automate inefficiency. Fix: after documenting AS-IS, step back and redesign the process from scratch. Remove unnecessary steps. Change the order. Eliminate handoffs. Then add automation.

### 12. Missing Process Governance
No ownership, no monitoring, no version control for process models. BPMN diagrams become outdated within weeks. Nobody knows which version is deployed. Fix: assign a process owner for each major process. Store BPMN files in version control. Define a review cadence. Link process metrics to dashboards.

### 13. Data Flow Neglect
Modeling activity flow without specifying data flow. Service tasks have no defined inputs or outputs. The process works in theory but breaks in practice because data isn't available when needed. Fix: add data objects and data stores to every diagram. Define data mapping for each service task. Validate data flow end-to-end before implementation.

## Process Simulation Guidance

### When to Simulate
Run process simulation when: estimating capacity needs, evaluating "what-if" scenarios, validating TO-BE design before implementation, identifying bottlenecks and resource constraints, or building a business case for automation investment.

### Simulation Parameters
| Parameter | Definition | Data Source |
|-----------|------------|-------------|
| Arrival rate | How often does the process trigger? | Historical logs |
| Processing time | How long does each activity take? | Time tracking, estimates |
| Resource pool | Who or what performs each activity? | Org chart, system capacity |
| Cost per resource | Hourly cost of each resource | Finance data |
| Rule probabilities | Which path is taken at each gateway? | Historical data |
| Error rate | How often does each activity fail? | Incident logs |

### Simulation Output Analysis
| Output | What It Tells You | Decision |
|--------|-------------------|----------|
| Cycle time distribution | P50, P90, P99 cycle times | SLA feasibility |
| Resource utilization | % of time resources are busy | Staffing decisions |
| Queue lengths | Where work piles up | Bottleneck identification |
| Cost per process instance | Total cost breakdown | Automation ROI |
| Throughput | Completed instances per time period | Capacity planning |

## BPMN Collaboration Patterns

### Partner Communication
Use message flows between pools to model B2B or B2C communication. Each pool represents an independent participant with its own process. Never use sequence flows across pool boundaries — only message flows. Document the message contract (payload schema, protocol, SLA) for each message flow.

### Event-Based Collaboration
Use start message events and intermediate message events to model event-driven communication between participants. One participant's end event triggers another participant's start event via message. Use correlation keys to match related messages across processes. This pattern is essential for microservice orchestration.

### Shared Data Visibility
Use data stores visible to multiple pools when participants share data. Define read/write permissions per pool. Use data associations to show which data is read or written by each activity. This pattern helps identify data ownership and access control requirements before implementation.

## References
  - references/bpmn-elements.md — BPMN 2.0 Elements
  - references/bpmn-patterns.md — BPMN Patterns
  - references/process-automation.md — Process Automation
  - references/process-modeling.md — Process Modeling
  - references/bpmn-modeling-advanced.md — Bpmn Modeling Advanced Topics
  - references/bpmn-modeling-fundamentals.md — Bpmn Modeling Fundamentals
  - references/dmn-decision-tables.md — DMN Decision Tables
  - references/process-discovery-guide.md — Process Discovery Guide
  - references/bpmn-automation-patterns.md — BPMN to Automation Patterns
## Handoff
`create-tech-spec` for automation implementation specifications. `solution-architecture` for integration architecture design. `create-story` for breaking automation into user stories.
