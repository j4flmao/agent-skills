---
name: design-design-systems
description: >
  Use when the user asks about design systems, component libraries, design tokens, pattern libraries, design system governance, or component architecture. Do NOT use for: visual design (design-visual-design), brand identity (design-brand-identity), or prototyping (design-prototyping).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [design, design-systems, phase-3]
---

# Design Systems

## Purpose
Design, build, and maintain a scalable design system — a single source of truth for design tokens, components, patterns, and guidelines that enables consistent, rapid product development across teams. A design system is a product serving other products.

## Agent Protocol

### Trigger
Exact user phrases: "design system", "component library", "design tokens", "pattern library", "UI library", "design system governance", "component architecture", "design system documentation".

### Input Context
- Scale (single team, multiple teams, entire organization)
- Tech stack (React, Vue, Angular, Flutter, SwiftUI, .NET MAUI)
- Design tool (Figma, Sketch, Adobe XD)
- Existing design assets or component libraries
- Number of products/teams consuming the system
- Current pain points (inconsistency, slow delivery, accessibility gaps)

### Output Artifact
Design system architecture plan with token structure, component hierarchy, documentation strategy, and governance model.

### Completion Criteria
- [ ] Design token taxonomy defined (color, typography, spacing, shadow, motion)
- [ ] Component audit completed with gap analysis
- [ ] Component hierarchy established (atoms → molecules → organisms → templates)
- [ ] Naming conventions documented (BEM, utility-first, component-name)
- [ ] Documentation platform selected and structured
- [ ] Contribution model defined (centralized, federated, hybrid)
- [ ] Versioning strategy documented (semver for design tokens + components)
- [ ] Accessibility baseline established (WCAG AA minimum)
- [ ] Testing strategy documented (visual regression, accessibility, unit tests)
- [ ] Adoption and migration plan outlined

### Max Response Length
250 lines of architecture, patterns, and implementation guidance.

## Framework/Methodology

### Design System Decision Tree
```
What is the team's current state?
├── No existing system → Start small with tokens
│   → Token audit → Token system → 3-5 core components → Documentation → Expand
├── Siloed components exist → Unify and standardize
│   → Component audit → Naming unification → API standardization → Shared package
├── Existing system needs maturity → Add governance + tooling
│   → Gap analysis → Accessibility audit → Testing → CI/CD → Contribution model
└── Multi-product ecosystem → Federate with governance
    → Core system → Product extensions → Versioning → Cross-team review
```

### Atomic Design Hierarchy
```
Atoms (tokens + basic elements)
├── Color (primary, secondary, neutral, semantic, gradient)
├── Typography (typeface, size, weight, line-height, letter-spacing)
├── Spacing (4px/8px base scale)
├── Iconography (size, color treatment, stroke weight)
└── Animation (duration, easing curve, motion presets)
    ↓
Molecules (compound components)
├── Button (icon + label + loading state)
├── Input (label + field + error message + helper text)
├── Card (image + title + description + action)
├── Form group (label + input + validation)
└── Navigation item (icon + label + badge + active state)
    ↓
Organisms (complex sections)
├── Header (logo + navigation + search + user menu)
├── Data table (toolbar + table + pagination + empty state)
├── Modal (overlay + container + header + content + footer + close)
└── Form (sections + inputs + validation + submit)
    ↓
Templates (page-level layout)
├── Dashboard layout
├── Detail page layout
├── Settings page layout
└── Landing page layout
    ↓
Pages (specific instances with real content)
```

### Design System Governance Models

| Model | Description | Best For | Pros | Cons |
|-------|-------------|----------|------|------|
| Centralized | Single team builds/maintains everything | Small org, 1-2 products | Consistency, quality | Bottleneck, slow |
| Federated | Each team contributes, core team curates | Large org, many products | Scale, ownership | Coordination overhead |
| Hybrid | Core components centralized, domain-specific federated | Medium-large org | Balance of consistency + flexibility | Complex governance |
| Solitary | Single team builds, no external contributions | Agency, consulting | Control | Doesn't scale |

## Workflow

### Step 1: Conduct Design Audit

Audit Process:
1. Inventory all existing components across products and design files
2. Categorize: unique, duplicated (same function, different code), similar (different, but should be same)
3. Score each: usage frequency, variation count, accessibility compliance, code quality
4. Identify: what to adopt as-is, what to refactor, what to deprecate, what's missing

```yaml
component_audit:
  button:
    variants_across_products: 14
    accessibility_compliance: 6/14 pass WCAG AA
    usage_count: 847 (all products)
    recommendation: "Refactor to single Button component with variant prop"
  card:
    variants: 9
    recommendation: "Standardize to 3 variants (default, interactive, compact)"
  date_picker:
    variants: 3
    recommendation: "Adopt most-used variant, deprecate others"
```

### Step 2: Define Token Architecture

Token Types:
- **Global tokens**: Raw values (`blue-500: #0052CC`, `space-4: 16px`)
- **Alias tokens**: Semantic mappings (`color-primary: blue-500`, `spacing-large: space-4`)
- **Component tokens**: Component-specific (`button-bg: color-primary`)

```css
/* Global tokens */
:root {
  --blue-500: #0052CC;
  --red-500: #FF5630;
  --green-500: #36B37E;
  --space-1: 4px;
  --space-2: 8px;
  --space-4: 16px;
  --font-sans: 'Inter', sans-serif;
}

/* Alias tokens */
:root {
  --color-primary: var(--blue-500);
  --color-error: var(--red-500);
  --color-success: var(--green-500);
  --spacing-xs: var(--space-1);
  --spacing-sm: var(--space-2);
  --spacing-md: var(--space-4);
  --font-family-body: var(--font-sans);
}

/* Component tokens */
:root {
  --button-primary-bg: var(--color-primary);
  --button-primary-text: var(--color-white);
  --button-primary-radius: var(--radius-sm);
}
```

Token Platform Distribution:
```json
{
  "tokens": {
    "color": { "primary": "#0052CC" },
    "spacing": { "md": "16px" },
    "typography": { "body-size": "16px" }
  }
}
```
Output formats: CSS custom properties, JSON for React/Vue, Compose/Kotlin for Android, Swift for iOS, XML for Android, .NET MAUI resources.

### Step 3: Build Component Architecture

Component Design Principles:
- **Composable**: Components work together, don't fight each other
- **Accessible**: WCAG AA by default, AAA where possible
- **Responsive**: Work at all breakpoints without breakpoint-specific variants
- **Themeable**: Dark mode, high contrast, brand theming through token overrides
- **Performant**: Minimal re-renders, tree-shakeable, code-split ready
- **Testable**: Unit, visual regression, and accessibility tests built in

Component API Design:
```typescript
// Bad: Too many props, mixing concerns
<Button
  primary={true}
  large={true}
  icon="arrow-right"
  isLoading={false}
  isDisabled={false}
  handleClick={onClick}
/>

// Good: Semantic variant, composable, forwardRef
<Button variant="primary" size="large" onClick={onClick}>
  <Icon name="arrow-right" />
  Save
</Button>
```

Component States (every component needs these):
- **Default**: Normal resting state
- **Hover**: Mouse over (desktop only)
- **Active/Pressed**: Mouse down
- **Focus**: Keyboard focus ring (never outline: none without replacement)
- **Disabled**: Not interactive, reduced opacity
- **Loading**: Processing state, skeleton or spinner
- **Error**: Validation failure
- **Empty**: No content to display
- **Selected/Active**: Toggle or selection state

### Step 4: Document the System

Documentation Content (per component):
1. Component name and description
2. When to use / When not to use
3. Live interactive example (code sandbox)
4. Props/API reference
5. Accessibility notes (ARIA roles, keyboard navigation, focus management)
6. Theming and customization
7. Usage guidelines and best practices
8. Related components and patterns

Tool Recommendations:
- **Storybook**: Industry standard component dev + docs (React, Vue, Angular, Svelte, Web Components)
- **Zeroheight**: Design system documentation platform (no-code)
- **Supernova**: Design token + component sync from Figma to code
- **Style Dictionary**: Transform design tokens into platform-specific formats
- **Token Studio**: Figma plugin for token management

### Step 5: Establish Contribution Model

Federated Contribution Workflow:
1. **Proposal**: Team identifies need, writes brief with usage evidence
2. **Review**: Design system core team reviews for consistency + quality
3. **Build**: Contributing team builds in their context, core team provides guidance
4. **Review**: Core team reviews code, accessibility, documentation
5. **Release**: Component published as alpha → beta → stable
6. **Adopt**: Contributing team migrates, documentation updated
7. **Maintain**: Core team takes ownership after stabilization period

Versioning Strategy (semver):
- **Major**: Breaking changes (redesigned component, removed prop)
- **Minor**: New features (new component, new variant, new prop)
- **Patch**: Bug fixes, accessibility improvements, dependency updates
- **Pre-release**: alpha, beta, rc for testing

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Big bang rewrite | Building entire system before any adoption | Start with 5 components, prove value, iterate |
| Over-engineering | Solving for every edge case on day one | Build for 80% use case, extend when needed |
| Token omission | Not enough tokens so teams hardcode values | Audit all hardcoded values, create tokens for every dimension |
| Documentation neglect | Components without usage guidance | Every component needs "when to use / when not to use" |
| Accessibility afterthought | Adding a11y later is 10x harder | Build accessible from the start (keyboard, ARIA, contrast) |
| No governance | Everyone can add anything, system becomes inconsistent | Clear contribution model and review process |
| Design-code gap | Figma components don't match code | Token-driven design, component sync, regular audits |
| Ignoring migration | Teams keep using old components for years | Deprecation policy, migration guides, automated codemods |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Start with tokens | Tokens are low-risk, high-impact — the foundation of everything |
| One source of truth | Design tokens in code are source; Figma imports from code |
| Version everything | Tokens, components, documentation — all versioned together |
| Test visually | Visual regression tests catch unintended changes automatically |
| Write migration guides | Breaking changes are painful; guides reduce adoption friction |
| Measure adoption | Track usage %, component versions in use, deprecated component usage |
| Document rationale | "Why" is more important than "what" — enables good decisions |
| Keep it accessible | WCAG AA is table stakes, not a differentiator |
| Invest in DX | Good developer experience drives adoption and contribution |
| Plan for sunset | Deprecate components explicitly with timeline and migration path |

## Templates & Tools

### Component Audit Template
```yaml
component: "Button"
current_state:
  variants_across_products: 14
  colors_used: 8 different blues, 3 greens, 2 reds
  sizes: 5 (small, medium, large, xl, xxl)
  states_implemented: ["default", "hover", "disabled"]
  states_missing: ["focus", "active", "loading"]
  accessibility: "No focus indicators, no aria-disabled"
  code_frameworks: ["React", "Vue", "Angular", "jQuery"]
  documentation: "None"
recommendation:
  action: "Standardize"
  target_variants: ["primary", "secondary", "tertiary", "ghost", "danger"]
  target_sizes: ["sm", "md", "lg"]
  priority: "High"
```

### Component Checklist
- [ ] All states defined (default, hover, active, focus, disabled, loading, error)
- [ ] Keyboard navigable (Tab, Shift+Tab, Enter, Escape, Arrow keys)
- [ ] ARIA attributes correct (role, aria-label, aria-expanded, aria-selected, aria-disabled)
- [ ] Focus visible (custom focus ring, not browser default, never outline:none)
- [ ] Responsive (works in mobile, tablet, desktop)
- [ ] Dark mode supported
- [ ] RTL ready (logical properties: margin-inline-start, padding-inline)
- [ ] Unit tests written (render, state changes, callbacks)
- [ ] Visual regression tests added
- [ ] Storybook stories written (default, variants, states, edge cases)
- [ ] Documentation complete (when to use, props, guidelines, related)
- [ ] Bundle size impact assessed

## Case Studies

### Case Study 1: Token-Driven Redesign Reduces Design Time 50%
A SaaS company with 4 product teams and 12,000 design inconsistencies across products implemented a token-based design system. By centralizing color (43 → 8 tokens), typography (22 → 6 values), and spacing (37 → 9 values), they eliminated all trivial design decisions. Result: design-to-development handoff time reduced 50%, redesign velocity increased 3x, and accessibility compliance went from 34% to 89% in 6 months.

Method: Token audit → Style Dictionary → cross-platform token distribution → Figma sync
Key insight: Constraint (fewer choices) enables speed, not limits it
Impact: Design time -50%, redesign velocity +3x, a11y compliance 34% → 89%

### Case Study 2: Governance Model Prevents Design System Collapse
A large enterprise design system had 47 contributors and no governance — components had been added with conflicting patterns, inconsistent APIs, and 90% of components didn't meet WCAG AA. A federated governance model was implemented: core team (3 people) curates 40 "core" components, product teams contribute domain-specific components following strict guidelines. Within one year, component quality score went from 4.2/10 to 8.7/10, and adoption grew from 3 to 12 product teams.

Method: Audit → triage → governance model → contribution workflow → automated quality gates
Key insight: Centralized control limits adoption; federated control requires quality gates
Impact: Component quality 4.2 → 8.7/10, adoption 3 → 12 teams

## Rules
- Start small: 3-5 components, prove value before expanding
- Design tokens are the foundation — no tokens, no system
- Every component must have all interaction states
- Every component must meet WCAG AA minimum
- Component APIs must be consistent across the system
- Name things semantically, not visually (variant="primary", not variant="blue")
- Version with semver: major for breaking, minor for new, patch for fixes
- Document every component with usage guidelines
- Deprecate, don't delete — provide migration path for old components
- Regular audits: token usage, component variants, accessibility, performance
- Design system is a product — it needs roadmap, backlog, and user research
- Contribution model must be defined before accepting external contributions
- Measure what matters: adoption %, deprecated usage %, time-to-implement, accessibility score
- Don't solve for every edge case — build for 80%, extend for the rest
- The best design system is the one teams actually use

## References
  - references/component-api-design.md — Component API Design Patterns Reference
  - references/design-system-advanced.md — Design Systems Advanced Topics
  - references/design-system-fundamentals.md — Design Systems Fundamentals
  - references/design-tokens.md — Design Token Architecture Reference
  - references/governance-model.md — Design System Governance Reference
  - references/testing-strategy.md — Design System Testing Strategy Reference
## Handoff
Hand off to `design-visual-design` for visual token creation. Hand off to `design-brand-identity` for brand-aligned color/type decisions. Hand off to `design-accessibility` for WCAG compliance audit.
