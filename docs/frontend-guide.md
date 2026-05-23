# Frontend Skills Guide

37+ skills covering the complete frontend development lifecycle: architecture, patterns, rendering strategies, state management, styling, testing, and performance across 8+ framework ecosystems.

## Skill Map

### Framework Ecosystems

| Stack | Architecture | Patterns | Extra |
|-------|-------------|----------|-------|
| **React** | `frontend/react/architecture/` | — | nextjs/ |
| **Vue** | `frontend/vue/architecture/` | `frontend/vue/patterns/` | nuxt/ |
| **Angular** | `frontend/angular/architecture/` | `frontend/angular/patterns/` | — |
| **Svelte** | `frontend/svelte/architecture/` | `frontend/svelte/patterns/` | sveltekit/ |
| **Remix** | `frontend/remix/architecture/` | `frontend/remix/patterns/` | — |
| **Astro** | `frontend/astro/architecture/` | `frontend/astro/patterns/` | — |
| **SolidJS** | `frontend/solidjs/architecture/` | `frontend/solidjs/patterns/` | — |
| **Qwik** | `frontend/qwik/architecture/` | `frontend/qwik/patterns/` | — |
| **Lit** | `frontend/lit/` | — | — |

### Universal Patterns (17 skills)

| Pattern | Skill | Focus |
|---------|-------|-------|
| Accessibility | `frontend/universal/accessibility/` | WCAG, ARIA, screen readers, keyboard nav |
| Animation | `frontend/universal/animation/` | CSS, JS, GSAP, Framer Motion, transitions |
| Bundler Tools | `frontend/universal/bundler-tools/` | Vite, Webpack, Turbopack, esbuild |
| Data Fetching | `frontend/universal/data-fetching/` | React Query, SWR, Apollo, tRPC |
| Design System | `frontend/universal/design-system/` | Storybook, tokens, components, docs |
| Form Handling | `frontend/universal/form-handling/` | React Hook Form, Formik, Zod validation |
| Image Optimization | `frontend/universal/image-optimization/` | Next/Image, responsive, lazy, WebP |
| Microfrontend | `frontend/universal/microfrontend/` | Module Federation, single-spa, qiankun |
| Patterns | `frontend/universal/patterns/` | Container/presenter, hooks, composables |
| Performance | `frontend/universal/performance/` | Core Web Vitals, LCP, CLS, INP, bundle |
| PWA | `frontend/universal/pwa/` | Service workers, manifest, offline, caching |
| SEO | `frontend/universal/seo/` | Meta tags, structured data, sitemaps, SSR |
| State Management | `frontend/universal/state-management/` | Zustand, Pinia, NgRx, signals |
| Storybook | `frontend/universal/storybook/` | Stories, addons, testing, documentation |
| Tailwind CSS | `frontend/universal/tailwind-css/` | Utility-first, customization, responsive |
| Testing | `frontend/universal/testing/` | Vitest, Playwright, Testing Library, Cypress |
| Theming | `frontend/universal/theming/` | Dark mode, CSS variables, design tokens |

## Decision Framework

### Choose Your Framework

```
Need maximum ecosystem and jobs?
  ├─ React — largest ecosystem, Next.js, huge community
  ├─ Vue — gentle learning curve, great DX, versatile
  └─ Angular — enterprise, opinionated, full-featured

Need best performance and minimal JS?
  ├─ Svelte — compiled, no virtual DOM, tiny bundles
  ├─ SolidJS — fine-grained reactivity, closest to vanilla
  ├─ Qwik — resumable, near-zero JS, instant loading
  └─ Astro — islands, zero JS by default

Need content-focused site?
  ├─ Astro — best SSG, islands architecture
  ├─ Next.js — SSG + SSR, file-based routing
  └─ Remix — web standards, progressive enhancement

Need web components?
  ├─ Lit — Google's standard, lightweight
  └─ Svelte — compiles to WC too
```

### Choose Your Rendering Strategy

```
Need SEO and fast FCP?
  ├─ SSR → Next.js, Nuxt, SvelteKit, Remix
  ├─ SSG → Astro, Next.js, Nuxt (static)
  └─ ISR → Next.js (hybrid)

Need interactivity and auth?
  ├─ SPA → React, Vue, Angular (CSR)
  └─ MPA → Remix, traditional forms

Need both?
  ├─ Islands → Astro (partial hydration)
  ├─ Resumable → Qwik (lazy hydration)
  └─ RSC → Next.js (React Server Components)
```

### Choose Your State Management

```
Need simple global state?
  ├─ Context API (React) / provide-inject (Vue)
  ├─ Zustand / Pinia
  └─ Signals (Solid, Qwik, Angular)

Need server state?
  ├─ TanStack Query (React Query)
  ├─ SWR / Apollo Client
  └─ tRPC (end-to-end typesafe)

Need complex client state?
  ├─ Zustand + Immer
  ├─ Pinia / NgRx
  └─ Jotai / Recoil (atomic)
```

## Architecture Layers

```
┌──────────────────────────────────────────┐
│              UI Components                 │
│  design-system, patterns, accessibility,  │
│  animation, theming                       │
├──────────────────────────────────────────┤
│           Application State               │
│  state-management, data-fetching          │
├──────────────────────────────────────────┤
│              Routing Layer                │
│  framework-specific (Next, Nuxt, etc.)    │
├──────────────────────────────────────────┤
│            Rendering Engine               │
│  SSR / SSG / CSR / ISR / RSC / Islands    │
├──────────────────────────────────────────┤
│         Build & Optimization              │
│  bundler-tools, performance, image-opt    │
├──────────────────────────────────────────┤
│         Cross-Cutting Concerns            │
│  seo, pwa, storybook, testing,            │
│  microfrontend, form-handling             │
└──────────────────────────────────────────┘
```

## By Common Scenarios

### Building a SPA
1. `frontend/{stack}/architecture/` — project structure
2. `frontend/universal/state-management/` — state layer
3. `frontend/universal/data-fetching/` — API integration
4. `frontend/universal/form-handling/` — user input
5. `frontend/universal/routing/` — navigation
6. `frontend/universal/testing/` — quality

### Building a SSR/SSG App
1. `frontend/{stack}/architecture/` — framework setup
2. `frontend/universal/seo/` — meta, structured data
3. `frontend/universal/performance/` — Core Web Vitals
4. `frontend/universal/image-optimization/` — images
5. `frontend/universal/data-fetching/` — server/client fetch

### Building a Design System
1. `frontend/universal/design-system/` — tokens, components
2. `frontend/universal/storybook/` — documentation
3. `frontend/universal/accessibility/` — WCAG compliance
4. `frontend/universal/theming/` — dark mode
5. `frontend/universal/testing/` — component tests

## Skills List

### Per-Stack Skills
- `skills/frontend/react/architecture/SKILL.md`
- `skills/frontend/react/nextjs/SKILL.md`
- `skills/frontend/vue/architecture/SKILL.md`
- `skills/frontend/vue/nuxt/SKILL.md`
- `skills/frontend/vue/patterns/SKILL.md`
- `skills/frontend/angular/architecture/SKILL.md`
- `skills/frontend/angular/patterns/SKILL.md`
- `skills/frontend/svelte/architecture/SKILL.md`
- `skills/frontend/svelte/patterns/SKILL.md`
- `skills/frontend/svelte/sveltekit/SKILL.md`
- `skills/frontend/remix/architecture/SKILL.md`
- `skills/frontend/remix/patterns/SKILL.md`
- `skills/frontend/astro/architecture/SKILL.md`
- `skills/frontend/astro/patterns/SKILL.md`
- `skills/frontend/solidjs/architecture/SKILL.md`
- `skills/frontend/solidjs/patterns/SKILL.md`
- `skills/frontend/qwik/architecture/SKILL.md`
- `skills/frontend/qwik/patterns/SKILL.md`
- `skills/frontend/lit/SKILL.md`

### Universal Skills
- `skills/frontend/universal/accessibility/SKILL.md`
- `skills/frontend/universal/animation/SKILL.md`
- `skills/frontend/universal/bundler-tools/SKILL.md`
- `skills/frontend/universal/data-fetching/SKILL.md`
- `skills/frontend/universal/design-system/SKILL.md`
- `skills/frontend/universal/form-handling/SKILL.md`
- `skills/frontend/universal/image-optimization/SKILL.md`
- `skills/frontend/universal/microfrontend/SKILL.md`
- `skills/frontend/universal/patterns/SKILL.md`
- `skills/frontend/universal/performance/SKILL.md`
- `skills/frontend/universal/pwa/SKILL.md`
- `skills/frontend/universal/seo/SKILL.md`
- `skills/frontend/universal/state-management/SKILL.md`
- `skills/frontend/universal/storybook/SKILL.md`
- `skills/frontend/universal/tailwind-css/SKILL.md`
- `skills/frontend/universal/testing/SKILL.md`
- `skills/frontend/universal/theming/SKILL.md`
