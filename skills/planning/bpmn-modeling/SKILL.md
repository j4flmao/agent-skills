---
name: planning-bpmn-modeling
description: >
  Use this skill when the user asks about BPMN, business process modeling, BPMN 2.0, process diagrams, process discovery, AS-IS TO-BE analysis, process automation, Camunda, DMN decision tables, workflow automation, process optimization, process simulation, or process design patterns. Covers: BPMN 2.0 elements and notation, AS-IS and TO-BE modeling techniques, process discovery and levels (L1-L5), common process patterns (gateways, subprocesses, error handling), BPMN to automation mapping with Camunda/Flowable/Temporal. Do NOT use for: data flow diagrams, system architecture, or organizational chart design.
version: "1.0.0"
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

## Workflow

### Step 1: Process Discovery
Identify the process through stakeholder interviews, document analysis, and observation. Define the process trigger (what starts it) and the desired outcome (what signals completion). Identify all participants: human roles, systems, external entities. List known variants and exception paths. Document current pain points quantitatively (cycle time, error rate, cost per transaction, handoff count).

### Step 2: Model AS-IS Process
Create the current-state process model at Level 3 (descriptive) showing swimlanes for each participant, all activities in sequence, decision points with actual criteria, documented exception paths, and current handoffs. Validate the AS-IS model with the process owner and at least 2 participants. The AS-IS model captures reality, not the ideal.

### Step 3: Design TO-BE Process
Redesign the process addressing pain points. Apply BPMN patterns: parallel gateways for concurrent work, exclusive gateways for conditional branching, event-based gateways for timeouts and external triggers, subprocesses for complex activities, boundary events for exception handling. Introduce automation where rules are stable and volume justifies implementation cost. Reduce handoffs by combining activities. Add monitoring and metrics capture points.

### Step 4: Model Decisions with DMN
Extract decisions from the process model into DMN decision tables. Each automated decision (approval, routing, pricing, validation) becomes a DMN table with clear input columns, output columns, and hit policy. Use unique hit policy by default (only one rule matches); use first hit policy when rules are prioritized. Validate decision tables with the business experts who currently make these decisions.

### Step 5: Plan Automation
Map the BPMN model to the target automation platform. Service tasks call automated logic (APIs, functions, scripts). User tasks create forms for human interaction. Business rule tasks reference DMN decisions. Signal events trigger other processes. Message events handle asynchronous communication. Model error boundary events for expected failures and escalation paths for unexpected failures.

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

## References
- `references/bpmn-elements.md` — BPMN 2.0 elements: events, activities, gateways, swimlanes
- `references/process-modeling.md` — AS-IS vs TO-BE, process discovery, levels, catalog, ownership
- `references/bpmn-patterns.md` — Common patterns: gateways, subprocesses, loops, error handling
- `references/process-automation.md` — BPMN to workflow: Camunda, Flowable, Temporal, DMN

## Handoff
`create-tech-spec` for automation implementation specifications. `solution-architecture` for integration architecture design. `create-story` for breaking automation into user stories.
