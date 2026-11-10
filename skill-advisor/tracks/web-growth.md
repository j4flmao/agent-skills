# SEO & Web Growth Engineer

**Who this is for:** You grow organic traffic and conversion with fast, well-structured pages.

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
| [`seo-fundamentals`](../../skills/seo/SKILL.md) | `seo` | Search visibility depends on three gates in order: the page must be crawlable, then indexable (and chosen as canonical), then rankable (relevant,… |
| [`frontend-seo`](../../skills/frontend/universal/seo/SKILL.md) | `frontend/universal/seo` | Optimize web applications for search engine ranking and rich snippet eligibility through meta tags, structured data, sitemaps, and SSR-friendly… |
| [`web-performance`](../../skills/web/performance/SKILL.md) | `web/performance` | Core Web Vitals are Google's user-centric metrics, evaluated at the 75th percentile of real-user (field) page loads: LCP (loading), INP… |
| [`seo-structured-data`](../../skills/seo/structured-data/SKILL.md) | `seo/structured-data` | Structured data describes page content with the schema.org vocabulary so search engines can understand entities and show rich results (product… |

## Level 2 — Professional (6 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`programmatic-seo`](../../skills/seo/programmatic-seo/SKILL.md) | `seo/programmatic-seo` | Programmatic SEO builds many pages from a structured dataset and a template, each targeting a long-tail query pattern ({tool} alternatives,… |
| [`seo-ai-content-optimization`](../../skills/seo/ai-content-optimization/SKILL.md) | `seo/ai-content-optimization` | Google's stated position is that it rewards helpful, reliable, people-first content regardless of how it is produced, and penalises content… |
| [`product-growth-engineering`](../../skills/product/growth-engineering/SKILL.md) | `product/growth-engineering` | Designs and executes growth engineering initiatives including growth loops, activation optimization, viral mechanics, and experimentation pipelines. |
| [`product-analytics`](../../skills/product/analytics/SKILL.md) | `product/analytics` | Turn user behaviour into decisions: pick a small set of metrics tied to value, instrument a consistent event taxonomy that answers them, and… |
| [`product-ab-testing`](../../skills/product/ab-testing/SKILL.md) | `product/ab-testing` | Designs and analyzes A/B tests with rigorous hypothesis formation, experiment design, statistical frameworks, and decision criteria. |
| [`frontend-rendering-strategies`](../../skills/frontend/universal/rendering-strategies/SKILL.md) | `frontend/universal/rendering-strategies` | Select and implement the correct rendering strategy for each route: CSR for highly interactive dashboards, SSR for personalized content, SSG for… |

## Level 3 — Specialist (3 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`frontend-image-optimization`](../../skills/frontend/universal/image-optimization/SKILL.md) | `frontend/universal/image-optimization` | Deliver optimized images that load fast, look crisp on any screen, and minimize bandwidth usage — directly impacting LCP, CLS, and overall page… |
| [`frontend-internationalization`](../../skills/frontend/universal/internationalization/SKILL.md) | `frontend/universal/internationalization` | Deliver multi-locale frontends with proper locale detection, resource loading, ICU message formatting, pluralization, date/number formatting, and… |
| [`product-onboarding-flow`](../../skills/product/onboarding-flow/SKILL.md) | `product/onboarding-flow` | Designs and optimizes user onboarding flows including activation milestones, funnel mapping, progressive disclosure, and experimentation. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (5 skills):**

```bash
npx skills add j4flmao/agent-skills --skill seo-fundamentals --skill frontend-seo --skill web-performance --skill seo-structured-data --skill frontend-security
```

**Level 1 + 2 + security baseline (11 skills):**

```bash
npx skills add j4flmao/agent-skills --skill seo-fundamentals --skill frontend-seo --skill web-performance --skill seo-structured-data --skill programmatic-seo --skill seo-ai-content-optimization --skill product-growth-engineering --skill product-analytics --skill product-ab-testing --skill frontend-rendering-strategies --skill frontend-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`web-performance-seo`](../bundles.md#web-performance-seo) | 14 | Web performance and SEO: Core Web Vitals, rendering strategies, images, caching, structured data, programmatic SEO |
| [`product-growth`](../bundles.md#product-growth) | 18 | Product management and growth: discovery, analytics, A/B tests, pricing, GTM, onboarding, roadmaps, PRDs, OKRs |

## Combine with

- [Product Manager & Planner](product.md)
- [Svelte, Solid, Astro & Qwik Developer](modern-frontend.md)

## Watch out

INP replaced FID as a Core Web Vital in 2024; ignore advice that still targets FID.
