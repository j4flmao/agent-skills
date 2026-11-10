# Performance Engineer

**Who this is for:** You make web, backend and mobile software fast.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Level 1 — Essentials (4 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`dev-loop-performance-profiler`](../../skills/dev-loop/performance-profiler/SKILL.md) | `dev-loop/performance-profiler` | Identify, analyze, and resolve performance bottlenecks in applications — CPU profiling, memory profiling, I/O analysis, database query… |
| [`frontend-performance`](../../skills/frontend/universal/performance/SKILL.md) | `frontend/universal/performance` | Optimize Core Web Vitals (LCP, CLS, INP) and bundle size. |
| [`backend-caching`](../../skills/backend/universal/caching/SKILL.md) | `backend/universal/caching` | Design consistent, production-grade caching layers. |
| [`quality-load-testing`](../../skills/quality/load-testing/SKILL.md) | `quality/load-testing` | Design and execute load tests with realistic scenarios, meaningful metrics, and reliable CI-integrated execution. |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`web-performance`](../../skills/web/performance/SKILL.md) | `web/performance` | Core Web Vitals are Google's user-centric metrics, evaluated at the 75th percentile of real-user (field) page loads: LCP (loading), INP… |
| [`frontend-image-optimization`](../../skills/frontend/universal/image-optimization/SKILL.md) | `frontend/universal/image-optimization` | Deliver optimized images that load fast, look crisp on any screen, and minimize bandwidth usage — directly impacting LCP, CLS, and overall page… |
| [`frontend-rendering-strategies`](../../skills/frontend/universal/rendering-strategies/SKILL.md) | `frontend/universal/rendering-strategies` | Select and implement the correct rendering strategy for each route: CSR for highly interactive dashboards, SSR for personalized content, SSG for… |
| [`mobile-performance`](../../skills/mobile/universal/performance/SKILL.md) | `mobile/universal/performance` | Diagnose and optimize mobile app performance across rendering, memory, startup time, battery drain, and bundle size using platform profiling tools. |
| [`backend-load-testing`](../../skills/backend/universal/load-testing/SKILL.md) | `backend/universal/load-testing` | Design consistent, production-grade load testing plans. |

## Level 3 — Specialist (3 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`system-design-rate-limiting`](../../skills/system-design/rate-limiting/SKILL.md) | `system-design/rate-limiting` | Rate limiting protects services from overload and abuse and enforces fair use between clients. |
| [`cpu-architecture`](../../skills/low-level/cpu-architecture/SKILL.md) | `low-level/cpu-architecture` | Code that looks sequential runs on superscalar, out-of-order, speculative cores behind a deep cache hierarchy. |
| [`ml-inference-optimization`](../../skills/ml/inference-optimization/SKILL.md) | `ml/inference-optimization` | Serve LLMs at the required latency for the lowest cost. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 only (4 skills):**

```bash
npx skills add j4flmao/agent-skills --skill dev-loop-performance-profiler --skill frontend-performance --skill backend-caching --skill quality-load-testing
```

**Level 1 + 2 (9 skills):**

```bash
npx skills add j4flmao/agent-skills --skill dev-loop-performance-profiler --skill frontend-performance --skill backend-caching --skill quality-load-testing --skill web-performance --skill frontend-image-optimization --skill frontend-rendering-strategies --skill mobile-performance --skill backend-load-testing
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`web-performance-seo`](../bundles.md#web-performance-seo) | 14 | Web performance and SEO: Core Web Vitals, rendering strategies, images, caching, structured data, programmatic SEO |

## Combine with

- [Site Reliability Engineer](sre.md)
- [Frontend Engineer](frontend.md)

## Watch out

`quality/load-testing` and `backend/universal/load-testing` overlap; keep `quality/load-testing`.
