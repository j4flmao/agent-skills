# Testing Tools

## Automated Tools

| Tool | Scope | Integration | Coverage |
|------|-------|-------------|----------|
| axe DevTools | WCAG A, AA | Browser extension, CI (axe-core), Storybook addon | 30–40% of issues |
| Lighthouse | Basic a11y audit | Chrome DevTools, CI | ~25% of issues |
| WAVE | Visual overlay | Browser extension | 20–30% of issues |
| Pa11y | CI pipeline | CLI, CI integration | 30–40% of issues |

## axe-core CI Configuration

```typescript
// axe configuration
import axe from "axe-core";

const config = {
  runOnly: {
    type: "tag",
    values: ["wcag2a", "wcag2aa", "best-practice"],
  },
  rules: {
    "color-contrast": { enabled: true },
    "heading-order": { enabled: true },
    "label": { enabled: true },
    "aria-allowed-attr": { enabled: true },
  },
};
```

## Storybook + axe Addon

```typescript
// .storybook/preview.ts
import { withA11y } from "@storybook/addon-a11y";

export const decorators = [withA11y];

export const parameters = {
  a11y: {
    config: { runOnly: { values: ["wcag2aa"] } },
    element: "#root",
  },
};
```

## Screen Reader Testing

| OS | Screen Reader | Shortcut |
|----|---------------|----------|
| macOS | VoiceOver | Cmd+F5 to toggle |
| Windows | NVDA (free) | Insert+Space for browse/focus |
| Windows | JAWS (paid) | Insert+Arrow to navigate |
| Android | TalkBack | One-finger swipe |
| iOS | VoiceOver | Triple-click side button |

## Screen Reader Testing Protocol

1. Navigate page by heading (VoiceOver: Ctrl+Cmd+H)
2. Navigate by landmark (VoiceOver: Ctrl+Cmd+Shift+H)
3. Tab through all interactive elements
4. Test all form inputs (fill and submit)
5. Test modal/dialog open and close
6. Test dynamic content updates (notifications, loading)
7. Listen for: missing labels, unhelpful announcements, focus loss

## Keyboard Audit Checklist

- [ ] Tab navigates to every interactive element in visual order
- [ ] Shift+Tab reverses navigation
- [ ] Enter/Space activates buttons and links
- [ ] Arrow keys navigate custom widgets (tabs, menus, lists)
- [ ] Escape closes modals, menus, and dialogs
- [ ] Focus is visible at all times (2px outline, 3:1 contrast)
- [ ] No keyboard traps (focus cannot get stuck)
- [ ] Skip link present and functional
- [ ] TabIndex never > 0
