# Accessibility Specialist

**Who this is for:** You make products usable for everyone and meet WCAG.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Level 1 — Essentials (2 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`design-accessibility`](../../skills/design/accessibility/SKILL.md) | `design/accessibility` | Ensure digital products meet WCAG compliance with semantic HTML, correct ARIA, keyboard support, and inclusive patterns. |
| [`frontend-accessibility`](../../skills/frontend/universal/accessibility/SKILL.md) | `frontend/universal/accessibility` | Meet WCAG 2.2 AA standards. |

## Level 2 — Professional (4 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`frontend-responsive-design`](../../skills/frontend/universal/responsive-design/SKILL.md) | `frontend/universal/responsive-design` | Build mobile-first responsive UIs with container queries, consistent breakpoints, fluid typography, and no horizontal overflow. |
| [`frontend-internationalization`](../../skills/frontend/universal/internationalization/SKILL.md) | `frontend/universal/internationalization` | Deliver multi-locale frontends with proper locale detection, resource loading, ICU message formatting, pluralization, date/number formatting, and… |
| [`design-visual-design`](../../skills/design/visual-design/SKILL.md) | `design/visual-design` | Apply visual design principles — color theory, typography, layout grids, spacing systems, visual hierarchy, and aesthetic consistency — to create… |
| [`quality-visual-testing`](../../skills/quality/visual-testing/SKILL.md) | `quality/visual-testing` | Make a red visual diff almost always mean a real change. |

## Level 3 — Specialist (3 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`mobile-localization`](../../skills/mobile/mobile-localization/SKILL.md) | `mobile/mobile-localization` | Implement comprehensive mobile app localization covering string resources, pluralization, RTL layout, locale-aware formatting, and automated… |
| [`design-motion-design`](../../skills/design/motion-design/SKILL.md) | `design/motion-design` | Design motion systems for digital products: animation principles, micro-interactions, transitions, Lottie animations, and motion guidelines that… |
| [`quality-acceptance-testing`](../../skills/quality/acceptance-testing/SKILL.md) | `quality/acceptance-testing` | Validate that the system meets business requirements, user needs, and acceptance criteria through structured UAT, alpha/beta programs, business… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 only (2 skills):**

```bash
npx skills add j4flmao/agent-skills --skill design-accessibility --skill frontend-accessibility
```

**Level 1 + 2 (6 skills):**

```bash
npx skills add j4flmao/agent-skills --skill design-accessibility --skill frontend-accessibility --skill frontend-responsive-design --skill frontend-internationalization --skill design-visual-design --skill quality-visual-testing
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`design-ux`](../bundles.md#design-ux) | 14 | Design and UX: visual design, design systems, accessibility, motion, IA, brand, UX research, theming, visual testing |

## Combine with

- [Designer & Design Engineer](design-ux.md)
- [Frontend Engineer](frontend.md)

## Watch out

Automated checkers find only part of the issues; keep manual keyboard and screen-reader testing in the plan.
