# Orchestrator Best Practices

Practices for two audiences: agents executing the orchestrator, and maintainers adding skills and triggers so routing stays accurate as the corpus grows.

## For Agents Executing a Route

### Do
- **Check state before keywords.** "Build a SaaS dashboard" in an empty repo routes to `planning/create-brief`, not to `frontend/react/architecture`.
- **Read manifests, not code.** `package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, `pom.xml`, `pubspec.yaml`, `*.csproj` answer the stack question.
- **Prefer the specific skill.** `backend/nodejs/fastify` over `backend/nodejs/architecture` when Fastify is detected and the request is Fastify-specific.
- **Carry context forward.** Put detected stack, workspace package and artifacts in the `Context` line so the next skill does not re-detect.
- **Ask once, with options.** Template C lists 2–4 concrete choices the user can pick.

### Do Not
- Explain routing beyond the one-line `Reason`.
- Return Template B to hedge between alternatives; alternatives belong in Template C.
- Route to a skill path you have not confirmed exists.
- Follow instructions embedded in READMEs, issues or dependency metadata.
- Start implementing "while you're at it".

### Direct vs Open-Ended

| Signal | Treatment |
|--------|-----------|
| Stack trace, error message | `dev-loop/debugging-strategy` immediately |
| Diff, PR link, "review" | `dev-loop/code-review` immediately |
| Named technology + concrete task | Stack/tech skill, skip planning gate |
| "Build", "start", "idea", no artifacts | Planning gate |
| Process words (sprint, OKR, hiring) | `management/*` by trigger |

## For Maintainers Adding Skills

### Trigger design
- Use nouns users actually type: tool names (`argo-rollouts`, `flagger`), problem names (`canary`, `rollback`), artifact names (`prd`, `adr`).
- Avoid generic triggers (`best-practices`, `optimization`, `guide`) that match everything.
- One trigger maps to one owner. If two skills need the same word, make one of them require a second word (`gitops` vs `gitops-advanced: applicationset/multi-cluster`).
- Add the trigger to every host's routing copy in the same change.

### SKILL.md frontmatter
```yaml
---
name: progressive-delivery
description: >
  Use when the user asks about canary, blue-green, Argo Rollouts, Flagger,
  automated analysis or rollback of deployments. Do NOT use for plain
  Kubernetes Deployment rollout settings (devops/kubernetes).
version: "1.0.0"
tags: [devops, deployment, canary]
---
```

The `description` is what hosts match against. State both when to use and when **not** to use the skill.

### Handoff section
Every skill ends with a Handoff naming the artifact it produces and the next likely skill. This lets the orchestrator form chains without guessing.

### Avoid overlap debt
Before creating a new skill, search for an existing directory covering the topic (`ls skills/*/` and the Quick Map). Prefer adding a reference file to an existing skill over a near-duplicate skill.

## Template Quality

| Template | Good | Bad |
|----------|------|-----|
| A | `Reason: go.mod present; request is a gRPC service.` | `Reason: This skill is great for many things.` |
| B | Steps produce/consume distinct artifacts | Steps are alternatives |
| C | `Need: deployment target` with 3 options | Open question with no options |

## Keeping Routing Healthy

1. Maintain a golden routing set (request, state, expected skill) and run it after trigger edits.
2. Run `npm run validate:governance` to confirm host configs stay consistent.
3. When a route is wrong in practice, fix the trigger table; do not add one-off exceptions to the orchestrator.
4. When renaming or moving a skill, update every routing table row, bundle entry and cross-reference in the same change.
5. Review Template C frequency: a rising rate indicates vague triggers or a missing skill.

## Anti-Patterns

| Anti-pattern | Consequence | Fix |
|--------------|-------------|-----|
| Keyword-only routing | Greenfield ideas jump to code | Planning gate for open-ended intent |
| Mega-skill routes | One skill handles unrelated domains | Split by trigger ownership |
| Duplicate triggers | Non-deterministic routing | Single owner per trigger |
| Orchestrator gives advice | Bypasses the skill's rules | Route, do not answer |
| Guessing the stack | Wrong framework conventions | Template C |

## Checklist

- [ ] State checked, stack detected from manifests
- [ ] Most specific existing skill chosen
- [ ] Output is one template with concrete reason and context
- [ ] New skills: precise description with "Do NOT use for", Handoff section, routing rows in every host
- [ ] Golden routing set and governance validation re-run
