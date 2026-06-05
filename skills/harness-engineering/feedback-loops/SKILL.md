---
name: feedback-loops
description: >
  Use this skill to implement self-correction, reflection, human-in-the-loop (HITL), and verification layers that allow AI agents to evaluate and improve their own outputs. Covers Implement-Verify-Fix cycles, reflection patterns, HITL checkpoints, output verification, automated linting hooks, multi-stage validation, correction triggers, and quality gates.
  This skill enforces: structured IVF cycles, multi-layer output verification, HITL checkpoint protocols, and continuous improvement feedback mechanisms.
  Do NOT use for: pre-execution planning, intent classification, goal decomposition, or feedforward control mechanisms.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [harness-engineering, feedback-loops, self-correction, verification, quality-gates]
---

# Feedback Loops Skill

## Purpose
Establishes a production-grade self-correction and verification framework for AI agent execution. Feedback loops operate on the principle that agent outputs must be systematically evaluated, validated, and corrected through structured cycles. This system implements Implement-Verify-Fix (IVF) cycles, agent self-reflection patterns, human-in-the-loop checkpoints, multi-layer output verification, automated validation hooks, correction trigger mechanisms, quality gates, and continuous improvement loops. The goal is to catch errors post-execution, enable iterative refinement, and maintain output quality throughout extended agent sessions.

---

## Core Principles
1. **Verify Every Output**: No agent output is trusted by default. Every generated artifact must pass through at least one verification layer before being considered complete.
2. **Structured Correction Cycles**: When verification fails, corrections follow a disciplined IVF cycle. No ad-hoc patching or blind retries.
3. **Human-in-the-Loop at Critical Junctures**: Irreversible actions, high-risk modifications, and ambiguous decisions must route through HITL checkpoints.
4. **Multi-Layer Defense**: Stack multiple verification layers (syntax, semantics, integration, acceptance) to catch errors at appropriate abstraction levels.
5. **Continuous Learning from Failures**: Every correction event generates a learning signal. Track failure patterns to prevent recurrence across sessions.

---

## Agent Protocol

### Triggers
Use this skill when processing:
- Any code generation or modification task requiring correctness verification.
- Multi-step execution workflows where intermediate outputs feed downstream steps.
- Tasks with high consequence of error (production deployments, data migrations, security changes).
- Extended agent sessions where output quality may degrade over time.
- Situations requiring human approval before proceeding.
- Post-execution validation of tool outputs and API responses.

### Input Context Required
- **Generated Artifact**: The code, text, or configuration output produced by the agent.
- **Original Intent**: The user's original request and acceptance criteria.
- **Verification Criteria ($V$)**: Specific checks the output must pass (syntax, tests, lint, schema).
- **HITL Policy**: Rules defining when human approval is required.
- **Quality Thresholds ($Q_t$)**: Minimum quality scores for automated acceptance.

### Output Artifact
- **Verified Output**: The final artifact after all verification layers pass.
- **Verification Report**: Detailed results from each verification layer.
- **Correction Log**: Record of all corrections applied during IVF cycles.
- **Quality Score**: Aggregate quality metric for the final output.

### Response Formats
For programmatic compilation, the output must be delivered in this format:

```json
{
  "output": {
    "artifact_type": "code_modification",
    "content_hash": "sha256:abc123...",
    "final_version": 3
  },
  "verification": {
    "layers_passed": ["syntax", "lint", "type_check", "unit_test"],
    "layers_failed": [],
    "overall_status": "PASS"
  },
  "corrections": [
    {
      "cycle": 1,
      "trigger": "lint_error",
      "description": "Fixed unused import on line 42",
      "confidence": 0.98
    }
  ],
  "quality_score": 0.94,
  "hitl_required": false
}
```

---

## Decision Matrix for Feedback Control

```
Output Generated
├── Automated Verification
│   ├── Syntax Check
│   │   ├── PASS → Continue to next layer
│   │   └── FAIL → Trigger IVF Cycle (syntax correction)
│   │
│   ├── Lint / Style Check
│   │   ├── PASS → Continue to next layer
│   │   └── FAIL → Auto-fix if deterministic, else IVF Cycle
│   │
│   ├── Type Check / Schema Validation
│   │   ├── PASS → Continue to next layer
│   │   └── FAIL → IVF Cycle with type error context
│   │
│   └── Unit Test Execution
│       ├── PASS → Proceed to quality gate
│       └── FAIL → IVF Cycle with test failure details
│
├── Quality Gate
│   ├── Score ≥ Q_t → Check HITL policy
│   └── Score < Q_t → Reflection + Re-generation
│
└── HITL Checkpoint
    ├── Policy: AUTO_APPROVE → Deliver output
    ├── Policy: REVIEW_REQUIRED → Present to human
    └── Policy: APPROVAL_REQUIRED → Block until approved
```

---

## Detailed Architectural Overview

Feedback loops form the downstream verification layer that validates all agent outputs. Below is the comprehensive architecture mapping execution through verification to corrected delivery.

```
+--------------+       +------------------+       +-------------------+       +------------------+       +-----------+
| Agent Output | ───►  | Syntax Verifier  | ───►  | Semantic Verifier | ───►  | Integration Check| ───►  | Quality   |
|              |       |                  |       |                   |       |                  |       | Gate      |
+--------------+       +------------------+       +-------------------+       +------------------+       +-----------+
       ▲                                                                                                      │
       │                                                                                                      ▼
+---------------+                                                                                      +------------+
| IVF Corrector | ◄─── [Failure Signal] ◄──────────────────────────────────────────────────────────── | HITL Router|
+---------------+                                                                                      +------------+
```

### Feedback Loop Lifecycle
Below is the execution pipeline for output verification and correction:

```
[Agent Produces Output]
       │
       ├──► (A) Syntax Layer ──► Parse AST, check syntax validity, verify structure
       │
       ├──► (B) Lint Layer ──► Run linters (ESLint, Ruff, Pylint), check style conformance
       │
       ├──► (C) Type Layer ──► Execute type checkers (mypy, tsc), validate schemas
       │
       ├──► (D) Test Layer ──► Run unit tests, integration tests, snapshot comparisons
       │
       ├──► (E) Quality Gate ──► Compute aggregate quality score, compare against $Q_t$
       │
       └──► (F) HITL Router ──► Apply HITL policy, route for human review if required
```

---

## Workflow Steps

### Phase 1: Output Capture & Preparation
1. **Capture Raw Output**: Intercept the agent's generated artifact immediately after production.
2. **Normalize Format**: Standardize output format (strip markdown fences, normalize line endings, fix encoding).
3. **Compute Content Hash**: Generate a SHA-256 hash for change tracking and deduplication across IVF cycles.
4. **Extract Verification Context**: Identify the file type, language, framework, and applicable verification rules.

### Phase 2: Multi-Layer Verification
1. **Syntax Verification**: Parse the output through language-specific AST parsers to catch structural errors.
2. **Lint & Style Verification**: Execute configured linters and formatters to enforce code style standards.
3. **Type & Schema Verification**: Run type checkers and JSON/YAML schema validators against the output.
4. **Test Execution**: Run relevant unit tests and integration tests to verify functional correctness.

### Phase 3: Implement-Verify-Fix Cycle
1. **Diagnose Failure**: Analyze verification failure output to identify the root cause and affected code regions.
2. **Generate Correction**: Produce a targeted fix addressing only the identified failure, preserving working code.
3. **Re-Verify**: Run the failed verification layer again on the corrected output.
4. **Cycle Control**: Limit IVF cycles to $N_{max} = 3$. Escalate to HITL if corrections fail to resolve.

### Phase 4: Quality Gate Evaluation
1. **Compute Quality Score**: Aggregate verification results into a composite quality score $Q \in [0, 1]$.
2. **Apply Threshold**: Compare $Q$ against the configured threshold $Q_t$ (default: 0.85).
3. **Trigger Reflection**: If $Q < Q_t$, activate agent self-reflection to analyze why quality is low.
4. **Re-Generate if Needed**: In severe cases ($Q < 0.5$), discard the output and regenerate from scratch.

### Phase 5: Human-in-the-Loop Routing
1. **Evaluate HITL Policy**: Check if the current action type requires human review or approval.
2. **Prepare Review Package**: Assemble the output, diff, verification report, and quality score for human review.
3. **Present to Human**: Display the review package with clear accept/reject/modify options.
4. **Process Human Feedback**: Incorporate human corrections and re-verify the modified output.

### Phase 6: Continuous Improvement
1. **Log Correction Events**: Record all IVF cycles, failure types, and correction strategies to the improvement database.
2. **Identify Failure Patterns**: Analyze correction logs to detect recurring failure categories.
3. **Update Prevention Rules**: Feed failure patterns back to the feedforward control system as new constraints.
4. **Refine Quality Thresholds**: Adjust $Q_t$ based on historical false positive and false negative rates.

---

## Extended Troubleshooting Guide

When implementing feedback loop configurations, you may encounter the following common failure modes:

| Symptom | Primary Cause | Mitigation Action |
| :--- | :--- | :--- |
| **Infinite IVF Loop** | Correction introduces new errors that trigger re-correction. | Enforce max cycle limit $N_{max} = 3$. Track changed lines to prevent oscillation. |
| **False Positive Lint Failures** | Overly strict linter rules reject valid agent output. | Maintain an agent-specific lint config that relaxes rules incompatible with generated code. |
| **HITL Bottleneck** | Too many actions routed to human review, blocking execution. | Implement tiered HITL policies: auto-approve low-risk, review medium-risk, block high-risk only. |
| **Quality Score Gaming** | Agent optimizes for verification pass rate instead of actual correctness. | Include semantic verification (test execution) that cannot be gamed through syntactic tricks. |
| **Stale Test Assertions** | Tests pass but do not verify the new behavior introduced by the agent. | Require test updates as part of the generated output when modifying tested functions. |
| **Correction Context Loss** | IVF corrector lacks context about why the original code was written. | Pass the full original intent and plan context into each correction cycle. |
| **Reflection Produces No Actionable Insight** | Agent self-reflection generates vague observations. | Use structured reflection prompts with specific questions about failure causes and fix strategies. |

---

## Complete Execution Scenario

Let's inspect how the feedback pipeline behaves during a code generation and verification cycle:

```
[Agent Output] ──► Generated new API endpoint handler in routes.py
                        │
[Syntax Check] ──► Parse Python AST ──► PASS ✓
                        │
[Lint Check] ──► Run Ruff ──► FAIL ✗ (unused import, line too long)
                        │
[IVF Cycle 1] ──► Remove unused import ──► Break long line ──► Re-lint ──► PASS ✓
                        │
[Type Check] ──► Run mypy ──► FAIL ✗ (missing return type annotation)
                        │
[IVF Cycle 2] ──► Add return type ──► Re-check ──► PASS ✓
                        │
[Unit Tests] ──► Run pytest ──► PASS ✓ (12/12 tests pass)
                        │
[Quality Gate] ──► Score: 0.92 ──► Threshold: 0.85 ──► PASS ✓
                        │
[HITL Check] ──► Policy: AUTO_APPROVE (low-risk endpoint) ──► Deliver output
```

---

## Rules and Guidelines
- **Rule 1**: Every agent-generated artifact must pass through at least one verification layer. Zero-verification delivery is never acceptable.
- **Rule 2**: IVF cycles are limited to $N_{max} = 3$ per verification layer. After 3 failed corrections, escalate to human review.
- **Rule 3**: HITL checkpoints must be non-bypassable for actions marked as high-risk in the HITL policy configuration.
- **Rule 4**: Quality gate thresholds must be calibrated per project. Do not use universal thresholds without per-project validation.
- **Rule 5**: Correction logs must be persisted across sessions. Every failure is a learning opportunity that feeds back into feedforward constraints.

---

## Reference Guides
Below are links to the reference guides detailing the algorithms, patterns, and implementations used in this feedback loop framework:

- [implement-verify-fix-cycles.md](references/implement-verify-fix-cycles.md)
  Provides core IVF loop implementation patterns, cycle control mechanisms, oscillation detection, and correction context management for agent self-repair.
- [reflection-patterns.md](references/reflection-patterns.md)
  Details agent self-evaluation and reflection techniques, including structured reflection prompts, metacognitive scoring, and introspective analysis pipelines.
- [hitl-checkpoint-design.md](references/hitl-checkpoint-design.md)
  Covers human-in-the-loop checkpoint design patterns, approval workflows, review package assembly, and HITL policy configuration frameworks.
- [output-verification-layers.md](references/output-verification-layers.md)
  Defines multi-layer output verification stacks, AST parsing validators, lint integration, type checking, and test execution frameworks.
- [automated-validation-hooks.md](references/automated-validation-hooks.md)
  Outlines pre-commit hooks, CI/CD validation pipelines, linter integration for agent outputs, and automated formatting enforcement.
- [correction-trigger-mechanisms.md](references/correction-trigger-mechanisms.md)
  Explains when and how to trigger correction cycles, threshold-based triggers, pattern-based triggers, and escalation protocols.
- [quality-gate-frameworks.md](references/quality-gate-frameworks.md)
  Covers quality gate design, composite scoring algorithms, threshold calibration, and gate policy management for agent pipelines.
- [continuous-improvement-loops.md](references/continuous-improvement-loops.md)
  Explores continuous learning mechanisms, failure pattern analysis, correction log mining, and feedback-to-feedforward integration.

---

## Handoff
For projects requiring pre-execution planning and anticipation, hand off to `feedforward-controls`. For systems implementing core orchestrator loops, hand off to `core-master-orchestrator`. For context window optimization in verification prompts, hand off to `context-engineering`.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with IVF cycles, verification layers, and feedback control protocols.
-->
