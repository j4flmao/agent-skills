---
name: design-design-systems
description: >
  Comprehensive management of design systems
  integrating Figma tokens and WCAG 2.1 accessibility.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags:
  - design
  - tokens
  - accessibility
---
# Design Design Systems

## Purpose
This skill encapsulates the process of converting Figma design tokens into production-ready WCAG 2.1 compliant components.

## Core Principles
1. Maintain single source of truth in Figma.
2. Ensure minimum 4.5:1 color contrast.
3. Automate token delivery via CI/CD.
4. Enforce ARIA standards on all web components.
5. Provide continuous accessibility regression testing.

## Agent Protocol
Trigger: "Update design tokens"
Input Context Required: Figma JSON payload.
Output Artifact: SCSS/CSS variables, TS token definitions.
Response Formats:
```json
{
  "status": "success",
  "tokens": 42
}
```

## Decision Matrix
[If Token Change] ---> [Calculate Contrast] ---> [Generate TS]

## Detailed Architectural Overview
[Figma] -> [Token Transformer] -> [Style Dictionary] -> [Code]
Lifecycle: Draft -> Review -> Approved -> Shipped

## Workflow Steps
Phase 1:
1. Parse JSON
2. Resolve Aliases
3. Validate Names
Phase 2:
1. Check WCAG contrast
2. Warn on failures
3. Enforce thresholds
Phase 3:
1. Output CSS
2. Output TS
3. Output SCSS
Phase 4:
1. Generate Docs
2. Update Storybook
3. Publish package
Phase 5:
1. Run a11y tests
2. Gather metrics
3. Alert team
Phase 6:
1. Clean up
2. Tag release
3. Complete workflow

## Extended Troubleshooting Guide
Symptom | Primary Cause | Mitigation Action
--- | --- | ---
Token missing | Typo in Figma | Check spelling
Contrast fail | Wrong background | Adjust lightness
Build fail | Syntax error | Check JSON
Deploy fail | Auth issue | Rotate keys
Missing ARIA | Component bug | Add aria-labels
Build slow | Too many tokens | Optimize build

## Complete Execution Scenario
Start -> Fetch -> Transform -> Validate -> Generate -> End

## Rules and Guidelines
1. Do not edit tokens manually in code.
2. Always write tests for token transforms.
3. WCAG rules are non-negotiable.
4. Keep JSON shallow if possible.
5. Document all deprecations.

## Reference Guides
1. [Figma Integration](references/figma_token_integration_1.md)
2. [Figma Integration 2](references/figma_token_integration_2.md)
3. [WCAG 2.1 Access](references/wcag_21_accessibility_1.md)
4. [WCAG 2.1 Access 2](references/wcag_21_accessibility_2.md)
5. [Architecture](references/design_system_architecture.md)
6. [Component Schema](references/component_library_schema.md)
7. [Color Algorithms](references/color_contrast_algorithms.md)
8. [A11y Best Practices](references/accessible_components_best_practices.md)

## Handoff
Passes to front-end implementation skill.
<!-- COMPRESSED -->
