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
