# QA & Test Engineer

**Who this is for:** You own test strategy, automation and release confidence.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Level 1 — Essentials (5 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`quality-unit-testing`](../../skills/quality/unit-testing/SKILL.md) | `quality/unit-testing` | Write effective unit tests using FIRST principles, AAA pattern, test doubles, and TDD. |
| [`quality-integration-testing`](../../skills/quality/integration-testing/SKILL.md) | `quality/integration-testing` | Design and implement integration tests that verify components work together: API integration, database integration, external service mocking, and… |
| [`quality-e2e-testing`](../../skills/quality/quality-e2e-testing/SKILL.md) | `quality/quality-e2e-testing` | Use end-to-end tests where only they can give confidence — critical user journeys across the real stack — and keep them deterministic, fast enough… |
| [`quality-regression-testing`](../../skills/quality/regression-testing/SKILL.md) | `quality/regression-testing` | Ensure that new code changes do not break existing functionality through effective test selection, suite design, automation maintenance, and… |
| [`quality-smoke-testing`](../../skills/quality/smoke-testing/SKILL.md) | `quality/smoke-testing` | Validate that the most critical functionality of an application works after a deployment, build, or environment change. |

## Level 2 — Professional (7 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`quality-contract-testing`](../../skills/quality/contract-testing/SKILL.md) | `quality/contract-testing` | Implement consumer-driven contract testing with Pact to verify API compatibility between services without brittle integration tests. |
| [`quality-load-testing`](../../skills/quality/load-testing/SKILL.md) | `quality/load-testing` | Design and execute load tests with realistic scenarios, meaningful metrics, and reliable CI-integrated execution. |
| [`quality-property-based-testing`](../../skills/quality/property-based-testing/SKILL.md) | `quality/property-based-testing` | Use property-based testing to define invariants and properties, generate random inputs, shrink failing cases, and discover edge cases that… |
| [`quality-acceptance-testing`](../../skills/quality/acceptance-testing/SKILL.md) | `quality/acceptance-testing` | Validate that the system meets business requirements, user needs, and acceptance criteria through structured UAT, alpha/beta programs, business… |
| [`quality-visual-testing`](../../skills/quality/visual-testing/SKILL.md) | `quality/visual-testing` | Make a red visual diff almost always mean a real change. |
| [`frontend-testing`](../../skills/frontend/universal/testing/SKILL.md) | `frontend/universal/testing` | Test user behavior, not implementation. |
| [`mobile-testing`](../../skills/mobile/universal/testing/SKILL.md) | `mobile/universal/testing` | Design comprehensive mobile test strategies following the test pyramid — unit, widget/component, integration, and E2E — with proper mocking,… |

## Level 3 — Specialist (6 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`qa-chaos-engineering`](../../skills/quality-assurance/testing-strategies/chaos-engineering/SKILL.md) | `quality-assurance/testing-strategies/chaos-engineering` | Gain evidence that a system tolerates real failures (instance loss, latency, dependency outage, resource exhaustion) by running controlled… |
| [`qa-e2e-playwright`](../../skills/quality-assurance/testing-strategies/e2e-playwright/SKILL.md) | `quality-assurance/testing-strategies/e2e-playwright` | Write fast, non-flaky end-to-end tests with Playwright Test: each test runs in an isolated browser context, actions auto-wait for actionability,… |
| [`planning-bdd-atdd`](../../skills/planning/bdd-atdd/SKILL.md) | `planning/bdd-atdd` | Drive development through shared examples and executable specifications using Behavior-Driven Development and Acceptance Test-Driven Development. |
| [`qa`](../../skills/management/qa/SKILL.md) | `management/qa` | Design and manage testing activities: test strategy, test case design, defect management, test metrics, and automation strategy. |
| [`qc`](../../skills/management/qc/SKILL.md) | `management/qc` | Enforce code quality standards through quality gates, static analysis, peer reviews, and quality metrics automation. |
| [`qa-architect`](../../skills/personas/qa-architect/SKILL.md) | `personas/qa-architect` | Adopt the mindset of a Principal QA Architect: automate relentlessly, respect the test pyramid, eradicate flaky tests, shift quality left, and… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 only (5 skills):**

```bash
npx skills add j4flmao/agent-skills --skill quality-unit-testing --skill quality-integration-testing --skill quality-e2e-testing --skill quality-regression-testing --skill quality-smoke-testing
```

**Level 1 + 2 (12 skills):**

```bash
npx skills add j4flmao/agent-skills --skill quality-unit-testing --skill quality-integration-testing --skill quality-e2e-testing --skill quality-regression-testing --skill quality-smoke-testing --skill quality-contract-testing --skill quality-load-testing --skill quality-property-based-testing --skill quality-acceptance-testing --skill quality-visual-testing --skill frontend-testing --skill mobile-testing
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`quality-testing`](../bundles.md#quality-testing) | 20 | Quality engineering: unit, integration, contract, E2E, visual, load, property-based, regression, smoke, acceptance testing |

## Combine with

- [Frontend Engineer](frontend.md)
- [Backend Engineer](backend.md)
- [Mobile Engineer](mobile.md)

## Watch out

`quality/e2e-testing` and `quality/quality-e2e-testing` overlap; keep `quality-e2e-testing`.
