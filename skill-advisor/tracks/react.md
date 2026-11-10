# React & Next.js Developer

**Who this is for:** You build React apps, usually with Next.js.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (2 skills, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`frontend-security`](../../skills/frontend/universal/security/SKILL.md) | `frontend/universal/security` | Prevent XSS, CSRF, and injection attacks. |
| [`owasp-web-security`](../../skills/cybersecurity/owasp-web-security/SKILL.md) | `cybersecurity/owasp-web-security` | Explain the root-cause mechanics of common OWASP web vulnerability classes (injection, SSRF, XSS) and the secure-coding controls that eliminate them. |

## Level 1 — Essentials (6 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`react-architecture`](../../skills/frontend/react/architecture/SKILL.md) | `frontend/react/architecture` | Organize React applications by feature, not by type. |
| [`react-nextjs`](../../skills/frontend/react/nextjs/SKILL.md) | `frontend/react/nextjs` | Build Next.js apps with App Router. |
| [`frontend-state-management`](../../skills/frontend/universal/state-management/SKILL.md) | `frontend/universal/state-management` | Choose and implement the correct state management pattern for each type of state. |
| [`frontend-data-fetching`](../../skills/frontend/universal/data-fetching/SKILL.md) | `frontend/universal/data-fetching` | Manage server state efficiently on the client — eliminating boilerplate, providing caching, deduplication, background refetching, and optimistic… |
| [`frontend-form-handling`](../../skills/frontend/universal/form-handling/SKILL.md) | `frontend/universal/form-handling` | Build robust, performant forms with proper validation, accessibility, and user experience — minimizing re-renders through uncontrolled inputs… |
| [`frontend-typescript-patterns`](../../skills/frontend/universal/typescript-patterns/SKILL.md) | `frontend/universal/typescript-patterns` | Write type-safe frontend code with generic components, typed API clients, discriminated unions for state, and reliable type guards. |

## Level 2 — Professional (7 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`react-server-components`](../../skills/frontend/advanced-architecture/react-server-components/SKILL.md) | `frontend/advanced-architecture/react-server-components` | Server Components are a stable part of React 19: components that render ahead of time on the server (per request or at build time) and whose code… |
| [`frontend-rendering-strategies`](../../skills/frontend/universal/rendering-strategies/SKILL.md) | `frontend/universal/rendering-strategies` | Select and implement the correct rendering strategy for each route: CSR for highly interactive dashboards, SSR for personalized content, SSG for… |
| [`frontend-performance`](../../skills/frontend/universal/performance/SKILL.md) | `frontend/universal/performance` | Optimize Core Web Vitals (LCP, CLS, INP) and bundle size. |
| [`frontend-testing`](../../skills/frontend/universal/testing/SKILL.md) | `frontend/universal/testing` | Test user behavior, not implementation. |
| [`frontend-tailwind-css`](../../skills/frontend/universal/tailwind-css/SKILL.md) | `frontend/universal/tailwind-css` | Generate production-ready Tailwind CSS code following utility-first principles with consistent design tokens and responsive patterns. |
| [`frontend-accessibility`](../../skills/frontend/universal/accessibility/SKILL.md) | `frontend/universal/accessibility` | Meet WCAG 2.2 AA standards. |
| [`frontend-authentication`](../../skills/frontend/universal/authentication/SKILL.md) | `frontend/universal/authentication` | Implement secure authentication on the frontend: token acquisition, storage, route protection, session refresh, and logout — compatible with any… |

## Level 3 — Specialist (5 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`react-fiber-architecture`](../../skills/frontend/react/react-fiber/SKILL.md) | `frontend/react/react-fiber` | Fiber is React's reconciler (since React 16): a linked tree of work units that lets React split rendering into interruptible chunks, prioritise… |
| [`nextjs-internals`](../../skills/frontend/nextjs/internals/SKILL.md) | `frontend/nextjs/internals` | Explain the App Router request lifecycle precisely enough to debug it: how a route is classified static or dynamic, what the RSC payload is, how… |
| [`nextjs-server-components`](../../skills/web/nextjs-server-components/SKILL.md) | `web/nextjs-server-components` | In the App Router every page/layout is a Server Component by default. |
| [`frontend-storybook`](../../skills/frontend/universal/storybook/SKILL.md) | `frontend/universal/storybook` | Create, maintain, and optimize Storybook stories using CSF 3.x format with interaction tests, accessibility checks, and addon-driven workflows. |
| [`quality-visual-testing`](../../skills/quality/visual-testing/SKILL.md) | `quality/visual-testing` | Make a red visual diff almost always mean a real change. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (8 skills):**

```bash
npx skills add j4flmao/agent-skills --skill react-architecture --skill react-nextjs --skill frontend-state-management --skill frontend-data-fetching --skill frontend-form-handling --skill frontend-typescript-patterns --skill frontend-security --skill owasp-web-security
```

**Level 1 + 2 + security baseline (15 skills):**

```bash
npx skills add j4flmao/agent-skills --skill react-architecture --skill react-nextjs --skill frontend-state-management --skill frontend-data-fetching --skill frontend-form-handling --skill frontend-typescript-patterns --skill react-server-components --skill frontend-rendering-strategies --skill frontend-performance --skill frontend-testing --skill frontend-tailwind-css --skill frontend-accessibility --skill frontend-authentication --skill frontend-security --skill owasp-web-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`fullstack-nodejs-react`](../bundles.md#fullstack-nodejs-react) | 223 | Full stack: Node.js backend + React frontend |
| [`frontend-foundations`](../bundles.md#frontend-foundations) | 28 | Frontend foundations for any framework: TypeScript, CSS strategy, responsive design, auth, error handling, security, forms, data fetching, state |

## Combine with

- [Frontend Engineer](frontend.md)
- [Node.js & TypeScript Backend](node-backend.md)
- [Designer & Design Engineer](design-ux.md)

## Watch out

`frontend/react/nextjs`, `frontend/nextjs/internals` and `web/nextjs-server-components` overlap; start with the first and add the others only for App Router internals.
