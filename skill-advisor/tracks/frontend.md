# Frontend Engineer

**Who this is for:** You build web UIs with React, Vue, Angular, Svelte or similar.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (2 skills, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`frontend-security`](../../skills/frontend/universal/security/SKILL.md) | `frontend/universal/security` | Prevent XSS, CSRF, and injection attacks. |
| [`owasp-web-security`](../../skills/cybersecurity/owasp-web-security/SKILL.md) | `cybersecurity/owasp-web-security` | Explain the root-cause mechanics of common OWASP web vulnerability classes (injection, SSRF, XSS) and the secure-coding controls that eliminate them. |

## Level 1 — Essentials (8 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`frontend-typescript-patterns`](../../skills/frontend/universal/typescript-patterns/SKILL.md) | `frontend/universal/typescript-patterns` | Write type-safe frontend code with generic components, typed API clients, discriminated unions for state, and reliable type guards. |
| [`frontend-patterns`](../../skills/frontend/universal/patterns/SKILL.md) | `frontend/universal/patterns` | Select and implement frontend component patterns that solve specific architectural problems with idiomatic framework code. |
| [`frontend-state-management`](../../skills/frontend/universal/state-management/SKILL.md) | `frontend/universal/state-management` | Choose and implement the correct state management pattern for each type of state. |
| [`frontend-data-fetching`](../../skills/frontend/universal/data-fetching/SKILL.md) | `frontend/universal/data-fetching` | Manage server state efficiently on the client — eliminating boilerplate, providing caching, deduplication, background refetching, and optimistic… |
| [`frontend-form-handling`](../../skills/frontend/universal/form-handling/SKILL.md) | `frontend/universal/form-handling` | Build robust, performant forms with proper validation, accessibility, and user experience — minimizing re-renders through uncontrolled inputs… |
| [`frontend-accessibility`](../../skills/frontend/universal/accessibility/SKILL.md) | `frontend/universal/accessibility` | Meet WCAG 2.2 AA standards. |
| [`frontend-testing`](../../skills/frontend/universal/testing/SKILL.md) | `frontend/universal/testing` | Test user behavior, not implementation. |
| [`frontend-css-strategy`](../../skills/frontend/universal/css-strategy/SKILL.md) | `frontend/universal/css-strategy` | Choose and implement the right CSS approach for the project. |

## Level 2 — Professional (10 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`frontend-performance`](../../skills/frontend/universal/performance/SKILL.md) | `frontend/universal/performance` | Optimize Core Web Vitals (LCP, CLS, INP) and bundle size. |
| [`frontend-rendering-strategies`](../../skills/frontend/universal/rendering-strategies/SKILL.md) | `frontend/universal/rendering-strategies` | Select and implement the correct rendering strategy for each route: CSR for highly interactive dashboards, SSR for personalized content, SSG for… |
| [`frontend-design-system`](../../skills/frontend/universal/design-system/SKILL.md) | `frontend/universal/design-system` | Build a three-tier design token system with CVA-based component variants and theme-aware architecture. |
| [`frontend-tailwind-css`](../../skills/frontend/universal/tailwind-css/SKILL.md) | `frontend/universal/tailwind-css` | Generate production-ready Tailwind CSS code following utility-first principles with consistent design tokens and responsive patterns. |
| [`frontend-authentication`](../../skills/frontend/universal/authentication/SKILL.md) | `frontend/universal/authentication` | Implement secure authentication on the frontend: token acquisition, storage, route protection, session refresh, and logout — compatible with any… |
| [`frontend-error-handling`](../../skills/frontend/universal/error-handling/SKILL.md) | `frontend/universal/error-handling` | Catch, report, and recover from frontend errors without crashing the entire app. |
| [`frontend-responsive-design`](../../skills/frontend/universal/responsive-design/SKILL.md) | `frontend/universal/responsive-design` | Build mobile-first responsive UIs with container queries, consistent breakpoints, fluid typography, and no horizontal overflow. |
| [`frontend-internationalization`](../../skills/frontend/universal/internationalization/SKILL.md) | `frontend/universal/internationalization` | Deliver multi-locale frontends with proper locale detection, resource loading, ICU message formatting, pluralization, date/number formatting, and… |
| [`frontend-image-optimization`](../../skills/frontend/universal/image-optimization/SKILL.md) | `frontend/universal/image-optimization` | Deliver optimized images that load fast, look crisp on any screen, and minimize bandwidth usage — directly impacting LCP, CLS, and overall page… |
| [`frontend-bundler-tools`](../../skills/frontend/universal/bundler-tools/SKILL.md) | `frontend/universal/bundler-tools` | Configure and optimize the frontend build pipeline for fast development iteration and lean production bundles -- leveraging modern bundlers,… |

## Level 3 — Specialist (10 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`microfrontend`](../../skills/frontend/universal/microfrontend/SKILL.md) | `frontend/universal/microfrontend` | Design microfrontend architectures with integration strategy, shared dependency management, and cross-app communication protocols. |
| [`micro-frontends-adoption`](../../skills/frontend/advanced-architecture/micro-frontends/SKILL.md) | `frontend/advanced-architecture/micro-frontends` | Micro-frontends apply microservice ideas to the UI: independently built and deployed slices owned by separate teams and composed into one product. |
| [`react-server-components`](../../skills/frontend/advanced-architecture/react-server-components/SKILL.md) | `frontend/advanced-architecture/react-server-components` | Server Components are a stable part of React 19: components that render ahead of time on the server (per request or at build time) and whose code… |
| [`react-fiber-architecture`](../../skills/frontend/react/react-fiber/SKILL.md) | `frontend/react/react-fiber` | Fiber is React's reconciler (since React 16): a linked tree of work units that lets React split rendering into interruptible chunks, prioritise… |
| [`nextjs-internals`](../../skills/frontend/nextjs/internals/SKILL.md) | `frontend/nextjs/internals` | Explain the App Router request lifecycle precisely enough to debug it: how a route is classified static or dynamic, what the RSC payload is, how… |
| [`webgpu-webgl-rendering`](../../skills/frontend/architecture/webgpu-webgl/SKILL.md) | `frontend/architecture/webgpu-webgl` | WebGPU is the modern browser GPU API (modelled on Vulkan/Metal/D3D12) with explicit pipelines, bind groups, command encoders and compute shaders… |
| [`frontend-pwa`](../../skills/frontend/universal/pwa/SKILL.md) | `frontend/universal/pwa` | A PWA is a web app with a manifest (installability, app identity) and a service worker (network proxy enabling offline, caching and push). |
| [`frontend-storybook`](../../skills/frontend/universal/storybook/SKILL.md) | `frontend/universal/storybook` | Create, maintain, and optimize Storybook stories using CSF 3.x format with interaction tests, accessibility checks, and addon-driven workflows. |
| [`quality-visual-testing`](../../skills/quality/visual-testing/SKILL.md) | `quality/visual-testing` | Make a red visual diff almost always mean a real change. |
| [`design-visual-design`](../../skills/design/visual-design/SKILL.md) | `design/visual-design` | Apply visual design principles — color theory, typography, layout grids, spacing systems, visual hierarchy, and aesthetic consistency — to create… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (10 skills):**

```bash
npx skills add j4flmao/agent-skills --skill frontend-typescript-patterns --skill frontend-patterns --skill frontend-state-management --skill frontend-data-fetching --skill frontend-form-handling --skill frontend-accessibility --skill frontend-testing --skill frontend-css-strategy --skill frontend-security --skill owasp-web-security
```

**Level 1 + 2 + security baseline (20 skills):**

```bash
npx skills add j4flmao/agent-skills --skill frontend-typescript-patterns --skill frontend-patterns --skill frontend-state-management --skill frontend-data-fetching --skill frontend-form-handling --skill frontend-accessibility --skill frontend-testing --skill frontend-css-strategy --skill frontend-performance --skill frontend-rendering-strategies --skill frontend-design-system --skill frontend-tailwind-css --skill frontend-authentication --skill frontend-error-handling --skill frontend-responsive-design --skill frontend-internationalization --skill frontend-image-optimization --skill frontend-bundler-tools --skill frontend-security --skill owasp-web-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`frontend-foundations`](../bundles.md#frontend-foundations) | 28 | Frontend foundations for any framework: TypeScript, CSS strategy, responsive design, auth, error handling, security, forms, data fetching, state |
| [`frontend-frameworks`](../bundles.md#frontend-frameworks) | 24 | Frontend frameworks beyond React/Vue/Angular: Svelte, Solid, Qwik, Astro, Remix, Preact, Lit, Stencil, Ember, htmx, Alpine |
| [`frontend-only`](../bundles.md#frontend-only) | 66 | Frontend-only: Design system, state, performance, a11y, patterns, microfrontend, testing, all frameworks |
| [`design-ux`](../bundles.md#design-ux) | 14 | Design and UX: visual design, design systems, accessibility, motion, IA, brand, UX research, theming, visual testing |

## Combine with

- [Designer & Design Engineer](design-ux.md)
- [QA & Test Engineer](quality.md)
- [Backend Engineer](backend.md)

## Watch out

Pick exactly one framework skill set (for example `frontend/react/*` or `frontend/vue/*`); several framework skills at once dilute routing.
