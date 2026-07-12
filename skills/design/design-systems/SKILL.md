---
name: design-systems
description: Expertise in UI Component consistency and Figma to Code workflows.
---

# Design Systems

## Core Principles
- **Consistency**: Reusable components and tokens across the UI.
- **Single Source of Truth**: Design tokens sync Figma and Codebase.

## Figma to Code Workflow
```mermaid
flowchart TD
    A[Figma Design] --> B[Export Design Tokens]
    B --> C[Style Dictionary]
    C --> D[CSS/SCSS Variables]
    D --> E[UI Components]
```

## Template: Design Token
```json
{
  "color": {
    "primary": {
      "value": "#0052cc",
      "type": "color"
    },
    "text": {
      "value": "#172b4d",
      "type": "color"
    }
  }
}
```
