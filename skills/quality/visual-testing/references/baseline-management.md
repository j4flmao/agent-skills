# Baseline Management

How baselines are stored, selected per branch, reviewed, approved, kept cheap in monorepos, and protected from flake. Determinism engineering (fonts, flags, Docker) is in `screenshot-comparison.md`; tool pricing is in `visual-regression-tools.md`.

A visual suite survives or dies on its baseline workflow. If most red diffs are noise, reviewers learn to click "accept all" and the suite becomes a ritual.

## Two Storage Models

| Model | How it works | Costs | Fits |
|-------|--------------|-------|------|
| **In-repo** (Playwright, Vitest, Paparazzi) | PNG/WebP committed next to code, ideally via Git LFS; generated in a pinned container; updated through a PR | Repo growth (LFS mitigates); GitHub shows no useful inline image diff, so reviewers pull the branch or open the HTML report; one pinned render environment required | Small and medium suites, no-vendor or regulated teams |
| **CI artifact** (Roborazzi pattern) | `main` records and uploads baselines as an artifact; PRs download it and verify | Baselines tied to artifact retention; no git history of images | Mobile JVM-rendered suites; teams avoiding image churn in git |
| **SaaS** (Chromatic, Argos, Percy, Happo) | Per-branch baselines chosen from git ancestry or the merge base; changed only by an accepted build | Per-snapshot billing; screenshots or DOM leave the network | Teams wanting a review UI and branch-aware baselines |

No source quantifies repo-size impact of Git LFS vs plain git for screenshots.

## In-Repo Baselines

### Layout and naming

- Playwright writes references to `<test-file>-snapshots/` by default, named `<test>-<n>-<project>-<platform>.png`.
- `snapshotPathTemplate` tokens: `{arg} {ext} {platform} {projectName} {snapshotDir} {testDir} {testFileDir} {testFileBaseName} {testFileName} {testFilePath} {testName}`. A one-character prefix such as `{/projectName}` is emitted only when the token is non-empty. Per-assertion override: `expect.toHaveScreenshot.pathTemplate`.
- Decision rule: if every capture (local and CI) runs in the container, drop `{platform}` and keep one baseline set. If developers capture natively, keep `{platform}` and treat only `-linux` files as authoritative.

### Git LFS

```gitattributes
# .gitattributes
**/__screenshots__/**/*.png filter=lfs diff=lfs merge=lfs -text
**/snapshots/**/*.png filter=lfs diff=lfs merge=lfs -text
```

Paparazzi's docs recommend LFS for snapshot PNGs plus a CI or pre-receive check that rejects PNGs committed without LFS:

```bash
# ci/check-lfs-pngs.sh — fail if any tracked PNG is stored as a regular blob
set -euo pipefail
bad=$(git ls-files '*.png' | while read -r f; do
  git check-attr filter -- "$f" | grep -q 'filter: lfs' || echo "$f"
done)
if [ -n "$bad" ]; then
  echo "PNG files committed without Git LFS:" >&2
  echo "$bad" >&2
  exit 1
fi
```

### Update modes

| Mode | Behaviour |
|------|-----------|
| `missing` | Write only missing snapshots (no flag = this behaviour, per third-party sources) |
| `changed` | Rewrite only snapshots that differ (bare `--update-snapshots`; added around v1.50 per third-party sources) |
| `all` | Rewrite every snapshot, including matching ones |
| `none` | Never write |
| `default` (config) | Create missing snapshots but **fail** those tests, so CI never passes silently |

Set `updateSnapshots: 'missing'` or keep the default in config; use `--update-snapshots=changed` for intentional rebaselines, never `all`. With `CI=true`, practitioners report that missing baselines fail instead of being created (secondary source).

### Safe update path: bot workflow

Baselines are written only inside the pinned container, never on a developer's macOS or Windows machine. A comment- or `workflow_dispatch`-triggered job regenerates and commits back to the PR (jupyter-ai uses this pattern with `contents: write`).

```yaml
# .github/workflows/update-snapshots.yml
name: Update visual baselines
on:
  workflow_dispatch:
  issue_comment:
    types: [created]
permissions:
  contents: write
  pull-requests: read
jobs:
  update:
    if: >
      github.event_name == 'workflow_dispatch' ||
      (github.event.issue.pull_request && github.event.comment.body == '/update-snapshots' &&
       contains(fromJSON('["OWNER","MEMBER","COLLABORATOR"]'), github.event.comment.author_association))
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.64.1-noble   # must equal @playwright/test in the lockfile
      options: --ipc=host --init
    steps:
      - uses: actions/checkout@v4
        with:
          lfs: true
      - name: Check out PR branch
        if: github.event_name == 'issue_comment'
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          git config --global --add safe.directory "$GITHUB_WORKSPACE"
          gh pr checkout ${{ github.event.issue.number }}
      - run: npm ci
      - run: npx playwright test --grep @visual --update-snapshots=changed
      - name: Commit updated baselines
        run: |
          git config user.name "visual-baseline-bot"
          git config user.email "visual-baseline-bot@users.noreply.github.com"
          git add -A -- ':(glob)**/__screenshots__/**'
          git diff --cached --quiet && exit 0
          git commit -m "test(visual): update baselines"
          git push
```

The `gh` CLI and `git-lfs` must be available in the container (install them, or check out the PR ref with `actions/checkout` and its `ref` input). This job runs PR code with a write token, so restrict who can trigger it (the comment filter admits only owners, members and collaborators) and do not run it for fork PRs. Reviewers still approve the resulting image diff in the PR.

### Rebaseline triggers

Each of these is its own PR, containing only image changes:
- Docker image or `@playwright/test` bump (implies a new browser build)
- Switching headless mode (`channel: 'chromium'`), enabling GPU, or changing SwiftShader availability
- CPU architecture change of runners
- Mobile renderer upgrades: layoutlib (Paparazzi), Robolectric/Roborazzi, Xcode/simulator runtime, Flutter. Several changelogs explicitly require re-recording (e.g. Paparazzi `2.0.0-alpha05.1` requires re-recording accessibility goldens; Roborazzi advises re-recording after upgrades).

## SaaS Branch Baselines

### Chromatic

- Each branch keeps its own baseline: the last accepted snapshot per story per mode.
- Selection walks back git history to the nearest commit with a build. Accepted or unchanged snapshots become the baseline; denied snapshots are skipped and are always re-captured next build.
- Merge commits with multiple ancestors: the most recently accepted wins by default; the account flag `preferMergedBaselines` favours baselines incoming from `main`.
- New branches inherit from their fork point. Approvals on `main` reach a branch only after merge or rebase, so sync `main` regularly to cut false positives.
- Squash and rebase merges are detected through the git provider API (GitHub App required on GitHub). For GitLab or unlinked projects, set up auto-accept on `main`.
- `--auto-accept-changes` / `autoAcceptChanges: "main"` auto-accepts `main`. `--ignore-last-build-on-branch` discards stale branch baselines after a rebase.
- **Builds cannot be deleted.** To revert a baseline, branch from the old build's commit and merge into `main` with auto-accept.

### Argos

Baseline candidates must be complete, have no failed tests, not be a subset build, have no undismissed rejection, share the build name and mode, and lie on the merge base or its ancestry. Search order:
1. Approved build on the merge-base commit
2. Closest ancestor build of the merge base
3. Approved build on the branch's own commit/branch

The default branch is auto-approved; **PR builds are never auto-approved**. Each build shows an "Eligible / Not eligible as baseline" chip with unmet criteria. Overrides: `ARGOS_REFERENCE_BRANCH`, `ARGOS_REFERENCE_COMMIT`.

### Percy

- Approval-required branches compare against the latest approved build; PRs use the standard merge base; `master`/`main` is auto-approve by default (regex configurable). Overrides: `PERCY_TARGET_BRANCH`, `PERCY_TARGET_COMMIT`.
- **On auto-approve branches, builds with fewer than 10% failed snapshots are auto-approved.** This lets real changes into the baseline without human eyes. Keep auto-approve to the default branch only and never rely on it as a noise filter.

## Review and Approval Rules

Hard data on rubber-stamping is absent: no source measures approval speed or regression escape rates. Guidance converges on reviewing diffs individually or in logical groups and never bulk-approving. Treat rubber-stamping as a signal-to-noise problem first.

| Rule | Mechanism |
|------|-----------|
| PR builds always need a human | SaaS defaults (Argos never auto-approves PRs); in-repo: images appear in the PR diff |
| Owners approve shared-component diffs | `CODEOWNERS` on snapshot directories (inferred practice; no company documents it publicly) |
| Author is never sole approver for shared/design-system components | Require design-system owner or designer review |
| Each accepted change is explained | One-line justification in the PR per accepted visual change |
| Diffs stay reviewable | Affected-only runs, few modes, small PRs |
| Bulk accept is audited | Track "accept all" usage |
| Visual approval as required status check | Pair with low noise, or it pressures quick sign-off |

```text
# .github/CODEOWNERS
/packages/design-system/**/__screenshots__/   @acme/design-system-owners
/apps/web/tests/visual/__screenshots__/       @acme/web-frontend
```

Team handles above are placeholders; use your organisation's real teams.

## Monorepos and the TurboSnap Cost Model

TurboSnap finds ancestor builds, unions their git changes, maps them through the Webpack/Vite dependency graph, re-captures only affected stories, and copies the rest. Stories denied on the ancestor are always re-captured.

Billing: captured = 1, copied (TurboSnap) = 0.2, bypassed = 0. Chromatic's example: 50 stories with 10 affected = 10 + 40 x 0.2 = 18 billed. Bypass (no capture at all) needs CLI 17.7.0 or later and a single non-merge ancestor; even a comment-only change inside the graph prevents bypass.

Full-rebuild triggers (everything re-captured):
- `package.json` changed without an in-sync lockfile
- Storybook config changes, or any file imported by `preview.js`
- Static directory changes, `--externals` files, `--force-rebuild`
- Infrastructure or browser upgrades
- First enabling accessibility tests

Extra re-testing also happens on merge commits (changes from both ancestors are unioned) and on rebases/squashes (a "replacement build" search).

**The main enemy is a global decorator imported through a barrel file**: it makes almost every story depend on unrelated code. Keep `preview.js` imports minimal and direct, and keep lockfiles in sync.

Estimating monthly cost (derived from the rule above, not a vendor quote): 300 stories x 2 modes x 200 builds = 120,000 snapshots without TurboSnap; with 10% affected per build, about 33,600 billed.

Not verified: an affected-only equivalent for plain Playwright (e.g. `--only-changed`).

## Flake Handling

Fix flake at the source first (pinned environment, disabled animations, hidden caret, masks and `stylePath`, the stable-screenshot wait). Tool-level noise management comes after.

### Retries classify, they do not pass

- Playwright has no retries by default. With `retries`, tests are classified passed / **flaky** (failed then passed) / failed; `testInfo.retry` lets fixtures reset state on retry.
- For screenshot tests the stable-screenshot wait plus a deterministic environment beats blanket retries.

```ts
// playwright.config.ts (excerpt)
export default defineConfig({
  retries: process.env.CI ? 1 : 0,          // classify flake; do not rely on it to go green
  reporter: [['html'], ['json', { outputFile: 'test-results/results.json' }]],
});
```

### Measuring and quarantining

1. Record each visual test's outcome (passed / flaky / failed) per CI run from the JSON report.
2. Compute a flake rate per test over a rolling window.
3. Above a team-chosen threshold, quarantine: tag it, exclude it from the blocking gate, keep it running, assign an owner and an expiry date.
4. When it expires, either fixed (back in the gate) or deleted. Quarantine without expiry is deletion by neglect.

No published benchmark of typical visual flake rates exists; choose your threshold from your own data.

### Tool support

- **Argos**: flakiness score 0 to 100 (higher = worse) from stability (share of builds where the test did not change) and consistency; identical-looking diffs are grouped as one change; a specific change can be ignored; "Automatically ignore flaky changes" uses a minimum-occurrence threshold over the last 7 days. Argos itself positions ignore as a noise filter, not a fix.
- **Chromatic**: denied stories are always re-captured, which helps diagnose unstable tests.

## Sharding, Parallelism and CI Cost

- Screenshot tests are independent and shard well. **The binding constraint is an identical render environment across shards** (same Docker image tag, arch and flags), not CPU.
- Use the same image for the update workflow and every verify shard.
- Upload `test-results/` and the HTML report on failure so reviewers see actual/expected/diff images.

```yaml
# .github/workflows/visual.yml
name: Visual tests
on: pull_request
jobs:
  visual:
    runs-on: ubuntu-latest
    container:
      image: mcr.microsoft.com/playwright:v1.64.1-noble
      options: --ipc=host --init
    strategy:
      fail-fast: false
      matrix:
        shard: [1/4, 2/4, 3/4, 4/4]
    steps:
      - uses: actions/checkout@v4
        with:
          lfs: true
      - run: npm ci
      - run: npx playwright test --grep @visual --shard=${{ matrix.shard }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: visual-diffs-${{ strategy.job-index }}
          path: |
            test-results/
            playwright-report/
```

SaaS cost scales with stories x modes x browsers x builds; affected-only runs and copied snapshots are the main levers. On in-repo setups the cost is CI minutes and repo size; run the full matrix on PRs touching UI and a reduced set elsewhere only if you can define "touching UI" reliably.

## Checklist

- [ ] Storage model chosen (in-repo + LFS, CI artifact, or SaaS) with reason
- [ ] Baselines generated only in the pinned container or by the SaaS renderer
- [ ] Update path is a bot workflow or SaaS acceptance; never automatic recording on PR branches
- [ ] PR builds never auto-approved; Percy auto-approve limited to the default branch
- [ ] CODEOWNERS on snapshot directories; author not sole approver for shared components
- [ ] Rebaseline PRs for environment, renderer and tool upgrades
- [ ] `preview.js` imports minimal; lockfile in sync (TurboSnap)
- [ ] Flake rate tracked; quarantine has owner and expiry
- [ ] All shards and the update job use one image tag
