---
name: agent-task-checklist
description: >
  Use this skill when the user says 'track progress', 'task.md', 'keep a checklist', 'break this into steps', 'show me what is done', or when an agent executes a long multi-step task that should remain transparent and resumable. It maintains a granular, frequently updated checklist with explicit states ([ ], [/], [x]) so progress survives interruptions and the user can see status at a glance. Do NOT use for: the up-front design of changes (use write-implementation-plan), sprint/backlog management for human teams (use agile-scrum), final reporting (use agent-walkthrough-report).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [planning, agent-workflow, checklist, progress-tracking]
---

# Agent Task Checklist

## Purpose
Make long agent tasks observable and resumable. A checklist file (`task.md`, or the host's built-in task-list tool when one exists) lists atomic steps and their state, and is updated the moment a step starts or finishes — so a user, a reviewer or a resumed session can tell exactly what is done, in progress and left.

## Agent Protocol

### Trigger
"task.md", "checklist", "track progress", "break it down", "what's left", long tasks (>5 steps or multiple sessions).

### Input Context
- The approved plan or the user's request.
- Whether the host provides a native task/plan tool (prefer it over a file).

### Output Artifact
`task.md` at the repo root or scratch location agreed with the user (never committed unless asked).

### Response Format
```markdown
# Task: {title}

## Steps
- [x] Read existing auth middleware and tests
- [/] Add refresh-token rotation to `src/auth/tokens.ts`
- [ ] Update `tests/auth/tokens.test.ts` for rotation and reuse detection
- [ ] Run `npm test -- auth` and fix failures
- [ ] Update CHANGELOG

## Blocked / Questions
- {item} — waiting on {who/what}

## Notes
- {decision or discovery worth keeping}
```

## State Notation

| Mark | Meaning | Rule |
|------|---------|------|
| `[ ]` | Not started | Default for new items |
| `[/]` | In progress | Exactly one item at a time unless work is truly parallel |
| `[x]` | Done | Only after verification (tests ran, file saved, command succeeded) |
| `[-]` | Dropped | Keep with a reason instead of deleting silently |

`[/]` is a convention of this workflow, not standard Markdown task-list syntax; GitHub renders only `[ ]` and `[x]` as checkboxes.

## Granularity Rules
- One step = one verifiable outcome, typically minutes, not hours.
- Start each step with a verb and name the file or command: "Add X to `path`", "Run `cmd`".
- Split any step that touches more than one component or has its own verification.
- Put verification as its own step ("Run tests", "Check build") so it cannot be skipped implicitly.

## Update Discipline
1. Write the full list before starting work.
2. Mark `[/]` when beginning a step; `[x]` immediately when it is verified.
3. When new work is discovered, insert it in order — do not silently expand an existing step.
4. When the plan changes, rewrite the list so it never shows abandoned steps as pending.
5. On interruption or handoff, the checklist plus Notes must be enough to resume.

## Anti-Patterns
| Anti-pattern | Fix |
|--------------|-----|
| Ticking everything at the end | Update per step |
| Vague items ("fix stuff") | Verb + path/command |
| Marking done without running checks | Verify, then tick |
| Several `[/]` at once | One active item |
| Checklist and reality diverge after a plan change | Rewrite the list |

## Checklist
- [ ] All steps written before execution
- [ ] Exactly one in-progress item
- [ ] Verification steps explicit
- [ ] Blockers recorded with owner
- [ ] Final state shows no stale `[ ]` items
