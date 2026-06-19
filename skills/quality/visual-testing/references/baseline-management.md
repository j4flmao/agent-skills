# Baseline Management

## Storage Strategies
| Strategy | Pros | Cons | Best for |
|----------|------|------|----------|
| Git (commit baselines) | Versioned, reviewed in PRs | Large files bloat repo | Small suites, component tests |
| Git LFS | Large file support, versioned | Requires LFS setup | Medium suites |
| Cloud service (Percy, Chromatic) | No local storage, team sharing | Vendor lock-in, cost | Team collaboration |
| CI artifacts | Simple, disposable | No history, not shared | CI-only validation |

## Baseline Update Workflow
1. Developer makes intentional UI change
2. CI visual tests fail (expected — baseline is outdated)
3. Developer reviews diff images to confirm changes are intentional
4. Developer runs `npx playwright test --update-snapshots` locally
5. Updated baselines committed with the UI change
6. Reviewer sees baseline changes in PR diff

## CI-Driven Baseline Updates
```yaml
# Automated baseline update on main branch
jobs:
  update-baselines:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - name: Update baselines
        run: npx playwright test --update-snapshots --project=chromium
      - name: Commit updated baselines
        run: |
          git config user.name "Visual Test Bot"
          git config user.email "bot@example.com"
          git add visual-snapshots/
          git commit -m "chore: update visual baselines [skip ci]" || true
          git push
```

## Key Points
- Store baselines in version control (Git or Git LFS)
- Update baselines when UI changes are intentional
- Review baseline changes in PRs alongside code changes
- Use CI to auto-update baselines on main branch
- Mask dynamic content to reduce unnecessary baseline updates
- Use element-level screenshots for more stable baselines
