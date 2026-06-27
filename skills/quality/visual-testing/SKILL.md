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

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output -- why use many token when few do trick.

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
Percy: integrates with Playwright, Cypress, Storybook; cross-browser; free tier (5k snapshots/mo). Chromatic: built for Storybook; auto-captures stories; integrates with Git (PR checks); free for public projects. Applitools: AI-powered diffing; ultra-fast grid; advanced layout matching -- best for complex apps but costs more. Recommendation: Percy for E2E visual testing, Chromatic for Storybook-based visual testing.

For team size guidance: 1-5 devs use free tiers (Percy 5K or Chromatic 5K). 5-20 devs use Percy Team (~$400/mo) for unlimited snapshots and parallel CI. 20+ devs with Storybook-heavy workflow use Chromatic (~$1000/mo). Enterprise with complex apps use Applitools (custom pricing) for AI matching across unlimited resolutions. Open-source or no-budget projects use Playwright built-in screenshot comparison with pixelmatch.

Decision tree:
- Using Storybook extensively? -> Chromatic (auto-discovers stories, native integration)
- Using Playwright/Cypress for E2E? -> Percy (SDK integration, cross-browser)
- Need AI-powered layout matching across many browsers? -> Applitools
- No budget for SaaS? -> Playwright built-in `toHaveScreenshot` with pixelmatch
- Need animation GIF diffing? -> Happo

### Step 2: Setup
Percy + Playwright: `npm install @percy/cli @percy/playwright`, wrap snapshot calls with `await percySnapshot(page, 'Homepage')`. Chromatic: `npx chromatic --project-token=<token>` -- auto-discovers stories.

Playwright built-in: `await expect(page).toHaveScreenshot('name.png')` with configurable `maxDiffPixelRatio` and `threshold`. Store baselines in `__screenshots__` directory alongside tests.

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}{ext}",
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      threshold: 0.2,
      animations: "disabled",
    },
  },
});
```

### Step 3: Diff Threshold Configuration
Per component type: icons and illustrations (0% tolerance), buttons and inputs (0.1%), cards and surfaces (0.2%), images and media (0.5%), full pages (0.3%). Threshold = max diff area as fraction of total pixels. Configure per snapshot: override global threshold when component has intentional dynamic content.

Percy diff levels: "strict" (0% diff), "major" (1% diff), "minor" (5% diff). Use strict for icons and critical UI elements, major for components with some variability, minor for full-page screenshots with dynamic regions. Chromatic uses `diffThreshold` from 0-1 where 0 is strictest.

Always set per-component thresholds rather than global. Icons and typography should be near-zero tolerance. Media-rich components (images, maps, charts) need higher tolerance for compression artifacts and rendering variation.

### Step 4: Baseline Management
Initial baseline capture: run visual tests on main branch, approve all snapshots. New baselines created on every main branch build. PR branches diff against main baseline. Approve/reject diffs via Percy/Chromatic UI. Merging main updates the baseline.

Baseline workflow:
1. Developer pushes feature branch
2. CI runs visual tests, compares against main baseline
3. Percy/Chromatic categorizes diffs: Unchanged (auto-pass), Changed (review needed), Added (new baseline candidate), Removed (verify intentional)
4. Reviewer inspects each diff in cloud dashboard, approves or rejects
5. All diffs approved, PR merges to main
6. Post-merge CI run captures new baseline on main

Baseline retention: every main branch build creates a new baseline. Retain last 30 days of baselines. Archive quarterly full-suite snapshots for trend analysis. Purge baselines for deleted components.

For dynamic content: use clip regions to snapshot only static areas, DOM transformation to remove dynamic elements before snapshot, data attribute freeze for loading/error/empty states, and CSS freeze to pause animations before capture.

### Step 5: Cross-Browser Testing
Configure in Percy dashboard or Playwright projects. Capture snapshots in Chrome (latest), Firefox (latest), Safari (latest). Treat cross-browser diffs as review items -- font rendering varies by OS, accept minor differences.

Cross-browser baseline strategy: Chrome as primary baseline. Firefox shares same baseline with sub-pixel rendering diffs auto-soft-accepted. Safari shares same baseline with font rendering diffs reviewed manually. If using Applitools Ultrafast Grid, configure all target browsers in the Configuration object for parallel cross-browser rendering.

### Step 6: CI Integration
```yaml
- name: Visual tests
  run: npx percy exec -- npx playwright test --grep @visual
  env:
    PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
```
Block PR merge on visual diffs unless reviewed and approved. For parallel builds in Percy, use `--parallel-nonce` and `--parallel-total-to` flags. For Chromatic, set `--only-changed` to skip unchanged stories and `--auto-accept-changes` for main branch auto-approval. For Playwright built-in, upload diff artifacts on failure for inspection.

## Rules
- Baseline on main -- never approve diffs on feature branches
- Threshold per component type, not global
- Cross-browser diffs are reviewed, not automatically accepted
- Visual tests run alongside functional tests, not instead of
- Dynamic content regions (dates, user names) use DOM snapshot or clip
- Always review diffs before merging -- auto-approve only for fixed baselines
- Percy parallel build flag for CI: `--parallel-nonce` + `--parallel-total-to`
- Disable animations before snapshot -- CSS transitions and JS animations cause false positives
- Mask or remove third-party embeds (maps, social widgets, ads) from snapshots
- Test at every breakpoint: 375, 768, 1280, 1920px minimum
- Use consistent viewport dimensions across all test runs
- Freeze system fonts or use consistent font loading to avoid OS-level rendering diffs
- Never snapshot mid-animation or mid-transition -- wait for stable state
- Set explicit `data-visual-test="skip"` attribute on elements to exclude from diff
- Group related snapshots into semantic test descriptions for easier review
- Flaky diffs (random 1-2 pixel shifts) are infrastructure issues, not visual bugs

## Component Architecture / Decision Trees

### Visual Testing Tool Decision Tree

```
Is the project Storybook-based?
  YES -> Does the team need cross-browser?
           YES -> Chromatic (built-in cross-browser)
           NO -> Chromatic (auto-discovers stories)
  NO -> Is the team using Playwright for E2E?
          YES -> Percy (native Playwright SDK)
          NO -> Is the team using Cypress for E2E?
                  YES -> Percy (native Cypress SDK)
                  NO -> Evaluate: BackstopJS (generic), Playwright built-in (free)
Does the project have budget for paid tools?
  YES -> Evaluate Applitooks (AI matching, unlimited browsers)
  NO -> Playwright toHaveScreenshot or BackstopJS
Does the project need animation diffing?
  YES -> Happo (GIF-based diff)
  NO -> Standard tools suffice
```

### Baseline Management Decision Tree

```
Is this a main branch build?
  YES -> Auto-approve all snapshots -> Update baseline
  NO (feature branch) -> Is this the first run?
          YES -> No baseline yet, skip diff -> Manual baseline capture needed
          NO -> Diff against main baseline
                  Diff found? -> Is diff expected?
                    YES -> Approve in dashboard
                    NO -> Reject, investigate UI change
                  No diff -> Auto-pass
```

### Diff Threshold Decision Tree

```
What component type is being tested?
  Icon / Illustration -> threshold: 0 (pixel-perfect required)
  Button / Input / Form control -> threshold: 0.001 (minor sub-pixel variation)
  Card / Surface / Container -> threshold: 0.002 (shadow rendering variation)
  Image / Media / Video player -> threshold: 0.005 (compression artifacts)
  Chart / Data visualization -> threshold: 0.003 (rendering engine variation)
  Full page / Layout -> threshold: 0.003 (aggregate of all elements)
  Third-party embed -> threshold: 0.01 (external content variation) or mask entirely
Does the component contain dynamic content?
  YES -> Use clip region, DOM transform, or mask
  NO -> Use standard threshold
```

## Common Pitfalls

### Pitfall 1: Global Threshold Configuration
Using a single diff threshold for all component types causes false positives on strict components (icons) and missed regressions on loose components (images). Configure thresholds per component type or per snapshot.

### Pitfall 2: Snapshotting Before Page Stabilizes
Capturing screenshots before all resources load, fonts render, or animations complete produces inconsistent baselines. Always wait for network idle, visible content, and animation completion before snapshotting.

### Pitfall 3: Ignoring Cross-Browser Baseline Strategy
Treating all browsers equally without a baseline hierarchy leads to unnecessary review burden. Designate Chrome as primary baseline, auto-soft-accept Firefox sub-pixel diffs, and manually review Safari font rendering diffs.

### Pitfall 4: No Dynamic Content Handling
Date stamps, user avatar images, random IDs, and real-time data cause every snapshot to differ. Use clip regions, DOM transformation callbacks, or data attribute toggling to stabilize dynamic regions before capture.

### Pitfall 5: Approving Diffs on Feature Branches
Approving baseline changes on a feature branch pollutes the baseline with unmerged changes. Always approve diffs post-merge on main to ensure baseline integrity.

### Pitfall 6: Using Visual Tests as the Only Testing Layer
Visual testing verifies pixel output but does not validate behavior, accessibility, or performance. Run visual tests alongside functional assertions, accessibility audits, and performance budgets.

### Pitfall 7: No Flake Detection for Pixel Shifts
Random 1-2 pixel diffs caused by anti-aliasing or sub-pixel rendering create flaky visual tests. Set minimum diff thresholds to absorb rendering noise, and re-run flaky tests before manual investigation.

### Pitfall 8: Overlooking CI Resource Constraints
Running visual tests for every browser and viewport combination in CI can exhaust parallel build slots. Use selective browser testing, parallelization flags, and snapshot filtering to optimize CI resource usage.

### Pitfall 9: Not Testing at Responsive Breakpoints
Testing only at desktop resolutions misses layout regressions at mobile and tablet breakpoints. Capture snapshots at 375, 768, 1280, and 1920 pixel widths minimum.

### Pitfall 10: Forgetting to Update Baselines After Intentional Changes
When UI changes are intentionally made, developers must update baselines via the tool's UI or CLI. Failing to do so causes every PR to show diffs for the same change, leading to review fatigue.

## Best Practices

| Practice | Why | Implementation |
|----------|-----|----------------|
| Fixed viewport | Prevents flaky diffs from window size variation | Set viewport in playwright config, never rely on default |
| Disable animations | CSS transitions and JS animations cause false positive diffs | `page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }' })` |
| Wait for data | Snapshot before data loads is useless | `waitForSelector`, `waitForResponse`, `waitForLoadState('networkidle')` |
| Consistent fonts | Font loading differences cause OS-level diff variation | Preload web fonts, use `font-display: block`, or use system font stack |
| Mask dynamic content | Dates, avatars, random data cause every-snapshot diffs | Percy `percyCSS` with `visibility: hidden`, Playwright `mask` option |
| Ignore anti-aliasing | OS-level font rendering produces sub-pixel diffs | Set appropriate threshold values (0.1-0.2%) instead of 0 |
| Test at breakpoints | Responsive design needs multiple screenshots for layout coverage | Test at 375, 768, 1280, 1920 minimum |
| Group by semantic name | Meaningful snapshot names speed up review | Use descriptive names like "Dashboard-metrics-loaded" not "snapshot-1" |
| Run on PR only | Running visual tests on every push wastes CI budget | Run on `pull_request` event, not `push` |
| Cache dependencies | Speeds up CI visual test runs | Cache node_modules, Playwright browsers, Storybook build output |
| Preview deployments | Visual tests against live preview environments for accuracy | Deploy preview on Vercel/Netlify, run visual tests against preview URL |
| Review diffs in context | Cloud dashboards with side-by-side view reduce decision time | Use Percy/Chromatic UI review workflows, not raw diff images |

## Compared With

| Approach | Strengths | Weaknesses | Best For |
|----------|-----------|------------|----------|
| Percy (cloud SaaS) | Native Playwright/Cypress SDK, cross-browser, PR integration, parallel CI | Paid beyond free tier, external service dependency | Teams wanting managed review workflow |
| Chromatic (cloud SaaS) | Storybook-native, auto-discovers stories, Git integration | Storybook-only, no generic E2E visual testing | Storybook-heavy projects |
| Applitools (cloud SaaS) | AI-powered matching, Ultrafast Grid, layout matching modes | Expensive, complex setup | Enterprise cross-browser visual testing |
| Playwright built-in | Free, no external dependency, fast | Manual review, no cloud dashboard, local baseline storage | Teams already using Playwright, no budget |
| Cypress screenshot diff | Free, Cypress-native | Manual review, no cloud dashboard | Teams already using Cypress exclusively |
| BackstopJS (open source) | Free, configurable, Docker support | Manual review, HTML report only, no cloud | Open source projects, no budget |
| Loki (open source) | Docker-based, Storybook integration | Docker dependency, CLI only | Component library visual testing |
| Happo (cloud SaaS) | Animation GIF diff, cross-browser | Paid, smaller ecosystem | Animation-heavy applications |

For most projects: use Percy (Playwright/Cypress) or Chromatic (Storybook). For advanced needs: Applitools. For zero budget: Playwright built-in screenshots. For animation testing: Happo.

## Performance

### Snapshot Capture Performance

Visual testing adds significant time to CI pipelines. Average snapshot capture time: 200-500ms per snapshot depending on page complexity, network requests, and viewport size. A full-page snapshot with 1920px viewport takes longer than an element-level snapshot.

Optimization strategies:
- Run visual tests in parallel: Percy `--parallel-nonce` + `--parallel-total-to`, Chromatic parallel builds, Playwright sharding
- Filter snapshots by component type: run critical UI snapshots on every PR, full suite nightly
- Use `onlyChanged` in Chromatic to skip unchanged stories
- Group element-level snapshots within a single page load to reduce navigation overhead
- Cache Storybook build output and Playwright browser binaries between CI runs
- Set `networkIdleTimeout: 100` in Percy config to reduce discovery wait time
- Use Playwright `--project` filter to run only desktop snapshots on every PR, mobile snapshots nightly

### Storage and Baseline Size

Each snapshot generates: baseline image + current image + diff image. Average per-snapshot storage: 50-200KB for element snapshots, 200-800KB for full-page snapshots. A suite of 500 snapshots generates approximately 75-400MB per CI run.

Budget considerations:
- Percy free tier: 5,000 snapshots/month
- Chromatic free tier: 5,000 snapshots/month
- Applitools free tier: 1,000 checkpoints/month
- Playwright built-in: unlimited (local storage), but repository size grows with baseline images

### CI Pipeline Impact

Visual tests add 2-10 minutes to CI pipeline depending on snapshot count and parallelization level. Without parallelization, 500 snapshots take approximately 8-15 minutes. With parallelization (4 workers), reduce to 3-5 minutes.

Recommended CI optimization:
- Use separate workflow for visual tests to run in parallel with other checks
- Set `--grep @visual` to tag and filter visual test files
- Use Percy parallel build for projects with >100 snapshots
- Run full suite on `pull_request` (not on every `push`)
- Use build matrix for cross-browser snapshots in parallel jobs

### Threshold Impact on Pass Rate

Stringent thresholds (0%) catch all visual changes but increase false positives from anti-aliasing and sub-pixel rendering. Too-loose thresholds (>1%) miss real regressions. Recommended baseline: 0.1% for most components, 0% for critical pixel-perfect elements, 0.5% for media-rich components. Monitor false positive rate weekly and adjust thresholds accordingly.

## Tooling

### Cloud Visual Testing Services

- **Percy** (BrowserStack): `@percy/cli`, `@percy/playwright`, `@percy/cypress`, `@percy/storybook`. PR integration via GitHub/GitLab/Bitbucket apps. Parallel builds via CLI flags. Per-component diff thresholds via Percy config.
- **Chromatic** (Chroma): `chromatic` CLI, Storybook addon. Git-native review workflow. Auto-accept changes on main branch. TurboSnap for smart snapshot filtering. Zero-config setup for Storybook projects.
- **Applitools Eyes**: `@applitools/eyes-playwright`, `@applitools/eyes-cypress`, `@applitools/eyes-storybook`. Ultrafast Grid for parallel cross-browser rendering. AI-powered visual matching with layout, strict, and content match levels.
- **Happo**: `happo-plugin-playwright`, `happo-plugin-cypress`, `happo-plugin-storybook`. Cross-browser and cross-platform snapshots. Animated GIF diff for motion testing.

### Open Source Tools

- **Playwright**: Built-in `toHaveScreenshot` with `maxDiffPixelRatio` and `threshold` options. Baseline storage in repository. No external dependency. Use with `@playwright/test` for zero-cost visual testing.
- **Cypress**: `cy.screenshot()` with `cy.task` for diff comparison. No built-in visual testing -- requires community plugins or custom setup.
- **BackstopJS**: CLI tool with Docker support. HTML report with side-by-side diff view. Supports Playwright and Puppeteer engines. JSON configuration for scenarios and viewports.
- **Loki**: Docker-based Storybook visual testing. CLI commands for update, test, and approve. Pixelmatch-based comparison.
- **Pixelmatch**: Low-level pixel comparison library. Used internally by many visual testing tools. Accepts raw PNG buffers, returns mismatched pixel count and diff image.

### Related Testing Tools

- **Storybook**: Component development environment. Chromatic integration for automatic snapshot capture. Visual testing addon for in-Storybook diff review.
- **Argos CI**: Open-source visual testing with GitHub integration. Git-lfs for baseline image storage. Self-hostable.
- **Lost Pixel**: Open-source visual regression testing. Storybook and page-based testing. GitHub Action integration. Visual diff report with zoom and highlight.

## Visual Testing Examples

### Playwright — Element-Level Snapshot
```typescript
import { test, expect } from "@playwright/test";

test("product card component renders correctly", async ({ page }) => {
  await page.goto("/products/42");
  const productCard = page.getByTestId("product-card");
  await expect(productCard).toBeVisible();
  await expect(productCard).toHaveScreenshot("product-card.png", {
    maxDiffPixels: 50,
    animations: "disabled",
  });
});
```

### Playwright — Full Page Snapshot with Masking
```typescript
test("dashboard page matches baseline", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot("dashboard.png", {
    fullPage: true,
    mask: [
      page.getByTestId("user-avatar"),
      page.getByTestId("live-timestamp"),
      page.getByTestId("third-party-widget"),
    ],
  });
});
```

### Percy + Playwright Integration
```typescript
import percySnapshot from "@percy/playwright";

test("checkout page visual regression", async ({ page }) => {
  await page.goto("/checkout");
  await page.waitForLoadState("networkidle");
  await percySnapshot(page, "Checkout Page", {
    widths: [375, 768, 1280],
    minHeight: 2000,
  });
});
```

### Visual Testing with Dynamic Content Handling
```typescript
test("user profile page with stable snapshot", async ({ page }) => {
  await page.goto("/profile");
  // Freeze dynamic content before snapshot
  await page.evaluate(() => {
    document.querySelectorAll("[data-dynamic]").forEach((el) => {
      el.textContent = "FROZEN_VALUE";
    });
  });
  // Disable animations
  await page.addStyleTag({
    content: "*, *::before, *::after { animation: none !important; transition: none !important; }",
  });
  await expect(page).toHaveScreenshot("profile.png");
});
```

## CI Integration for Visual Tests

```yaml
name: Visual Tests
on: pull_request
jobs:
  visual:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps chromium
      - name: Percy Visual Tests
        run: npx percy exec -- npx playwright test --grep @visual
        env:
          PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
          PERCY_BRANCH: ${{ github.head_ref }}
          PERCY_TARGET_BRANCH: ${{ github.base_ref }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: visual-diffs
          path: __screenshots__/
  chromatic:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - run: npm ci
      - name: Chromatic Storybook Visual Tests
        uses: chromaui/action@v1
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          onlyChanged: true
          autoAcceptChanges: false
```

## Visual Testing Maturity Model

| Level | Characteristics | Practices |
|---|---|---|
| 1: Initial | No visual testing | Manual visual inspection only, no automation, UI bugs found by users |
| 2: Defined | Basic visual snapshots | Playwright built-in snapshots for critical pages, manual baseline update, local storage |
| 3: Managed | Cloud-based visual testing | Percy/Chromatic with cloud review workflow, per-component thresholds, cross-browser testing, CI integration |
| 4: Measured | Comprehensive visual coverage | Responsive breakpoints tested, dynamic content handling (masks, clips), flaky diff management, quarterly baseline audit |
| 5: Optimized | AI-powered visual QA | Applitools AI matching for layout tolerance, automatic baseline updates on intentional changes, predictive diff analysis, self-healing selectors for visual targets |

## Visual Testing Anti-Patterns (Additional)

### Anti-Pattern: No Dynamic Content Strategy
Every visual test will fail if it captures date stamps, user avatars, random IDs, or real-time data. You must have a strategy: clip regions, DOM transformation callbacks (`percyCSS`, `page.evaluate`), or data attribute toggling to stabilize dynamic regions.

### Anti-Pattern: Approving Diffs on Feature Branches
Baseline changes approved on feature branches create baselines contaminated with unmerged changes. When the feature branch is finally merged, the baseline already includes the new look, and the real diff is lost. Always approve baseline changes from main branch builds.

### Anti-Pattern: Screenshots Before Page is Ready
Capturing screenshots before fonts load, images render, or animations complete creates inconsistent baselines. Always wait for `networkidle`, use `waitForSelector` for critical elements, and disable animations before capturing.

### Anti-Pattern: Ignoring Anti-Aliasing Diffs
Different operating systems (macOS vs Linux) and browsers render fonts with different anti-aliasing, creating 1-3 pixel diffs that are not real regressions. Set appropriate thresholds (0.1-0.2%) instead of 0, and use consistent CI environments for baseline and test runs.

## Visual Testing Baseline Maintenance

```yaml
baseline_workflow:
  capture: "On every main branch build, all snapshots are captured and auto-approved"
  review: "On PR builds, diffs are displayed in cloud dashboard for human review"
  approve: "Reviewer marks each diff as approved or rejected"
  update: "After merge to main, new baseline is automatically created"
  retention:
    active: "Last 30 days of baselines retained for comparison"
    archive: "Quarterly full-suite archive for trend analysis"
    cleanup: "Purge baselines for deleted components or retired views"
  threshold_strategy:
    icons: "0% tolerance — pixel-perfect required"
    buttons_inputs: "0.1% tolerance — sub-pixel variation OK"
    cards_surfaces: "0.2% tolerance — shadow rendering OK"
    images_media: "0.5% tolerance — compression artifacts OK"
    full_pages: "0.3% tolerance — aggregate acceptable"
```

## References
  - references/baseline-management.md -- Baseline Management
  - references/screenshot-comparison.md -- Screenshot Comparison
  - references/visual-regression-tools.md -- Visual Regression Tools
  - references/visual-test-setup.md -- Visual Test Setup
  - references/visual-testing-advanced.md -- Visual Testing Advanced Topics
  - references/visual-testing-fundamentals.md -- Visual Testing Fundamentals
  - references/visual-testing-tools-comparison.md -- Visual Testing Tools Comparison
  - references/visual-testing-ci-integration.md -- Visual Testing CI Integration

## Handoff
`quality-e2e-testing` for combined E2E + visual test suite.
`design-design-systems` for component baseline snapshots.
Carry forward: visual test config, baseline snapshots, review workflow.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.