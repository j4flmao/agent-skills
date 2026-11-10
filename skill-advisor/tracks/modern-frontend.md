# Svelte, Solid, Astro & Qwik Developer

**Who this is for:** You use a newer frontend framework or a content-first site generator.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (1 skill, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`frontend-security`](../../skills/frontend/universal/security/SKILL.md) | `frontend/universal/security` | Prevent XSS, CSRF, and injection attacks. |

## Level 1 — Essentials (4 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`frontend-svelte-architecture`](../../skills/frontend/svelte/architecture/SKILL.md) | `frontend/svelte/architecture` | Build applications with Svelte 5 runes — explicit reactivity via $state, $derived, $effect, compiled at build time, no virtual DOM, and minimal… |
| [`sveltekit`](../../skills/frontend/svelte/sveltekit/SKILL.md) | `frontend/svelte/sveltekit` | Define and enforce SvelteKit application architecture with routing conventions, data loading, form handling, and deployment patterns. |
| [`frontend-typescript-patterns`](../../skills/frontend/universal/typescript-patterns/SKILL.md) | `frontend/universal/typescript-patterns` | Write type-safe frontend code with generic components, typed API clients, discriminated unions for state, and reliable type guards. |
| [`frontend-rendering-strategies`](../../skills/frontend/universal/rendering-strategies/SKILL.md) | `frontend/universal/rendering-strategies` | Select and implement the correct rendering strategy for each route: CSR for highly interactive dashboards, SSR for personalized content, SSG for… |

## Level 2 — Professional (6 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`frontend-astro-architecture`](../../skills/frontend/astro/architecture/SKILL.md) | `frontend/astro/architecture` | Build content-focused websites with Astro's zero-JS-by-default approach. |
| [`frontend-solidjs-architecture`](../../skills/frontend/solidjs/architecture/SKILL.md) | `frontend/solidjs/architecture` | Build applications with SolidJS fine-grained reactivity — no virtual DOM, compiled JSX, signals-based state management, and declarative control flow. |
| [`frontend-qwik-architecture`](../../skills/frontend/qwik/architecture/SKILL.md) | `frontend/qwik/architecture` | Build instantly interactive web applications with Qwik's resumability model — no hydration, lazy everything, serialized state in HTML, and… |
| [`frontend-remix-architecture`](../../skills/frontend/remix/architecture/SKILL.md) | `frontend/remix/architecture` | Build Remix applications with file-based routing, server-side data loading, progressive form mutations, and per-runtime deployment. |
| [`frontend-performance`](../../skills/frontend/universal/performance/SKILL.md) | `frontend/universal/performance` | Optimize Core Web Vitals (LCP, CLS, INP) and bundle size. |
| [`frontend-accessibility`](../../skills/frontend/universal/accessibility/SKILL.md) | `frontend/universal/accessibility` | Meet WCAG 2.2 AA standards. |

## Level 3 — Specialist (5 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`frontend-svelte-patterns`](../../skills/frontend/svelte/patterns/SKILL.md) | `frontend/svelte/patterns` | Apply production patterns to Svelte 5 applications: forms with bind:value and progressive enhancement, animations via transition/animate… |
| [`frontend-astro-patterns`](../../skills/frontend/astro/patterns/SKILL.md) | `frontend/astro/patterns` | Apply production patterns to Astro projects: island architecture with optimal hydration, type-safe content collections, view transitions, and… |
| [`frontend-solidjs-patterns`](../../skills/frontend/solidjs/patterns/SKILL.md) | `frontend/solidjs/patterns` | Apply production patterns to SolidJS applications: async data with createResource, controlled forms with signals and Zod, component composition… |
| [`frontend-qwik-patterns`](../../skills/frontend/qwik/patterns/SKILL.md) | `frontend/qwik/patterns` | Apply production patterns to Qwik applications: resumability-driven architecture, fine-grained reactivity, lazy loading boundaries, Qwik City… |
| [`frontend-remix-patterns`](../../skills/frontend/remix/patterns/SKILL.md) | `frontend/remix/patterns` | Apply production-grade patterns to Remix applications: server validation, error boundaries per route, SEO metadata, caching, optimistic UI, and… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (5 skills):**

```bash
npx skills add j4flmao/agent-skills --skill frontend-svelte-architecture --skill sveltekit --skill frontend-typescript-patterns --skill frontend-rendering-strategies --skill frontend-security
```

**Level 1 + 2 + security baseline (11 skills):**

```bash
npx skills add j4flmao/agent-skills --skill frontend-svelte-architecture --skill sveltekit --skill frontend-typescript-patterns --skill frontend-rendering-strategies --skill frontend-astro-architecture --skill frontend-solidjs-architecture --skill frontend-qwik-architecture --skill frontend-remix-architecture --skill frontend-performance --skill frontend-accessibility --skill frontend-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`frontend-frameworks`](../bundles.md#frontend-frameworks) | 24 | Frontend frameworks beyond React/Vue/Angular: Svelte, Solid, Qwik, Astro, Remix, Preact, Lit, Stencil, Ember, htmx, Alpine |

## Combine with

- [Frontend Engineer](frontend.md)
- [SEO & Web Growth Engineer](web-growth.md)

## Watch out

Level 2 lists alternatives: keep only the framework you ship with (Astro for content sites, SvelteKit/Solid/Qwik/Remix for apps).
