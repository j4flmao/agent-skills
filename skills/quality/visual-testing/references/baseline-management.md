# Baseline Management

## CI Pipeline Workflow

```
main branch (baseline)
  └─ Run visual tests → auto-approve all snapshots → update baseline
feature branch
  └─ Run visual tests → diff against main baseline → review in Percy/Chromatic
  └─ Approve changes → merge to main
  └─ Run visual tests on main → new baseline
```

## Cross-Browser Baseline Strategy

| Browser | Baseline | Diff Handling |
|---------|----------|---------------|
| Chrome | Primary baseline | All diffs reviewed |
| Firefox | Same baseline as Chrome | Sub-pixel rendering diffs auto-soft-accept |
| Safari | Same baseline | Font rendering diffs reviewed manually |

## Component-Level Configuration

```typescript
// Component-specific baseline config
const visualConfig = {
  header: { threshold: 0.1, widths: [1440] },
  "data-table": { threshold: 0.2, widths: [768, 1440] },
  "user-avatar": { threshold: 0 },
};
```

## Baseline Approval Workflow

1. Developer runs visual tests on feature branch
2. Percy/Chromatic compares against main baseline
3. Diffs categorized: Unchanged (auto-pass), Changed (review needed), Added (new baseline), Removed (verify intentional)
4. Reviewer inspects each diff — approve or reject
5. All diffs approved → PR can merge
6. Post-merge → new baseline captured on main

## Handling Dynamic Content

| Strategy | Implementation | When to Use |
|----------|---------------|-------------|
| Clip region | Snapshot only static area | Header, footer, sidebar |
| DOM transform | Remove dynamic elements | Dates, user names, timers |
| Data attribute freeze | Set static state in test | Loading, error, empty states |
| CSS freeze | Pause animations before snapshot | Carousels, spinners |
| CSS freeze | `page.addStyleTag` to pause animations | Any animated element |

## Baseline Rotation

- Every main branch build creates a new baseline
- Retain last 30 days of baselines
- Archive quarterly full-suite snapshots for trend analysis
- Purge baselines for deleted components

## Review Checklist

- [ ] Diff is expected (intentional change)
- [ ] Diff is not a rendering flake (font rendering, anti-aliasing)
- [ ] Diff does not break a11y contrast
- [ ] Diff is consistent across browsers
- [ ] No unintended side effects (layout shift, overflow)
