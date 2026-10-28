---
name: write-implementation-plan
description: >
  Use this skill when the user says 'plan before coding', 'write an implementation plan', 'implementation_plan.md', 'propose changes first', 'what files would you change', 'plan this feature', or when a coding task touches multiple files/modules and approval is expected before edits. It makes the agent research the codebase and produce a reviewable, file-level implementation plan with open questions and a verification plan before writing code. Do NOT use for: product requirements (use create-prd), architecture-level design docs (use create-tech-spec), progress tracking during execution (use agent-task-checklist), post-work summaries (use agent-walkthrough-report).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [planning, agent-workflow, implementation-plan, code-changes]
---

# Write Implementation Plan

## Purpose
Prevent blind edits on non-trivial tasks. The agent reads the relevant code first, then writes a short plan naming exactly which files change and how the result will be verified, and waits for approval when the user or workflow requires it. Small, unambiguous changes (one file, obvious fix) skip the plan and are executed directly.

## Agent Protocol

### Trigger
"plan first", "implementation plan", "implementation_plan.md", "propose the changes", "don't code yet", "how would you implement", multi-file feature requests in an approval-gated workflow.

### Input Context
- The task statement and acceptance criteria.
- Relevant files found by searching the codebase (entry points, call sites, tests, configs).
- Project conventions (CLAUDE.md/AGENTS.md, lint/test commands).

### Output Artifact
`implementation_plan.md` (or the plan inline in chat if no file is wanted).

### Response Format
```markdown
# {Task title}

## Goal
{1-2 sentences: the observable outcome}

## Findings
- {file:line} — {what exists today that matters}

## Open Questions
> [!WARNING]
> {ambiguity that changes the design; propose a default}

## Proposed Changes
### {Component}
- [MODIFY] `path/to/file.ts` — {what and why}
- [NEW] `path/to/new_file.ts` — {purpose}
- [DELETE] `path/to/dead.ts` — {why safe}

## Verification Plan
- Automated: `{exact test/lint/build command}`
- Manual: {steps and expected result}

## Risks / Rollback
- {risk} -> {mitigation}
```

## When to Plan vs Act

| Situation | Action |
|-----------|--------|
| One-file fix, clear request | Act directly; no plan |
| Multi-file feature, refactor, schema/API change | Plan |
| Requirements ambiguous in a way that changes design | Plan with Open Questions, ask before coding |
| Destructive or irreversible changes (data migrations, deletes, prod config) | Plan + explicit approval |
| User said "just do it" | Act; mention assumptions in the summary |

## Research Before Planning
1. Locate entry points (routes, CLI commands, handlers) with code search.
2. Trace call sites of every function you plan to change.
3. Read existing tests for the area; note the test command.
4. Check conventions: error handling, logging, naming, folder structure.
5. Record findings with file paths and line numbers — every proposed change should trace to a finding.

## Plan Quality Rules
- Every change names a concrete path; no "update relevant files".
- Order changes by dependency (types/schema → logic → API → UI → tests).
- Prefer modifying existing modules over adding new abstractions.
- State non-goals to block scope creep.
- Verification uses real commands from the repo (`package.json` scripts, `Makefile`, `pyproject.toml`).
- Keep it short: a reviewer should approve or correct it in under 2 minutes.

## After Approval
- Execute in the planned order; track progress with agent-task-checklist on long tasks.
- If reality diverges from the plan (unexpected coupling, failing tests), stop and update the plan rather than silently changing scope.
- Finish with the verification commands and report actual output.

## Anti-Patterns
| Anti-pattern | Fix |
|--------------|-----|
| Planning without reading code | Findings section with file:line evidence |
| Plan restates the request | Plan names files, order, verification |
| Huge plan for a typo fix | Act directly |
| Hidden assumptions | Open Questions with proposed defaults |
| "Tests pass" without running them | Report command output |

## Checklist
- [ ] Goal stated as observable outcome
- [ ] Findings cite real files
- [ ] Every change tagged NEW/MODIFY/DELETE with path
- [ ] Open questions listed with defaults
- [ ] Verification commands exist in the repo
