---
name: design-information-architecture
description: >
  Use when the user asks about information architecture, sitemaps, user flows, content hierarchy, navigation design, content organization, labeling, or taxonomy. Do NOT use for: UX research (design-ux-research), visual design (design-visual-design), or prototyping (design-prototyping).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [design, information-architecture, phase-3]
---

# Information Architecture

## Purpose
Design information architecture: organize content, create navigation systems, define taxonomies, design user flows, and ensure findability across digital products.

## Workflow

### IA Design Process
1. **Content audit**: Inventory all content, identify gaps and duplicates
2. **User research**: Understand mental models, findability patterns
3. **Card sorting**: Group content into logical categories
4. **Tree testing**: Validate navigation structure
5. **Sitemap**: Visual hierarchy of pages and sections
6. **Navigation design**: Primary, secondary, utility, breadcrumb

### Navigation Patterns
| Pattern | Use Case | Example |
|---------|----------|---------|
| Top navigation | Few categories, broad content | Marketing sites |
| Side navigation | Many categories, deep content | SaaS applications |
| Hub-and-spoke | Task-focused workflows | Checkout, setup wizards |
| Search-dominant | Large content volumes | Documentation, knowledge bases |
| Faceted | Content with multiple attributes | E-commerce, catalogs |

### Taxonomy Design
- Flat taxonomy: simple, limited categories
- Hierarchical taxonomy: parent-child relationships
- Faceted taxonomy: multi-dimensional classification
- Tags: flexible, user-generated categorization

## References
- `references/ia-methods.md` — Information architecture research methods
- `references/navigation-patterns.md` — Navigation design patterns and best practices
- `references/content-organization.md` — Content auditing and taxonomy design
