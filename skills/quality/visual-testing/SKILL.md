---
name: quality-visual-testing
description: >
  Use this skill when setting up visual testing, visual regression, screenshot diff, Percy, Chromatic, Applitools, or snapshot testing. This skill enforces: tool setup (Percy or Chromatic), baseline management, diff threshold configuration, cross-browser visual testing, and CI integration. Do NOT use for: E2E functional assertions, performance benchmarking, or accessibility audits.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [quality, testing, phase-10]
---

# Quality Visual Testing

## Purpose
Implement visual regression testing with baseline management, diff configuration, and CI integration for pixel-perfect UI verification.

## Agent Protocol

### Trigger
Exact user phrases: "visual testing", "visual regression", "screenshot diff", "Percy", "Chromatic", "Applitools", "snapshot testing", "pixel diff", "visual regression test", "UI diff".

### Input Context
Before activating, verify:
- Existing test framework (Playwright, Cypress, Storybook)
- Deployment frequency and team size
- CI platform (GitHub Actions, GitLab CI, etc.)
- Design system maturity (ad-hoc, partial, comprehensive)

### Output Artifact
Visual testing setup with tool configuration, baseline management, and CI workflow.

### Response Format
```yaml
# Tool selection and rationale
# Diff threshold configuration
```
```typescript
// CI pipeline configuration
// Baseline management workflow
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Tool selected (Percy or Chromatic) with rationale
- [ ] Initial baseline snapshots captured for all story/component states
- [ ] Diff thresholds configured per component type
- [ ] Cross-browser visual testing configured (Chrome, Firefox, Safari)
- [ ] CI pipeline with visual review workflow
- [ ] Baseline update process documented
- [ ] Review and approve workflow established

### Max Response Length
150 lines of configuration and workflow.

## Workflow

### Step 1: Tool Selection
Percy: integrates with Playwright, Cypress, Storybook; cross-browser; free tier (5k snapshots/mo). Chromatic: built for Storybook; auto-captures stories; integrates with Git (PR checks); free for public projects. Applitools: AI-powered diffing; ultra-fast grid; advanced layout matching — best for complex apps but costs more. Recommendation: Percy for E2E visual testing, Chromatic for Storybook-based visual testing.

### Step 2: Setup
Percy + Playwright: `npm install @percy/cli @percy/playwright`, wrap snapshot calls with `await percySnapshot(page, 'Homepage')`. Chromatic: `npx chromatic --project-token=<token>` — auto-discovers stories.

### Step 3: Diff Threshold Configuration
Per component type: icons and illustrations (0% tolerance), buttons and inputs (0.1%), cards and surfaces (0.2%), images and media (0.5%), full pages (0.3%). Threshold = max diff area as fraction of total pixels. Configure per snapshot: override global threshold when component has intentional dynamic content.

### Step 4: Baseline Management
Initial baseline capture: run visual tests on main branch → approve all snapshots. New baselines created on every main branch build. PR branches: diff against main baseline. Approve/reject diffs via Percy/Chromatic UI. Merging main updates the baseline.

### Step 5: Cross-Browser Testing
Configure in Percy dashboard or Playwright projects. Capture snapshots in: Chrome (latest), Firefox (latest), Safari (latest). Treat cross-browser diffs as review items — font rendering varies by OS, accept minor differences.

### Step 6: CI Integration
```yaml
- name: Visual tests
  run: npx percy exec -- npx playwright test --grep @visual
  env:
    PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
```
Block PR merge on visual diffs unless reviewed and approved.

## Rules
- Baseline on main — never approve diffs on feature branches
- Threshold per component type, not global
- Cross-browser diffs are reviewed, not automatically accepted
- Visual tests run alongside functional tests, not instead of
- Dynamic content regions (dates, user names) use DOM snapshot or clip
- Always review diffs before merging — auto-approve only for fixed baselines
- Percy parallel build flag for CI: `--parallel-nonce` + `--parallel-total-to`

## References
  - references/baseline-management.md — Baseline Management
  - references/screenshot-comparison.md — Screenshot Comparison
  - references/visual-regression-tools.md — Visual Regression Tools
  - references/visual-test-setup.md — Visual Test Setup
  - references/visual-testing-advanced.md — Visual Testing Advanced Topics
  - references/visual-testing-fundamentals.md — Visual Testing Fundamentals
## Handoff
`quality-e2e-testing` for combined E2E + visual test suite.
`design-design-systems` for component baseline snapshots.
Carry forward: visual test config, baseline snapshots, review workflow.
