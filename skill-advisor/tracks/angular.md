# Angular Developer

**Who this is for:** You build Angular applications.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (1 skill, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`frontend-security`](../../skills/frontend/universal/security/SKILL.md) | `frontend/universal/security` | Prevent XSS, CSRF, and injection attacks. |

## Level 1 — Essentials (5 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`angular-architecture`](../../skills/frontend/angular/architecture/SKILL.md) | `frontend/angular/architecture` | Structure Angular 17+ applications with standalone components, Signals for state, and feature-based lazy loading. |
| [`angular-patterns`](../../skills/frontend/angular/patterns/SKILL.md) | `frontend/angular/patterns` | Implement Angular-specific patterns: HTTP interceptors for cross-cutting, guards for navigation control, Signals for sync state, RxJS for async… |
| [`frontend-typescript-patterns`](../../skills/frontend/universal/typescript-patterns/SKILL.md) | `frontend/universal/typescript-patterns` | Write type-safe frontend code with generic components, typed API clients, discriminated unions for state, and reliable type guards. |
| [`frontend-state-management`](../../skills/frontend/universal/state-management/SKILL.md) | `frontend/universal/state-management` | Choose and implement the correct state management pattern for each type of state. |
| [`frontend-form-handling`](../../skills/frontend/universal/form-handling/SKILL.md) | `frontend/universal/form-handling` | Build robust, performant forms with proper validation, accessibility, and user experience — minimizing re-renders through uncontrolled inputs… |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`frontend-testing`](../../skills/frontend/universal/testing/SKILL.md) | `frontend/universal/testing` | Test user behavior, not implementation. |
| [`frontend-performance`](../../skills/frontend/universal/performance/SKILL.md) | `frontend/universal/performance` | Optimize Core Web Vitals (LCP, CLS, INP) and bundle size. |
| [`frontend-accessibility`](../../skills/frontend/universal/accessibility/SKILL.md) | `frontend/universal/accessibility` | Meet WCAG 2.2 AA standards. |
| [`frontend-internationalization`](../../skills/frontend/universal/internationalization/SKILL.md) | `frontend/universal/internationalization` | Deliver multi-locale frontends with proper locale detection, resource loading, ICU message formatting, pluralization, date/number formatting, and… |
| [`frontend-design-system`](../../skills/frontend/universal/design-system/SKILL.md) | `frontend/universal/design-system` | Build a three-tier design token system with CVA-based component variants and theme-aware architecture. |

## Level 3 — Specialist (3 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`microfrontend`](../../skills/frontend/universal/microfrontend/SKILL.md) | `frontend/universal/microfrontend` | Design microfrontend architectures with integration strategy, shared dependency management, and cross-app communication protocols. |
| [`frontend-storybook`](../../skills/frontend/universal/storybook/SKILL.md) | `frontend/universal/storybook` | Create, maintain, and optimize Storybook stories using CSF 3.x format with interaction tests, accessibility checks, and addon-driven workflows. |
| [`quality-visual-testing`](../../skills/quality/visual-testing/SKILL.md) | `quality/visual-testing` | Make a red visual diff almost always mean a real change. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (6 skills):**

```bash
npx skills add j4flmao/agent-skills --skill angular-architecture --skill angular-patterns --skill frontend-typescript-patterns --skill frontend-state-management --skill frontend-form-handling --skill frontend-security
```

**Level 1 + 2 + security baseline (11 skills):**

```bash
npx skills add j4flmao/agent-skills --skill angular-architecture --skill angular-patterns --skill frontend-typescript-patterns --skill frontend-state-management --skill frontend-form-handling --skill frontend-testing --skill frontend-performance --skill frontend-accessibility --skill frontend-internationalization --skill frontend-design-system --skill frontend-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`fullstack-rust-angular`](../bundles.md#fullstack-rust-angular) | 217 | Full stack: Rust backend + Angular frontend |
| [`frontend-foundations`](../bundles.md#frontend-foundations) | 28 | Frontend foundations for any framework: TypeScript, CSS strategy, responsive design, auth, error handling, security, forms, data fetching, state |

## Combine with

- [Frontend Engineer](frontend.md)
- [Java & Kotlin Backend Developer](java-kotlin-backend.md)
- [.NET Developer](dotnet.md)

## Watch out

Angular projects in enterprises often pair with Java or .NET backends; add that track instead of a generic backend one.
