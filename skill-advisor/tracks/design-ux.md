# Designer & Design Engineer

**Who this is for:** You design interfaces and build design systems.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Level 1 — Essentials (4 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`design-visual-design`](../../skills/design/visual-design/SKILL.md) | `design/visual-design` | Apply visual design principles — color theory, typography, layout grids, spacing systems, visual hierarchy, and aesthetic consistency — to create… |
| [`design-accessibility`](../../skills/design/accessibility/SKILL.md) | `design/accessibility` | Ensure digital products meet WCAG compliance with semantic HTML, correct ARIA, keyboard support, and inclusive patterns. |
| [`design-systems`](../../skills/design/design-systems/SKILL.md) | `design/design-systems` | A design system is a product: tokens, components, patterns, documentation and the process that keeps design files and code in sync. |
| [`frontend-design-system`](../../skills/frontend/universal/design-system/SKILL.md) | `frontend/universal/design-system` | Build a three-tier design token system with CVA-based component variants and theme-aware architecture. |

## Level 2 — Professional (7 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`design-ux-research`](../../skills/design/ux-research/SKILL.md) | `design/ux-research` | Design and execute UX research with method selection, structured protocols, and systematic synthesis. |
| [`design-information-architecture`](../../skills/design/information-architecture/SKILL.md) | `design/information-architecture` | Design information architecture: organize content, create navigation systems, define taxonomies, design user flows, and ensure findability across… |
| [`design-motion-design`](../../skills/design/motion-design/SKILL.md) | `design/motion-design` | Design motion systems for digital products: animation principles, micro-interactions, transitions, Lottie animations, and motion guidelines that… |
| [`design-brand-identity`](../../skills/design/brand-identity/SKILL.md) | `design/brand-identity` | Define and maintain a cohesive brand identity — visual language, voice, personality, and guidelines — that communicates a product's or company's… |
| [`frontend-theming`](../../skills/frontend/universal/theming/SKILL.md) | `frontend/universal/theming` | Deliver a robust, flicker-free theming system that supports light and dark modes — using CSS custom properties for design tokens, with OS… |
| [`frontend-animation`](../../skills/frontend/universal/animation/SKILL.md) | `frontend/universal/animation` | Deliver performant, accessible, and cohesive motion design across the frontend -- from micro-interactions to full page transitions -- while… |
| [`frontend-accessibility`](../../skills/frontend/universal/accessibility/SKILL.md) | `frontend/universal/accessibility` | Meet WCAG 2.2 AA standards. |

## Level 3 — Specialist (4 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`quality-visual-testing`](../../skills/quality/visual-testing/SKILL.md) | `quality/visual-testing` | Make a red visual diff almost always mean a real change. |
| [`product-user-research`](../../skills/product/user-research/SKILL.md) | `product/user-research` | Designs and executes user research studies including interviews, usability testing, insight synthesis, and persona development. |
| [`product-persona-development`](../../skills/product/persona-development/SKILL.md) | `product/persona-development` | Creates data-driven user personas with empathy maps and connects them to feature decisions, enabling user-centered product design and prioritization. |
| [`frontend-storybook`](../../skills/frontend/universal/storybook/SKILL.md) | `frontend/universal/storybook` | Create, maintain, and optimize Storybook stories using CSF 3.x format with interaction tests, accessibility checks, and addon-driven workflows. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 only (4 skills):**

```bash
npx skills add j4flmao/agent-skills --skill design-visual-design --skill design-accessibility --skill design-systems --skill frontend-design-system
```

**Level 1 + 2 (11 skills):**

```bash
npx skills add j4flmao/agent-skills --skill design-visual-design --skill design-accessibility --skill design-systems --skill frontend-design-system --skill design-ux-research --skill design-information-architecture --skill design-motion-design --skill design-brand-identity --skill frontend-theming --skill frontend-animation --skill frontend-accessibility
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`design-ux`](../bundles.md#design-ux) | 14 | Design and UX: visual design, design systems, accessibility, motion, IA, brand, UX research, theming, visual testing |

## Combine with

- [Frontend Engineer](frontend.md)
- [Product Manager & Planner](product.md)

## Watch out

Use `design/visual-design` section "Avoiding the Generic AI Look" whenever an agent builds UI.
