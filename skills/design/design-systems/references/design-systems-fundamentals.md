# Design Systems Fundamentals

## Overview
A Design System is a single source of truth for design tokens, components, patterns, and guidelines that enables consistent, rapid product development across teams. This reference covers foundational concepts, architecture, and best practices.

## Core Concepts

### Concept 1: Design Tokens
Tokens are the atomic values of a design system — colors, typography, spacing, shadows, motion. They exist as platform-agnostic values (JSON) and are transformed per-platform (CSS custom properties, Android XML, iOS Swift). Tokens are organized as global (raw values), alias (semantic mappings), and component (specific use).

### Concept 2: Component Architecture
Components follow atomic design: atoms (tokens + basic elements) compose into molecules (compound components like buttons), which compose into organisms (complex sections like headers), which fill templates and pages. Each component has defined states, a minimal API, and accessibility built in.

### Concept 3: Documentation
Every component needs: name, when to use / when not to use, live interactive example, props/API reference, accessibility notes, theming guidance, and related components. Documentation should be co-located with code and automatically published.

### Concept 4: Governance
A design system needs a clear contribution model: who can add components, how they're reviewed, versioning strategy (semver), deprecation policy, and migration guides for breaking changes. Without governance, systems become inconsistent and abandoned.

### Concept 5: Adoption and Migration
The best system is the one teams actually use. Adoption requires: clear value proposition, easy migration path, good developer experience, responsive support, and regular communication. Measure adoption rate, not just component count.

## Architecture Patterns

### Pattern 1: Token Pipeline
Design tokens → Style Dictionary → Platform-specific outputs (CSS, JSON, Compose, Swift). Changes in Figma propagate to code. This is the foundation that everything else depends on.

### Pattern 2: Layered Component Model
Foundation layer (tokens, themes) → Base components (Button, Input, Card) → Composite components (Form, DataTable, Modal) → Page templates. Each layer depends only on layers below it.

### Pattern 3: Federated Contribution
Core team (3-5 people) maintains ~40 core components. Product teams contribute domain-specific components following guidelines. Core team reviews for consistency, accessibility, and quality.

## Best Practices

- Start with tokens, not components
- Design system is a product — it needs roadmap, backlog, user research
- One source of truth: code is source, Figma imports from code
- Build accessible from the start (retrofitting is 10x harder)
- Version with semver
- Measure adoption %, not component count
- Document rationale, not just usage
- Test visual regression, accessibility, and performance

## Anti-Patterns

- Big bang rewrite before any adoption
- Over-engineering for edge cases on day one
- Components without usage guidance
- Token omission: teams hardcode values when tokens are insufficient
- No contribution model → system becomes inconsistent
- Ignoring accessibility → entire system fails compliance
