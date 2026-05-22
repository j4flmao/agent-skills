# Component Library

## Atomic Composition

```
Atoms (primitive elements)
  ├── Button, Input, Label, Icon, Avatar, Badge, Spinner
  │
Molecules (simple combinations)
  ├── FormField (Label + Input + ErrorText)
  ├── Card (Icon + Heading + Body + Footer)
  ├── SearchBar (Input + Icon + ClearButton)
  ├── Pagination (Button + Label + Button)
  │
Organisms (complex sections)
  ├── Header (Logo + Nav + SearchBar + Avatar)
  ├── Sidebar (NavItems + UserInfo + Logout)
  ├── DataTable (SearchBar + Table + Pagination)
  └── Modal (Overlay + Card + CloseButton)
```

## Composition Rules
- Atoms: no dependencies on other components, no imports
- Molecules: import atoms only, no sibling molecules
- Organisms: import molecules and atoms, no sibling organisms
- Circular imports prohibited at all levels
- Max composition depth: 4 levels (organism → molecule → atom → primitive)

## Component API Template

```typescript
interface ComponentProps {
  size: "sm" | "md" | "lg";
  variant: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
}
```

## Storybook Configuration

```typescript
// .storybook/main.ts
export default {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-controls",
    "@storybook/addon-a11y",
    "@storybook/addon-viewport",
    "@storybook/addon-docs",
    "storybook-addon-themes",
  ],
};
```

## Testing Strategy

| Layer | Tool | Scope |
|-------|------|-------|
| Unit | Vitest + Testing Library | Component rendering, props, states |
| A11y | jest-axe / axe-core | Contrast, ARIA, keyboard navigation |
| Visual | Chromatic / Percy | Screenshot diff per story |
| Integration | Playwright | Composition behavior, form flows |

## Documentation Requirements
- README per component: purpose, API, usage examples, accessibility notes
- Storybook stories: default, all variants, all states (hover, active, disabled, error, loading), responsive, dark mode
- JSDoc on all exported types and functions
- Changelog entry for every version bump

## Versioning

Semantic versioning for the design system:
- MAJOR: breaking component API changes, token removals
- MINOR: new components, new tokens, new variants
- PATCH: bug fixes, accessibility improvements, documentation

Publish as a private npm package with dist files only (no source).
