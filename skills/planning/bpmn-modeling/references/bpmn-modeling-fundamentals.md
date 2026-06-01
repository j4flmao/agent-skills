# BPMN Modeling Fundamentals

## Overview
BPMN (Business Process Model and Notation) 2.0 is the standard for modeling business processes. This reference covers the foundational concepts, notation elements, modeling guidelines, and best practices required to create clear, accurate process diagrams.

## Core Concepts

### What is BPMN?
BPMN is a graphical notation for specifying business processes in a workflow. It provides a standard language that bridges the gap between business process design and process implementation. Business stakeholders understand the diagrams, and developers can execute them through automation engines.

### Why Model Processes?
| Reason | Benefit |
|--------|---------|
| Visibility | Everyone sees how the process actually works |
| Analysis | Identify bottlenecks, waste, and errors |
| Alignment | Shared understanding across stakeholders |
| Automation | Executable models for workflow engines |
| Compliance | Documented controls and audit trails |
| Optimization | Data-driven improvement decisions |

### Process Modeling Levels
| Level | Name | Detail | Audience |
|-------|------|--------|----------|
| L1 | Contextual | Value chain, 5-10 high-level boxes | Executives |
| L2 | Process Flow | 10-20 steps, major decisions | Managers |
| L3 | Detailed | Swimlanes, exceptions, full notation | Participants |
| L4 | Executable | Service tasks, rules, data mapping | Implementers |
| L5 | Technical | Implementation specs, API details | Developers |

## Essential BPMN Elements

### Events
| Event Type | Circle Style | Meaning |
|-------------|--------------|---------|
| Start | Thin single line | Process trigger |
| Intermediate | Double thin line | Something happens during the process |
| End | Thick single line | Process termination |

### Event Types (by Trigger)
| Trigger | Start | Intermediate | End |
|---------|-------|-------------|-----|
| Message | Envelope | Envelope | Envelope |
| Timer | Clock | Clock | — |
| Error | — | Lightning | Lightning |
| Signal | Triangle | Triangle | Triangle |
| Link | Arrow | Arrow | Arrow |
| Escalation | — | Arrow up | Arrow up |

### Activities
| Type | Visual | Behavior |
|------|--------|----------|
| Task | Single rounded rectangle | Atomic, indivisible unit of work |
| Subprocess | Rounded rectangle with + | Compound, has internal flow |
| Transaction | Rounded rectangle with double border | ACID transaction boundary |
| Call Activity | Rounded rectangle with thick border | Reuses a global process |

### Task Types
| Task Type | Notation Marker | Purpose | Example |
|-----------|----------------|---------|---------|
| Service | Gears icon | Calls service/API | Validate credit card |
| User | Person icon | Human-performed | Approve expense report |
| Manual | Hand icon | Off-system activity | Sign physical document |
| Business Rule | Table icon | Evaluates DMN | Determine discount |
| Send | Filled envelope | Sends message | Email notification |
| Receive | Open envelope | Waits for message | Receive payment confirmation |
| Script | Scroll icon | Executes script | Calculate shipping cost |

## Modeling Guidelines

### Naming Conventions
| Element | Convention | Example |
|---------|------------|---------|
| Process | Verb + Noun | Process Order Payment |
| Task | Verb + Object | Validate Customer Address |
| Gateway | Question | Is credit check passed? |
| Event | Past tense verb | Order Received |
| Pool | Organization/System | Payment Gateway |
| Lane | Department/Role | Accounts Receivable |

### Diagram Readability Rules
- Maximum 20 activities per diagram
- Sequence flows go left-to-right or top-to-bottom
- Avoid crossing lines — reorganize layout if needed
- Label every sequence flow leaving a gateway
- One start event per process
- Merge parallel paths before end events
- Consistent spacing between elements

## Gateway Types in Detail

### Exclusive Gateway (XOR)
Creates alternative paths where exactly one is taken:
```
[Check Order Total]
  | under $100 |
  |            | over $100
[Auto-Approve] [Require Approval]
```
Use when: decision has mutually exclusive outcomes.

### Parallel Gateway (AND)
Creates concurrent paths that all execute:
```
[Process Order]
  |          |
[Payment] [Shipping]
  |          |
[Update Status]
```
Use when: activities can run simultaneously.

### Inclusive Gateway (OR)
Creates one or more paths based on conditions:
```
[Evaluate Customer]
  | loyal |     | new |
[Send Gift]   [Onboarding]
```
Use when: multiple conditions can be true simultaneously.

### Event-Based Gateway
Process waits for the first event to occur:
```
[Ship Order]
  |
[Wait]
  | delivery | timeout |
[Confirm] [Escalate]
```
Use when: process outcome depends on external events.

## Common Modeling Patterns

### Pattern 1: Simple Approval
```
[Submit] → [Review] → [Approve/Reject]
              |              |
          [XOR] ← ← ← ← ← ← |
           |     |
     [Approved] [Rejected]
         |           |
     [Fulfill]   [Notify]
```

### Pattern 2: Retry with Timer
```
[Submit API Call]
     |
[Error Occured?]
  | yes |        | no |
[Wait 5 min]   [Continue]
     |
[Retry] → [Max retries?]
              | yes |
            [Escalate]
```

### Pattern 3: Parallel Processing with Merge
```
[Order Received]
     |
[AND Split]
  |            |
[Pick Items] [Process Payment]
  |            |
[AND Join]
     |
[Ship Order]
```

## Process Discovery Guide

### Interview Template
```
Process: {name}
Interviewee: {name}, {role}

1. What triggers this process? (Start event)
2. What ends it? (End event)
3. Walk me through each step from start to end
4. What decisions do you make along the way?
5. What tools or systems do you use at each step?
6. What goes wrong? (Exception paths)
7. How often does each exception happen?
8. Who else is involved in this process?
9. How long does each step typically take?
10. What metrics do you track for this process?
```

### Observation Guide
- Shadow 2-3 process participants for a full cycle
- Note differences between what people say and what they do
- Capture workarounds and manual patches
- Document all systems used
- Record elapsed time at each step

## Success Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Cycle time | Total time from start to end | Measured and trending down |
| Handoff count | Number of times work changes hands | <5 per process |
| Exception rate | % of instances with exceptions | <10% |
| Rework rate | % of instances requiring rework | <5% |
| Automation rate | % of tasks that are automated | >60% of deterministic tasks |
| Model accuracy | Deviation between model and reality | <5% |

## Key Points
- Match modeling level to the audience
- Every gateway must be balanced (split = merge)
- Label conditions on all outgoing gateway flows
- Model exception paths, not just happy path
- Validate diagrams with process participants
- One start event, one or more end events
- Subprocesses for complexity management
- DMN tables for complex decision logic
- Service tasks should be idempotent for automation
