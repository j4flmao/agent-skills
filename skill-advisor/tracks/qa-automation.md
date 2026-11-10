# QA Automation Engineer

**Who this is for:** You build end-to-end, visual and regression suites that run in CI.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (1 skill, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security-sast-dast`](../../skills/security/sast-dast/SKILL.md) | `security/sast-dast` | Build a security scanning pipeline with static analysis rule sets, dynamic analysis scenarios, false positive management, and CI gating. |

## Level 1 — Essentials (4 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`quality-e2e-testing`](../../skills/quality/quality-e2e-testing/SKILL.md) | `quality/quality-e2e-testing` | Use end-to-end tests where only they can give confidence — critical user journeys across the real stack — and keep them deterministic, fast enough… |
| [`qa-e2e-playwright`](../../skills/quality-assurance/testing-strategies/e2e-playwright/SKILL.md) | `quality-assurance/testing-strategies/e2e-playwright` | Write fast, non-flaky end-to-end tests with Playwright Test: each test runs in an isolated browser context, actions auto-wait for actionability,… |
| [`quality-regression-testing`](../../skills/quality/regression-testing/SKILL.md) | `quality/regression-testing` | Ensure that new code changes do not break existing functionality through effective test selection, suite design, automation maintenance, and… |
| [`quality-smoke-testing`](../../skills/quality/smoke-testing/SKILL.md) | `quality/smoke-testing` | Validate that the most critical functionality of an application works after a deployment, build, or environment change. |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`quality-visual-testing`](../../skills/quality/visual-testing/SKILL.md) | `quality/visual-testing` | Make a red visual diff almost always mean a real change. |
| [`quality-contract-testing`](../../skills/quality/contract-testing/SKILL.md) | `quality/contract-testing` | Implement consumer-driven contract testing with Pact to verify API compatibility between services without brittle integration tests. |
| [`quality-load-testing`](../../skills/quality/load-testing/SKILL.md) | `quality/load-testing` | Design and execute load tests with realistic scenarios, meaningful metrics, and reliable CI-integrated execution. |
| [`frontend-playwright-testing`](../../skills/frontend/e2e-testing/SKILL.md) | `frontend/e2e-testing` | Playwright drives Chromium, Firefox and WebKit with auto-waiting locators and web-first assertions, which removes most sources of flaky tests. |
| [`github-actions`](../../skills/devops/github-actions/SKILL.md) | `devops/github-actions` | Define CI/CD pipelines using GitHub Actions workflows, reusable workflows, and composite actions. |

## Level 3 — Specialist (3 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`quality-property-based-testing`](../../skills/quality/property-based-testing/SKILL.md) | `quality/property-based-testing` | Use property-based testing to define invariants and properties, generate random inputs, shrink failing cases, and discover edge cases that… |
| [`quality-acceptance-testing`](../../skills/quality/acceptance-testing/SKILL.md) | `quality/acceptance-testing` | Validate that the system meets business requirements, user needs, and acceptance criteria through structured UAT, alpha/beta programs, business… |
| [`planning-bdd-atdd`](../../skills/planning/bdd-atdd/SKILL.md) | `planning/bdd-atdd` | Drive development through shared examples and executable specifications using Behavior-Driven Development and Acceptance Test-Driven Development. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (5 skills):**

```bash
npx skills add j4flmao/agent-skills --skill quality-e2e-testing --skill qa-e2e-playwright --skill quality-regression-testing --skill quality-smoke-testing --skill security-sast-dast
```

**Level 1 + 2 + security baseline (10 skills):**

```bash
npx skills add j4flmao/agent-skills --skill quality-e2e-testing --skill qa-e2e-playwright --skill quality-regression-testing --skill quality-smoke-testing --skill quality-visual-testing --skill quality-contract-testing --skill quality-load-testing --skill frontend-playwright-testing --skill github-actions --skill security-sast-dast
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`quality-testing`](../bundles.md#quality-testing) | 20 | Quality engineering: unit, integration, contract, E2E, visual, load, property-based, regression, smoke, acceptance testing |

## Combine with

- [QA & Test Engineer](quality.md)
- [Frontend Engineer](frontend.md)

## Watch out

Three Playwright-flavoured skills overlap (`quality-e2e-testing`, `e2e-playwright`, `frontend/e2e-testing`); keep the first two.
