---
name: feedforward-controls
description: >
  Use this skill to implement proactive planning and anticipation mechanisms that steer AI agents BEFORE they act. Covers OODA loops, Plan-and-Execute patterns, task decomposition, pre-flight validation, intent classification, action planning, resource pre-allocation, constraint propagation, goal decomposition trees, and anticipatory error prevention.
  This skill enforces: structured observation-orientation-decision-action cycles, hierarchical goal decomposition, constraint satisfaction propagation, and pre-execution validation gates.
  Do NOT use for: post-execution correction, feedback loops, output verification, or retrospective analysis.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [harness-engineering, feedforward-controls, agent-planning, ooda-loop, task-decomposition]
---

# Feedforward Controls Skill

## Purpose
Establishes a production-grade proactive control framework for AI agent execution. Feedforward controls operate on the principle that planning, validation, and constraint analysis BEFORE action produces superior outcomes compared to reactive correction. This system implements structured observation-orientation-decision-action cycles, hierarchical task decomposition, intent classification pipelines, pre-flight validation gates, and anticipatory error prevention mechanisms. The goal is to minimize wasted computation, prevent invalid actions, and ensure agents pursue well-structured plans aligned with user intent.

---

## Core Principles
1. **Plan Before Execute**: Every agent action must be preceded by an explicit planning phase. No execution without a validated plan artifact.
2. **Constraint Propagation First**: Propagate constraints through the entire plan tree before committing to any action. Early constraint violations prevent cascading failures.
3. **Intent Alignment Gate**: Classify and confirm user intent before decomposing goals. Misclassified intent poisons the entire execution pipeline.
4. **Hierarchical Decomposition**: Break complex goals into atomic sub-tasks with clear preconditions, postconditions, and dependency edges. Never execute monolithic plans.
5. **Anticipatory Validation**: Simulate execution paths mentally before committing resources. Pre-flight checks catch errors at zero cost compared to runtime failures.

---

## Agent Protocol

### Triggers
Use this skill when processing:
- Complex multi-step tasks requiring structured planning.
- Tasks with resource constraints (token budgets, API rate limits, file system operations).
- Ambiguous user requests requiring intent classification.
- Operations with irreversible side effects (file writes, API calls, deployments).
- Goal hierarchies with interdependent sub-tasks.
- Scenarios where execution cost of errors is high.

### Input Context Required
- **User Request**: The raw natural language instruction or goal statement.
- **Available Resources**: List of tools, APIs, file system access, and token budgets.
- **Constraint Set ($\mathcal{C}$)**: Hard constraints (must-satisfy) and soft constraints (should-satisfy) on the plan.
- **Domain Context**: Relevant codebase structure, project conventions, and prior execution history.
- **Risk Tolerance ($\rho$)**: A scalar [0,1] indicating acceptable failure probability.

### Output Artifact
- **Execution Plan**: A validated, ordered sequence of atomic actions with dependency edges.
- **Constraint Satisfaction Report**: Verification that all hard constraints are met.
- **Intent Classification Result**: Structured classification of user intent with confidence scores.
- **Pre-flight Validation Log**: Results of all pre-execution checks.

### Response Formats
For programmatic compilation, the output must be delivered in this format:

```json
{
  "intent": {
    "primary_class": "code_modification",
    "confidence": 0.94,
    "sub_intents": ["refactor", "add_feature"]
  },
  "plan": {
    "phases": [
      {
        "id": "phase_1",
        "name": "Analysis",
        "tasks": [
          {"id": "t1", "action": "read_file", "target": "src/main.py", "preconditions": [], "postconditions": ["file_content_loaded"]}
        ]
      }
    ],
    "dependency_graph": {"t2": ["t1"], "t3": ["t1"]},
    "estimated_cost": {"tokens": 4200, "api_calls": 3}
  },
  "constraints_satisfied": true,
  "preflight_passed": true,
  "risk_assessment": 0.12
}
```

---

## Decision Matrix for Feedforward Control

```
Incoming Request Analysis
├── Intent Clear?
│   ├── YES
│   │   └── Complexity Assessment
│   │       ├── Simple (1-2 steps)
│   │       │   → Direct Plan-and-Execute with pre-flight validation.
│   │       │
│   │       ├── Moderate (3-8 steps)
│   │       │   → OODA Loop with task decomposition tree.
│   │       │   → Propagate constraints before execution.
│   │       │
│   │       └── Complex (9+ steps or multi-domain)
│   │           → Full hierarchical goal decomposition.
│   │           → Constraint propagation + resource pre-allocation.
│   │           → Multi-phase Plan-and-Execute with checkpoints.
│   │
│   └── NO
│       ├── Ambiguous Intent
│       │   → Run intent classification pipeline.
│       │   → Request clarification if confidence < 0.75.
│       │
│       └── Contradictory Constraints
│           → Execute constraint satisfaction analysis.
│           → Report conflicts to user before proceeding.
```

---

## Detailed Architectural Overview

Feedforward controls form the upstream planning layer that precedes all agent execution. Below is the comprehensive architecture mapping observation through planning to validated execution.

```
+-------------+       +------------------+       +-------------------+       +--------------------+       +--------------+
| User Request| ───►  | Intent Classifier| ───►  | Goal Decomposer   | ───►  | Constraint Engine  | ───►  | Plan Validator|
+-------------+       +------------------+       +-------------------+       +--------------------+       +--------------+
                                                                                                                  │
                                                                                                                  ▼
+--------------+                                                                                          +--------------+
| Agent Engine |  ◄──────────────────────────────────────────────────────────────────────────────────────  | Pre-flight   |
| (Execution)  |                                                                                          | Gate         |
+--------------+                                                                                          +--------------+
```

### Feedforward Control Lifecycle
Below is the execution pipeline for proactive planning:

```
[User Request Received]
       │
       ├──► (A) OODA Observe ──► Gather context, read files, analyze codebase
       │
       ├──► (B) OODA Orient ──► Classify intent, assess complexity, identify constraints
       │
       ├──► (C) OODA Decide ──► Decompose goals, build task tree, propagate constraints
       │
       ├──► (D) Pre-flight Gate ──► Validate plan feasibility, check resource availability
       │
       └──► (E) OODA Act ──► Execute validated plan with monitoring hooks attached
```

---

## Workflow Steps

### Phase 1: Observation & Context Gathering
1. **Parse User Request**: Extract explicit instructions, implicit requirements, and contextual references from the raw input.
2. **Scan Environment State**: Read relevant files, check tool availability, and assess current system state.
3. **Identify Domain Signals**: Detect programming languages, frameworks, project conventions, and architectural patterns.
4. **Catalog Available Resources**: Enumerate tools, API endpoints, token budgets, and time constraints.

### Phase 2: Orientation & Intent Classification
1. **Classify Primary Intent**: Map the user request to a canonical intent category (create, modify, debug, explain, deploy).
2. **Extract Sub-Intents**: Identify secondary objectives embedded within the primary request.
3. **Assess Complexity Score**: Calculate task complexity based on step count, domain breadth, and constraint density.
4. **Evaluate Risk Profile**: Score the potential impact of incorrect execution on the codebase or system.

### Phase 3: Goal Decomposition & Planning
1. **Build Goal Tree**: Decompose the top-level goal into hierarchical sub-goals with AND/OR relationships.
2. **Generate Task Sequence**: Convert leaf-level goals into ordered, atomic action steps with clear preconditions.
3. **Map Dependencies**: Construct a directed acyclic graph (DAG) of task dependencies.
4. **Allocate Resources**: Pre-assign token budgets, tool selections, and execution time estimates per task.

### Phase 4: Constraint Propagation
1. **Extract Hard Constraints**: Identify must-satisfy constraints from user instructions, project configs, and system limits.
2. **Propagate Through Plan Tree**: Use arc consistency algorithms to prune infeasible branches early.
3. **Detect Constraint Conflicts**: Identify contradictions between constraints and flag for resolution.
4. **Compute Feasibility Score**: Calculate the probability of successful plan completion given current constraints.

### Phase 5: Pre-Flight Validation
1. **Verify File Access**: Confirm all target files exist and are writable before planning modifications.
2. **Check Tool Availability**: Ensure all required tools and APIs are accessible and within rate limits.
3. **Validate Token Budget**: Confirm the plan fits within the available context window and output token budget.
4. **Simulate Execution Path**: Mentally trace through the plan to identify logical errors or missing steps.

### Phase 6: Plan Execution Handoff
1. **Serialize Plan Artifact**: Generate the structured plan document with all metadata.
2. **Attach Monitoring Hooks**: Wire up feedback loop triggers for post-execution verification.
3. **Set Rollback Points**: Define checkpoints where execution can be safely reversed if needed.
4. **Initiate Execution**: Hand the validated plan to the agent execution engine.

---

## Extended Troubleshooting Guide

When implementing feedforward control configurations, you may encounter the following common failure modes:

| Symptom | Primary Cause | Mitigation Action |
| :--- | :--- | :--- |
| **Over-Planning (Analysis Paralysis)** | Decomposition depth exceeds task complexity. | Set maximum decomposition depth of 4 levels. Use complexity score to gate depth. |
| **Intent Misclassification** | Ambiguous user language or domain-specific jargon. | Implement confidence thresholds ($\theta_{conf} = 0.75$). Request clarification below threshold. |
| **Constraint Conflicts Undetected** | Incomplete constraint extraction from implicit requirements. | Parse project configs (tsconfig, eslint, package.json) as additional constraint sources. |
| **Plan Invalidated Mid-Execution** | External state changes between planning and execution. | Add just-in-time re-validation checks before each task step. |
| **Resource Pre-Allocation Waste** | Over-estimating token budgets for simple tasks. | Use adaptive budgeting with historical task cost data. |
| **Goal Tree Explosion** | OR-branches create exponential plan alternatives. | Apply beam search with width $k=3$ to limit explored alternatives. |
| **Stale Context in Observation** | Cached file contents diverge from actual file state. | Force fresh reads within the Observe phase; never cache across OODA cycles. |

---

## Complete Execution Scenario

Let's inspect how the feedforward pipeline behaves under a multi-file refactoring request:

```
[User Request] ──► "Refactor the auth module to use JWT instead of session tokens"
                        │
[Observe] ──► Read auth/ directory ──► Identify 4 files: auth.py, middleware.py, config.py, tests.py
                                            │
[Orient] ──► Intent: code_modification (0.96) ──► Complexity: Moderate (6 steps)
                                                       │
[Decide] ──► Goal Tree:
             ├── Replace session token generation → auth.py
             ├── Update middleware validation → middleware.py
             ├── Add JWT config parameters → config.py
             └── Update test assertions → tests.py
                        │
[Pre-flight] ──► All files exist ✓ ──► No constraint conflicts ✓ ──► Budget OK ✓
                        │
[Act] ──► Execute tasks in dependency order ──► t1 → t2 → t3 → t4
```

---

## Rules and Guidelines
- **Rule 1**: Never execute an action without a preceding plan artifact. Even single-step tasks require explicit pre-flight validation.
- **Rule 2**: Intent classification must achieve confidence ≥ 0.75 before proceeding to goal decomposition. Below this threshold, request user clarification.
- **Rule 3**: Constraint propagation must complete before any resource allocation. Do not pre-allocate resources to infeasible plan branches.
- **Rule 4**: Goal decomposition trees must be acyclic. Circular dependencies indicate a modeling error that must be resolved before execution.
- **Rule 5**: Pre-flight validation failures are hard stops. Do not bypass pre-flight gates under any circumstances.

---

## Reference Guides
Below are links to the reference guides detailing the algorithms, patterns, and implementations used in this feedforward control framework:

- [ooda-loop-patterns.md](references/ooda-loop-patterns.md)
  Provides OODA loop implementation patterns for AI agents, including cycle timing, observation strategies, orientation heuristics, decision frameworks, and action execution protocols.
- [plan-execute-architectures.md](references/plan-execute-architectures.md)
  Details Plan-and-Execute agent architectures, including LangChain-style planners, ReAct variants, and multi-phase execution engines with re-planning capabilities.
- [task-decomposition-strategies.md](references/task-decomposition-strategies.md)
  Covers hierarchical task decomposition strategies, AND/OR goal trees, recursive decomposition algorithms, and atomic task specification formats.
- [preflight-validation.md](references/preflight-validation.md)
  Defines pre-execution validation check suites, file system validators, token budget verifiers, API availability checkers, and constraint satisfaction verifiers.
- [intent-classification.md](references/intent-classification.md)
  Outlines intent classification pipelines for agent systems, including multi-label classifiers, confidence calibration, and disambiguation strategies.
- [constraint-propagation.md](references/constraint-propagation.md)
  Explains constraint propagation algorithms (AC-3, backtracking), constraint satisfaction problems in agent planning, and conflict resolution strategies.
- [goal-decomposition-trees.md](references/goal-decomposition-trees.md)
  Covers hierarchical goal decomposition with AND/OR trees, goal refinement operators, leaf-node task generation, and dependency graph construction.
- [anticipatory-error-prevention.md](references/anticipatory-error-prevention.md)
  Explores proactive error prevention mechanisms, failure mode prediction, defensive planning patterns, and pre-emptive mitigation strategies.

---

## Handoff
For projects requiring post-execution verification and correction, hand off to `feedback-loops`. For systems implementing core orchestrator loops, hand off to `core-master-orchestrator`. For context window optimization within plans, hand off to `context-engineering`.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OODA cycles, constraint propagation, and feedforward control protocols.
-->
