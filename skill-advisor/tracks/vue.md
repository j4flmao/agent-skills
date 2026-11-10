# Vue & Nuxt Developer

**Who this is for:** You build Vue 3 apps, often with Nuxt.

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
| [`vue-architecture`](../../skills/frontend/vue/architecture/SKILL.md) | `frontend/vue/architecture` | Structure Vue 3 applications with Composition API, feature-based folders, and Pinia stores. |
| [`frontend-vue-patterns`](../../skills/frontend/vue/patterns/SKILL.md) | `frontend/vue/patterns` | Apply production patterns to Vue 3 applications: composable design, Pinia state management, router patterns, renderless components, and slot… |
| [`frontend-state-management`](../../skills/frontend/universal/state-management/SKILL.md) | `frontend/universal/state-management` | Choose and implement the correct state management pattern for each type of state. |
| [`frontend-data-fetching`](../../skills/frontend/universal/data-fetching/SKILL.md) | `frontend/universal/data-fetching` | Manage server state efficiently on the client — eliminating boilerplate, providing caching, deduplication, background refetching, and optimistic… |
| [`frontend-typescript-patterns`](../../skills/frontend/universal/typescript-patterns/SKILL.md) | `frontend/universal/typescript-patterns` | Write type-safe frontend code with generic components, typed API clients, discriminated unions for state, and reliable type guards. |

## Level 2 — Professional (6 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`vue-nuxt`](../../skills/frontend/vue/nuxt/SKILL.md) | `frontend/vue/nuxt` | Build Nuxt 3/4 applications with directory-based routing, server-side data fetching, and auto-imported components and composables. |
| [`frontend-rendering-strategies`](../../skills/frontend/universal/rendering-strategies/SKILL.md) | `frontend/universal/rendering-strategies` | Select and implement the correct rendering strategy for each route: CSR for highly interactive dashboards, SSR for personalized content, SSG for… |
| [`frontend-performance`](../../skills/frontend/universal/performance/SKILL.md) | `frontend/universal/performance` | Optimize Core Web Vitals (LCP, CLS, INP) and bundle size. |
| [`frontend-testing`](../../skills/frontend/universal/testing/SKILL.md) | `frontend/universal/testing` | Test user behavior, not implementation. |
| [`frontend-accessibility`](../../skills/frontend/universal/accessibility/SKILL.md) | `frontend/universal/accessibility` | Meet WCAG 2.2 AA standards. |
| [`frontend-form-handling`](../../skills/frontend/universal/form-handling/SKILL.md) | `frontend/universal/form-handling` | Build robust, performant forms with proper validation, accessibility, and user experience — minimizing re-renders through uncontrolled inputs… |

## Level 3 — Specialist (3 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`frontend-internationalization`](../../skills/frontend/universal/internationalization/SKILL.md) | `frontend/universal/internationalization` | Deliver multi-locale frontends with proper locale detection, resource loading, ICU message formatting, pluralization, date/number formatting, and… |
| [`frontend-storybook`](../../skills/frontend/universal/storybook/SKILL.md) | `frontend/universal/storybook` | Create, maintain, and optimize Storybook stories using CSF 3.x format with interaction tests, accessibility checks, and addon-driven workflows. |
| [`quality-visual-testing`](../../skills/quality/visual-testing/SKILL.md) | `quality/visual-testing` | Make a red visual diff almost always mean a real change. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (6 skills):**

```bash
npx skills add j4flmao/agent-skills --skill vue-architecture --skill frontend-vue-patterns --skill frontend-state-management --skill frontend-data-fetching --skill frontend-typescript-patterns --skill frontend-security
```

**Level 1 + 2 + security baseline (12 skills):**

```bash
npx skills add j4flmao/agent-skills --skill vue-architecture --skill frontend-vue-patterns --skill frontend-state-management --skill frontend-data-fetching --skill frontend-typescript-patterns --skill vue-nuxt --skill frontend-rendering-strategies --skill frontend-performance --skill frontend-testing --skill frontend-accessibility --skill frontend-form-handling --skill frontend-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`fullstack-golang-vue`](../bundles.md#fullstack-golang-vue) | 218 | Full stack: Go backend + Vue frontend |
| [`frontend-foundations`](../bundles.md#frontend-foundations) | 28 | Frontend foundations for any framework: TypeScript, CSS strategy, responsive design, auth, error handling, security, forms, data fetching, state |

## Combine with

- [Frontend Engineer](frontend.md)
- [Go Backend Developer](go-backend.md)

## Watch out

Do not mix React and Vue framework skills in one project install.
