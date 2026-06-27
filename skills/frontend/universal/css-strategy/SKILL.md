---
name: frontend-css-strategy
description: >
  Use this skill when the user says 'CSS strategy', 'CSS Modules', 'CSS-in-JS', 'utility-first CSS', 'Tailwind CSS', 'styled-components', 'Emotion', 'CSS organization', 'CSS architecture', 'CSS approach', 'BEM', 'CSS naming convention', 'CSS preprocessor', 'Sass', 'PostCSS', 'styled-jsx', 'Linaria', 'vanilla-extract', 'CSS decision', 'styling approach'. This skill helps choose the right CSS approach based on project size, team composition, performance requirements, and build tooling. Works with any frontend framework. Do NOT use for: component design (use design-system skill), Tailwind-specific questions (use tailwind-css skill), or design token setup (use theming skill).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, css, styling, universal]
---

# Frontend CSS Strategy

## Purpose
Choose and implement the right CSS approach for the project. Utility-first for rapid iteration and consistency. CSS Modules for scoped, component-encapsulated styles. CSS-in-JS for dynamic theming and colocation. Each approach solves a different problem — pick the right one.

## Agent Protocol

### Trigger
Exact phrases: "CSS strategy", "CSS Modules", "CSS-in-JS", "utility-first", "Tailwind CSS", "styled-components", "Emotion", "CSS organization", "CSS architecture", "CSS approach", "styling approach", "how to style", "CSS decision".

### Input Context
- Framework (React, Vue, Angular, Svelte)
- Team size and CSS experience
- Project type (library, app, design system)
- Current styling approach (if any)
- Performance requirements (runtime cost, bundle size)

### Output Artifact
CSS strategy recommendation with rationale, setup code, and organization pattern.

### Response Format
```
## Recommendation
<approach> — <rationale>

## Setup
<config, dependencies, file-structure>

## Usage
<component-example, naming-convention>

## Organization
<folder-structure, globals, utilities>

—
Compression footer: frontend-css/v1 | approach: <tailwind|modules|css-in-js> | perf: <runtime|zero>
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] CSS approach selected with documented rationale
- [ ] File and folder structure created
- [ ] Global styles (reset, variables, typography) configured
- [ ] Component styling pattern established with examples
- [ ] Responsive and state-based styling pattern defined
- [ ] Build tool configured for chosen approach

### Max Response Length
4096 tokens

## Workflow

### 1. Approach Decision
```
Project type?
├── Design system / component library -> CSS Modules or vanilla-extract (zero runtime, scoped)
├── Large app with many developers -> Tailwind CSS (consistent, low decision fatigue)
├── Highly themed / white-label app -> CSS-in-JS or CSS variables (dynamic theming)
├── Micro-frontend -> CSS Modules (isolation)
└── Small app / prototype -> Any — pick based on team preference
```

### 2. Approach Comparison

| Approach | Runtime | Scoping | Dynamic Themes | Bundle Size | Learning Curve |
|----------|---------|---------|---------------|-------------|----------------|
| Utility-first (Tailwind) | Zero | N/A (utility classes) | Via CSS vars | Small (purged) | Low-Medium |
| CSS Modules | Zero | Automatic (hash) | Via CSS vars | Zero runtime | Low |
| styled-components | Runtime | Automatic (hash) | Native | ~12KB runtime | Medium |
| Emotion | Runtime | Automatic (hash) | Native | ~8KB runtime | Medium |
| vanilla-extract | Zero | Automatic (hash) | Via CSS vars | Zero runtime | Medium |
| Linaria | Zero | Automatic (hash) | Via CSS vars | Zero runtime | Medium |
| Stitches | Runtime | Automatic | Native | ~5KB runtime | Medium |
| Raw CSS/Sass | Zero | Manual (BEM) | Via CSS vars | Zero | Low |

### 3. File Organization
```
src/
  styles/
    reset.css               /* CSS reset */
    variables.css            /* CSS custom properties */
    typography.css           /* Font faces, text styles */
    utilities.css            /* Utility classes (if not Tailwind) */
    animations.css          /* Keyframes */
  components/
    Button/
      Button.tsx
      Button.module.css
      Button.test.tsx
    Card/
      Card.tsx
      Card.module.css
      Card.test.tsx
  pages/
    Home/
      Home.tsx
      Home.module.css
```

### 4. CSS Modules Pattern
```css
/* Button.module.css */
.root {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
}

.primary {
  background: var(--color-primary);
  color: white;
}

.secondary {
  background: transparent;
  border: 1px solid var(--color-border);
}
```

### 5. Tailwind Pattern
```typescript
export function Button({ variant = 'primary', ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-transparent border border-gray-300 hover:bg-gray-50',
  }

  return (
    <button
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${variants[variant]}`}
      {...props}
    />
  )
}
```

### 6. Styled Components Pattern
```typescript
import styled, { css } from 'styled-components'

interface ButtonProps {
  $variant: 'primary' | 'secondary'
  $large?: boolean
}

export const StyledButton = styled.button<ButtonProps>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: ${({ $large }) => ($large ? '12px 24px' : '8px 16px')};
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;

  ${({ $variant }) =>
    $variant === 'primary'
      ? css`
          background: var(--color-primary);
          color: white;
        `
      : css`
          background: transparent;
          border: 1px solid var(--color-border);
        `}
`
```

### 7. Vanilla Extract Pattern
```typescript
// Button.css.ts
import { style, recipe } from '@vanilla-extract/css'
import { vars } from './theme.css'

export const button = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '6px',
    fontWeight: 500,
  },
  variants: {
    variant: {
      primary: { background: vars.color.primary, color: 'white' },
      secondary: { background: 'transparent', border: vars.color.border },
    },
  },
})
```

### 8. CSS Variables for Theming
```css
:root {
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-background: #ffffff;
  --color-text: #1a1a1a;
  --color-border: #e5e7eb;
  --radius-sm: 4px;
  --radius-md: 8px;
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-4: 16px;
}
```

### 9. PostCSS Configuration
```javascript
// postcss.config.js
module.exports = {
  plugins: [
    require('postcss-import'),
    require('postcss-nesting'), // or postcss-nested
    require('autoprefixer'),
    require('cssnano')({ preset: 'default' }),
  ],
}
```

### 10. Container Queries with CSS Strategy
```css
/* Component-scoped responsive design */
.card-container {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 200px 1fr;
  }
}
```

## Component Architecture

### Decision Tree for Mixed Approaches
```
Page layout (grid, sections)
  -> Tailwind utility classes or CSS Grid in global styles
  -> Reason: layout changes infrequently, benefits from standard grid

Component appearance (color, spacing, typography)
  -> CSS Modules or styled-components
  -> Reason: encapsulation, no class name collisions

Dynamic styles (theme-dependent, user-customizable)
  -> CSS Variables
  -> Reason: runtime theme switching without re-render

Animations
  -> CSS keyframes in global animations.css
  -> Reason: reusable, hardware-accelerated
```

### CSS Layers Strategy (cascade layers)
```css
/* Define layer order — lower priority first */
@layer reset, base, tokens, components, utilities, overrides;

/* Reset — lowest priority */
@layer reset {
  *, *::before, *::after { box-sizing: border-box; margin: 0; }
}

/* Base — element defaults */
@layer base {
  body { font-family: system-ui; line-height: 1.5; }
}

/* Components — scoped component styles */
@layer components {
  .card { border-radius: 8px; padding: 16px; }
}

/* Utilities — highest priority (win over components) */
@layer utilities {
  .mt-4 { margin-top: 16px; }
}
```
CSS Layers solve specificity wars by letting you define priority order explicitly. Tailwind v4 uses layers internally.

## Common Pitfalls

1. **Mixing approaches inconsistently**: Using Tailwind in some components and CSS Modules in others without clear boundaries.
2. **Runtime CSS-in-JS for static apps**: Adds unnecessary JS bundle when CSS Variables would work.
3. **Over-nesting in SCSS**: More than 3 levels deep creates specificity problems.
4. **Not purging unused styles**: With utility frameworks, purging is essential to keep bundle small.
5. **Inline styles for dynamic values**: Use CSS variables instead (avoids specificity, enables transitions).
6. **Missing design tokens**: Hardcoding values leads to inconsistency.
7. **Specificity wars**: `!important` cascading indicates architectural problem.
8. **CSS-in-JS during SSR**: Some libraries (styled-components) require babel plugin for SSR. Always verify SSR compatibility.
9. **Global CSS leakage**: CSS Modules and Shadow DOM prevent this. BEM and utility classes don't guarantee it.
10. **Font loading flash**: Always specify `font-display: swap` or `font-display: optional` for web fonts.

## Best Practices

1. Pick one primary approach and stick with it — avoid mixing without clear boundaries.
2. Design tokens in CSS custom properties, not JavaScript.
3. Component styles never depend on global styles for layout.
4. Utility classes preferred over one-off CSS for spacing, type, layout.
5. CSS-in-JS only when dynamic theming is required beyond CSS variables.
6. CSS Modules for zero-runtime scoping when dynamic theming not needed.
7. Naming conventions consistent: camelCase for CSS Modules, kebab-case for utilities.
8. Media queries use standard breakpoint values.
9. Prefer CSS animations over JavaScript.
10. Configure purging (Tailwind) or lint rules for dead styles.

## Compared With

| Aspect | Tailwind | CSS Modules | styled-components |
|--------|----------|-------------|-------------------|
| Setup time | 5 min | 1 min | 5 min |
| Bundle impact | 0KB after purge | 0KB | ~12KB runtime |
| Design consistency | Excellent (constraint-based) | Manual | Manual |
| Learning curve | Medium | Low | Low |
| Dynamic theming | Via CSS vars | Via CSS vars | Native |
| Dev experience | Excellent with IDE plugin | Standard | Good with babel plugin |
| Migration difficulty | High to change | Low | Medium |

## Performance

1. Tailwind purged: final CSS is typically 5-15KB gzipped for a large app.
2. styled-components/Emotion: ~8-12KB runtime + inlined styles in JS bundle.
3. CSS Modules: zero runtime cost, styles extracted to static CSS files.
4. CSS Variables: no performance overhead, native browser optimization.
5. Runtime CSS-in-JS adds ~0.4ms per style injection on initial render.
6. Critical CSS extraction (inlining above-fold styles) improves FCP by 10-20%.
7. CSS Layers have no performance overhead — they're a cascade-ordering feature only.
8. Container Queries have same performance as media queries — negligible cost.

### Browser Rendering Considerations
- CSS-in-JS during hydration can cause "flash of unstyled content" (FOUC) if SSR is not configured.
- CSS Variables are resolved at computed-value time — referencing many vars in one rule is slightly slower than literals but negligible in practice.
- Container Queries require the browser to track container dimensions — this has minimal overhead (similar to ResizeObserver).
- `@layer` has no performance cost — it is purely a cascade-ordering mechanism.

## Tooling

1. `tailwindcss` — utility-first CSS framework with JIT compiler.
2. `postcss` — CSS transformer (autoprefixer, nesting, custom media).
3. `sass` — SCSS preprocessor with mixins, functions, variables.
4. `stylelint` — CSS linter with rules for ordering, naming, specificity.
5. `vanilla-extract` — zero-runtime CSS-in-JS with TypeScript.
6. `linaria` — zero-runtime CSS-in-JS with Babel/Macro.
7. `critters` — inline critical CSS for SSR frameworks.
8. `purgecss` — remove unused CSS (used by Tailwind internally).
9. `lightningcss` — Rust-based CSS parser/minifier (used by Vite, Parcel).
10. `cssnano` — PostCSS-based CSS minifier.

## Rules
1. CSS approaches are not mixed in a single project — pick one primary approach.
2. Design tokens live in CSS custom properties, not in JavaScript.
3. Component styles never depend on global styles for layout — each component is self-contained.
4. Utility classes are preferred over one-off CSS for margins, padding, typography, and layout.
5. CSS-in-JS is only chosen when dynamic theming is required and CSS variables are insufficient.
6. CSS Modules are used for zero-runtime scoping when dynamic theming is not needed.
7. Naming conventions are consistent across the entire codebase.
8. Media queries inside component styles use the project's standard breakpoint values.
9. Animations prefer CSS over JavaScript — only JS animation when complex choreography is needed.
10. Dead styles are removed — purging or lint rules are configured.
11. `!important` is never used unless overriding a third-party library.
12. CSS selectors never exceed 3 levels of specificity.
13. PostCSS or LightningCSS is configured for autoprefixing and minification.
14. CSS Layers are used to manage cascade order explicitly.

## References
  - references/container-queries.md — Container Queries
  - references/css-approaches.md — CSS Approaches
  - references/css-custom-properties.md — CSS Custom Properties
  - references/css-methodology.md — CSS Methodology
  - references/css-organization.md — CSS Organization
  - references/css-performance.md — CSS Performance
  - references/css-architecture-methodologies.md — CSS Architecture Methodologies
  - references/css-performance-bundle-optimization.md — CSS Performance Optimization

## Handoff
No artifact produced unless requested.
Next skill: `frontend-tailwind-css` — Tailwind-specific patterns, configuration, and optimization.
Carry forward: CSS approach selected, organization pattern, theming via CSS variables.
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

## Architecture Decision Trees

### CSS Approach Decision Tree
```
Is the project a design system or standalone app?
  ├── Design system → CSS Custom Properties + Shadow DOM or CSS Modules
  └── Standalone app → Is SSR required?
       ├── Yes → CSS Modules or utility-first (Tailwind) with JIT
       └── No  → CSS-in-JS or utility-first (Tailwind)
            Team prefers runtime or build-time?
            ├── Runtime → CSS-in-JS (emotion, styled-components)
            └── Build-time → Tailwind or CSS Modules
```

### Organization Strategy Decision Tree
```
How many developers work on CSS?
  ├── 1-3 → Loose conventions + BEM or Tailwind
  ├── 3-10 → Structured methodology (ITCSS, SMACSS) + lint rules
  └── 10+ → Design token system + component-scoped styles + strict linting
       Is the project multi-brand?
       ├── Yes → Design tokens with theme layers + CSS variables
       └── No  → Single design language with consistent tokens
```
