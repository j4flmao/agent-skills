# Design System Component Library Architecture

## Component Hierarchy

A well-structured component library follows atomic design principles with clear rules about dependencies. Components at each level may only import from levels below them, never above.

### Level 1: Primitives

Shared utilities that components use. These are not visual components but foundational building blocks.

```
utils/
  cn.ts             -- Class name utility (clsx + twMerge)
  cva.ts            -- Class Variance Authority setup
  focus-ring.ts     -- Focus ring CSS utility
  sr-only.ts        -- Screen reader only utility
  use-id.ts         -- Unique ID generation for a11y
  use-controlled.ts -- Controlled/uncontrolled component logic
```

### Level 2: Primitives / Atoms

Smallest visual components. Single-purpose, no composition with other components.

```
components/primitive/
  Button.tsx        -- Single button element
  Input.tsx         -- Single form input
  Label.tsx         -- Form label
  Icon.tsx          -- SVG icon wrapper
  Spinner.tsx       -- Loading indicator
  Avatar.tsx        -- User avatar (image or initials)
  Badge.tsx         -- Notification badge
  Text.tsx          -- Typography component (h1-h6, p, span)
  Tooltip.tsx       -- Text tooltip on hover/focus
```

### Level 3: Molecules

Composite components built from atoms and primitives. Each molecule has a single responsibility.

```
components/molecule/
  FormField.tsx     -- Label + Input + Error message
  Card.tsx          -- Container with header/body/footer slots
  Select.tsx        -- Custom select with dropdown
  Tabs.tsx          -- Tab bar + tab panels
  Accordion.tsx     -- Expandable sections
  Modal.tsx         -- Dialog overlay with backdrop
  Table.tsx         -- Data table with sort headers
  Pagination.tsx    -- Page navigation controls
  Breadcrumb.tsx    -- Navigation breadcrumbs
  Alert.tsx         -- Status message banners
  Toast.tsx         -- Transient notifications
  Progress.tsx      -- Progress bar (determinate/indeterminate)
```

### Level 4: Organisms

Complex components composed of molecules and atoms. Represent distinct sections of an interface.

```
components/organism/
  DataTable.tsx     -- Table + Search + Pagination + Filters
  Form.tsx          -- Multiple FormFields with validation
  Navigation.tsx    -- Sidebar/topnav with links and dropdowns
  DatePicker.tsx    -- Calendar + input + dropdown
  FileUpload.tsx    -- Drag-and-drop zone + file list + progress
  CommandPalette.tsx -- Search overlay with keyboard shortcuts
  ColorPicker.tsx   -- Color swatches + custom input
```

### Level 5: Templates / Patterns

Pre-built page-level compositions. Skeleton layouts that organisms slot into.

```
templates/
  AuthLayout.tsx    -- Login/signup page layout
  DashboardLayout.tsx -- Sidebar + header + content area
  SettingsLayout.tsx -- Tabbed settings page
  ErrorPage.tsx     -- 404/500 error page template
  EmptyState.tsx    -- No results / no data state
```

## Component Design Principles

### Single Responsibility

Each component should do one thing and do it well. A Button renders a clickable element. A Modal renders an overlay with focus management. Do not combine responsibilities.

```tsx
// BAD: Button also handles loading state with spinner and text change
function Button({ children, loading, loadingText, ...props }) {
  return (
    <button {...props}>
      {loading ? (
        <>
          <Spinner />
          {loadingText || children}
        </>
      ) : children}
    </button>
  );
}

// GOOD: Button just renders, composition handles loading
function Button({ children, ...props }) {
  return <button {...props}>{children}</button>;
}

// Usage
<Button onClick={handleSave}>
  {isLoading ? <><Spinner /> Saving...</> : 'Save'}
</Button>
```

### Component API Rules

1. **Maximum 10 props** (excluding className, style, children)
2. **Props use semantic names**, not implementation details
3. **Boolean props are avoided** in favor of variant enums
4. **Required props are minimized** -- provide sensible defaults
5. **Escape hatch always exists** -- className, style, and HTML attribute forwarding

### Prop Design Guidelines

```tsx
// BAD: Boolean explosion
<Button
  primary
  small
  rounded
  disabled
  loading
  fullWidth
  withIcon
  outline
  noShadow
/>

// GOOD: Enum-based variants
<Button
  variant="primary"
  size="sm"
  shape="rounded"
  disabled
  loading
  fullWidth
  icon={<SaveIcon />}
/>
```

## Component Implementation Patterns

### Forwarding Refs

All interactive components must forward refs for programmatic focus management, form integration, and tooltip positioning.

```tsx
import { forwardRef, type ForwardedRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

### Controlled and Uncontrolled Components

Support both controlled and uncontrolled usage patterns:

```tsx
interface InputProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}

function Input({ value: controlledValue, defaultValue, onChange }: InputProps) {
  const isControlled = controlledValue !== undefined;
  const internalRef = useRef(defaultValue ?? '');

  const currentValue = isControlled ? controlledValue : internalRef.current;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) {
      internalRef.current = e.target.value;
    }
    onChange?.(e.target.value);
  };

  return <input value={currentValue} onChange={handleChange} />;
}
```

### Polymorphic Components (as prop)

```tsx
type PolymorphicProps<C extends React.ElementType> = {
  as?: C;
  children?: React.ReactNode;
} & React.ComponentPropsWithoutRef<C>;

function Box<C extends React.ElementType = 'div'>({
  as,
  children,
  className,
  ...props
}: PolymorphicProps<C>) {
  const Component = as || 'div';
  return (
    <Component className={cn(className)} {...props}>
      {children}
    </Component>
  );
}
```

### Compound Components with Context

```tsx
import { createContext, useContext } from 'react';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
  variant?: 'underline' | 'pills';
}

const TabsContext = createContext<TabsContextValue | null>(null);

function Tabs({ children, defaultValue, variant = 'underline' }) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, variant }}>
      {children}
    </TabsContext.Provider>
  );
}

function TabList({ children }) {
  const { variant } = useTabsContext();
  return (
    <div role="tablist" className={tabListVariants({ variant })}>
      {children}
    </div>
  );
}

function Tab({ value, children }) {
  const { activeTab, setActiveTab } = useTabsContext();
  return (
    <button
      role="tab"
      aria-selected={activeTab === value}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
}

function TabPanel({ value, children }) {
  const { activeTab } = useTabsContext();
  if (activeTab !== value) return null;
  return <div role="tabpanel">{children}</div>;
}

Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;
```

## Accessibility in Component Library

Every component must support:

1. **Keyboard navigation**: Tab, Enter, Escape, Arrow keys for composite widgets
2. **Focus management**: Visible focus indicator, focus trap for modals, roving tabindex
3. **ARIA attributes**: Correct roles, states, and properties
4. **Screen reader announcements**: aria-live for dynamic content
5. **Color contrast**: Meet WCAG 2.1 AA (4.5:1 text, 3:1 UI)

### Accessibility Test Pattern

```tsx
it('supports keyboard navigation', async () => {
  const { container } = render(<Tabs defaultValue="tab1">
    <Tabs.List>
      <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
      <Tabs.Tab value="tab2">Tab 2</Tabs.Tab>
    </Tabs.List>
    <Tabs.Panel value="tab1">Content 1</Tabs.Panel>
    <Tabs.Panel value="tab2">Content 2</Tabs.Panel>
  </Tabs>);

  const firstTab = container.querySelector('[role="tab"]');
  firstTab.focus();
  expect(document.activeElement).toBe(firstTab);

  // Arrow key navigation
  fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
  const secondTab = container.querySelectorAll('[role="tab"]')[1];
  expect(document.activeElement).toBe(secondTab);
});

it('has no a11y violations', async () => {
  const { container } = render(<Button>Click</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## File Structure Convention

```
components/Button/
  Button.tsx              -- Component implementation
  Button.test.tsx         -- Unit tests
  Button.stories.tsx      -- Storybook stories
  Button.css              -- Component styles (if not using CSS-in-JS)
  index.ts                -- Public API exports
  Button.types.ts         -- TypeScript types
  README.md               -- Component documentation
```

### Index File Pattern

```ts
// components/Button/index.ts
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button.types';
```

## Component API Documentation Standard

Each component should document:

1. **Purpose**: One-sentence description of what the component does
2. **Import**: Exact import path
3. **Props**: Table with name, type, default, description
4. **Variants**: Each variant with visual example
5. **States**: Default, hover, focus, active, disabled, loading, error
6. **Accessibility**: ARIA attributes, keyboard interactions, focus management
7. **Usage guidelines**: When to use vs when not to use
8. **Examples**: Basic, with props, compound usage

```tsx
/**
 * Button
 *
 * A clickable element that triggers an action.
 * Use for form submissions, dialog triggers, and primary actions.
 * For navigation, use the Link component instead.
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Submit
 * </Button>
 * ```
 */
```

## Testing Strategy

### Unit Tests (Vitest / Jest)

- Render with default props
- Render with each variant
- Verify className output
- Verify event handlers fire
- Verify disabled state prevents interaction
- Verify ref forwarding

### Accessibility Tests (jest-axe)

- No WCAG violations in each variant/state
- Focus management in composite components
- ARIA attributes correctly applied

### Interaction Tests (Testing Library)

- User clicks, keyboard presses
- Focus management (focus trap, tab order)
- Controlled vs uncontrolled behavior

### Visual Regression (Chromatic / Percy)

- Each variant and state in a Storybook story
- Responsive behavior at breakpoints
- Dark mode rendering

### E2E Tests (Playwright / Cypress)

- Component works in real page context
- Integration with other components
- Form submission flows

## Bundle Size Budget

Each primitive/atom component: 0.5-2KB
Each molecule component: 1-5KB
Each organism component: 3-10KB
Shared utilities (cn, CVA, hooks): 2-5KB

Total component library: 30-100KB for 30-50 components.

```ts
// components/Button/Button.tsx
// Target: < 2KB (minified + gzipped)
```

## Versioning and Breaking Changes

### Semantic Versioning for Component Libraries

| Change | Version Bump |
|--------|-------------|
| New component added | Minor |
| New variant added to existing component | Minor |
| Prop added (optional, non-breaking) | Minor |
| Prop renamed | Major |
| Prop removed | Major |
| Variant removed | Major |
| Default variant behavior changed | Major |
| HTML structure changed (affects CSS selectors) | Major |
| Bug fix (no API change) | Patch |
| Dependency update (no API change) | Patch |

### Deprecation Policy

1. Mark deprecated props with JSDoc `@deprecated`
2. Add console.warn in development mode
3. Keep deprecated prop for 2 minor versions
4. Remove in next major version

```tsx
interface ButtonProps {
  /**
   * @deprecated Use `variant="ghost"` instead
   */
  ghost?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
}

if (process.env.NODE_ENV === 'development' && ghost) {
  console.warn('Button: `ghost` prop is deprecated. Use `variant="ghost"` instead.');
}
```

## Component Library Distribution

### Package.json Configuration

```json
{
  "name": "@company/ui",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./styles.css": "./dist/styles.css"
  },
  "sideEffects": [
    "./dist/styles.css"
  ],
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

### Tree-Shakeable Exports

Ensure each component can be imported individually for tree shaking:

```ts
// index.ts (barrel file -- each export is individually resolvable)
export { Button } from './Button';
export { Card } from './Card';
export { Input } from './Input';
// ...
```

Importing a single component should not pull in the entire library:
```ts
import { Button } from '@company/ui'; // Tree-shakes to just Button + dependencies
```

## Component Lifecycle

```
Proposal -> Review -> Alpha -> Beta -> Stable -> Deprecated -> Removed

Proposal: RFC document describing the component need
Review: Stakeholder feedback on API design
Alpha: Implementation in a feature branch, limited usage
Beta: Available in main branch, feedback collected from early adopters
Stable: Full test coverage, a11y audit completed, documented in Storybook
Deprecated: Superseded by another component, kept for migration period
Removed: Deleted in next major version
```
