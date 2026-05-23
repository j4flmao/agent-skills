# CSS Approaches

## Utility-First (Tailwind CSS)

### When to Use
- Large teams that need consistent spacing, colors, and typography
- Rapid prototyping and iteration
- Projects where you want to avoid writing custom CSS
- Designs that use a constrained design system (not fully custom)

### Trade-offs
**Pros:** No naming decisions, tiny production CSS (purged), consistent spacing/color/type, fast iteration, great responsive utilities.

**Cons:** HTML can look verbose, learning curve for utility names, custom designs require config extension, harder to read for non-Tailwind developers.

### Migration Path (from other approaches)
1. Add Tailwind as a PostCSS plugin alongside existing CSS
2. Incrementally replace utility classes for spacing, layout, typography
3. Replace component styles one at a time
4. Remove legacy CSS files when components are fully migrated

## CSS Modules

### When to Use
- Component libraries and design systems
- Projects that want zero runtime cost with scoped styles
- Teams comfortable with writing standard CSS
- Micro-frontends needing style isolation

### Trade-offs
**Pros:** Zero runtime, automatic scoping (no naming collisions), standard CSS syntax, great TypeScript support (`*.module.css.d.ts`), composable via `composes`.

**Cons:** No dynamic theming without CSS variables, more boilerplate per component, global styles need separate handling, CSS-in-JS features (props-based styles) require workarounds.

### Composing Classes
```css
/* Button.module.css */
.base {
  composes: flex items-center gap-2 from global;
  padding: 8px 16px;
}

.primary {
  composes: base;
  background: blue;
}
```

## CSS-in-JS (styled-components, Emotion)

### When to Use
- Highly themed applications (white-label, multi-brand)
- Design systems needing runtime theme injection
- Apps where styles depend on complex component props or state
- Teams that prefer colocated, component-scoped styles

### Trade-offs
**Pros:** Truly dynamic styles (props-driven), automatic scoping, colocated with component, full TypeScript theme typing, no CSS file management.

**Cons:** Runtime cost (parsing, injection), larger bundle (~8-12KB), slower initial render, SSR requires extra setup, harder to debug (generated class names).

### Performance Optimization
```typescript
// Use transient props ($ prefix) to avoid passing to DOM
const StyledButton = styled.button<{ $variant: string }>`
  color: ${({ $variant }) => ($variant === 'primary' ? 'blue' : 'gray')};
`

// Extract static styles outside component
const staticStyles = css`
  font-weight: 500;
  border-radius: 4px;
`

// Use as prop for as-polymorphism
<StyledButton as="a" href="/">Link Button</StyledButton>
```

## Zero-Runtime CSS-in-JS (vanilla-extract, Linaria)

### When to Use
- Projects that want the CSS-in-JS developer experience without runtime cost
- Apps where bundle size is critical
- Component libraries that ship to many consumers
- Teams that want TypeScript-powered styles

### Trade-offs
**Pros:** Zero runtime, TypeScript autocomplete for styles, theme support via CSS variables, colocated, scoped.

**Cons:** Build step required, no runtime dynamic styles (must use CSS variables), fewer community resources than CSS-in-JS or Tailwind.

### vanilla-extract Example
```typescript
import { style, createThemeContract, createGlobalTheme } from '@vanilla-extract/css'

export const vars = createThemeContract({
  color: { primary: null, background: null },
  space: { small: null, medium: null },
})

createGlobalTheme(':root', vars, {
  color: { primary: '#2563eb', background: '#fff' },
  space: { small: '4px', medium: '8px' },
})

export const button = style({
  backgroundColor: vars.color.primary,
  padding: `${vars.space.small} ${vars.space.medium}`,
})
```

## Approach Comparison Table

| Criterion | Utility-First | CSS Modules | CSS-in-JS | Zero-Runtime |
|-----------|--------------|-------------|-----------|--------------|
| Runtime cost | None | None | ~8-12KB + injection | None |
| Scoping | N/A (classes) | Hash-based | Hash-based | Hash-based |
| Dynamic props | Via classes | Via CSS vars | Native | Via CSS vars |
| SSR setup | None | None | Extra | None |
| TypeScript support | Good (autocomplete) | Generated types | Native | Native |
| Learning curve | Medium | Low | Medium | Medium |
| File management | Single CSS file | Per component | None | Per component |
| Design constraints | Config-driven | Manual | Manual | Manual |
| Naming decisions | None | Some | None | None |
| Responsive | Good (prefixes) | Manual | Manual | Manual |
| Animation support | Good | Good | Good | Good |

## Migration Between Approaches

### CSS Modules → Tailwind
1. Install Tailwind, add to PostCSS config
2. Add `@tailwind` directives to global CSS
3. Replace utility-heavy CSS Module classes with Tailwind classes
4. Keep complex animation/transition styles in CSS Modules
5. Remove CSS Module files as components are migrated

### CSS-in-JS → CSS Modules
1. Create `.module.css` files for each component
2. Move styles from JS to CSS files, replacing `${prop}` with CSS variables
3. Update components to import and use CSS Module class names
4. Remove styled-components/Emotion dependency

### Any → vanilla-extract
1. Install vanilla-extract with framework plugin
2. Convert one component at a time: write `.css.ts` files
3. Replace CSS variable references with vanilla-extract theme contract
4. Build-time generates static CSS — no runtime changes
