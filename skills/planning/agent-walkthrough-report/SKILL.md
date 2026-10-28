---
name: agent-walkthrough-report
description: >
  Use this skill when the user says 'walkthrough', 'summarize what you did', 'walkthrough.md', 'change report', 'explain the changes', 'handoff report' after an agent completed implementation work. It produces a concise, evidence-based report of what changed, why, how it was verified and what remains, using GitHub-flavored Markdown (tables, diff blocks, alerts, Mermaid). Do NOT use for: pre-work planning (use write-implementation-plan), progress tracking (use agent-task-checklist), pull request descriptions (use dev-loop/pr-writer), release notes (use changelog-generator).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [planning, agent-workflow, report, walkthrough, markdown]
---

# Agent Walkthrough Report

## Purpose
After finishing work, give the reader a report they can trust and scan in a minute: what changed (with paths), why, the actual verification evidence, and what is not done. Accuracy beats polish — never claim a test passed or a behaviour works without having observed it.

## Agent Protocol

### Trigger
"walkthrough", "walkthrough.md", "summarize the changes", "what did you do", "handoff report", end of a multi-step implementation.

### Input Context
- The diff (`git diff --stat`, `git diff`) and the task checklist.
- Output of tests/builds/linters actually run.
- Screenshots or recordings when UI changed (if available).

### Output Artifact
`walkthrough.md` or the same content inline in chat.

### Response Format
````markdown
# {Task}: Walkthrough

## Summary
{2-3 sentences: outcome, scope, status}

## Changes
| File | Change | Why |
|------|--------|-----|
| `src/auth/tokens.ts` | Added refresh-token rotation | Prevent token reuse |

## Key Diff
```diff
- const token = sign(payload, secret);
+ const token = sign(payload, secret, { expiresIn: '15m' });
```

## Verification
| Check | Command | Result |
|-------|---------|--------|
| Unit tests | `npm test -- auth` | 42 passed, 0 failed |
| Lint | `npm run lint` | clean |

> [!WARNING]
> {anything not verified, known limitations, follow-ups}

## Next Steps
- {remaining work or decisions for the user}
````

## Content Rules
- Lead with the outcome and status (done / partially done / blocked).
- Every changed file appears in the Changes table; take the list from `git diff --stat`, not memory.
- Verification rows contain real commands and their real results; if something was not run, say so in a WARNING alert.
- Show at most 1–3 short diff blocks for the decisive changes; link or name the rest.
- Use a Mermaid diagram only when a flow or architecture changed and a picture is clearer than prose.
- Cut narrative of the process ("first I looked at..."); report results.

## GitHub Markdown Features (render on GitHub and most viewers)

| Feature | Syntax | Use for |
|---------|--------|---------|
| Alerts | `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]` | Limitations, risks, decisions |
| Diff block | ```` ```diff ```` with `+`/`-` lines | Decisive code changes |
| Mermaid | ```` ```mermaid ```` | Changed flows/architecture |
| Tables | pipe tables | Files, checks, metrics |
| Collapsible | `<details><summary>…</summary>…</details>` | Long logs |

Some agent UIs support extra blocks (e.g., carousels); use them only when the target viewer is known to render them.

## Anti-Patterns
| Anti-pattern | Fix |
|--------------|-----|
| "All tests pass" without running them | Paste command + result, or flag as unverified |
| Wall of prose | Tables + short bullets |
| Every diff pasted | Decisive diffs only |
| Hiding failures in the middle | WARNING alert near the top/verification section |
| Decorative diagrams | Diagram only what changed |

## Checklist
- [ ] Status stated in summary
- [ ] Changes table matches `git diff --stat`
- [ ] Verification evidence is real
- [ ] Unverified items and follow-ups flagged
- [ ] Readable in under a minute
